/**
 * Session Token Service
 * 
 * Manages the session token for single-session enforcement.
 * The token is stored in localStorage and sent with all API requests.
 */

const SESSION_TOKEN_KEY = 'game_session_token';

/**
 * Store the session token in localStorage.
 */
export function setSessionToken(token: string): void {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
}

/**
 * Get the current session token from localStorage.
 */
export function getSessionToken(): string | null {
    return localStorage.getItem(SESSION_TOKEN_KEY);
}

/**
 * Clear the session token from localStorage.
 */
export function clearSessionToken(): void {
    localStorage.removeItem(SESSION_TOKEN_KEY);
}

/**
 * Fetch the session token from the server if we don't have one.
 * This handles the case where the user is already logged in but
 * localStorage was cleared (e.g., different browser, cleared data).
 */
export async function fetchSessionTokenIfNeeded(): Promise<string | null> {
    const existingToken = getSessionToken();
    if (existingToken) {
        return existingToken;
    }

    try {
        const response = await fetch('/session-token', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (response.ok) {
            const data = await response.json();
            if (data.session_token) {
                setSessionToken(data.session_token);
                return data.session_token;
            }
        }
    } catch (error) {
        console.error('[sessionService] Failed to fetch session token:', error);
    }

    return null;
}

/**
 * Check if there's an existing session for the given credentials.
 * Returns { has_active_session: boolean, credentials_valid: boolean }
 */
export async function checkExistingSession(email: string, password: string): Promise<{
    has_active_session: boolean;
    credentials_valid: boolean;
}> {
    try {
        // First get CSRF token
        await fetch('/sanctum/csrf-cookie', { credentials: 'include' });

        const response = await fetch('/login/check-session', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-XSRF-TOKEN': getCsrfToken(),
            },
            body: JSON.stringify({ email, password }),
        });

        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('[sessionService] Failed to check session:', error);
    }

    return { has_active_session: false, credentials_valid: false };
}

/**
 * Get the CSRF token from cookies.
 */
function getCsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    if (match) {
        return decodeURIComponent(match[1]);
    }
    return '';
}
