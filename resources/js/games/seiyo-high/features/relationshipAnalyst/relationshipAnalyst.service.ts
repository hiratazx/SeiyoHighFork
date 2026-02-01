/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
/* tslint:disable */

import { postToRelationshipAnalyst } from '../../services/apiService';
import { STORY_NAME } from '../../storyConfig';
import { devLog } from '../../lib/devLog';
import * as persistenceService from '../../services/persistenceService';
import {
  AppState,
  ApiCallResult,
  GeminiModel,
  AiModelId,
  ModelSelection,
  CharacterConfig,
  DayLog,
  NovelChapter,
  PsychologicalProfiles,
  DaySegment,
  NewChronicleEntry,
  ChronicleEntry,
  CharacterTraits,
  CharacterLikesDislikes,
} from '../../types';
import { mapFullHistoryForAI, assembleVolumeAwareNovelContext } from '../../lib/promptUtils';
import { englishStrings } from '../../lib/translations';

// Raw API response format (array of objects)
export interface CharacterProfileItem {
  name: string;
  profile: string;
}

export interface StateAnalysisResponse {
  updated_relationship_dynamics: string;
  updated_relationship_dynamics_translated?: string;
  updated_relationship_dynamics_structured?: any;
  updated_relationship_dynamics_structured_translated?: any;
  updated_character_profiles: CharacterProfileItem[]; // Changed from object to array
  updated_character_profiles_translated?: CharacterProfileItem[]; // Changed from object to array
  newly_inspired_questions?: Array<{ character: string; question: string }>;
  new_chronicle_entries?: NewChronicleEntry[];
  modified_relationship_keys?: string[]; // Keys that were actually modified (from deltas)
}

/**
 * Converts the array format from the API to the object format expected by the rest of the codebase.
 */
export function convertProfilesArrayToObject(
  profilesArray: CharacterProfileItem[] | Record<string, string> | undefined
): Partial<PsychologicalProfiles> {
  const result: Partial<PsychologicalProfiles> = {};

  // Map/object form (returned by backend after merge)
  if (profilesArray && !Array.isArray(profilesArray) && typeof profilesArray === 'object') {
    Object.entries(profilesArray).forEach(([name, profile]) => {
      if (typeof name === 'string' && typeof profile === 'string') {
        result[name] = profile;
      }
    });
    return result;
  }

  // Array form (raw AI response)
  if (Array.isArray(profilesArray)) {
  for (const item of profilesArray) {
      if ((item as any)?.name && (item as any)?.profile) {
        result[(item as any).name] = (item as any).profile;
      }
    }
  }

  return result;
}

export interface RelationshipAnalystRequest {
  language: string;
  relationshipDynamics: string | null;
  relationshipDynamicsStructured?: any | null;
  relationshipDynamicsStructuredTranslated?: any | null;
  storyArcs?: any | null;
  subplots?: any | null;
  isGenesis?: boolean;
  psychologicalProfiles: PsychologicalProfiles | null;
  fullHistory: DayLog[];
  novelChapters: NovelChapter[];
  currentDay: number;
  currentSegment: DaySegment;
  evolvingPersonas: { [key: string]: string } | null;
  characterTraits: CharacterTraits | null;
  characterLikesDislikes?: CharacterLikesDislikes | null;
  characterChronicles?: { [characterName: string]: ChronicleEntry[] } | null;
  characterBiographies?: { [characterName: string]: string } | null;
  factSheet?: { [day: number]: string[] } | null; // [FIX] Added missing factSheet
  playerPsychoanalysisProse: string | null;
  playerBackstory: string | null;
  mainCharacters: CharacterConfig[];
  sideCharacters: CharacterConfig[];
  playerName: string;
  modelSelection: ModelSelection;
  apiKeys: Record<string, string>;
  storyName?: string;
  playthroughSummaries: string[];
}

/**
 * PRE-PROCESSES the state and sends a minimal payload to the backend proxy
 * for Relationship Analysis.
 * 
 * @param cachedContentName Optional Gemini cache resource name for EOD pipeline
 * @param pipelineState Accumulated outputs from previous pipeline steps
 */
