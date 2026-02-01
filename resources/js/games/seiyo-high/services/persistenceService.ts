/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tlint:disable */
// FIX: Removed unused 'NewGameCache' from import as it does not exist in the types.
import { AppState, EndOfDayStep, EvolvingStoryArc, ModelSelection, NewGameStep, SegmentTransitionStep, DaySegment, PsychologicalProfiles, PlayerAnalysisResponse, NovelChapter, DailyItinerary, CharacterLikesDislikes, CharacterTraits, Subplot, ScheduledEvent, TransitionDirectorResponse, SceneMentalModel, DayLog, NewChronicleEntry, ChronicleEntry, TranslationSet, InitialStoryFoundation, VnScene, CharacterConfig, LocationsBySegment } from '../types';

// Default structures for initialization
const defaultLocationsBySegment: LocationsBySegment = { Morning: [], Afternoon: [], Evening: [], Night: [] };
export const defaultDayStructure = ['Morning', 'Afternoon', 'Evening', 'Night'];
import { PROVIDERS } from '../lib/modelConfig';
import { v4 as uuidv4 } from 'uuid';
import { genericSpriteSets } from '../lib/genericSprites';
import { db, DbErrorData, DbStepData } from '../db';
import { migrateSaveFile } from './migrationService';
import Dexie from 'dexie';
import { devLog, devWarn, devDebug } from '../lib/devLog';


// This key is now only used for one-time migration from localStorage.
const SAVED_STATE_KEY = 'vn_app_state_v5';

