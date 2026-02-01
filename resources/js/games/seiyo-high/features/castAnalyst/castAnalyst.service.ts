import { postToCastAnalyst } from '../../services/apiService';
import { STORY_NAME } from '../../storyConfig';
import { devLog } from '../../lib/devLog';
import { AppState, NovelChapter, DayLog, ApiCallResult, GeminiModel, ModelSelection, CharacterConfig, CharacterTraits, CharacterLikesDislikes, ChronicleEntry, EvolvingStoryArc, Subplot, PsychologicalProfiles } from '../../types';
import { getAvailableGenericSetInfo } from '../../lib/genericSprites';
import { mapFullHistoryForAI, assembleVolumeAwareNovelContext } from '../../lib/promptUtils';
import { englishStrings } from '../../lib/translations';

// --- DELETE THE OLD INTERFACE AND IMPORTS (executeApiCall, Type, etc.) ---
// export interface CastAnalystResponse { ... }

function getAvailableSetsString(availableSets: { name: string, description: string }[]): string {
  return availableSets.length > 0
    ? availableSets.map(s => `- Name: "${s.name}", Description: "${s.description}"`).join('\n')
    : 'None available.';
}

function getSpritelessSideCharactersString(spritelessSideCharacters: string[]): string {
  return spritelessSideCharacters.length > 0
    ? spritelessSideCharacters.join(', ')
    : 'None.';
}

function getCharactersWithPlaceholderNamesString(charactersWithPlaceholderNames: string[]): string {
  return charactersWithPlaceholderNames.length > 0
    ? charactersWithPlaceholderNames.join(', ')
    : 'None.';
}

/**
 * NEW ARCHITECTURE:
 * This function PRE-PROCESSES the state and sends a minimal
 * payload to the backend proxy.
 * 
 * @param state The current game state
 * @param storyName The story name
 * @param cachedContentName Optional Gemini cache name for EOD pipeline
 * @param pipelineState Accumulated outputs from previous pipeline steps
 */
