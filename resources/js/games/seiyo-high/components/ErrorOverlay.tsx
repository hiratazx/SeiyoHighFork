/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React, { useState } from 'react';
import { TranslationSet } from '../lib/translations';

interface ErrorOverlayProps {
  isVisible: boolean;
  message: string | null;
  onRetry: () => Promise<void>;
  onCancel: () => void;
  t: TranslationSet;
}

export const ErrorOverlay: React.FC<ErrorOverlayProps> = ({
  isVisible,
  message,
  onRetry,
  onCancel,
  t
}) => {
  const [isRetrying, setIsRetrying] = useState(false);

  if (!isVisible) return null;

  const handleRetryClick = async () => {
    setIsRetrying(true);
    await onRetry();
    setIsRetrying(false);
  };

  const displayMessage = message || 'An unknown error occurred.';
  const shortMessage = displayMessage.length > 150 ? displayMessage.substring(0, 147) + '...' : displayMessage;

  return (
    <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="vn-modal-panel max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-center mb-4 text-yellow-300 text-shadow-medium">
          Temporary Issue
        </h2>
        <p className="text-center text-md mb-6 text-gray-300">
          The AI encountered a problem. This might be due to high server load.
        </p>
        <div className="bg-gray-700/50 p-3 rounded-md mb-6 text-center">
          <p className="text-xs text-gray-400 break-words">{shortMessage}</p>
        </div>
        <div className="flex justify-center gap-4">
          <button
            onClick={onCancel}
            className="vn-secondary-button w-36"
            aria-label={t.cancel}
          >
            {t.cancel}
          </button>
          <button
            onClick={handleRetryClick}
            disabled={isRetrying}
            className="vn-primary-button w-36"
            aria-label="Retry"
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      </div>
    </div>
  );
};
