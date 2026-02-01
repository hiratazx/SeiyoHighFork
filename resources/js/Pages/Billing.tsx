import { Head, Link, useForm } from '@inertiajs/react';

interface Props {
    subscription: {
        status: string;
        onGracePeriod: boolean;
        endsAt: string | null;
    };
}

export default function Billing({ subscription }: Props) {
    const cancelForm = useForm({});
    const resumeForm = useForm({});

    const handleCancel = (e: React.FormEvent) => {
        e.preventDefault();
        if (confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.')) {
            cancelForm.post('/billing/cancel');
        }
    };

    const handleResume = (e: React.FormEvent) => {
        e.preventDefault();
        resumeForm.post('/billing/resume');
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'text-green-400 bg-green-400/20';
            case 'past_due':
                return 'text-yellow-400 bg-yellow-400/20';
            case 'canceled':
                return 'text-red-400 bg-red-400/20';
            default:
                return 'text-gray-400 bg-gray-400/20';
        }
    };

    return (
        <>
            <Head title="Billing" />
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    {/* Back link */}
                    <Link 
                        href="/"
                        className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Dashboard
                    </Link>

                    <div className="bg-gray-800/80 backdrop-blur rounded-2xl p-8 shadow-2xl border border-gray-700">
                        <h1 className="text-2xl font-bold mb-6">Manage Subscription</h1>

                        {/* Status card */}
                        <div className="bg-gray-700/50 rounded-xl p-6 mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-gray-400">Status</span>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(subscription.status)}`}>
                                    {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1).replace('_', ' ')}
                                </span>
                            </div>

                            {subscription.onGracePeriod && subscription.endsAt && (
                                <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 text-sm">
                                    <p className="text-yellow-200">
                                        Your subscription has been cancelled. You have access until <strong>{formatDate(subscription.endsAt)}</strong>.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="space-y-4">
                            {subscription.onGracePeriod ? (
                                <form onSubmit={handleResume}>
                                    <button
                                        type="submit"
                                        disabled={resumeForm.processing}
                                        className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl font-bold transition transform hover:scale-[1.02] disabled:opacity-50"
                                    >
                                        {resumeForm.processing ? 'Resuming...' : 'Resume Subscription'}
                                    </button>
                                </form>
                            ) : subscription.status === 'active' ? (
                                <form onSubmit={handleCancel}>
                                    <button
                                        type="submit"
                                        disabled={cancelForm.processing}
                                        className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium transition disabled:opacity-50"
                                    >
                                        {cancelForm.processing ? 'Cancelling...' : 'Cancel Subscription'}
                                    </button>
                                </form>
                            ) : null}

                            <Link
                                href={route('game.seiyohigh')}
                                className="block w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 rounded-xl font-bold text-center transition transform hover:scale-[1.02]"
                            >
                                Continue Playing
                            </Link>
                        </div>

                        <p className="text-xs text-gray-500 mt-6 text-center">
                            Subscription managed via Paddle. For billing inquiries, contact support.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
