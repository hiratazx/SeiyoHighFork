/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import {
    ApiCallResult,
    AppState,
    CharacterLikesDislikes,
    DayLog,
    GeminiModel,
    ItinerarySegment,
    ModelSelection,
    NovelChapter,
    PsychologicalProfiles,
    TransitionDirectorResponse,
    CharacterConfig,
    CharacterTraits,
    EvolvingStoryArc,
    Subplot,
    ScheduledEvent,
} from '../../types';
import { STORY_NAME } from '../../storyConfig';
import { englishStrings } from '../../lib/translations';
import { postToTransitionDirector } from '../../services/apiService';
import * as persistenceService from '../../services/persistenceService';
import {
    EOD_KEY_CHARACTER_TRAITS,
    EOD_KEY_FINAL_LIKES_DISLIKES,
    EOD_KEY_CHARACTER_CHRONICLES,
    EOD_KEY_CHARACTER_BIOGRAPHIES,
    EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED,
    EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED_TRANSLATED,
} from '../../services/persistenceService';
import { assembleHybridMemoryWithRecentPast, mapFullHistoryForAI, assembleVolumeAwareNovelContext } from '../../lib/promptUtils';
import { getKnownLocationIds, getGeneratedLocationSummaries } from '../../db';
import { devLog, devWarn } from '../../lib/devLog';
import { getRobustApiKeys } from '../../lib/apiKeyUtils';

/**
 * PRE-PROCESSES the state and sends a minimal payload to the backend proxy
 * for Transition Generation.
 * 
 * @param cachedContentName Optional Gemini cache name for EOD pipeline
 * @param pipelineState Accumulated outputs from previous pipeline steps
 */
