/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React, { useState, useRef } from 'react';
import { TranslationSet } from '../lib/translations';

interface MainMenuProps {
  onStartNewGame: () => void;
  onContinueGame: () => void;
  hasSaveData: boolean;
  isGameActive: boolean;
  onExportState: () => void;
  onImportState: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onGoToReplayMenu: () => void;
  onOpenApiKeyModal: () => void;
  onOpenModelSelectionModal: () => void;
  onOpenDevTools: () => void;
  t: TranslationSet;
  isDeveloper: boolean;
  isHfDemo?: boolean;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartNewGame,
  onContinueGame,
  hasSaveData,
  isGameActive,
  onExportState,
  onImportState,
  onGoToReplayMenu,
  onOpenApiKeyModal,
  onOpenModelSelectionModal,
  onOpenDevTools,
  t,
  isDeveloper,
  isHfDemo = false,
}) => {
  const isGameInProgress = hasSaveData || isGameActive;
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  const handleImportClick = () => {
    if (isGameInProgress) {
      setShowImportConfirm(true);
    } else {
      // No save data to lose, go straight to file picker
      fileInputRef.current?.click();
    }
  };

  const handleConfirmImport = () => {
    setShowImportConfirm(false);
    fileInputRef.current?.click();
  };

  const handleExportAndClose = () => {
    onExportState();
    // Keep modal open so they can import after
  };

  // Track where mousedown started to prevent closing when dragging text
  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    mouseDownTargetRef.current = e.target;
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (mouseDownTargetRef.current === e.target && e.target === e.currentTarget) {
      setShowImportConfirm(false);
    }
    mouseDownTargetRef.current = null;
  };
  const returnToGameText = isGameActive ? t.returnToGame : t.continue;
  const newGameText = isGameInProgress ? t.newGame : t.start;

  return (
    <div className="relative z-10 flex flex-col items-center justify-center md:justify-between gap-12 md:gap-0 h-full text-white text-center p-4 md:p-8 md:pt-24 md:pb-12">
      <div className="w-full flex justify-center">
        <img 
          src={import.meta.env.VITE_IS_HF_BUILD === 'true' 
            ? 'https://ainime-games.com/images/seiyo_transparent1.png' 
            : '/images/seiyo_transparent1.png'} 
          alt="Seiyo High" 
          className="w-[80vw] md:w-[50vw] lg:w-[40vw] max-w-xl h-auto drop-shadow-2xl"
        />
      </div>

      <div>
        <div className="flex flex-col space-y-3 md:space-y-4 items-center">
          {isGameInProgress && (
            <button
              onClick={onContinueGame}
              className="vn-primary-button-dark"
              aria-label={returnToGameText}
            >
              {returnToGameText}
            </button>
          )}
          <div className="relative group">
            <button
              onClick={onStartNewGame}
              className={`vn-primary-button-dark ${isHfDemo ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label={newGameText}
              disabled={isHfDemo}
            >
              {newGameText}
            </button>
            {isHfDemo && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-gray-300 text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-slate-600">
                New game generation unavailable in demo
              </div>
            )}
          </div>
          <button
            onClick={onGoToReplayMenu}
            className="vn-primary-button-dark"
            aria-label={t.replay}
          >
            {t.replay}
          </button>
        </div>
        
        <div className="mt-3 md:mt-6">
          <div className="flex flex-wrap justify-center items-center gap-4">
            {isGameInProgress && (
              <button
                onClick={onExportState}
                className="vn-secondary-button-dark"
                aria-label={t.exportGame}
              >
                {t.exportGame}
              </button>
            )}
            {isDeveloper && (
              <button
                onClick={onOpenDevTools}
                className="vn-secondary-button-dark"
                aria-label={t.devTools}
              >
                {t.devTools}
              </button>
            )}
            
            <button
              onClick={handleImportClick}
              className="vn-secondary-button-dark"
              aria-label={t.importGame}
            >
              {t.importGame}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={onImportState}
              aria-label={t.importGame}
            />

            <button
              onClick={onOpenModelSelectionModal}
              className="vn-secondary-button-dark"
              aria-label={t.model}
            >
              {t.model}
            </button>

            <button
              onClick={onOpenApiKeyModal}
              className="vn-secondary-button-dark"
              aria-label={t.apiKey}
            >
              {t.apiKey}
            </button>

            <button
              onClick={() => window.open('https://ainime-games.com', '_blank')}
              className="vn-secondary-button-dark"
              aria-label={t.website}
            >
              {t.website}
            </button>
          </div>
        </div>
      </div>

      {/* Import Confirmation Modal */}
      {showImportConfirm && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onMouseDown={handleBackdropMouseDown}
          onClick={handleBackdropClick}
        >
          <div className="vn-modal-panel max-w-lg">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-3xl text-cyan-400">warning</span>
              <h3 className="text-xl font-bold text-cyan-300 text-shadow-medium">
                {t.importWarningTitle || 'Import Save Game'}
              </h3>
            </div>
            <p className="text-gray-200 mb-6 leading-relaxed">
              {t.importWarningMessage || 'Importing a save will replace your current game. If you haven\'t backed up your progress, it will be lost forever. We recommend exporting your current save first.'}
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <button
                  onClick={handleExportAndClose}
                  className="vn-secondary-button flex-1"
                >
                  {t.exportGame}
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="vn-primary-button flex-1"
                >
                  {t.importGame}
                </button>
              </div>
              <button
                onClick={() => setShowImportConfirm(false)}
                className="vn-secondary-button w-full"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};