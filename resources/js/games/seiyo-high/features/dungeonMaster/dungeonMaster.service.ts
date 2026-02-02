/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import {
  VnScene,
  DaySegment,
  FullItinerary,
  CharacterLikesDislikes,
  GeminiModel,
  PsychologicalProfiles,
  ItinerarySegment,
  EvolvingStoryArc,
  DayLog,
  NovelChapter,
  SceneMentalModel,
  DialogueEntry,
  AppState,
  PromptHistoryEntry,
  CharacterTraits,
  Subplot,
} from '../../types';
import { postToDungeonMaster } from '../../services/apiService';
import * as persistenceService from '../../services/persistenceService';
import { getKnownLocationIds, getGeneratedLocationSummaries, getGeneratedLocation } from '../../db';
import { devLog, devWarn } from '../../lib/devLog';
import {
    EOD_KEY_CHARACTER_TRAITS,
    EOD_KEY_FINAL_LIKES_DISLIKES,
    EOD_KEY_FINAL_EVOLVING_PERSONAS,
    EOD_KEY_CHARACTER_CHRONICLES,
    EOD_KEY_CHARACTER_BIOGRAPHIES,
    EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED,
    EOD_KEY_FINAL_SUBPLOTS,
    SEGMENT_KEY_RELATIONSHIP_KEYS_MODIFIED_TODAY,
} from '../../services/persistenceService';
import { assembleHybridMemory, assembleVolumeAwareNovelContext, mapFullHistoryForAI } from '../../lib/promptUtils';
import { getRobustApiKeys } from '../../lib/apiKeyUtils';

/**
 * NEW ARCHITECTURE:
 * This function PRE-PROCESSES the DATA and sends a minimal
 * payload to the backend. The backend assembles the prompt.
 */
// Return type now includes hydrated data for React state restoration
export interface GenerateSceneResult {
  scene: VnScene;
  hydratedData?: {
    characterTraits?: CharacterTraits;
    characterLikesDislikes?: CharacterLikesDislikes;
    evolvingPersonas?: { [key: string]: string };
  };
  /** DM cache name from backend - track this to delete cache at EOD start */
  dmCacheName?: string;
}

