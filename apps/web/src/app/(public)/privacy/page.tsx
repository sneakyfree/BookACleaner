import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description: 'BookACleaner.ai Privacy Policy — how we collect, use, and protect your personal information.',
}

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="max-w-4xl mx-auto px-6 py-16">
                <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
                <p className="text-white/50 mb-10">Last updated: February 10, 2026</p>

                <div className="prose prose-invert prose-slate max-w-none space-y-8">
                    <Section title="1. Information We Collect">
                        <p>We collect information you provide directly, including:</p>
                        <ul>
                            <li><strong>Account Data:</strong> Name, email address, phone number, and password when you register.</li>
                            <li><strong>Profile Data:</strong> Business name, bio, services offered, service areas, certifications, and profile photos (for cleaners). Display name and profile photo (for clients).</li>
                            <li><strong>Property Data:</strong> Address, property type, square footage, bedroom/bathroom count, and access instructions.</li>
                            <li><strong>Payment Data:</strong> Payment card details processed securely via Stripe. We do not store full card numbers on our servers.</li>
                            <li><strong>Verification Data:</strong> Government-issued ID, business licenses, insurance certificates, and background check results.</li>
                            <li><strong>Communications:</strong> Messages exchanged between clients and cleaners through our platform.</li>
                        </ul>
                        <p>We automatically collect device information, IP addresses, browser type, and usage analytics to improve our services.</p>
                    </Section>

                    <Section title="2. How We Use Your Information">
                        <ul>
                            <li>Facilitate bookings and payments between clients and cleaning professionals.</li>
                            <li>Verify cleaner identities, certifications, and background checks for platform trust and safety.</li>
                            <li>Send booking confirmations, reminders, and platform notifications via email, SMS, or push notification.</li>
                            <li>Improve our AI-powered features including smart scheduling, route optimization, and booking assistance.</li>
                            <li>Detect and prevent fraud, abuse, and violations of our Terms of Service.</li>
                            <li>Generate anonymous, aggregate analytics to improve platform performance.</li>
                        </ul>
                    </Section>

                    <Section title="3. Information Sharing">
                        <p>We share your information only in these circumstances:</p>
                        <ul>
                            <li><strong>Between Users:</strong> Client property details are shared with assigned cleaners. Cleaner profiles, ratings, and verification status are visible to clients.</li>
                            <li><strong>Payment Processors:</strong> Stripe processes all payments. See <a href="https://stripe.com/privacy" className="text-brand-400 hover:underline" target="_blank" rel="noopener noreferrer">Stripe&apos;s Privacy Policy</a>.</li>
                            <li><strong>Verification Partners:</strong> Background check providers (e.g., Checkr) receive necessary identifying information.</li>
                            <li><strong>Legal Requirements:</strong> When required by law, court order, or to protect the rights and safety of our users.</li>
                        </ul>
                        <p>We never sell your personal information to third parties.</p>
                    </Section>

                    <Section title="4. Data Security">
                        <p>We implement industry-standard security measures including:</p>
                        <ul>
                            <li>Encryption in transit (TLS/SSL) and at rest for sensitive data.</li>
                            <li>Bcrypt hashing for passwords — we never store plaintext passwords.</li>
                            <li>Regular security audits and vulnerability assessments.</li>
                            <li>Role-based access controls limiting data access to authorized personnel.</li>
                        </ul>
                    </Section>

                    <Section title="5. Your Rights">
                        <p>Depending on your jurisdiction, you may have the right to:</p>
                        <ul>
                            <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
                            <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data.</li>
                            <li><strong>Deletion:</strong> Request deletion of your personal data, subject to legal retention requirements.</li>
                            <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format.</li>
                            <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications at any time.</li>
                        </ul>
                        <p>To exercise these rights, contact us at <a href="mailto:privacy@bookacleaner.ai" className="text-brand-400 hover:underline">privacy@bookacleaner.ai</a>.</p>
                    </Section>

                    <Section title="6. Cookies & Tracking">
                        <p>We use essential cookies for authentication and session management. We also use analytics cookies to understand platform usage. You can manage cookie preferences through your browser settings.</p>
                    </Section>

                    <Section title="7. Children&apos;s Privacy">
                        <p>BookACleaner is not intended for individuals under 18 years of age. We do not knowingly collect personal information from children.</p>
                    </Section>

                    <Section title="8. Changes to This Policy">
                        <p>We may update this Privacy Policy periodically. We will notify you of material changes via email or platform notification. Continued use of the platform constitutes acceptance of the updated policy.</p>
                    </Section>

                    <Section title="9. Contact Us">
                        <p>For privacy-related questions or requests:</p>
                        <ul>
                            <li>Email: <a href="mailto:privacy@bookacleaner.ai" className="text-brand-400 hover:underline">privacy@bookacleaner.ai</a></li>
                            <li>Address: BookACleaner, Inc.</li>
                        </ul>
                    </Section>
                </div>
            </div>
        </div>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section>
            <h2 className="text-xl font-semibold text-white mb-3">{title}</h2>
            <div className="text-white/70 leading-relaxed space-y-3">{children}</div>
        </section>
    )
}
