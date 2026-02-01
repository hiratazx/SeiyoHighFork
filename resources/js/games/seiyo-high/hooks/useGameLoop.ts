/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import {DialogueEntry, DaySegment, DayLog, VnScene, SegmentLog, DailyItinerary, EvolvingStoryArc, FullItinerary, CharacterLikesDislikes, ModelSelection, GeminiModel, AppState, PsychologicalProfiles, ItinerarySegment, AffectionChange, PromptHistoryEntry, PromptDayLog, NextDayResponse, Subplot, EndOfDayStep, NewGameStep, SegmentTransitionStep, NovelChapter, ScheduledEvent, SceneMentalModel, ChronicleEntry, TransitionDirectorResponse, PlayerAnalysisResponse, CharacterConfig, CharacterTraits, RelationshipDynamicsStructured, LocationsBySegment, ClientContext, DayCalendar} from '../types';
import { useTypewriter } from './useTypewriter';
import * as persistenceService from '../services/persistenceService';
import { EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED, EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED_TRANSLATED, SEGMENT_KEY_RELATIONSHIP_KEYS_MODIFIED_TODAY } from '../services/persistenceService';
import { useAppSettings } from './useAppSettings';
import { sanitizeObject, mapHistoryForAI } from '../lib/promptUtils';

// Default empty locations for initialization
const initialLocationsBySegment: LocationsBySegment = {
  Morning: [],
  Afternoon: [],
  Evening: [],
  Night: [],
};
import { fetchGameConfig, GameConfigResponse, setPromptLoggingEnabled } from '../services/apiService';
import { AVAILABLE_MODELS, PROVIDERS } from '../lib/modelConfig';
import { processItineraryPlaceholders } from '../lib/itineraryUtils';
import { migrateSaveFile, importHydratedSave, isHydratedSave, exportHydratedSave } from '../services/migrationService';
import { isCharacterMatch, normalizeCharacterName } from '../lib/characterUtils';
import { englishStrings } from '../lib/translations';
import * as novelistService from '../features/novelist/novelist.service';
import * as psychoanalystService from '../features/psychoanalyst/psychoanalyst.service';
import * as transitionDirectorService from '../features/transitionDirector/transitionDirector.service';
import * as canonArchivistService from '../features/canonArchivist/canonArchivist.service';
import * as castAnalystService from '../features/castAnalyst/castAnalyst.service';
// FIX: Import the dungeonMasterService to resolve the "Cannot find name" error.
import { generateSceneFromState } from '../features/dungeonMaster/dungeonMaster.service';
import * as gameFlowService from '../services/gameFlowService';
import { genericSpriteSets } from '../lib/genericSprites';
import { 
    EOD_KEY_OPENING_SCENE_RAW, EOD_KEY_ERRORS, NEW_GAME_KEY_ERRORS, SEGMENT_KEY_ERRORS, 
    EOD_KEY_PLAYTHROUGH_SUMMARIES, EOD_KEY_CHARACTER_TRAITS, EOD_KEY_FINAL_LIKES_DISLIKES, 
    EOD_KEY_CHARACTER_CHRONICLES, EOD_KEY_CHARACTER_BIOGRAPHIES, EOD_KEY_NOVEL_CHAPTERS,
    // [FIX] Additional keys needed for comprehensive pipeline seeding on import
    EOD_KEY_FINAL_HISTORY, EOD_KEY_UPDATED_MAIN_CHARS, EOD_KEY_UPDATED_SIDE_CHARS,
    EOD_KEY_UPDATED_AVAILABLE_SPRITES, EOD_KEY_MERGED_PROFILES, EOD_KEY_MERGED_PROFILES_TRANSLATED,
    EOD_KEY_RELATIONSHIP_DYNAMICS, EOD_KEY_RELATIONSHIP_DYNAMICS_TRANSLATED,
    EOD_KEY_FINAL_EVOLVING_PERSONAS, EOD_KEY_AFFECTION, EOD_KEY_UNASKED_QUESTIONS,
    EOD_KEY_PLAYER_PSYCHOANALYSIS_PROSE, EOD_KEY_PLAYER_BACKSTORY,
    EOD_KEY_FINAL_STORY_ARCS, EOD_KEY_FINAL_SUBPLOTS, EOD_KEY_UPDATED_FACT_SHEET,
    EOD_KEY_UPDATED_SCHEDULE
} from '../services/persistenceService';
import { db, DbPipelineData, DbStepData, DbErrorData, getKnownLocationIds, getGeneratedLocation, clearGeneratedLocations, migrateFromLegacyDb } from '../db';
import { STORY_NAME, DB_NAME } from '../storyConfig';
// FIX: Import Dexie to allow for explicit type casting.
import Dexie from 'dexie';
import { useScreenContext } from './useScreenContext';
import { handleGeneratedAssets } from '../services/UnifiedAiService';
import { v4 as uuidv4 } from 'uuid';
import { devLog, devWarn, devDebug } from '../lib/devLog';

// Local helper to render structured dynamics to prose
const structuredDynamicsToProseLocal = (structured: any): string | null => {
  if (!structured || typeof structured !== 'object') return null;
  const paragraphs: string[] = [];
  Object.entries(structured).forEach(([key, paras]) => {
    if (!Array.isArray(paras)) return;
    const body = paras
      .map((p: any) => (p && p.paragraph ? p.paragraph : ''))
      .filter(Boolean)
      .join(' ');
    if (body) paragraphs.push(`${key}: ${body}`);
  });
  return paragraphs.length > 0 ? paragraphs.join('\n\n') : null;
};

const defaultBackgroundUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='; // 1x1 Black Pixel

// Default day segments - will be updated from API
const defaultDaySegments = ['Morning', 'Afternoon', 'Evening', 'Night'];

type GameState = 'menu' | 'playing' | 'name_input' | 'replay_menu' | 'replaying';
const MAX_PLAYER_DIALOGUE_RETRIES = 3;

const usePrevious = <T,>(value: T): T | undefined => {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};


