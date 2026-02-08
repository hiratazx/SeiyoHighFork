/**
 * Ollama API Service
 * Handles communication with local Ollama server
 */

const OLLAMA_BASE_URL = 'http://127.0.0.1:11434';

export interface OllamaModel {
    name: string;
    modified_at: string;
    size: number;
    digest: string;
    details?: {
        format: string;
        family: string;
        parameter_size: string;
        quantization_level: string;
    };
}

export interface OllamaMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface OllamaChatResponse {
    model: string;
    created_at: string;
    message: OllamaMessage;
    done: boolean;
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    eval_count?: number;
}

/**
 * Check if Ollama is running
 */
export async function checkConnection(): Promise<boolean> {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}

/**
 * List available Ollama models
 */
export async function listModels(): Promise<OllamaModel[]> {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
    }

    const data = await response.json();
    return data.models || [];
}

/**
 * Send a chat message to Ollama (non-streaming)
 */
export async function chat(
    model: string,
    messages: OllamaMessage[],
    system?: string
): Promise<string> {
    const payload: any = {
        model,
        messages,
        stream: false,
    };

    if (system) {
        payload.system = system;
    }

    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`Ollama chat error: ${response.statusText}`);
    }

    const data: OllamaChatResponse = await response.json();
    return data.message.content;
}

/**
 * Send a chat message to Ollama with streaming response
 */
export async function chatStream(
    model: string,
    messages: OllamaMessage[],
    system?: string,
    onChunk?: (chunk: string) => void
): Promise<string> {
    const payload: any = {
        model,
        messages,
        stream: true,
    };

    if (system) {
        payload.system = system;
    }

    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`Ollama chat error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
            try {
                const data: OllamaChatResponse = JSON.parse(line);
                if (data.message?.content) {
                    fullResponse += data.message.content;
                    onChunk?.(data.message.content);
                }
            } catch (e) {
                // Skip invalid JSON lines
            }
        }
    }

    return fullResponse;
}
