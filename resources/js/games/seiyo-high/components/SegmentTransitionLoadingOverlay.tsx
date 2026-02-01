import React, { useState, useMemo } from 'react';
import { TranslationSet, englishStrings } from '../lib/translations';
import { SegmentTransitionStep } from '../types';
import { formatApiError } from '../lib/errorUtils';

interface SegmentTransitionLoadingOverlayProps {
  isVisible: boolean;
  currentStep: SegmentTransitionStep;
  t: TranslationSet;
  onExportState: () => void;
  errors: { [step: number]: string | undefined };
  onRetryStep: (step: number) => Promise<void>;
  countdownStepKey: string | null;
  countdownSeconds: number;
  countdownType: 'success' | 'error' | 'timeout' | null;
  onOpenModelSelectionModal: () => void;
  onOpenApiKeyModal: () => void;
  onBackToMenu: () => void;
  isPipelineCompleteAndReady: boolean;
  onProceedAfterPipeline: () => Promise<void>;
}

// Step labels use translation keys - actual labels resolved at render time
const transitionUiStepKeys: Array<{ step: SegmentTransitionStep; labelKey: keyof TranslationSet }> = [
  { step: SegmentTransitionStep.ANALYSIS_COMPLETE, labelKey: 'pipelineSegmentAnalysis' },
  { step: SegmentTransitionStep.SCENE_GENERATION_COMPLETE, labelKey: 'pipelineSegmentGeneratingScene' },
  { step: SegmentTransitionStep.STATE_UPDATE_COMPLETE, labelKey: 'pipelineSegmentStateUpdate' },
];

const stepErrorMapping: { [key in SegmentTransitionStep]?: SegmentTransitionStep } = {
  [SegmentTransitionStep.ANALYSIS_START]: SegmentTransitionStep.ANALYSIS_COMPLETE,
  [SegmentTransitionStep.SCENE_GENERATION_START]: SegmentTransitionStep.SCENE_GENERATION_COMPLETE,
  [SegmentTransitionStep.STATE_UPDATE_START]: SegmentTransitionStep.STATE_UPDATE_COMPLETE,
};


