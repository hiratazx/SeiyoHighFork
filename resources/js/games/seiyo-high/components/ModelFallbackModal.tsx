/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React from 'react';
import { TranslationSet } from '../lib/translations';
import { modelConfigs } from '../lib/modelConfig';

interface ModelFallbackModalProps {
  isOpen: boolean;
  onRetryPro: () => void;
  onUseFlash: () => void;
  onCancel: () => void;
  t: TranslationSet;
}

export const ModelFallbackModal: React.FC<ModelFallbackModalProps> = ({
  isOpen,
  onRetryPro,
  onUseFlash,
  onCancel,
  t,
}) => {
  if (!isOpen) {
    return null;
  }

  // Fetch names from the config to stay up-to-date
  const proModelName = modelConfigs['gemini-2.5-pro']?.displayName || 'Pro';
  const flashModelName = modelConfigs['gemini-flash-latest']?.displayName || 'Flash';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="vn-modal-panel max-w-lg w-full text-center">
        <h2 className="text-2xl font-bold mb-4">{t.modelFallbackTitle}</h2>
        <p className="mb-6 text-lg text-gray-300">
          The story engine ({proModelName}) is currently busy or rate-limited.
        </p>
        <p className="mb-6 text-gray-400">
          This can be a temporary (RPM) limit, or you may have used your free daily (RPD) requests for this model.
        </p>
        <div className="flex flex-col space-y-4">
          <button
            onClick={onRetryPro}
            className="vn-primary-button w-full"
          >
            {t.retryWithModel.replace('{modelName}', proModelName)}
          </button>
          <button
            onClick={onUseFlash}
            className="vn-secondary-button w-full"
          >
            {t.switchToModel.replace('{modelName}', flashModelName)}
          </button>
          <button
            onClick={onCancel}
            className="vn-secondary-button w-full bg-red-800/20 border-red-500/50 text-red-300 hover:bg-red-700/30"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};