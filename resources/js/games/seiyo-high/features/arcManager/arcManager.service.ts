/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import {
    ApiCallResult,
    CharacterLikesDislikes,
    EvolvingStoryArc,
    PsychologicalProfiles,
    Subplot,
    ArcManagerAnalysis,
    ModelSelection,
    ScheduledEvent,
    CharacterConfig,
    CharacterTraits,
    AiModelId,
} from '../../types';
import { postToArcManager } from '../../services/apiService';

function isStockCharacter(name: string): boolean {
    return false; // Deprecated check, always false now that configs are dynamic
}

function serializeMainCharacter(character: CharacterConfig) {
    if (isStockCharacter(character.name)) {
        return { name: character.name, role: character.role };
    }

    const payload: {
        name: string;
        role: string;
        baseProfile: string;
        appearance?: string;
    } = {
        name: character.name,
        role: character.role,
        baseProfile: character.baseProfile,
    };

    if (character.appearance) {
        payload.appearance = character.appearance;
    }

    return payload;
}

function serializeSideCharacter(character: CharacterConfig) {
    if (isStockCharacter(character.name)) {
        return { name: character.name, role: character.role };
    }

    return {
        name: character.name,
        role: character.role,
        baseProfile: character.baseProfile,
        appearance: character.appearance,
    };
}

function resolveArcManagerModel(modelConfig: ModelSelection): string {
    // Use storyModel for EOD pipeline personas
    return modelConfig.storyModel || modelConfig.selectedModel;
}

/**
 * Manage story arcs and subplots
 * 
 * @param cachedContentName Optional Gemini cache name for EOD pipeline
 * @param pipelineState Accumulated outputs from previous pipeline steps
 */
export async function manageArcsAndSubplots(
    apiKeys: Record<string, string>,
    modelConfig: ModelSelection,
    storyName: string,
    currentDay: number,
    novelContext: string,
    previousDaysTranscript: any[], // [FIX] Previous 2 days transcript (context)
    currentDayTranscript: any[], // [FIX] Current day transcript (subject for analysis)
    endOfDayProfiles: PsychologicalProfiles,
    originalStoryArcs: EvolvingStoryArc[],
    playerName: string,
    subplots: Subplot[] | null,
    relationshipDynamics: string | null,
    relationshipDynamicsStructured: any | null,
    evolvingPersonas: { [key: string]: string } | null,
    characterTraits: CharacterTraits | null, // [NEW]
    characterLikesDislikes: CharacterLikesDislikes | null,
    factSheet: { [day: number]: string[] },
    characterChronicles: { [characterName: string]: any[] } | null,
    characterBiographies: { [characterName: string]: string } | null,
    scheduledEvents: ScheduledEvent[],
    unaskedQuestions: { [characterName: string]: string | undefined } | null,
    affection: { [key: string]: number },
    playerPsychoanalysisProse: string | null,
    playerBackstory: string | null,
    mainCharacters: CharacterConfig[],
    sideCharacters: CharacterConfig[],
    charactersNeedingArcs: string[],
    todaysItinerary: any | null, // [NEW] Today's planned itinerary for beat tracking
    overrideModel?: string,
    cachedContentName?: string | null,
    pipelineState?: Record<string, any>
): Promise<ApiCallResult<ArcManagerAnalysis>> {
    const arcManagerModel = (overrideModel as AiModelId) || resolveArcManagerModel(modelConfig);
    const mainCharPayload = mainCharacters.map(serializeMainCharacter);
    const sideCharPayload = sideCharacters.map(serializeSideCharacter);

    const payload: Record<string, any> = {
        story: { name: storyName },
        currentDay,
        playerName,

        hybridMemoryNovelContext: novelContext, // [STANDARDIZED] Was preProcessedNovelContext
        previousDaysTranscript: previousDaysTranscript, // [FIX] Previous days for context
        currentDayTranscript: currentDayTranscript, // [FIX] Current day for analysis

        psychologicalProfiles: endOfDayProfiles,
        storyArcs: originalStoryArcs,
        subplots: subplots || [],
        relationshipDynamics,
        relationshipDynamicsStructured: relationshipDynamicsStructured || null,
        evolvingPersonas,
        characterTraits: characterTraits || {}, // [NEW]
        characterLikesDislikes,
        factSheet,
        characterChronicles,
        characterBiographies,
        scheduledEvents,
        unaskedQuestions,
        affection,

        playerPsychoanalysisProse,
        playerBackstory,
        charactersNeedingArcs,
        todaysItinerary, // [NEW] Today's planned itinerary for beat tracking

        mainCharacters: mainCharPayload,
        sideCharacters: sideCharPayload,

        modelConfig: {
            storyModel: arcManagerModel,
            selectedModel: arcManagerModel, // Legacy fallback
        },
        apiKeys,
    };

    // Add EOD pipeline caching parameters if provided
    if (cachedContentName) {
        payload.cachedContentName = cachedContentName;
    }
    if (pipelineState && Object.keys(pipelineState).length > 0) {
        payload.pipelineState = pipelineState;
    }

    const data = await postToArcManager(payload);

    return {
        data,
        inputTokens: 0,
        outputTokens: 0,
    };
}