// --- EOD Pipeline Constants ---
export const EOD_STEP_KEY = 'vn_eod_current_step_v6';
export const EOD_PIPELINE_PREFIX = 'vn_eod_pipeline_v6_';
export const EOD_KEY_FINAL_HISTORY = EOD_PIPELINE_PREFIX + 'finalHistoryForDay';
export const EOD_KEY_CAST_ANALYST_RAW = EOD_PIPELINE_PREFIX + 'castAnalystRawData';
export const EOD_KEY_UPDATED_MAIN_CHARS = EOD_PIPELINE_PREFIX + 'updatedMainCharsList';
export const EOD_KEY_UPDATED_SIDE_CHARS = EOD_PIPELINE_PREFIX + 'updatedSideCharsList';
export const EOD_KEY_UPDATED_AVAILABLE_SPRITES = EOD_PIPELINE_PREFIX + 'updatedAvailableSprites';
export const EOD_KEY_PROMO_AFFECTION_PREFIX = EOD_PIPELINE_PREFIX + 'promoAffection_';
export const EOD_KEY_NEWLY_PROMOTED_NAMES = EOD_PIPELINE_PREFIX + 'newlyPromotedNames';
export const EOD_KEY_RELATIONSHIP_ANALYST_RAW = EOD_PIPELINE_PREFIX + 'relationshipAnalystRawData';
export const EOD_KEY_PLAYER_ANALYSIS_RAW = EOD_PIPELINE_PREFIX + 'playerAnalysisRawData';
export const EOD_KEY_MERGED_PROFILES = EOD_PIPELINE_PREFIX + 'mergedPsychologicalProfiles';
export const EOD_KEY_MERGED_PROFILES_TRANSLATED = EOD_PIPELINE_PREFIX + 'mergedPsychologicalProfilesTranslated';
export const EOD_KEY_RELATIONSHIP_DYNAMICS = EOD_PIPELINE_PREFIX + 'relationshipDynamics';
export const EOD_KEY_RELATIONSHIP_DYNAMICS_TRANSLATED = EOD_PIPELINE_PREFIX + 'relationshipDynamicsTranslated';
export const EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED = EOD_PIPELINE_PREFIX + 'relationshipDynamicsStructured';
export const EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED_TRANSLATED = EOD_PIPELINE_PREFIX + 'relationshipDynamicsStructuredTranslated';
export const EOD_KEY_CHARACTER_CHRONICLES = EOD_PIPELINE_PREFIX + 'characterChronicles'; // [NEW]
export const EOD_KEY_CHARACTER_BIOGRAPHIES = EOD_PIPELINE_PREFIX + 'characterBiographies'; // [NEW]
export const EOD_KEY_UNASKED_QUESTIONS = EOD_PIPELINE_PREFIX + 'unaskedQuestions'; // [NEW]
export const EOD_KEY_AFFECTION = EOD_PIPELINE_PREFIX + 'affection'; // [NEW]
export const EOD_KEY_NOVEL_CHAPTERS = EOD_PIPELINE_PREFIX + 'novelChaptersSnapshot'; // [NEW]
export const EOD_KEY_PLAYER_PSYCHOANALYSIS_PROSE = EOD_PIPELINE_PREFIX + 'playerPsychoanalysisProse'; // [NEW]
export const EOD_KEY_NEW_CHRONICLE_ENTRIES = EOD_PIPELINE_PREFIX + 'newChronicleEntries';
export const EOD_KEY_NEWLY_INSPIRED_QUESTIONS = EOD_PIPELINE_PREFIX + 'newlyInspiredQuestions';
export const EOD_KEY_PLAYER_BACKSTORY = EOD_PIPELINE_PREFIX + 'playerBackstory';
export const EOD_KEY_NOVEL_CHAPTER_RAW = EOD_PIPELINE_PREFIX + 'novelChapterRawData';
export const EOD_KEY_ARCHIVIST_RAW = EOD_PIPELINE_PREFIX + 'archivistRawData';
export const EOD_KEY_UPDATED_FACT_SHEET = EOD_PIPELINE_PREFIX + 'updatedFactSheet';
export const EOD_KEY_UPDATED_SCHEDULE = EOD_PIPELINE_PREFIX + 'updatedSchedule';
export const EOD_KEY_UPDATED_CHARACTER_BIOGRAPHIES = EOD_PIPELINE_PREFIX + 'updatedCharacterBiographies';
export const EOD_KEY_UPDATED_CHARACTER_CHRONICLES = EOD_PIPELINE_PREFIX + 'updatedCharacterChronicles';
export const EOD_KEY_ARC_MANAGER_RAW = EOD_PIPELINE_PREFIX + 'arcManagerRawData';
export const EOD_KEY_PLANNER_RAW = EOD_PIPELINE_PREFIX + 'plannerRawData';
export const EOD_KEY_FINAL_ITINERARY_DAY = EOD_PIPELINE_PREFIX + 'finalItineraryForNextDay';
export const EOD_KEY_FINAL_EVOLVING_PERSONAS = EOD_PIPELINE_PREFIX + 'finalEvolvingPersonas';
export const EOD_KEY_FINAL_LIKES_DISLIKES = EOD_PIPELINE_PREFIX + 'finalLikesDislikes';
export const EOD_KEY_CHARACTER_TRAITS = EOD_PIPELINE_PREFIX + 'characterTraits'; // [NEW]
export const EOD_KEY_CHARACTER_DEVELOPER_RAW = EOD_PIPELINE_PREFIX + 'characterDeveloperRawData'; // [NEW]
export const EOD_KEY_FINAL_STORY_ARCS = EOD_PIPELINE_PREFIX + 'finalStoryArcs';
export const EOD_KEY_FINAL_SUBPLOTS = EOD_PIPELINE_PREFIX + 'finalSubplots';
export const EOD_KEY_TRANSLATION_RAW = EOD_PIPELINE_PREFIX + 'translationRawData';
export const EOD_KEY_TRANSLATED_NOVEL = EOD_PIPELINE_PREFIX + 'translatedNovelChapter';
export const EOD_KEY_TRANSLATED_PLAYER_PROSE = EOD_PIPELINE_PREFIX + 'translatedPlayerProse';
export const EOD_KEY_TRANSLATED_ITINERARY_DAY = EOD_PIPELINE_PREFIX + 'translatedItineraryForNextDay';
export const EOD_KEY_OPENING_SCENE_RAW = EOD_PIPELINE_PREFIX + 'openingSceneRawData';
export const EOD_KEY_FINAL_SCENE_MENTAL_MODEL = EOD_PIPELINE_PREFIX + 'finalSceneMentalModel';
export const EOD_KEY_PLAYTHROUGH_SUMMARIES = EOD_PIPELINE_PREFIX + 'playthroughSummaries';
export const EOD_KEY_ERRORS = EOD_PIPELINE_PREFIX + 'errors';
export const EOD_KEY_SEGMENT_ENDED = EOD_PIPELINE_PREFIX + 'segmentEnded';
export const EOD_KEY_DAY_CALENDAR = EOD_PIPELINE_PREFIX + 'dayCalendar';

// --- EOD Pipeline State Bucket (for caching/resume support) ---
export const EOD_KEY_PIPELINE_STATE_BUCKET = EOD_PIPELINE_PREFIX + 'pipelineStateBucket';

/**
 * Interface for the Pipeline State Bucket
 * Tracks accumulated AI outputs during EOD pipeline for resume/retry support.
 * This is ADDITIVE to existing pipeline step saving logic.
 */
export interface PipelineStateBucket {
    // Cache tracking
    cacheName?: string | null;              // Gemini cache resource name
    cacheModel?: string;                    // Model used to create the cache (for model-switch detection)
    cacheCreatedAt?: number;                // Timestamp for TTL checking
    
    // Accumulated updates from AI personas (for User Prompt injection)
    // These are the OUTPUTS from each step that subsequent steps need
    
