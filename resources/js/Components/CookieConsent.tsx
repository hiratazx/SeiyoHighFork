import { Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import PrimaryButton from './PrimaryButton';

// Helper to get a cookie by name
function getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
}

// Helper to set a cookie with expiration (days)
function setCookie(name: string, value: string, days: number) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

export default function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check both cookie and localStorage for backwards compatibility
        const cookieConsent = getCookie('cookie_consent');
        const localConsent = localStorage.getItem('cookie_consent');
        if (!cookieConsent && !localConsent) {
            setIsVisible(true);
        }
    }, []);

    const acceptCookies = () => {
        // Set both cookie (1 year expiry) and localStorage for redundancy
        setCookie('cookie_consent', 'accepted', 365);
        localStorage.setItem('cookie_consent', 'accepted');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center justify-between bg-gray-800 p-4 text-white shadow-lg sm:flex-row sm:px-6 md:px-8">
            <div className="mb-4 text-sm sm:mb-0 sm:mr-4">
                <p>
                    We use functional cookies to ensure the basic performance of our website and to store your preferences.
                    By continuing to use this site, you agree to our use of these essential cookies.
                    See our <Link href={route('terms')} className="underline hover:text-gray-300">Terms of Service</Link> for more details.
                </p>
            </div>
            <div className="flex shrink-0">
                <PrimaryButton onClick={acceptCookies} className="bg-blue-600 hover:bg-blue-500">
                    Accept Functional Cookies
                </PrimaryButton>
            </div>
        </div>
    );
}

