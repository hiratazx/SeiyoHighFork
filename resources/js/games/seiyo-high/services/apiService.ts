// resources/js/games/seiyo-high/services/apiService.ts
import { CharacterConfig, LocationsBySegment, VnScene, TransitionDirectorResponse, InitialStoryFoundation, DailyItinerary, NextDayResponse, ArcManagerAnalysis, NovelChapter, PlayerAnalysisResponse, CharacterDeveloperAnalysis, CanonArchivistResponse } from "../types";
import axios from 'axios';
import { devLog, devWarn, devDebug } from '../lib/devLog';
import { getSessionToken, clearSessionToken } from '../../../services/sessionService';

// Configure axios to send credentials (cookies) with cross-origin requests
// Disabled for HuggingFace builds which use Bearer token auth instead of cookies
if (import.meta.env.VITE_IS_HF_BUILD !== 'true') {
    axios.defaults.withCredentials = true;
}

// ============================================================================
// SESSION TOKEN INTERCEPTORS (Single-Session Enforcement)
// ============================================================================

// Request interceptor: Add session token to all requests
axios.interceptors.request.use((config) => {
    const sessionToken = getSessionToken();
    if (sessionToken) {
        config.headers['X-Session-Token'] = sessionToken;
    }
    
    // [HF DEMO] Add pre-shared auth token for HuggingFace demo builds
    // This authenticates all HF users as the ghost demo user
    const isHfBuild = import.meta.env.VITE_IS_HF_BUILD === 'true';
    const hfAuthToken = import.meta.env.VITE_HF_AUTH_TOKEN;
    if (isHfBuild && hfAuthToken) {
        config.headers['Authorization'] = `Bearer ${hfAuthToken}`;
    }
    
    return config;
});

// Response interceptor: Handle session_ended errors, unauthenticated, and missing API keys
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle session_ended (logged in elsewhere)
        // Skip redirect for HuggingFace builds - they use shared ghost user auth
        const isHfBuildSessionCheck = import.meta.env.VITE_IS_HF_BUILD === 'true';
        if (error.response?.data?.error === 'session_ended' && !isHfBuildSessionCheck) {
            devWarn('[apiService] Session ended - logged in elsewhere');
            
            // Clear the invalid session token
            clearSessionToken();
            
            // Dispatch a custom event that the app can listen to
            window.dispatchEvent(new CustomEvent('session-ended', {
                detail: { message: error.response.data.message }
            }));
            
            // Redirect to login after a short delay to allow UI to show message
            setTimeout(() => {
                window.location.href = '/login?session_ended=1&redirect=/game/seiyo-high';
            }, 100);
        }
        
        // Handle generic 401 Unauthenticated (session expired/invalid)
        // Skip redirect for HuggingFace builds - they use Bearer token auth, not sessions
        const isHfBuild = import.meta.env.VITE_IS_HF_BUILD === 'true';
        if (error.response?.status === 401 && error.response?.data?.message === 'Unauthenticated.' && !isHfBuild) {
            devWarn('[apiService] Session expired - redirecting to login');
            
            // Clear the session token
            clearSessionToken();
            
            // Redirect to login with return URL
            window.location.href = '/login?session_expired=1&redirect=/game/seiyo-high';
        }
        
        // For HF builds, show an error if auth fails (shouldn't happen with valid token)
        if (error.response?.status === 401 && isHfBuild) {
            devWarn('[apiService] HF auth failed - token may be invalid');
            // Let the error propagate so the UI can show it
        }
        
        // Handle missing API key errors (422 with apiKeys validation errors)
        // We let this propagate as a normal error — the ErrorOverlay will show.
        // The player can then navigate to the API key modal themselves via the Menu.
        // (Previously this also auto-opened the API key modal, causing two modals to appear.)
        if (error.response?.status === 422 && error.response?.data?.errors) {
            const errors = error.response.data.errors;
            const apiKeyErrors = Object.keys(errors).filter(key => key.startsWith('apiKeys.'));
            
            if (apiKeyErrors.length > 0) {
                devWarn('[apiService] Missing API key detected', apiKeyErrors);
                return Promise.reject(new Error('Your API key is missing or was cleared. Please re-enter it via Menu → Manage API Key.'));
            }
        }
        
        // Handle HuggingFace demo limit (403 with demo_limit error)
        if (error.response?.status === 403 && error.response?.data?.error === 'demo_limit') {
            devWarn('[apiService] HuggingFace demo limit reached', error.response.data);
            
            // Dispatch event to show demo limit modal
            window.dispatchEvent(new CustomEvent('demo-limit-reached', {
                detail: error.response.data
            }));
        }
        
        return Promise.reject(error);
    }
);

let promptLoggingEnabled = false;

// ============================================================================
// JOB QUEUE POLLING INFRASTRUCTURE
// ============================================================================

