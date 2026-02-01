import * as geminiService from './geminiService';
import * as apiService from './apiService';
import * as novelistService from '../features/novelist/novelist.service';
import * as psychoanalystService from '../features/psychoanalyst/psychoanalyst.service';
import * as transitionDirectorService from '../features/transitionDirector/transitionDirector.service';
import * as relationshipAnalystService from '../features/relationshipAnalyst/relationshipAnalyst.service';
import { convertProfilesArrayToObject } from '../features/relationshipAnalyst/relationshipAnalyst.service';
import * as canonArchivistService from '../features/canonArchivist/canonArchivist.service';
import * as castAnalystService from '../features/castAnalyst/castAnalyst.service';
import * as arcManagerService from '../features/arcManager/arcManager.service';
import * as dungeonMasterService from '../features/dungeonMaster/dungeonMaster.service';
import * as persistenceService from './persistenceService';
import { getAvailableGenericSetInfo, findGenericSpriteSet } from '../lib/genericSprites';
import {
    EOD_STEP_KEY, EOD_KEY_FINAL_HISTORY, EOD_PIPELINE_PREFIX, EOD_KEY_ERRORS, EOD_KEY_SEGMENT_ENDED,
    EOD_KEY_CAST_ANALYST_RAW, EOD_KEY_UPDATED_MAIN_CHARS, EOD_KEY_UPDATED_SIDE_CHARS,
    EOD_KEY_UPDATED_AVAILABLE_SPRITES, EOD_KEY_PROMO_AFFECTION_PREFIX, EOD_KEY_NEWLY_PROMOTED_NAMES,
    EOD_KEY_RELATIONSHIP_ANALYST_RAW, EOD_KEY_PLAYER_ANALYSIS_RAW,
    EOD_KEY_MERGED_PROFILES, EOD_KEY_MERGED_PROFILES_TRANSLATED,
    EOD_KEY_RELATIONSHIP_DYNAMICS, EOD_KEY_RELATIONSHIP_DYNAMICS_TRANSLATED, EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED, EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED_TRANSLATED,
    EOD_KEY_PLAYER_BACKSTORY, EOD_KEY_NEW_CHRONICLE_ENTRIES, EOD_KEY_NEWLY_INSPIRED_QUESTIONS,
    EOD_KEY_NOVEL_CHAPTER_RAW, EOD_KEY_ARCHIVIST_RAW, EOD_KEY_UPDATED_FACT_SHEET, EOD_KEY_UPDATED_SCHEDULE,
    EOD_KEY_ARC_MANAGER_RAW, EOD_KEY_PLANNER_RAW, EOD_KEY_FINAL_ITINERARY_DAY, EOD_KEY_FINAL_EVOLVING_PERSONAS,
    EOD_KEY_FINAL_LIKES_DISLIKES, EOD_KEY_FINAL_STORY_ARCS, EOD_KEY_FINAL_SUBPLOTS,
    EOD_KEY_TRANSLATION_RAW, EOD_KEY_TRANSLATED_NOVEL, EOD_KEY_TRANSLATED_PLAYER_PROSE, EOD_KEY_TRANSLATED_ITINERARY_DAY,
    EOD_KEY_OPENING_SCENE_RAW, EOD_KEY_FINAL_SCENE_MENTAL_MODEL,
    NEW_GAME_STEP_KEY, NEW_GAME_PIPELINE_PREFIX, NEW_GAME_KEY_UI_TRANSLATIONS, NEW_GAME_KEY_FOUNDATION,
    NEW_GAME_KEY_DAY_ONE_ITINERARY, NEW_GAME_KEY_DAY_ONE_ITINERARY_TRANSLATED, NEW_GAME_KEY_OPENING_SCENE,
    NEW_GAME_KEY_ERRORS,
    SEGMENT_STEP_KEY, SEGMENT_PIPELINE_PREFIX, SEGMENT_KEY_UPDATED_FULL_HISTORY,
    SEGMENT_KEY_ANALYST_DATA, SEGMENT_KEY_DIRECTOR_RESULT, SEGMENT_KEY_ERRORS
} from './persistenceService';
import {
  AppState,
  ChronicleEntry,
  DailyItinerary,
  DayLog,
  DaySegment,
  DialogueEntry,
  EndOfDayStep,
  FullItinerary,
  GeminiModel,
  InitialStoryFoundation,
  ItinerarySegment,
  ModelSelection,
  NewGameStep,
  NextDayResponse,
  NovelChapter,
  ArcManagerAnalysis,
  PromptDayLog,
  PsychologicalProfiles,
  SegmentLog,
  SegmentTransitionStep,
  TransitionDirectorResponse,
  VnScene,
  PromptHistoryEntry,
  ApiCallResult,
  PlayerAnalysisResponse,
  SpriteSet,
  NewChronicleEntry,
  EndOfDayTranslationBundle,
  CharacterLikesDislikes,
  EvolvingStoryArc,
  Subplot,
  ScheduledEvent,
  SceneMentalModel,
  AiPersona,
  NarrativeArchitectNextDayPayload,
  CharacterConfig,
} from '../types';
import { isDailyItineraryValid, processItineraryPlaceholders } from '../lib/itineraryUtils';
import { mapFullHistoryForAI, mapHistoryForAI, sanitizeObject, assembleHybridMemory } from '../lib/promptUtils';
import { AVAILABLE_MODELS } from '../lib/modelConfig';
import { isCharacterMatch } from '../lib/characterUtils';

// FIX: Import TranslationSet from its source file.
import { TranslationSet } from '../lib/translations';
import { executeApiCallWithPolicy } from './geminiService';

export type GameFlowDeps = Omit<ReturnType<typeof import('../hooks/useGameLoop')['useGameLoop']>, 'state' | 'handlers' | 'uiState' | 'devState'> &
  ReturnType<typeof import('../hooks/useGameLoop')['useGameLoop']>['state'] &
  ReturnType<typeof import('../hooks/useGameLoop')['useGameLoop']>['handlers'] &
  ReturnType<typeof import('../hooks/useGameLoop')['useGameLoop']>['uiState'] &
  ReturnType<typeof import('../hooks/useGameLoop')['useGameLoop']>['devState'] &
  { promptHistory: PromptHistoryEntry[] };

export type Setters = GameFlowDeps & {
  setUiTranslations: (value: import('react').SetStateAction<TranslationSet>) => void;
  setPlaythroughSummaries: (value: import('react').SetStateAction<string[]>) => void;
  setCharacterBiographies: (value: import('react').SetStateAction<{ [key: string]: string }>) => void;
  setIsPipelineCompleteAndReady: (value: import('react').SetStateAction<boolean>) => void;
  setOpeningSceneCache: (value: import('react').SetStateAction<VnScene | null>) => void;
  startCountdown: (stepKey: string, seconds: number, type: 'success' | 'error' | 'timeout' | null) => void;
  waitForCountdown: () => Promise<void>;
};

export async function updateAndSaveError(setters: Setters, step: EndOfDayStep, message: string) { const currentErrors = await persistenceService.loadEodErrors() || {}; currentErrors[step] = message; await persistenceService.saveEodErrors(currentErrors); if (setters.setEndOfDayErrors) setters.setEndOfDayErrors(currentErrors); else console.error("setEndOfDayErrors setter missing!"); }

