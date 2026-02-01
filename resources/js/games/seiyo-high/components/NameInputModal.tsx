/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React, {useState} from 'react';
import { TranslationSet } from '../lib/translations';
import { NewGameStep, GeminiModel, CharacterConfig } from '../types';
import { formatApiError } from '../lib/errorUtils';

interface NameInputModalProps {
  onConfirm: (name: string, language: string, overrideModel?: GeminiModel) => void;
  characters: CharacterConfig[];
  t: TranslationSet;
  isLoading: boolean;
  newGameStep: NewGameStep;
  errors: { [step in NewGameStep]?: string };
  onRetryStep: (step: NewGameStep) => Promise<void>;
  countdownStepKey: string | null;
  countdownSeconds: number;
  countdownType: 'success' | 'error' | 'timeout' | null;
  onExportState: () => void;
  onOpenApiKeyModal: () => void;
  onBackToMenu: () => void;
  isPipelineCompleteAndReady: boolean;
  onProceedAfterPipeline: () => Promise<void>;
}

const generationUiSteps = [
  { step: NewGameStep.RESET_STATE_COMPLETE, label: 'Initializing...' },
  { step: NewGameStep.UI_TRANSLATION_COMPLETE, label: (t: TranslationSet) => t.translatingUI },
  { step: NewGameStep.FOUNDATION_GENERATION_COMPLETE, label: (t: TranslationSet) => t.buildingNarrativeFoundation },
  { step: NewGameStep.RELATIONSHIP_DYNAMICS_GENERATION_COMPLETE, label: (t: TranslationSet) => (t as any).generatingRelationshipDynamics || 'Generating relationship dynamics...' }, // [NEW]
  { step: NewGameStep.FOUNDATION_TRAITS_GENERATION_COMPLETE, label: 'Developing Traits...' }, // [NEW]
  { step: NewGameStep.DAY_ONE_ITINERARY_COMPLETE, label: (t: TranslationSet) => t.planningNarrative },
  // [REMOVED] ITINERARY_TRANSLATION step - itinerary no longer shown to players
  { step: NewGameStep.FIRST_SCENE_COMPLETE, label: (t: TranslationSet) => t.settingFirstScene },
  { step: NewGameStep.FINAL_STATE_SAVE_COMPLETE, label: 'Finalizing...' },
];

const stepErrorMapping: { [key in NewGameStep]?: NewGameStep } = {
  [NewGameStep.NOT_STARTED]: NewGameStep.RESET_STATE_COMPLETE,
  [NewGameStep.UI_TRANSLATION_START]: NewGameStep.UI_TRANSLATION_COMPLETE,
  [NewGameStep.FOUNDATION_GENERATION_START]: NewGameStep.FOUNDATION_GENERATION_COMPLETE,
  [NewGameStep.RELATIONSHIP_DYNAMICS_GENERATION_START]: NewGameStep.RELATIONSHIP_DYNAMICS_GENERATION_COMPLETE, // [NEW]
  [NewGameStep.FOUNDATION_TRAITS_GENERATION_START]: NewGameStep.FOUNDATION_TRAITS_GENERATION_COMPLETE, // [NEW]
  [NewGameStep.DAY_ONE_ITINERARY_START]: NewGameStep.DAY_ONE_ITINERARY_COMPLETE,
  // [REMOVED] ITINERARY_TRANSLATION step - no longer runs
  [NewGameStep.FIRST_SCENE_START]: NewGameStep.FIRST_SCENE_COMPLETE,
  [NewGameStep.FINAL_STATE_SAVE_START]: NewGameStep.FINAL_STATE_SAVE_COMPLETE,
};


