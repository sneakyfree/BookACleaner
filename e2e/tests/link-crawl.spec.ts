import { test, expect, type Page, type TestInfo } from '@playwright/test';

/**
 * Link-crawl e2e guard.
 *
 * For every role (anonymous, client, cleaner, admin) we log in with the seeded
 * demo credentials and then BFS-crawl every in-app navigation target reachable
 * from that role's landing page (sidebar/nav hrefs, header links, in-page
 * <a>/<Link> targets — Next.js <Link> renders a real <a href>, so anchor
 * discovery covers them).
 *
 * For every visited route we assert:
 *   - the document HTTP status is 200 (not 404 / 5xx),
 *   - the page is NOT the branded 404 ("Page not found"),
 *   - the page is NOT the global error boundary ("Application Error"),
 *   - it rendered real content (not blank / white),
 *   - an authenticated session is not silently bounced back to /login.
 *
 * The test fails (non-zero exit) listing every broken route, so nav-404s and
 * frontend->backend path drift can never ship silently again.
 *
 * Run against a PRODUCTION build (see e2e.yml) — the Next dev server emits
 * false 500s on cold-compiled chunks that make this flaky.
 */

const PW = process.env.SEED_PASSWORD || 'demo1234';

const ROLES = ['anonymous', 'client', 'cleaner', 'admin'] as const;
type Role = (typeof ROLES)[number];

const CREDS: Record<Role, string | null> = {
    anonymous: null,
    client: 'client@demo.com',
    cleaner: 'maria@demo.com',
    admin: 'admin@bookacleaner.ai',
};

// Where each role starts crawling from.
const LANDING: Record<Role, string> = {
    anonymous: '/',
    client: '/client',
    cleaner: '/cleaner',
    admin: '/admin',
};

const MAX_ROUTES = Number(process.env.CRAWL_MAX_ROUTES || 150);
const NAV_TIMEOUT = 25_000;

interface Broken {
    role: string;
    path: string;
    status: number;
    finalPath: string;
    symptoms: string[];
    detail: string;
}

function normalize(href: string, base: string): string | null {
    if (!href) return null;
    let h = href.trim();
    if (h.startsWith('mailto:') || h.startsWith('tel:') || h.startsWith('#')) return null;
    // absolute external url -> drop; absolute same-origin -> strip origin
    if (/^https?:\/\//i.test(h)) {
        if (!h.startsWith(base)) return null;
        h = h.slice(base.length);
    }
    h = h.split('#')[0].split('?')[0];
    if (!h.startsWith('/')) return null;
    if (h.length > 1 && h.endsWith('/')) h = h.replace(/\/+$/, '');
    // Never follow anything that would destroy the session or hit raw APIs.
    if (h.startsWith('/api')) return null;
    if (/logout|signout|sign-out/i.test(h)) return null;
    return h || '/';
}

async function login(page: Page, email: string) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name="email"]', { timeout: 20_000 });
    // The submit button is gated until React hydrates — wait for it to enable.
    await page
        .waitForFunction(
            () => {
                const b = document.querySelector('button[type="submit"]') as HTMLButtonElement | null;
                return !!b && !b.disabled;
            },
            undefined,
            { timeout: 20_000 },
        )
        .catch(() => {});
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PW);
    await Promise.all([
        page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30_000 }),
        page.click('button[type="submit"]'),
    ]);
    await page.waitForLoadState('networkidle').catch(() => {});
}

/** Navigate with a couple of retries to absorb transient dev-chunk races. */
async function gotoWithRetry(page: Page, url: string) {
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: NAV_TIMEOUT });
            return { resp, err: null as string | null };
        } catch (e) {
            lastErr = e;
            const msg = String(e);
            // Only retry transient chunk/timeout races, not hard failures.
            if (/chunk|timeout|ERR_ABORTED|ERR_CONNECTION/i.test(msg) && attempt < 2) {
                await page.waitForTimeout(800);
                continue;
            }
            break;
        }
    }
    return { resp: null as Awaited<ReturnType<Page['goto']>>, err: String(lastErr).slice(0, 200) };
}