export const SegmentTransitionLoadingOverlay: React.FC<SegmentTransitionLoadingOverlayProps> = ({ 
    isVisible, currentStep, t, onExportState, errors, onRetryStep, 
    countdownStepKey,
    countdownSeconds,
    countdownType,
    onOpenModelSelectionModal, onOpenApiKeyModal, onBackToMenu, isPipelineCompleteAndReady, onProceedAfterPipeline,
}) => {
  const [retryingStep, setRetryingStep] = useState<SegmentTransitionStep | null>(null);
  const [isProceeding, setIsProceeding] = useState(false);

  // Resolve step labels using translations (fallback to English)
  const transitionUiSteps = useMemo(() => 
    transitionUiStepKeys.map(({ step, labelKey }) => ({
      step,
      label: t[labelKey] || englishStrings[labelKey],
    })), [t]
  );

  if (!isVisible) return null;
  
  const handleRetry = async (step: SegmentTransitionStep) => {
    setRetryingStep(step);
    await onRetryStep(step);
    setRetryingStep(null);
  };

  const handleProceed = async () => {
    setIsProceeding(true);
    await onProceedAfterPipeline();
    setIsProceeding(false);
  };

  const isCompleteWithNoError = isPipelineCompleteAndReady && currentStep === SegmentTransitionStep.STATE_UPDATE_COMPLETE && Object.keys(errors).length === 0;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md bg-gray-900/90 p-6 rounded-lg shadow-xl border-2 border-purple-500/30">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <h2 className="text-2xl font-bold text-white">
            {isCompleteWithNoError ? 'Ready for Next Scene' : 'Transitioning...'}
          </h2>
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={onBackToMenu}
              className="vn-secondary-button"
              aria-label="Return to Main Menu"
            >
              Menu
            </button>
            <button
              onClick={onOpenApiKeyModal}
              className="vn-secondary-button"
              aria-label="Manage API Keys"
            >
              API Key
            </button>
            <button
              onClick={onOpenModelSelectionModal}
              className="vn-secondary-button"
              aria-label="Change AI Models"
            >
              Models
            </button>
            <button
              onClick={onExportState}
              className="vn-secondary-button"
              aria-label="Export current save state"
            >
              Export Save
            </button>
          </div>
        </div>

        {isCompleteWithNoError ? (
            <div className="flex flex-col items-center justify-center py-8">
                <p className="text-lg text-gray-300 mb-6">The next scene is ready to begin.</p>
                <button
                onClick={handleProceed}
                disabled={isProceeding}
                className="vn-primary-button w-64 animate-pulse disabled:animate-none"
                >
                {isProceeding ? 'Loading...' : 'Go to Next Scene'}
                </button>
            </div>
        ) : (
          <ul className="space-y-3">
            {transitionUiSteps.map(({ step, label }) => {
              const attemptedStepKey = Object.keys(stepErrorMapping).find(key => stepErrorMapping[parseInt(key) as SegmentTransitionStep] === step);
              const attemptedStep = attemptedStepKey ? parseInt(attemptedStepKey) as SegmentTransitionStep : step - 1;

              const stepKey = `vn_segment_pipeline_v6_${attemptedStep}`;
              const isThisStepInCountdown = countdownStepKey === stepKey;
              const isErrorCountdown = isThisStepInCountdown && countdownType === 'error';
              const isSuccessCountdown = isThisStepInCountdown && countdownType === 'success';
              const isTimeoutCountdown = isThisStepInCountdown && countdownType === 'timeout';

              const errorForThisUiStep = errors[attemptedStep];
              const isComplete = currentStep >= step;
              const isRetryingThisStep = retryingStep === attemptedStep;
              const isInProgress = (currentStep >= attemptedStep && currentStep < step && !errorForThisUiStep && !isSuccessCountdown) || isRetryingThisStep;
              
              let icon = '📋';
              let textClass = 'text-gray-500';
              let retryButton = null;
              let errorText = null;
              let countdownText = null;

              if (isSuccessCountdown) {
                  icon = '⏳';
                  textClass = 'text-white font-semibold animate-pulse';
                  countdownText = <span className="text-xs ml-2 text-cyan-300">(Next step in {countdownSeconds}s...)</span>;
              } else if (isTimeoutCountdown) {
                  icon = '⏳';
                  textClass = 'text-yellow-400 font-semibold animate-pulse';
                  countdownText = <span className="text-xs ml-2 text-yellow-300">(Timeout in {countdownSeconds}s...)</span>;
              } else if (errorForThisUiStep) {
                  icon = '❌';
                  textClass = 'text-red-400';
                  const displayError = formatApiError(errorForThisUiStep);
                  errorText = <span className="text-xs ml-2 text-white">({displayError})</span>;
                  
                  retryButton = (
                      <div className="ml-auto flex gap-2">
                          <button
                              onClick={() => handleRetry(attemptedStep)}
                              disabled={isRetryingThisStep}
                              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded disabled:bg-gray-500 disabled:cursor-not-allowed"
                          >
                              {isRetryingThisStep ? 'Retrying...' : 'Retry'}
                          </button>
                      </div>
                  );
              } else if (isComplete) {
                  icon = '✅';
                  textClass = 'text-gray-400 line-through';
              } else if (isInProgress) {
                  icon = '⏳';
                  textClass = 'text-white font-semibold animate-pulse';
              }

              return (
                <li key={step} className="flex items-center gap-2 text-lg">
                  <span className="w-6 h-6 flex items-center justify-center">{icon}</span>
                  <span className={textClass}>{label}{isInProgress ? '...' : ''}</span>
                  {countdownText}
                  {errorText}
                  {retryButton}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
