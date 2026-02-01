import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function Contact() {
    const { data, setData, post, processing, errors, reset, recentlySuccessful } = useForm({
        name: '',
        email: '',
        subject: '',
        message: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('contact.send'), {
            onSuccess: () => reset(),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Contact Us" />

            <div className="py-12">
                <div className="mx-auto max-w-2xl px-6">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-4">
                            <span className="material-symbols-outlined text-sm">mail</span>
                            Get In Touch
                        </div>
                        <h1 className="text-white text-4xl md:text-5xl font-bold font-display tracking-tight mb-4">
                            Contact Us
                        </h1>
                        <p className="text-white/60 text-lg">
                            Have a question, feedback, or just want to say hi? We'd love to hear from you.
                        </p>
                    </div>

                    <div className="glass-panel rounded-2xl p-8">
                        {recentlySuccessful && (
                            <div className="mb-6 p-4 rounded-lg bg-green-900/30 border border-green-600/30">
                                <p className="text-green-200 text-sm flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">check_circle</span>
                                    Your message has been sent! We'll get back to you soon.
                                </p>
                            </div>
                        )}

                        <form onSubmit={submit} className="space-y-6">
                            <div>
                                <label htmlFor="name" className="block text-white/80 text-sm font-medium mb-2">
                                    Name
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
                                    placeholder="Your name"
                                    required
                                />
                                {errors.name && (
                                    <p className="mt-2 text-red-400 text-sm">{errors.name}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-white/80 text-sm font-medium mb-2">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
                                    placeholder="your@email.com"
                                    required
                                />
                                {errors.email && (
                                    <p className="mt-2 text-red-400 text-sm">{errors.email}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="subject" className="block text-white/80 text-sm font-medium mb-2">
                                    Subject
                                </label>
                                <input
                                    id="subject"
                                    type="text"
                                    value={data.subject}
                                    onChange={(e) => setData('subject', e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
                                    placeholder="What's this about?"
                                    required
                                />
                                {errors.subject && (
                                    <p className="mt-2 text-red-400 text-sm">{errors.subject}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="message" className="block text-white/80 text-sm font-medium mb-2">
                                    Message
                                </label>
                                <textarea
                                    id="message"
                                    value={data.message}
                                    onChange={(e) => setData('message', e.target.value)}
                                    rows={6}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors resize-none"
                                    placeholder="Your message..."
                                    required
                                />
                                {errors.message && (
                                    <p className="mt-2 text-red-400 text-sm">{errors.message}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full bg-primary hover:bg-primary/90 text-background-dark px-6 py-4 rounded-xl text-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {processing ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">send</span>
                                        Send Message
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <div className="mt-8 text-center text-white/40 text-sm">
                        <p>
                            You can also reach us directly at{' '}
                            <a href="mailto:ainimegamesplatform@gmail.com" className="text-primary hover:underline">
                                ainimegamesplatform@gmail.com
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