interface QueuedJobResponse {
    status: 'queued';
    jobId: string;
}

interface JobStatusResponse {
    status: 'processing' | 'finished' | 'failed';
    data?: any;
    error?: string;
}

/**
 * Poll for job completion. Used after dispatching async AI jobs.
 * @param jobId The UUID of the queued job
 * @param maxWaitMs Maximum time to wait before giving up (default 240s)
 * @returns The job result data
 */
async function pollForResult<T>(jobId: string, maxWaitMs = 240000): Promise<T> {
    const POLL_INTERVAL = 3000; // 3 seconds between polls
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));

        try {
            const { data } = await axios.get<JobStatusResponse>(`/api/v1/game/job-status/${jobId}`);

            if (data.status === 'finished') {
                return data.data as T;
            }

            if (data.status === 'failed') {
                // Parse error for retryable codes
                const errorMsg = data.error || 'Job failed';
                
                if (errorMsg.includes('503') || errorMsg.toLowerCase().includes('unavailable')) {
                    throw new Error('API_ERROR_SERVER_UNAVAILABLE_503');
                }
                if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('rate limit')) {
                    throw new Error('API_ERROR_RATE_LIMIT_429');
                }
                if (errorMsg.toLowerCase().includes('timeout')) {
                    throw new Error('API_ERROR_TIMEOUT');
                }
                
                throw new Error(errorMsg);
            }

            // status === 'processing' -> keep polling
            devLog(`[pollForResult] Job ${jobId} still processing...`);
        } catch (error: any) {
            // Network errors during polling - don't immediately fail, keep trying
            if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
                devWarn(`[pollForResult] Network error during poll, retrying...`);
                continue;
            }
            throw error;
        }
    }

    throw new Error('Request timed out after ' + (maxWaitMs / 1000) + ' seconds');
}

/**
 * Post a request and poll for the async result.
 * Handles the new job queue pattern where POST returns { status: 'queued', jobId: '...' }
 * Exported for use by other service modules.
 */
export async function postWithPolling<T>(url: string, payload: any, maxWaitMs = 240000): Promise<T> {
    const requestPayload = attachPromptLoggingFlag(payload);

    try {
        const { data } = await axios.post<QueuedJobResponse | T>(url, requestPayload);

        // Check if response is a string (error page or unexpected response)
        if (typeof data === 'string') {
            const stringData = data as string;
            
            // Check for common PHP errors
            if (stringData.includes('POST Content-Length') && stringData.includes('exceeds the limit')) {
                throw new Error(`POST request too large. Increase 'post_max_size' in php.ini. Current payload exceeded PHP limit.`);
            }
            
            throw new Error(`Server returned non-JSON response: ${stringData.substring(0, 200)}`);
        }

        // Check if response is a queued job
        if (data && typeof data === 'object' && 'status' in data && data.status === 'queued' && 'jobId' in data) {
            return pollForResult<T>((data as QueuedJobResponse).jobId, maxWaitMs);
        }

        // Fallback for synchronous responses (shouldn't happen after refactor, but safe)
        return data as T;
    } catch (error: any) {
        throw error;
    }
}

// ============================================================================
// END JOB QUEUE POLLING INFRASTRUCTURE
// ============================================================================

export function setPromptLoggingEnabled(enabled: boolean) {
    promptLoggingEnabled = enabled;
}

// Exported so other service modules (e.g., characterDeveloper.service) can reuse
// the same flagging logic and ensure prompt logging stays consistent.
export function attachPromptLoggingFlag(payload: any) {
    const flag = promptLoggingEnabled;
    if (payload === null || typeof payload !== 'object') {
        return payload;
    }
    const nextPayload: any = { ...payload, logPrompt: flag };
    if (nextPayload.clientData && typeof nextPayload.clientData === 'object') {
        nextPayload.clientData = {
            ...nextPayload.clientData,
            logPrompt: flag,
        };
    }
    return nextPayload;
}

// [HF BUILD] If VITE_API_BASE_URL is set (HuggingFace or other external deployment),
// use it as the base URL for all API calls
if (import.meta.env.VITE_API_BASE_URL) {
    axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;
    devLog('[apiService] Using configured API base URL:', import.meta.env.VITE_API_BASE_URL);
}
// In development with Herd, we need to make API calls directly to the Herd domain
// because cookies are set for that domain and won't be sent through the Vite proxy
else if (import.meta.env.DEV && typeof window !== 'undefined') {
    // Check if we're accessing via a .test domain (Herd) or localhost
    const currentHost = window.location.hostname;
    const currentProtocol = window.location.protocol;
    const currentPort = window.location.port;
    
    // If accessing via Herd (.test domain), make API calls directly to that domain
    if (currentHost.includes('.test')) {
        const baseURL = `${currentProtocol}//${currentHost}${currentPort ? ':' + currentPort : ''}`;
        axios.defaults.baseURL = baseURL;
        devLog('[apiService] Herd detected. Setting baseURL to:', baseURL, 'Current origin:', window.location.origin);
    } else if (currentHost === 'localhost' && currentPort !== '5173') {
        // If on localhost but not the Vite dev server, use that
        const baseURL = `${currentProtocol}//${currentHost}${currentPort ? ':' + currentPort : ''}`;
        axios.defaults.baseURL = baseURL;
        devLog('[apiService] Localhost detected. Setting baseURL to:', baseURL);
    } else {
        devLog('[apiService] Using Vite proxy. Current origin:', window.location.origin);
    }
}

