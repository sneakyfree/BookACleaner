import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Terms of Service',
    description: 'BookACleaner.ai Terms of Service — the rules and guidelines for using our platform.',
}

export default function TermsOfServicePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="max-w-4xl mx-auto px-6 py-16">
                <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
                <p className="text-white/50 mb-10">Last updated: February 10, 2026</p>

                <div className="prose prose-invert prose-slate max-w-none space-y-8">
                    <Section title="1. Acceptance of Terms">
                        <p>By creating an account or using BookACleaner.ai (&quot;the Platform&quot;), you agree to be bound by these Terms of Service. If you do not agree, you may not use the Platform.</p>
                    </Section>

                    <Section title="2. Platform Description">
                        <p>BookACleaner.ai is an AI-powered marketplace connecting clients with independent cleaning professionals (&quot;Cleaners&quot;). We provide the technology platform; we do not provide cleaning services directly. Cleaners are independent contractors, not employees of BookACleaner.</p>
                    </Section>

                    <Section title="3. Account Registration">
                        <ul>
                            <li>You must be at least 18 years old to create an account.</li>
                            <li>You must provide accurate, complete, and current information.</li>
                            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                            <li>You may not create multiple accounts or share your account with others.</li>
                            <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
                        </ul>
                    </Section>

                    <Section title="4. Cleaner Obligations">
                        <ul>
                            <li>Cleaners must provide truthful information about their qualifications, certifications, and experience.</li>
                            <li>Cleaners must maintain valid insurance coverage and any required business licenses.</li>
                            <li>Cleaners must complete verification requirements as specified by their verification tier.</li>
                            <li>Cleaners are responsible for providing services as described in accepted job terms.</li>
                            <li>Cleaners set their own rates and schedules as independent contractors.</li>
                        </ul>
                    </Section>

                    <Section title="5. Client Obligations">
                        <ul>
                            <li>Clients must provide accurate property descriptions and access instructions.</li>
                            <li>Clients must ensure safe working conditions for cleaners.</li>
                            <li>Clients must make timely payments for completed services.</li>
                            <li>Clients must provide honest reviews and ratings.</li>
                        </ul>
                    </Section>

                    <Section title="6. Booking & Payment Terms">
                        <ul>
                            <li>All payments are processed through Stripe. By making a payment, you also agree to <a href="https://stripe.com/legal" className="text-brand-400 hover:underline" target="_blank" rel="noopener noreferrer">Stripe&apos;s Terms of Service</a>.</li>
                            <li>Payments are held in escrow until the job is confirmed as complete.</li>
                            <li>The platform charges a service fee on each transaction, disclosed before booking confirmation.</li>
                            <li>Cancellations made less than 24 hours before the scheduled service may incur a cancellation fee.</li>
                            <li>Refund requests are evaluated on a case-by-case basis through our dispute resolution process.</li>
                        </ul>
                    </Section>

                    <Section title="7. Reviews & Content">
                        <ul>
                            <li>Reviews must be honest, relevant, and based on actual service experiences.</li>
                            <li>We reserve the right to moderate and remove reviews that violate our content guidelines.</li>
                            <li>You retain ownership of content you submit but grant us a license to display it on the Platform.</li>
                            <li>You may not post content that is defamatory, harassing, fraudulent, or violates any law.</li>
                        </ul>
                    </Section>

                    <Section title="8. Dispute Resolution">
                        <p>If a dispute arises between a client and cleaner:</p>
                        <ul>
                            <li>Both parties should first attempt to resolve the issue through our in-app messaging system.</li>
                            <li>If unresolved, either party may file a formal dispute through the Platform.</li>
                            <li>Our admin team will review the dispute, consider evidence from both parties, and make a resolution determination.</li>
                            <li>Dispute decisions are final and binding for transactions under $500. For larger disputes, parties retain the right to pursue legal remedies.</li>
                        </ul>
                    </Section>

                    <Section title="9. Limitation of Liability">
                        <p>BookACleaner acts as a marketplace facilitator. To the maximum extent permitted by law:</p>
                        <ul>
                            <li>We are not liable for the quality, safety, or legality of cleaning services provided by Cleaners.</li>
                            <li>We are not liable for property damage, personal injury, or losses arising from services booked through the Platform.</li>
                            <li>Our total liability to you shall not exceed the fees paid by you in the 12 months preceding the claim.</li>
                            <li>We disclaim all warranties, express or implied, including merchantability and fitness for a particular purpose.</li>
                        </ul>
                    </Section>

                    <Section title="10. Intellectual Property">
                        <p>All platform content, design, logos, and technology are owned by BookACleaner, Inc. and protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works without our written consent.</p>
                    </Section>

                    <Section title="11. Termination">
                        <p>We may suspend or terminate your account at our discretion for violations of these Terms. You may delete your account at any time through Settings. Outstanding payment obligations survive account termination.</p>
                    </Section>

                    <Section title="12. Governing Law">
                        <p>These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles.</p>
                    </Section>

                    <Section title="13. Changes to Terms">
                        <p>We may update these Terms at any time. Material changes will be communicated via email or platform notification at least 30 days before taking effect. Continued use of the Platform constitutes acceptance of updated Terms.</p>
                    </Section>

                    <Section title="14. Contact">
                        <p>For questions about these Terms of Service:</p>
                        <ul>
                            <li>Email: <a href="mailto:legal@bookacleaner.ai" className="text-brand-400 hover:underline">legal@bookacleaner.ai</a></li>
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