    // From RelationshipAnalyst
    updated_relationship_dynamics?: string;
    updated_relationship_dynamics_structured?: any;
    updated_character_profiles?: Record<string, string>;
    new_chronicle_entries?: any[];
    newly_inspired_questions?: any[];
    modified_relationship_keys?: string[];
    
    // From CastAnalyst
    promotions?: any[];
    newly_canonized_side_characters?: any[];
    character_updates?: any[];
    
    // From Psychoanalyst  
    updated_player_profile?: { psychoanalysis?: string; backstory?: string };
    
    // Note: Novelist output (novel_chapter) is NOT included because subsequent personas don't use it
    
    // From CanonArchivist
    new_facts?: string[];
    
    // From ArcManager
    arc_updates?: any[];
    
    // From CharacterDeveloper
    evolving_personas?: Record<string, string>;
    updated_likes_dislikes?: any;
    
    // From NarrativeArchitect
    next_day_itinerary?: any;
    
    // From TransitionDirector
    opening_scene?: any;
}

// --- NEW GAME Pipeline Constants ---
export const NEW_GAME_STEP_KEY = 'vn_new_game_step_v6';
export const NEW_GAME_PIPELINE_PREFIX = 'vn_new_game_pipeline_v6_';
export const NEW_GAME_KEY_UI_TRANSLATIONS = NEW_GAME_PIPELINE_PREFIX + 'uiTranslations';
export const NEW_GAME_KEY_FOUNDATION = NEW_GAME_PIPELINE_PREFIX + 'initialStoryFoundation';
export const NEW_GAME_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED = NEW_GAME_PIPELINE_PREFIX + 'relationshipDynamicsStructuredGenesis';
export const NEW_GAME_KEY_INITIAL_TRAITS = NEW_GAME_PIPELINE_PREFIX + 'initialTraits'; // [NEW]
export const NEW_GAME_KEY_PLAYER_NAME = NEW_GAME_PIPELINE_PREFIX + 'playerName'; // [NEW]
export const NEW_GAME_KEY_FOUNDATION_NEW_CHARACTER = NEW_GAME_PIPELINE_PREFIX + 'foundationNewCharacter'; // [NEW] Character created by Narrative Architect
export const NEW_GAME_KEY_DAY_ONE_ITINERARY = NEW_GAME_PIPELINE_PREFIX + 'dayOneItinerary';
export const NEW_GAME_KEY_DAY_ONE_ITINERARY_TRANSLATED = NEW_GAME_PIPELINE_PREFIX + 'translatedItinerary';
export const NEW_GAME_KEY_OPENING_SCENE = NEW_GAME_PIPELINE_PREFIX + 'openingSceneData';
export const NEW_GAME_KEY_DAY_CALENDAR = NEW_GAME_PIPELINE_PREFIX + 'dayCalendar';
export const NEW_GAME_KEY_ERRORS = NEW_GAME_PIPELINE_PREFIX + 'errors';

// --- SEGMENT TRANSITION Pipeline Constants ---
export const SEGMENT_STEP_KEY = 'vn_segment_step_v6';
export const SEGMENT_PIPELINE_PREFIX = 'vn_segment_pipeline_v6_';
export const SEGMENT_KEY_UPDATED_FULL_HISTORY = SEGMENT_PIPELINE_PREFIX + 'updatedFullHistory';
export const SEGMENT_KEY_ANALYST_DATA = SEGMENT_PIPELINE_PREFIX + 'analystData';
export const SEGMENT_KEY_DIRECTOR_RESULT = SEGMENT_PIPELINE_PREFIX + 'directorResult';
export const SEGMENT_KEY_ERRORS = SEGMENT_PIPELINE_PREFIX + 'errors';
export const SEGMENT_KEY_RELATIONSHIP_KEYS_MODIFIED_TODAY = SEGMENT_PIPELINE_PREFIX + 'relationshipKeysModifiedToday';

// --- Playthrough Resumption Flag ---
export const IS_RESUMING_FLAG_KEY = 'vn_is_resuming_flag_v1';

// --- DM Cache Tracking (for cleanup at EOD start) ---
export const DM_CACHE_NAME_KEY = 'vn_dm_cache_name_v1';


// Deprecated keys for cleanup
const DEPRECATED_PIPELINE_DATA_PREFIX = 'vn_pipeline_data_v5_';
const DEPRECATED_EOD_STEP_KEY = 'vn_end_of_day_step_v5';
const DEPRECATED_SEGMENT_STEP_KEY = 'vn_segment_transition_step_v5';

