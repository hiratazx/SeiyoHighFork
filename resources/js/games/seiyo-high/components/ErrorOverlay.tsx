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
  onOpenModelSettings?: () => void;
  onOpenApiKeySettings?: () => void;
}

/**
 * Analyze error message to provide helpful guidance
 */
const analyzeError = (errorMessage: string): { type: string; guidance: string; isQuotaError: boolean; isApiKeyError: boolean } => {
  const lowerMessage = errorMessage.toLowerCase();
  
  // Quota/rate limit errors
  if (lowerMessage.includes('quota') || lowerMessage.includes('limit reached') || 
      lowerMessage.includes('daily') || lowerMessage.includes('exhausted') ||
      lowerMessage.includes('too many requests') || lowerMessage.includes('429') ||
      lowerMessage.includes('switch to a different')) {
    return {
      type: 'Quota Exhausted',
      guidance: 'You\'ve hit your daily limit for this model. Switch to a different image model (Imagen Fast, Ultra, or Gemini native) in Model Settings.',
      isQuotaError: true,
      isApiKeyError: false,
    };
  }
  
  // API key / tier errors
  if (lowerMessage.includes('api key') || lowerMessage.includes('invalid') || 
      lowerMessage.includes('tier 1') || lowerMessage.includes('free tier') ||
      lowerMessage.includes('401') || lowerMessage.includes('403')) {
    return {
      type: 'API Key / Tier Issue',
      guidance: 'Check your API key or upgrade to Tier 1. Free tier keys cannot generate images - disable AI Background Generation in Model Settings.',
      isQuotaError: false,
      isApiKeyError: true,
    };
  }
  
  // Safety filter errors - usually NOT actual safety issues, just overloaded servers
  if (lowerMessage.includes('safety') || lowerMessage.includes('blocked') || 
      lowerMessage.includes('content policy')) {
    return {
      type: 'Safety Filter (Usually Server Overload)',
      guidance: 'This is usually NOT a real content issue — it\'s Google\'s servers being overloaded. Try: retry, switch models, different API key, or load an earlier save. If NONE of these help, the servers are definitely overloaded (can last a few minutes to a few hours). Export your save and try later.',
      isQuotaError: true, // Show model settings button
      isApiKeyError: true, // Show API key button too
    };
  }
  
  // Timeout/server errors - servers overloaded
  if (lowerMessage.includes('timeout') || lowerMessage.includes('500') || 
      lowerMessage.includes('502') || lowerMessage.includes('503')) {
    return {
      type: 'Server Overloaded',
      guidance: 'Google\'s servers are overloaded. Try: retry, or switch to a different model. If it persists, export your save and come back later.',
      isQuotaError: true, // Show model settings button
      isApiKeyError: false,
    };
  }
  
  return {
    type: 'Error',
    guidance: 'Try clicking Retry. If it persists, check Model Settings or your API key.',
    isQuotaError: false,
    isApiKeyError: false,
  };
};

export const ErrorOverlay: React.FC<ErrorOverlayProps> = ({
  isVisible,
  message,
  onRetry,
  onCancel,
  t,
  onOpenModelSettings,
  onOpenApiKeySettings,
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [showFullError, setShowFullError] = useState(false);

  if (!isVisible) return null;

  const handleRetryClick = async () => {
    setIsRetrying(true);
    await onRetry();
    setIsRetrying(false);
  };

  const displayMessage = message || 'An unknown error occurred.';
  const { type, guidance, isQuotaError, isApiKeyError } = analyzeError(displayMessage);
  const shortMessage = displayMessage.length > 100 ? displayMessage.substring(0, 97) + '...' : displayMessage;

  return (
    <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="vn-modal-panel max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <h2 className="text-2xl font-bold text-center mb-4 text-shadow-medium">
          {type}
        </h2>
        
        {/* Guidance box */}
        <div className="bg-cyan-900/30 border border-cyan-500/30 rounded-lg p-3 mb-4">
          <p className="text-cyan-100 text-sm">
            💡 {guidance}
          </p>
        </div>
        
        {/* Error message */}
        <div className="bg-black/30 rounded-lg p-3 mb-6">
          <p className="text-xs text-gray-500 mb-1">Technical details:</p>
          {showFullError ? (
            <p className="text-sm text-gray-300 font-mono break-words whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar">
              {displayMessage}
            </p>
          ) : (
            <p className="text-sm text-gray-300 font-mono break-words">
              {shortMessage}
              {displayMessage.length > 100 && (
                <button 
                  onClick={() => setShowFullError(true)}
                  className="ml-1 text-cyan-400 hover:underline"
                >
                  [show more]
                </button>
              )}
            </p>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex flex-wrap gap-2 justify-center">
          {isQuotaError && onOpenModelSettings && (
            <button
              onClick={onOpenModelSettings}
              className="vn-secondary-button"
            >
              Models
            </button>
          )}
          {isApiKeyError && onOpenApiKeySettings && (
            <button
              onClick={onOpenApiKeySettings}
              className="vn-secondary-button"
            >
              API Key
            </button>
          )}
          <button
            onClick={onCancel}
            className="vn-secondary-button"
            aria-label={t.cancel}
          >
            {t.cancel}
          </button>
          <button
            onClick={handleRetryClick}
            disabled={isRetrying}
            className="vn-primary-button w-auto px-6"
            aria-label="Retry"
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      </div>
    </div>
  );
};
