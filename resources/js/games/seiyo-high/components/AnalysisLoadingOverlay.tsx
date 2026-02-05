/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React, { useState } from 'react';
import { EndOfDayStep, PsychologicalProfiles, CharacterConfig } from '../types'; 

import { TranslationSet, englishStrings } from '../lib/translations';
import { ErrorDetailModal } from './ErrorDetailModal';

interface AnalysisLoadingOverlayProps {
  isVisible: boolean;
  currentStep: EndOfDayStep;
  characters: CharacterConfig[];
  psychologicalProfiles: PsychologicalProfiles | null;
  psychologicalProfilesTranslated: PsychologicalProfiles | null | undefined;
  playerPsychoanalysisProse: string | null;
  playerPsychoanalysisProseTranslated: string | null | undefined;
  playerName: string;
  onExportState: () => void;
  errors: { [step in EndOfDayStep]?: string };
  onRetryStep: (step: EndOfDayStep) => Promise<void>;
  countdownStepKey: string | null;
  countdownSeconds: number;
  countdownType: 'success' | 'error' | 'timeout' | null;
  onOpenModelSelectionModal: () => void;
  onOpenApiKeyModal: () => void;
  onBackToMenu: () => void;
  onStartNextDay: () => Promise<void>;
  currentDay: number;
  uiTranslations?: TranslationSet;
}

import { formatApiError } from '../lib/errorUtils';

// NOTE: TRANSLATION_COMPLETE removed - translation now handled by individual personas (RA, Psychoanalyst, Novelist)
// Step labels use translation keys - actual labels resolved at render time
const analysisUiStepKeys: Array<{ step: EndOfDayStep; labelKey: keyof TranslationSet }> = [
  { step: EndOfDayStep.ARCHIVE_SEGMENT_COMPLETE, labelKey: 'pipelineEodArchiving' },
  { step: EndOfDayStep.RELATIONSHIP_ANALYSIS_COMPLETE, labelKey: 'pipelineEodRelationships' },
  { step: EndOfDayStep.CASTING_ANALYSIS_COMPLETE, labelKey: 'pipelineEodCasting' },
  { step: EndOfDayStep.PLAYER_ANALYSIS_COMPLETE, labelKey: 'pipelineEodPlayerAnalysis' },
  { step: EndOfDayStep.NOVEL_CHAPTER_COMPLETE, labelKey: 'pipelineEodNovelChapter' },
  { step: EndOfDayStep.ARCHIVIST_COMPLETE, labelKey: 'pipelineEodArchivist' },
  { step: EndOfDayStep.ARC_MANAGER_COMPLETE, labelKey: 'pipelineEodArcManager' },
  { step: EndOfDayStep.CHARACTER_DEVELOPER_COMPLETE, labelKey: 'pipelineEodCharacterDeveloper' },
  { step: EndOfDayStep.PLANNER_COMPLETE, labelKey: 'pipelineEodPlanner' },
  { step: EndOfDayStep.SCENE_GENERATION_COMPLETE, labelKey: 'pipelineEodSceneGeneration' },
  { step: EndOfDayStep.FINAL_STATE_SAVE_COMPLETE, labelKey: 'pipelineEodSaving' },
];
const stepErrorMapping: { [key in EndOfDayStep]?: EndOfDayStep } = { [EndOfDayStep.NOT_STARTED]: EndOfDayStep.ARCHIVE_SEGMENT_COMPLETE, [EndOfDayStep.CASTING_ANALYSIS_START]: EndOfDayStep.CASTING_ANALYSIS_COMPLETE, [EndOfDayStep.RELATIONSHIP_ANALYSIS_START]: EndOfDayStep.RELATIONSHIP_ANALYSIS_COMPLETE, [EndOfDayStep.PLAYER_ANALYSIS_START]: EndOfDayStep.PLAYER_ANALYSIS_COMPLETE, [EndOfDayStep.NOVEL_CHAPTER_START]: EndOfDayStep.NOVEL_CHAPTER_COMPLETE, [EndOfDayStep.ARCHIVIST_START]: EndOfDayStep.ARCHIVIST_COMPLETE, [EndOfDayStep.ARC_MANAGER_START]: EndOfDayStep.ARC_MANAGER_COMPLETE, [EndOfDayStep.CHARACTER_DEVELOPER_START]: EndOfDayStep.CHARACTER_DEVELOPER_COMPLETE, [EndOfDayStep.PLANNER_START]: EndOfDayStep.PLANNER_COMPLETE, [EndOfDayStep.SCENE_GENERATION_START]: EndOfDayStep.SCENE_GENERATION_COMPLETE, [EndOfDayStep.FINAL_STATE_SAVE_START]: EndOfDayStep.FINAL_STATE_SAVE_COMPLETE, };

