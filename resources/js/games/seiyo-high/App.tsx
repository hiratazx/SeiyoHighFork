/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React from 'react';
import {useEffect, useRef, useMemo, useState, useCallback} from 'react';
import {Character} from './components/Character';
import {MainMenu} from './components/MainMenu';
import { db, storeGeneratedLocation } from './db';
import { regenerateImage } from './services/apiService';
import { compressToWebP } from './services/UnifiedAiService';
import {TextBox} from './components/TextBox';
import {NameInputModal} from './components/NameInputModal';
import {DayTransitionOverlay} from './components/DayTransitionOverlay';
import {ProfileModal} from './components/ProfileModal';
import { StoryModal } from './components/StoryModal';
import { ConfirmModal } from './components/ConfirmModal';
import { AnalysisLoadingOverlay } from './components/AnalysisLoadingOverlay';
import { ItineraryModal } from './components/ItineraryModal';
import { ReplayMenu } from './components/ReplayMenu';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ModelSelectionModal } from './components/ModelSelectionModal';
import { EndGameScreen } from './components/EndGameScreen';
import { useGameLoop } from './hooks/useGameLoop';
import { DaySegment, NewGameStep, SegmentTransitionStep, CharacterConfig } from './types';
import { SegmentLoadingOverlay } from './components/SegmentLoadingOverlay';
import { isCharacterMatch } from './lib/characterUtils';
import { ErrorOverlay } from './components/ErrorOverlay';
import { DevToolsModal } from './components/DevToolsModal';
import { SegmentTransitionLoadingOverlay } from './components/SegmentTransitionLoadingOverlay';
import { SegmentTransitionOverlay } from './components/SegmentTransitionOverlay';
import { useBackgroundResolver } from './hooks/useBackgroundResolver';
import { DisclaimerModal, useDisclaimerStatus } from './components/DisclaimerModal';
import { ApiKeySetupGuide } from './components/ApiKeySetupGuide';
import { setDeveloperMode } from './lib/devLog';
import { DemoWelcomeModal } from './components/DemoWelcomeModal';
import { DemoLimitModal } from './components/DemoLimitModal';

// Use absolute URL for HuggingFace build (images served from main site)
const MAIN_MENU_BACKGROUND_URL = import.meta.env.VITE_IS_HF_BUILD === 'true'
  ? 'https://ainime-games.com/images/hero.jpg'
  : '/images/hero.jpg';