// --- Helper Functions ---
export async function savePipelineData<T>(key: string, data: T | null | undefined): Promise<void> {
  try {
    if (data === null || data === undefined) {
      devDebug(`[Dexie Pipeline] Deleting key: ${key}`);
      await db.pipelineData.delete(key);
    } else {
      devDebug(`[Dexie Pipeline] Saving key: ${key}`);
      await db.pipelineData.put({ key: key, data: data });
    }
  } catch (e) {
    console.error(`[Dexie Error] Failed saving pipeline data for key ${key}:`, e);
  }
}

export async function loadPipelineData<T>(key: string): Promise<T | null> {
  try {
    devDebug(`[Dexie Pipeline] Loading key: ${key}`);
    const result = await db.pipelineData.get(key);
    if (result === undefined) {
        devDebug(`[Dexie Pipeline] Key not found: ${key}`);
        return null;
    }
    return result.data !== undefined ? (result.data as T) : null;
  } catch (e) {
    console.error(`[Dexie Error] Failed loading pipeline data for key ${key}:`, e);
    return null;
  }
}

// --- EOD Step/Error Functions ---
export async function saveCurrentEndOfDayStep(step: EndOfDayStep): Promise<void> {
  try { await db.stepData.put({ id: EOD_STEP_KEY, step: step }); }
  catch (e) { console.error(`[Dexie Error] Failed saving EOD step (${EOD_STEP_KEY}):`, e); }
}
export async function loadCurrentEndOfDayStep(): Promise<EndOfDayStep> {
  try {
    const result = await db.stepData.get(EOD_STEP_KEY);
    return result && typeof result.step === 'number' ? (result.step as EndOfDayStep) : EndOfDayStep.NOT_STARTED;
  } catch (e) { console.error(`[Dexie Error] Failed loading EOD step (${EOD_STEP_KEY}):`, e); return EndOfDayStep.NOT_STARTED; }
}
export async function saveEodErrors(errors: { [step in EndOfDayStep]?: string }): Promise<void> {
  try { await db.errorData.put({ id: EOD_KEY_ERRORS, errors: errors || {} }); }
  catch (e) { console.error(`[Dexie Error] Failed saving EOD errors (${EOD_KEY_ERRORS}):`, e); }
}
export async function loadEodErrors(): Promise<{ [step in EndOfDayStep]?: string } | null> {
  try {
    const result = await db.errorData.get(EOD_KEY_ERRORS);
    return result ? result.errors : null;
  } catch (e) { console.error(`[Dexie Error] Failed loading EOD errors (${EOD_KEY_ERRORS}):`, e); return null; }
}

// --- NEW GAME Step/Error Functions ---
export async function saveCurrentNewGameStep(step: NewGameStep): Promise<void> {
  try { await db.stepData.put({ id: NEW_GAME_STEP_KEY, step: step }); }
  catch (e) { console.error(`[Dexie Error] Failed saving New Game step (${NEW_GAME_STEP_KEY}):`, e); }
}
export async function loadCurrentNewGameStep(): Promise<NewGameStep> {
   try {
    const result = await db.stepData.get(NEW_GAME_STEP_KEY);
    return result && typeof result.step === 'number' ? (result.step as NewGameStep) : NewGameStep.NOT_STARTED;
  } catch (e) { console.error(`[Dexie Error] Failed loading New Game step (${NEW_GAME_STEP_KEY}):`, e); return NewGameStep.NOT_STARTED; }
}
export async function saveNewGameErrors(errors: { [step in NewGameStep]?: string }): Promise<void> {
   try { await db.errorData.put({ id: NEW_GAME_KEY_ERRORS, errors: errors || {} }); }
   catch (e) { console.error(`[Dexie Error] Failed saving New Game errors (${NEW_GAME_KEY_ERRORS}):`, e); }
}
export async function loadNewGameErrors(): Promise<{ [step in NewGameStep]?: string } | null> {
   try {
     const result = await db.errorData.get(NEW_GAME_KEY_ERRORS);
     return result ? result.errors : null;
   } catch (e) { console.error(`[Dexie Error] Failed loading New Game errors (${NEW_GAME_KEY_ERRORS}):`, e); return null; }
}

