import CookieConsent from '@/Components/CookieConsent';
import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="flex min-h-screen flex-col items-center bg-background-dark pt-6 sm:justify-center sm:pt-0">
            <div>
                <Link href="/" className="flex flex-col items-center gap-4 text-primary group">
                    <img 
                        src="/images/AI-visual-novel-logo.png" 
                        alt="Logo" 
                        className="w-24 h-24 rounded-2xl border-2 border-primary/20 bg-primary/10 shadow-[0_0_30px_rgba(244,157,37,0.15)] transition-transform group-hover:scale-105"
                    />
                    <span className="text-white text-3xl font-bold font-display">ainime-games</span>
                </Link>
            </div>

            <div className="mt-6 w-full overflow-hidden glass-panel px-6 py-6 sm:max-w-md sm:rounded-2xl">
                {children}
            </div>

            <footer className="mt-8 text-center text-sm text-white/40">
                <Link href={route('terms')} className="hover:text-primary hover:underline transition-colors">
                    Terms of Service & Disclaimer
                </Link>
            </footer>

            <CookieConsent />
        </div>
    );
}
