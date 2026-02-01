import { Head, usePage } from '@inertiajs/react';
import { useEffect, useState, useRef } from 'react';
import GameApp from '@/games/seiyo-high/App';
import { fetchSessionTokenIfNeeded, clearSessionToken } from '@/services/sessionService';

// Type for the beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function SeiyoHigh() {
    const { isDeveloper, isSubscribed } = usePage().props as { 
        isDeveloper?: boolean;
        isSubscribed?: boolean;
    };
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);
    const [showInstallOverlay, setShowInstallOverlay] = useState(false);
    const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

    // PWA Install handling
    useEffect(() => {
        // Check for ?install=1 on mount
        const params = new URLSearchParams(window.location.search);
        const wantsInstall = params.get('install') === '1';
        if (wantsInstall) {
            // Clean up URL
            window.history.replaceState({}, '', window.location.pathname);
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            installPromptRef.current = e as BeforeInstallPromptEvent;
            
            // If we came from Dashboard with ?install=1, show install overlay
            if (wantsInstall) {
                setShowInstallOverlay(true);
            }
        };

        const handleAppInstalled = () => {
            installPromptRef.current = null;
            setShowInstallOverlay(false);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    // Must be called from user gesture (click)
    const handleInstallClick = async () => {
        if (!installPromptRef.current) return;
        
        try {
            await installPromptRef.current.prompt();
            const { outcome } = await installPromptRef.current.userChoice;
            
            if (outcome === 'accepted') {
                installPromptRef.current = null;
            }
            setShowInstallOverlay(false);
        } catch (error) {
            console.error('[PWA] Install prompt failed:', error);
            setShowInstallOverlay(false);
        }
    };

    // Verify auth and fetch session token on page load
    useEffect(() => {
        const verifyAuth = async () => {
            try {
                // This endpoint requires auth - if it fails, user is not logged in
                const response = await fetch('/session-token', {
                    credentials: 'include',
                    headers: { 'Accept': 'application/json' },
                });
                
                if (response.status === 401 || !response.ok) {
                    // Not authenticated - redirect to login
                    clearSessionToken();
                    window.location.href = '/login?session_expired=1&redirect=/game/seiyo-high';
                    return;
                }
                
                // Auth valid - store session token and proceed
                const data = await response.json();
                if (data.session_token) {
                    const { setSessionToken } = await import('@/services/sessionService');
                    setSessionToken(data.session_token);
                }
                
                setAuthChecked(true);
            } catch (error) {
                console.error('[SeiyoHigh] Auth check failed:', error);
                // On network error, redirect to login
                clearSessionToken();
                window.location.href = '/login?session_expired=1&redirect=/game/seiyo-high';
            }
        };
        
        verifyAuth();
    }, []);

    // Detect mobile on mount
    useEffect(() => {
        const checkMobile = () => {
            const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
                || (window.matchMedia('(max-width: 768px)').matches && 'ontouchstart' in window);
            setIsMobile(mobile);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            const element = document.documentElement;
            if (element.requestFullscreen) {
                element.requestFullscreen();
            } else if ((element as any).webkitRequestFullscreen) {
                (element as any).webkitRequestFullscreen();
            } else if ((element as any).mozRequestFullScreen) {
                (element as any).mozRequestFullScreen();
            } else if ((element as any).msRequestFullscreen) {
                (element as any).msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if ((document as any).webkitExitFullscreen) {
                (document as any).webkitExitFullscreen();
            } else if ((document as any).mozCancelFullScreen) {
                (document as any).mozCancelFullScreen();
            } else if ((document as any).msExitFullscreen) {
                (document as any).msExitFullscreen();
            }
        }
    };

    // Show loading while checking auth
    if (!authChecked) {
        return (
            <>
                <Head title="Seiyo High" />
                <div className="w-screen h-screen bg-[#1a1a2e] flex items-center justify-center">
                    <div className="text-white/60 text-lg">Loading...</div>
                </div>
            </>
        );
    }

    return (
        <>
            <Head title="Seiyo High" />
            <div className="relative w-screen h-screen overflow-hidden">
                {/* Fullscreen button - desktop only (mobile browsers hide their bar naturally when scrolling) */}
                {!isMobile && (
                    <button
                        onClick={toggleFullscreen}
                        className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg transition-colors backdrop-blur-sm"
                        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                        title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                    >
                        {isFullscreen ? (
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        ) : (
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                                />
                            </svg>
                        )}
                    </button>
                )}
                <GameApp isDeveloper={isDeveloper === true} isSubscribed={isSubscribed === true} />

                {/* PWA Install Overlay */}
                {showInstallOverlay && (
                    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
                        <div className="bg-[#1a1a2e] border border-white/20 rounded-2xl p-6 max-w-sm text-center">
                            <div className="mb-4">
                                <span className="material-symbols-outlined text-5xl text-primary">install_mobile</span>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Install Seiyo High</h2>
                            <p className="text-white/70 mb-6">
                                Install the app for a better experience with fullscreen gameplay and quick access.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowInstallOverlay(false)}
                                    className="flex-1 px-4 py-3 border border-white/20 rounded-xl text-white/70 hover:bg-white/10 transition-colors"
                                >
                                    Not Now
                                </button>
                                <button
                                    onClick={handleInstallClick}
                                    className="flex-1 px-4 py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-colors"
                                >
                                    Install
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