async function getTransitionPayload(
    state: AppState,
    storyName: string,
    segmentThatJustEnded?: string, // The segment that just concluded (for Present Focus)
    cachedContentName?: string | null,
    pipelineState?: Record<string, any>,
    completedCurrentDayTranscript?: any[] // Pre-assembled complete current day transcript (for intra-day transitions)
): Promise<TransitionDirectorResponse> {
    devLog('TD Service: Pre-processing state for TransitionDirector...');

    const fullHistory = state.fullHistory || [];
    const currentDayLog = fullHistory.find(log => log.day === state.currentDay);
    
    // Build Recent Past: Last 2 days, explicitly excluding the current day so it only appears in <CurrentDayContext>
    const pastDays = fullHistory.filter(dayLog => dayLog.day < state.currentDay);
    const recentPastDays = pastDays.filter(dayLog => 
        dayLog.day >= state.currentDay - 2
    );
    
    // Build hybrid memory with the past days
    // This uses novelChapters for older history (Summaries/Prose) and recentPastDays for raw dialogue (Last 2 Days)
    const hybridMemoryNovelContext = assembleVolumeAwareNovelContext(
        state.novelChapters || [],
        state.playthroughSummaries || [],
        { recentTranscriptBuffer: 2 }
    );
    
    // Raw transcript for backend formatting
    const recentPastTranscript = mapFullHistoryForAI(recentPastDays);

    // Present Focus: The ENTIRE current day transcript
    // For intra-day: caller pre-assembles the complete day (previous segments + current segment)
    // For EOD: fullHistory already contains the complete day
    let presentFocusTranscript: any[] = [];
    
    if (completedCurrentDayTranscript && completedCurrentDayTranscript.length > 0) {
        // Use pre-assembled transcript from caller (intra-day transitions)
        presentFocusTranscript = completedCurrentDayTranscript;
    } else if (currentDayLog) {
        // Use fullHistory (EOD - day is complete and finalized)
        presentFocusTranscript = mapFullHistoryForAI([currentDayLog]);
    }

    const plan = state.currentItinerarySegment;
    if (!plan) {
        throw new Error('TransitionDirector: Cannot run without a current itinerary segment in state.');
    }

    const payload: Record<string, any> = {
        story: { name: storyName },
        language: state.language,
        plan,
        psychologicalProfiles: state.psychologicalProfiles || null,
        relationshipDynamics: state.relationshipDynamics || null,
        relationshipDynamicsStructured: state.relationshipDynamicsStructured || null,
        factSheet: state.factSheet || null,
        characterChronicles: state.characterChronicles || null,
        characterBiographies: state.characterBiographies || null,
        playerName: state.playerName,
        characterLikesDislikes: state.characterLikesDislikes || null, // [STANDARDIZED] Was likesDislikes
        evolvingPersonas: state.evolvingPersonas || null,
        characterTraits: state.characterTraits || null,
        affection: state.affection || {},
        playerPsychoanalysisProse: state.playerPsychoanalysisProse || null,
        playerBackstory: state.playerBackstory || null,
        hybridMemoryNovelContext,
        recentPastTranscript,
        presentFocusTranscript,
        // Strip base64 image blobs from characters - backend doesn't need them
        mainCharacters: (state.mainCharacters || []).map(({ image, ...rest }) => rest),
        sideCharacters: (state.sideCharacters || []).map(({ image, ...rest }) => rest),
        
        // [CACHE REBUILD] Additional fields for cache rebuilding
        currentDay: state.currentDay,
        currentSegment: state.currentSegment, // [NEW] For weather context
        storyArcs: state.storyArcs || [],
        subplots: state.subplotAnalysis || [],
        scheduledEvents: state.scheduledEvents || [],
        unaskedQuestions: state.unaskedQuestions || null,
        dayCalendar: state.dayCalendar || null, // [NEW] Weather/calendar system
        
        modelConfig: state.modelSelection,
        apiKeys: getRobustApiKeys(state.apiKeys),
    };

    // Add EOD pipeline caching parameters if provided
    if (cachedContentName) {
        payload.cachedContentName = cachedContentName;
    }
    if (pipelineState && Object.keys(pipelineState).length > 0) {
        payload.pipelineState = pipelineState;
    }

    // [NEW] Auto-hydrate missing character context from persistence if needed
    if (!payload.characterTraits || Object.keys(payload.characterTraits).length === 0) {
        // First try the primary EOD key
        let hydratedTraits = await persistenceService.loadPipelineData<CharacterTraits>(EOD_KEY_CHARACTER_TRAITS);
        
        // If still missing, try the fallback initial key
        if (!hydratedTraits || Object.keys(hydratedTraits).length === 0) {
             hydratedTraits = await persistenceService.loadPipelineData<CharacterTraits>(persistenceService.NEW_GAME_KEY_INITIAL_TRAITS);
        }

        if (hydratedTraits && Object.keys(hydratedTraits).length > 0) {
             devLog('TransitionDirector: Hydrated characterTraits from persistence.', Object.keys(hydratedTraits));
             payload.characterTraits = hydratedTraits;
        } else {
             devWarn('TransitionDirector: FAILED to hydrate characterTraits. They are truly missing.');
        }
    }

    // [STANDARDIZED] Was likesDislikes
    if (!payload.characterLikesDislikes || Object.keys(payload.characterLikesDislikes).length === 0) {
         const hydratedLikes = await persistenceService.loadPipelineData<CharacterLikesDislikes>(EOD_KEY_FINAL_LIKES_DISLIKES);
         if (hydratedLikes) payload.characterLikesDislikes = hydratedLikes;
    }

    if (!payload.characterChronicles || Object.keys(payload.characterChronicles).length === 0) {
        const hydratedChronicles = await persistenceService.loadPipelineData<{ [key: string]: any[] }>(EOD_KEY_CHARACTER_CHRONICLES);
        if (hydratedChronicles) payload.characterChronicles = hydratedChronicles;
    }

    if (!payload.characterBiographies || Object.keys(payload.characterBiographies).length === 0) {
        const hydratedBios = await persistenceService.loadPipelineData<{ [key: string]: string }>(EOD_KEY_CHARACTER_BIOGRAPHIES);
        if (hydratedBios) payload.characterBiographies = hydratedBios;
    }

    // Also try to hydrate structured dynamics if missing
    if (!payload.relationshipDynamicsStructured) {
         const hydratedStructured = await persistenceService.loadPipelineData<any>(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED);
         if (hydratedStructured) payload.relationshipDynamicsStructured = hydratedStructured;
    }

    // [GENERATIVE IMAGES] Populate known location IDs, summaries, and target segment from IndexedDB
    // Filter summaries by TARGET segment (the segment we're transitioning TO)
    const enableGenerativeImages = state.modelSelection?.enableGenerativeImages;
    if (enableGenerativeImages) {
        try {
            const targetSegment = plan.segment;
            const [knownIds, summaries] = await Promise.all([
                getKnownLocationIds(),
                getGeneratedLocationSummaries(targetSegment), // Filter by target segment
            ]);
            payload.clientContext = {
                knownLocationIds: knownIds,
                generatedLocationSummaries: summaries,
                // [FIX] Explicitly pass the target segment (from plan) for image generation lighting
                targetSegment: targetSegment,
            };
        } catch (error) {
            devWarn('[TransitionDirector] Failed to fetch known location data:', error);
            payload.clientContext = {
                knownLocationIds: [],
                generatedLocationSummaries: [],
                targetSegment: plan.segment,
            };
        }
    } else {
        // Even without generative images, set clientContext with targetSegment for potential future use
        payload.clientContext = {
            targetSegment: plan.segment,
        };
    }

    return postToTransitionDirector(payload);
}

/**
 * Wrapper function to maintain compatibility with the existing API signature.
 * All heavy lifting is delegated to the backend proxy.
 */