export async function getRelationshipAnalysis(
  state: AppState,
  storyName: string,
  cachedContentName?: string | null,
  pipelineState?: Record<string, any>
): Promise<any> {
  devLog('RA Service: Pre-processing state for RelationshipAnalyst...');

  const fullHistory = state.fullHistory || [];
  const todayLogs = fullHistory.filter(dayLog => dayLog.day === state.currentDay);

  const segmentLogs = todayLogs
    .map(dayLog => ({
      ...dayLog,
      segments: dayLog.segments.filter(segment => segment.segment === state.currentSegment),
    }))
    .filter(dayLog => dayLog.segments.length > 0);

  const fullDayTranscript = mapFullHistoryForAI(todayLogs);
  const segmentToEndTranscript = mapFullHistoryForAI(segmentLogs);

  const fullDayTranscriptString = fullDayTranscript.length > 0
    ? JSON.stringify(fullDayTranscript, null, 2)
    : '[]';

  const segmentToEndTranscriptString = segmentToEndTranscript.length > 0
    ? JSON.stringify(segmentToEndTranscript, null, 2)
    : '[]';

  // [FIX] Use assembleVolumeAwareNovelContext (no embedded raw JSON transcript)
  // The transcript is already passed separately as recentTranscript.
  const hybridMemoryNovelContext = assembleVolumeAwareNovelContext(
    state.novelChapters || [],
    state.playthroughSummaries || [],
    { recentTranscriptBuffer: 2 }
  );

  const recencyWindow = 2;
  const recentDays = fullHistory.filter(dayLog =>
    dayLog.day >= state.currentDay - recencyWindow && dayLog.day < state.currentDay
  );
  const recentTranscript = recentDays.length > 0 ? mapFullHistoryForAI(recentDays) : [];

  // [HYDRATION FALLBACK]
  // For EOD pipeline calls, data is pre-loaded in gameFlowService.ts and passed here.
  // This hydration is kept as a safety net for non-EOD calls (segment transitions, genesis)
  // where data might not have been pre-loaded from pipeline keys.
  
  let characterTraits = state.characterTraits;
  if (!characterTraits || Object.keys(characterTraits).length === 0) {
      characterTraits = await persistenceService.loadPipelineData<CharacterTraits>(persistenceService.EOD_KEY_CHARACTER_TRAITS)
          ?? await persistenceService.loadPipelineData<CharacterTraits>(persistenceService.NEW_GAME_KEY_INITIAL_TRAITS)
          ?? {};
  }

  let characterLikesDislikes = state.characterLikesDislikes;
  if (!characterLikesDislikes || Object.keys(characterLikesDislikes).length === 0) {
      characterLikesDislikes = await persistenceService.loadPipelineData<CharacterLikesDislikes>(persistenceService.EOD_KEY_FINAL_LIKES_DISLIKES) ?? {};
  }

  let characterChronicles = state.characterChronicles;
  if (!characterChronicles || Object.keys(characterChronicles).length === 0) {
      characterChronicles = await persistenceService.loadPipelineData<{ [key: string]: ChronicleEntry[] }>(persistenceService.EOD_KEY_UPDATED_CHARACTER_CHRONICLES)
          ?? await persistenceService.loadPipelineData<{ [key: string]: ChronicleEntry[] }>(persistenceService.EOD_KEY_CHARACTER_CHRONICLES)
          ?? {};
  }

  let characterBiographies = state.characterBiographies;
  if (!characterBiographies || Object.keys(characterBiographies).length === 0) {
      characterBiographies = await persistenceService.loadPipelineData<{ [key: string]: string }>(persistenceService.EOD_KEY_UPDATED_CHARACTER_BIOGRAPHIES)
          ?? await persistenceService.loadPipelineData<{ [key: string]: string }>(persistenceService.EOD_KEY_CHARACTER_BIOGRAPHIES)
          ?? {};
  }

  const payload: Record<string, any> = {
    story: { name: storyName },
    language: state.language,
    previousSummary: state.relationshipDynamics || null,
    previousRelationshipDynamicsStructured: state.relationshipDynamicsStructured || null,
    previousRelationshipDynamicsStructuredTranslated: state.relationshipDynamicsStructuredTranslated || null,
    storyArcs: (state as any).storyArcs || [],
    subplots: (state as any).subplots || [],
    isGenesis: (state as any).isGenesis || false,
    previousProfiles: state.psychologicalProfiles || null,
    evolvingPersonas: state.evolvingPersonas || null,
    characterTraits: characterTraits,
    characterLikesDislikes: characterLikesDislikes,
    characterChronicles: characterChronicles,
    characterBiographies: characterBiographies,
    currentDay: state.currentDay,
    segmentToEnd: state.currentSegment,
    playerPsychoanalysisProse: state.playerPsychoanalysisProse || null,
    playerBackstory: state.playerBackstory || null,
    playerName: state.playerName,
    hybridMemoryNovelContext,
    recentTranscript,
    fullDayTranscriptString,
    segmentToEndTranscriptString,
    // Strip base64 image blobs - backend doesn't need them
    mainCharacters: (state.mainCharacters || []).map(({ image, ...rest }) => rest),
    sideCharacters: (state.sideCharacters || []).map(({ image, ...rest }) => rest),
    // [CACHE REBUILD FIX] Added missing fields for complete cache rebuilding
    factSheet: state.factSheet || {},
    affection: state.affection || {},
    modelConfig: state.modelSelection,
    apiKeys: state.apiKeys,
  };

  // Add EOD pipeline caching parameters if provided
  if (cachedContentName) {
    payload.cachedContentName = cachedContentName;
  }
  if (pipelineState && Object.keys(pipelineState).length > 0) {
    payload.pipelineState = pipelineState;
  }

  return postToRelationshipAnalyst(payload);
}