export const useGameLoop = () => {
    const appSettings = useAppSettings();
    const { modelConfig, apiKeys, language, uiTranslations, notification } = appSettings;
    const { setNotification } = appSettings;

    // Refs to always access current model config and API keys (even mid-pipeline)
    // This ensures model changes take effect immediately, not just on next pipeline run
    const modelConfigRef = useRef(modelConfig);
    const apiKeysRef = useRef(apiKeys);
    useEffect(() => { modelConfigRef.current = modelConfig; }, [modelConfig]);
    useEffect(() => { apiKeysRef.current = apiKeys; }, [apiKeys]);

    const [mainCharacters, setMainCharacters] = useState<CharacterConfig[]>([]);
    const [sideCharacters, setSideCharacters] = useState<CharacterConfig[]>([]);
    const [originalMainCharacters, setOriginalMainCharacters] = useState<string[]>([]);
    const [originalSideCharacters, setOriginalSideCharacters] = useState<string[]>([]);
    const [locationsBySegment, setLocationsBySegment] = useState<LocationsBySegment>(initialLocationsBySegment);
    const [worldConfig, setWorldConfig] = useState<GameConfigResponse['world'] | null>(null);
    const [daySegments, setDaySegments] = useState<string[]>(defaultDaySegments);
    const allCharacters = useMemo(() => [...(mainCharacters || []), ...(sideCharacters || [])], [mainCharacters, sideCharacters]);

    const [history, setHistory] = useState<DialogueEntry[]>([]);
    const [fullHistory, setFullHistory] = useState<DayLog[]>([]);
    const [sceneQueue, setSceneQueue] = useState<DialogueEntry[]>([]);
    const [currentLine, setCurrentLine] = useState<DialogueEntry | null>(null);
    const [backgroundUrl, setBackgroundUrl] = useState<string>(defaultBackgroundUrl);
    const [previousBackgroundUrl, setPreviousBackgroundUrl] = useState<string | null>(null);
    const [playerName, setPlayerName] = useState<string>('Player');
    const [affection, setAffection] = useState<{[key: string]: number}>({});
    const [currentDay, setCurrentDay] = useState<number>(1);
    const [currentSegment, setCurrentSegment] = useState<DaySegment>(defaultDaySegments[0]);
    const [promptsToday, setPromptsToday] = useState<number>(0);
    const [affectionGainedToday, setAffectionGainedToday] = useState<{[key: string]: number}>({});
    const [affectionLostToday, setAffectionLostToday] = useState<{[key: string]: number}>({});
    const [evolvingPersonas, setEvolvingPersonas] = useState<{[key: string]: string} | null>(null);
    const [characterTraits, setCharacterTraits] = useState<CharacterTraits | null>(null); // [NEW]
    const [characterLikesDislikes, setCharacterLikesDislikes] = useState<CharacterLikesDislikes | null>(null);
    const [playerChoices, setPlayerChoices] = useState<string[] | null>(null);
    const [presentCharacterNames, setPresentCharacterNames] = useState<string[]>([]);
    const [characterStageSlots, setCharacterStageSlots] = useState<(string | null)[]>(Array(6).fill(null));
    const [characterExpressions, setCharacterExpressions] = useState<{[key: string]: { set: string; expression: string }}>({});
    const [fullItinerary, setFullItinerary] = useState<FullItinerary | null>(null);
    const [relationshipDynamics, setRelationshipDynamics] = useState<string | null>(null);
    const [relationshipDynamicsStructured, setRelationshipDynamicsStructured] = useState<RelationshipDynamicsStructured | null>(null);
    const [relationshipDynamicsStructuredTranslated, setRelationshipDynamicsStructuredTranslated] = useState<RelationshipDynamicsStructured | null | undefined>(undefined);
    const [storyArcs, setStoryArcs] = useState<EvolvingStoryArc[] | null>(null);
    const [showMotivations, setShowMotivations] = useState<boolean>(false);
    const [subplots, setSubplots] = useState<Subplot[] | null>(null);
    const [factSheet, setFactSheet] = useState<{[day: number]: string[]}>({});
    const [scheduledEvents, setScheduledEvents] = useState<ScheduledEvent[]>([]);
    const [playthroughCounter, setPlaythroughCounter] = useState<number>(1);
    const [endOfDayStep, setEndOfDayStep] = useState<EndOfDayStep>(EndOfDayStep.NOT_STARTED);
    const [segmentTransitionStep, setSegmentTransitionStep] = useState<SegmentTransitionStep>(SegmentTransitionStep.NOT_STARTED);
    const [newGameStep, setNewGameStep] = useState<NewGameStep>(NewGameStep.NOT_STARTED);
    const [sceneMentalModel, setSceneMentalModel] = useState<SceneMentalModel | null>(null);
    const [availableGenericSetNames, setAvailableGenericSetNames] = useState<string[]>(genericSpriteSets.map(s => s.name));
    
    // [GENERATIVE IMAGES] State for AI-generated backgrounds
    const [currentLocationId, setCurrentLocationId] = useState<string | undefined>(undefined);
    const [currentLocationDescription, setCurrentLocationDescription] = useState<string | undefined>(undefined);
    
    // [GENERATIVE IMAGES] Get screen context for aspect ratio
    const { aspectRatio } = useScreenContext();
    
    const [psychologicalProfiles, setPsychologicalProfiles] = useState<PsychologicalProfiles | null>(null);
    const [novelChapters, setNovelChapters] = useState<NovelChapter[]>([]);
    const [playthroughSummaries, setPlaythroughSummaries] = useState<string[]>([]);
    const [playerPsychoanalysisProse, setPlayerPsychoanalysisProse] = useState<string | null>(null);
    const [playerBackstory, setPlayerBackstory] = useState<string | null>(null);
    const [unaskedQuestions, setUnaskedQuestions] = useState<{ [key: string]: string | undefined } | null>(null);
    const [characterChronicles, setCharacterChronicles] = useState<{[key: string]: ChronicleEntry[]}>({});
    const [characterBiographies, setCharacterBiographies] = useState<{[key: string]: string}>({});
    const [openingSceneCache, setOpeningSceneCache] = useState<VnScene | null>(null);
    const [dayCalendar, setDayCalendar] = useState<DayCalendar | null>(null);

    const [novelChaptersTranslated, setNovelChaptersTranslated] = useState<string[] | undefined>(undefined);
    const [playerPsychoanalysisProseTranslated, setPlayerPsychoanalysisProseTranslated] = useState<string | null | undefined>(undefined);
    const [psychologicalProfilesTranslated, setPsychologicalProfilesTranslated] = useState<PsychologicalProfiles | null | undefined>(undefined);
    const [fullItineraryTranslated, setFullItineraryTranslated] = useState<FullItinerary | null | undefined>(undefined);
    const [playerChoicesTranslated, setPlayerChoicesTranslated] = useState<string[] | null | undefined>(undefined);
    const [relationshipDynamicsTranslated, setRelationshipDynamicsTranslated] = useState<string | null | undefined>(undefined);
    const [affectionLog, setAffectionLog] = useState<{[day: number]: AffectionChange[]}>({});
    const [affectionLogTranslated, setAffectionLogTranslated] = useState<{[day: number]: AffectionChange[]} | undefined>(undefined);
    const [isSegmentAnalysisComplete, setIsSegmentAnalysisComplete] = useState<boolean>(false);

    const [newGameErrors, setNewGameErrors] = useState<{ [step in NewGameStep]?: string }>({});
    const [segmentTransitionErrors, setSegmentTransitionErrors] = useState<{ [step in SegmentTransitionStep]?: string }>({});
    const [endOfDayErrors, setEndOfDayErrors] = useState<{ [step in EndOfDayStep]?: string }>({});

    const promptHistory = useMemo(() => mapHistoryForAI(history || []), [history]);
    
    const [totalInputTokens, setTotalInputTokens] = useState<number>(0);
    const [totalOutputTokens, setTotalOutputTokens] = useState<number>(0);
    const [totalRequests, setTotalRequests] = useState<number>(0);
    const [isPromptLoggingEnabled, setIsPromptLoggingEnabled] = useState<boolean>(false);
  
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [gameState, setGameState] = useState<GameState>('menu');
    const [hasSaveData, setHasSaveData] = useState<boolean>(false);
    const [isGameActive, setIsGameActive] = useState<boolean>(false);
    const [isGameCompleted, setIsGameCompleted] = useState<boolean>(false);
    const [isDayTransitioning, setIsDayTransitioning] = useState<boolean>(false);
    const [isSegmentTransitioning, setIsSegmentTransitioning] = useState<boolean>(false);
    const [isProfileVisible, setIsProfileVisible] = useState<boolean>(false);
    const [isStoryVisible, setIsStoryVisible] = useState<boolean>(false);
    const [isItineraryVisible, setIsItineraryVisible] = useState<boolean>(false);
    const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [analysisMessage, setAnalysisMessage] = useState<string>('');
    const [analysisProgress, setAnalysisProgress] = useState<number>(0);
    const [isAwaitingSegmentTransition, setIsAwaitingSegmentTransition] = useState<boolean>(false);
    const [transitioningToDay, setTransitioningToDay] = useState<number>(1);
    const [transitioningToSegment, setTransitioningToSegment] = useState<DaySegment>(defaultDaySegments[0]);
    const [isAwaitingNextSceneClick, setIsAwaitingNextSceneClick] = useState<boolean>(false);
    const [isApiKeyModalVisible, setIsApiKeyModalVisible] = useState<boolean>(false);
    const newGameInFlightRef = useRef<boolean>(false);
    const eodInFlightRef = useRef<boolean>(false);
    const segmentInFlightRef = useRef<boolean>(false);
    const [isModelSelectionVisible, setIsModelSelectionVisible] = useState<boolean>(false);
    const [isDevToolsVisible, setIsDevToolsVisible] = useState<boolean>(false);
    const [characterGenerationProgress, setCharacterGenerationProgress] = useState<{[key: string]: 'pending' | 'complete'}>({});
    const [analyzedCharacters, setAnalyzedCharacters] = useState<string[]>([]);
    const [isDirectorLoading, setIsDirectorLoading] = useState<boolean>(false);
    const [directorLoadingMessage, setDirectorLoadingMessage] = useState<string>('');
    const [isAnalystLoading, setIsAnalystLoading] = useState<boolean>(false);
    const [analystLoadingMessage, setAnalystLoadingMessage] = useState<string>('');
    const [isUnrecoverableError, setIsUnrecoverableError] = useState<boolean>(false);
    const [isBlockedByOtherTab, setIsBlockedByOtherTab] = useState<boolean>(false);
    const [lastFailedApiCall, setLastFailedApiCall] = useState<{ func: (() => void) | null }>({ func: null });
    const tabChannelRef = useRef<BroadcastChannel | null>(null);
    const [choicesBeforeApiCall, setChoicesBeforeApiCall] = useState<string[] | null>(null);
    const [choicesTranslatedBeforeApiCall, setChoicesTranslatedBeforeApiCall] = useState<string[] | null>(null);
    const [pendingTextInput, setPendingTextInput] = useState<string>('');
    const [lastTypedMessageBeforeError, setLastTypedMessageBeforeError] = useState<string>('');
    const [isPipelineCompleteAndReady, setIsPipelineCompleteAndReady] = useState<boolean>(false);
    const [isPipelineResumePending, setIsPipelineResumePending] = useState<boolean>(false);
    const [countdownStepKey, setCountdownStepKey] = useState<string | null>(null);
    const [countdownSeconds, setCountdownSeconds] = useState<number>(0);
    const [countdownType, setCountdownType] = useState<'success' | 'error' | 'timeout' | null>(null);
    const countdownPromiseResolveRef = useRef<(() => void) | null>(null);

    const isProcessingRef = useRef(false);
    
    // [ROBUST FIX] Pipeline session ID - incremented on import to invalidate stale async operations.
    // Stale pipelines (from before import) will check this ID and bail out instead of corrupting state.
    const pipelineSessionIdRef = useRef(0);

    // [REPLAY] Imported save data for replaying OTHER playthroughs (non-destructive to current game)
    const [importedReplayData, setImportedReplayData] = useState<AppState | null>(null);
    const [replayScript, setReplayScript] = useState<DialogueEntry[]>([]);
    const [replayIndex, setReplayIndex] = useState<number>(0);
    const [isReplayPaused, setIsReplayPaused] = useState<boolean>(true);
    const [replaySpeed, setReplaySpeed] = useState<number>(1);
    // [REPLAY] Counter to force typewriter restart even when replaying the same line
    const [replayRestartKey, setReplayRestartKey] = useState<number>(0);
    // [REPLAY] Toggle to show English (canonical) dialogue vs. original translated dialogue
    // When true, shows dialogueTranslated; when false, shows dialogue (English)
    const [showReplayOriginalLanguage, setShowReplayOriginalLanguage] = useState<boolean>(true);
    // [REPLAY] Available segments for the current replay day (for segment navigation)
    const [replayAvailableSegments, setReplayAvailableSegments] = useState<DaySegment[]>([]);
    // [REPLAY] Current segment being replayed (for highlighting in UI)
    const [replayCurrentSegment, setReplayCurrentSegment] = useState<DaySegment | null>(null);
    // [REPLAY] Flag for when we've reached the end of a segment (shows "Next Segment" button)
    const [isAtSegmentEnd, setIsAtSegmentEnd] = useState<boolean>(false);
    // [REPLAY] Accumulated history for display during replay (separate from game history)
    const [replayHistory, setReplayHistory] = useState<DialogueEntry[]>([]);
    // [REPLAY] Visual state for replay - completely isolated from main game state
    const [replayBackgroundUrl, setReplayBackgroundUrl] = useState<string>('');
    const [previousReplayBackgroundUrl, setPreviousReplayBackgroundUrl] = useState<string | null>(null);
    const [replayPresentCharacters, setReplayPresentCharacters] = useState<string[]>([]);
    const [replayCharacterExpressions, setReplayCharacterExpressions] = useState<{ [key: string]: { set: string; expression: string } }>({});
    // [REPLAY] In-memory storage for imported save's generated backgrounds (Map: locationId → blobUrl)
    // This avoids touching IndexedDB and corrupting the player's own backgrounds
    const [replayGeneratedLocations, setReplayGeneratedLocations] = useState<Map<string, string>>(new Map());
    // [REPLAY] Character data from imported save (for sprites during replay)
    const [replayCharacters, setReplayCharacters] = useState<CharacterConfig[]>([]);
    // [REPLAY] Track blob URLs created during active game replay (for cleanup to prevent memory leaks)
    const activeReplayBlobUrlsRef = useRef<string[]>([]);
    // [REPLAY] Cache blob URLs by location ID to prevent re-creating them (causes flicker)
    const activeReplayBlobCacheRef = useRef<Map<string, string>>(new Map());
    // [REPLAY] Track current replay location to only update background when it CHANGES
    const currentReplayLocationRef = useRef<string | null>(null);
    
    // [REPLAY] Helper to set replay background with crossfade (mirrors handleSetBackground)
    const setReplayBackgroundWithFade = useCallback((newUrl: string) => {
      if (newUrl !== replayBackgroundUrl) {
        setPreviousReplayBackgroundUrl(replayBackgroundUrl || null);
        setReplayBackgroundUrl(newUrl);
        setTimeout(() => setPreviousReplayBackgroundUrl(null), 1000);
      }
    }, [replayBackgroundUrl]);

    useEffect(() => {
        if (countdownSeconds > 0) {
            const timer = setTimeout(() => {
                setCountdownSeconds(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (countdownSeconds === 0) {
            setCountdownStepKey(null);
            setCountdownType(null);
            if (countdownPromiseResolveRef.current) {
                countdownPromiseResolveRef.current(); // Resolve the promise
                countdownPromiseResolveRef.current = null;
            }
        }
    }, [countdownSeconds]);

    useEffect(() => {
        // [MULTI-TAB PROTECTION] Prevent game from running in multiple tabs
        const channelName = `${DB_NAME}_tab_leader`;
        const channel = new BroadcastChannel(channelName);
        const tabId = Date.now() + Math.random(); // Unique ID for this tab
        let claimTimeoutId: ReturnType<typeof setTimeout> | null = null;
        let isBlocked = false; // Local flag to prevent claiming after being blocked
        
        channel.onmessage = (event) => {
            if (event.data.type === 'LEADER_CLAIM' && event.data.tabId !== tabId) {
                // Another tab is claiming leadership - we must yield
                devLog(`[MultiTab] Another tab (${event.data.tabId}) claimed leadership. Blocking this tab.`);
                isBlocked = true;
                // Cancel our pending claim so we don't block the other tab back
                if (claimTimeoutId) {
                    clearTimeout(claimTimeoutId);
                    claimTimeoutId = null;
                }
                setIsBlockedByOtherTab(true);
                setError("This game is already open in another browser tab. Please close this tab to avoid save data corruption.");
                setIsLoading(false);
            } else if (event.data.type === 'LEADER_CHECK' && !isBlocked) {
                // Another tab is checking if a leader exists - respond to block them
                // Only respond if we haven't been blocked ourselves
                channel.postMessage({ type: 'LEADER_CLAIM', tabId });
            }
        };
        
        // Check if another tab is already running
        channel.postMessage({ type: 'LEADER_CHECK', tabId });
        
        // Claim leadership after a short delay (give other tabs time to respond)
        claimTimeoutId = setTimeout(() => {
            if (!isBlocked) {
                channel.postMessage({ type: 'LEADER_CLAIM', tabId });
                devLog(`[MultiTab] Claimed leadership for tab ${tabId}`);
            }
            claimTimeoutId = null;
        }, 100);
        
        tabChannelRef.current = channel;
        
        const load = async () => {
          try {
            // [DB MIGRATION] Migrate legacy DB to story-scoped DB (backwards compat)
            await migrateFromLegacyDb();
            
            // --- ADD THIS NEW BLOCK ---
            const config = await fetchGameConfig(STORY_NAME);
            
            // Separate characters into main/side (for originalMainCharacters only)
            // Note: config characters don't have baseProfile, so we only extract names
            const loadedMainCharNames = config.characters
                .filter(c => c.type === 'main')
                .map(c => c.name);
            const loadedSideCharNames = config.characters
                .filter(c => c.type === 'side')
                .map(c => c.name);
            
            // DO NOT set characters here - they will be loaded from Dexie save data below
            // The config endpoint returns incomplete data (missing sprites/colors/baseProfile)
            // The source of truth for UI-facing character data is the Dexie save file
            
            // Store the new world config
            setWorldConfig(config.world);
            setLocationsBySegment(config.world.locationsBySegment);
            setDaySegments(config.world.day_structure);
            
            // DO NOT initialize affection here - it will be loaded from Dexie save data below
            // The source of truth for affection is the Dexie save file
            // loadInitialState() already provides defaults for new games
            
            setOriginalMainCharacters(loadedMainCharNames);
            setOriginalSideCharacters(loadedSideCharNames);
            // --- END OF NEW BLOCK ---

            const loadedState = await persistenceService.loadInitialState(
                config.characters.filter(c => c.type === 'main').map(c => ({ ...c, baseProfile: '' })),
                config.characters.filter(c => c.type === 'side').map(c => ({ ...c, baseProfile: '' })),
                englishStrings
            );
            
            // INJECT world config into loaded state if missing (for migration/legacy support)
            loadedState.worldConfig = {
                day_structure: config.world.day_structure,
                locationsBySegment: config.world.locationsBySegment
            };
            
            // [FIX] Only override API keys if Dexie has populated keys
            // API keys are primarily stored in localStorage via useAppSettings
            // Don't overwrite localStorage keys with empty Dexie state (e.g., after resetGameState clears AppState)
            const hasLoadedApiKeys = loadedState.apiKeys && Object.values(loadedState.apiKeys).some(k => k && k.trim() !== '');
            if (hasLoadedApiKeys) {
                appSettings.setApiKeys(loadedState.apiKeys);
            }
            // Only override model config if loaded state has valid models (not placeholder)
            if (loadedState.modelSelection?.dungeonMasterModel && 
                !loadedState.modelSelection.dungeonMasterModel.startsWith('ERROR_')) {
                appSettings.setModelConfig(loadedState.modelSelection);
            }
            appSettings.setLanguage(loadedState.language);
            appSettings.setUiTranslations(loadedState.uiTranslations);
            
            // --- FIXED CHARACTER LOADING LOGIC ---
            // We use the loaded state for existence/order, but MERGE fresh assets from config.
            
            if (loadedState.mainCharacters && loadedState.mainCharacters.length > 0) {
                const mergedMainCharacters = loadedState.mainCharacters.map(loadedChar => {
                    // Find the corresponding config to get fresh sprites
                    const configChar = config.characters.find(c => c.name === loadedChar.name);
                    if (configChar) {
                        return {
                            ...loadedChar,
                            // ALWAYS use fresh assets from config/backend to ensure URLs and Sets are valid
                            spriteSets: configChar.spriteSets,
                            image: configChar.image,
                            // Keep loaded data for things that change (like evolving attributes if any)
                        };
                    }
                    return loadedChar;
                });
                setMainCharacters(mergedMainCharacters);
            } else {
                // New Game logic (unchanged)
                const configMainChars = config.characters
                    .filter(c => c.type === 'main')
                    .map(c => ({
                        ...c,
                        baseProfile: 'Character profile will be generated during gameplay.', // Placeholder
                    }));
                if (configMainChars.length > 0) {
                    setMainCharacters(configMainChars);
                }
            }

            if (loadedState.sideCharacters && loadedState.sideCharacters.length > 0) {
                const mergedSideCharacters = loadedState.sideCharacters.map(loadedChar => {
                    const configChar = config.characters.find(c => c.name === loadedChar.name);
                    if (configChar) {
                        return {
                            ...loadedChar,
                            spriteSets: configChar.spriteSets,
                            image: configChar.image,
                        };
                    }
                    return loadedChar;
                });
                setSideCharacters(mergedSideCharacters);
            } else {
                // New Game logic (unchanged)
                const configSideChars = config.characters
                    .filter(c => c.type === 'side')
                    .map(c => ({
                        ...c,
                        baseProfile: 'Character profile will be generated during gameplay.', // Placeholder
                    }));
                if (configSideChars.length > 0) {
                    setSideCharacters(configSideChars);
                }
            }
            // --- END FIXED CHARACTER LOADING ---
            setHistory(loadedState.history);
            setFullHistory(loadedState.fullHistory);
            setSceneQueue(loadedState.sceneQueue);
            setCurrentLine(loadedState.currentLine);
            setBackgroundUrl(loadedState.backgroundUrl);
            setPlayerName(loadedState.playerName);
            setAffection(loadedState.affection);
            setCurrentDay(loadedState.currentDay);
            setCurrentSegment(loadedState.currentSegment);
            setPromptsToday(loadedState.promptsToday);
            setAffectionGainedToday(loadedState.affectionGainedToday);
            setAffectionLostToday(loadedState.affectionLostToday);
            setEvolvingPersonas(loadedState.evolvingPersonas);
            setCharacterTraits(loadedState.characterTraits ?? null); // [FIX] Restore traits from Dexie load
            setCharacterLikesDislikes(loadedState.characterLikesDislikes);
            setPlayerChoices(loadedState.playerChoices);
            setPresentCharacterNames(loadedState.presentCharacterNames);
            setCharacterStageSlots(loadedState.characterStageSlots);
            setCharacterExpressions(loadedState.characterExpressions);
            setFullItinerary(loadedState.fullItinerary);
            setRelationshipDynamics(loadedState.relationshipDynamics);
            setStoryArcs(loadedState.storyArcs);
            setShowMotivations(loadedState.showMotivations);
            setSubplots(loadedState.subplotAnalysis);
            setFactSheet(loadedState.factSheet);
            setScheduledEvents(loadedState.scheduledEvents);
            setPlaythroughCounter(loadedState.playthroughCounter);
            setEndOfDayStep(loadedState.endOfDayStep);
            setSegmentTransitionStep(loadedState.segmentTransitionStep);
            setNewGameStep(loadedState.newGameStep);
            setSceneMentalModel(loadedState.sceneMentalModel);
            setOriginalMainCharacters(loadedState.originalMainCharacters);
            setAvailableGenericSetNames(loadedState.availableGenericSetNames);
            setPsychologicalProfiles(loadedState.psychologicalProfiles);
            setNovelChapters(loadedState.novelChapters);
            setPlaythroughSummaries(loadedState.playthroughSummaries || []);
            setPlayerPsychoanalysisProse(loadedState.playerPsychoanalysisProse);
            setPlayerBackstory(loadedState.playerBackstory);
            setUnaskedQuestions(loadedState.unaskedQuestions);
            setCharacterChronicles(loadedState.characterChronicles);
            setCharacterBiographies(loadedState.characterBiographies ?? {});
            setOpeningSceneCache(loadedState.openingSceneCache);
            setDayCalendar(loadedState.dayCalendar);
            setNovelChaptersTranslated(loadedState.novelChaptersTranslated);
            setPlayerPsychoanalysisProseTranslated(loadedState.playerPsychoanalysisProseTranslated);
            setPsychologicalProfilesTranslated(loadedState.psychologicalProfilesTranslated);
            setFullItineraryTranslated(loadedState.fullItineraryTranslated);
            setPlayerChoicesTranslated(loadedState.playerChoicesTranslated);
            setRelationshipDynamicsTranslated(loadedState.relationshipDynamicsTranslated);
            setRelationshipDynamicsStructured(loadedState.relationshipDynamicsStructured ?? null);
            setRelationshipDynamicsStructuredTranslated(loadedState.relationshipDynamicsStructuredTranslated);
            setAffectionLog(loadedState.affectionLog);
            setAffectionLogTranslated(loadedState.affectionLogTranslated);
            setIsSegmentAnalysisComplete(loadedState.isSegmentAnalysisComplete);
            setIsAwaitingNextSceneClick(loadedState.isAwaitingNextSceneClick);
            setIsPipelineCompleteAndReady(loadedState.isPipelineCompleteAndReady);
            setIsAnalyzing(loadedState.isAnalyzing);
            setIsDayTransitioning(loadedState.isDayTransitioning);
            setIsSegmentTransitioning(loadedState.isSegmentTransitioning);
            setIsGameCompleted(loadedState.isGameCompleted);
            setIsDirectorLoading(loadedState.isDirectorLoading);
            setIsAnalystLoading(loadedState.isAnalystLoading);
            setIsUnrecoverableError(loadedState.isUnrecoverableError);
            setIsPipelineResumePending(loadedState.isPipelineResumePending ?? false);
            setTotalInputTokens(loadedState.totalInputTokens);
            setTotalOutputTokens(loadedState.totalOutputTokens);
            setTotalRequests(loadedState.totalRequests);
            
            // [GENERATIVE IMAGES] Restore current location for generated backgrounds
            if (loadedState.currentLocationId) {
                setCurrentLocationId(loadedState.currentLocationId);
            }
            if (loadedState.currentLocationDescription) {
                setCurrentLocationDescription(loadedState.currentLocationDescription);
            }
    
            setHasSaveData(loadedState.history.length > 0 || loadedState.fullHistory.length > 0);

            // [FIX] Auto-resume interrupted pipelines on app load
            // This handles the case where user closes browser mid-pipeline
            const hasInterruptedEod = loadedState.endOfDayStep > EndOfDayStep.NOT_STARTED && 
                                      loadedState.endOfDayStep < EndOfDayStep.FINAL_STATE_SAVE_COMPLETE;
            const hasInterruptedSegment = loadedState.segmentTransitionStep > SegmentTransitionStep.NOT_STARTED && 
                                          loadedState.segmentTransitionStep < SegmentTransitionStep.STATE_UPDATE_COMPLETE;
            const hasInterruptedNewGame = loadedState.newGameStep > NewGameStep.NOT_STARTED && 
                                          loadedState.newGameStep < NewGameStep.FINAL_STATE_SAVE_COMPLETE;
            
            // Load errors from persistence to check if we should auto-resume or show error UI
            const persistedNewGameErrors = await persistenceService.loadNewGameErrors();
            const persistedEodErrors = await persistenceService.loadEodErrors();
            const persistedSegmentErrors = await persistenceService.loadSegmentTransitionErrors();
            const hasNewGameError = persistedNewGameErrors && Object.keys(persistedNewGameErrors).length > 0;
            const hasEodError = persistedEodErrors && Object.keys(persistedEodErrors).length > 0;
            const hasSegmentError = persistedSegmentErrors && Object.keys(persistedSegmentErrors).length > 0;
            
            // Set error states so UI can display them
            if (persistedNewGameErrors) setNewGameErrors(persistedNewGameErrors);
            if (persistedEodErrors) setEndOfDayErrors(persistedEodErrors);
            if (persistedSegmentErrors) setSegmentTransitionErrors(persistedSegmentErrors);
            
            if (hasInterruptedEod || hasInterruptedSegment) {
              // For EOD/Segment interruption, go directly to playing state
              const hasError = hasInterruptedEod ? hasEodError : hasSegmentError;
              devLog(`[AutoResume] Detected interrupted ${hasInterruptedEod ? 'EOD' : 'Segment'} pipeline on load. HasError: ${hasError}`);
              setGameState('playing');
              setIsGameActive(true);
              setIsLoading(false); // Hide initial loading
              if (hasInterruptedEod) setIsAnalyzing(true);
              if (hasInterruptedSegment) setIsAwaitingSegmentTransition(true);
              // Note: EOD/Segment handlers auto-clear errors and retry, so they dispatch even with errors
            } else if (hasInterruptedNewGame) {
              // For New Game interruption, go to name_input state so resume logic can kick in
              const persistedName = await persistenceService.loadPipelineData<string>(persistenceService.NEW_GAME_KEY_PLAYER_NAME);
              devLog(`[AutoResume] Detected interrupted New Game pipeline at step: ${NewGameStep[loadedState.newGameStep]}. HasError: ${hasNewGameError}`);
              if (persistedName) {
                setPlayerName(persistedName);
              }
              setGameState('name_input');
              setIsGameActive(true);
              // [FIX] Must set isLoading=false so resume effect doesn't bail out early
              // The New Game pipeline UI is controlled by gameState='name_input', not isLoading
              setIsLoading(false);
              // Note: Resume effect checks !hasNewGameError before auto-dispatching
            } else {
              // No interrupted pipeline - reset loading state
              setIsLoading(false);
            }
          } catch (err) {
            console.error("Failed to load initial state or game config:", err);
            setError("Could not load game data. Check connection and refresh.");
            setIsUnrecoverableError(true); // This is a critical error
            setIsLoading(false);
          }
        };
        load();
        
        // Cleanup: close channel and release leadership on unmount
        return () => {
            if (claimTimeoutId) clearTimeout(claimTimeoutId);
            if (tabChannelRef.current) {
                tabChannelRef.current.close();
                tabChannelRef.current = null;
            }
        };
      }, []);
  
    // Hydrate critical narrative data when entering playing, if missing
    useEffect(() => {
      (async () => {
        if (gameState !== 'playing') return;

        // Story arcs, likes/dislikes, traits
        if ((!storyArcs || storyArcs.length === 0) || !characterLikesDislikes || !characterTraits) {
          const foundation = await persistenceService.loadPipelineData<any>(persistenceService.NEW_GAME_KEY_FOUNDATION);
          if (foundation) {
            if ((!storyArcs || storyArcs.length === 0) && foundation.story_arcs) {
              setStoryArcs(foundation.story_arcs);
            }
            if (!characterLikesDislikes && foundation.authentic_likes_dislikes) {
              setCharacterLikesDislikes(foundation.authentic_likes_dislikes);
            }
          }
          if (!characterLikesDislikes) {
            const likesFromEod = await persistenceService.loadPipelineData(persistenceService.EOD_KEY_FINAL_LIKES_DISLIKES as any);
            if (likesFromEod) setCharacterLikesDislikes(likesFromEod as any);
          }
          if (!characterTraits) {
            const traitsFromDexie =
              (await persistenceService.loadPipelineData(persistenceService.NEW_GAME_KEY_INITIAL_TRAITS)) ??
              (await persistenceService.loadPipelineData(persistenceService.EOD_KEY_CHARACTER_TRAITS as any));
            if (traitsFromDexie) {
              setCharacterTraits(traitsFromDexie as any);
            } else if (foundation?.initial_traits) {
              setCharacterTraits(foundation.initial_traits as any);
            }
          }
        }

        // Relationship dynamics: structured + prose
        if (!relationshipDynamicsStructured || !relationshipDynamics) {
          const structured = relationshipDynamicsStructured
            || await persistenceService.loadPipelineData(persistenceService.NEW_GAME_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED)
            || await persistenceService.loadPipelineData(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED);
          if (structured && !relationshipDynamicsStructured) {
            setRelationshipDynamicsStructured(structured as any);
          }
          const prose = relationshipDynamics
            || structuredDynamicsToProseLocal(structured)
            || await persistenceService.loadPipelineData<string | null>(persistenceService.EOD_KEY_RELATIONSHIP_DYNAMICS as any);
          if (prose && !relationshipDynamics) {
            setRelationshipDynamics(prose as any);
          }
        }
      })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameState]);

    const handleAutoAdvance = useCallback(() => {
      if (!currentLine) return;
      // This check is important to stop the flow during transitions.
      if (isDayTransitioning || isSegmentTransitioning || isProfileVisible || isStoryVisible || isItineraryVisible || isAnalyzing || showConfirmModal) return;
      
      // Check for end of segment. The currentLine is already in history, so we can just set the UI state.
      if (sceneQueue.length === 0 && currentLine.end_of_segment) {
          devLog("handleAutoAdvance: Scene finished with end flag. Showing Next Scene button.");
          setIsAwaitingNextSceneClick(true);
          setCurrentLine(null); // Clear the line to show the button
          return;
      }
      
      // The line is already in the history, so we just clear it from the display.
      setCurrentLine(null);
    }, [currentLine, sceneQueue.length, isDayTransitioning, isSegmentTransitioning, isProfileVisible, isStoryVisible, isItineraryVisible, isAnalyzing, showConfirmModal]);
    
    const handleReplayAdvance = useCallback(() => {
      if (gameState !== 'replaying') return;
      if (isReplayPaused) return; // Don't advance while paused (e.g., after language toggle)
      
      // Check if next entry is in a different segment (segment boundary)
      const currentEntry = replayScript[replayIndex];
      const nextEntry = replayScript[replayIndex + 1];
      
      if (nextEntry && currentEntry && nextEntry.segment !== currentEntry.segment) {
        // At segment boundary - pause instead of advancing
        setIsReplayPaused(true);
        setIsAtSegmentEnd(true);
        return;
      }
      
      if (!nextEntry) {
        // At end of day - pause
        setIsReplayPaused(true);
        setIsAtSegmentEnd(true);
        return;
      }
      
      setReplayIndex(prev => prev + 1);
    }, [gameState, replayScript, replayIndex, isReplayPaused]);
  
    // Determine which dialogue to show:
    // - During replay: respect the toggle (original language vs English)
    // - During normal play: respect the game's language setting
    const dialogueForDisplay = gameState === 'replaying'
      ? (showReplayOriginalLanguage 
          ? (currentLine?.dialogueTranslated || currentLine?.dialogue)  // Original (translated) first, fallback to English
          : currentLine?.dialogue)  // Force English (canonical)
      : (language !== 'English' 
          ? (currentLine?.dialogueTranslated || currentLine?.dialogue) 
          : currentLine?.dialogue);
  
    const displayedDialogue = useTypewriter(
      dialogueForDisplay ?? '',
      30 / replaySpeed, 
      gameState === 'replaying' ? handleReplayAdvance : handleAutoAdvance,
      gameState === 'replaying' ? 750 / replaySpeed : 750,
      gameState === 'replaying' ? replayRestartKey : undefined // Force restart on replay restart
    );

    const state = {
      history, sceneQueue, currentLine, backgroundUrl, previousBackgroundUrl, affection, currentDay,
      currentSegment, playerChoices, promptsToday, affectionGainedToday, affectionLostToday, presentCharacterNames, characterStageSlots, characterExpressions,
      characters: allCharacters, mainCharacters, sideCharacters, fullItinerary, showMotivations, psychologicalProfiles, novelChapters, playthroughSummaries, playerPsychoanalysisProse,
      relationshipDynamics, relationshipDynamicsStructured, psychologicalProfilesTranslated, novelChaptersTranslated, playerPsychoanalysisProseTranslated,
      fullItineraryTranslated, playerChoicesTranslated, relationshipDynamicsTranslated, relationshipDynamicsStructuredTranslated, playthroughCounter,
      playerName, affectionLog, affectionLogTranslated, importedReplayData, replayScript, replayHistory, isReplayPaused, replaySpeed, showReplayOriginalLanguage, replayAvailableSegments, replayCurrentSegment, isAtSegmentEnd,
      replayBackgroundUrl, previousReplayBackgroundUrl, replayPresentCharacters, replayCharacterExpressions, replayGeneratedLocations, replayCharacters,
      displayedDialogue, evolvingPersonas, characterTraits, characterLikesDislikes, storyArcs, subplots, factSheet,
      fullHistory, endOfDayStep, newGameStep, isSegmentAnalysisComplete,
      segmentTransitionStep, playerBackstory, unaskedQuestions, characterChronicles, characterBiographies, scheduledEvents,
      sceneMentalModel, originalMainCharacters, originalSideCharacters, newGameErrors, segmentTransitionErrors, endOfDayErrors,
      pendingTextInput, availableGenericSetNames, openingSceneCache,
      apiKeys, modelConfig, language, uiTranslations, error, isPipelineResumePending,
      countdownStepKey,
      countdownSeconds,
      countdownType,
      // [GENERATIVE IMAGES]
      currentLocationId, currentLocationDescription, aspectRatio,
      // Calendar and weather
      dayCalendar,
      // [REPLAY] Dynamic segment order from game config
      daySegments,
      // [CRITICAL] worldConfig for segment ordering - persisted to prevent data corruption
      worldConfig,
    };

    const uiState = {
      isLoading, loadingMessage, error, notification, gameState, hasSaveData, isGameActive, isGameCompleted,
      isDayTransitioning, isSegmentTransitioning, isProfileVisible, isStoryVisible, isItineraryVisible,
      isDevToolsVisible, showConfirmModal, isAnalyzing, analysisMessage, analysisProgress, transitioningToDay,
      transitioningToSegment, isAwaitingNextSceneClick, isApiKeyModalVisible, isModelSelectionVisible,
      characterGenerationProgress, analyzedCharacters, isDirectorLoading, directorLoadingMessage,
      isAnalystLoading, analystLoadingMessage, isUnrecoverableError, isBlockedByOtherTab,
      isAwaitingSegmentTransition,
      isPipelineCompleteAndReady,
      endOfDayStep, newGameStep, segmentTransitionStep,
    };

    const devState = { isPromptLoggingEnabled };
  
    const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
    const handleSetBackground = useCallback((newUrl: string) => {
      if (newUrl !== backgroundUrl) {
        setPreviousBackgroundUrl(backgroundUrl);
        setBackgroundUrl(newUrl);
        setTimeout(() => setPreviousBackgroundUrl(null), 1000);
      }
    }, [backgroundUrl]);
  
    const getCurrentState: () => AppState = useCallback((): AppState => {
      return {
        mainCharacters, sideCharacters, history, fullHistory, sceneQueue, currentLine, backgroundUrl, playerName,
        affection, currentDay, currentSegment, promptsToday, affectionGainedToday, affectionLostToday,
        evolvingPersonas, characterTraits, characterLikesDislikes, playerChoices, presentCharacterNames, 
        characterStageSlots, characterExpressions, fullItinerary, relationshipDynamics, relationshipDynamicsStructured,
        storyArcs, showMotivations, subplots, subplotAnalysis: subplots, factSheet, scheduledEvents,
        totalInputTokens, totalOutputTokens, totalRequests, psychologicalProfiles, novelChapters, playthroughSummaries, playthroughCounter, 
        playerPsychoanalysisProse, isAwaitingSegmentTransition, novelChaptersTranslated, 
        playerPsychoanalysisProseTranslated, psychologicalProfilesTranslated, fullItineraryTranslated, 
        playerChoicesTranslated, relationshipDynamicsTranslated, relationshipDynamicsStructuredTranslated, affectionLog, affectionLogTranslated,
        endOfDayStep: endOfDayStep,
        newGameStep: newGameStep,
        isSegmentAnalysisComplete,
        segmentTransitionStep: segmentTransitionStep,
        playerBackstory, unaskedQuestions, originalMainCharacters, originalSideCharacters, characterChronicles, characterBiographies, sceneMentalModel,
        availableGenericSetNames: state.availableGenericSetNames,
        isAwaitingNextSceneClick, 
        isPipelineCompleteAndReady,
        isLoading, isAnalyzing, isDayTransitioning, isSegmentTransitioning,
        isGameCompleted, isDirectorLoading, isAnalystLoading, isUnrecoverableError, isPipelineResumePending,
        apiKeys: apiKeysRef.current, modelSelection: modelConfigRef.current, language, uiTranslations, openingSceneCache,
        locationsBySegment,
        worldConfig: worldConfig ?? undefined,
        // [GENERATIVE IMAGES] Include location state for persistence
        currentLocationId,
        currentLocationDescription,
        // Calendar and weather data
        dayCalendar,
      };
    }, [
        mainCharacters, sideCharacters, history, fullHistory, sceneQueue, currentLine, backgroundUrl, playerName, affection, currentDay, 
        currentSegment, promptsToday, affectionGainedToday, affectionLostToday, evolvingPersonas, characterTraits,
        characterLikesDislikes, playerChoices, language, uiTranslations, presentCharacterNames, 
        characterStageSlots, characterExpressions, fullItinerary, relationshipDynamics, relationshipDynamicsStructured, storyArcs, 
        showMotivations, subplots, factSheet, scheduledEvents, totalInputTokens, totalOutputTokens, 
        totalRequests, psychologicalProfiles, novelChapters, playthroughSummaries, playthroughCounter, playerPsychoanalysisProse, 
        isAwaitingSegmentTransition, novelChaptersTranslated, 
        playerPsychoanalysisProseTranslated, psychologicalProfilesTranslated, fullItineraryTranslated, 
        playerChoicesTranslated, relationshipDynamicsTranslated, relationshipDynamicsStructuredTranslated, affectionLog, affectionLogTranslated, dayCalendar,
        isSegmentAnalysisComplete, playerBackstory, unaskedQuestions,
        originalMainCharacters, characterChronicles, characterBiographies, sceneMentalModel, state.availableGenericSetNames,
        isAwaitingNextSceneClick, openingSceneCache,
        isPipelineCompleteAndReady, 
        isLoading, isAnalyzing, isDayTransitioning, isSegmentTransitioning, 
        isGameCompleted, isDirectorLoading, isAnalystLoading, isUnrecoverableError, isPipelineResumePending,
        endOfDayStep, newGameStep, segmentTransitionStep,
        locationsBySegment, worldConfig,
        // [GENERATIVE IMAGES]
        currentLocationId, currentLocationDescription
    ]);
  
    useEffect(() => {
        if (isLoading) return; // Don't save while initializing
        if (gameState !== 'playing') return;
        const save = async () => {
          const stateToSave = getCurrentState();
          
          // =========================================================================
          // [ARCHITECTURE FIX] DEXIE-FIRST SAVING
          // =========================================================================
          // For critical character context, ALWAYS use Dexie as source of truth.
          // This ensures exports never have stale/null data even if React state
          // got desynced somehow.
          // =========================================================================
          const [dexieTraits, dexieLikes, dexiePersonas] = await Promise.all([
            persistenceService.loadPipelineData<CharacterTraits>(EOD_KEY_CHARACTER_TRAITS) ??
            persistenceService.loadPipelineData<CharacterTraits>(persistenceService.NEW_GAME_KEY_INITIAL_TRAITS),
            persistenceService.loadPipelineData<CharacterLikesDislikes>(EOD_KEY_FINAL_LIKES_DISLIKES),
            persistenceService.loadPipelineData<{ [key: string]: string }>(EOD_KEY_FINAL_EVOLVING_PERSONAS),
          ]);
          
          // Use Dexie data if available, otherwise keep React state
          if (dexieTraits) {
            stateToSave.characterTraits = dexieTraits;
            if (!characterTraits || Object.keys(characterTraits).length === 0) {
              setCharacterTraits(dexieTraits); // Sync React state
            }
          }
          if (dexieLikes) {
            stateToSave.characterLikesDislikes = dexieLikes;
            if (!characterLikesDislikes || Object.keys(characterLikesDislikes).length === 0) {
              setCharacterLikesDislikes(dexieLikes);
            }
          }
          if (dexiePersonas) {
            stateToSave.evolvingPersonas = dexiePersonas;
            if (!evolvingPersonas || Object.keys(evolvingPersonas).length === 0) {
              setEvolvingPersonas(dexiePersonas);
            }
          }
          
          await persistenceService.saveState(stateToSave);
          setHasSaveData(true);
        };
        const timeoutId = setTimeout(save, 300);
        return () => clearTimeout(timeoutId);
      }, [getCurrentState, gameState, isLoading, characterTraits, characterLikesDislikes, evolvingPersonas]);
    
    useEffect(() => {
    if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
    
    const displayableCharacterNames = presentCharacterNames.filter(name => 
      allCharacters.some(charConfig => charConfig.name === name)
    );
    
    const onStageNow = new Set(characterStageSlots.filter(Boolean) as string[]);
    const shouldBeOnStage = new Set(displayableCharacterNames);

    const leavingChars = [...onStageNow].filter(c => !shouldBeOnStage.has(c));
    const enteringChars = [...shouldBeOnStage].filter(c => !onStageNow.has(c));
    const isSwap = enteringChars.length > 0 && leavingChars.length > 0;

    if (isSwap) {
        animationTimeoutRef.current = setTimeout(() => {
            setCharacterStageSlots(prevSlots => {
                const newSlots = [...prevSlots];
                const enteringQueue = [...enteringChars];

                // Pass 1: Replace leaving characters with entering characters (Swap)
                for (let i = 0; i < newSlots.length; i++) {
                    if (newSlots[i] !== null && leavingChars.includes(newSlots[i]!)) {
                        if (enteringQueue.length > 0) {
                            // Direct swap
                            newSlots[i] = enteringQueue.shift()!;
                        } else {
                            // No one left to swap in, so just clear the slot
                            newSlots[i] = null;
                        }
                    }
                }

                // Pass 2: Place any REMAINING entering characters into empty slots
                // This fixes the bug where extra characters don't appear if more enter than leave
                if (enteringQueue.length > 0) {
                    enteringQueue.forEach(char => {
                        const emptyIndex = newSlots.indexOf(null);
                        if (emptyIndex !== -1) {
                            newSlots[emptyIndex] = char;
                        }
                    });
                }

                return newSlots;
            });
        }, 2000);
    } else {
        if (enteringChars.length > 0) {
            setCharacterStageSlots(prevSlots => {
                const newSlots = [...prevSlots];
                enteringChars.forEach(char => {
                    if (!newSlots.includes(char)) {
                       const emptyIndex = newSlots.indexOf(null);
                        if (emptyIndex !== -1) {
                            newSlots[emptyIndex] = char;
                        }
                    }
                });
                return newSlots;
            });
        }
        if (leavingChars.length > 0) {
            animationTimeoutRef.current = setTimeout(() => {
                setCharacterStageSlots(prevSlots => prevSlots.map(slot => leavingChars.includes(slot!) ? null : slot));
            }, 2000);
        }
    }
  }, [presentCharacterNames, allCharacters]);
  
    const updateStats = useCallback((inputTokens: number, outputTokens: number) => {
      setTotalRequests(prev => prev + 1);
      setTotalInputTokens(prev => prev + inputTokens);
      setTotalOutputTokens(prev => prev + outputTokens);
    }, []);
  
    const handleKeyRotation = useCallback((apiKeyIndex: number, modelName: string) => {
        const message = `API Key ${apiKeyIndex + 1} is busy. Trying next key for ${modelName}...`;
        setNotification(message);
        setTimeout(() => setNotification(null), 4000); 
    }, [setNotification]);

    const handleRateLimitWait = useCallback((attempt: number, maxRetries: number, modelName: GeminiModel) => {
        const message = `High demand on ${modelName}. Waiting 14s before retry ${attempt}/${maxRetries}...`;
        setNotification(message);
    }, [setNotification]);

    const processSceneResponse = useCallback((response: VnScene, options: { playerNameOverride?: string, delayCharacterAndDialogue?: boolean, userEntry?: DialogueEntry } = {}) => {
      const { playerNameOverride, delayCharacterAndDialogue = false, userEntry } = options;
      const finalPlayerName = playerNameOverride || playerName;
  
      if (!response || !response.scene) {
        console.error('Received invalid response from AI (scene data missing)');
        devLog('[DEBUG] Invalid response structure:', response); // Dev-only detailed logging
        setError("An error occurred. The AI's response was not valid.");
        return;
      }

      // [DEBUG] Log the AI's planning and draft (new chain-of-thought fields)
      if (response.scene_plan || response.loop_pre_check || response.first_draft) {
        devLog('%c🧠 AI REASONING CHAIN', 'background: #9b59b6; color: white; font-size: 14px; padding: 4px 8px; border-radius: 4px;');
        if (response.scene_plan) {
          devLog('%c📋 Scene Plan:', 'color: #9b59b6; font-weight: bold;', response.scene_plan);
        }
        if (response.loop_pre_check) {
          const hasBlocked = response.loop_pre_check.toLowerCase().includes('blocked');
          const loopStyle = hasBlocked 
            ? 'color: #e74c3c; font-weight: bold;' 
            : 'color: #2ecc71; font-weight: bold;';
          devLog('%c🔄 Loop Pre-Check:', loopStyle, response.loop_pre_check);
        }
        if (response.first_draft) {
          devLog('%c📝 First Draft:', 'color: #9b59b6; font-weight: bold;', response.first_draft);
        }
      }

      // [DEBUG] Log the AI's rule compliance report for ALL scene responses
      if (response.rule_compliance_report) {
        const report = response.rule_compliance_report;
        
        // Check for violations in the string fields
        const hasViolation = (field: string | undefined) => field?.toLowerCase().includes('violation');
        const hasConcern = (field: string | undefined) => field?.toLowerCase().includes('concern');
        const hasIssue = (field: string | undefined) => hasViolation(field) || hasConcern(field);
        
        const anyViolations = hasViolation(report.character_reference_verification) ||
                             hasViolation(report.trait_title_verification) ||
                             hasViolation(report.past_scene_references_verification) ||
                             hasViolation(report.cross_character_knowledge_verification) ||
                             hasViolation(report.natural_speech_verification) ||
                             hasViolation(report.ghost_character_name_verification) ||
                             hasViolation(report.mental_model_character_audit) ||
                             hasIssue(report.living_world_check) ||
                             hasViolation(report.player_action_puppetry_check) ||
                             hasViolation(report.dialogue_quality_check) ||
                             hasViolation(report.intimacy_commitment_check);

        const headerStyle = !anyViolations
          ? 'background: #2ecc71; color: white; font-size: 14px; padding: 4px 8px; border-radius: 4px;'
          : 'background: #e74c3c; color: white; font-size: 14px; padding: 4px 8px; border-radius: 4px;';
        const headerText = !anyViolations ? '✅ AI COMPLIANCE REPORT' : '❌ AI REPORTED VIOLATIONS';

        devLog(`%c${headerText}`, headerStyle);
        devLog('%c📛 Character References:', hasViolation(report.character_reference_verification) ? 'color: #e74c3c; font-weight: bold;' : 'color: #2ecc71;', 
          report.character_reference_verification || '(not provided)');
        devLog('%c🏷️ Trait Titles:', hasViolation(report.trait_title_verification) ? 'color: #e74c3c; font-weight: bold;' : 'color: #2ecc71;', 
          report.trait_title_verification || '(not provided)');
        devLog('%c📜 Past Scene Refs:', hasViolation(report.past_scene_references_verification) ? 'color: #e74c3c; font-weight: bold;' : 'color: #2ecc71;', 
          report.past_scene_references_verification || '(not provided)');
        devLog('%c🔒 Cross-Character Knowledge:', hasViolation(report.cross_character_knowledge_verification) ? 'color: #e74c3c; font-weight: bold;' : 'color: #2ecc71;', 
          report.cross_character_knowledge_verification || '(not provided)');
        devLog('%c🗣️ Natural Speech:', hasViolation(report.natural_speech_verification) ? 'color: #e74c3c; font-weight: bold;' : 'color: #2ecc71;', 
          report.natural_speech_verification || '(not provided)');
        devLog('%c👻 Ghost Character Names:', hasViolation(report.ghost_character_name_verification) ? 'color: #e74c3c; font-weight: bold;' : 'color: #2ecc71;', 
          report.ghost_character_name_verification || '(not provided)');
        devLog('%c🧠 Mental Model Audit:', hasViolation(report.mental_model_character_audit) ? 'color: #e74c3c; font-weight: bold;' : 'color: #2ecc71;', 
          report.mental_model_character_audit || '(not provided)');
        devLog('%c🌍 Living World Check:', hasIssue(report.living_world_check) ? 'color: #e74c3c; font-weight: bold;' : 'color: #2ecc71;', 
          report.living_world_check || '(not provided)');
        devLog('%c🎭 Puppetry Check:', hasViolation(report.player_action_puppetry_check) ? 'color: #e74c3c; font-weight: bold;' : 'color: #2ecc71;', 
          report.player_action_puppetry_check || '(not provided)');
        devLog('%c🛑 Player Correction Check:', hasViolation(report.player_correction_check) ? 'color: #e74c3c; font-weight: bold;' : 'color: #2ecc71;', 
          report.player_correction_check || '(not provided)');
        devLog('%c🎭 Dialogue Quality:', hasViolation(report.dialogue_quality_check) ? 'color: #e74c3c; font-weight: bold;' : 'color: #2ecc71;', 
          report.dialogue_quality_check || '(not provided)');
        devLog('%c💕 Affection Recency:', hasViolation(report.affection_recency_check) ? 'color: #e74c3c; font-weight: bold;' : 'color: #2ecc71;', 
          report.affection_recency_check || '(not provided)');
        devLog('%c🔥 Intimacy Commitment:', hasViolation(report.intimacy_commitment_check) ? 'color: #e74c3c; font-weight: bold;' : 'color: #f39c12;', 
          report.intimacy_commitment_check || '(not provided)');
        devLog('%c💑 NPC Couple Romance:', 'color: #e91e63;', 
          report.npc_couple_romance_check || '(not provided)');
      }
      
      // [DEV] Log DM thought summary for debugging AI reasoning
      if (response.thought_summary) {
        devLog('%c🧠 DM THOUGHT SUMMARY:', 'background: #9b59b6; color: white; font-size: 12px; padding: 2px 6px; border-radius: 3px;');
        devLog('%c' + response.thought_summary, 'color: #7f8c8d; font-style: italic; white-space: pre-wrap; padding-left: 8px;');
      }
  
      const { scene, present_characters, location_hint, affection_changes, end_of_segment, player_choices, player_choices_translated, question_asked_by } = response;
      
      const mainCharacterNamesSet = new Set(mainCharacters.map(mc => mc.name));
  
      if (question_asked_by) {
        setUnaskedQuestions(prev => {
          if (!prev) return null;
          const newQuestions = { ...prev };
          delete newQuestions[question_asked_by];
          return newQuestions;
        });
      }

      const replacePlayerName = (text: string | undefined): string | undefined => {
        if (!text) return text;
        return text.replace(/{PLAYER_NAME}/g, finalPlayerName);
      };
      
      let newBackgroundUrl = backgroundUrl; // Start with current
      // Track the location for THIS response (not stale React state)
      let locationForEntries = currentLocationId || backgroundUrl;
      
      if (location_hint) {
        const locationsForCurrentSegment = locationsBySegment[currentSegment as keyof typeof locationsBySegment] || [];
        const allPossibleLocations = Object.values(locationsBySegment).flat();
        
        let foundLocation = locationsForCurrentSegment.find(l => l.name.toLowerCase() === location_hint.toLowerCase().trim());
        if (!foundLocation) {
            foundLocation = allPossibleLocations.find(l => l.name.toLowerCase() === location_hint.toLowerCase().trim());
        }
    
        // Normalize the location hint for comparison
        const normalizedLocationId = location_hint.toLowerCase().replace(/[^a-z0-9_]/g, '').replace(/ /g, '_');
        
        // Use this normalized ID for entries (not stale React state)
        locationForEntries = normalizedLocationId;
        
        if (foundLocation) {
            // Stock location found - use it as fallback URL
            handleSetBackground(foundLocation.url);
            newBackgroundUrl = foundLocation.url;
            
            // [GENERATIVE IMAGES] Set currentLocationId to match the location_hint
            // useBackgroundResolver will check IndexedDB first (in case a generated image exists),
            // then fall back to the stock URL if not found
            setCurrentLocationId(normalizedLocationId);
        } else {
            // Not in stock locations - this is a generated-only location
            // Set currentLocationId - useBackgroundResolver will look it up in IndexedDB
            setCurrentLocationId(normalizedLocationId);
        }
        
        // [FIX] Update currentLocationDescription when changing to a previously generated location
        // This ensures the DM receives the correct visual context for the CURRENT location
        getGeneratedLocation(normalizedLocationId).then(generatedLoc => {
            if (generatedLoc?.prompt) {
                setCurrentLocationDescription(generatedLoc.prompt);
            }
        });
      }


      const newDialogueEntries: DialogueEntry[] = scene.map((line, index) => ({
        id: uuidv4(),
        speaker: line.speaker,
        dialogue: replacePlayerName(line.dialogue)!,
        dialogueTranslated: replacePlayerName(line.dialogueTranslated),
        motivation: replacePlayerName(line.motivation)!,
        motivationTranslated: replacePlayerName(line.motivationTranslated),
        expression: line.expression,
        spriteSet: (line as any).sprite_set || 'default',
        day: currentDay,
        segment: currentSegment,
        presentCharacters: present_characters,
        // [FIX] Use local locationForEntries, not stale React state (async update issue)
        location: locationForEntries,
        end_of_segment: (index === scene.length - 1) && end_of_segment ? true : undefined,
      }));

      // Process affection changes BEFORE adding to history so we can attach them to userEntry
      const processedAffectionChanges = affection_changes ? affection_changes.map(change => ({
        ...change,
        reason: replacePlayerName(change.reason)!,
        reasonTranslated: replacePlayerName(change.reasonTranslated),
      })) : undefined;

      // Attach affection changes to the player's entry (they result from the player's action)
      const userEntryWithAffection = userEntry && processedAffectionChanges && processedAffectionChanges.length > 0
        ? { ...userEntry, affectionChanges: processedAffectionChanges }
        : userEntry;

      const allNewEntries = [
        ...(userEntryWithAffection ? [userEntryWithAffection] : []), 
        ...newDialogueEntries
      ];
      setHistory(prev => [...prev, ...allNewEntries]);

      let finalChoices: string[] | null = null;
      let finalChoicesTranslated: string[] | null = null;
      if (player_choices && player_choices.length > 0) {
        finalChoices = [replacePlayerName(player_choices[0])!];
      }
      if (player_choices_translated && player_choices_translated.length > 0 && finalChoices) {
        finalChoicesTranslated = [replacePlayerName(player_choices_translated[0])!];
      }
      
      const mainCharAffectionChanges = processedAffectionChanges?.filter(change =>
          mainCharacterNamesSet.has(change.character)
      );
      
      // ▼▼▼ START OF REPLACEMENT LOGIC ▼▼▼
      // This logic replaces the original block to enforce daily caps
      if (mainCharAffectionChanges && mainCharAffectionChanges.length > 0) {
        // Define your caps
        const MAX_GAIN_PER_DAY = 2;
        const MAX_LOSS_PER_DAY = 1;
  
        // Create copies of current state to modify
        // We use the state variables directly from the hook's scope
        const newAffection = { ...affection };
        const newAffectionGainedToday = { ...affectionGainedToday };
        const newAffectionLostToday = { ...affectionLostToday };
  
        // Prepare new log entries
        const canonicalLogEntries: AffectionChange[] = [];
        const translatedLogEntries: AffectionChange[] = [];
  
        // Process each requested change against the caps
        for (const change of mainCharAffectionChanges) {
          const charName = change.character;
          const changeAmount = change.change;
  
          if (changeAmount > 0) {
            // --- Handle Positive Gain ---
            const currentGain = newAffectionGainedToday[charName] || 0;
            if (currentGain < MAX_GAIN_PER_DAY) {
              // Calculate how much gain is "left" in the budget
              const remainingGainBudget = MAX_GAIN_PER_DAY - currentGain;
              // Apply the change, but cap it at the remaining budget
              const effectiveChange = Math.min(remainingGainBudget, changeAmount);
  
              if (effectiveChange > 0) {
                // Apply the effective change
                newAffection[charName] = Math.max(-5, Math.min(10, (newAffection[charName] || 0) + effectiveChange));
                newAffectionGainedToday[charName] = currentGain + effectiveChange;
    
                // Log the change
                const logEntry = { ...change, change: effectiveChange };
                canonicalLogEntries.push(logEntry);
                if (change.reasonTranslated) {
                  // Create a new object for the translated log
                  translatedLogEntries.push({ character: charName, change: effectiveChange, reason: change.reasonTranslated });
                }
              } else {
                 devWarn(`[AffectionGuard] Effective change for ${charName} was 0. AI requested +${changeAmount}, but cap was already met.`);
              }
            } else {
              // Cap already met, log the AI's attempt
              devWarn(`[AffectionGuard] Blocked +${changeAmount} for ${charName}. Daily gain cap of +${MAX_GAIN_PER_DAY} already met.`);
            }
  
          } else if (changeAmount < 0) {
            // --- Handle Negative Loss ---
            const currentLoss = newAffectionLostToday[charName] || 0;
            if (currentLoss < MAX_LOSS_PER_DAY) {
              const remainingLossBudget = MAX_LOSS_PER_DAY - currentLoss;
              // Math.abs to make it positive for comparison, then make it negative again
              const effectiveChange = -Math.min(remainingLossBudget, Math.abs(changeAmount));
  
              if (effectiveChange < 0) {
                // Apply the effective change
                newAffection[charName] = Math.max(-5, Math.min(10, (newAffection[charName] || 0) + effectiveChange));
                newAffectionLostToday[charName] = currentLoss + Math.abs(effectiveChange);
    
                // Log the change
                const logEntry = { ...change, change: effectiveChange };
                canonicalLogEntries.push(logEntry);
                if (change.reasonTranslated) {
                  translatedLogEntries.push({ character: charName, change: effectiveChange, reason: change.reasonTranslated });
                }
              } else {
                devWarn(`[AffectionGuard] Effective change for ${charName} was 0. AI requested ${changeAmount}, but cap was already met.`);
              }
            } else {
              // Cap already met, log the AI's attempt
              devWarn(`[AffectionGuard] Blocked ${changeAmount} for ${charName}. Daily loss cap of -${MAX_LOSS_PER_DAY} already met.`);
            }
          }
        }
  
        // Now, update the React state once with the processed changes
        setAffection(newAffection);
        setAffectionGainedToday(newAffectionGainedToday);
        setAffectionLostToday(newAffectionLostToday);
        
        if (canonicalLogEntries.length > 0) {
          setAffectionLog(prev => ({ ...prev, [currentDay]: [...(prev[currentDay] || []), ...canonicalLogEntries] }));
        }
        if (translatedLogEntries.length > 0) {
          setAffectionLogTranslated(prev => ({ ...prev, [currentDay]: [...(prev?.[currentDay] || []), ...translatedLogEntries] }));
        }
      }
      // ▲▲▲ END OF REPLACEMENT LOGIC ▲▲▲
  
      const startDialogueAndCharacters = () => {
          devLog('[processSceneResponse] startDialogueAndCharacters called:', {
              hasPresentCharacters: !!present_characters,
              presentCharactersLength: present_characters?.length || 0,
              presentCharacters: present_characters,
              allCharacterNames: allCharacters.map(c => c.name)
          });
          
          if (present_characters && present_characters.length > 0) {
              // Normalize character names from AI response to match character config names
              // This handles cases where AI returns full names (e.g., "Nana Asahi") 
              // but config only has first name ("Nana")
              const normalizedNames = present_characters
                  .map(name => normalizeCharacterName(name, allCharacters))
                  .filter((name): name is string => name !== null);
              
              devLog('[processSceneResponse] Normalized present_characters:', {
                  original: present_characters,
                  normalized: normalizedNames,
                  allCharacterNames: allCharacters.map(c => c.name)
              });
              
              if (normalizedNames.length === 0 && present_characters.length > 0) {
                  console.error('[processSceneResponse] WARNING: All character names were filtered out during normalization!');
                  devLog('[DEBUG] Normalization details:', {
                      original: present_characters,
                      availableCharacters: allCharacters.map(c => ({ name: c.name, lastName: c.lastName }))
                  }); // Dev-only detailed logging
              }
              
              devLog('[processSceneResponse] Setting presentCharacterNames to:', normalizedNames);
              setPresentCharacterNames(normalizedNames);
          } else {
              devWarn('[processSceneResponse] No present_characters in response or empty array. Setting to empty.');
              // Explicitly set to empty array if no characters
              setPresentCharacterNames([]);
          }
          
          setTimeout(() => {
              if (newDialogueEntries.length > 0) {
                devLog("Adding processed scene to queue. Last line end flag:", newDialogueEntries[newDialogueEntries.length - 1].end_of_segment);
                setSceneQueue(prev => [...prev, ...newDialogueEntries]);
              }
          }, 50);
      };
  
      if (delayCharacterAndDialogue) setTimeout(startDialogueAndCharacters, 1200);
      else startDialogueAndCharacters();
  
      if (end_of_segment) {
        setPlayerChoices(null);
        setPlayerChoicesTranslated(null);
      } else {
        setPlayerChoices(finalChoices);
        setPlayerChoicesTranslated(finalChoicesTranslated);
      }
    }, [
        playerName, handleSetBackground, currentDay, currentSegment,
        mainCharacters, affection, setAffection, setAffectionGainedToday,
        setAffectionLostToday, setAffectionLog, setAffectionLogTranslated,
        setUnaskedQuestions, setPresentCharacterNames,
        setSceneQueue, setPlayerChoices, setPlayerChoicesTranslated, setError, backgroundUrl, setHistory,
        affectionGainedToday, affectionLostToday, allCharacters,
        // [GENERATIVE IMAGES] For setting location ID from location_hint
        setCurrentLocationId
    ]);
  
    useEffect(() => {
      if (sceneQueue.length > 0 && currentLine === null) {
        const nextLine = sceneQueue[0];
        
        if (nextLine.expression) {
            const character = allCharacters.find(c => isCharacterMatch(nextLine.speaker, c));
            if (character && presentCharacterNames.includes(character.name)) {
                setCharacterExpressions(prev => ({...prev, [character.name]: { set: nextLine.spriteSet || 'default', expression: nextLine.expression! }}));
            }
        }
        setCurrentLine(nextLine);
        setSceneQueue(prev => prev.slice(1));
      }
    }, [sceneQueue, currentLine, allCharacters, presentCharacterNames]); // <--- ADDED presentCharacterNames
  
    useEffect(() => {
      if (gameState === 'replaying' && replayScript.length > 0) {
        if (replayIndex >= replayScript.length) { setCurrentLine(null); return; }
        
        const nextLine = replayScript[replayIndex];
        
        // Always update the current line display (even when paused)
        setCurrentLine(nextLine);
        
        // Track current segment for UI highlighting
        if (nextLine.segment) {
            setReplayCurrentSegment(nextLine.segment);
        }
        
        // Only auto-advance history/visuals when NOT paused and NOT at segment end
        // (isAtSegmentEnd guard prevents race conditions from jump-to-end)
        if (!isReplayPaused && !isAtSegmentEnd) {
          // [REPLAY] Add the PREVIOUS line to history before showing the new one
          // This ensures the dialogue accumulates as it would in normal play
          // BUT only if the previous line is from the SAME segment (avoid pollution when jumping between segments)
          if (replayIndex > 0) {
            const previousLine = replayScript[replayIndex - 1];
            if (previousLine.segment === nextLine.segment) {
              setReplayHistory(prev => {
                // Avoid duplicates by checking if already added
                if (prev.length > 0 && prev[prev.length - 1].id === previousLine.id) {
                  return prev;
                }
                return [...prev, previousLine];
              });
            }
          }
          
          // [REPLAY] Update replay-specific visual state (NOT main game state)
          // ONLY update background when location CHANGES (same pattern as regular game)
          if (nextLine.location && nextLine.location !== currentReplayLocationRef.current) {
             currentReplayLocationRef.current = nextLine.location; // Track current location
             const isUrl = nextLine.location.includes('/') || nextLine.location.startsWith('http');
             if (isUrl) {
               // Stock location URL - use directly with crossfade
               setReplayBackgroundWithFade(nextLine.location);
             } else {
               // Generated location ID - need to look up the actual image
               const isImportedReplay = importedReplayData !== null;
               
               if (isImportedReplay) {
                 // Imported save: use in-memory blob URLs
                 const replayBlobUrl = replayGeneratedLocations.get(nextLine.location);
                 if (replayBlobUrl) {
                   setReplayBackgroundWithFade(replayBlobUrl);
                 } else {
                   // Fall back to stock location
                   const allPossibleLocations = Object.values(locationsBySegment).flat();
                   const found = allPossibleLocations.find(l => 
                     l.name.toLowerCase().replace(/[^a-z0-9]/g, '') === nextLine.location.toLowerCase().replace(/[^a-z0-9_]/g, '').replace(/_/g, '')
                   );
                   if (found) setReplayBackgroundWithFade(found.url);
                 }
               } else {
                 // Active game replay: check cache first to prevent flicker
                 const cachedBlobUrl = activeReplayBlobCacheRef.current.get(nextLine.location);
                 if (cachedBlobUrl) {
                   setReplayBackgroundWithFade(cachedBlobUrl);
                 } else {
                   // Not cached - look up from IndexedDB
                   const locationId = nextLine.location;
                   db.generatedLocations.get(locationId).then(entry => {
                     if (entry?.blob) {
                       const blobUrl = URL.createObjectURL(entry.blob);
                       activeReplayBlobUrlsRef.current.push(blobUrl); // Track for cleanup
                       activeReplayBlobCacheRef.current.set(locationId, blobUrl); // Cache it
                       setReplayBackgroundWithFade(blobUrl);
                     } else {
                       // Fall back to stock location
                       const allPossibleLocations = Object.values(locationsBySegment).flat();
                       const found = allPossibleLocations.find(l => 
                         l.name.toLowerCase().replace(/[^a-z0-9]/g, '') === locationId.toLowerCase().replace(/[^a-z0-9_]/g, '').replace(/_/g, '')
                       );
                       if (found) setReplayBackgroundWithFade(found.url);
                     }
                   });
                 }
               }
             }
          }
          setReplayPresentCharacters(nextLine.presentCharacters || []);
          if (nextLine.expression) {
              const set = nextLine.spriteSet || 'default';
              setReplayCharacterExpressions(prev => ({...prev, [nextLine.speaker]: { set, expression: nextLine.expression! }}));
          }
        }
      }
    }, [gameState, replayScript, replayIndex, isReplayPaused, isAtSegmentEnd, replayGeneratedLocations, locationsBySegment, importedReplayData, setReplayBackgroundWithFade]);
  
    const handlersRef = useRef<any>(null);

    const resetGameState = useCallback(async (name: string, lang: string, shouldIncrementCounter: boolean) => {
      setIsLoading(true); // Prevent autosave from overwriting the cleared state with stale data
      const isSameLanguage = lang.toLowerCase() === language.toLowerCase();
      appSettings.setLanguage(lang);
      // Reset UI translations to English so the translation step can properly translate
      // (prevents stale translated UI from previous non-English games)
      appSettings.setUiTranslations(englishStrings);

      await persistenceService.clearAllPipelineData();
      await persistenceService.clearAppState();

      let refreshedDaySegments = daySegments;
      let initialAffection = Object.fromEntries(allCharacters.map(c => [c.name, 1]));

      try {
        const config = await fetchGameConfig(STORY_NAME);

        const configMainChars = config.characters
          .filter(c => c.type === 'main')
          .map(c => ({
            ...c,
            baseProfile: 'Character profile will be generated during gameplay.',
          }));
        const configSideChars = config.characters
          .filter(c => c.type === 'side')
          .map(c => ({
            ...c,
            baseProfile: 'Character profile will be generated during gameplay.',
          }));

        const freshAllCharacters = [...configMainChars, ...configSideChars];
        initialAffection = Object.fromEntries(freshAllCharacters.map(c => [c.name, 1]));

        setMainCharacters(configMainChars);
        setSideCharacters(configSideChars);
        setOriginalMainCharacters(configMainChars.map(c => c.name));

        setWorldConfig(config.world);
        setLocationsBySegment(config.world.locationsBySegment);

        const updatedDaySegments = config.world.day_structure && config.world.day_structure.length > 0
          ? config.world.day_structure
          : defaultDaySegments;
        refreshedDaySegments = updatedDaySegments;
        setDaySegments(updatedDaySegments);
      } catch (e) {
        console.error("Critical Error: Failed to refresh game config during reset.", e);
        setError("Failed to initialize new game data. Please check your connection.");
      }

      setHistory([]);
      setFullHistory([]);
      setSceneQueue([]);
      setCurrentLine(null);
      setBackgroundUrl(defaultBackgroundUrl);
      setPlayerName(name);
      setAffection(initialAffection);
      setCurrentDay(1);
      setCurrentSegment(refreshedDaySegments[0] || defaultDaySegments[0]);
      setPromptsToday(0);
      setAffectionGainedToday({});
      setAffectionLostToday({});
      setEvolvingPersonas(null);
      setCharacterTraits(null); // [FIX] Clear traits on reset
      setCharacterLikesDislikes(null);
      setPlayerChoices(null);
      setPresentCharacterNames([]);
      setCharacterStageSlots(Array(6).fill(null));
      setCharacterExpressions({});
      setFullItinerary(null);
      setRelationshipDynamics(null);
      setRelationshipDynamicsStructured(null);
      setRelationshipDynamicsStructuredTranslated(undefined);
      setStoryArcs(null);
      setShowMotivations(false);
      setSubplots(null);
      setFactSheet({});
      setScheduledEvents([]);
      setTotalInputTokens(0);
      setTotalOutputTokens(0);
      setTotalRequests(0);
      setPsychologicalProfiles(null);
      setNovelChapters([]);
      setPlaythroughSummaries([]);
      setPlayerPsychoanalysisProse(null);
      setPlayerBackstory(null);
      setUnaskedQuestions(null);
      setCharacterChronicles({});
      setCharacterBiographies({});
      setOpeningSceneCache(null);
      setDayCalendar(null);
      setAvailableGenericSetNames(genericSpriteSets.map(s => s.name));
      setIsAwaitingNextSceneClick(false);
      setSceneMentalModel(null);
      setNovelChaptersTranslated(undefined);
      setPlayerPsychoanalysisProseTranslated(undefined);
      setPsychologicalProfilesTranslated(undefined);
      setFullItineraryTranslated(undefined);
      setPlayerChoicesTranslated(undefined);
      setRelationshipDynamicsTranslated(undefined);
      setAffectionLog({});
      setAffectionLogTranslated(undefined);
      setError(null);
      setEndOfDayStep(EndOfDayStep.NOT_STARTED);
      setIsPipelineResumePending(false);
      setNewGameStep(NewGameStep.NOT_STARTED);
      setIsSegmentAnalysisComplete(false);
      setSegmentTransitionStep(SegmentTransitionStep.NOT_STARTED);
      if (shouldIncrementCounter) {
        setPlaythroughCounter(prev => prev + 1);
      } else {
        setPlaythroughCounter(1);
      }
      setIsLoading(false); // Re-enable autosave with fresh state
    }, [language, appSettings.setLanguage, allCharacters, daySegments]);

    const revertToPreviousInputState = useCallback(() => {
        setIsLoading(false);
        setPlayerChoices(choicesBeforeApiCall);
        setChoicesTranslatedBeforeApiCall(choicesTranslatedBeforeApiCall);
        setPendingTextInput(lastTypedMessageBeforeError);
        setError(null);
    }, [choicesBeforeApiCall, choicesTranslatedBeforeApiCall, lastTypedMessageBeforeError]);

    const handleSendMessage = useCallback(async (message: string, translatedForDisplay?: string, overrideModel?: GeminiModel) => {
        if (isProcessingRef.current) { return; }
        if (!message.trim()) { return; }
        isProcessingRef.current = true;
    
        setError(null);
        setIsLoading(true);
        setPlayerChoices(null);
        setPlayerChoicesTranslated(null);
        setChoicesBeforeApiCall(playerChoices);
        setChoicesTranslatedBeforeApiCall(playerChoicesTranslated ?? null);
        setLastTypedMessageBeforeError(message);

        // [FIX] Two use cases:
        // 1. AI choice buttons: Send translated text (what's displayed). AI has multilingual workflow.
        //    - message = translated choice, translatedForDisplay = undefined
        //    - dialogue = translated, dialogueTranslated = undefined
        // 2. Continue/End Scene: Send English for backend prompt logic, but show translated in history.
        //    - message = 'Continue' (English), translatedForDisplay = 'Doorgaan' (translated)
        //    - dialogue = 'Continue', dialogueTranslated = 'Doorgaan'
        const userEntry: DialogueEntry = {
            id: uuidv4(),
            speaker: playerName,
            dialogue: message,
            dialogueTranslated: translatedForDisplay,
            expression: '', spriteSet: '', motivation: '',
            day: currentDay, segment: currentSegment,
            presentCharacters: presentCharacterNames,
            // [GENERATIVE IMAGES] Store location ID when available, fall back to URL for stock
            location: currentLocationId || backgroundUrl,
        };
        
        // Determine the next itinerary segment to pass to the DM for foreshadowing
        const currentSegmentIndex = daySegments.indexOf(currentSegment);
        let nextItinerarySegment: ItinerarySegment | null = null;

        if (currentSegmentIndex < daySegments.length - 1) {
            const nextSegmentName = daySegments[currentSegmentIndex + 1];
            const itineraryForToday = fullItinerary ? fullItinerary[currentDay - 1] : null;
            if (itineraryForToday) {
                nextItinerarySegment = itineraryForToday.segments.find(s => s.segment === nextSegmentName) || null;
            }
        }
        
        // Get the current state object
        const currentState = getCurrentState();
        
        // Update state with the new user entry for history
        const stateWithUserEntry = {
            ...currentState,
            history: [...history, userEntry],
            promptsToday: promptsToday + 1,
        };

        try {
            // NEW ARCHITECTURE: Pre-processing happens in the service
            // Pass state, storyName, and raw user input
            const result = await generateSceneFromState(
                stateWithUserEntry,
                STORY_NAME, // storyName
                message // raw user input
            );
            
            const response = result.scene;
            
            // [FIX] Restore any hydrated data to React state to prevent future data loss
            if (result.hydratedData) {
                if (result.hydratedData.characterTraits) {
                    devLog('[handleSendMessage] Restoring hydrated characterTraits to React state');
                    setCharacterTraits(result.hydratedData.characterTraits);
                }
                if (result.hydratedData.characterLikesDislikes) {
                    devLog('[handleSendMessage] Restoring hydrated characterLikesDislikes to React state');
                    setCharacterLikesDislikes(result.hydratedData.characterLikesDislikes);
                }
                if (result.hydratedData.evolvingPersonas) {
                    devLog('[handleSendMessage] Restoring hydrated evolvingPersonas to React state');
                    setEvolvingPersonas(result.hydratedData.evolvingPersonas);
                }
            }
            
            // [DM CACHE TRACKING] Store cache name for cleanup at EOD start
            if (result.dmCacheName) {
                await persistenceService.savePipelineData(persistenceService.DM_CACHE_NAME_KEY, result.dmCacheName);
            }
            
            // The response is the final, validated VnScene object
            // Note: Token counts will need to be added to the backend response later
            updateStats(0, 0); // Placeholder - backend should return token counts
            
            if (response.updated_scene_mental_model) { 
                setSceneMentalModel(response.updated_scene_mental_model); 
            }

            // [GENERATIVE IMAGES] Handle any generated background assets
            if (modelConfig.enableGenerativeImages && response.generated_background) {
                const assetResult = await handleGeneratedAssets(response, currentSegment, true);
                if (assetResult.success && assetResult.locationId) {
                    setCurrentLocationId(assetResult.locationId);
                    setCurrentLocationDescription(assetResult.prompt || undefined);
                    // Clear the transition effect to prevent flickering when switching to generated backgrounds
                    setPreviousBackgroundUrl(null);
                } else if (assetResult.error) {
                    devWarn('[handleSendMessage] Image generation issue:', assetResult.error);
                    // Don't block gameplay - just log the warning
                }
            }

            if (language !== 'English' && response.playerDialogueEnglish) {
                userEntry.dialogue = response.playerDialogueEnglish;
                userEntry.dialogueTranslated = message;
            }
            // NOTE: player_motivation removed - the AI should NOT generate motivations for the player character

            processSceneResponse(response, { userEntry });
            setPromptsToday(prev => prev + 1);

        } catch (error: any) {
            console.error('API/System Error during handleSendMessage:', error);
            revertToPreviousInputState();
            setError(error.message); // Set the error message
            setLastFailedApiCall({ func: () => handleSendMessage(message) }); // Set the retry function
            setIsUnrecoverableError(true); // This displays the ErrorOverlay
        } finally {
            setIsLoading(false);
            isProcessingRef.current = false;
        }
    }, [
        playerName, language, modelConfig, apiKeys, sceneMentalModel, novelChapters, fullHistory, affection, 
        currentDay, currentSegment, promptsToday, affectionGainedToday, affectionLostToday, psychologicalProfiles, 
        fullItinerary, relationshipDynamics, characterLikesDislikes, evolvingPersonas, characterTraits, storyArcs, factSheet, 
        characterChronicles, playerPsychoanalysisProse, playerBackstory, 
        updateStats, setSceneMentalModel, getCurrentState,
        processSceneResponse, setIsLoading, setPromptsToday,
        revertToPreviousInputState, setError, setLastFailedApiCall, setIsUnrecoverableError, 
        setPlayerChoices, setPlayerChoicesTranslated, backgroundUrl, presentCharacterNames, 
        playerChoices, playerChoicesTranslated, history, unaskedQuestions, locationsBySegment, daySegments,
        // [GENERATIVE IMAGES]
        setCurrentLocationId, setCurrentLocationDescription
    ]);
  
    const handleProceedAfterPipeline = useCallback(async () => {
        setIsPipelineCompleteAndReady(false);
    
        const cachedScene = openingSceneCache;
    
        devLog('[handleProceedAfterPipeline] Checking cached scene:', {
            hasCache: !!cachedScene,
            cacheType: cachedScene ? typeof cachedScene : 'null',
            cacheKeys: cachedScene ? Object.keys(cachedScene) : [],
            hasScene: cachedScene && 'scene' in cachedScene,
            hasOpeningScene: cachedScene && 'opening_scene' in cachedScene
        });
    
        if (cachedScene) {
            // Handle case where cachedScene might be the full TransitionDirectorResponse
            let sceneToProcess: VnScene;
            let fullDirectorResponse: any = null;
            if ('opening_scene' in cachedScene) {
                devLog('[handleProceedAfterPipeline] Extracting opening_scene from TransitionDirectorResponse');
                sceneToProcess = (cachedScene as any).opening_scene;
                fullDirectorResponse = cachedScene;
            } else if ('scene' in cachedScene) {
                devLog('[handleProceedAfterPipeline] Using cached scene directly');
                sceneToProcess = cachedScene as VnScene;
            } else {
                console.error('[handleProceedAfterPipeline] Invalid cached scene format');
                devLog('[DEBUG] Invalid cached scene:', cachedScene); // Dev-only detailed logging
                setError("Invalid scene data format. Please try again.");
                return;
            }
            
            if (!sceneToProcess || !sceneToProcess.scene) {
                console.error('[handleProceedAfterPipeline] Scene data is invalid');
                devLog('[DEBUG] Invalid scene data:', sceneToProcess); // Dev-only detailed logging
                setError("Scene data is missing or invalid. Please try again.");
                return;
            }
            
            devLog("Proceeding with cached opening scene.");
            setIsAwaitingSegmentTransition(false);
            setGameState('playing');
            setIsGameActive(true);

            // [GENERATIVE IMAGES] Handle generated background from TransitionDirectorResponse
            if (modelConfig.enableGenerativeImages && fullDirectorResponse?.generated_background) {
                const assetResult = await handleGeneratedAssets(fullDirectorResponse, currentSegment, true);
                if (assetResult.success && assetResult.locationId) {
                    setCurrentLocationId(assetResult.locationId);
                    setCurrentLocationDescription(assetResult.prompt || undefined);
                    // Clear the transition effect to prevent flickering when switching to generated backgrounds
                    setPreviousBackgroundUrl(null);
                }
            }

            // Clear stage state before processing new scene
            setPresentCharacterNames([]);
            setCharacterStageSlots(Array(6).fill(null));

            setTimeout(() => {
                // Process the scene (expressions will be set when each line starts)
                processSceneResponse(sceneToProcess, { playerNameOverride: playerName });
            }, 100);

            setOpeningSceneCache(null); // Use-once-and-clear
            setNewGameStep(NewGameStep.NOT_STARTED);
            setSegmentTransitionStep(SegmentTransitionStep.NOT_STARTED);
            return;
        }
    
        // Fallback for older saves or different pipeline states if needed
        const currentSegmentStep = await persistenceService.loadCurrentSegmentTransitionStep();
    
        if (currentSegmentStep === SegmentTransitionStep.STATE_UPDATE_COMPLETE) {
            devLog("Proceeding after Segment Transition pipeline completion (from DB).");
            const directorResult = await persistenceService.loadPipelineData<TransitionDirectorResponse>(persistenceService.SEGMENT_KEY_DIRECTOR_RESULT);
            if (!directorResult) {
                setError("Could not load director result to start next scene.");
                setIsAwaitingSegmentTransition(false);
                return;
            }
    
            const nextSegmentIndex = daySegments.indexOf(currentSegment) + 1;
            const nextSegment = daySegments[nextSegmentIndex];
    
            // [GENERATIVE IMAGES] Handle generated background from TransitionDirectorResponse
            if (modelConfig.enableGenerativeImages && directorResult.generated_background) {
                const assetResult = await handleGeneratedAssets(directorResult, nextSegment, true);
                if (assetResult.success && assetResult.locationId) {
                    setCurrentLocationId(assetResult.locationId);
                    setCurrentLocationDescription(assetResult.prompt || undefined);
                    // Clear the transition effect to prevent flickering when switching to generated backgrounds
                    setPreviousBackgroundUrl(null);
                }
            }
    
            setIsAwaitingSegmentTransition(false);
            setIsSegmentTransitioning(true);
            setTransitioningToSegment(nextSegment);
    
            await new Promise(resolve => setTimeout(resolve, 3000));
    
            setIsSegmentTransitioning(false);
            processSceneResponse(directorResult.opening_scene, { delayCharacterAndDialogue: true });
    
            await persistenceService.clearPipelineStepsAndErrors();
            setSegmentTransitionStep(SegmentTransitionStep.NOT_STARTED);
        } else {
            devWarn("handleProceedAfterPipeline called but no cached scene or completed segment transition was found.");
            // Potentially handle other states or show an error
        }
    }, [
        openingSceneCache, playerName, currentSegment, processSceneResponse, setError,
        setGameState, setIsGameActive, setOpeningSceneCache, setIsPipelineCompleteAndReady,
        setIsAwaitingSegmentTransition, setIsSegmentTransitioning,
        setTransitioningToSegment, setSegmentTransitionStep, setNewGameStep,
        setPresentCharacterNames, setCharacterStageSlots, daySegments, modelConfig,
        // [GENERATIVE IMAGES]
        setCurrentLocationId, setCurrentLocationDescription
    ]);
    const handleNameConfirm = useCallback(async (name: string, lang: string, overrideModel?: GeminiModel) => {
    if (isProcessingRef.current) { return; }
    isProcessingRef.current = true;
    newGameInFlightRef.current = true;
    
    // [IMPORT GUARD] Capture session ID - if import happens, setters become no-ops
    const mySessionId = pipelineSessionIdRef.current;
    const guard = <T extends (...args: any[]) => any>(fn: T): T => 
        ((...args: Parameters<T>) => pipelineSessionIdRef.current === mySessionId ? fn(...args) : undefined) as T;
    
    setIsGameActive(true);
    setIsLoading(true);
    setIsUnrecoverableError(false);
    setError(null);
    setLastFailedApiCall({ func: null });
    try {
        const deps = {
             modelConfig: modelConfigRef.current, apiKeys: apiKeysRef.current, language: lang, uiTranslations,
             mainCharacters: state.mainCharacters, sideCharacters: state.sideCharacters,
             newGameStep: state.newGameStep,
             getModelConfig: () => modelConfigRef.current,
             getApiKeys: () => apiKeysRef.current,
             shouldContinue: () => pipelineSessionIdRef.current === mySessionId,
             daySegments, // [FIX] Pass dynamic day structure for segment ordering
             worldConfig, // [FIX] Pass world config for segment ordering (persisted source of truth)
        };
        const setters = {
            setNotification: appSettings.setNotification, 
            setLanguage: appSettings.setLanguage, 
            setUiTranslations: appSettings.setUiTranslations,
            resetGameState, 
            setNewGameStep: guard(setNewGameStep), 
            setLoadingMessage: guard(setLoadingMessage), 
            updateStats, 
            setCharacterLikesDislikes: guard(setCharacterLikesDislikes), 
            setRelationshipDynamics: guard(setRelationshipDynamics),
            setStoryArcs: guard(setStoryArcs), 
            setFullItinerary: guard(setFullItinerary), 
            setFullItineraryTranslated: guard(setFullItineraryTranslated), 
            setSceneMentalModel: guard(setSceneMentalModel), 
            setGameState: guard(setGameState), 
            setIsGameActive: guard(setIsGameActive),
            processSceneResponse, 
            setNewGameErrors: guard(setNewGameErrors), 
            setError: guard(setError), 
            setIsUnrecoverableError: guard(setIsUnrecoverableError), 
            setLastFailedApiCall: guard(setLastFailedApiCall),
            setIsLoading: guard(setIsLoading), 
            setCharacterTraits: guard(setCharacterTraits),
            setIsPipelineCompleteAndReady: guard(setIsPipelineCompleteAndReady),
            setOpeningSceneCache: guard(setOpeningSceneCache),
            setDayCalendar: guard(setDayCalendar), // [NEW] For weather/calendar system
            setSideCharacters: guard(setSideCharacters), // [NEW] For foundation-created characters
            setAvailableGenericSetNames: guard(setAvailableGenericSetNames), // [NEW] For sprite pool management
            setRelationshipDynamicsStructured: guard(setRelationshipDynamicsStructured), // [NEW] For dynamics
            startCountdown: handlersRef.current?.startCountdown,
            waitForCountdown: handlersRef.current?.waitForCountdown,
        };
        await gameFlowService.handleNameConfirm(name, lang, deps as any, setters as any, overrideModel);
    } catch (e: any) {
      if (pipelineSessionIdRef.current === mySessionId) {
          setError(`Failed to start new game: ${e.message}`);
          setIsLoading(false);
          setLastFailedApiCall({ func: () => handleNameConfirm(name, lang) });
          setIsUnrecoverableError(true);
      }
    } finally {
      if (pipelineSessionIdRef.current === mySessionId) {
          newGameInFlightRef.current = false;
          isProcessingRef.current = false;
      }
    }
    }, [state.mainCharacters, state.sideCharacters, appSettings, uiTranslations, revertToPreviousInputState, resetGameState, processSceneResponse, updateStats, state.newGameStep, daySegments, worldConfig]);
    
    const handleDayEnd = useCallback(async (overrideModel?: GeminiModel) => {
        if (isProcessingRef.current) { return; }
        isProcessingRef.current = true;
        eodInFlightRef.current = true;
        
        // [SIMPLE FIX] Capture session ID. If import happens, we skip cleanup to avoid corrupting new session.
        const mySessionId = pipelineSessionIdRef.current;
        
        try {
            // [IMPORT GUARD] Wraps a setter to discard calls from stale sessions
            const guard = <T extends (...args: any[]) => any>(fn: T): T => 
                ((...args: Parameters<T>) => pipelineSessionIdRef.current === mySessionId ? fn(...args) : undefined) as T;
            
            const deps = {
                currentSegment: state.currentSegment, history: state.history, fullHistory: state.fullHistory, currentDay: state.currentDay, mainCharacters: state.mainCharacters,
                sideCharacters: state.sideCharacters, availableGenericSetNames: state.availableGenericSetNames, relationshipDynamics: state.relationshipDynamics,
                relationshipDynamicsStructured: state.relationshipDynamicsStructured,
                relationshipDynamicsStructuredTranslated: state.relationshipDynamicsStructuredTranslated,
                originalMainCharacters: state.originalMainCharacters, language: state.language, psychologicalProfiles: state.psychologicalProfiles,
                evolvingPersonas: state.evolvingPersonas, characterTraits: state.characterTraits, novelChapters: state.novelChapters, playerPsychoanalysisProse: state.playerPsychoanalysisProse,
                playerBackstory: state.playerBackstory, factSheet: state.factSheet, scheduledEvents: state.scheduledEvents, storyArcs: state.storyArcs,
                subplots: state.subplots, characterLikesDislikes: state.characterLikesDislikes, characterChronicles: state.characterChronicles,
                characterBiographies: state.characterBiographies,
                unaskedQuestions: state.unaskedQuestions, affection: state.affection, playerName: state.playerName, modelConfig: modelConfigRef.current, apiKeys: apiKeysRef.current,
                endOfDayStep: state.endOfDayStep,
                isPipelineResumePending: state.isPipelineResumePending,
                daySegments, // [FIX] Pass dynamic day structure for history reconstruction
                getModelConfig: () => modelConfigRef.current,
                getApiKeys: () => apiKeysRef.current,
                // [IMPORT ABORT] Checked after each step to stop old pipeline from continuing
                shouldContinue: () => pipelineSessionIdRef.current === mySessionId,
            };
            // [IMPORT GUARD] All setters are guarded - stale sessions can't overwrite imported state
            const setters = {
                setNotification: appSettings.setNotification, // Safe - just UI notification
                setIsAnalyzing: guard(setIsAnalyzing), 
                setAnalysisMessage: guard(setAnalysisMessage), 
                setEndOfDayStep: guard(setEndOfDayStep), 
                setEndOfDayErrors: guard(setEndOfDayErrors), 
                updateStats, handleKeyRotation, handleRateLimitWait, getCurrentState,
                setMainCharacters: guard(setMainCharacters), 
                setSideCharacters: guard(setSideCharacters), 
                setAvailableGenericSetNames: guard(setAvailableGenericSetNames), 
                setPsychologicalProfiles: guard(setPsychologicalProfiles), 
                setPsychologicalProfilesTranslated: guard(setPsychologicalProfilesTranslated),
                setRelationshipDynamics: guard(setRelationshipDynamics), 
                setRelationshipDynamicsTranslated: guard(setRelationshipDynamicsTranslated), 
                setRelationshipDynamicsStructured: guard(setRelationshipDynamicsStructured), 
                setRelationshipDynamicsStructuredTranslated: guard(setRelationshipDynamicsStructuredTranslated),
                setPlayerPsychoanalysisProse: guard(setPlayerPsychoanalysisProse), 
                setPlayerBackstory: guard(setPlayerBackstory), 
                setNovelChapters: guard(setNovelChapters), 
                setFactSheet: guard(setFactSheet),
                setScheduledEvents: guard(setScheduledEvents), 
                setEvolvingPersonas: guard(setEvolvingPersonas), 
                setCharacterTraits: guard(setCharacterTraits), 
                setCharacterLikesDislikes: guard(setCharacterLikesDislikes), 
                setStoryArcs: guard(setStoryArcs), 
                setSubplots: guard(setSubplots), 
                setFullItinerary: guard(setFullItinerary), 
                setNovelChaptersTranslated: guard(setNovelChaptersTranslated),
                setPlayerPsychoanalysisProseTranslated: guard(setPlayerPsychoanalysisProseTranslated), 
                setFullItineraryTranslated: guard(setFullItineraryTranslated), 
                setSceneMentalModel: guard(setSceneMentalModel), 
                setFullHistory: guard(setFullHistory), 
                setAffection: guard(setAffection), 
                setAffectionGainedToday: guard(setAffectionGainedToday),
                setAffectionLostToday: guard(setAffectionLostToday), 
                setUnaskedQuestions: guard(setUnaskedQuestions), 
                setCharacterChronicles: guard(setCharacterChronicles), 
                setCharacterBiographies: guard(setCharacterBiographies), 
                setError: guard(setError), 
                setIsUnrecoverableError: guard(setIsUnrecoverableError), 
                setLastFailedApiCall: guard(setLastFailedApiCall),
                setOpeningSceneCache: guard(setOpeningSceneCache),
                setDayCalendar: guard(setDayCalendar), // [NEW] For weather/calendar system
                setIsPipelineCompleteAndReady: guard(setIsPipelineCompleteAndReady),
                setIsGameCompleted: guard(setIsGameCompleted),
                setPlaythroughSummaries: guard(setPlaythroughSummaries),
                setPlaythroughCounter: guard(setPlaythroughCounter),
                setIsPipelineResumePending: guard(setIsPipelineResumePending),
                startCountdown: handlersRef.current?.startCountdown,
                waitForCountdown: handlersRef.current?.waitForCountdown,
            };
            await gameFlowService.handleDayEnd(deps as any, setters as any, overrideModel);
        } catch (e: any) {
            if (pipelineSessionIdRef.current === mySessionId) {
                setError(`Critical error during day end: ${e.message}`);
                setIsAnalyzing(false);
                setLastFailedApiCall({ func: () => handleDayEnd() });
                setIsUnrecoverableError(true);
            }
        } finally {
            // [SIMPLE FIX] Only clear refs if session wasn't invalidated by import
            if (pipelineSessionIdRef.current === mySessionId) {
                eodInFlightRef.current = false;
                isProcessingRef.current = false;
            }
        }
    }, [state, appSettings, getCurrentState, updateStats, handleKeyRotation, handleRateLimitWait]);
    
    const handleSegmentTransition = useCallback(async (overrideModel?: GeminiModel) => {
        if (isProcessingRef.current) {
            devWarn("handleSegmentTransition: Process already running.");
            return;
        }
        isProcessingRef.current = true;
        segmentInFlightRef.current = true;
        
        // [IMPORT GUARD] Capture session ID - if import happens, setters become no-ops
        const mySessionId = pipelineSessionIdRef.current;
        const guard = <T extends (...args: any[]) => any>(fn: T): T => 
            ((...args: Parameters<T>) => pipelineSessionIdRef.current === mySessionId ? fn(...args) : undefined) as T;
        
        try {
            setIsAwaitingSegmentTransition(true);

            const deps = {
                currentSegment: state.currentSegment, history: state.history, fullHistory: state.fullHistory,
                currentDay: state.currentDay, mainCharacters: state.mainCharacters, sideCharacters: state.sideCharacters,
                relationshipDynamics: state.relationshipDynamics, language: state.language,
                psychologicalProfiles: state.psychologicalProfiles, evolvingPersonas: state.evolvingPersonas,
                novelChapters: state.novelChapters, playerPsychoanalysisProse: state.playerPsychoanalysisProse,
                playerBackstory: state.playerBackstory, factSheet: state.factSheet,
                characterLikesDislikes: state.characterLikesDislikes, characterChronicles: state.characterChronicles,
                affection: state.affection, playerName: state.playerName, modelConfig: modelConfigRef.current,
                apiKeys: apiKeysRef.current, fullItinerary: state.fullItinerary,
                daySegments, // [FIX] Pass dynamic day structure for segment transitions
                dayCalendar: state.dayCalendar, // [FIX] Pass calendar/weather for TD
                getModelConfig: () => modelConfigRef.current,
                getApiKeys: () => apiKeysRef.current,
                getCurrentState,
                segmentTransitionStep: state.segmentTransitionStep,
                shouldContinue: () => pipelineSessionIdRef.current === mySessionId,
            };

            const setters = {
                setNotification: appSettings.setNotification,
                setIsAwaitingSegmentTransition: guard(setIsAwaitingSegmentTransition),
                setSegmentTransitionStep: guard(setSegmentTransitionStep),
                setSegmentTransitionErrors: guard(setSegmentTransitionErrors),
                updateStats, handleKeyRotation, handleRateLimitWait,
                setRelationshipDynamics: guard(setRelationshipDynamics),
                setRelationshipDynamicsTranslated: guard(setRelationshipDynamicsTranslated),
                setRelationshipDynamicsStructured: guard(setRelationshipDynamicsStructured),
                setRelationshipDynamicsStructuredTranslated: guard(setRelationshipDynamicsStructuredTranslated),
                setPsychologicalProfiles: guard(setPsychologicalProfiles),
                setPsychologicalProfilesTranslated: guard(setPsychologicalProfilesTranslated),
                setUnaskedQuestions: guard(setUnaskedQuestions),
                setCharacterChronicles: guard(setCharacterChronicles),
                setFullHistory: guard(setFullHistory),
                setCurrentSegment: guard(setCurrentSegment),
                setHistory: guard(setHistory),
                setPromptsToday: guard(setPromptsToday),
                setSceneMentalModel: guard(setSceneMentalModel),
                setFullItinerary: guard(setFullItinerary),
                setIsSegmentTransitioning: guard(setIsSegmentTransitioning),
                setTransitioningToSegment: guard(setTransitioningToSegment),
                processSceneResponse,
                setError: guard(setError),
                setIsUnrecoverableError: guard(setIsUnrecoverableError),
                setLastFailedApiCall: guard(setLastFailedApiCall),
                setIsAwaitingNextSceneClick: guard(setIsAwaitingNextSceneClick),
                setIsPipelineCompleteAndReady: guard(setIsPipelineCompleteAndReady),
                setOpeningSceneCache: guard(setOpeningSceneCache),
                setDayCalendar: guard(setDayCalendar), // [NEW] For weather/calendar system (on segment transition, calendar may update for next day)
                setCharacterTraits: guard(setCharacterTraits),
                startCountdown: handlersRef.current?.startCountdown,
                waitForCountdown: handlersRef.current?.waitForCountdown,
            };

            await gameFlowService.handleSegmentTransition(deps as any, setters as any, overrideModel);
        } catch (e: any) {
            if (pipelineSessionIdRef.current === mySessionId) {
                const errorMessage = `A critical error occurred starting the transition: ${e.message}`;
                console.error(errorMessage);
                setError(errorMessage);
                setIsAwaitingSegmentTransition(false);
                if (handlersRef.current?.handleSegmentTransition) {
                     setLastFailedApiCall({ func: handlersRef.current.handleSegmentTransition });
                }
                setIsUnrecoverableError(true);
            }
        } finally {
            if (pipelineSessionIdRef.current === mySessionId) {
                segmentInFlightRef.current = false;
                isProcessingRef.current = false;
            } else {
                devDebug("[SegmentTransition] Skipping ref cleanup - session was invalidated by import");
            }
        }
    }, [
        state, appSettings, getCurrentState, updateStats, handleKeyRotation,
        handleRateLimitWait, processSceneResponse
    ]);

    const handleStartNextDayTransition = useCallback(async () => {
        if (isProcessingRef.current) {
          devWarn("handleStartNextDayTransition: Process already running.");
          return;
        }

        const finalStepReached = await persistenceService.loadCurrentEndOfDayStep() === EndOfDayStep.FINAL_STATE_SAVE_COMPLETE;
        const errorsExist = Object.keys(await persistenceService.loadEodErrors() || {}).length > 0;
        if (!finalStepReached || errorsExist) {
            appSettings.setNotification("End-of-day sequence is not complete or has errors.");
             setTimeout(() => appSettings.setNotification(null), 3000);
            return;
        }

        isProcessingRef.current = true;
        setIsAnalyzing(false);
        setError(null);
        setIsUnrecoverableError(false);

        const dayThatJustEnded = state.currentDay;
        setIsDayTransitioning(true);
        setTransitioningToDay(dayThatJustEnded + 1);

        try {
            const openingSceneData = await persistenceService.loadPipelineData<TransitionDirectorResponse>(EOD_KEY_OPENING_SCENE_RAW);
            if (!openingSceneData || !openingSceneData.opening_scene) {
                throw new Error("Could not load opening scene data to start the next day.");
            }

            // [GENERATIVE IMAGES] Handle generated background from TransitionDirectorResponse
            if (modelConfig.enableGenerativeImages && openingSceneData.generated_background) {
                const assetResult = await handleGeneratedAssets(openingSceneData, daySegments[0], true);
                if (assetResult.success && assetResult.locationId) {
                    setCurrentLocationId(assetResult.locationId);
                    setCurrentLocationDescription(assetResult.prompt || undefined);
                    // Clear the transition effect to prevent flickering when switching to generated backgrounds
                    setPreviousBackgroundUrl(null);
                }
            }

            setHistory([]);
            setPromptsToday(0);
            setAffectionGainedToday({});
            setAffectionLostToday({});

            // [FIX] Reload character context from pipelineData to ensure React state stays in sync
            const traitsFromPipeline = await persistenceService.loadPipelineData<CharacterTraits | null>(EOD_KEY_CHARACTER_TRAITS);
            if (traitsFromPipeline) setCharacterTraits(traitsFromPipeline);
            const likesFromPipeline = await persistenceService.loadPipelineData<CharacterLikesDislikes | null>(EOD_KEY_FINAL_LIKES_DISLIKES);
            if (likesFromPipeline) setCharacterLikesDislikes(likesFromPipeline);
            const personasFromPipeline = await persistenceService.loadPipelineData<{ [key: string]: string } | null>(EOD_KEY_FINAL_EVOLVING_PERSONAS);
            if (personasFromPipeline) setEvolvingPersonas(personasFromPipeline);

            // Explicitly clear the stage so the new day starts fresh.
            // This prevents the "morphing" glitch from the previous day's layout.
            setPresentCharacterNames([]);
            setCharacterStageSlots(Array(6).fill(null));

            await new Promise(resolve => setTimeout(resolve, 6000));

            setCurrentDay(prev => prev + 1);
            
            // Increment playthrough counter at the end of each 14-day cycle (Day 14, 28, etc.)
            // We use dayThatJustEnded because if Day 14 just ended, we are starting Day 15 (Cycle 2).
            if (dayThatJustEnded > 0 && dayThatJustEnded % 14 === 0) {
                devLog(`Completing cycle at end of Day ${dayThatJustEnded}. Incrementing playthrough counter.`);
                setPlaythroughCounter(prev => prev + 1);
            }

            setCurrentSegment(daySegments[0]);

            setIsDayTransitioning(false);
            if (handlersRef.current?.processSceneResponse) {
                 handlersRef.current.processSceneResponse(openingSceneData.opening_scene, { delayCharacterAndDialogue: true });
            } else { console.error("processSceneResponse handler not available yet."); }

            await persistenceService.clearPipelineStepsAndErrors();
            await persistenceService.saveCurrentEndOfDayStep(EndOfDayStep.NOT_STARTED);
            // Clear relationship keys modified bucket for fresh start
            await persistenceService.savePipelineData(SEGMENT_KEY_RELATIONSHIP_KEYS_MODIFIED_TODAY, null);
            setEndOfDayStep(EndOfDayStep.NOT_STARTED);
            setIsAwaitingNextSceneClick(false);

        } catch (error: any) {
            console.error('Error starting next day transition:', error);
            setError(error.message);
            if (handlersRef.current?.handleStartNextDayTransition) {
                 setLastFailedApiCall({ func: handlersRef.current.handleStartNextDayTransition });
            } else { console.error("Cannot set retry handler"); }
            setIsUnrecoverableError(true);
            setIsDayTransitioning(false);
            setIsAnalyzing(false);
        } finally {
            isProcessingRef.current = false;
        }

    }, [
        state.currentDay, setIsAnalyzing, setError, setIsUnrecoverableError,
        setIsDayTransitioning, setTransitioningToDay, setCurrentDay,
        setCurrentSegment, setEndOfDayStep, 
        setIsAwaitingNextSceneClick, setLastFailedApiCall, setIsGameCompleted,
        setHistory, setPromptsToday, setAffectionGainedToday, setAffectionLostToday,
        appSettings.setNotification, daySegments, modelConfig,
        // [GENERATIVE IMAGES]
        setCurrentLocationId, setCurrentLocationDescription,
        // [FIX] Character context setters for day transition sync
        setCharacterTraits, setCharacterLikesDislikes, setEvolvingPersonas
    ]);
  
    const handleStartNewGame = useCallback(async () => {
      if (hasSaveData || isGameActive) {
        setShowConfirmModal(true);
      } else {
        await persistenceService.clearAllPipelineData();
        // [GENERATIVE IMAGES] Clear cached backgrounds for fresh playthrough
        await clearGeneratedLocations();
        setCurrentLocationId(undefined);
        setCurrentLocationDescription(undefined);
        setNewGameStep(NewGameStep.NOT_STARTED);
        setGameState('name_input');
      }
    }, [hasSaveData, isGameActive]);

    // Load persisted new game errors on mount so resume check can block auto-dispatch when errors exist
    useEffect(() => {
        (async () => {
            const persistedErrors = await persistenceService.loadNewGameErrors();
            if (persistedErrors) {
                setNewGameErrors(persistedErrors);
            }
        })();
    }, [setNewGameErrors]);

    const handleConfirmNewGame = useCallback(async () => {
      setShowConfirmModal(false);
      await persistenceService.clearAllPipelineData();
      // [GENERATIVE IMAGES] Clear cached backgrounds for fresh playthrough
      await clearGeneratedLocations();
      setCurrentLocationId(undefined);
      setCurrentLocationDescription(undefined);
      setNewGameStep(NewGameStep.NOT_STARTED);
      setGameState('name_input');
      setIsGameActive(false);
    }, []);

    const handleContinueGame = useCallback(async () => {
        // [REPLAY] No state restoration needed - replay now uses completely separate state
        // and never touches the main game's React state or IndexedDB
        
        const loadedNewGameStep = await persistenceService.loadCurrentNewGameStep();
        const loadedSegmentStep = await persistenceService.loadCurrentSegmentTransitionStep();
        const loadedEodStep = await persistenceService.loadCurrentEndOfDayStep();
        const loadedNewGameErrors = await persistenceService.loadNewGameErrors();
        const hasNewGameError = loadedNewGameErrors && Object.keys(loadedNewGameErrors).length > 0;
  
        if (loadedEodStep > EndOfDayStep.NOT_STARTED) {
            devLog(`Resuming End of Day pipeline at step: ${EndOfDayStep[loadedEodStep]}`);
            setGameState('playing');
            setIsGameActive(true);
            setIsAnalyzing(true); 
            // If an EOD call is already in-flight this session, just restore UI
            if (eodInFlightRef.current || isProcessingRef.current) {
                return;
            }
            if (handlersRef.current) {
                setTimeout(() => handlersRef.current.handleDayEnd(), 100);
            }
            return;
        }
  
        if (loadedSegmentStep > SegmentTransitionStep.NOT_STARTED) {
            devLog(`Resuming Segment Transition pipeline at step: ${SegmentTransitionStep[loadedSegmentStep]}`);
            setGameState('playing');
            setIsGameActive(true);
            setIsAwaitingSegmentTransition(true);
            if (segmentInFlightRef.current || isProcessingRef.current) {
                return;
            }
            if (handlersRef.current) {
                setTimeout(() => handlersRef.current.handleSegmentTransition(), 100);
            }
            return;
        }
  
        if (loadedNewGameStep > NewGameStep.NOT_STARTED) {
            devLog(`Resuming New Game pipeline at step: ${NewGameStep[loadedNewGameStep]}`);
            setNewGameStep(loadedNewGameStep);
            setGameState('name_input'); 
            setIsGameActive(true);
            setIsLoading(true); // show pipeline UI immediately
            setIsAnalyzing(false);
            setIsAwaitingSegmentTransition(false);
            if (hasNewGameError) {
                // Show pipeline UI with error; do not auto-dispatch
                setIsLoading(false);
                return;
            }
            // If a new-game call is already in-flight this session, just restore UI
            if (newGameInFlightRef.current || isProcessingRef.current) {
                return;
            }
            if (handlersRef.current) {
                setTimeout(() => handlersRef.current.handleNameConfirm(playerName, language), 50);
            }
            return;
        }
  
        setGameState('playing');
        setIsGameActive(true);
  
      }, [playerName, language, isLoading]);
    
    const handleBackToMenu = useCallback(() => { 
      // Do not clear in-flight pipeline; just switch view
      setGameState('menu'); 
      setIsAnalyzing(false); 
      setIsAwaitingSegmentTransition(false);
    }, [setGameState, setIsAnalyzing, setIsAwaitingSegmentTransition]);
  
    const handleSaveApiKeys = useCallback((keys: { [p: string]: string }) => { appSettings.handleSaveApiKeys(keys); setIsApiKeyModalVisible(false); }, [appSettings]);
    const handleImportKeys = useCallback((key: string, provider: any) => { appSettings.handleImportKeys(key, provider); }, [appSettings]);
    const handleSaveModelSelection = useCallback((selection: ModelSelection) => { appSettings.handleSaveModelSelection(selection); setIsModelSelectionVisible(false); }, [appSettings]);
  
    const isEmptyTraits = (traits: any) => {
      if (!traits || typeof traits !== 'object') return true;
      return Object.values(traits).every((v: any) => !Array.isArray(v) || v.length === 0);
    };

    const handleExportState = useCallback(async () => {
      const stateToSave = getCurrentState();

      // --- SECURITY FIX: STRIP API KEYS FROM EXPORT ---
      // API keys should only exist in localStorage, never in exported save files.
      // This prevents accidental key sharing when save files are distributed.
      stateToSave.apiKeys = {};
      // -------------------------------------------------

      // =========================================================================
      // [ARCHITECTURE FIX] DEXIE-FIRST EXPORT
      // =========================================================================
      // For critical character context, ALWAYS use Dexie as source of truth.
      // This ensures exports never have stale/null data.
      // =========================================================================
      const [
        dexieTraits,
        dexieLikes,
        dexiePersonas,
        dexieStructuredDynamics,
      ] = await Promise.all([
        persistenceService.loadPipelineData<CharacterTraits>(EOD_KEY_CHARACTER_TRAITS)
          .then(r => r ?? persistenceService.loadPipelineData<CharacterTraits>(persistenceService.NEW_GAME_KEY_INITIAL_TRAITS)),
        persistenceService.loadPipelineData<CharacterLikesDislikes>(EOD_KEY_FINAL_LIKES_DISLIKES),
        persistenceService.loadPipelineData<{ [key: string]: string }>(EOD_KEY_FINAL_EVOLVING_PERSONAS),
        persistenceService.loadPipelineData<any>(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED)
          .then(r => r ?? persistenceService.loadPipelineData<any>(persistenceService.NEW_GAME_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED)),
      ]);
      
      // Use Dexie data for critical fields (Dexie wins!)
      if (dexieTraits) stateToSave.characterTraits = dexieTraits;
      if (dexieLikes) stateToSave.characterLikesDislikes = dexieLikes;
      if (dexiePersonas) stateToSave.evolvingPersonas = dexiePersonas;
      if (dexieStructuredDynamics) stateToSave.relationshipDynamicsStructured = dexieStructuredDynamics;

      // Fallback to foundation for traits/likes if still missing
      if (!stateToSave.characterTraits || isEmptyTraits(stateToSave.characterTraits) || !stateToSave.characterLikesDislikes) {
        const foundation = await persistenceService.loadPipelineData<any>(persistenceService.NEW_GAME_KEY_FOUNDATION);
        if (foundation) {
          if (!stateToSave.characterTraits || isEmptyTraits(stateToSave.characterTraits)) {
            stateToSave.characterTraits = foundation.initial_traits;
          }
          if (!stateToSave.characterLikesDislikes && foundation.authentic_likes_dislikes) {
            stateToSave.characterLikesDislikes = foundation.authentic_likes_dislikes;
          }
          if (!stateToSave.storyArcs || stateToSave.storyArcs.length === 0) {
            stateToSave.storyArcs = foundation.story_arcs || [];
          }
        }
      }

      // Hydrate itinerary if missing (use Day One itinerary cache)
      if (!stateToSave.fullItinerary || stateToSave.fullItinerary.length === 0) {
        const cachedItinerary = await persistenceService.loadPipelineData<DailyItinerary>(persistenceService.NEW_GAME_KEY_DAY_ONE_ITINERARY);
        if (cachedItinerary) {
          stateToSave.fullItinerary = [cachedItinerary];
        }
      }
      if (!stateToSave.fullItineraryTranslated || stateToSave.fullItineraryTranslated.length === 0) {
        const cachedItineraryTranslated = await persistenceService.loadPipelineData<DailyItinerary>(persistenceService.NEW_GAME_KEY_DAY_ONE_ITINERARY_TRANSLATED);
        if (cachedItineraryTranslated) {
          stateToSave.fullItineraryTranslated = [cachedItineraryTranslated];
        }
      }
      // Hydrate relationship dynamics prose from structured if missing
      if (!stateToSave.relationshipDynamics) {
        const structured = stateToSave.relationshipDynamicsStructured
          || (await persistenceService.loadPipelineData(persistenceService.NEW_GAME_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED))
          || (await persistenceService.loadPipelineData(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED));
        const prose = structuredDynamicsToProseLocal(structured) || null;
        if (prose) {
          stateToSave.relationshipDynamics = prose;
        } else {
          const cachedProse = await persistenceService.loadPipelineData<string | null>(persistenceService.EOD_KEY_RELATIONSHIP_DYNAMICS as any);
          if (cachedProse) stateToSave.relationshipDynamics = cachedProse;
        }
      }
      if (stateToSave.relationshipDynamicsStructuredTranslated === undefined) {
        stateToSave.relationshipDynamicsStructuredTranslated = await persistenceService.loadPipelineData(
          EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED_TRANSLATED
        );
      }
      // Hydrate dayCalendar from pipeline cache if missing in memory
      if (!stateToSave.dayCalendar) {
        stateToSave.dayCalendar =
          (await persistenceService.loadPipelineData(persistenceService.EOD_KEY_DAY_CALENDAR)) ??
          (await persistenceService.loadPipelineData(persistenceService.NEW_GAME_KEY_DAY_CALENDAR));
      }
      
      const pipelineData = await db.pipelineData.toArray();
      const stepData = await db.stepData.toArray();
      const errorData = await db.errorData.toArray();

      // [GENERATIVE IMAGES] Export generated locations as assets
      const hydratedSave = await exportHydratedSave(stateToSave);

      const fullSaveFile = {
        // Use hydrated format for game state and assets
        gameState: hydratedSave.gameState,
        assets: hydratedSave.assets,
        version: hydratedSave.version,
        // Also include pipeline state for resumable pipelines
        pipelineState: {
          pipelineData,
          stepData,
          errorData,
        }
      };
      
      const blob = new Blob([JSON.stringify(fullSaveFile, null, 2)], {type: 'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `seiyohigh_save_day${currentDay}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, [getCurrentState, currentDay]);

    const handleExportStory = useCallback(() => {
      if (!novelChapters || novelChapters.length === 0) {
        setNotification("No story chapters generated yet to export.");
        setTimeout(() => setNotification(null), 3000);
        return;
      }
  
      const storyContent = novelChapters
        .map((chapter, index) => {
          const chapterText = chapter.proseChapter || `[Content missing for Day ${index + 1}]`;
          return `## Day ${index + 1}\n\n${chapterText}`;
        })
        .join('\n\n---\n\n');
  
      const filename = `14_days_story_playthrough_${playthroughCounter}.txt`;
  
      const blob = new Blob([storyContent], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    }, [novelChapters, playthroughCounter, setNotification]);
  
    const handleImportState = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // --- IMPORT SESSION INVALIDATION ---
          // Increment session ID to invalidate any in-flight pipeline runs.
          // Old pipelines' guarded setters will become no-ops, preventing stale data writes.
          pipelineSessionIdRef.current++;
          
          // Freeze auto-resume/pipeline effects while we swap in a different save.
          isProcessingRef.current = true;
          
          // Reset in-flight refs - old pipelines will skip cleanup since session changed.
          eodInFlightRef.current = false;
          segmentInFlightRef.current = false;
          newGameInFlightRef.current = false;

          // Clear all pre-existing UI error states *before* processing the new file.
          // This prevents a previous session's error from blocking
          // the auto-resume of a newly imported save file.
          setError(null);
          setNewGameErrors({});
          setSegmentTransitionErrors({});
          setEndOfDayErrors({});
          setIsAnalyzing(false);
          setIsAwaitingSegmentTransition(false);
          setIsDirectorLoading(false);
          setIsAnalystLoading(false);
          setIsPipelineResumePending(false);
          // --- END OF FIX ---

          const parsedJson = JSON.parse(e.target?.result as string);
          
          let importedAppState: AppState;
          let pipelineState: {
              pipelineData: DbPipelineData[];
              stepData: DbStepData[];
              errorData: DbErrorData[];
          } | null = null;

          // [GENERATIVE IMAGES] Handle hydrated save files with assets
          if (isHydratedSave(parsedJson)) {
              devLog("Importing hydrated save file with generated assets...");
              // importHydratedSave handles both asset restoration and state migration
              importedAppState = await importHydratedSave(parsedJson);
              pipelineState = (parsedJson as any).pipelineState || null;
          } else if (parsedJson.appState && parsedJson.pipelineState) {
              devLog("Importing new save file format with pipeline state.");
              importedAppState = parsedJson.appState;
              pipelineState = parsedJson.pipelineState;
          } else {
              devLog("Importing old save file format. Pipeline state will be reset.");
              importedAppState = parsedJson;
          }

          const migratedState = (isHydratedSave(parsedJson) ? importedAppState : migrateSaveFile(importedAppState)) as AppState;

          // --- SECURITY FIX: PRESERVE CURRENT SESSION'S API KEYS ---
          // Never import API keys from save files. Always use current session's keys.
          // Read directly from localStorage to handle async React state updates
          // (e.g., HF demo flow where handleSaveApiKeys is called right before import).
          try {
            const storedSettings = localStorage.getItem('vn_app_settings_v1');
            if (storedSettings) {
              const parsed = JSON.parse(storedSettings);
              if (parsed.apiKeys) {
                migratedState.apiKeys = parsed.apiKeys;
              } else {
                migratedState.apiKeys = {};
              }
            } else {
              migratedState.apiKeys = {};
            }
          } catch {
            migratedState.apiKeys = {};
          }
          // ----------------------------------------------------------

          // --- SPRITE SYNC FIX: MERGE FRESH ASSETS FROM CONFIG ---
          // Fetch current game config and merge fresh sprite URLs into imported characters.
          // This ensures imported saves (including HuggingFace demo) always use current assets.
          try {
            const config = await fetchGameConfig(STORY_NAME);
            
            // Merge fresh spriteSets and image URLs into main characters
            if (migratedState.mainCharacters?.length > 0) {
              migratedState.mainCharacters = migratedState.mainCharacters.map(loadedChar => {
                const configChar = config.characters.find(c => c.name === loadedChar.name);
                if (configChar) {
                  return {
                    ...loadedChar,
                    spriteSets: configChar.spriteSets,
                    image: configChar.image,
                  };
                }
                return loadedChar;
              });
            }
            
            // Merge fresh spriteSets and image URLs into side characters
            if (migratedState.sideCharacters?.length > 0) {
              migratedState.sideCharacters = migratedState.sideCharacters.map(loadedChar => {
                const configChar = config.characters.find(c => c.name === loadedChar.name);
                if (configChar) {
                  return {
                    ...loadedChar,
                    spriteSets: configChar.spriteSets,
                    image: configChar.image,
                  };
                }
                return loadedChar;
              });
            }
            
            devLog("[Import] Merged fresh sprite URLs from game config");
          } catch (configError) {
            // Non-fatal: If config fetch fails, continue with save file's sprites
            console.warn("[Import] Could not fetch game config for sprite sync:", configError);
          }
          // --- END SPRITE SYNC FIX ---

          await (db as Dexie).transaction('rw', db.appState, db.pipelineData, db.stepData, db.errorData, async () => {
             await db.pipelineData.clear();
             await db.stepData.clear();
             await db.errorData.clear();

             await db.appState.put({ id: 1, state: migratedState });

             if (pipelineState) {
                devLog("Restoring pipeline state from save file...");
                if (pipelineState.pipelineData?.length > 0) {
                    // [FIX] Clear stale cache reference before restoring pipeline state
                    // Imported saves contain cacheName from original session which no longer exists
                    // on Google's servers. Clearing it forces a fresh cache creation at EOD start.
                    const cleanedPipelineData = pipelineState.pipelineData.map((item: { key: string; data: any }) => {
                        if (item.key === persistenceService.EOD_KEY_PIPELINE_STATE_BUCKET && item.data?.cacheName) {
                            devLog("[Import] Clearing stale cache reference:", item.data.cacheName);
                            const { cacheName, cacheModel, cacheCreatedAt, ...rest } = item.data;
                            return { ...item, data: rest };
                        }
                        return item;
                    });
                    await db.pipelineData.bulkPut(cleanedPipelineData);
                }
                if (pipelineState.stepData?.length > 0) {
                    await db.stepData.bulkPut(pipelineState.stepData);
                }
                if (pipelineState.errorData?.length > 0) {
                    await db.errorData.bulkPut(pipelineState.errorData);
                }
             } else {
                devLog("Resetting pipeline state for old save file format...");
                await persistenceService.saveCurrentEndOfDayStep(migratedState.endOfDayStep);
                await persistenceService.saveCurrentNewGameStep(migratedState.newGameStep);
                await persistenceService.saveCurrentSegmentTransitionStep(migratedState.segmentTransitionStep);
                await db.errorData.bulkPut([
                    { id: EOD_KEY_ERRORS, errors: {} },
                    { id: NEW_GAME_KEY_ERRORS, errors: {} },
                    { id: SEGMENT_KEY_ERRORS, errors: {} },
                ]);
             }
          });

          // =========================================================================
          // [FIX] COMPREHENSIVE PIPELINE DATA SEEDING ON IMPORT
          // =========================================================================
          // When importing a save file that was exported mid-pipeline, the pipelineState
          // might contain stale data from a previous session. We MUST seed all critical
          // pipeline keys from migratedState to ensure the pipeline sees the correct
          // game state, not stale Dexie data.
          // =========================================================================
          
          // --- Core Game State (used by nearly all pipeline steps) ---
          // [CRITICAL FIX] Merge current segment buffer (history) into fullHistory before saving!
          // The save state stores the current segment in `history`, not in `fullHistory`.
          // When resuming EOD pipeline, we need the COMPLETE history with current segment merged.
          const mergedFullHistory = (() => {
              const baseHistory = migratedState.fullHistory || [];
              const currentSegmentDialogue = migratedState.history || [];
              if (currentSegmentDialogue.length === 0) return baseHistory;
              
              // Find or create today's day log
              const currentDay = migratedState.currentDay;
              const currentSegment = migratedState.currentSegment;
              const dayLogForToday = baseHistory.find(d => d.day === currentDay) ?? { day: currentDay, segments: [] };
              
              // Filter out the current segment (if it exists) and add the fresh one
              const otherSegments = dayLogForToday.segments.filter(s => s.segment !== currentSegment);
              const finalSegments = [...otherSegments, { segment: currentSegment, dialogue: currentSegmentDialogue }];
              
              // Sort segments by standard order
              finalSegments.sort((a, b) => defaultDaySegments.indexOf(a.segment) - defaultDaySegments.indexOf(b.segment));
              
              // Rebuild history with merged day
              const reconstructedHistory = [...baseHistory.filter(d => d.day !== currentDay), { ...dayLogForToday, segments: finalSegments }];
              reconstructedHistory.sort((a, b) => a.day - b.day);
              return reconstructedHistory;
          })();
          await persistenceService.savePipelineData(EOD_KEY_FINAL_HISTORY, mergedFullHistory);
          await persistenceService.savePipelineData(EOD_KEY_UPDATED_MAIN_CHARS, migratedState.mainCharacters || []);
          await persistenceService.savePipelineData(EOD_KEY_UPDATED_SIDE_CHARS, migratedState.sideCharacters || []);
          await persistenceService.savePipelineData(EOD_KEY_UPDATED_AVAILABLE_SPRITES, migratedState.availableGenericSetNames || []);
          await persistenceService.savePipelineData(EOD_KEY_NOVEL_CHAPTERS, migratedState.novelChapters || []);
          await persistenceService.savePipelineData(EOD_KEY_PLAYTHROUGH_SUMMARIES, migratedState.playthroughSummaries || []);
          
          // --- Character Profiles & Dynamics ---
          await persistenceService.savePipelineData(EOD_KEY_MERGED_PROFILES, migratedState.psychologicalProfiles || {});
          await persistenceService.savePipelineData(EOD_KEY_MERGED_PROFILES_TRANSLATED, migratedState.psychologicalProfilesTranslated ?? null);
          await persistenceService.savePipelineData(EOD_KEY_RELATIONSHIP_DYNAMICS, migratedState.relationshipDynamics ?? '');
          await persistenceService.savePipelineData(EOD_KEY_RELATIONSHIP_DYNAMICS_TRANSLATED, migratedState.relationshipDynamicsTranslated ?? null);
          await persistenceService.savePipelineData(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED, migratedState.relationshipDynamicsStructured ?? null);
          await persistenceService.savePipelineData(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED_TRANSLATED, migratedState.relationshipDynamicsStructuredTranslated ?? null);
          
          // --- Character Development Data ---
          await persistenceService.savePipelineData(EOD_KEY_CHARACTER_TRAITS, migratedState.characterTraits ?? null);
          await persistenceService.savePipelineData(EOD_KEY_FINAL_LIKES_DISLIKES, migratedState.characterLikesDislikes ?? null);
          await persistenceService.savePipelineData(EOD_KEY_CHARACTER_CHRONICLES, migratedState.characterChronicles ?? {});
          await persistenceService.savePipelineData(EOD_KEY_CHARACTER_BIOGRAPHIES, migratedState.characterBiographies ?? {});
          await persistenceService.savePipelineData(EOD_KEY_FINAL_EVOLVING_PERSONAS, migratedState.evolvingPersonas ?? null);
          await persistenceService.savePipelineData(EOD_KEY_AFFECTION, migratedState.affection ?? {});
          await persistenceService.savePipelineData(EOD_KEY_UNASKED_QUESTIONS, migratedState.unaskedQuestions ?? null);
          
          // --- Player Analysis Data ---
          await persistenceService.savePipelineData(EOD_KEY_PLAYER_PSYCHOANALYSIS_PROSE, migratedState.playerPsychoanalysisProse || 'No analysis yet.');
          await persistenceService.savePipelineData(EOD_KEY_PLAYER_BACKSTORY, migratedState.playerBackstory ?? null);
          
          // --- Story Arc & Subplot Data ---
          await persistenceService.savePipelineData(EOD_KEY_FINAL_STORY_ARCS, migratedState.storyArcs ?? null);
          await persistenceService.savePipelineData(EOD_KEY_FINAL_SUBPLOTS, migratedState.subplotAnalysis ?? null);
          
          // --- World State Data ---
          await persistenceService.savePipelineData(EOD_KEY_UPDATED_FACT_SHEET, migratedState.factSheet ?? {});
          await persistenceService.savePipelineData(EOD_KEY_UPDATED_SCHEDULE, migratedState.scheduledEvents ?? []);
          
          // --- Calendar & Weather Data ---
          await persistenceService.savePipelineData(persistenceService.EOD_KEY_DAY_CALENDAR, migratedState.dayCalendar ?? null);
          
          // =========================================================================
          // END COMPREHENSIVE PIPELINE DATA SEEDING
          // =========================================================================

          setMainCharacters(migratedState.mainCharacters || []);
          setSideCharacters(migratedState.sideCharacters || []);
          setOriginalMainCharacters(migratedState.originalMainCharacters || []);
          setOriginalSideCharacters(migratedState.originalSideCharacters || []); // [NEW] Restore from save
          setHistory(migratedState.history); setFullHistory(migratedState.fullHistory); setSceneQueue(migratedState.sceneQueue);
          setCurrentLine(migratedState.currentLine); setBackgroundUrl(migratedState.backgroundUrl); setPlayerName(migratedState.playerName);
          setAffection(migratedState.affection); setCurrentDay(migratedState.currentDay); setCurrentSegment(migratedState.currentSegment);
          setPromptsToday(migratedState.promptsToday); setAffectionGainedToday(migratedState.affectionGainedToday);
          setAffectionLostToday(migratedState.affectionLostToday); setEvolvingPersonas(migratedState.evolvingPersonas);
          setCharacterTraits(migratedState.characterTraits ?? null); // [FIX] Restore characterTraits on import
          setCharacterLikesDislikes(migratedState.characterLikesDislikes); setPlayerChoices(migratedState.playerChoices);
          setPresentCharacterNames(migratedState.presentCharacterNames); setCharacterStageSlots(migratedState.characterStageSlots);
          setCharacterExpressions(migratedState.characterExpressions); setFullItinerary(migratedState.fullItinerary);
          setRelationshipDynamics(migratedState.relationshipDynamics);
          setRelationshipDynamicsStructured(migratedState.relationshipDynamicsStructured ?? null);
          setRelationshipDynamicsStructuredTranslated(migratedState.relationshipDynamicsStructuredTranslated);
          setStoryArcs(migratedState.storyArcs);
          setShowMotivations(migratedState.showMotivations); setSubplots(migratedState.subplotAnalysis ?? null);
          setFactSheet(migratedState.factSheet ?? {}); setTotalInputTokens(migratedState.totalInputTokens);
          setTotalOutputTokens(migratedState.totalOutputTokens); setTotalRequests(migratedState.totalRequests);
          setPsychologicalProfiles(migratedState.psychologicalProfiles); setNovelChapters(migratedState.novelChapters);
          setPlayerPsychoanalysisProse(migratedState.playerPsychoanalysisProse);
          setPlaythroughSummaries(migratedState.playthroughSummaries || []);
          setPlaythroughCounter(migratedState.playthroughCounter);
          setEndOfDayStep(migratedState.endOfDayStep ?? EndOfDayStep.NOT_STARTED);
          setNewGameStep(migratedState.newGameStep ?? NewGameStep.NOT_STARTED);
          setPlayerBackstory(migratedState.playerBackstory ?? null); setUnaskedQuestions(migratedState.unaskedQuestions ?? null);
          setCharacterChronicles(migratedState.characterChronicles ?? {});
          setCharacterBiographies(migratedState.characterBiographies ?? {});
          setAvailableGenericSetNames(migratedState.availableGenericSetNames ?? genericSpriteSets.map(s => s.name));
          setOpeningSceneCache(migratedState.openingSceneCache ?? null);
          setDayCalendar(migratedState.dayCalendar ?? null); // [FIX] Restore dayCalendar on import
          setNovelChaptersTranslated(migratedState.novelChaptersTranslated);
          setPlayerPsychoanalysisProseTranslated(migratedState.playerPsychoanalysisProseTranslated);
          setPsychologicalProfilesTranslated(migratedState.psychologicalProfilesTranslated); setFullItineraryTranslated(migratedState.fullItineraryTranslated);
          setPlayerChoicesTranslated(migratedState.playerChoicesTranslated); setRelationshipDynamicsTranslated(migratedState.relationshipDynamicsTranslated);
          setAffectionLog(migratedState.affectionLog); setAffectionLogTranslated(migratedState.affectionLogTranslated);
          setIsSegmentAnalysisComplete(migratedState.isSegmentAnalysisComplete ?? false);
          setSegmentTransitionStep(migratedState.segmentTransitionStep ?? SegmentTransitionStep.NOT_STARTED);
          setScheduledEvents(migratedState.scheduledEvents ?? []);
          setSceneMentalModel(migratedState.sceneMentalModel ?? null);
          setIsAwaitingNextSceneClick(migratedState.isAwaitingNextSceneClick ?? false);
          // [GENERATIVE IMAGES] Restore location state from imported save
          if (migratedState.currentLocationId) {
              setCurrentLocationId(migratedState.currentLocationId);
          }
          if (migratedState.currentLocationDescription) {
              setCurrentLocationDescription(migratedState.currentLocationDescription);
          }
          setIsLoading(false); // [FIX] Never restore transient loading states from imported save
          setIsAnalyzing(false); // [FIX] Let resume logic decide - prevents old overlay from persisting
          setIsDayTransitioning(false); // [FIX] Fresh start
          setIsSegmentTransitioning(false); // [FIX] Fresh start
          setIsAwaitingSegmentTransition(false); // [FIX] Fresh start - prevents old transition UI from persisting
          setIsGameCompleted(migratedState.isGameCompleted ?? false);
          setIsDirectorLoading(false); // [FIX] Fresh start
          setIsAnalystLoading(false); // [FIX] Fresh start
          setIsUnrecoverableError(false); // [FIX] Fresh start
          setIsPipelineResumePending(false); // [FIX] Fresh start
          setError(null);
          setNewGameErrors({}); setSegmentTransitionErrors({}); setEndOfDayErrors({});

          appSettings.setApiKeys(migratedState.apiKeys);
          // Only override model config if imported state has valid models (not placeholder)
          if (migratedState.modelSelection?.dungeonMasterModel && 
              !migratedState.modelSelection.dungeonMasterModel.startsWith('ERROR_')) {
              appSettings.setModelConfig(migratedState.modelSelection);
          }
          appSettings.setLanguage(migratedState.language); appSettings.setUiTranslations(migratedState.uiTranslations);
          
          // Resume pipeline logic, similar to handleContinueGame
          if (migratedState.endOfDayStep > EndOfDayStep.NOT_STARTED) {
              setGameState('playing'); setIsGameActive(true); setIsAnalyzing(true);
              setTimeout(() => handlersRef.current?.handleDayEnd(), 100);
          } else if (migratedState.segmentTransitionStep > SegmentTransitionStep.NOT_STARTED) {
              setGameState('playing'); setIsGameActive(true); setIsAwaitingSegmentTransition(true);
              setTimeout(() => handlersRef.current?.handleSegmentTransition(), 100);
          } else if (migratedState.newGameStep > NewGameStep.NOT_STARTED) {
              // This now handles both a pipeline in-progress AND a completed one.
              setGameState('name_input');
              // Re-running the handler is safe for a completed state and necessary for a resumed state.
              setTimeout(() => handlersRef.current?.handleNameConfirm(migratedState.playerName, migratedState.language), 100);
          } else {
              // This is a normal save file in the middle of a game.
              setGameState('playing');
              setIsGameActive(true);
          }
          setHasSaveData(true);
          
        } catch (e) {
          console.error("Failed to import state:", e);
          setError("Failed to import save file. It may be corrupted or in an old format.");
        } finally {
          isProcessingRef.current = false;
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    }, [apiKeys, appSettings, resetGameState, setMainCharacters, setSideCharacters, setOriginalMainCharacters, setHistory, setFullHistory, setSceneQueue, setCurrentLine, setBackgroundUrl, setPlayerName, setAffection, setCurrentDay, setCurrentSegment, setPromptsToday, setAffectionGainedToday, setAffectionLostToday, setEvolvingPersonas, setCharacterLikesDislikes, setPlayerChoices, setPresentCharacterNames, setCharacterStageSlots, setCharacterExpressions, setFullItinerary, setRelationshipDynamics, setStoryArcs, setShowMotivations, setSubplots, setFactSheet, setTotalInputTokens, setTotalOutputTokens, setTotalRequests, setPsychologicalProfiles, setNovelChapters, setPlayerPsychoanalysisProse, setPlaythroughCounter, setEndOfDayStep, setNewGameStep, setPlayerBackstory, setUnaskedQuestions, setCharacterChronicles, setAvailableGenericSetNames, setOpeningSceneCache, setNovelChaptersTranslated, setPlayerPsychoanalysisProseTranslated, setPsychologicalProfilesTranslated, setFullItineraryTranslated, setPlayerChoicesTranslated, setRelationshipDynamicsTranslated, setAffectionLog, setAffectionLogTranslated, setIsSegmentAnalysisComplete, setSegmentTransitionStep, setScheduledEvents, setSceneMentalModel, setIsAwaitingNextSceneClick, setIsLoading, setIsAnalyzing, setIsDayTransitioning, setIsSegmentTransitioning, setIsGameCompleted, setIsDirectorLoading, setIsAnalystLoading, setIsUnrecoverableError, setError, setNewGameErrors, setSegmentTransitionErrors, setEndOfDayErrors, setGameState, setIsGameActive, setHasSaveData, setIsPipelineResumePending]);
  
    const handleTogglePromptLogging = useCallback(() => {
        setIsPromptLoggingEnabled(prev => {
            const newState = !prev;
            setPromptLoggingEnabled(newState);
            return newState;
        });
    }, []);
    // [REPLAY] Go to replay menu - preserve imported data so user can browse different days
    const handleGoToReplayMenu = useCallback(() => { 
        setGameState('replay_menu');
    }, []);
    
    // [REPLAY] Import a save file for non-destructive replay viewing
    // IMPORTANT: This does NOT touch IndexedDB - everything stays in memory
    const handleReplayImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => { 
        const file = event.target.files?.[0]; 
        if (!file) return; 
        const reader = new FileReader(); 
        reader.onload = async (e) => { 
            try { 
                const parsedJson = JSON.parse(e.target?.result as string);
                
                // Extract appState WITHOUT touching IndexedDB
                let appState: AppState;
                if (isHydratedSave(parsedJson)) {
                    // Hydrated save - extract gameState only, DO NOT call importHydratedSave
                    appState = migrateSaveFile(parsedJson.gameState) as AppState;
                    
                    // Extract background blobs into memory (not IndexedDB)
                    const assets = parsedJson.assets || [];
                    if (assets.length > 0) {
                        const locationMap = new Map<string, string>();
                        for (const asset of assets) {
                            try {
                                // Convert base64 to blob URL (in memory only)
                                const byteCharacters = atob(asset.data);
                                const byteNumbers = new Array(byteCharacters.length);
                                for (let i = 0; i < byteCharacters.length; i++) {
                                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                                }
                                const byteArray = new Uint8Array(byteNumbers);
                                const blob = new Blob([byteArray], { type: asset.mime });
                                const blobUrl = URL.createObjectURL(blob);
                                locationMap.set(asset.id, blobUrl);
                            } catch (err) {
                                devWarn(`[REPLAY IMPORT] Failed to load asset ${asset.id}:`, err);
                            }
                        }
                        setReplayGeneratedLocations(locationMap);
                    }
                } else if (parsedJson.appState && parsedJson.pipelineState) {
                    // New format with separate appState/pipelineState
                    appState = migrateSaveFile(parsedJson.appState) as AppState;
                } else {
                    // Old format - direct AppState
                    appState = migrateSaveFile(parsedJson) as AppState;
                }
                
                // Store character data for replay (sprites are in character.image)
                const allChars = [...(appState.mainCharacters || []), ...(appState.sideCharacters || [])];
                setReplayCharacters(allChars);
                setImportedReplayData(appState);
            } catch (err) { 
                console.error("Failed to import replay state:", err); 
                setError("Failed to import save file for replay."); 
            } 
        }; 
        reader.readAsText(file); 
        event.target.value = ''; 
    }, []);
    
    // [REPLAY] Clear imported data to return to viewing active game history
    const handleClearImportedReplay = useCallback(() => {
        // Revoke blob URLs to free memory
        replayGeneratedLocations.forEach((blobUrl) => {
            URL.revokeObjectURL(blobUrl);
        });
        setReplayGeneratedLocations(new Map());
        setReplayCharacters([]);
        setImportedReplayData(null);
    }, [replayGeneratedLocations]);
    
    // [REPLAY] Start replaying a specific day from either active game or imported save
    // Now receives the DayLog directly to ensure we use the merged data (including pending dialogue)
    const handleStartReplay = useCallback((dayLog: DayLog, source: 'active' | 'imported' = 'active') => { 
        if (!dayLog || !dayLog.segments) {
            setError('No history available for replay.');
            return;
        }
        
        // Clean up any blob URLs from a previous replay before starting a new one
        activeReplayBlobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
        activeReplayBlobUrlsRef.current = [];
        activeReplayBlobCacheRef.current.clear();
        currentReplayLocationRef.current = null;
        
        // DON'T change UI language for imported replays - keep user's current UI language
        // The replay toggle lets users switch between original dialogue and English translation
        
        // Build replay script with day/segment from the parent structure
        // ALWAYS use dayLog.day and segmentLog.segment as source of truth
        // (old saves may have incorrect values baked into entries)
        const replayEntries = dayLog.segments.flatMap(segmentLog => 
            segmentLog.dialogue.map(entry => ({
                ...entry,
                day: dayLog.day,
                segment: segmentLog.segment,
            }))
        );
        
        // Track available segments for this day (for segment navigation UI)
        const availableSegments = dayLog.segments.map(s => s.segment);
        setReplayAvailableSegments(availableSegments);
        setReplayCurrentSegment(availableSegments[0] || null);
        
        setReplayScript(replayEntries); 
        setReplayHistory([]); // Clear any previous replay history
        setReplayIndex(0); 
        setReplayRestartKey(prev => prev + 1); // Force typewriter restart when switching replays
        setIsReplayPaused(false); 
        setGameState('replaying'); 
        setIsGameActive(true); 
    }, []);
    
    // [REPLAY] Exit replay - clean up and go to menu
    const handleExitReplay = useCallback(() => { 
        // Revoke blob URLs created during active game replay to prevent memory leaks
        activeReplayBlobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
        activeReplayBlobUrlsRef.current = [];
        activeReplayBlobCacheRef.current.clear();
        currentReplayLocationRef.current = null;
        
        // Reset replay state
        setGameState('replay_menu'); 
        setReplayScript([]); 
        setReplayHistory([]); 
        setCurrentLine(null);
        setReplayBackgroundUrl('');
        setReplayPresentCharacters([]);
        setReplayCharacterExpressions({});
    }, []);
    const handleToggleReplayPause = useCallback(() => { setIsReplayPaused(prev => !prev); }, []);
    const handleToggleReplayLanguage = useCallback(() => { 
        setShowReplayOriginalLanguage(prev => !prev); 
        setReplayRestartKey(prev => prev + 1); // Force typewriter to restart with new language
    }, []);
    const handleRestartReplay = useCallback(() => { 
        // Restart from the beginning of the CURRENT segment, not the whole day
        const segmentStartIndex = replayScript.findIndex(e => e.segment === replayCurrentSegment);
        const startIndex = segmentStartIndex >= 0 ? segmentStartIndex : 0;
        
        // Reset location ref so background gets re-evaluated for first line
        currentReplayLocationRef.current = null;
        
        setReplayIndex(startIndex); 
        setReplayHistory([]); 
        setIsReplayPaused(false); 
        setReplayRestartKey(prev => prev + 1); // Force typewriter to restart
        setIsAtSegmentEnd(false);
    }, [replayScript, replayCurrentSegment]);
    const handleChangeReplaySpeed = useCallback((speed: number) => { setReplaySpeed(speed); }, []);
    
    // [REPLAY] Jump to a specific segment within the current replay day
    const handleReplayJumpToSegment = useCallback((targetSegment: DaySegment) => {
        // Find the first entry index for this segment
        const segmentStartIndex = replayScript.findIndex(entry => entry.segment === targetSegment);
        if (segmentStartIndex === -1) {
            devWarn(`[REPLAY] Segment ${targetSegment} not found in replay script`);
            return;
        }
        
        // Reset location ref so background gets re-evaluated
        currentReplayLocationRef.current = null;
        
        // Clear history - start fresh for this segment
        setReplayHistory([]);
        setReplayIndex(segmentStartIndex);
        setReplayCurrentSegment(targetSegment);
        setReplayRestartKey(prev => prev + 1); // Force typewriter restart
        setIsReplayPaused(false);
        setIsAtSegmentEnd(false);
    }, [replayScript]);
    
    // [REPLAY] Jump to the end of the current segment - shows all dialogue at once for "novel reading" mode
    const handleReplayJumpToEnd = useCallback(() => {
        if (!replayCurrentSegment || replayScript.length === 0) return;
        
        // Find all entries for the current segment
        const segmentEntries = replayScript.filter(entry => entry.segment === replayCurrentSegment);
        if (segmentEntries.length === 0) return;
        
        // Find the index of the last entry of this segment in the full script
        const lastSegmentEntry = segmentEntries[segmentEntries.length - 1];
        const lastIndex = replayScript.findIndex(entry => entry.id === lastSegmentEntry.id);
        
        // Populate history with all entries of this segment EXCEPT the last (which becomes currentLine)
        setReplayHistory(segmentEntries.slice(0, -1));
        setReplayIndex(lastIndex);
        setReplayRestartKey(prev => prev + 1);
        setIsReplayPaused(true); // Pause so they can read
        setIsAtSegmentEnd(true); // Mark as at segment end
        
        // [REPLAY] Update replay-specific visuals (NOT main game state)
        // Scan backwards to find the LATEST state for each visual component
        const isImportedReplay = importedReplayData !== null;
        
        // Find latest location (scan backwards)
        for (let i = segmentEntries.length - 1; i >= 0; i--) {
            const entry = segmentEntries[i];
            if (entry.location) {
                const isUrl = entry.location.includes('/') || entry.location.startsWith('http');
                if (isUrl) {
                    setReplayBackgroundUrl(entry.location);
                } else if (isImportedReplay) {
                    // Imported save: use in-memory blob URLs
                    const replayBlobUrl = replayGeneratedLocations.get(entry.location);
                    if (replayBlobUrl) {
                        setReplayBackgroundUrl(replayBlobUrl);
                    } else {
                        // Fall back to stock location
                        const allPossibleLocations = Object.values(locationsBySegment).flat();
                        const found = allPossibleLocations.find(l => 
                            l.name.toLowerCase().replace(/[^a-z0-9]/g, '') === entry.location!.toLowerCase().replace(/[^a-z0-9_]/g, '').replace(/_/g, '')
                        );
                        if (found) setReplayBackgroundUrl(found.url);
                    }
                } else {
                    // Active game replay: look up from IndexedDB safely
                    const locationId = entry.location;
                    db.generatedLocations.get(locationId).then(dbEntry => {
                        if (dbEntry?.blob) {
                            const blobUrl = URL.createObjectURL(dbEntry.blob);
                            activeReplayBlobUrlsRef.current.push(blobUrl); // Track for cleanup
                            setReplayBackgroundUrl(blobUrl);
                        } else {
                            // Fall back to stock location
                            const allPossibleLocations = Object.values(locationsBySegment).flat();
                            const found = allPossibleLocations.find(l => 
                                l.name.toLowerCase().replace(/[^a-z0-9]/g, '') === locationId.toLowerCase().replace(/[^a-z0-9_]/g, '').replace(/_/g, '')
                            );
                            if (found) setReplayBackgroundUrl(found.url);
                        }
                    });
                }
                break; // Found most recent location
            }
        }
        
        // Find latest presentCharacters (scan backwards)
        for (let i = segmentEntries.length - 1; i >= 0; i--) {
            const entry = segmentEntries[i];
            if (entry.presentCharacters && entry.presentCharacters.length > 0) {
                setReplayPresentCharacters(entry.presentCharacters);
                break; // Found most recent
            }
        }
        
        // Find latest expression for each character (scan all entries, later ones override)
        const latestExpressions: Record<string, { set: string; expression: string }> = {};
        for (const entry of segmentEntries) {
            if (entry.expression && entry.speaker && entry.speaker !== 'Narrator') {
                const set = entry.spriteSet || 'default';
                latestExpressions[entry.speaker] = { set, expression: entry.expression };
            }
        }
        if (Object.keys(latestExpressions).length > 0) {
            setReplayCharacterExpressions(prev => ({ ...prev, ...latestExpressions }));
        }
    }, [replayScript, replayCurrentSegment, locationsBySegment, replayGeneratedLocations, importedReplayData]);
    
    // [REPLAY] Go to the next segment (shown when at segment end)
    const handleReplayNextSegment = useCallback(() => {
        if (!replayCurrentSegment || replayAvailableSegments.length === 0) return;
        
        const currentIdx = replayAvailableSegments.indexOf(replayCurrentSegment);
        if (currentIdx === -1 || currentIdx >= replayAvailableSegments.length - 1) {
            // No next segment - at end of day
            return;
        }
        
        const nextSegment = replayAvailableSegments[currentIdx + 1];
        
        // Find the first entry of the next segment
        const nextSegmentStartIndex = replayScript.findIndex(entry => entry.segment === nextSegment);
        if (nextSegmentStartIndex === -1) return;
        
        // Reset location ref so background gets re-evaluated
        currentReplayLocationRef.current = null;
        
        // Clear history, jump to next segment
        setReplayHistory([]);
        setReplayIndex(nextSegmentStartIndex);
        setReplayCurrentSegment(nextSegment);
        setReplayRestartKey(prev => prev + 1);
        setIsReplayPaused(false);
        setIsAtSegmentEnd(false);
    }, [replayScript, replayCurrentSegment, replayAvailableSegments]);
  
    const handleRetry = async () => { if (lastFailedApiCall.func) { setIsUnrecoverableError(false); setError(null); await lastFailedApiCall.func(); } };
    const handleCancelError = useCallback(() => {
        setIsUnrecoverableError(false);
        setError(null);
        setLastFailedApiCall({ func: null });
        revertToPreviousInputState();
    }, [revertToPreviousInputState]);

    
  const handleStartNextPlaythrough = useCallback(async () => {
    // This function now exclusively uses the persistence layer as the source of truth.
    if (isProcessingRef.current) { return; }
    isProcessingRef.current = true;
    
    try {
      devLog("handleStartNextPlaythrough: Setting resume flag and triggering EOD pipeline at Translation Complete step...");
      
      // 1. Set the canonical state in the database first. This is the source of truth.
      const resumeStep = EndOfDayStep.TRANSLATION_COMPLETE;
      await persistenceService.saveCurrentEndOfDayStep(resumeStep);
      await persistenceService.saveIsResumingFlag(true);

      // 2. Update the UI state to reflect the action and trigger the resume effect.
      setIsGameCompleted(false);
      setIsAnalyzing(true); 
      setEndOfDayStep(resumeStep); // This triggers the useEffect hook
      setIsPipelineResumePending(true);
      
    } catch (error: any) {
      setError(`An error occurred while preparing your next playthrough: ${error.message}`);
      setIsPipelineResumePending(false); // Clean up
      setIsAnalyzing(false); // Clean up UI state
    } finally {
        // The actual pipeline is started by the useEffect, so we can release the ref here.
        isProcessingRef.current = false;
    }
  }, [
    setIsGameCompleted, 
    setIsAnalyzing, 
    setIsPipelineResumePending, 
    setEndOfDayStep, 
    setError
]);

    const retryNewGameStep = useCallback(async (step: NewGameStep, overrideModel?: GeminiModel) => {
        if (isProcessingRef.current) { devWarn("Retry ignored: a process is already running."); return; }
        devLog(`Retrying new game step: ${NewGameStep[step]}`);
        const currentErrors = await persistenceService.loadNewGameErrors() || {};
        delete currentErrors[step];
        await persistenceService.saveNewGameErrors(currentErrors);
        setNewGameErrors(currentErrors);
        if (handlersRef.current?.handleNameConfirm) {
            await handlersRef.current.handleNameConfirm(state.playerName, state.language, overrideModel);
        } else { console.error("Cannot retry: handleNameConfirm handler not available."); }
    }, [state.playerName, state.language, setNewGameErrors]);

    const retrySegmentTransitionStep = useCallback(async (step: SegmentTransitionStep, overrideModel?: GeminiModel) => {
        if (isProcessingRef.current) { devWarn("Retry ignored: a process is already running."); return; }
        devLog(`Retrying segment transition step: ${SegmentTransitionStep[step]}`);
        const currentErrors = await persistenceService.loadSegmentTransitionErrors() || {};
        delete currentErrors[step];
        await persistenceService.saveSegmentTransitionErrors(currentErrors);
        setSegmentTransitionErrors(currentErrors);
        if (handlersRef.current?.handleSegmentTransition) {
             await handlersRef.current.handleSegmentTransition(overrideModel);
        } else { console.error("Cannot retry: handleSegmentTransition handler not available."); }
    }, [setSegmentTransitionErrors]);

    const retryEndOfDayStep = useCallback(async (step: EndOfDayStep, overrideModel?: GeminiModel) => {
        if (isProcessingRef.current) {
          devWarn("Retry ignored: a process is already running.");
          return;
        }
        devLog(`Retrying end-of-day step: ${EndOfDayStep[step]}`);
        const currentErrors = await persistenceService.loadEodErrors() || {};
        delete currentErrors[step];
        await persistenceService.saveEodErrors(currentErrors);
        setEndOfDayErrors(currentErrors);

        if (handlersRef.current?.handleDayEnd) {
             await handlersRef.current.handleDayEnd(overrideModel);
        } else {
             console.error("Cannot retry: handleDayEnd handler not available.");
        }
    }, [setEndOfDayErrors]);

    useEffect(() => {
        // This effect is for resuming an interrupted pipeline when the game loads or continues.
        // It's triggered by major state changes, not every minor step update.

        // --- START OF FIX ---
        // 1. Check if a process is already running OR if the game is still loading.
        if (isProcessingRef.current || isLoading) {
            devDebug("Resume check: A process is already running or app is loading. No resume needed.");
            return;
        }

        // 2. Check if errors are already present in the UI state.
        //    If so, a failure has occurred and we MUST wait for a manual retry.
        //    (This is now safe from the import edge case because handleImportState
        //    clears these errors first).
        //    
        //    UPDATE: Removed the blocking check to allow auto-retry on reload/import if the step was interrupted.
        //    handleDayEnd/etc will handle clearing the errors if they decide to proceed.
        
        /*
        const errorsExist = Object.keys(endOfDayErrors).length > 0 ||
                            Object.keys(segmentTransitionErrors).length > 0 ||
                            Object.keys(newGameErrors).length > 0;
                            
        if (errorsExist) {
            devDebug("Resume check: Errors are present. Waiting for manual retry.");
            return;
        }
        */
        // --- END OF FIX ---


        // Only check for resumption when entering an active game state.
        if (gameState !== 'playing' && gameState !== 'name_input') {
            return;
        }

        const currentEodStep = endOfDayStep;
        const currentSegmentStep = segmentTransitionStep;
        const currentNewGameStep = newGameStep;
        const hasNewGameError = newGameErrors && Object.keys(newGameErrors).length > 0;

        let resumeHandler: Function | undefined;
        let handlerArgs: any[] = [];

        // Determine which pipeline needs resuming
        let pipelineType: 'eod' | 'segment' | 'newgame' | null = null;
        if (currentEodStep > EndOfDayStep.NOT_STARTED && currentEodStep < EndOfDayStep.FINAL_STATE_SAVE_COMPLETE) {
            devLog(`Resume check: Found interrupted EOD at step: ${EndOfDayStep[currentEodStep]}.`);
            pipelineType = 'eod';
            resumeHandler = handlersRef.current?.handleDayEnd;
        } else if (currentSegmentStep > SegmentTransitionStep.NOT_STARTED && currentSegmentStep < SegmentTransitionStep.STATE_UPDATE_COMPLETE) {
            devLog(`Resume check: Found interrupted Segment Transition at step: ${SegmentTransitionStep[currentSegmentStep]}.`);
            pipelineType = 'segment';
            resumeHandler = handlersRef.current?.handleSegmentTransition;
        } else if (currentNewGameStep > NewGameStep.NOT_STARTED && currentNewGameStep < NewGameStep.FINAL_STATE_SAVE_COMPLETE && !hasNewGameError) {
            devLog(`Resume check: Found interrupted New Game at step: ${NewGameStep[currentNewGameStep]}. playerName: ${playerName}, language: ${language}`);
            pipelineType = 'newgame';
            resumeHandler = handlersRef.current?.handleNameConfirm;
            handlerArgs = [playerName, language];
        } else {
            devDebug("Resume check: No interrupted pipelines found.");
        }

        // If we need to resume but handlers aren't ready, schedule a retry
        if (pipelineType && !resumeHandler) {
            devLog(`Resume check: handlersRef.current not ready for ${pipelineType}. Scheduling retry in 200ms...`);
            const retryId = setTimeout(() => {
                // Trigger a re-render by toggling isPipelineResumePending
                // This will cause the effect to re-run and try again
                setIsPipelineResumePending(prev => !prev);
            }, 200);
            return () => clearTimeout(retryId);
        }

        if (resumeHandler) {
            devLog("Resume check: Scheduling handler call to resume pipeline.");
            const timeoutId = setTimeout(async () => {
                if (isProcessingRef.current) {
                    devDebug("Resume check (setTimeout): Bailing out, isProcessingRef became true.");
                    return;
                }
                 try {
                     if (pipelineType === 'eod') setIsAnalyzing(true);
                     if (pipelineType === 'segment') setIsAwaitingSegmentTransition(true);
                     // The gameState is already 'name_input' for a new game resume.
                     await resumeHandler(...handlerArgs);
                     devLog("Resume check (setTimeout): Handler completed.");
                 } catch (error) {
                     console.error("Resume check (setTimeout): Error during handler execution:", error);
                     setIsAnalyzing(false);
                     setIsAwaitingSegmentTransition(false);
                 }
             }, 100);
             return () => clearTimeout(timeoutId);
        }
     }, [gameState, playerName, language, isLoading, endOfDayStep, segmentTransitionStep, newGameStep, newGameErrors, isPipelineResumePending]);

    const handleVetoEndScene = useCallback(() => {
        setIsAwaitingNextSceneClick(false);
        setHistory(prevHistory => {
            if (prevHistory.length === 0) return prevHistory;
            const newHistory = [...prevHistory];
            const lastIndex = newHistory.length - 1;
            newHistory[lastIndex] = {
                ...newHistory[lastIndex],
                end_of_segment: undefined
            };
            return newHistory;
        });
    }, []);
    
    const handleProceedToNextScene = useCallback(async () => {
        if (isProcessingRef.current) {
            devWarn("handleProceedToNextScene: Process already running.");
            return;
        }

        if (isAwaitingNextSceneClick) {
          try {
            setIsAwaitingNextSceneClick(false);

            const isLastSegment = state.currentSegment === daySegments[daySegments.length - 1];

            if (isLastSegment) {
                devLog("Last segment finished. Setting isAnalyzing=true and calling handleDayEnd.");
                setIsAnalyzing(true);
                if (handlersRef.current?.handleDayEnd) {
                    await handlersRef.current.handleDayEnd();
                } else { throw new Error("handleDayEnd handler not ready."); }
            } else {
                devLog("Intra-day segment finished. Setting isAwaitingSegmentTransition=true and calling handleSegmentTransition.");
                setIsAwaitingSegmentTransition(true);
                if (handlersRef.current?.handleSegmentTransition) {
                    await handlersRef.current.handleSegmentTransition();
                } else { throw new Error("handleSegmentTransition handler not ready."); }
            }
          } catch (error: any) {
             console.error("Error initiating transition:", error);
             setError(`A critical error occurred starting the transition: ${error.message}`);
             setIsAnalyzing(false);
             setIsAwaitingSegmentTransition(false);
             if (handlersRef.current?.handleProceedToNextScene) {
                setLastFailedApiCall({ func: handlersRef.current.handleProceedToNextScene });
             }
             setIsUnrecoverableError(true);
          }
        } else {
             devLog("handleProceedToNextScene called but not awaiting user click.");
        }
    }, [
        isAwaitingNextSceneClick, state.currentSegment,
        setIsAwaitingNextSceneClick,
        setIsAnalyzing, setIsAwaitingSegmentTransition,
        setError, setIsUnrecoverableError, setLastFailedApiCall
    ]);

    const handlers = {
      getCurrentState,
      handleSendMessage, handleContinue: handleContinueGame, handleStartNewGame, handleConfirmNewGame, handleContinueGame,
      handleBackToMenu, handleNameConfirm, handleDayEnd, handleSegmentTransition, handleSaveApiKeys, handleImportKeys, handleSaveModelSelection, handleExportState,
      handleExportStory, handleImportState, handleTogglePromptLogging, handleGoToReplayMenu, handleReplayImport,
      handleStartReplay, handleClearImportedReplay, handleExitReplay, handleToggleReplayPause, handleToggleReplayLanguage, handleRestartReplay, handleChangeReplaySpeed, handleReplayJumpToSegment, handleReplayJumpToEnd, handleReplayNextSegment,
      handleProceedToNextScene, handleVetoEndScene, handleRetry, handleStartNextPlaythrough, handleStartNextDayTransition,
      retryNewGameStep, retrySegmentTransitionStep, retryEndOfDayStep,
      handleCancelError,
      handleProceedAfterPipeline,
      startCountdown: (stepKey: string, seconds: number, type: 'success' | 'error') => {
          setCountdownStepKey(stepKey);
          setCountdownSeconds(seconds);
          setCountdownType(type);
      },
      waitForCountdown: () => {
          if (countdownSeconds > 0) {
              return new Promise<void>((resolve) => {
                  countdownPromiseResolveRef.current = resolve;
              });
          }
          return Promise.resolve();
      },
      setNewGameErrors, setSegmentTransitionErrors, setEndOfDayErrors, resetGameState, updateStats, handleKeyRotation, handleRateLimitWait, processSceneResponse,
      setError, setShowConfirmModal, setIsProfileVisible, setIsStoryVisible, setIsItineraryVisible,
      setIsApiKeyModalVisible, setIsModelSelectionVisible, setIsDevToolsVisible, setShowMotivations,
      setLoadingMessage, setCharacterGenerationProgress, setEvolvingPersonas, setCharacterTraits, setCharacterLikesDislikes,
      setRelationshipDynamics, setRelationshipDynamicsTranslated, setStoryArcs, setFullItinerary, setFullItineraryTranslated, setPlaythroughCounter,
      setGameState, setIsGameActive, setHistory, setFullHistory, setBackgroundUrl, setPlayerName, setAffection, setCurrentDay,
      setCurrentSegment, setPromptsToday, setAffectionGainedToday, setAffectionLostToday, setPlayerChoices, setPlayerChoicesTranslated,
      setPresentCharacterNames, setCharacterExpressions, setPsychologicalProfiles, setNovelChapters, setPlaythroughSummaries, setPlayerPsychoanalysisProse,
      setSubplots, setFactSheet, setNovelChaptersTranslated, setPlayerPsychoanalysisProseTranslated, setPsychologicalProfilesTranslated,
      setAffectionLog, setAffectionLogTranslated, setSceneQueue, setIsAwaitingSegmentTransition, setNotification,
      setIsAnalyzing, setAnalysisMessage, setAnalysisProgress, setAnalyzedCharacters, setTransitioningToDay,
      setIsDayTransitioning, setDirectorLoadingMessage, setIsDirectorLoading, setIsGameCompleted, setIsAwaitingNextSceneClick,
      setIsAnalystLoading, setAnalystLoadingMessage,
      setLastFailedApiCall, setIsUnrecoverableError, setIsLoading, setEndOfDayStep,
      setNewGameStep, setIsSegmentAnalysisComplete,
      setSegmentTransitionStep,
      setPlayerBackstory,
      setUnaskedQuestions,
      setCharacterChronicles,
      setCharacterBiographies,
      setScheduledEvents,
      setSceneMentalModel,
      setMainCharacters,
      setSideCharacters,
      setOriginalMainCharacters,
      setIsSegmentTransitioning,
      setTransitioningToSegment,
      setAvailableGenericSetNames,
      revertToPreviousInputState,
      setPendingTextInput,
      setOpeningSceneCache,
      setIsPipelineResumePending,
      setRelationshipDynamicsStructured,
      setRelationshipDynamicsStructuredTranslated,
    };
    handlersRef.current = handlers;

    return { state, handlers, uiState, devState };
};