// This is the shape of the JSON response from our new controller
export interface GameConfigResponse {
    story: {
        name: string;
    };
    characters: (Omit<CharacterConfig, 'baseProfile'> & { type: 'main' | 'side' })[];
    world: {
        setting_summary: string;
        genre: string;
        inspirations: string[];
        tonal_inspirations: string[];
        key_tropes_and_themes: string[];
        week_structure: string;
        day_structure: string[];
        locationsBySegment: LocationsBySegment;
    }
}

/**
 * Fetches the core game configuration from the Laravel backend.
 */
export async function fetchGameConfig(storyName: string): Promise<GameConfigResponse> {
    try {
        // We use axios for a clean request. Laravel's /api routes
        // are automatically prefixed.
        const response = await axios.get<GameConfigResponse>(`/api/v1/game-config/${storyName}`);
        
        if (response.status === 200) {
            return response.data;
        } else {
            throw new Error(`Failed to fetch game config: ${response.statusText}`);
        }
    } catch (error) {
        console.error("Error fetching game config:", error);
        // This is a critical failure, so we re-throw to let the app handle it.
        throw error;
    }
}

/**
 * Sends the pre-processed data payload to the backend to generate the next scene.
 */
export async function postToDungeonMaster(payload: any): Promise<VnScene> {
    return postWithPolling<VnScene>('/api/v1/game/generate-scene', payload);
}

/**
 * Sends the pre-processed data payload to the backend to analyze the cast.
 */
export async function postToCastAnalyst(payload: any): Promise<any> {
    return postWithPolling<any>('/api/v1/game/analyze-cast', payload);
}

/**
 * Sends the pre-processed data payload to the backend to analyze relationship dynamics.
 */
export async function postToRelationshipAnalyst(payload: any): Promise<any> {
    return postWithPolling<any>('/api/v1/game/analyze-relationship', payload);
}

/**
 * Sends the pre-processed payload to the backend Transition Director service.
 */
export async function postToTransitionDirector(payload: any): Promise<TransitionDirectorResponse> {
    return postWithPolling<TransitionDirectorResponse>('/api/v1/game/generate-transition', payload);
}

export async function postToNarrativeArchitectFoundation(payload: any): Promise<InitialStoryFoundation> {
    return postWithPolling<InitialStoryFoundation>('/api/v1/game/narrative/foundation', payload);
}

export async function postToNarrativeArchitectDayOne(payload: any): Promise<DailyItinerary> {
    return postWithPolling<DailyItinerary>('/api/v1/game/narrative/day-one', payload);
}

export async function postToNarrativeArchitectNextDay(payload: any): Promise<NextDayResponse> {
    return postWithPolling<NextDayResponse>('/api/v1/game/narrative/next-day', payload);
}

export async function postToArcManager(payload: any): Promise<ArcManagerAnalysis> {
    return postWithPolling<ArcManagerAnalysis>('/api/v1/game/narrative/manage-arcs', payload);
}

export async function postToNovelist(payload: any): Promise<NovelChapter> {
    return postWithPolling<NovelChapter>('/api/v1/game/narrative/novelist', payload);
}

export async function postToPsychoanalyst(payload: any): Promise<PlayerAnalysisResponse> {
    return postWithPolling<PlayerAnalysisResponse>('/api/v1/game/narrative/psychoanalyst', payload);
}

/**
 * Sends the pre-processed payload to the backend to develop characters (Personas, Traits, Likes/Dislikes).
 */
export async function postToCharacterDeveloper(payload: any): Promise<CharacterDeveloperAnalysis> {
    return postWithPolling<CharacterDeveloperAnalysis>('/api/v1/game/narrative/develop-characters', payload);
}

/**
 * Sends the pre-processed payload to the backend Canon Archivist to extract facts.
 */
export async function postToCanonArchivist(payload: any): Promise<CanonArchivistResponse> {
    return postWithPolling<CanonArchivistResponse>('/api/v1/game/canon-archivist', payload);
}

export async function postToTranslatorUi(payload: any): Promise<any> {
    return postWithPolling<any>('/api/v1/game/translator/ui', payload);
}