export async function runTransitionDirector(
    apiKeys: Record<string, string>,
    modelName: GeminiModel, // no longer used directly
    language: string,
    novelContext: string,
    recentPastTranscript: string,
    presentFocusTranscript: string,
    plan: ItinerarySegment,
    psychologicalProfiles: PsychologicalProfiles | null,
    relationshipDynamics: string | null,
    factSheet: { [day: number]: string[] } | null,
    characterChronicles: { [characterName: string]: any[] } | null,
    characterBiographies: { [characterName: string]: string } | null,
    playerName: string,
    likesDislikes: CharacterLikesDislikes | null,
    evolvingPersonas: { [key: string]: string } | null,
    characterTraits: CharacterTraits | null, // [NEW]
    affection: { [key: string]: number },
    playerPsychoanalysisProse: string | null,
    playerBackstory: string | null,
    mainCharacters: CharacterConfig[],
    sideCharacters: CharacterConfig[],
    fullHistory: DayLog[],
    novelChapters: NovelChapter[],
    playthroughSummaries: string[],
    currentDay: number,
    currentItinerarySegment: ItinerarySegment | null,
    modelSelection: ModelSelection,
    apiKeysInput: Record<string, string>,
    // [CACHE REBUILD] Additional fields for cache rebuilding
    storyArcs: EvolvingStoryArc[],
    subplots: Subplot[],
    scheduledEvents: ScheduledEvent[],
    unaskedQuestions: { [character: string]: string | undefined } | null,
    dayCalendar: import('../../types').DayCalendar | null, // [NEW] Weather/calendar system
    segmentThatJustEnded?: string, // The segment that just concluded
    overrideModel?: string,
    cachedContentName?: string | null,
    pipelineState?: Record<string, any>,
    completedCurrentDayTranscript?: any[] // Pre-assembled complete current day transcript (for intra-day)
): Promise<ApiCallResult<TransitionDirectorResponse>> {

    // Inject the SPECIFIC model for this attempt into the modelSelection
    const effectiveModelSelection = {
        ...modelSelection,
        narrativeArchitect: (overrideModel as GeminiModel) || modelSelection.narrativeArchitect
    };

    const minimalState: Partial<AppState> & {
        language: string;
        novelChapters: NovelChapter[];
        fullHistory: DayLog[];
        currentDay: number;
        currentSegment: string;
        currentItinerarySegment: ItinerarySegment | null;
        psychologicalProfiles: PsychologicalProfiles | null;
        relationshipDynamics: string | null;
        factSheet: { [day: number]: string[] } | null;
        characterChronicles: { [characterName: string]: any[] } | null;
        characterBiographies: { [characterName: string]: string } | null;
        playerName: string;
        characterLikesDislikes: CharacterLikesDislikes | null;
        evolvingPersonas: { [key: string]: string } | null;
        characterTraits: CharacterTraits | null; // [NEW]
        affection: { [key: string]: number };
        playerPsychoanalysisProse: string | null;
        playerBackstory: string | null;
        mainCharacters: CharacterConfig[];
        sideCharacters: CharacterConfig[];
        playthroughSummaries: string[];
        modelSelection: ModelSelection;
        apiKeys: Record<string, string>;
    } = {
        language,
        novelChapters,
        fullHistory,
        currentDay,
        currentSegment: segmentThatJustEnded || plan.segment, // Use segment that just ended, fallback to next segment
        currentItinerarySegment: currentItinerarySegment ?? plan,
        psychologicalProfiles,
        relationshipDynamics,
        factSheet: factSheet ?? {},
        characterChronicles: characterChronicles ?? {},
        characterBiographies: characterBiographies ?? {},
        playerName,
        characterLikesDislikes: likesDislikes,
        evolvingPersonas,
        characterTraits, // [NEW]
        affection,
        playerPsychoanalysisProse,
        playerBackstory,
        mainCharacters,
        sideCharacters,
        playthroughSummaries,
        modelSelection: effectiveModelSelection,
        apiKeys: apiKeysInput,
        // CRITICAL: Pass current segment dialogue for intra-day transitions
        // This is combined with fullHistory in getTransitionPayload to form presentFocusTranscript
        history: [], // Will be populated below if we have current segment data
        sceneQueue: [],
        currentLine: null,
        backgroundUrl: '',
        promptsToday: 0,
        affectionGainedToday: {},
        affectionLostToday: {},
        playerChoices: null,
        uiTranslations: englishStrings,
        presentCharacterNames: [],
        characterStageSlots: [],
        characterExpressions: {},
        fullItinerary: null,
        relationshipDynamicsTranslated: null,
        dayCalendar, // [NEW] Weather/calendar system
        storyArcs: storyArcs || [],
        showMotivations: false,
        subplotAnalysis: subplots || [],
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalRequests: 0,
        playthroughCounter: 0,
        scheduledEvents: scheduledEvents || [],
        sceneMentalModel: null,
        originalMainCharacters: [],
        availableGenericSetNames: [],
        affectionLog: {},
        unaskedQuestions: unaskedQuestions,
        openingSceneCache: null,
    };

    const data = await getTransitionPayload(
        minimalState as AppState, 
        STORY_NAME, 
        segmentThatJustEnded,
        cachedContentName,
        pipelineState,
        completedCurrentDayTranscript // Pre-assembled complete current day (for intra-day)
    );

    return {
        data,
        inputTokens: 0,
        outputTokens: 0,
    };
}
