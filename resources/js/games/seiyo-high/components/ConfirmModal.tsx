/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React from 'react';
import { TranslationSet } from '../lib/translations';

interface ConfirmModalProps {
  isVisible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  t: TranslationSet;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ isVisible, onConfirm, onCancel, t }) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="vn-modal-panel max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-shadow-medium">
          {t.areYouSure}
        </h2>
        <p className="text-center text-lg mb-8">{t.newGameWarning}</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={onCancel}
            className="vn-primary-button w-36"
            aria-label={t.cancel}
          >
            {t.cancel}
          </button>
          <button
            onClick={onConfirm}
            className="vn-primary-button w-36 bg-red-600/70 border-red-500/50 hover:bg-red-500/70 hover:border-red-400 focus:ring-red-500/50"
            aria-label={t.confirm}
          >
            {t.confirm}
          </button>
        </div>
      </div>
    </div>
  );
};