// --- SEGMENT TRANSITION Step/Error Functions ---
export async function saveCurrentSegmentTransitionStep(step: SegmentTransitionStep): Promise<void> {
   try { await db.stepData.put({ id: SEGMENT_STEP_KEY, step: step }); }
   catch (e) { console.error(`[Dexie Error] Failed saving Segment step (${SEGMENT_STEP_KEY}):`, e); }
}
export async function loadCurrentSegmentTransitionStep(): Promise<SegmentTransitionStep> {
   try {
     const result = await db.stepData.get(SEGMENT_STEP_KEY);
     if (result) {
        if (result.step === 0.5 || result.step === '0.5') return 0.5 as SegmentTransitionStep;
        if (typeof result.step === 'number') return result.step as SegmentTransitionStep;
     }
     return SegmentTransitionStep.NOT_STARTED;
   } catch (e) { console.error(`[Dexie Error] Failed loading Segment step (${SEGMENT_STEP_KEY}):`, e); return SegmentTransitionStep.NOT_STARTED; }
}
 export async function saveSegmentTransitionErrors(errors: { [step in SegmentTransitionStep]?: string }): Promise<void> {
   try { await db.errorData.put({ id: SEGMENT_KEY_ERRORS, errors: errors || {} }); }
   catch (e) { console.error(`[Dexie Error] Failed saving Segment errors (${SEGMENT_KEY_ERRORS}):`, e); }
}
export async function loadSegmentTransitionErrors(): Promise<{ [step in SegmentTransitionStep]?: string } | null> {
   try {
     const result = await db.errorData.get(SEGMENT_KEY_ERRORS);
     return result ? result.errors : null;
   } catch (e) { console.error(`[Dexie Error] Failed loading Segment errors (${SEGMENT_KEY_ERRORS}):`, e); return null; }
}

// --- EOD Pipeline State Bucket Functions ---
/**
 * Save the current pipeline state bucket for resume/retry support.
 * This is ADDITIVE to existing pipeline step saving - does not replace it.
 */
export async function savePipelineStateBucket(bucket: PipelineStateBucket): Promise<void> {
    try {
        await db.pipelineData.put({ key: EOD_KEY_PIPELINE_STATE_BUCKET, data: bucket });
        devDebug(`[Dexie Pipeline] Saved pipeline state bucket`);
    } catch (e) {
        console.error(`[Dexie Error] Failed saving pipeline state bucket:`, e);
    }
}

/**
 * Load the current pipeline state bucket for resume/retry.
 */
export async function loadPipelineStateBucket(): Promise<PipelineStateBucket | null> {
    try {
        const result = await db.pipelineData.get(EOD_KEY_PIPELINE_STATE_BUCKET);
        return result?.data as PipelineStateBucket ?? null;
    } catch (e) {
        console.error(`[Dexie Error] Failed loading pipeline state bucket:`, e);
        return null;
    }
}

/**
 * Clear the pipeline state bucket (called at day transition or when pipeline completes).
 */
export async function clearPipelineStateBucket(): Promise<void> {
    try {
        await db.pipelineData.delete(EOD_KEY_PIPELINE_STATE_BUCKET);
        devDebug(`[Dexie Pipeline] Cleared pipeline state bucket`);
    } catch (e) {
        console.error(`[Dexie Error] Failed clearing pipeline state bucket:`, e);
    }
}

// --- Playthrough Resumption Functions ---
export async function saveIsResumingFlag(value: boolean): Promise<void> {
  await savePipelineData(IS_RESUMING_FLAG_KEY, value);
}

export async function loadIsResumingFlag(): Promise<boolean> {
  const value = await loadPipelineData<boolean>(IS_RESUMING_FLAG_KEY);
  return value === true; // Ensure it's strictly a boolean true
}

export async function clearIsResumingFlag(): Promise<void> {
  await savePipelineData(IS_RESUMING_FLAG_KEY, null);
}

/**
 * Reset pipeline step/error trackers without deleting persisted pipeline data.
 * Use this when a pipeline finished successfully and we want to keep data like
 * structured dynamics, itineraries, traits, etc. available for resume/export.
 */
export async function clearPipelineStepsAndErrors(): Promise<void> {
  try {
    devLog("[Dexie Cleanup] Clearing stepData and errorData tables (preserving pipelineData).");
    await (db as Dexie).transaction('rw', db.stepData, db.errorData, async () => {
      await db.stepData.bulkPut([
        { id: EOD_STEP_KEY, step: EndOfDayStep.NOT_STARTED },
        { id: NEW_GAME_STEP_KEY, step: NewGameStep.NOT_STARTED },
        { id: SEGMENT_STEP_KEY, step: SegmentTransitionStep.NOT_STARTED },
      ]);
      await db.errorData.bulkPut([
         { id: EOD_KEY_ERRORS, errors: {} },
         { id: NEW_GAME_KEY_ERRORS, errors: {} },
         { id: SEGMENT_KEY_ERRORS, errors: {} },
      ]);
    });
  } catch (e) {
    console.error('[Dexie Error] Failed to clear pipeline steps/errors:', e);
  }
}

