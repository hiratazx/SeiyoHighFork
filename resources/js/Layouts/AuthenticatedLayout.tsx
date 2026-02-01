import ApplicationLogo from '@/Components/ApplicationLogo';
import CookieConsent from '@/Components/CookieConsent';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useState } from 'react';

export default function Authenticated({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const user = usePage().props.auth.user;

    const [showingNavigationDropdown, setShowingNavigationDropdown] =
        useState(false);

    return (
        <div className="flex min-h-screen flex-col bg-background-dark">
            <nav className="border-b border-primary/10 bg-background-dark/95 backdrop-blur-md sticky top-0 z-50">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between">
                        <div className="flex">
                            <div className="flex shrink-0 items-center">
                                <Link href="/" className="flex items-center gap-2 text-primary group">
                                    <img 
                                        src="/images/AI-visual-novel-logo.png" 
                                        alt="Logo" 
                                        className="w-10 h-10 rounded-lg border border-primary/20 bg-primary/10 transition-transform group-hover:scale-110"
                                    />
                                    <span className="text-white font-bold font-display hidden sm:inline">ainime-games</span>
                                </Link>
                            </div>

                            <div className="hidden space-x-8 sm:-my-px sm:ms-10 sm:flex">
                                <NavLink
                                    href={route('dashboard')}
                                    active={route().current('dashboard')}
                                >
                                    Games
                                </NavLink>
                                <NavLink
                                    href={route('guide')}
                                    active={route().current('guide')}
                                >
                                    Game Guide
                                </NavLink>
                                <NavLink
                                    href={route('terms')}
                                    active={route().current('terms')}
                                >
                                    Terms
                                </NavLink>
                                <NavLink
                                    href={route('contact')}
                                    active={route().current('contact')}
                                >
                                    Contact
                                </NavLink>
                            </div>
                        </div>

                        <div className="hidden sm:ms-6 sm:flex sm:items-center">
                            {user ? (
                                <div className="relative ms-3">
                                    <Dropdown>
                                        <Dropdown.Trigger>
                                            <span className="inline-flex rounded-md">
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium leading-4 text-primary transition duration-150 ease-in-out hover:bg-primary/20 focus:outline-none"
                                                >
                                                    {user.name}

                                                    <svg
                                                        className="-me-0.5 ms-2 h-4 w-4"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 20 20"
                                                        fill="currentColor"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                </button>
                                            </span>
                                        </Dropdown.Trigger>

                                        <Dropdown.Content>
                                            <Dropdown.Link
                                                href={route('profile.edit')}
                                            >
                                                Profile
                                            </Dropdown.Link>
                                            <Dropdown.Link
                                                href={route('logout')}
                                                method="post"
                                                as="button"
                                            >
                                                Log Out
                                            </Dropdown.Link>
                                        </Dropdown.Content>
                                    </Dropdown>
                                </div>
                            ) : (
                                <div className="flex space-x-4">
                                    <Link
                                        href={route('login')}
                                        className="rounded-md px-3 py-2 text-sm font-medium text-white/80 transition duration-150 ease-in-out hover:text-primary focus:outline-none"
                                    >
                                        Log in
                                    </Link>
                                    <Link
                                        href={route('register')}
                                        className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-background-dark transition duration-150 ease-in-out hover:bg-primary/90 focus:outline-none"
                                    >
                                        Register
                                    </Link>
                                </div>
                            )}
                        </div>

                        <div className="-me-2 flex items-center sm:hidden">
                            <button
                                onClick={() =>
                                    setShowingNavigationDropdown(
                                        (previousState) => !previousState,
                                    )
                                }
                                className="inline-flex items-center justify-center rounded-md p-2 text-white/60 transition duration-150 ease-in-out hover:bg-white/10 hover:text-primary focus:bg-white/10 focus:text-primary focus:outline-none"
                            >
                                <svg
                                    className="h-6 w-6"
                                    stroke="currentColor"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        className={
                                            !showingNavigationDropdown
                                                ? 'inline-flex'
                                                : 'hidden'
                                        }
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                    <path
                                        className={
                                            showingNavigationDropdown
                                                ? 'inline-flex'
                                                : 'hidden'
                                        }
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div
                    className={
                        (showingNavigationDropdown ? 'block' : 'hidden') +
                        ' sm:hidden'
                    }
                >
                    <div className="space-y-1 pb-3 pt-2">
                        <ResponsiveNavLink
                            href={route('dashboard')}
                            active={route().current('dashboard')}
                        >
                            Games
                        </ResponsiveNavLink>
                        <ResponsiveNavLink
                            href={route('guide')}
                            active={route().current('guide')}
                        >
                            Game Guide
                        </ResponsiveNavLink>
                        <ResponsiveNavLink
                            href={route('terms')}
                            active={route().current('terms')}
                        >
                            Terms
                        </ResponsiveNavLink>
                        <ResponsiveNavLink
                            href={route('contact')}
                            active={route().current('contact')}
                        >
                            Contact
                        </ResponsiveNavLink>
                    </div>

                    {user && (
                        <div className="border-t border-primary/10 pb-1 pt-4">
                            <div className="px-4">
                                <div className="text-base font-medium text-white">
                                    {user.name}
                                </div>
                                <div className="text-sm font-medium text-white/70">
                                    {user.email}
                                </div>
                            </div>

                            <div className="mt-3 space-y-1">
                                <ResponsiveNavLink href={route('profile.edit')}>
                                    Profile
                                </ResponsiveNavLink>
                                <ResponsiveNavLink
                                    method="post"
                                    href={route('logout')}
                                    as="button"
                                >
                                    Log Out
                                </ResponsiveNavLink>
                            </div>
                        </div>
                    )}
                    {!user && (
                        <div className="border-t border-primary/10 pb-1 pt-4">
                            <div className="mt-3 space-y-1">
                                <ResponsiveNavLink href={route('login')}>
                                    Log in
                                </ResponsiveNavLink>
                                <ResponsiveNavLink href={route('register')}>
                                    Register
                                </ResponsiveNavLink>
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            <main className="flex-1">{children}</main>

            <footer className="bg-background-dark border-t border-primary/10 py-4 text-center text-sm text-white/40">
                <span>© {new Date().getFullYear()} Ainime Games</span>
            </footer>

            <CookieConsent />
        </div>
    );
}
