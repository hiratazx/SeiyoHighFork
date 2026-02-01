/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React from 'react';
import { TranslationSet } from '../lib/translations';

interface MenuModalProps {
  isVisible: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
  onOpenStory: () => void;
  onOpenItinerary: () => void;
  onToggleShowMotivations: () => void;
  onBackToMenu: () => void;
  showMotivations: boolean;
  t: TranslationSet;
}

export const MenuModal: React.FC<MenuModalProps> = ({
  isVisible,
  onClose,
  onOpenProfile,
  onOpenStory,
  onOpenItinerary,
  onToggleShowMotivations,
  onBackToMenu,
  showMotivations,
  t,
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="vn-modal-panel max-w-xs w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-center mb-6 text-shadow-medium">{t.menu}</h2>
        <div className="flex flex-col gap-4">
          <button onClick={onClose} className="vn-primary-button bg-green-600/40 border-green-500/50 hover:bg-green-500/40">
            {t.returnToGame || "Return to Game"}
          </button>
          <button onClick={() => { onOpenStory(); onClose(); }} className="vn-primary-button">{t.history}</button>
          {/* Debug options - hidden on mobile in production */}
          <button onClick={() => { onOpenItinerary(); onClose(); }} className="vn-primary-button">{t.itinerary}</button>
          <button
            onClick={() => { onToggleShowMotivations(); onClose(); }}
            className={`vn-primary-button ${showMotivations ? 'text-purple-300 font-bold' : ''}`}
          >
            {t.motivations}
          </button>
          <button onClick={() => { onBackToMenu(); onClose(); }} className="vn-primary-button mt-4 bg-red-600/40 border-red-500/50 hover:bg-red-500/40">
            {t.mainMenu || "Main Menu"}
          </button>
        </div>
      </div>
    </div>
  );
};