export async function clearAllPipelineData(): Promise<void> {
  try {
    devLog("[Dexie Cleanup] Clearing pipelineData, stepData, errorData tables.");
    // FIX: Add explicit (db as Dexie) cast to the transaction call to resolve
    // a potential transpilation issue causing a syntax error.
    await (db as Dexie).transaction('rw', db.pipelineData, db.stepData, db.errorData, async () => {
      await db.pipelineData.clear();
      await db.stepData.bulkPut([
        { id: EOD_STEP_KEY, step: EndOfDayStep.NOT_STARTED },
        { id: NEW_GAME_STEP_KEY, step: NewGameStep.NOT_STARTED },
        { id: SEGMENT_STEP_KEY, step: SegmentTransitionStep.NOT_STARTED },
      ]);
      await db.errorData.bulkPut([
         { id: EOD_KEY_ERRORS, errors: {} },
         { id: NEW_GAME_KEY_ERRORS, errors: {} },
         { id: SEGMENT_KEY_ERRORS, errors: {} },
      ]);
    });
    devLog("[Dexie Cleanup] Tables cleared and steps/errors reset.");

     devLog("[Dexie Cleanup] Removing deprecated localStorage keys...");
     localStorage.removeItem(DEPRECATED_EOD_STEP_KEY);
     localStorage.removeItem(DEPRECATED_SEGMENT_STEP_KEY);
     Object.keys(localStorage).forEach(key => {
       if (key.startsWith(DEPRECATED_PIPELINE_DATA_PREFIX)) {
          localStorage.removeItem(key);
       }
     });

  } catch (e) {
    console.error('[Dexie Error] Failed to clear pipeline data:', e);
  }
}

/**
 * Load a pipeline value by key, falling back to a provided default.
 */
export async function loadOr<T>(key: string, fallback: T): Promise<T> {
  const val = await loadPipelineData<T | null>(key);
  return (val !== undefined && val !== null) ? val : fallback;
}

/**
 * Load multiple pipeline keys at once; returns a map of key -> value (may be undefined).
 */
export async function loadMany(keys: string[]): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  for (const k of keys) {
    out[k] = await loadPipelineData<any>(k);
  }
  return out;
}


export async function clearAppState(): Promise<void> {
  try {
    await db.appState.clear();
    devLog('[Persistence] Main app state cleared from database.');
  } catch (e) {
    console.error('[Persistence] Failed to clear app state:', e);
  }
}

export function migrateV1StoryArcs(oldArcs: any[], currentCharacters: CharacterConfig[]): EvolvingStoryArc[] {
  devLog('Migrating legacy story arcs...');
  const characterNames = currentCharacters.map(c => c.name);

  return oldArcs.map((arc): EvolvingStoryArc => {
    const involvedCharacters = new Set<string>();
    const arcText = `${arc.title} ${arc.summary} ${arc.key_beats.join(' ')}`;
    for (const name of characterNames) {
      if (arcText.includes(name)) {
        involvedCharacters.add(name);
      }
    }

    return {
      id: uuidv4(),
      ownerId: 'System', // Legacy arcs are system-level
      title: arc.title,
      summary: arc.summary,
      involvedCharacters: Array.from(involvedCharacters),
      status: 'ongoing',
      startDay: 1,
      endDay: undefined,
    };
  });
}

const defaultBackgroundUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const daySegments = defaultDayStructure;