async function crawlRole(role: Role, page: Page, base: string, testInfo: TestInfo): Promise<Broken[]> {
    const broken: Broken[] = [];
    const authenticated = role !== 'anonymous';

    const start = LANDING[role];
    const queue: string[] = [start, '/'];
    const seen = new Set<string>();

    while (queue.length && seen.size < MAX_ROUTES) {
        const path = queue.shift()!;
        if (seen.has(path)) continue;
        seen.add(path);

        const url = base + path;
        const consoleErrors: string[] = [];
        const failedXhr: string[] = [];
        const onConsole = (m: any) => {
            if (m.type() === 'error') consoleErrors.push(String(m.text()).slice(0, 160));
        };
        const onPageError = (e: any) => consoleErrors.push('PAGEERROR: ' + String(e).slice(0, 160));
        const onResponse = (r: any) => {
            const s = r.status();
            const u = r.url();
            if (s >= 500 && (u.includes('/api/') || u.startsWith(base))) {
                failedXhr.push(`${s} ${u.replace(base, '')}`.slice(0, 140));
            }
        };
        page.on('console', onConsole);
        page.on('pageerror', onPageError);
        page.on('response', onResponse);

        const { resp, err } = await gotoWithRetry(page, url);
        const status = resp ? resp.status() : 0;
        // let the client render settle (hydration / client fetches)
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.waitForTimeout(500);

        const finalPath = (() => {
            try {
                return new URL(page.url()).pathname || '/';
            } catch {
                return path;
            }
        })();

        let bodyText = '';
        try {
            bodyText = (await page.locator('body').innerText({ timeout: 5000 })) || '';
        } catch {
            /* leave empty */
        }
        const lower = bodyText.toLowerCase();

        const is404 = lower.includes('page not found') || (lower.includes('404') && lower.includes("doesn't exist"));
        const isErrorBoundary =
            lower.includes('application error') ||
            lower.includes('unhandled runtime error') ||
            lower.includes('a critical error occurred');
        const isBlank = bodyText.trim().length < 20;
        const bouncedToLogin = authenticated && finalPath.startsWith('/login') && path !== '/login';

        const symptoms: string[] = [];
        if (err) symptoms.push('nav-error');
        if (status >= 500) symptoms.push(`http-${status}`);
        if (status === 404 || is404) symptoms.push('404-page');
        if (isErrorBoundary) symptoms.push('error-boundary');
        if (isBlank) symptoms.push('blank-page');
        if (bouncedToLogin) symptoms.push('bounced-to-login');
        if (failedXhr.length) symptoms.push(`xhr-5xx(${failedXhr.length})`);

        // Discover further links BEFORE deciding failure so we still expand the graph.
        try {
            const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href') || ''));
            for (const raw of hrefs) {
                const n = normalize(raw, base);
                if (n && !seen.has(n) && !queue.includes(n)) queue.push(n);
            }
        } catch {
            /* ignore discovery errors */
        }

        page.off('console', onConsole);
        page.off('pageerror', onPageError);
        page.off('response', onResponse);

        // A route "fails" on hard signals only. XHR 5xx alone is a warning
        // unless the page also broke, to keep this deterministic.
        const failed =
            !!err ||
            status >= 500 ||
            status === 404 ||
            is404 ||
            isErrorBoundary ||
            isBlank ||
            bouncedToLogin;

        if (failed) {
            const detail = `console=${consoleErrors.slice(0, 3).join(' | ')} xhr=${failedXhr.slice(0, 3).join(' | ')}`;
            broken.push({ role, path, status, finalPath, symptoms, detail });
            try {
                const safe = `${role}${path.replace(/\//g, '_') || '_root'}`.slice(0, 80);
                const shot = testInfo.outputPath(`broken-${safe}.png`);
                await page.screenshot({ path: shot, fullPage: true });
                await testInfo.attach(`broken ${role} ${path}`, { path: shot, contentType: 'image/png' });
            } catch {
                /* screenshot best-effort */
            }
            // eslint-disable-next-line no-console
            console.log(`FAIL [${role}] ${path} -> status=${status} final=${finalPath} [${symptoms.join(',')}]`);
        } else {
            // eslint-disable-next-line no-console
            console.log(`ok   [${role}] ${path} -> ${status} (${bodyText.trim().length} chars)`);
        }
    }

    // eslint-disable-next-line no-console
    console.log(`=== ${role}: crawled ${seen.size} routes, ${broken.length} broken ===`);
    return broken;
}

for (const role of ROLES) {
    test(`link-crawl: ${role} has no broken navigation targets`, async ({ page }, testInfo) => {
        // Generous budget — a full role crawl visits dozens of routes.
        testInfo.setTimeout(6 * 60 * 1000);

        const base = (testInfo.project.use.baseURL || process.env.BASE_URL || 'http://localhost:3002').replace(
            /\/$/,
            '',
        );

        const email = CREDS[role];
        if (email) await login(page, email);

        const broken = await crawlRole(role, page, base, testInfo);

        const report = broken
            .map((b) => `  [${b.role}] ${b.path} -> status ${b.status}, final ${b.finalPath} {${b.symptoms.join(',')}} ${b.detail}`)
            .join('\n');

        expect(broken, `Broken navigation targets for role "${role}":\n${report}\n`).toHaveLength(0);
    });
}
