/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React from 'react';
import { TranslationSet } from '../lib/translations';

interface EndGameScreenProps {
  playthroughCounter: number;
  onNewGame: () => void;
  onExportState: () => void;
  onStartNextPlaythrough: () => void;
  onExportStory: () => void;
  t: TranslationSet;
}

// Use absolute URL for HuggingFace build (images served from main site)
const MAIN_MENU_BACKGROUND_URL = import.meta.env.VITE_IS_HF_BUILD === 'true'
  ? 'https://ainime-games.com/images/hero.jpg'
  : '/images/hero.jpg';

export const EndGameScreen: React.FC<EndGameScreenProps> = ({ playthroughCounter, onNewGame, onExportState, onStartNextPlaythrough, onExportStory, t }) => {
  return (
    <>
      <div
        className="fixed inset-0 bg-cover bg-center transition-opacity duration-1000"
        style={{ backgroundImage: `url(${MAIN_MENU_BACKGROUND_URL})` }}
      />
      <div className="fixed inset-0 bg-black/40 backdrop-brightness-50" />
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-8 text-white">
        <div className="vn-modal-panel max-w-lg w-full text-center">
          <h2 className="text-4xl font-bold font-['Playfair_Display'] text-cyan-200 text-shadow-medium mb-4">
            {t.endGameCongratulations}
          </h2>
          <p className="text-xl text-gray-300 mb-2">
            {t.endGameCompletionMessage}
          </p>
          <p className="text-lg text-gray-400 mb-8">
            {t.endGamePlaythroughComplete.replace('{playthroughCounter}', String(playthroughCounter))}
          </p>

          <div className="flex flex-col space-y-4 w-64 mx-auto">
            <button
              onClick={onStartNextPlaythrough}
              className="px-6 py-3 bg-pink-600 hover:bg-pink-700 rounded-lg text-lg font-bold transition-transform transform hover:scale-105"
            >
              Begin the Next Chapter
            </button>
            <button
              onClick={onExportStory}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-md transition-transform transform hover:scale-105"
            >
              {t.exportStory}
            </button>
            <button
              onClick={onExportState}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-md transition-transform transform hover:scale-105"
            >
              Download Final Save
            </button>
            <button
              onClick={onNewGame}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-md transition-transform transform hover:scale-105"
            >
              Start a Completely New Game
            </button>
          </div>
        </div>
      </div>
    </>
  );
};