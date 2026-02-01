import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState, useEffect } from 'react';
import { checkExistingSession, setSessionToken } from '@/services/sessionService';

export default function Login({
    status,
    canResetPassword,
    redirect,
}: {
    status?: string;
    canResetPassword: boolean;
    redirect?: string;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
        redirect: redirect || '',
    });

    const [showSessionModal, setShowSessionModal] = useState(false);
    const [checkingSession, setCheckingSession] = useState(false);
    const [sessionEndedMessage, setSessionEndedMessage] = useState<string | null>(null);

    // Check for session_ended or session_expired query params
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('session_ended') === '1') {
            setSessionEndedMessage('Your session ended because you logged in on another device.');
        } else if (params.get('session_expired') === '1') {
            setSessionEndedMessage('Your session has expired. Please log in again.');
        }
        // Clean up URL (keep redirect param for form submission, it's already in form data)
        if (params.get('session_ended') || params.get('session_expired')) {
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    const handleLogin = () => {
        post(route('login'), {
            onFinish: () => reset('password'),
            onSuccess: async () => {
                // Fetch and store the session token after successful login
                try {
                    const response = await fetch('/session-token', {
                        credentials: 'include',
                    });
                    const data = await response.json();
                    if (data.session_token) {
                        setSessionToken(data.session_token);
                    }
                } catch (e) {
                    console.error('Failed to fetch session token:', e);
                }
            },
        });
    };

    const submit: FormEventHandler = async (e) => {
        e.preventDefault();

        // Check for existing session before logging in
        setCheckingSession(true);
        try {
            const result = await checkExistingSession(data.email, data.password);
            
            if (!result.credentials_valid) {
                // Invalid credentials - let normal login handle the error
                handleLogin();
                return;
            }

            if (result.has_active_session) {
                // Show modal to confirm takeover
                setShowSessionModal(true);
                setCheckingSession(false);
                return;
            }

            // No existing session - proceed with login
            handleLogin();
        } catch (error) {
            console.error('Session check failed:', error);
            // On error, proceed with normal login
            handleLogin();
        } finally {
            setCheckingSession(false);
        }
    };

    const confirmTakeover = () => {
        setShowSessionModal(false);
        handleLogin();
    };

    const cancelTakeover = () => {
        setShowSessionModal(false);
        reset('password');
    };

    return (
        <GuestLayout>
            <Head title="Log in" />

            {/* Session Ended Alert */}
            {sessionEndedMessage && (
                <div className="mb-4 rounded-md bg-amber-900/50 border border-amber-600 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-amber-200">{sessionEndedMessage}</p>
                        </div>
                        <div className="ml-auto pl-3">
                            <button
                                onClick={() => setSessionEndedMessage(null)}
                                className="text-amber-400 hover:text-amber-300"
                            >
                                <span className="sr-only">Dismiss</span>
                                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {status && (
                <div className="mb-4 text-sm font-medium text-green-400">
                    {status}
                </div>
            )}

            <form onSubmit={submit}>
                <div>
                    <InputLabel htmlFor="email" value="Email" />

                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full"
                        autoComplete="username"
                        isFocused={true}
                        onChange={(e) => setData('email', e.target.value)}
                    />

                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="password" value="Password" />

                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="mt-1 block w-full"
                        autoComplete="current-password"
                        onChange={(e) => setData('password', e.target.value)}
                    />

                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="mt-4 block">
                    <label className="flex items-center">
                        <Checkbox
                            name="remember"
                            checked={data.remember}
                            onChange={(e) =>
                                setData(
                                    'remember',
                                    (e.target.checked || false) as false,
                                )
                            }
                        />
                        <span className="ms-2 text-sm text-gray-300">
                            Remember me
                        </span>
                    </label>
                </div>

                <div className="mt-4 flex items-center justify-end">
                    {canResetPassword && (
                        <Link
                            href={route('password.request')}
                            className="rounded-md text-sm text-white/60 underline hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background-dark"
                        >
                            Forgot your password?
                        </Link>
                    )}

                    <PrimaryButton className="ms-4" disabled={processing || checkingSession}>
                        {checkingSession ? 'Checking...' : 'Log in'}
                    </PrimaryButton>
                </div>
            </form>

            {/* Session Takeover Modal */}
            {showSessionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
                    <div className="mx-4 w-full max-w-md rounded-2xl glass-panel p-6 shadow-xl">
                        <div className="mb-4 flex items-center">
                            <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                                <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-white font-display">
                                Already Logged In Elsewhere
                            </h3>
                        </div>
                        
                        <p className="mb-6 text-white/70">
                            You're currently playing on another device. If you continue here, your other session will be ended.
                        </p>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={cancelTakeover}
                                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmTakeover}
                                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-background-dark hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                Yes, play here
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </GuestLayout>
    );
}
