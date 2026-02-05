/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';

interface ErrorDetailModalProps {
  isVisible: boolean;
  errorMessage: string;
  stepName: string;
  onClose: () => void;
  onRetry: () => void;
  onOpenModelSettings: () => void;
  onOpenApiKeySettings: () => void;
  isRetrying?: boolean;
}

/**
 * Parse error message to determine type and provide helpful guidance
 */
const analyzeError = (errorMessage: string): { type: string; guidance: string; isQuotaError: boolean; isApiKeyError: boolean } => {
  const lowerMessage = errorMessage.toLowerCase();
  
  // Quota/rate limit errors
  if (lowerMessage.includes('quota') || lowerMessage.includes('limit reached') || 
      lowerMessage.includes('daily') || lowerMessage.includes('exhausted') ||
      lowerMessage.includes('too many requests') || lowerMessage.includes('429')) {
    return {
      type: 'Quota Exhausted',
      guidance: 'You\'ve hit your daily usage limit for this model. Try switching to a different image model (Imagen Fast, Ultra, or Gemini native) in Model Settings. Each model has its own quota.',
      isQuotaError: true,
      isApiKeyError: false,
    };
  }
  
  // API key errors
  if (lowerMessage.includes('api key') || lowerMessage.includes('invalid') || 
      lowerMessage.includes('authentication') || lowerMessage.includes('unauthorized') ||
      lowerMessage.includes('401') || lowerMessage.includes('403')) {
    return {
      type: 'API Key Issue',
      guidance: 'Your API key may be invalid or expired. Check your API Key settings to verify it\'s correct. If using a free tier key, note that image generation requires Tier 1 access.',
      isQuotaError: false,
      isApiKeyError: true,
    };
  }
  
  // Tier/permission errors
  if (lowerMessage.includes('tier 1') || lowerMessage.includes('free tier') || 
      lowerMessage.includes('not available') || lowerMessage.includes('not supported')) {
    return {
      type: 'Feature Not Available',
      guidance: 'This feature requires Tier 1 API access. Free tier keys cannot generate images. Either upgrade to Tier 1 (add a payment method for $300 free credits) or disable AI Background Generation and Generative Sprites in Model Settings.',
      isQuotaError: false,
      isApiKeyError: true,
    };
  }
  
  // Safety filter errors - usually NOT actual safety issues, just overloaded servers
  if (lowerMessage.includes('safety') || lowerMessage.includes('blocked') || 
      lowerMessage.includes('content policy') || lowerMessage.includes('prohibited')) {
    return {
      type: 'Safety Filter (Usually Server Overload)',
      guidance: 'Despite the name, this is usually NOT a real content issue — it\'s typically Google\'s servers being overloaded. Try these steps: 1) Retry, 2) Switch to a different model, 3) Try a different API key, 4) Start a new game or load an earlier save. If NONE of these make any difference, then Google\'s servers are definitely overloaded (can last a few minutes to a few hours). Export your save and try again later.',
      isQuotaError: true, // Show model settings button
      isApiKeyError: true, // Show API key button too
    };
  }
  
  // Timeout errors
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return {
      type: 'Request Timeout',
      guidance: 'The request took too long. This can happen during high traffic. Try again - it usually works on retry.',
      isQuotaError: false,
      isApiKeyError: false,
    };
  }
  
  // Generic server errors - servers overloaded
  if (lowerMessage.includes('500') || lowerMessage.includes('502') || 
      lowerMessage.includes('503') || lowerMessage.includes('server error')) {
    return {
      type: 'Server Overloaded',
      guidance: 'Google\'s AI servers are overloaded. Try: 1) Retry, 2) Switch to a different model. If it keeps happening, export your save and come back later — server overloads can last a while.',
      isQuotaError: true, // Show model settings button
      isApiKeyError: false,
    };
  }
  
  // Default
  return {
    type: 'Error',
    guidance: 'An unexpected error occurred. Try clicking Retry. If the error persists, try switching to a different model in Model Settings or check your API key.',
    isQuotaError: false,
    isApiKeyError: false,
  };
};

export const ErrorDetailModal: React.FC<ErrorDetailModalProps> = ({
  isVisible,
  errorMessage,
  stepName,
  onClose,
  onRetry,
  onOpenModelSettings,
  onOpenApiKeySettings,
  isRetrying = false,
}) => {
  if (!isVisible) return null;
  
  const { type, guidance, isQuotaError, isApiKeyError } = analyzeError(errorMessage);
  
  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="vn-modal-panel max-w-lg w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white text-shadow-medium">{type}</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            &times;
          </button>
        </div>
        
        {/* Content */}
        <div className="space-y-4 overflow-y-auto max-h-[50vh] custom-scrollbar">
          {/* Step info */}
          <div className="text-sm text-gray-400">
            Step: <span className="text-cyan-300 font-medium">{stepName}</span>
          </div>
          
          {/* Guidance box */}
          <div className="bg-cyan-900/30 border border-cyan-500/30 rounded-lg p-3">
            <p className="text-cyan-100 text-sm">
              💡 <strong>What to do:</strong> {guidance}
            </p>
          </div>
          
          {/* Full error message */}
          <div className="bg-black/30 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Technical details:</p>
            <p className="text-sm text-gray-300 font-mono break-words whitespace-pre-wrap">
              {errorMessage}
            </p>
          </div>
        </div>
        
        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          {isQuotaError && (
            <button
              onClick={() => { onOpenModelSettings(); onClose(); }}
              className="vn-secondary-button"
            >
              Switch Model
            </button>
          )}
          {isApiKeyError && (
            <button
              onClick={() => { onOpenApiKeySettings(); onClose(); }}
              className="vn-secondary-button"
            >
              API Key
            </button>
          )}
          <button
            onClick={() => { onRetry(); onClose(); }}
            disabled={isRetrying}
            className="vn-secondary-button"
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
          <button
            onClick={onClose}
            className="vn-secondary-button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