export const NameInputModal: React.FC<NameInputModalProps> = ({
  onConfirm,
  characters,
  t,
  isLoading,
  newGameStep,
  errors,
  onRetryStep,
  countdownStepKey,
  countdownSeconds,
  countdownType,
  onExportState,
  onOpenApiKeyModal,
  onBackToMenu,
  isPipelineCompleteAndReady,
  onProceedAfterPipeline,
}) => {
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('English');
  const [nameError, setNameError] = useState<string | null>(null);
  const [retryingStep, setRetryingStep] = useState<NewGameStep | null>(null);
  const [isProceeding, setIsProceeding] = useState(false);

  const validateName = (newName: string): boolean => {
    const normalizedInput = newName.trim().toLowerCase();
    if (normalizedInput.length === 0) {
      setNameError(null);
      return false;
    }

    const isTaken = characters.some(char => 
      char.name.toLowerCase() === normalizedInput
    );

    if (isTaken) {
      setNameError("This name is already in use by a character. Please choose another.");
      return false;
    }
    
    setNameError(null);
    return true;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    validateName(newName);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isNameValid = validateName(name);
    
    if (isNameValid && !isLoading) {
      onConfirm(name.trim(), language.trim());
    }
  };
  
  const handleRetry = async (step: NewGameStep) => {
    setRetryingStep(step);
    await onRetryStep(step);
    setRetryingStep(null);
  };

  const handleProceed = async () => {
    setIsProceeding(true);
    await onProceedAfterPipeline();
    setIsProceeding(false);
  };

  const isCompleteWithNoError = isPipelineCompleteAndReady && newGameStep === NewGameStep.FINAL_STATE_SAVE_COMPLETE && Object.keys(errors).length === 0;

  const renderLoadingState = () => (
    <div className="flex flex-col items-center justify-center min-h-[20rem]">
       <div className="w-full flex flex-wrap justify-between items-center gap-4 mb-6 px-2">
         <h2 className="text-2xl font-bold text-white">
            Creating Your Story...
          </h2>
          <div className="flex flex-wrap gap-2 justify-center">
             <button onClick={onBackToMenu} className="vn-secondary-button">Menu</button>
             <button onClick={onOpenApiKeyModal} className="vn-secondary-button">API Key</button>
             <button onClick={onExportState} className="vn-secondary-button">Export Save</button>
           </div>
       </div>

      <ul className="space-y-3 text-left w-full max-w-md">
        {generationUiSteps.map(({ step, label }) => {
            const labelText = typeof label === 'function' ? label(t) : label; 

            // UI Translation is skippable when playing in English
            const isOptionalTranslation = step === NewGameStep.UI_TRANSLATION_COMPLETE;
            const isSkipped = isOptionalTranslation && language.toLowerCase() === 'english' && newGameStep >= step;

            const attemptedStepKey = Object.keys(stepErrorMapping).find(key => stepErrorMapping[parseInt(key) as NewGameStep] === step);
            const attemptedStep = attemptedStepKey ? parseInt(attemptedStepKey) as NewGameStep : step - 1; 

            const stepKey = `vn_new_game_pipeline_v6_${attemptedStep}`;
            const isThisStepInCountdown = countdownStepKey === stepKey;
            const isErrorCountdown = isThisStepInCountdown && countdownType === 'error';
            const isSuccessCountdown = isThisStepInCountdown && countdownType === 'success';
            const isTimeoutCountdown = isThisStepInCountdown && countdownType === 'timeout';

            const errorForThisUiStep = (errors as Record<number, string | undefined>)[attemptedStep]; 
            const isComplete = newGameStep >= step;
            const isRetryingThisStep = retryingStep === attemptedStep;
            const isInProgress = (newGameStep >= attemptedStep && newGameStep < step && !errorForThisUiStep) || isRetryingThisStep;

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
            } else if (isSkipped) {
                icon = '⚪️';
                textClass = 'text-gray-500 italic';
            } else if (isComplete) {
                icon = '✅';
                textClass = 'text-gray-400 line-through';
            } else if (isInProgress) {
                icon = '⏳';
                textClass = 'text-white font-semibold animate-pulse';
            }

            return (
                <li key={step} className="flex items-center gap-2 text-lg">
                    <span className="w-6 h-6 flex items-center justify-center text-xl">
                        {icon}
                    </span>
                    <span className={textClass}>
                        {labelText}{isInProgress ? '...' : ''}
                        {isSkipped ? ' (Skipped)' : ''}
                    </span>
                    {countdownText}
                    {errorText}
                    {retryButton}
                </li>
            );
        })}
      </ul>
    </div>
  );

  const renderReadyState = () => (
    <div className="flex flex-col items-center justify-center min-h-[20rem]">
      <h2 className="text-2xl font-bold text-white mb-4">Ready to Begin!</h2>
      <p className="text-gray-300 mb-8">Your new story has been generated.</p>
      <button 
        onClick={handleProceed} 
        disabled={isProceeding}
        className="vn-primary-button w-64 disabled:animate-none">
        {isProceeding ? 'Starting...' : 'Start Story'}
      </button>
       <div className="mt-8 flex gap-4">
        <button onClick={onBackToMenu} className="vn-secondary-button">Menu</button>
        <button onClick={onExportState} className="vn-secondary-button">Export Save</button>
       </div>
    </div>
  );

  const showLoading = isLoading || (newGameStep > NewGameStep.NOT_STARTED);

  return (
    <div className="absolute inset-0 bg-black/60 z-30 flex items-center justify-center p-4">
      <div className="vn-modal-panel max-w-2xl w-full">
        {showLoading ? (
          isCompleteWithNoError ? renderReadyState() : renderLoadingState()
        ) : (
          <>
            <h2 className="text-3xl font-bold text-center mb-6 text-shadow-medium">
              {t.createYourCharacter}
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
               <div>
                 <label htmlFor="name-input" className="block text-lg text-gray-300 mb-2">
                   {t.whatIsYourName}
                 </label>
                 <input
                   id="name-input"
                   type="text"
                   value={name}
                   onChange={handleNameChange}
                   className={`vn-text-input text-lg w-full ${nameError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : ''}`}
                   placeholder={t.enterYourName}
                   autoFocus
                   maxLength={20}
                 />
                 {nameError && (
                   <p className="text-red-400 text-sm mt-1 px-1">{nameError}</p>
                 )}
               </div>
               <div className="mt-2">
                 <label htmlFor="language-input" className="block text-lg text-gray-300 mb-2">
                   {t.storyLanguage}
                 </label>
                 <input
                   id="language-input"
                   type="text"
                   value={language}
                   onChange={(e) => setLanguage(e.target.value)}
                   className="vn-text-input text-lg w-full"
                   placeholder={t.storyLanguagePlaceholder}
                   maxLength={50}
                 />
               </div>

              <button
                type="submit"
                disabled={!name.trim() || !!nameError || !language.trim() || isLoading}
                className="vn-primary-button w-full mt-4"
                aria-label="Confirm name and language to start game"
              >
                {t.begin}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
