import React, { useState, useEffect, useCallback } from 'react';
import {
    checkOllamaConnection,
    listOllamaModels,
    formatModelSize,
    parseModelName,
    OllamaModel
} from '../../services/ollamaService';

interface OllamaSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    selectedModel: string;
    onModelSelect: (model: string) => void;
}

export function OllamaSettings({ isOpen, onClose, selectedModel, onModelSelect }: OllamaSettingsProps) {
    const [models, setModels] = useState<OllamaModel[]>([]);
    const [loading, setLoading] = useState(true);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const checkConnection = useCallback(async () => {
        setLoading(true);
        setError(null);

        const connectionResult = await checkOllamaConnection();
        setConnected(connectionResult.connected);

        if (!connectionResult.connected) {
            setError(connectionResult.error || 'Cannot connect to Ollama. Make sure it is running.');
            setLoading(false);
            return;
        }

        const modelsResult = await listOllamaModels();
        if (modelsResult.error) {
            setError(modelsResult.error);
        } else {
            setModels(modelsResult.models);
            // Auto-select first model if none selected
            if (!selectedModel && modelsResult.models.length > 0) {
                onModelSelect(modelsResult.models[0].name);
            }
        }
        setLoading(false);
    }, [selectedModel, onModelSelect]);

    useEffect(() => {
        if (isOpen) {
            checkConnection();
        }
    }, [isOpen, checkConnection]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-lg mx-4 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-purple-600/20 to-pink-600/20">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Ollama Settings
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Connection Status */}
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-black/30">
                        <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <div className="flex-1">
                            <p className="font-medium text-white">
                                {connected ? 'Connected to Ollama' : 'Disconnected'}
                            </p>
                            <p className="text-sm text-gray-400">
                                {connected ? 'localhost:11434' : 'Start Ollama server to continue'}
                            </p>
                        </div>
                        <button
                            onClick={checkConnection}
                            disabled={loading}
                            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm text-white transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Checking...' : 'Refresh'}
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Model Selection */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-300">
                            Select AI Model
                        </label>

                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : models.length === 0 ? (
                            <div className="p-4 rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-200 text-sm">
                                No models found. Run <code className="px-1 py-0.5 bg-black/30 rounded">ollama pull llama2</code> to download a model.
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                {models.map((model) => {
                                    const { baseName, tag } = parseModelName(model.name);
                                    const isSelected = model.name === selectedModel;

                                    return (
                                        <button
                                            key={model.name}
                                            onClick={() => onModelSelect(model.name)}
                                            className={`w-full p-4 rounded-xl text-left transition-all ${isSelected
                                                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg shadow-purple-500/20'
                                                    : 'bg-white/5 hover:bg-white/10 border border-white/10'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="font-semibold text-white">{baseName}</span>
                                                    <span className="ml-2 text-sm text-gray-400">:{tag}</span>
                                                </div>
                                                <span className="text-sm text-gray-400">
                                                    {formatModelSize(model.size)}
                                                </span>
                                            </div>
                                            {isSelected && (
                                                <div className="mt-2 flex items-center gap-1 text-sm text-white/80">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                    Selected
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Instructions */}
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-200 space-y-2">
                        <p className="font-medium">💡 Tips for best results:</p>
                        <ul className="list-disc list-inside space-y-1 text-blue-300/80">
                            <li>Use models with 7B+ parameters for better roleplay</li>
                            <li>Recommended: <code className="px-1 py-0.5 bg-black/30 rounded">mistral</code>, <code className="px-1 py-0.5 bg-black/30 rounded">llama2</code>, or <code className="px-1 py-0.5 bg-black/30 rounded">gemma2</code></li>
                            <li>Larger models produce more creative responses</li>
                        </ul>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/10 bg-black/20 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/30"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

export default OllamaSettings;