/**
 * Wrapper function used by the game flow pipeline to call the backend proxy.
 * 
 * @param cachedContentName Optional Gemini cache resource name for EOD pipeline
 * @param pipelineState Accumulated outputs from previous pipeline steps (not used by RA since it's first)
 */
export async function runRelationshipAnalyst(
  request: RelationshipAnalystRequest & { 
    overrideModel?: AiModelId;
    cachedContentName?: string | null;
    pipelineState?: Record<string, any>;
  }
): Promise<ApiCallResult<StateAnalysisResponse>> {
  // Inject the SPECIFIC model for this attempt into the modelSelection
  const effectiveModelSelection = {
      ...request.modelSelection,
      relationshipAnalyst: request.overrideModel || request.modelSelection.narrativeArchitect // Default to Story model
  };

  const minimalState: Partial<AppState> & {
    language: string;
    relationshipDynamics: string | null;
    relationshipDynamicsStructured?: any | null;
    relationshipDynamicsStructuredTranslated?: any | null;
    psychologicalProfiles: PsychologicalProfiles | null;
    fullHistory: DayLog[];
    novelChapters: NovelChapter[];
    currentDay: number;
    currentSegment: DaySegment;
    evolvingPersonas: { [key: string]: string } | null;
    characterTraits: CharacterTraits | null; // [NEW]
    playerPsychoanalysisProse: string | null;
    playerBackstory: string | null;
    mainCharacters: CharacterConfig[];
    sideCharacters: CharacterConfig[];
    playerName: string;
    modelSelection: any; // Use any to allow extra properties
    apiKeys: Record<string, string>;
    playthroughSummaries: string[];
  } = {
    language: request.language,
    relationshipDynamics: request.relationshipDynamics,
    relationshipDynamicsStructured: request.relationshipDynamicsStructured,
    relationshipDynamicsStructuredTranslated: request.relationshipDynamicsStructuredTranslated,
    psychologicalProfiles: request.psychologicalProfiles,
    fullHistory: request.fullHistory,
    novelChapters: request.novelChapters,
    currentDay: request.currentDay,
    currentSegment: request.currentSegment,
    evolvingPersonas: request.evolvingPersonas,
    characterTraits: request.characterTraits, // [NEW]
    characterLikesDislikes: request.characterLikesDislikes ?? null,
    characterChronicles: request.characterChronicles ?? {},
    characterBiographies: request.characterBiographies ?? {},
    playerPsychoanalysisProse: request.playerPsychoanalysisProse,
    playerBackstory: request.playerBackstory,
    mainCharacters: request.mainCharacters,
    sideCharacters: request.sideCharacters,
    playerName: request.playerName,
    modelSelection: effectiveModelSelection,
    apiKeys: request.apiKeys,
    playthroughSummaries: request.playthroughSummaries ?? [],
    history: [],
    sceneQueue: [],
    currentLine: null,
    backgroundUrl: '',
    affection: {},
    promptsToday: 0,
    affectionGainedToday: {},
    affectionLostToday: {},
    playerChoices: null,
    uiTranslations: englishStrings,
    presentCharacterNames: [],
    characterStageSlots: [],
    characterExpressions: {},
    fullItinerary: null,
    storyArcs: request.storyArcs ?? null,
    subplots: request.subplots ?? [],
    showMotivations: false,
    subplotAnalysis: null,
    factSheet: request.factSheet ?? {},
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalRequests: 0,
    playthroughCounter: 0,
    scheduledEvents: [],
    sceneMentalModel: null,
    endOfDayStep: 0 as any,
    originalMainCharacters: [],
    availableGenericSetNames: [],
  };
  (minimalState as any).isGenesis = request.isGenesis ?? false;

  const data = await getRelationshipAnalysis(
    minimalState as AppState, 
    request.storyName ?? STORY_NAME,
    request.cachedContentName,
    request.pipelineState
  );

  return {
    data,
    inputTokens: 0,
    outputTokens: 0,
  };
}