const usePrevious = (value: boolean): boolean | undefined => {
  const ref = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

const getGridClasses = (characterCount: number): string => {
  if (characterCount <= 1) {
    return 'grid-cols-1';
  }
  if (characterCount === 2) {
    return 'grid-cols-2';
  }
  if (characterCount <= 4) {
    return 'grid-cols-2 grid-rows-2';
  }

  // 5-6 characters: mobile 2x3, desktop 3x2
  return 'grid-cols-2 grid-rows-3 md:grid-cols-3 md:grid-rows-2';
};

interface AppProps {
  isDeveloper: boolean;
  isSubscribed: boolean;
}

const App: React.FC<AppProps> = ({ isDeveloper, isSubscribed }) => {
  // Initialize developer mode for conditional logging (runs once on mount)
  useEffect(() => {
    setDeveloperMode(isDeveloper);
  }, [isDeveloper]);

  // HuggingFace demo mode detection
  const isHfDemo = import.meta.env.VITE_IS_HF_BUILD === 'true';
  const [showDemoWelcomeModal, setShowDemoWelcomeModal] = useState(false);
  const [showDemoLimitModal, setShowDemoLimitModal] = useState(false);
  const [demoLimitDay, setDemoLimitDay] = useState(3);

  const {
    state,
    handlers,
    uiState,
    devState,
  } = useGameLoop();
  
  const {
    history, sceneQueue, currentLine, backgroundUrl, previousBackgroundUrl, affection, currentDay,
    currentSegment, playerChoices, uiTranslations, presentCharacterNames, characterStageSlots,
    characterExpressions, characters, mainCharacters, sideCharacters, fullItinerary, showMotivations,
    psychologicalProfiles, novelChapters, playerPsychoanalysisProse, relationshipDynamics, relationshipDynamicsStructured,
    psychologicalProfilesTranslated, novelChaptersTranslated, playerPsychoanalysisProseTranslated,
    fullItineraryTranslated, playerChoicesTranslated, relationshipDynamicsTranslated, relationshipDynamicsStructuredTranslated, playthroughCounter,
    playthroughSummaries,
    playerName, apiKeys, modelConfig, affectionLog, affectionLogTranslated, importedReplayData, replayScript, replayHistory,
    isReplayPaused, replaySpeed, showReplayOriginalLanguage, replayAvailableSegments, replayCurrentSegment, isAtSegmentEnd,
    replayBackgroundUrl, previousReplayBackgroundUrl, replayPresentCharacters, replayCharacterExpressions, replayGeneratedLocations, replayCharacters,
    displayedDialogue, evolvingPersonas, characterLikesDislikes,
    characterTraits, // [NEW]
    // FIX: Removed `newGameStep`, `endOfDayStep`, and `segmentTransitionStep` to avoid redeclaration.
    // They are correctly sourced from the `uiState` object below.
    storyArcs, subplots, factSheet,
    playerBackstory, unaskedQuestions, scheduledEvents, sceneMentalModel, characterChronicles,
    characterBiographies,
    newGameErrors, segmentTransitionErrors, endOfDayErrors, error, pendingTextInput,
    countdownStepKey,
    countdownSeconds,
    countdownType,
    // [GENERATIVE IMAGES]
    currentLocationId,
    // [REPLAY] Dynamic segment order from game config
    daySegments,
  } = state;

  // [GENERATIVE IMAGES] Resolve background from generated location or stock URL
  const { url: resolvedBackgroundUrl, isLoading: isBackgroundLoading } = useBackgroundResolver(
    currentLocationId,
    backgroundUrl // fallback to stock URL
  );

  // [REPLAY] Build complete history including current (ongoing) day for replay menu
  // This mirrors the logic in gameFlowService.ts reconstructFinalHistory()
  const completeHistoryForReplay = useMemo(() => {
    // Include ALL dialogue for current segment:
    // - history: completed dialogue
    // - sceneQueue: pending dialogue waiting to be shown
    // - currentLine: line currently being typed
    const allCurrentSegmentDialogue = [
      ...(history || []),
      ...(sceneQueue || []),
      ...(currentLine ? [currentLine] : []),
    ];
    
    // Create a SegmentLog for the current segment's dialogue
    const currentSegmentLog = { 
      segment: currentSegment, 
      dialogue: allCurrentSegmentDialogue
    };
    
    // Find if today already exists in fullHistory (may have earlier segments)
    const existingDayLog = state.fullHistory.find(d => d.day === currentDay);
    
    // Get other segments from fullHistory for today (exclude current segment to avoid dupes)
    const otherSegments = existingDayLog 
      ? existingDayLog.segments.filter(s => s.segment !== currentSegment)
      : [];
    
    // Combine: earlier segments from fullHistory + current segment from history
    const allSegmentsForToday = [...otherSegments, currentSegmentLog];
    
    // Sort segments in day order (dynamic from game config)
    allSegmentsForToday.sort((a, b) => 
      daySegments.indexOf(a.segment) - daySegments.indexOf(b.segment)
    );
    
    // Filter out empty segments (no dialogue to replay)
    const nonEmptySegments = allSegmentsForToday.filter(s => s.dialogue.length > 0);
    
    // If no segments have dialogue, just return fullHistory as-is
    if (nonEmptySegments.length === 0 && !existingDayLog) {
      return state.fullHistory;
    }
    
    // Build the complete day log for today
    const todayDayLog = {
      day: currentDay,
      segments: nonEmptySegments,
    };
    
    // Reconstruct full history: other days + today (only if today has content)
    const otherDays = state.fullHistory.filter(d => d.day !== currentDay);
    const result = nonEmptySegments.length > 0 
      ? [...otherDays, todayDayLog]
      : otherDays;
    
    // Sort by day
    result.sort((a, b) => a.day - b.day);
    
    return result;
  }, [state.fullHistory, history, sceneQueue, currentLine, currentDay, currentSegment, daySegments]);

  // [REPLAY] Build complete history for IMPORTED saves (merge fullHistory + history + sceneQueue + currentLine)
  const completeImportedHistoryForReplay = useMemo(() => {
    if (!importedReplayData) return null;
    
    const importedFullHistory = importedReplayData.fullHistory || [];
    const importedHistory = importedReplayData.history || [];
    const importedSceneQueue = importedReplayData.sceneQueue || [];
    const importedCurrentLine = importedReplayData.currentLine;
    const importedCurrentDay = importedReplayData.currentDay;
    const importedCurrentSegment = importedReplayData.currentSegment;
    
    // Include ALL dialogue for current segment (same as active game replay)
    const allCurrentSegmentDialogue = [
      ...importedHistory,
      ...importedSceneQueue,
      ...(importedCurrentLine ? [importedCurrentLine] : []),
    ];
    
    // If no ongoing dialogue, just return fullHistory
    if (allCurrentSegmentDialogue.length === 0) {
      return importedFullHistory;
    }
    
    // Create a SegmentLog for the imported save's current segment
    const currentSegmentLog = { 
      segment: importedCurrentSegment, 
      dialogue: allCurrentSegmentDialogue
    };
    
    // Find if the current day exists in fullHistory
    const existingDayLog = importedFullHistory.find(d => d.day === importedCurrentDay);
    
    // Get other segments from fullHistory for today
    const otherSegments = existingDayLog 
      ? existingDayLog.segments.filter(s => s.segment !== importedCurrentSegment)
      : [];
    
    // Combine segments
    const allSegmentsForToday = [...otherSegments, currentSegmentLog];
    
    // Sort segments using imported save's day structure (or fallback to current game's)
    const importedDayStructure = importedReplayData.worldConfig?.day_structure || daySegments;
    allSegmentsForToday.sort((a, b) => 
      importedDayStructure.indexOf(a.segment) - importedDayStructure.indexOf(b.segment)
    );
    
    // Filter out empty segments
    const nonEmptySegments = allSegmentsForToday.filter(s => s.dialogue.length > 0);
    
    if (nonEmptySegments.length === 0 && !existingDayLog) {
      return importedFullHistory;
    }
    
    // Build today's log
    const todayDayLog = {
      day: importedCurrentDay,
      segments: nonEmptySegments,
    };
    
    // Reconstruct: other days + today
    const otherDays = importedFullHistory.filter(d => d.day !== importedCurrentDay);
    const result = nonEmptySegments.length > 0 
      ? [...otherDays, todayDayLog]
      : otherDays;
    
    result.sort((a, b) => a.day - b.day);
    return result;
  }, [importedReplayData, daySegments]);

  // [DISCLAIMER] First-time user consent gate
  const { hasAccepted: hasAcceptedDisclaimer, acceptDisclaimer } = useDisclaimerStatus();

  // [GENERATIVE IMAGES] Fix Background button state
  const [isRegeneratingBackground, setIsRegeneratingBackground] = useState(false);
  const [showFixBackgroundConfirm, setShowFixBackgroundConfirm] = useState(false);
  
  // [API KEY SETUP GUIDE] Tutorial overlay state
  const [isApiKeySetupGuideVisible, setIsApiKeySetupGuideVisible] = useState(false);
  
  const handleFixBackground = useCallback(async () => {
    if (!currentLocationId || !apiKeys?.gemini || isRegeneratingBackground) return;
    
    try {
      setIsRegeneratingBackground(true);
      
      // Get the current location from IndexedDB
      const location = await db.generatedLocations.get(currentLocationId);
      if (!location?.prompt) {
        // This is a stock image - show message to user
        handlers.setNotification(uiTranslations.stockImageCannotRegenerate);
        setTimeout(() => handlers.setNotification(null), 4000);
        return;
      }
      
      // Regenerate the image
      const result = await regenerateImage(
        location.prompt,
        location.segment,
        '16:9',
        apiKeys,
        modelConfig?.imagenModel,
        modelConfig?.storyModel || 'gemini-3-flash-preview'
      );
      
      if (result.success && result.data) {
        // Compress to WebP for efficient storage
        const newBlob = await compressToWebP(result.data, result.mime || 'image/png');
        
        // Store the new image (replaces the old one)
        await storeGeneratedLocation(
          location.id,
          location.name,
          location.segment,
          location.prompt,
          location.summary || '',
          newBlob
        );
        
        // Force a re-render by triggering the background resolver
        // The useBackgroundResolver hook will pick up the new image
        window.dispatchEvent(new CustomEvent('locationImageUpdated', { detail: { locationId: currentLocationId } }));
      }
    } catch (error) {
      console.error('Failed to regenerate background:', error);
    } finally {
      setIsRegeneratingBackground(false);
    }
  }, [currentLocationId, apiKeys, modelConfig, isRegeneratingBackground, handlers, uiTranslations.stockImageCannotRegenerate]);

  const {
    handleSendMessage, handleContinue, handleStartNewGame, handleConfirmNewGame, handleContinueGame,
    handleBackToMenu, handleNameConfirm, handleSaveApiKeys, handleImportKeys, handleSaveModelSelection,
    handleExportState, handleImportState, handleTogglePromptLogging, handleGoToReplayMenu,
    handleReplayImport, handleStartReplay, handleClearImportedReplay, handleExitReplay, handleToggleReplayPause, handleToggleReplayLanguage, handleRestartReplay, handleReplayJumpToSegment, handleReplayJumpToEnd, handleReplayNextSegment,
    handleChangeReplaySpeed, handleProceedToNextScene, handleRetry, handleCancelError, handleStartNextPlaythrough,
    handleStartNextDayTransition, setShowConfirmModal, setIsProfileVisible, setIsStoryVisible,
    setIsItineraryVisible, setIsApiKeyModalVisible, setIsModelSelectionVisible, setIsDevToolsVisible,
    setShowMotivations, setError, retryNewGameStep, retrySegmentTransitionStep, retryEndOfDayStep, setPendingTextInput,
    handleExportStory, handleProceedAfterPipeline,
    handleVetoEndScene,
    setMainCharacters, setSideCharacters,
  } = handlers;

  const {
    isLoading, loadingMessage, notification, gameState, hasSaveData, isGameActive, isGameCompleted,
    isDayTransitioning, isSegmentTransitioning, isProfileVisible, isStoryVisible, isItineraryVisible,
    showConfirmModal, isAnalyzing, analysisMessage, analysisProgress, transitioningToDay,
    transitioningToSegment, isAwaitingNextSceneClick, isApiKeyModalVisible, isModelSelectionVisible,
    isDevToolsVisible, characterGenerationProgress, analyzedCharacters, isDirectorLoading,
    directorLoadingMessage, isAnalystLoading, analystLoadingMessage, isUnrecoverableError, isBlockedByOtherTab,
    isAwaitingSegmentTransition, isPipelineCompleteAndReady,
    endOfDayStep, newGameStep, segmentTransitionStep,
  } = uiState;

  const {
    isPromptLoggingEnabled,
  } = devState;

  const inputRef = useRef<HTMLInputElement>(null);

  const isUiLocked = isLoading || sceneQueue.length > 0 || currentLine !== null || isDayTransitioning || isSegmentTransitioning || isProfileVisible || isStoryVisible || isAnalyzing || isItineraryVisible || isApiKeyModalVisible || isAwaitingNextSceneClick || isDirectorLoading || isAnalystLoading || isDevToolsVisible || isAwaitingSegmentTransition;
  const prevIsUiLocked = usePrevious(isUiLocked);

  useEffect(() => {
    if (prevIsUiLocked === true && !isUiLocked && !playerChoices) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isUiLocked, prevIsUiLocked, playerChoices]);

  // API key missing errors are now handled by the normal ErrorOverlay.
  // The player can navigate to the API key modal via the Menu themselves.

  // [HF DEMO] Show welcome modal on first load if no save exists
  useEffect(() => {
    if (isHfDemo && gameState === 'menu' && !hasSaveData) {
      setShowDemoWelcomeModal(true);
    }
  }, [isHfDemo, gameState, hasSaveData]);

  // [HF DEMO] Frontend enforcement of Day 3 limit
  // This is a backup - backend middleware should also enforce this
  // The main enforcement happens via API error when EOD pipeline is blocked at Day 3
  useEffect(() => {
    if (isHfDemo && currentDay > 3 && gameState === 'playing' && !showDemoLimitModal) {
      setDemoLimitDay(3);
      setShowDemoLimitModal(true);
    }
  }, [isHfDemo, currentDay, gameState, showDemoLimitModal]);

  // [HF DEMO] Listen for demo_limit errors from API
  useEffect(() => {
    const handleDemoLimit = (event: CustomEvent) => {
      const detail = event.detail || {};
      setDemoLimitDay(detail.last_demo_day || 3);
      setShowDemoLimitModal(true);
    };

    window.addEventListener('demo-limit-reached', handleDemoLimit as EventListener);
    return () => {
      window.removeEventListener('demo-limit-reached', handleDemoLimit as EventListener);
    };
  }, []);

  // [HF DEMO] Handle starting the demo with imported save
  const handleStartDemo = useCallback(async (playerName: string, apiKey: string) => {
    try {
      // 1. Update the in-memory API keys state first
      handleSaveApiKeys({ gemini: apiKey });
      
      // 2. Fetch the demo save file
      const response = await fetch('/demo/seiyo-high_demo_save.json');
      if (!response.ok) {
        throw new Error('Failed to load demo save file');
      }
      const saveData = await response.json();
      
      // 3. Inject player name into the save data
      // The save file has a hydrated format with gameState and pipelineState
      
      // Update the main gameState playerName (used during gameplay)
      if (saveData.gameState && 'playerName' in saveData.gameState) {
        saveData.gameState.playerName = playerName;
      }
      
      // Update the pipeline data entry for playerName (used by pipelines)
      if (saveData.pipelineState?.pipelineData) {
        saveData.pipelineState.pipelineData = saveData.pipelineState.pipelineData.map((item: any) => {
          if (item.key === 'vn_new_game_pipeline_v6_playerName') {
            return { ...item, data: playerName };
          }
          return item;
        });
      }
      
      // 4. [HF DEMO] Override modelSelection to disable generative images/sprites
      // Free tier API keys don't support image generation - disable by default for demo
      if (saveData.gameState?.modelSelection) {
        saveData.gameState.modelSelection = {
          ...saveData.gameState.modelSelection,
          enableGenerativeImages: false,
          enableSpriteGeneration: false,
        };
      }
      
      // 5. Create a fake file input event to trigger import
      // Note: API key was saved to localStorage in step 1, import will read it from there
      const blob = new Blob([JSON.stringify(saveData)], { type: 'application/json' });
      const file = new File([blob], 'demo-save.json', { type: 'application/json' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      const fakeEvent = {
        target: { files: dataTransfer.files }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      
      // 6. Import the save
      handleImportState(fakeEvent);
      
      // 7. Close the modal
      setShowDemoWelcomeModal(false);
    } catch (error: any) {
      console.error('[HF Demo] Failed to start demo:', error);
      throw error;
    }
  }, [handleSaveApiKeys, handleImportState]);

  const allCharacters = useMemo(() => [...mainCharacters, ...sideCharacters], [mainCharacters, sideCharacters]);

  // Callback to update a character (used by StoryModal for sprite regeneration)
  const handleUpdateCharacter = useCallback((name: string, updates: Partial<CharacterConfig>) => {
    // Check if it's a main character
    const isMainChar = mainCharacters.some(c => c.name === name);
    if (isMainChar) {
      setMainCharacters(prev => prev.map(c => 
        c.name === name ? { ...c, ...updates } : c
      ));
    } else {
      // It's a side character
      setSideCharacters(prev => prev.map(c => 
        c.name === name ? { ...c, ...updates } : c
      ));
    }
  }, [mainCharacters, setMainCharacters, setSideCharacters]);

  const linesInFlight = useMemo(() => {
    const ids = new Set(sceneQueue.map(line => line.id));
    if (currentLine) {
        ids.add(currentLine.id);
    }
    return ids;
  }, [sceneQueue, currentLine]);

  // [REPLAY] Use replayHistory when in replay mode, otherwise use regular history
  const historyForDisplay = useMemo(() => {
    if (gameState === 'replaying') {
      return replayHistory || [];
    }
    return (history || []).filter(entry => !linesInFlight.has(entry.id));
  }, [gameState, history, replayHistory, linesInFlight]);

  const handleEndSceneClick = () => {
    if (isAwaitingNextSceneClick) {
      return;
    }
    handleSendMessage('*END SCENE*');
  };

  const renderGameContent = () => {
    const isReplaying = gameState === 'replaying';
    const isImportedReplay = isReplaying && importedReplayData !== null;
    
    // [REPLAY] Use replay-specific state when replaying (completely isolated from game state)
    // For active game replay: use replay visuals but keep using `characters` for character data
    // For imported replay: use replay visuals AND `replayCharacters` for character data
    const activeCharacterNames = isReplaying ? replayPresentCharacters : characterStageSlots.filter((slot): slot is string => slot !== null);
    const activeCharacterPool = isImportedReplay && replayCharacters.length > 0 ? replayCharacters : characters;
    const activeExpressions = isReplaying ? replayCharacterExpressions : characterExpressions;
    
    const visibleCharacters = activeCharacterNames
      .map(name => activeCharacterPool.find(c => c.name === name))
      .filter((character): character is CharacterConfig => !!character && !!character.image);

    const characterCount = visibleCharacters.length;
    const gridClasses = getGridClasses(characterCount);
    const hasTwoRows = characterCount > 2;
    const choicesForDisplay = playerChoicesTranslated || playerChoices;
    
    // [GENERATIVE IMAGES / REPLAY] Use replay background when replaying, otherwise resolved game background
    const currentDisplayBackground = gameState === 'menu' 
      ? MAIN_MENU_BACKGROUND_URL 
      : (isReplaying && replayBackgroundUrl ? replayBackgroundUrl : resolvedBackgroundUrl);
    // Use replay's previous background during replay, otherwise game's previous background
    const activePreviousBackground = isReplaying ? previousReplayBackgroundUrl : previousBackgroundUrl;
    const currentOpacity = activePreviousBackground ? 0 : 1;

    return (
      <>
        {activePreviousBackground && (
          <div
            className="fixed inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${activePreviousBackground})` }}
          />
        )}
        <div
          className="fixed inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{ backgroundImage: `url(${currentDisplayBackground})`, opacity: currentOpacity }}
        />
        <div className="fixed inset-0 bg-black/15" aria-hidden="true" />
        
        {/* [GENERATIVE IMAGES] Fix Background button - only show when generative images enabled and we have a generated location */}
        {modelConfig?.enableGenerativeImages && currentLocationId && (
          <button
            onClick={() => setShowFixBackgroundConfirm(true)}
            disabled={isRegeneratingBackground}
            className={`fixed top-3 left-3 z-20 px-3 py-1.5 text-xs rounded-lg transition-all duration-200 backdrop-blur-sm ${
              isRegeneratingBackground
                ? 'bg-gray-800/70 text-gray-400 cursor-wait'
                : 'bg-black/50 hover:bg-black/70 text-white/70 hover:text-white border border-white/20 hover:border-white/40'
            }`}
            title={uiTranslations.newImageTooltip}
          >
            {isRegeneratingBackground ? `🔄 ${uiTranslations.fixingBackground}` : `🖼️ ${uiTranslations.fixBackground}`}
          </button>
        )}
        
        <div className="relative z-10 w-full h-full flex flex-col justify-end">
          {/* Responsive grid for characters */}
          <div className={`vn-character-container grid w-full flex-1 min-h-0 ${gridClasses} ${hasTwoRows ? 'two-rows-active' : ''}`}>
            {visibleCharacters.map((character) => (
              <Character
                key={character.name}
                character={character}
                isLoading={isLoading}
                isSpeaking={isCharacterMatch(currentLine?.speaker, character)}
                activeSet={activeExpressions[character.name]?.set || 'default'}
                expression={activeExpressions[character.name]?.expression || 'neutral'}
                isLeaving={!activeCharacterNames.includes(character.name)}
              />
            ))}
          </div>
          <TextBox
            ref={inputRef} history={historyForDisplay} currentLine={currentLine} currentDialogue={displayedDialogue} onSendMessage={handleSendMessage}
            value={pendingTextInput} onValueChange={setPendingTextInput}
            isLocked={isUiLocked} isThinking={isLoading} t={uiTranslations} characters={characters} choicesForDisplay={choicesForDisplay}
            originalChoices={playerChoices} playerName={playerName}
            currentDay={currentDay} currentSegment={currentSegment} onOpenProfile={() => setIsProfileVisible(true)}
            onOpenStory={() => setIsStoryVisible(true)} onBackToMenu={handleBackToMenu}
            isReplaying={gameState === 'replaying'} isReplayPaused={isReplayPaused} replaySpeed={replaySpeed} showReplayOriginalLanguage={showReplayOriginalLanguage}
            replayAvailableSegments={replayAvailableSegments} replayCurrentSegment={replayCurrentSegment} isAtSegmentEnd={isAtSegmentEnd}
            onExitReplay={handleExitReplay} onToggleReplayPause={handleToggleReplayPause} onToggleReplayLanguage={handleToggleReplayLanguage} onRestartReplay={handleRestartReplay} onChangeReplaySpeed={handleChangeReplaySpeed} onReplayJumpToSegment={handleReplayJumpToSegment} onReplayJumpToEnd={handleReplayJumpToEnd} onReplayNextSegment={handleReplayNextSegment}
            showMotivations={showMotivations}
            isAwaitingNextScene={isAwaitingNextSceneClick} onProceedToNextScene={handleProceedToNextScene}
            onEndScene={handleEndSceneClick}
            onVetoEndScene={handleVetoEndScene}
          />
        </div>
      </>
    );
  }

  // [DISCLAIMER] Show loading state while checking localStorage
  if (hasAcceptedDisclaimer === null) {
    return (
      <main className="relative w-full h-full bg-default overflow-hidden">
        <div className="fixed inset-0 bg-cover bg-center" style={{backgroundImage: `url(${MAIN_MENU_BACKGROUND_URL})`}} />
        <div className="fixed inset-0 bg-black/60" />
      </main>
    );
  }

  return (
    <main className="relative w-full h-full bg-default overflow-hidden">
      {/* [DISCLAIMER] First-time consent gate */}
      {!hasAcceptedDisclaimer && (
        <>
          <div className="fixed inset-0 bg-cover bg-center" style={{backgroundImage: `url(${MAIN_MENU_BACKGROUND_URL})`}} />
          <DisclaimerModal onAccept={acceptDisclaimer} />
        </>
      )}

      {notification && (
        <div className="model-notification">
            <p>{notification}</p>
        </div>
      )}
      {isBlockedByOtherTab && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]">
          <div className="bg-slate-800 border border-red-500 rounded-lg p-8 max-w-md text-center shadow-2xl">
            <div className="text-red-400 text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-white mb-4">Game Already Open</h2>
            <p className="text-slate-300 mb-6">
              This game is already running in another browser tab. 
              Running multiple tabs would corrupt your save data.
            </p>
            <p className="text-slate-400 text-sm">
              Please close this tab and continue playing in the other one.
            </p>
          </div>
        </div>
      )}
      {error && !isUnrecoverableError && !isBlockedByOtherTab && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gradient-to-br from-gray-900/95 via-blue-950/90 to-indigo-950/95 border border-cyan-400/30 text-white p-4 rounded-lg z-50 shadow-lg shadow-cyan-400/10 max-w-md backdrop-blur-sm">
          <div className="flex items-start gap-2 pr-6">
            <span className="text-xl">💡</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm mb-1 text-cyan-200">Temporary Issue</p>
              <p className="text-xs text-gray-300 break-words line-clamp-3">{error}</p>
            </div>
          </div>
          <button onClick={handlers.setError.bind(null, null)} className="absolute top-2 right-2 text-gray-400 hover:text-white text-xl leading-none">&times;</button>
        </div>
      )}

      {isGameCompleted ? (
        <EndGameScreen
          playthroughCounter={playthroughCounter}
          onNewGame={handleStartNewGame}
          onExportState={handleExportState}
          onStartNextPlaythrough={handleStartNextPlaythrough}
          onExportStory={handleExportStory}
          t={uiTranslations}
        />
      ) : (
        <>
          {gameState === 'playing' || gameState === 'replaying' ? (
            renderGameContent()
          ) : (
            <>
              <div className="fixed inset-0 bg-cover bg-center" style={{backgroundImage: `url(${MAIN_MENU_BACKGROUND_URL})`}} />
              <div className="fixed inset-0 bg-black/40" />
              {gameState === 'menu' && (
                <MainMenu
                  onStartNewGame={handleStartNewGame} onContinueGame={handleContinueGame} hasSaveData={hasSaveData}
                  isGameActive={isGameActive} onExportState={handleExportState} onImportState={handleImportState}
                  onGoToReplayMenu={handleGoToReplayMenu} onOpenApiKeyModal={() => setIsApiKeyModalVisible(true)}
                  onOpenModelSelectionModal={() => setIsModelSelectionVisible(true)} t={uiTranslations}
                  onOpenDevTools={() => setIsDevToolsVisible(true)}
                  isDeveloper={isDeveloper}
                  isHfDemo={isHfDemo}
                />
              )}
              {gameState === 'replay_menu' && (
                <ReplayMenu
                  fullHistory={completeHistoryForReplay}
                  importedHistory={completeImportedHistoryForReplay}
                  onImport={handleReplayImport}
                  onStartReplay={handleStartReplay}
                  onClearImported={handleClearImportedReplay}
                  onBackToMenu={handleBackToMenu}
                  t={uiTranslations}
                />
              )}
            </>
          )}

          {gameState === 'name_input' && (
            <NameInputModal
              onConfirm={handleNameConfirm}
              characters={characters}
              t={uiTranslations}
              isLoading={newGameStep > NewGameStep.NOT_STARTED && newGameStep < NewGameStep.FINAL_STATE_SAVE_COMPLETE}
              newGameStep={newGameStep}
              errors={newGameErrors}
              onRetryStep={retryNewGameStep}
              countdownStepKey={countdownStepKey}
              countdownSeconds={countdownSeconds}
              countdownType={countdownType}
              onExportState={handleExportState}
              onOpenApiKeyModal={() => handlers.setIsApiKeyModalVisible(true)}
              onBackToMenu={handleBackToMenu}
              isPipelineCompleteAndReady={isPipelineCompleteAndReady}
              onProceedAfterPipeline={handleProceedAfterPipeline}
            />
          )}
          <DayTransitionOverlay isVisible={isDayTransitioning} day={transitioningToDay} t={uiTranslations} />
          <SegmentTransitionOverlay isVisible={isSegmentTransitioning} segment={transitioningToSegment} t={uiTranslations} />
          <ProfileModal 
            isVisible={isProfileVisible} 
            onClose={() => setIsProfileVisible(false)} 
            affection={affection} 
            t={uiTranslations} 
            characters={characters} 
            mainCharacters={mainCharacters}
            playerName={playerName} 
            language={state.language}
            playerPsychoanalysisProse={playerPsychoanalysisProse} 
            psychologicalProfiles={psychologicalProfiles} 
            currentDay={currentDay} 
            playerPsychoanalysisProseTranslated={playerPsychoanalysisProseTranslated} 
            psychologicalProfilesTranslated={psychologicalProfilesTranslated}
            affectionLog={affectionLog}
            affectionLogTranslated={affectionLogTranslated}
            relationshipDynamics={relationshipDynamics}
            relationshipDynamicsStructured={relationshipDynamicsStructured as any}
            relationshipDynamicsTranslated={relationshipDynamicsTranslated}
            relationshipDynamicsStructuredTranslated={relationshipDynamicsStructuredTranslated as any}
          />
          <StoryModal 
            isVisible={isStoryVisible} 
            onClose={() => setIsStoryVisible(false)} 
            novelChapters={novelChapters.map(c => c.proseChapter)} 
            t={uiTranslations} 
            novelChaptersTranslated={novelChaptersTranslated}
            characters={allCharacters}
            apiKeys={apiKeys}
            modelConfig={modelConfig}
            onUpdateCharacter={handleUpdateCharacter}
            daySegments={daySegments}
          />
          <ItineraryModal isVisible={isItineraryVisible} onClose={() => setIsItineraryVisible(false)} itinerary={fullItinerary} itineraryTranslated={fullItineraryTranslated} t={uiTranslations} currentDay={currentDay} playerName={playerName} />
          <ConfirmModal isVisible={showConfirmModal} onConfirm={handleConfirmNewGame} onCancel={() => setShowConfirmModal(false)} t={uiTranslations} />
          <AnalysisLoadingOverlay
             isVisible={isAnalyzing}
             currentStep={endOfDayStep}
             characters={allCharacters}
             psychologicalProfiles={psychologicalProfiles}
             playerPsychoanalysisProse={playerPsychoanalysisProse}
             playerName={playerName}
             psychologicalProfilesTranslated={psychologicalProfilesTranslated}
             playerPsychoanalysisProseTranslated={playerPsychoanalysisProseTranslated}
             onExportState={handleExportState}
             errors={endOfDayErrors}
             onRetryStep={retryEndOfDayStep}
             countdownStepKey={countdownStepKey}
             countdownSeconds={countdownSeconds}
             countdownType={countdownType}
             onOpenModelSelectionModal={() => setIsModelSelectionVisible(true)}
             onOpenApiKeyModal={() => setIsApiKeyModalVisible(true)}
             onBackToMenu={handleBackToMenu}
             onStartNextDay={handleStartNextDayTransition}
             currentDay={currentDay}
             uiTranslations={uiTranslations}
           />
          <SegmentTransitionLoadingOverlay
            isVisible={isAwaitingSegmentTransition}
            currentStep={segmentTransitionStep}
            t={uiTranslations}
            onExportState={handleExportState}
            errors={segmentTransitionErrors}
            onRetryStep={retrySegmentTransitionStep}
            countdownStepKey={countdownStepKey}
            countdownSeconds={countdownSeconds}
            countdownType={countdownType}
            onOpenModelSelectionModal={() => setIsModelSelectionVisible(true)}
            onOpenApiKeyModal={() => handlers.setIsApiKeyModalVisible(true)}
            onBackToMenu={handleBackToMenu}
            isPipelineCompleteAndReady={isPipelineCompleteAndReady}
            onProceedAfterPipeline={handleProceedAfterPipeline}
          />
          <SegmentLoadingOverlay isVisible={isDirectorLoading} message={directorLoadingMessage} />
          <SegmentLoadingOverlay isVisible={isAnalystLoading} message={analystLoadingMessage} />
          <ErrorOverlay
            isVisible={isUnrecoverableError}
            message={error}
            onRetry={handleRetry}
            onCancel={handleCancelError}
            t={uiTranslations}
            onOpenModelSettings={() => setIsModelSelectionVisible(true)}
            onOpenApiKeySettings={() => setIsApiKeyModalVisible(true)}
          />
          <ApiKeyModal 
            isVisible={isApiKeyModalVisible} 
            onClose={() => setIsApiKeyModalVisible(false)} 
            onSave={handleSaveApiKeys} 
            onImport={handleImportKeys} 
            onOpenSetupGuide={() => setIsApiKeySetupGuideVisible(true)}
            apiKeys={apiKeys} 
            t={uiTranslations} 
          />
          <ApiKeySetupGuide 
            isVisible={isApiKeySetupGuideVisible} 
            onClose={() => setIsApiKeySetupGuideVisible(false)} 
          />
          <ModelSelectionModal isVisible={isModelSelectionVisible} onClose={() => setIsModelSelectionVisible(false)} onSave={handleSaveModelSelection} currentSelection={modelConfig} t={uiTranslations} />
          <DevToolsModal
            isVisible={isDevToolsVisible}
            onClose={() => setIsDevToolsVisible(false)}
            characters={characters}
            evolvingPersonas={evolvingPersonas}
            characterLikesDislikes={characterLikesDislikes}
            characterTraits={characterTraits} // [NEW]
            storyArcs={storyArcs}
            subplots={subplots}
            factSheet={factSheet}
            relationshipDynamics={relationshipDynamics}
            relationshipDynamicsStructured={relationshipDynamicsStructured}
            playerName={playerName}
            playerBackstory={playerBackstory}
            unaskedQuestions={unaskedQuestions}
            novelChapters={novelChapters}
            scheduledEvents={scheduledEvents}
            sceneMentalModel={sceneMentalModel}
            characterChronicles={characterChronicles}
            characterBiographies={characterBiographies}
            playthroughSummaries={playthroughSummaries}
            fullItinerary={fullItinerary}
            currentDay={currentDay}
            t={uiTranslations}
            onOpenItinerary={() => setIsItineraryVisible(true)}
            onToggleShowMotivations={() => setShowMotivations(prev => !prev)}
            showMotivations={showMotivations}
            onTogglePromptLogging={handleTogglePromptLogging}
            isPromptLoggingEnabled={isPromptLoggingEnabled}
            apiKeys={apiKeys}
            modelConfig={modelConfig}
          />
        </>
      )}

      {/* Fix Background Confirmation Modal */}
      {showFixBackgroundConfirm && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setShowFixBackgroundConfirm(false)}
        >
          <div
            className="vn-modal-panel max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-cyan-300 mb-3 text-shadow-medium">
              {uiTranslations.confirmFixBackgroundTitle}
            </h3>
            <p className="text-gray-200 mb-6">
              {uiTranslations.confirmFixBackgroundMessage}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowFixBackgroundConfirm(false)}
                className="vn-secondary-button"
              >
                {uiTranslations.confirmCancel}
              </button>
              <button
                onClick={() => {
                  setShowFixBackgroundConfirm(false);
                  handleFixBackground();
                }}
                className="vn-primary-button"
              >
                {uiTranslations.confirmYes}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HuggingFace Demo Welcome Modal */}
      <DemoWelcomeModal
        isVisible={showDemoWelcomeModal}
        onStartDemo={handleStartDemo}
      />

      {/* HuggingFace Demo Limit Modal */}
      <DemoLimitModal
        isVisible={showDemoLimitModal}
        onExportSave={handleExportState}
        onClose={() => setShowDemoLimitModal(false)}
        lastDemoDay={demoLimitDay}
      />
    </main>
  );
};

export default App;
