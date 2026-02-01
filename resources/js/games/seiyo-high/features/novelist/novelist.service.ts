/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
/* tslint:disable */
import {
    ApiCallResult,
    PromptDayLog,
    AiModelId,
    PsychologicalProfiles,
    NovelChapter,
    CharacterTraits,
    CharacterLikesDislikes,
    ChronicleEntry,
    EvolvingStoryArc,
    Subplot,
    CharacterConfig,
} from '../../types';
import { postToNovelist } from '../../services/apiService';
import { STORY_NAME } from '../../storyConfig';
import { devLog } from '../../lib/devLog';

/**
 * Generate a novel chapter for the current day
 * 
 * @param cachedContentName Optional Gemini cache name for EOD pipeline
 * @param pipelineState Accumulated outputs from previous pipeline steps
 * @param recentNovelChapters Previous 2 days' novel chapters for continuity (special Novelist requirement)
 */
export async function generateNovelChapter(
    apiKeys: Record<string, string>,
    modelName: AiModelId,
    hybridNovelContext: string,
    dayFullHistory: PromptDayLog[],
    startOfDayProfiles: PsychologicalProfiles | null,
    endOfDayProfiles: PsychologicalProfiles,
    evolvingPersonas: { [key: string]: string } | null,
    relationshipDynamics: string | null,
    relationshipDynamicsStructured: any | null = null,
    affection: { [key: string]: number },
    playerPsychoanalysisProse: string | null,
    playerBackstory: string | null,
    playerName: string,
    dayNumber: number,
    characterTraits: CharacterTraits | null,
    // [CACHE REBUILD] Additional fields for cache rebuilding
    factSheet: { [day: number]: string[] },
    characterLikesDislikes: CharacterLikesDislikes | null,
    characterBiographies: { [characterName: string]: string } | null,
    characterChronicles: { [characterName: string]: ChronicleEntry[] } | null,
    storyArcs: EvolvingStoryArc[],
    subplots: Subplot[],
    mainCharacters: CharacterConfig[],
    sideCharacters: CharacterConfig[],
    // Optional caching params
    cachedContentName?: string | null,
    pipelineState?: Record<string, any>,
    recentNovelChapters?: string,
    language: string = 'English' // [FIX] Language for translation
): Promise<ApiCallResult<NovelChapter>> {

    devLog('Novelist Service: Pre-processing state for Backend Proxy...');

    const payload: Record<string, any> = {
        clientData: {
            language, // [FIX] Pass language for translation
            hybridMemoryNovelContext: hybridNovelContext, // [STANDARDIZED] Was preProcessedNovelContext
            dayFullHistory: dayFullHistory,

            startOfDayProfiles: startOfDayProfiles,
            endOfDayProfiles: endOfDayProfiles,
            evolvingPersonas: evolvingPersonas,
            characterTraits: characterTraits || {},
            relationshipDynamics: relationshipDynamics,
            relationshipDynamicsStructured: relationshipDynamicsStructured || null,
            affection: affection,
            playerPsychoanalysisProse: playerPsychoanalysisProse,
            playerBackstory: playerBackstory,
            playerName: playerName,
            currentDay: dayNumber, // [STANDARDIZED] Was dayNumber
            recentNovelChapters: recentNovelChapters || '', // For cached mode continuity
            
            // [CACHE REBUILD] Additional fields for cache rebuilding
            factSheet: factSheet || {},
            characterLikesDislikes: characterLikesDislikes || {},
            characterBiographies: characterBiographies || {},
            characterChronicles: characterChronicles || {},
            storyArcs: storyArcs || [],
            subplots: subplots || [],
            mainCharacters: mainCharacters.map(c => ({ name: c.name, role: c.role, baseProfile: c.baseProfile })),
            sideCharacters: sideCharacters.map(c => ({ name: c.name, role: c.role, baseProfile: c.baseProfile })),
            
            modelConfig: {
                storyModel: modelName,
                selectedModel: modelName, // Legacy fallback
            },
            apiKeys: apiKeys
        },
        storyName: STORY_NAME 
    };

    // Add EOD pipeline caching parameters if provided
    if (cachedContentName) {
        payload.cachedContentName = cachedContentName;
    }
    if (pipelineState && Object.keys(pipelineState).length > 0) {
        payload.pipelineState = pipelineState;
    }

    try {
        const result = await postToNovelist(payload);
        return {
            data: result,
            inputTokens: 0,
            outputTokens: 0
        };
    } catch (error: any) {
        console.error("Novelist Backend Error:", error);
        throw error;
    }
}
