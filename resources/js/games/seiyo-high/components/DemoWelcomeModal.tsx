/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';

interface DemoWelcomeModalProps {
  isVisible: boolean;
  onStartDemo: (playerName: string, apiKey: string) => void;
}

export const DemoWelcomeModal: React.FC<DemoWelcomeModalProps> = ({
  isVisible,
  onStartDemo,
}) => {
  const [playerName, setPlayerName] = useState('Player');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isVisible) {
    return null;
  }

  const handleSubmit = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your Gemini API key');
      return;
    }
    
    if (!playerName.trim()) {
      setError('Please enter a character name');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await onStartDemo(playerName.trim(), apiKey.trim());
    } catch (e: any) {
      setError(e.message || 'Failed to start demo');
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="vn-modal-panel max-w-lg w-full max-h-[90vh] overflow-y-auto my-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-cyan-300 text-shadow-medium mb-2">
            Welcome to Seiyo High Demo!
          </h2>
          <p className="text-gray-300 text-sm">
            Experience AI-powered visual novel storytelling
          </p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-5">
          {/* Player Name Input */}
          <div>
            <label htmlFor="demo-player-name" className="block text-gray-300 mb-2 font-medium">
              Enter your character's name:
            </label>
            <input
              id="demo-player-name"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="vn-text-input w-full text-base"
              placeholder="Player"
              disabled={isLoading}
              autoComplete="off"
            />
          </div>

          {/* API Key Input */}
          <div>
            <label htmlFor="demo-api-key" className="block text-gray-300 mb-2 font-medium">
              Enter your Gemini API key:
            </label>
            <p className="text-yellow-400/80 text-xs mb-2">
              Tier 1 access recommended. In this demo "AI Background Generation" and 
              "Generative Sprites" in Model Settings are disabled by default so you can test with free tier API keys! 
              <br />
              Note: free tier has strict rate limits - fine for trying out the game, but not viable for extended play.
            </p>
            <input
              id="demo-api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={handleKeyDown}
              className="vn-text-input w-full text-base"
              placeholder="AIza..."
              disabled={isLoading}
              autoComplete="off"
            />
            <p className="text-gray-400 text-sm mt-2">
              Get one at{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                Google AI Studio
              </a>
              {' · '}
              <a
                href="https://ainime-games.com/guide"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                Game Guide
              </a>
            </p>
          </div>

          {/* Demo vs Full Version Notice */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/50">
            <p className="text-gray-300 text-sm leading-relaxed mb-3">
              <span className="text-cyan-400 font-medium">About this demo:</span> The starting scenario is the same 
              for all demo players, but you have <span className="text-cyan-300">complete freedom</span> — every conversation, 
              choice, and action you take shapes a unique story from the very first moment.
            </p>
            <p className="text-gray-300 text-sm leading-relaxed mb-3">
              <span className="text-pink-400 font-medium">The full version</span> at{' '}
              <a
                href="https://ainime-games.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                ainime-games.com
              </a>
              {' '}generates a <span className="text-pink-300">wildly different starting point</span> every time — 
              unique character dynamics, story arcs, and plot possibilities from Day 1.
            </p>
            <p className="text-gray-400 text-xs">
              Demo is English only. Full version supports all languages.
            </p>
          </div>

          {/* Session Warning */}
          <div className="bg-amber-900/30 rounded-lg p-4 border border-amber-500/50">
            <p className="text-amber-200 text-sm leading-relaxed">
              <span className="font-bold">Important:</span> Your progress is <span className="font-bold">not saved</span> if 
              you close or refresh this page. To keep your story, use the <span className="text-amber-100 font-medium">Export Save</span> button 
              in the game menu, then import it on{' '}
              <a
                href="https://ainime-games.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                ainime-games.com
              </a>
              {' '}to continue playing.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="vn-primary-button w-full py-3 text-lg font-bold"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⟳</span>
                Loading Demo...
              </span>
            ) : (
              'Start Demo'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
