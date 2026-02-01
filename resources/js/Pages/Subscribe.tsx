import { Head, usePage, Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';

declare global {
    interface Window {
        Paddle: any;
    }
}

interface Props {
    priceId: string;
    clientToken: string;
    sandbox: boolean;
}

export default function Subscribe({ priceId, clientToken, sandbox }: Props) {
    const { auth } = usePage().props as any;
    const [paddleLoaded, setPaddleLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Don't load Paddle if not configured
        if (!clientToken || clientToken === '') {
            setError('Payment system not yet configured. Coming soon!');
            return;
        }

        // Load Paddle.js
        const script = document.createElement('script');
        script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
        script.async = true;
        script.onload = () => {
            try {
                window.Paddle.Initialize({
                    token: clientToken,
                    environment: sandbox ? 'sandbox' : 'production',
                });
                setPaddleLoaded(true);
            } catch (e) {
                setError('Failed to initialize payment system.');
            }
        };
        script.onerror = () => {
            setError('Failed to load payment system.');
        };
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, [clientToken, sandbox]);

    const handleSubscribe = () => {
        if (!paddleLoaded || !window.Paddle) {
            setError('Payment system not ready. Please refresh and try again.');
            return;
        }

        window.Paddle.Checkout.open({
            items: [{ priceId, quantity: 1 }],
            customer: {
                email: auth.user.email,
            },
            customData: {
                user_id: auth.user.id.toString(),
            },
            successUrl: window.location.origin + '/game/seiyo-high',
        });
    };

    return (
        <>
            <Head title="Subscribe" />
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
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-bold mb-2">Unlock Full Access</h1>
                            <p className="text-gray-400">
                                Continue your story beyond Day 7
                            </p>
                        </div>
                        
                        {/* Price card */}
                        <div className="bg-gradient-to-br from-pink-600/20 to-purple-600/20 rounded-xl p-6 mb-6 border border-pink-500/30">
                            <div className="text-center">
                                <div className="text-5xl font-bold">€10</div>
                                <div className="text-gray-400 text-sm mt-1">/month</div>
                            </div>
                        </div>

                        {/* Features */}
                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center text-sm text-gray-300">
                                <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Unlimited play beyond Day 7
                            </li>
                            <li className="flex items-center text-sm text-gray-300">
                                <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Access to all games on the platform
                            </li>
                            <li className="flex items-center text-sm text-gray-300">
                                <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                New games as they release
                            </li>
                            <li className="flex items-center text-sm text-gray-300">
                                <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Cancel anytime
                            </li>
                        </ul>

                        {/* Error message */}
                        {error && (
                            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mb-6 text-center text-yellow-200 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Subscribe button */}
                        <button
                            onClick={handleSubscribe}
                            disabled={!paddleLoaded && !error}
                            className={`w-full py-4 rounded-xl font-bold text-lg transition transform hover:scale-[1.02] ${
                                paddleLoaded 
                                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 cursor-pointer' 
                                    : error
                                        ? 'bg-gray-600 cursor-not-allowed'
                                        : 'bg-gray-600 cursor-wait'
                            }`}
                        >
                            {paddleLoaded ? 'Subscribe Now' : error ? 'Coming Soon' : 'Loading...'}
                        </button>
                        
                        <p className="text-xs text-gray-500 mt-4 text-center">
                            Secure payment via Paddle. You bring your own Gemini API key.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