export async function postToTranslatorItinerary(payload: any): Promise<any> {
    return postWithPolling<any>('/api/v1/game/translator/itinerary', payload);
}

export async function postToTranslatorEndOfDay(payload: any): Promise<any> {
    return postWithPolling<any>('/api/v1/game/translator/eod', payload);
}

// Cache Management API Methods

export interface CreateEodCacheResponse {
    cacheName: string | null;
    displayName?: string;
    createdAt?: number;
    error?: string;
    message?: string;
}

export interface DeleteCacheResponse {
    deleted: boolean;
    cacheName: string;
}

/**
 * Create the EOD cache for the pipeline.
 * Called at the start of EOD pipeline, before RelationshipAnalyst.
 */
export async function createEodCache(payload: any): Promise<CreateEodCacheResponse> {
    try {
        const response = await axios.post<CreateEodCacheResponse>('/api/v1/game/cache/create-eod', payload);
        return response.data;
    } catch (error: any) {
        // Check for POST size limit error
        const responseData = error.response?.data;
        if (typeof responseData === 'string' && responseData.includes('POST Content-Length') && responseData.includes('exceeds the limit')) {
            console.error('[createEodCache] POST payload too large. Increase post_max_size in php.ini.');
            return {
                cacheName: null,
                error: 'POST payload too large. Increase post_max_size in php.ini to at least 10M.'
            };
        }
        console.error('Error creating EOD cache:', error);
        return {
            cacheName: null,
            error: error.response?.data?.error || error.message
        };
    }
}

/**
 * Delete a Gemini cache.
 * Called at the end of EOD pipeline to stop billing.
 */
export async function deleteCache(cacheName: string, apiKeys: Record<string, string>): Promise<DeleteCacheResponse> {
    try {
        const response = await axios.post<DeleteCacheResponse>('/api/v1/game/cache/delete', {
            cacheName,
            apiKeys
        });
        return response.data;
    } catch (error: any) {
        console.error('Error deleting cache:', error);
        return {
            deleted: false,
            cacheName
        };
    }
}

/**
 * Decrypt an encrypted string (developer tool).
 * Only works for user ID 1.
 */
export interface DecryptResponse {
    decrypted: string | any;
    wasEncrypted: boolean;
    message?: string;
    error?: string;
}

export async function decryptString(encryptedString: string): Promise<DecryptResponse> {
    try {
        const response = await axios.post<DecryptResponse>('/api/v1/game/dev/decrypt', {
            encrypted: encryptedString
        });
        return response.data;
    } catch (error: any) {
        console.error('Error decrypting string:', error);
        return {
            decrypted: '',
            wasEncrypted: false,
            error: error.response?.data?.error || error.message || 'Decryption failed'
        };
    }
}

/** Response from image regeneration endpoint */
export interface RegenerateImageResponse {
    success: boolean;
    data: string; // base64 encoded image
    mime: string;
    prompt: string;
    error?: string;
}

/**
 * Regenerate a background image using the same prompt.
 * Returns the new image data on success.
 */
export async function regenerateImage(
    prompt: string,
    segment: string,
    aspectRatio: string,
    apiKeys: Record<string, string>,
    imagenModel?: string,
    sanitizerModel?: string
): Promise<RegenerateImageResponse> {
    try {
        const response = await axios.post<RegenerateImageResponse>('/api/v1/game/image/regenerate', {
            prompt,
            segment,
            aspectRatio,
            apiKeys,
            imagenModel,
            sanitizerModel: sanitizerModel || 'gemini-3-flash-preview',
        });
        return response.data;
    } catch (error: any) {
        console.error('Error regenerating image:', error);
        return {
            success: false,
            data: '',
            mime: '',
            prompt: '',
            error: error.response?.data?.error || error.message || 'Image regeneration failed'
        };
    }
}

/** Response from sprite regeneration endpoint */
export interface RegenerateSpriteResponse {
    success: boolean;
    data?: string; // base64 encoded image
    mime?: string;
    error?: string;
}

/**
 * Regenerate a character sprite using the stored appearance prompt.
 * Returns the new image data on success.
 */
export async function regenerateSprite(
    appearancePrompt: string,
    characterName: string,
    apiKeys: Record<string, string>,
    spriteModel?: string
): Promise<RegenerateSpriteResponse> {
    try {
        const response = await axios.post<RegenerateSpriteResponse>('/api/v1/game/sprite/regenerate', {
            appearancePrompt,
            characterName,
            apiKeys,
            spriteModel,
        });
        return response.data;
    } catch (error: any) {
        console.error('Error regenerating sprite:', error);
        return {
            success: false,
            error: error.response?.data?.error || error.message || 'Sprite regeneration failed'
        };
    }
}