export const AnalysisLoadingOverlay: React.FC<AnalysisLoadingOverlayProps> = ({
  isVisible,
  currentStep,
  characters,
  psychologicalProfiles,
  psychologicalProfilesTranslated,
  playerPsychoanalysisProse,
  playerPsychoanalysisProseTranslated,
  playerName,
  onExportState,
  errors,
  onRetryStep,
  countdownStepKey,
  countdownSeconds,
  countdownType,
  onOpenModelSelectionModal,
  onOpenApiKeyModal,
  onBackToMenu,
  onStartNextDay,
  currentDay,
  uiTranslations,
}) => {
  // Resolve step labels using translations (fallback to English)
  const t = uiTranslations || englishStrings;
  const analysisUiSteps = analysisUiStepKeys.map(({ step, labelKey }) => ({
    step,
    label: t[labelKey] || englishStrings[labelKey],
  }));
  const [retryingStep, setRetryingStep] = useState<EndOfDayStep | null>(null);
  const [isStartingNextDay, setIsStartingNextDay] = useState(false);
  
  // Error detail modal state
  const [errorDetailStep, setErrorDetailStep] = useState<{ step: EndOfDayStep; label: string } | null>(null);
  const errorDetailMessage = errorDetailStep ? errors[errorDetailStep.step] || '' : '';

  if (!isVisible) {
    return null;
  }

  const isCompleteWithNoError = currentStep === EndOfDayStep.FINAL_STATE_SAVE_COMPLETE && Object.keys(errors).length === 0;

  const handleRetry = async (step: EndOfDayStep) => {
    setRetryingStep(step);
    await onRetryStep(step);
    setRetryingStep(null);
  };

  const handleStartNextDay = async () => {
    setIsStartingNextDay(true);
    await onStartNextDay();
    setIsStartingNextDay(false);
  };

  const showProfiles = currentStep >= EndOfDayStep.RELATIONSHIP_ANALYSIS_COMPLETE;
  const showPlayerProfile = currentStep >= EndOfDayStep.PLAYER_ANALYSIS_COMPLETE;
  const profilesToDisplay = psychologicalProfilesTranslated || psychologicalProfiles;
  const playerProseToDisplay = playerPsychoanalysisProseTranslated || playerPsychoanalysisProse;
  const analysisDay = currentDay;
  const isCompressionDay = currentDay > 28 && ((currentDay - 1) % 14 === 0);


  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4 md:p-8 animate-fade-in">
      <div className="w-full max-w-2xl bg-gray-900/90 backdrop-blur-sm p-6 rounded-lg shadow-xl mb-4 border-2 border-cyan-500/30">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <h2 className="text-2xl font-bold text-white">
            {isCompleteWithNoError ? `End of Day ${currentDay} Complete` : 'Ending the Day...'}
          </h2>
           <div className="flex flex-wrap gap-2 justify-center">
             <button onClick={onBackToMenu} className="vn-secondary-button">Menu</button>
             <button onClick={onOpenApiKeyModal} className="vn-secondary-button">API Key</button>
             <button onClick={onOpenModelSelectionModal} className="vn-secondary-button">Models</button>
             <button onClick={onExportState} className="vn-secondary-button">Export Save</button>
           </div>
        </div>

        {!isCompleteWithNoError ? (
          <ul className="space-y-3">
             {analysisUiSteps.map(({ step, label }) => {
                 const attemptedStepKey = Object.keys(stepErrorMapping).find(key => stepErrorMapping[parseInt(key) as EndOfDayStep] === step);
                 const attemptedStep = attemptedStepKey ? parseInt(attemptedStepKey) as EndOfDayStep : (step - 1) as EndOfDayStep;
                 
                 const stepKey = `vn_eod_pipeline_v6_${attemptedStep}`;
                 const isThisStepInCountdown = countdownStepKey === stepKey;
                 const isErrorCountdown = isThisStepInCountdown && countdownType === 'error';
                 const isSuccessCountdown = isThisStepInCountdown && countdownType === 'success';
                 const isTimeoutCountdown = isThisStepInCountdown && countdownType === 'timeout';

                 const errorForThisUiStep = errors[attemptedStep];
                 const isComplete = currentStep >= step;
                 const isRetryingThisStep = retryingStep === attemptedStep;
                 const isInProgress = (currentStep >= attemptedStep && currentStep < step && !errorForThisUiStep && !isSuccessCountdown) || isRetryingThisStep;
                 
                 let icon = '📋'; let textClass = 'text-gray-500'; let retryButton = null; let errorText = null;
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
                     icon = '❌'; textClass = 'text-red-400';
                     const displayError = formatApiError(errorForThisUiStep);
                     errorText = (
                       <button 
                         onClick={() => setErrorDetailStep({ step: attemptedStep, label })}
                         className="text-xs ml-2 text-red-300 hover:text-white underline underline-offset-2 cursor-pointer"
                         title="Click to view full error details"
                       >
                         ({displayError}) ⓘ
                       </button>
                     );
                     
                     retryButton = (
                        <div className="ml-auto flex gap-2">
                            <button
                                onClick={() => setErrorDetailStep({ step: attemptedStep, label })}
                                className="text-xs bg-gray-600 hover:bg-gray-700 text-white px-2 py-0.5 rounded"
                            >
                                Details
                            </button>
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
                    icon = '✅'; textClass = 'text-gray-400 line-through';
                 } else if (isInProgress) {
                    icon = '⏳'; textClass = 'text-white font-semibold animate-pulse';
                 }
                 let labelText = label;
                 if (step === EndOfDayStep.ARCHIVIST_COMPLETE && isCompressionDay) {
                     labelText = 'Extracting key facts & archiving long-term memories';
                 }

                 return ( <li key={step} className="flex items-center gap-2 text-lg"> <span className="w-6 h-6 flex items-center justify-center text-xl">{icon}</span> <span className={textClass}>{labelText}{isInProgress ? '...' : ''}</span> {countdownText} {errorText} {retryButton} </li> );
             })}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-lg text-gray-300 mb-6">All end-of-day analyses are complete.</p>
            <button
              onClick={handleStartNextDay}
              disabled={isStartingNextDay}
              className="vn-primary-button w-64 animate-pulse disabled:animate-none"
            >
              {isStartingNextDay ? 'Starting...' : `Start Day ${currentDay + 1}`}
            </button>
          </div>
        )}

      </div>

      {showProfiles && (
         <div className="w-full max-w-2xl bg-gray-900/90 backdrop-blur-sm p-6 rounded-lg shadow-xl overflow-y-auto flex-grow max-h-[50vh] custom-scrollbar border-2 border-purple-500/30">
           <h3 className="text-xl font-bold text-center text-white mb-4">End-of-Day Analysis (Day {analysisDay})</h3>
           {showPlayerProfile && playerProseToDisplay && ( <div className="mb-6 pb-4 border-b border-gray-700"> <h4 className="font-bold text-green-400 text-lg">{playerName}</h4> <p className="text-gray-300 whitespace-pre-wrap mt-1">{playerProseToDisplay}</p> </div> )}
           <div className="space-y-4"> {characters.map(char => ( profilesToDisplay?.[char.name] && ( <div key={char.name}> <h4 className={`font-bold text-lg ${char.color}`}>{char.name}</h4> <p className="text-gray-300 mt-1">{profilesToDisplay[char.name]}</p> </div> ) ))} </div>
         </div>
       )}
       
      {/* Error Detail Modal */}
      <ErrorDetailModal
        isVisible={!!errorDetailStep}
        errorMessage={errorDetailMessage}
        stepName={errorDetailStep?.label || ''}
        onClose={() => setErrorDetailStep(null)}
        onRetry={() => errorDetailStep && handleRetry(errorDetailStep.step)}
        onOpenModelSettings={onOpenModelSelectionModal}
        onOpenApiKeySettings={onOpenApiKeyModal}
        isRetrying={retryingStep === errorDetailStep?.step}
      />
    </div>
  );
};
