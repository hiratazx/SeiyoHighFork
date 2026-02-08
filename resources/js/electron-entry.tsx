/**
 * Electron Entry Point
 * 
 * Standalone entry point for Electron builds.
 * Initializes the React app with Ollama integration.
 */

import '../css/app.css';
import { createRoot } from 'react-dom/client';
import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import GameApp from './games/seiyo-high/App';
import { OllamaSettings } from './games/seiyo-high/components/OllamaSettings';
import { checkOllamaConnection, listOllamaModels } from './services/ollamaService';
import { setOllamaModel, buildVNSystemPrompt, setSystemPrompt } from './games/seiyo-high/services/ollamaApiService';

// Main Wrapper Component
function ElectronApp() {
    const [showSettings, setShowSettings] = useState(false);
    const [selectedModel, setSelectedModel] = useState<string>('');
    const [ollamaConnected, setOllamaConnected] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Check Ollama on mount
    useEffect(() => {
        const init = async () => {
            const connection = await checkOllamaConnection();
            setOllamaConnected(connection.connected);

            if (connection.connected) {
                const models = await listOllamaModels();
                if (models.models.length > 0) {
                    const defaultModel = models.models[0].name;
                    setSelectedModel(defaultModel);
                    setOllamaModel(defaultModel);
                }
            } else {
                setError('Ollama is not running. Please start Ollama to play.');
            }

            setInitializing(false);
        };

        init();
    }, []);

    const handleModelSelect = useCallback((model: string) => {
        setSelectedModel(model);
        setOllamaModel(model);
    }, []);

    const handleStartGame = useCallback(() => {
        if (!selectedModel) {
            setShowSettings(true);
            return;
        }
        setShowSettings(false);
    }, [selectedModel]);

    // Loading screen
    if (initializing) {
        return (
            <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">AI Visual Novel</h1>
                    <p className="text-gray-400">Connecting to Ollama...</p>
                </div>
            </div>
        );
    }

    // Error screen (Ollama not running)
    if (error && !ollamaConnected) {
        return (
            <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-white/10 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Ollama Not Running</h1>
                    <p className="text-gray-400 mb-6">
                        Please start Ollama to play the game. Run <code className="px-2 py-1 bg-black/30 rounded">ollama serve</code> in your terminal.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition-opacity"
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    // Main Menu
    if (!showSettings && !selectedModel) {
        return (
            <MainMenu
                onStart={() => setShowSettings(true)}
                ollamaConnected={ollamaConnected}
            />
        );
    }

    return (
        <div className="relative w-screen h-screen overflow-hidden">
            {/* Settings Button */}
            <button
                onClick={() => setShowSettings(true)}
                className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg transition-colors backdrop-blur-sm"
                title="Ollama Settings"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>

            {/* Ollama Settings Modal */}
            <OllamaSettings
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                selectedModel={selectedModel}
                onModelSelect={handleModelSelect}
            />

            {/* Game - pass isDeveloper and isSubscribed as false for local builds */}
            <GameApp isDeveloper={false} isSubscribed={false} />
        </div>
    );
}

// Main Menu Component
function MainMenu({ onStart, ollamaConnected }: { onStart: () => void; ollamaConnected: boolean }) {
    return (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            {/* Background Animation */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-pink-500/10 to-transparent rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
                <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 mb-4 animate-gradient">
                    AI Visual Novel
                </h1>
                <p className="text-xl text-gray-300 mb-8">
                    Powered by Ollama
                </p>

                {/* Connection Status */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className={`w-3 h-3 rounded-full ${ollamaConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-gray-400">
                        {ollamaConnected ? 'Ollama Connected' : 'Ollama Disconnected'}
                    </span>
                </div>

                {/* Start Button */}
                <button
                    onClick={onStart}
                    disabled={!ollamaConnected}
                    className="group relative px-12 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xl font-bold transition-all hover:scale-105 hover:shadow-xl hover:shadow-purple-500/30 disabled:opacity-50 disabled:hover:scale-100"
                >
                    <span className="relative z-10">Start Game</span>
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity" />
                </button>

                {!ollamaConnected && (
                    <p className="mt-4 text-sm text-gray-500">
                        Run <code className="px-2 py-1 bg-black/30 rounded">ollama serve</code> to start
                    </p>
                )}
            </div>
        </div>
    );
}

// Mount the app
const container = document.getElementById('app');
if (container) {
    const root = createRoot(container);
    root.render(<ElectronApp />);
} else {
    console.error('[Electron] Could not find #app element to mount React app');
}