export async function generateSceneFromState(
  state: AppState,
  storyName: string,
  currentUserInput: string // The raw text from the user
): Promise<GenerateSceneResult> {

  devLog("DM Service: Pre-processing data on client...");

  // ---
  // 1. FRONTEND pre-processing: Hybrid Memory Components
  // ---

  // Part A: Long Term Context
  const hybridMemoryNovelContext = assembleVolumeAwareNovelContext(
    state.novelChapters,
    state.playthroughSummaries,
    { recentTranscriptBuffer: 2 }
  );

  // Part B: Recent Short Term (Last 2 Days)
  const recencyWindow = 2;
  const recentDays = state.fullHistory.filter(dayLog =>
    dayLog.day >= state.currentDay - recencyWindow && dayLog.day < state.currentDay
  );
  const recentPastTranscript = mapFullHistoryForAI(recentDays);

  // Part C: Today's *previous* segments
  const currentDayLog = state.fullHistory.find(log => log.day === state.currentDay);
  let currentDayPreviousTranscript: any[] = [];
  if (currentDayLog && currentDayLog.segments.length > 0) {
      currentDayPreviousTranscript = mapFullHistoryForAI([currentDayLog]);
  }

  // ---
  // 2. Player Profile: Send raw fields, backend assembles after decryption
  // ---
  
  // ---
  // 3. FRONTEND pre-processing: Story Arcs (data string)
  // ---
  const storyArcsString = state.storyArcs 
    ? JSON.stringify(state.storyArcs, null, 2)
    : 'No overarching story arcs are currently active.';

  // ---
  // 4. FRONTEND pre-processing: User Prompt (data string)
  // ---
  // THIS IS THE FIX: Use state.history directly, not state.history.slice(-20)
  // This sends the *entire current segment's* dialogue as the user prompt.
  const recentHistory = state.history; 
  const transcript = recentHistory
    .map((h) => `${h.speaker}: ${h.dialogue}`)
    .join('\n');
  const userPromptString = `${transcript}\n\n${state.playerName}: ${currentUserInput}`;

  // ---
  // 5. FRONTEND pre-processing: Next Itinerary Segment
  // ---
  const currentSegmentIndex = (state.worldConfig?.day_structure || []).indexOf(state.currentSegment);
  let nextItinerarySegment = null;
  if (currentSegmentIndex !== -1 && state.fullItinerary) {
      const itineraryForToday = state.fullItinerary[state.currentDay - 1];
      // Find the actual NEXT segment from the itinerary, looking ahead in the day_structure
      const dayStructure = state.worldConfig?.day_structure || [];
      if (currentSegmentIndex < dayStructure.length - 1) {
          const nextSegmentName = dayStructure[currentSegmentIndex + 1];
          nextItinerarySegment = itineraryForToday?.segments.find(s => s.segment === nextSegmentName) || null;
      }
  }

  // =========================================================================
  // [ARCHITECTURE FIX] DEXIE-FIRST LOADING
  // =========================================================================
  // Critical character context fields are loaded from Dexie FIRST, with React
  // state as fallback. This ensures we always use the persisted source of truth,
  // not potentially stale React state.
  // =========================================================================
  
  // Load critical fields from Dexie first, fall back to React state
  const [
    dexieTraits,
    dexieLikes,
    dexiePersonas,
    dexieChronicles,
    dexieBiographies,
    dexieStructuredDynamics,
    dexieSubplots,
  ] = await Promise.all([
    persistenceService.loadPipelineData<CharacterTraits>(EOD_KEY_CHARACTER_TRAITS),
    persistenceService.loadPipelineData<CharacterLikesDislikes>(EOD_KEY_FINAL_LIKES_DISLIKES),
    persistenceService.loadPipelineData<{ [key: string]: string }>(EOD_KEY_FINAL_EVOLVING_PERSONAS),
    persistenceService.loadPipelineData<{ [key: string]: any[] }>(EOD_KEY_CHARACTER_CHRONICLES),
    persistenceService.loadPipelineData<{ [key: string]: string }>(EOD_KEY_CHARACTER_BIOGRAPHIES),
    persistenceService.loadPipelineData<any>(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED),
    persistenceService.loadPipelineData<Subplot[]>(EOD_KEY_FINAL_SUBPLOTS),
  ]);

  // Track what came from Dexie so we can sync React state if needed
  const hydratedData: GenerateSceneResult['hydratedData'] = {};
  
  // Use Dexie data, fall back to React state only if Dexie is empty
  const characterTraits = dexieTraits || state.characterTraits;
  const characterLikesDislikes = dexieLikes || state.characterLikesDislikes;
  const evolvingPersonas = dexiePersonas || state.evolvingPersonas;
  const characterChronicles = dexieChronicles || state.characterChronicles;
  const characterBiographies = dexieBiographies || state.characterBiographies;
  const relationshipDynamicsStructured = dexieStructuredDynamics || state.relationshipDynamicsStructured;
  const subplots = dexieSubplots || state.subplots;

  // Track hydrated data for React state sync (only if Dexie had data that React didn't)
  if (dexieTraits && (!state.characterTraits || Object.keys(state.characterTraits).length === 0)) {
    hydratedData.characterTraits = dexieTraits;
  }
  if (dexieLikes && (!state.characterLikesDislikes || Object.keys(state.characterLikesDislikes).length === 0)) {
    hydratedData.characterLikesDislikes = dexieLikes;
  }
  if (dexiePersonas && (!state.evolvingPersonas || Object.keys(state.evolvingPersonas).length === 0)) {
    hydratedData.evolvingPersonas = dexiePersonas;
  }

  // 6. Build the MINIMAL payload - only pre-processed DATA strings and IP-less character arrays
  const payload = {
    story: { name: storyName },
    
    // PRE-PROCESSED DATA STRINGS (backend will inject these into its secure prompt template)
    preProcessedMemory: null, // [DEPRECATED] - using split components below
    hybridMemoryNovelContext,
    recentPastTranscript,
    currentDayPreviousTranscript,
    
    // Player profile: raw fields for backend assembly after decryption
    playerBackstory: state.playerBackstory,
    playerPsychoanalysisProse: state.playerPsychoanalysisProse,
    preProcessedStoryArcs: storyArcsString,
    preProcessedUserPrompt: userPromptString,
    
    // IP-LESS character arrays (backend will hydrate with secret IP from database)
    // Strip base64 image blobs - backend doesn't need them
    mainCharacters: (state.mainCharacters || []).map(({ image, ...rest }) => rest),
    sideCharacters: (state.sideCharacters || []).map(({ image, ...rest }) => rest),

    // Other state data backend needs for assembly
    playerName: state.playerName,
    currentDay: state.currentDay,
    currentSegment: state.currentSegment,
    currentSegmentHistory: state.history,
    language: state.language,
    affection: state.affection,
    affectionGainedToday: state.affectionGainedToday,
    affectionLostToday: state.affectionLostToday,
    promptsToday: state.promptsToday,
    psychologicalProfiles: state.psychologicalProfiles,
    itinerary: state.fullItinerary ? state.fullItinerary[state.currentDay - 1] : null,
    relationshipDynamics: state.relationshipDynamics,
    relationshipDynamicsStructured, // ← FROM DEXIE FIRST
    characterLikesDislikes,         // ← FROM DEXIE FIRST
    evolvingPersonas,               // ← FROM DEXIE FIRST
    factSheet: state.factSheet,
    characterChronicles,            // ← FROM DEXIE FIRST
    characterBiographies,           // ← FROM DEXIE FIRST
    unaskedQuestions: state.unaskedQuestions,
    sceneMentalModel: state.sceneMentalModel,
    nextItinerarySegment: nextItinerarySegment,
    locationsBySegment: (state as any).locationsBySegment,
    characterTraits,                // ← FROM DEXIE FIRST
    playthroughSummaries: state.playthroughSummaries,
    dayCalendar: state.dayCalendar,
    subplots: subplots,  // ← FROM DEXIE FIRST

    modelConfig: {
      dungeonMasterModel: state.modelSelection.dungeonMasterModel,
      selectedModel: state.modelSelection.selectedModel,
      enableGenerativeImages: state.modelSelection.enableGenerativeImages,
      imageStyleMode: state.modelSelection.imageStyleMode,
      imagenModel: state.modelSelection.imagenModel,
    },
    apiKeys: getRobustApiKeys(state.apiKeys),
    
    // [GENERATIVE IMAGES] Context for image generation
    currentLocationId: (state as any).currentLocationId,
    currentLocationDescription: (state as any).currentLocationDescription,
    clientContext: {
      aspectRatio: (state as any).aspectRatio || '16:9',
      knownLocationIds: [] as string[],
      generatedLocationSummaries: [] as any[],
    },
  };

  // Hydrate structured dynamics if still missing (shouldn't happen with Dexie-first)
  if (!payload.relationshipDynamicsStructured) {
      const hydratedStructured = await persistenceService.loadPipelineData<any>(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED);
      if (hydratedStructured) payload.relationshipDynamicsStructured = hydratedStructured;
  }

  // Fetch relationship keys modified today for user prompt override
  const relationshipKeysModifiedToday = await persistenceService.loadPipelineData<string[]>(SEGMENT_KEY_RELATIONSHIP_KEYS_MODIFIED_TODAY) || [];
  (payload as any).relationshipKeysModifiedToday = relationshipKeysModifiedToday;

  // [GENERATIVE IMAGES] Populate known location IDs and summaries from IndexedDB
  // Filter summaries by current segment - only show locations for Morning, Afternoon, etc.
  if (payload.modelConfig.enableGenerativeImages) {
    try {
      const currentSegment = state.currentSegment;
      const [knownIds, summaries] = await Promise.all([
        getKnownLocationIds(),
        getGeneratedLocationSummaries(currentSegment), // Filter by segment
      ]);
      payload.clientContext.knownLocationIds = knownIds;
      payload.clientContext.generatedLocationSummaries = summaries;
      
      // [FIX] Look up the ACTUAL description from IndexedDB for the current location
      // This ensures we have the correct description even if React state is stale
      if (payload.currentLocationId) {
        const currentLocation = await getGeneratedLocation(payload.currentLocationId);
        if (currentLocation?.prompt) {
          payload.currentLocationDescription = currentLocation.prompt;
        }
      }
    } catch (error) {
      devWarn('[DungeonMaster] Failed to fetch known location data:', error);
      payload.clientContext.knownLocationIds = [];
      payload.clientContext.generatedLocationSummaries = [];
    }
  }

  // 6. Call the BACKEND - it will hydrate characters and assemble the prompt
  try {
    const sceneResponse = await postToDungeonMaster(payload);
    
    // Extract DM cache name from response (backend adds _cacheName for tracking)
    const dmCacheName = (sceneResponse as any)._cacheName;
    if (dmCacheName) {
      delete (sceneResponse as any)._cacheName; // Remove from scene data
    }
    
    // Return scene, hydrated data, and cache name for tracking
    return {
      scene: sceneResponse as VnScene,
      hydratedData: Object.keys(hydratedData).length > 0 ? hydratedData : undefined,
      dmCacheName,
    };
  } catch (error) {
    console.error("DungeonMaster API Call Failed");
    throw error;
  }
}
