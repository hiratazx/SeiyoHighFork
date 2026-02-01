import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';

export default function Dashboard() {
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed (standalone mode)
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
        }
    }, []);

    // Open game page in new tab with install flag - game page handles the actual install
    // Using new tab prevents the Dashboard tab from being closed when PWA installs
    const handleInstallClick = (gameRoute: string) => {
        window.open(`${gameRoute}?install=1`, '_blank');
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-white font-display">
                    Games
                </h2>
            }
        >
            <Head title="Games" />

            <div className="py-12">
                <div className="mx-auto max-w-[960px] px-6">
                    <div className="grid gap-8 lg:grid-cols-2">
                        {/* Game Card */}
                        <Link
                            href={route('game.seiyohigh')}
                            className="group relative overflow-hidden rounded-2xl glass-panel transition-all duration-300 hover:border-primary/40 hover:translate-y-[-4px] md:row-span-2 flex flex-col"
                        >
                            <div className="relative aspect-[4/3] w-full overflow-hidden">
                                <img
                                    src="/images/school_gates_afternoon.jpg"
                                    alt="School gates afternoon - Game preview"
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent" />
                            </div>

                            <div className="p-6 lg:p-8 flex flex-col flex-1 justify-center">
                                <div className="mb-4">
                                    <img 
                                        src="/images/seiyo_transparent1.png" 
                                        alt="Seiyo High" 
                                        className="w-full max-w-xs md:max-w-sm h-auto"
                                    />
                                </div>

                                <p className="text-white/70 leading-relaxed mb-3">
                                    Experience an AI-powered anime adventure where your choices shape the story, entirely unscripted!
                                </p>
                                <p className="text-white/50 text-sm leading-relaxed">
                                    Who will you roleplay? Will you be able to save the broken souls of Seiyo High or leave destruction in your wake?
                                </p>

                                <div className="mt-6 flex items-center gap-4">
                                    <div className="flex items-center gap-2 text-primary font-bold">
                                        <span>Play Now</span>
                                        <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Install App Button - inside game card */}
                            {!isInstalled && (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleInstallClick('/game/seiyo-high');
                                    }}
                                    className="mx-6 mb-6 lg:mx-8 lg:mb-8 flex items-center gap-3 bg-primary/20 hover:bg-primary/30 border border-primary/40 rounded-xl px-4 py-3 transition-all"
                                >
                                    <span className="material-symbols-outlined text-primary">install_mobile</span>
                                    <span className="text-white font-medium text-sm">Install App</span>
                                </button>
                            )}
                        </Link>

                        {/* API Setup Card */}
                        <div className="glass-panel rounded-2xl p-6 lg:p-8 md:row-span-2">
                            <div className="relative w-full mb-6 rounded-xl overflow-hidden">
                                <img
                                    src="/images/SeiyoHighCast.jpg"
                                    alt="Seiyo High Cast"
                                    className="w-full object-contain"
                                />
                            </div>

                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-primary/20 p-2 rounded-full">
                                    <span className="material-symbols-outlined text-primary">key</span>
                                </div>
                                <h2 className="text-xl font-bold text-white font-display">
                                    Get Started with Gemini API
                                </h2>
                            </div>

                            <div className="space-y-4 text-sm">
                                <p className="text-white/70">
                                    <strong className="text-white">Step 1:</strong>{' '}
                                    <a
                                        href="https://aistudio.google.com/app/apikey"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline font-medium"
                                    >
                                        Create your Google Gemini API key here →
                                    </a>
                                </p>

                                <p className="text-white/70">
                                    <strong className="text-white">Step 2:</strong> Add a payment method to unlock <strong>Tier 1</strong> access. This gives you <span className="text-green-400 font-semibold">$300 in free credits</span> from Google!
                                </p>
                                
                                <div className="bg-amber-900/30 border border-amber-600/30 rounded-lg p-3">
                                    <p className="text-amber-200/90 text-sm">
                                        <span className="font-bold">💡 Don't worry:</span> You won't be charged until you explicitly convert to a paid billing account.
                                    </p>
                                </div>

                                <p className="text-white/70">
                                    <strong className="text-white">Why Tier 1?</strong> Google's free tier has very low rate limits—not enough to actually play the game. With Tier 1 + free credits, you can play for hundreds of hours at no cost.
                                </p>
                                
                                <p className="text-white/40 text-xs">
                                    The game itself is completely free during alpha. Your only potential cost is AI usage if you exhaust Google's free credits.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