export async function getCastAnalysis(
  state: AppState,
  storyName: string,
  cachedContentName?: string | null,
  pipelineState?: Record<string, any>
): Promise<any> { // The response type will be what the backend returns

  devLog('CA Service: Pre-processing state for CastAnalyst...');

  // ---
  // 1. FRONTEND pre-processing: Self-Contained Hybrid Memory
  // ---
  const dayThatJustEnded = state.currentDay;
  const fullHistory = state.fullHistory || [];

  const dayThatJustEndedLog = fullHistory.filter(log => log.day === dayThatJustEnded);
  // Do NOT stringify here. Send the structured array object.
  // The backend will handle the formatting to text via formatTranscriptForPrompt.
  let preProcessedFocusTranscript: any[] = []; 
  if (dayThatJustEndedLog.length > 0) {
    preProcessedFocusTranscript = mapFullHistoryForAI(dayThatJustEndedLog);
  }

  // [FIX] Use assembleVolumeAwareNovelContext instead of assembleHybridMemory 
  // to avoid including raw JSON transcript in the historical context.
  // The transcript is already passed separately as preProcessedFocusTranscript.
  const hybridMemoryNovelContext = assembleVolumeAwareNovelContext(
    state.novelChapters || [],
    state.playthroughSummaries || [],
    { recentTranscriptBuffer: 1 } // Exclude the current day (which is sent as focus transcript)
  );


  // 2. FRONTEND pre-processing: Gather other data points
  // (This is the existing logic from your file)
  const mainCharacters = state.mainCharacters;
  const sideCharacters = state.sideCharacters;
  const playerName = state.playerName;
  const relationshipDynamics = state.relationshipDynamics;

  const originalMainCharacters = state.originalMainCharacters || [];
  const availableSets = getAvailableGenericSetInfo(state.availableGenericSetNames || []);
  const spritelessSideCharacters = state.sideCharacters.filter(c => !c.image).map(c => c.name);
  const placeholderNameMatchers = /('s dad|'s mom|'s mother|'s father|dad|mom)$/i;
  const charactersWithPlaceholderNames = state.sideCharacters
    .filter(c => placeholderNameMatchers.test(c.name))
    .map(c => c.name);

  // 3. Call helpers to get pre-processed strings
  const availableSetsString = getAvailableSetsString(availableSets);
  const spritelessSideCharactersString = getSpritelessSideCharactersString(spritelessSideCharacters);
  const charactersWithPlaceholderNamesString = getCharactersWithPlaceholderNamesString(charactersWithPlaceholderNames);
  
  // 4. Build the MINIMAL payload
  const payload: Record<string, any> = {
    story: { name: storyName },
    
    // --- Send ALL data points the backend builder will need ---
    
    // RAW DATA
    playerName: playerName,
    relationshipDynamics: relationshipDynamics,
    relationshipDynamicsStructured: state.relationshipDynamicsStructured || null,
    originalMainCharacters: originalMainCharacters,
    originalSideCharacters: state.originalSideCharacters || [],
    currentDay: state.currentDay, // <-- Send currentDay
    
    // CHARACTER CONTEXT (for the builder)
    evolvingPersonas: state.evolvingPersonas,
    characterTraits: state.characterTraits,
    characterLikesDislikes: state.characterLikesDislikes,
    characterBiographies: state.characterBiographies,
    characterChronicles: state.characterChronicles,
    
    // [CACHE REBUILD] Additional fields for cache rebuilding
    factSheet: state.factSheet || {},
    affection: state.affection || {},
    psychologicalProfiles: state.psychologicalProfiles || null,
    playerPsychoanalysisProse: state.playerPsychoanalysisProse || null,
    playerBackstory: state.playerBackstory || null,
    storyArcs: state.storyArcs || [],
    subplots: state.subplotAnalysis || [],
    
    // PRE-PROCESSED STRINGS
    preProcessedFocusTranscript: preProcessedFocusTranscript,       // <-- NEW
    hybridMemoryNovelContext: hybridMemoryNovelContext, // [STANDARDIZED] Was preProcessedHistoricalContext
    availableSetsString: availableSetsString,
    spritelessSideCharactersString: spritelessSideCharactersString,
    charactersWithPlaceholderNamesString: charactersWithPlaceholderNamesString,

    // IP-LESS CHARACTER ARRAYS (for hydration)
    // Strip base64 image blobs - backend doesn't need them
    mainCharacters: (mainCharacters || []).map(({ image, ...rest }) => rest),
    sideCharacters: (sideCharacters || []).map(({ image, ...rest }) => rest),

    // Config keys
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

  // 5. Call the BACKEND proxy
  return await postToCastAnalyst(payload);
}

/**
 * Wrapper function to maintain compatibility with the old API signature.
 * This function is called from gameFlowService.ts through executeApiCallWithPolicy.
 * 
 * @param apiKey - The Gemini API key
 * @param modelConfig - The model configuration (not used directly, passed through to backend)
 * @param dayLogForToday - The day log for the current day
 * @param mainCharacters - Array of main characters
 * @param sideCharacters - Array of side characters
 * @param playerName - The player's name
 * @param relationshipDynamics - Relationship dynamics string
 * @param relationshipDynamicsStructured - Structured relationship dynamics object
 * @param originalMainCharacters - Array of original main character names
 * @param originalSideCharacters - Array of original side character names
 * @param availableSets - Available generic sprite sets
 * @param spritelessSideCharacters - Array of side character names without sprites
 * @param charactersWithPlaceholderNames - Array of character names with placeholders
 * @param fullHistory - Full history of all days (required for context)
 * @param novelChapters - Array of novel chapters (required for context)
 * @param currentDay - The current day number
 * @param modelSelection - The model selection configuration
 * @param apiKeys - The API keys object
 * @param evolvingPersonas - Character evolving personas
 * @param characterTraits - Character traits
 * @param characterLikesDislikes - Character likes/dislikes
 * @param characterBiographies - Character biographies
 * @param characterChronicles - Character chronicles
 * @param playthroughSummaries - Playthrough summaries for volumes
 * @param cachedContentName - Optional Gemini cache name for EOD pipeline
 * @param pipelineState - Accumulated outputs from previous pipeline steps
 * @returns ApiCallResult with the cast analysis data
 */
export async function runCastAnalyst(
    apiKey: string,
    modelConfig: GeminiModel,
    dayLogForToday: DayLog,
    mainCharacters: CharacterConfig[],
    sideCharacters: CharacterConfig[],
    playerName: string,
    relationshipDynamics: string,
    relationshipDynamicsStructured: any | null,
    originalMainCharacters: string[],
    originalSideCharacters: string[],
    availableSets: { name: string, description: string }[],
    spritelessSideCharacters: string[],
    charactersWithPlaceholderNames: string[],
    fullHistory: DayLog[],
    novelChapters: NovelChapter[],
    currentDay: number,
    modelSelection: ModelSelection,
    apiKeys: Record<string, string>,
    // [FIX] Add character context parameters
    evolvingPersonas: { [key: string]: string } | null,
    characterTraits: CharacterTraits | null,
    characterLikesDislikes: CharacterLikesDislikes | null,
    characterBiographies: { [key: string]: string } | null,
    characterChronicles: { [key: string]: ChronicleEntry[] } | null,
    playthroughSummaries: string[],
    // [CACHE REBUILD] Additional fields for cache rebuilding
    factSheet: { [day: number]: string[] },
    affection: { [key: string]: number },
    psychologicalProfiles: PsychologicalProfiles | null,
    playerPsychoanalysisProse: string | null,
    playerBackstory: string | null,
    storyArcs: EvolvingStoryArc[],
    subplots: Subplot[],
    // [NEW] EOD Pipeline caching parameters
    cachedContentName?: string | null,
    pipelineState?: Record<string, any>
): Promise<ApiCallResult<any>> {
    // NOTE: fullHistory and novelChapters are ONLY used internally by getCastAnalysis
    // to build pre-processed strings. They are NEVER sent to the backend.
    // The backend only receives:
    // - preProcessedFocusTranscript (Day N full dialogue transcript)
    // - preProcessedHistoricalContext (the four-tier hybrid memory: volumes, brutal summaries, prose chapters, and recent transcripts)
    // - Character arrays (for hydration, no dialogue)
    // - Config/metadata
    
    // Construct a minimal AppState-like object for getCastAnalysis
    // We inject the SPECIFIC model for this attempt into the modelSelection
    // so the backend knows which model to use for CastAnalyst.
    const effectiveModelSelection = {
        ...modelSelection,
        castAnalyst: modelConfig // This is the specific model for this attempt (e.g. Flash)
    };

    const minimalState: Partial<AppState> & {
        mainCharacters: CharacterConfig[];
        sideCharacters: CharacterConfig[];
        playerName: string;
        relationshipDynamics: string | null;
        relationshipDynamicsStructured: any | null;
        originalMainCharacters: string[];
        originalSideCharacters: string[];
        availableGenericSetNames: string[];
        fullHistory: DayLog[];
        novelChapters: NovelChapter[];
        currentDay: number;
        modelSelection: any; // Use any to allow extra properties like castAnalyst
        apiKeys: Record<string, string>;
        playthroughSummaries: string[];
    } = {
        mainCharacters,
        sideCharacters,
        playerName,
        relationshipDynamics: relationshipDynamics || null,
        relationshipDynamicsStructured: relationshipDynamicsStructured || null,
        originalMainCharacters,
        originalSideCharacters,
        availableGenericSetNames: availableSets.map(s => s.name),
        fullHistory,
        novelChapters,
        currentDay,
        modelSelection: effectiveModelSelection,
        apiKeys,
        playthroughSummaries,
        // Add minimal required fields to satisfy AppState type
        history: [],
        sceneQueue: [],
        currentLine: null,
        backgroundUrl: '',
        affection: affection || {},
        currentSegment: 'morning' as any,
        promptsToday: 0,
        affectionGainedToday: {},
        affectionLostToday: {},
        // [FIX] Use passed character context data instead of null/empty
        evolvingPersonas: evolvingPersonas,
        characterTraits: characterTraits,
        characterLikesDislikes: characterLikesDislikes,
        characterBiographies: characterBiographies || {},
        characterChronicles: characterChronicles || {},
        playerChoices: null,
        language: 'en',
        uiTranslations: englishStrings,
        presentCharacterNames: [],
        characterStageSlots: [],
        characterExpressions: {},
        fullItinerary: null,
        storyArcs: storyArcs || [],
        showMotivations: false,
        subplotAnalysis: subplots || [],
        factSheet: factSheet || {},
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalRequests: 0,
        psychologicalProfiles: psychologicalProfiles,
        playerPsychoanalysisProse: playerPsychoanalysisProse,
        playerBackstory: playerBackstory,
        playthroughCounter: 0,
        scheduledEvents: [],
        sceneMentalModel: null,
        endOfDayStep: 0 as any,
    };

    // Call the new getCastAnalysis function
    const data = await getCastAnalysis(
        minimalState as AppState, 
        STORY_NAME,
        cachedContentName,
        pipelineState
    );

    // Return in ApiCallResult format
    // Note: Token counts are not available from the backend currently, so we return 0
    // This can be improved later if the backend is updated to return usage metadata
    return {
        data,
        inputTokens: 0,
        outputTokens: 0,
    };
}