export async function loadInitialState(
    backendMainCharacters: CharacterConfig[],
    backendSideCharacters: CharacterConfig[],
    backendUiTranslations: TranslationSet
): Promise<AppState> {
  const cachedPlayerName = await loadPipelineData<string>(NEW_GAME_KEY_PLAYER_NAME);
  const APP_STATE_ID = 1;
  const defaultState: AppState = {
     mainCharacters: backendMainCharacters,
     sideCharacters: backendSideCharacters,
     history: [], fullHistory: [], sceneQueue: [], currentLine: null, backgroundUrl: defaultBackgroundUrl,
     playerName: cachedPlayerName || 'Player', affection: Object.fromEntries(backendMainCharacters.map(c => [c.name, 1])),
     currentDay: 1, currentSegment: daySegments[0], promptsToday: 0, affectionGainedToday: {},
     affectionLostToday: {}, evolvingPersonas: null, characterLikesDislikes: null, playerChoices: null,
     characterTraits: null,
     language: 'English', uiTranslations: backendUiTranslations, presentCharacterNames: [],
     characterStageSlots: Array(6).fill(null), characterExpressions: {}, fullItinerary: null,
     relationshipDynamics: null, relationshipDynamicsStructured: null, relationshipDynamicsStructuredTranslated: null,
     storyArcs: null, subplots: null, showMotivations: false,
     // Model selection MUST come from frontend settings - these placeholders will error if used
     modelSelection: { 
       dungeonMasterModel: 'ERROR_MODEL_NOT_CONFIGURED' as any, 
       storyModel: 'ERROR_MODEL_NOT_CONFIGURED' as any,
     },
     subplotAnalysis: null, factSheet: {}, totalInputTokens: 0, totalOutputTokens: 0, totalRequests: 0,
     psychologicalProfiles: null, novelChapters: [], playthroughSummaries: [], playerPsychoanalysisProse: null,
     playthroughCounter: 1, scheduledEvents: [], sceneMentalModel: null,
     originalMainCharacters: backendMainCharacters.map(c => c.name),
     originalSideCharacters: backendSideCharacters.map(c => c.name),
     availableGenericSetNames: genericSpriteSets.map(s => s.name),
     locationsBySegment: defaultLocationsBySegment,
     characterChronicles: {}, characterBiographies: {},
     endOfDayStep: EndOfDayStep.NOT_STARTED, newGameStep: NewGameStep.NOT_STARTED,
     openingSceneCache: null,
     apiKeys: Object.fromEntries(PROVIDERS.map(p => [p.id, ''])),
     isAwaitingSegmentTransition: false, segmentTransitionStep: SegmentTransitionStep.NOT_STARTED,
     isSegmentAnalysisComplete: false, isAwaitingNextSceneClick: false, isPipelineCompleteAndReady: false,
     isLoading: false, isAnalyzing: false, isDayTransitioning: false, isSegmentTransitioning: false,
     isGameCompleted: false, isDirectorLoading: false, isAnalystLoading: false, isUnrecoverableError: false,
     isPipelineResumePending: false,
     novelChaptersTranslated: undefined, playerPsychoanalysisProseTranslated: undefined,
     psychologicalProfilesTranslated: undefined, fullItineraryTranslated: undefined,
     playerChoicesTranslated: undefined, relationshipDynamicsTranslated: undefined, affectionLog: {},
     affectionLogTranslated: undefined, playerBackstory: null, unaskedQuestions: null,
     dayCalendar: null,
  };

  try {
    devDebug(`[Dexie Load] Attempting to load AppState ID: ${APP_STATE_ID}`);
    const savedDbState = await db.appState.get(APP_STATE_ID);

    const endOfDayStep = await loadCurrentEndOfDayStep();
    const segmentTransitionStep = await loadCurrentSegmentTransitionStep();
    const newGameStep = await loadCurrentNewGameStep();

    if (savedDbState) {
      devLog(`[Dexie Load] Found AppState ID: ${APP_STATE_ID}. Merging with defaults.`);
      const loaded = { ...defaultState, ...savedDbState.state, endOfDayStep, segmentTransitionStep, newGameStep };
      if (cachedPlayerName) {
        loaded.playerName = cachedPlayerName;
      }
      const migrated = migrateSaveFile(loaded);
      return migrated;
    } else {
        // --- START OF MIGRATION LOGIC (PHASE 5) ---
        devLog("[Dexie Migration] No Dexie state found, checking localStorage...");
        const oldSavedJson = localStorage.getItem(SAVED_STATE_KEY);
        if (oldSavedJson) {
            devLog("[Dexie Migration] Found old localStorage data. Migrating...");
            try {
                const oldParsedState = JSON.parse(oldSavedJson);
                const migratedState = migrateSaveFile(oldParsedState);

                // Apply current steps loaded from Dexie
                migratedState.endOfDayStep = endOfDayStep;
                migratedState.segmentTransitionStep = segmentTransitionStep;
                migratedState.newGameStep = newGameStep;

                devLog("[Dexie Migration] Saving migrated state to Dexie...");
                await db.appState.put({ id: APP_STATE_ID, state: migratedState });

                devLog("[Dexie Migration] Removing old localStorage key.");
                localStorage.removeItem(SAVED_STATE_KEY);

                return migratedState; // Return the successfully migrated state
            } catch (migrationError) {
                console.error("[Dexie Migration] Error migrating localStorage data:", migrationError);
                // Fallback to default state if migration fails
            }
        } else {
             devLog("[Dexie Migration] No localStorage data found either.");
        }
        // --- END OF MIGRATION LOGIC ---

      devLog(`[Dexie Load] No AppState found for ID: ${APP_STATE_ID}. Returning default state.`);
      return { ...defaultState, endOfDayStep, segmentTransitionStep, newGameStep };
    }
  } catch (e) {
    console.error("[Dexie Error] Critical error loading state:", e);
    alert("Error loading game data. Starting fresh. Check browser permissions for IndexedDB.");
     try {
       const endOfDayStep = await loadCurrentEndOfDayStep();
       const segmentTransitionStep = await loadCurrentSegmentTransitionStep();
       const newGameStep = await loadCurrentNewGameStep();
       return { ...defaultState, endOfDayStep, segmentTransitionStep, newGameStep };
     } catch (stepError) {
        console.error("Failed loading steps during critical fallback:", stepError);
        return defaultState;
     }
  }
}

