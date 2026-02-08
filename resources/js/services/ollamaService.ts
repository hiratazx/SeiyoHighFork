/**
 * Ollama Service for Renderer Process
 * Uses the bridged ollama API exposed by preload script
 */

export interface OllamaModel {
    name: string;
    modified_at: string;
    size: number;
}

export interface OllamaMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

// Type declaration for the window.ollama API
declare global {
    interface Window {
        ollama?: {
            listModels: () => Promise<{ success: boolean; models?: OllamaModel[]; error?: string }>;
            checkConnection: () => Promise<{ success: boolean; connected: boolean; error?: string }>;
            chat: (model: string, messages: OllamaMessage[], system?: string) => Promise<{ success: boolean; response?: string; error?: string }>;
            chatStream: (model: string, messages: OllamaMessage[], system?: string) => Promise<{ success: boolean; response?: string; error?: string }>;
            onStreamChunk: (callback: (chunk: string) => void) => () => void;
        };
        electronAPI?: {
            isElectron: boolean;
            platform: string;
        };
    }
}

/**
 * Check if running in Electron
 */
export function isElectron(): boolean {
    return typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
}

/**
 * Check if Ollama is available and connected
 */
export async function checkOllamaConnection(): Promise<{ connected: boolean; error?: string }> {
    if (!isElectron() || !window.ollama) {
        // In browser mode, try direct API call
        try {
            const response = await fetch('http://127.0.0.1:11434/api/tags');
            return { connected: response.ok };
        } catch (error) {
            return { connected: false, error: 'Ollama not running' };
        }
    }

    const result = await window.ollama.checkConnection();
    return { connected: result.connected, error: result.error };
}

/**
 * List available Ollama models
 */
export async function listOllamaModels(): Promise<{ models: OllamaModel[]; error?: string }> {
    if (!isElectron() || !window.ollama) {
        // Browser mode fallback
        try {
            const response = await fetch('http://127.0.0.1:11434/api/tags');
            if (!response.ok) throw new Error('Failed to fetch models');
            const data = await response.json();
            return { models: data.models || [] };
        } catch (error: any) {
            return { models: [], error: error.message };
        }
    }

    const result = await window.ollama.listModels();
    return { models: result.models || [], error: result.error };
}

/**
 * Chat with Ollama
 */
export async function chatWithOllama(
    model: string,
    messages: OllamaMessage[],
    system?: string
): Promise<{ response: string; error?: string }> {
    if (!isElectron() || !window.ollama) {
        // Browser mode fallback
        try {
            const response = await fetch('http://127.0.0.1:11434/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, messages, system, stream: false }),
            });
            if (!response.ok) throw new Error('Chat request failed');
            const data = await response.json();
            return { response: data.message?.content || '' };
        } catch (error: any) {
            return { response: '', error: error.message };
        }
    }

    const result = await window.ollama.chat(model, messages, system);
    return { response: result.response || '', error: result.error };
}

/**
 * Chat with Ollama using streaming
 */
export async function chatWithOllamaStream(
    model: string,
    messages: OllamaMessage[],
    system?: string,
    onChunk?: (chunk: string) => void
): Promise<{ response: string; error?: string }> {
    if (!isElectron() || !window.ollama) {
        // Browser mode fallback with streaming
        try {
            const response = await fetch('http://127.0.0.1:11434/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, messages, system, stream: true }),
            });

            if (!response.ok) throw new Error('Chat request failed');

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let fullResponse = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        if (data.message?.content) {
                            fullResponse += data.message.content;
                            onChunk?.(data.message.content);
                        }
                    } catch (e) {
                        // Skip invalid JSON
                    }
                }
            }

            return { response: fullResponse };
        } catch (error: any) {
            return { response: '', error: error.message };
        }
    }

    // Electron mode - use IPC with stream listener
    const removeListener = window.ollama!.onStreamChunk(chunk => {
        onChunk?.(chunk);
    });

    try {
        const result = await window.ollama!.chatStream(model, messages, system);
        removeListener();
        return { response: result.response || '', error: result.error };
    } catch (error: any) {
        removeListener();
        return { response: '', error: error.message };
    }
}

/**
 * Format model size for display
 */
export function formatModelSize(bytes: number): string {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) {
        return `${gb.toFixed(1)} GB`;
    }
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
}

/**
 * Parse model name to get base name and tag
 */
export function parseModelName(name: string): { baseName: string; tag: string } {
    const [baseName, tag = 'latest'] = name.split(':');
    return { baseName, tag };
}
