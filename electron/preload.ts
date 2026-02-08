import { contextBridge, ipcRenderer } from 'electron';

export interface OllamaModel {
    name: string;
    modified_at: string;
    size: number;
}

export interface OllamaMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

// Expose safe Ollama APIs to renderer process
contextBridge.exposeInMainWorld('ollama', {
    // List available models
    listModels: (): Promise<{ success: boolean; models?: OllamaModel[]; error?: string }> => {
        return ipcRenderer.invoke('ollama:list-models');
    },

    // Check if Ollama is running
    checkConnection: (): Promise<{ success: boolean; connected: boolean; error?: string }> => {
        return ipcRenderer.invoke('ollama:check-connection');
    },

    // Send a chat message to Ollama
    chat: (model: string, messages: OllamaMessage[], system?: string): Promise<{ success: boolean; response?: string; error?: string }> => {
        return ipcRenderer.invoke('ollama:chat', { model, messages, system });
    },

    // Stream a chat response from Ollama
    chatStream: (model: string, messages: OllamaMessage[], system?: string): Promise<{ success: boolean; response?: string; error?: string }> => {
        return ipcRenderer.invoke('ollama:chat-stream', { model, messages, system });
    },

    // Listen for stream chunks
    onStreamChunk: (callback: (chunk: string) => void) => {
        const handler = (_event: any, chunk: string) => callback(chunk);
        ipcRenderer.on('ollama:stream-chunk', handler);
        return () => ipcRenderer.removeListener('ollama:stream-chunk', handler);
    },
});

// Expose app info
contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
    platform: process.platform,
});