export async function saveState(state: AppState): Promise<void> {
  const APP_STATE_ID = 1;
  try {
    const stateToSave: Partial<AppState> = { ...state };

    const finalApiKeys: { [provider: string]: string } = {};
    PROVIDERS.forEach(p => {
      finalApiKeys[p.id] = state.apiKeys[p.id] || '';
    });
    stateToSave.apiKeys = finalApiKeys;

    devDebug(`[Dexie Save] Saving AppState ID: ${APP_STATE_ID}`);
    await db.appState.put({ id: APP_STATE_ID, state: stateToSave as AppState });
    
    await saveCurrentEndOfDayStep(state.endOfDayStep);
    await saveCurrentSegmentTransitionStep(state.segmentTransitionStep);
    await saveCurrentNewGameStep(state.newGameStep);
    devDebug("[Dexie Save] AppState and current steps saved.");

  } catch (e) {
    console.error(`[Dexie Error] Failed to save state ID ${APP_STATE_ID}:`, e);
    alert("Error: Could not save game progress. Please check browser permissions for IndexedDB.");
  }
}

/**
 * Load character development data directly from the main game state in Dexie.
 * This is the source of truth - use this instead of React state (deps) for pipelines.
 * Returns null values if no game state exists yet.
 */
export async function loadCharacterDataFromMainState(): Promise<{
  evolvingPersonas: { [key: string]: string } | null;
  characterTraits: CharacterTraits | null;
  characterLikesDislikes: CharacterLikesDislikes | null;
}> {
  const APP_STATE_ID = 1;
  try {
    const savedDbState = await db.appState.get(APP_STATE_ID);
    if (!savedDbState?.state) {
      devWarn("[Dexie] No main game state found when loading character data");
      return { evolvingPersonas: null, characterTraits: null, characterLikesDislikes: null };
    }
    const state = savedDbState.state as AppState;
    return {
      evolvingPersonas: state.evolvingPersonas ?? null,
      characterTraits: state.characterTraits ?? null,
      characterLikesDislikes: state.characterLikesDislikes ?? null,
    };
  } catch (e) {
    console.error("[Dexie Error] Failed to load character data from main state:", e);
    return { evolvingPersonas: null, characterTraits: null, characterLikesDislikes: null };
  }
}

/**
 * Load visual state directly from the main game state in Dexie.
 * Used when returning from replay mode to restore background/characters.
 */
export async function loadVisualStateFromMainState(): Promise<{
  presentCharacterNames: string[];
  characterExpressions: { [key: string]: { set: string; expression: string } };
  backgroundUrl: string;
  currentLocationId: string | undefined;
}> {
  const APP_STATE_ID = 1;
  try {
    const savedDbState = await db.appState.get(APP_STATE_ID);
    if (!savedDbState?.state) {
      devWarn("[Dexie] No main game state found when loading visual state");
      return { presentCharacterNames: [], characterExpressions: {}, backgroundUrl: '', currentLocationId: undefined };
    }
    const state = savedDbState.state as AppState;
    return {
      presentCharacterNames: state.presentCharacterNames ?? [],
      characterExpressions: state.characterExpressions ?? {},
      backgroundUrl: state.backgroundUrl ?? '',
      currentLocationId: state.currentLocationId,
    };
  } catch (e) {
    console.error("[Dexie Error] Failed to load visual state from main state:", e);
    return { presentCharacterNames: [], characterExpressions: {}, backgroundUrl: '', currentLocationId: undefined };
  }
}

/**
 * Load factSheet directly from the main game state in Dexie.
 * Used as fallback when deps might be stale and pipeline key doesn't exist yet.
 */
export async function loadFactSheetFromMainState(): Promise<{ [day: number]: string[] }> {
  const APP_STATE_ID = 1;
  try {
    const savedDbState = await db.appState.get(APP_STATE_ID);
    if (!savedDbState?.state) {
      return {};
    }
    return (savedDbState.state as AppState).factSheet ?? {};
  } catch (e) {
    console.error("[Dexie Error] Failed to load factSheet from main state:", e);
    return {};
  }
}

/**
 * Load subplots directly from the main game state in Dexie.
 * Used as source of truth for pipeline steps where subplots haven't been updated yet.
 */
export async function loadSubplotsFromMainState(): Promise<Subplot[]> {
  const APP_STATE_ID = 1;
  try {
    const savedDbState = await db.appState.get(APP_STATE_ID);
    if (!savedDbState?.state) {
      return [];
    }
    return (savedDbState.state as AppState).subplots ?? [];
  } catch (e) {
    console.error("[Dexie Error] Failed to load subplots from main state:", e);
    return [];
  }
}
