/**
 * HuggingFace Entry Point
 * 
 * This is a standalone entry point for HuggingFace Spaces deployment.
 * It bypasses Inertia/Laravel and renders the game directly.
 */

import '../css/app.css';
import { createRoot } from 'react-dom/client';
import { useState, useEffect } from 'react';
import GameApp from './games/seiyo-high/App';

// Wrapper component for HuggingFace
function HfGameWrapper() {
    const [isMobile, setIsMobile] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

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

    // Fullscreen state tracking
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            const element = document.documentElement;
            if (element.requestFullscreen) {
                element.requestFullscreen();
            } else if ((element as any).webkitRequestFullscreen) {
                (element as any).webkitRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if ((document as any).webkitExitFullscreen) {
                (document as any).webkitExitFullscreen();
            }
        }
    };

    return (
        <div className="relative w-screen h-screen overflow-hidden">
            {/* Fullscreen button - desktop only */}
            {!isMobile && (
                <button
                    onClick={toggleFullscreen}
                    className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg transition-colors backdrop-blur-sm"
                    aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                    title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                    {isFullscreen ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                    )}
                </button>
            )}
            
            {/* HF demo users are not developers and not subscribed */}
            <GameApp isDeveloper={false} isSubscribed={false} />
        </div>
    );
}

// Mount the app
const container = document.getElementById('app');
if (container) {
    const root = createRoot(container);
    root.render(<HfGameWrapper />);
} else {
    console.error('[HF] Could not find #app element to mount React app');
}
