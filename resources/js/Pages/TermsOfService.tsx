import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function TermsOfService() {
    return (
        <AuthenticatedLayout>
            <Head title="Terms of Service" />

            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden glass-panel sm:rounded-2xl">
                        <div className="p-6 text-white/90">
                            <h1 className="mb-6 text-2xl font-bold font-display">Terms of Service & Disclaimer</h1>

                            <section className="mb-8">
                                <h2 className="mb-4 text-xl font-semibold text-primary">1. Alpha Status Disclaimer</h2>
                                <div className="rounded-lg bg-amber-900/30 border border-amber-600/30 p-4">
                                    <p className="text-sm text-amber-200">
                                        <strong>Warning:</strong> This software is currently in an <strong>Alpha</strong> state.
                                    </p>
                                    <ul className="mt-2 list-inside list-disc text-sm text-amber-200/80">
                                        <li>The software is provided "as is", without warranty of any kind.</li>
                                        <li>Expect potential bugs, crashes, or data inconsistencies.</li>
                                        <li>We do not warrant that the service will be uninterrupted or error-free.</li>
                                    </ul>
                                </div>
                            </section>

                            <section className="mb-8">
                                <h2 className="mb-4 text-xl font-semibold text-primary">2. "Bring Your Own Key" (BYOK) Model</h2>
                                <p className="mb-4 text-white/70">
                                    This application operates on a "Bring Your Own Key" model for AI generation features.
                                </p>
                                <ul className="list-inside list-disc space-y-2 text-white/70">
                                    <li>
                                        <strong>Financial Responsibility:</strong> You are solely responsible for any fees incurred by the AI provider (e.g., Google Gemini, OpenAI) while using this software with your API key. We are not responsible for your API costs.
                                    </li>
                                    <li>
                                        <strong>Usage Monitoring:</strong> This game generates large amounts of text. It is your responsibility to monitor your usage quotas and billing status with your AI provider directly.
                                    </li>
                                    <li>
                                        <strong>Key Security & Abuse Monitoring:</strong> You are solely responsible for the security of your API keys and for monitoring your API provider's dashboard for any unauthorized or unusual usage. We strongly recommend setting usage limits and alerts with your AI provider. We are not liable for any unauthorized use of your API key.
                                    </li>
                                    <li>
                                        <strong>Key Handling:</strong> Your API keys are transmitted to our servers solely for the purpose of making API requests on your behalf during active gameplay sessions. Keys are handled in transit and in memory during processing only. We do not permanently store your API keys in any database or persistent storage. Keys may be temporarily held in encrypted session storage or processing queues during active use.
                                    </li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="mb-4 text-xl font-semibold text-primary">3. Data Privacy & Cookies</h2>
                                <p className="mb-4 text-white/70">
                                    We respect your privacy and limit data collection to the essentials required for the application's functionality.
                                </p>
                                <ul className="list-inside list-disc space-y-2 text-white/70">
                                    <li>
                                        <strong>Functional Cookies:</strong> We use functional cookies to store your preferences (such as dark mode or session status). These are essential for the website to function properly.
                                    </li>
                                    <li>
                                        <strong>Data Storage:</strong> We NEVER store any data about your playthroughs, stories, or characters on our servers. All game data lives exclusively on your device and browser. You are solely responsible for backing up your game progress using the 'Export Save' feature.
                                    </li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="mb-4 text-xl font-semibold text-primary">4. Age Requirement & Content Disclaimer</h2>
                                <div className="rounded-lg bg-red-900/30 border border-red-600/30 p-4">
                                    <p className="text-sm text-red-200">
                                        <strong>18+ Only:</strong> This application is intended for users aged 18 years or older.
                                    </p>
                                    <ul className="mt-2 list-inside list-disc text-sm text-red-200/80">
                                        <li>By using this software, you confirm that you are at least 18 years of age.</li>
                                        <li>All characters depicted in the game are fictional adults (18+).</li>
                                        <li>This is a work of fiction. All characters, events, and narratives are entirely fictional and do not represent real individuals or events.</li>
                                    </ul>
                                </div>
                            </section>

                            <section className="mb-8">
                                <h2 className="mb-4 text-xl font-semibold text-primary">5. User-Generated Content & Responsibility</h2>
                                <p className="mb-4 text-white/70">
                                    This application uses AI to generate narrative content based on your inputs.
                                </p>
                                <ul className="list-inside list-disc space-y-2 text-white/70">
                                    <li>
                                        <strong>Your Inputs, Your Content:</strong> All AI-generated output is produced based on your own prompts, choices, and API keys. You acknowledge that you are the initiator of all generated content.
                                    </li>
                                    <li>
                                        <strong>User Responsibility:</strong> You are solely responsible for the content generated through your use of this application. We do not monitor, review, or store the content you generate.
                                    </li>
                                    <li>
                                        <strong>Lawful Use:</strong> You agree not to use this software to generate content that violates applicable laws in your jurisdiction.
                                    </li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="mb-4 text-xl font-semibold text-primary">6. Acceptable Use Policy & Content Restrictions</h2>
                                <p className="mb-4 text-white/70">
                                    While we advocate for creative freedom within adult fiction, strict boundaries apply to ensure the safety and legality of our platform.
                                </p>
                                <div className="rounded-lg bg-red-900/30 border border-red-600/30 p-4 mb-4">
                                    <p className="text-sm font-semibold text-red-200 mb-2">
                                        Prohibited Content — You strictly agree NOT to use the Service to generate, prompt, or attempt to create:
                                    </p>
                                    <ul className="list-inside list-disc text-sm text-red-200/80 space-y-1">
                                        <li>Child Sexual Abuse Material (CSAM) or any content depicting minors in sexual or exploitative scenarios.</li>
                                        <li>Content intentionally designed to depict real, identifiable individuals in sexual or compromising scenarios.</li>
                                        <li>Content that promotes terrorism, extreme violence, or self-harm.</li>
                                        <li>Content depicting real identifiable individuals without their consent.</li>
                                        <li>Any other content that violates applicable laws in your jurisdiction or the terms of your AI provider.</li>
                                    </ul>
                                </div>
                                <ul className="list-inside list-disc space-y-2 text-white/70">
                                    <li>
                                        <strong>Anti-Circumvention:</strong> You agree not to attempt to bypass, disable, or reverse-engineer any safety filters, content moderation systems, or protective mechanisms employed by the Service or our AI providers. This includes, but is not limited to, prompt injection attacks, jailbreaking attempts, or exploiting model vulnerabilities.
                                    </li>
                                    <li>
                                        <strong>Zero Tolerance Policy:</strong> Violation of these policies, particularly regarding CSAM or content involving minors, will result in immediate and permanent account termination. We reserve the right to report violations to relevant authorities (such as NCMEC or law enforcement) where legally required or appropriate.
                                    </li>
                                    <li>
                                        <strong>Fictional Content Only:</strong> All content generated through this service must remain purely fictional. You may not use the service to generate content about real people, real events presented as fact, or content intended to deceive or defraud.
                                    </li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="mb-4 text-xl font-semibold text-primary">7. Indemnification</h2>
                                <p className="text-white/70">
                                    You agree to indemnify, defend, and hold harmless the developer and any affiliated parties from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable legal fees) arising out of or related to your use of the software, your violation of these Terms, or any content generated through your use of the application.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h2 className="mb-4 text-xl font-semibold text-primary">8. Limitation of Liability</h2>
                                <p className="text-white/70">
                                    To the maximum extent permitted by applicable law, Ainimegames and its developers shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages, including but not limited to financial losses, data loss, loss of profits, or service interruptions arising from the use of this software. This software is provided "as is" without warranties of any kind, either express or implied.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h2 className="mb-4 text-xl font-semibold text-primary">9. AI Provider Terms & Content Policies</h2>
                                <p className="mb-4 text-white/70">
                                    This application interfaces with third-party AI providers (such as Google Gemini). Your use of these AI services is also subject to their respective terms of service and acceptable use policies.
                                </p>
                                <ul className="list-inside list-disc space-y-2 text-white/70">
                                    <li>
                                        <strong>Third-Party Services:</strong> We do not control the AI models or their outputs. The behavior, capabilities, and content policies of the AI are determined by your chosen AI provider.
                                    </li>
                                    <li>
                                        <strong>Compliance:</strong> You agree to comply with your AI provider's terms of service in addition to these terms.
                                    </li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="mb-4 text-xl font-semibold text-primary">10. AI Model Availability & Service Limitations</h2>
                                <p className="mb-4 text-white/70">
                                    This application relies on third-party AI models which may experience varying levels of availability.
                                </p>
                                <ul className="list-inside list-disc space-y-2 text-white/70">
                                    <li>
                                        <strong>No Uptime Guarantee:</strong> We do not and cannot guarantee the availability, uptime, or performance of any AI models used within this platform. AI services may become temporarily or permanently unavailable due to provider outages, maintenance, rate limiting, capacity constraints, or changes to third-party services.
                                    </li>
                                    <li>
                                        <strong>Platform Access vs. AI Availability:</strong> Any subscription fees or payments are for access to the Ainimegames platform and its features. Such fees do not constitute a guarantee of AI model availability or performance. You acknowledge that AI functionality depends on third-party services outside our control.
                                    </li>
                                    <li>
                                        <strong>Peak Times & Alternatives:</strong> During periods of high demand, certain AI models may be unavailable or experience degraded performance. In such cases, you may need to switch to alternative AI models, wait for availability to improve, or try again later.
                                    </li>
                                    <li>
                                        <strong>No Refunds for Unavailability:</strong> We are not liable for any losses, damages, or dissatisfaction arising from AI model unavailability. No refunds or credits will be provided due to third-party AI service disruptions.
                                    </li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="mb-4 text-xl font-semibold text-primary">11. GDPR & Data Rights (EU Users)</h2>
                                <p className="mb-4 text-white/70">
                                    For users in the European Union, we comply with the General Data Protection Regulation (GDPR).
                                </p>
                                <ul className="list-inside list-disc space-y-2 text-white/70">
                                    <li>
                                        <strong>Minimal Data Collection:</strong> We collect only essential account data (email, username) required for authentication. We do not collect or store gameplay data, stories, or AI-generated content.
                                    </li>
                                    <li>
                                        <strong>Right to Erasure:</strong> All gameplay data is stored locally in your browser. You can delete this data at any time by clearing your browser storage. To delete your account data from our servers, contact us at the email below.
                                    </li>
                                    <li>
                                        <strong>Data Controller:</strong> Ainimegames acts as the data controller for account data only. For AI-generated content, you are both the controller and processor of your own data.
                                    </li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="mb-4 text-xl font-semibold text-primary">12. Governing Law & Contact</h2>
                                <p className="mb-4 text-white/70">
                                    These terms shall be governed by and construed in accordance with the laws of the Netherlands.
                                </p>
                                <p className="text-white/70">
                                    For any questions or concerns regarding these terms, please contact: <strong className="text-primary">ainimegamesplatform@gmail.com</strong>
                                </p>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

