import { postToCharacterDeveloper } from './apiService';
import { 
    ApiCallResult, 
    EvolvingStoryArc, 
    CharacterTraits, 
    CharacterLikesDislikes, 
    CharacterDeveloperAnalysis, 
    ModelSelection, 
    CharacterConfig 
} from '../types';

// [HELPER COPIES]
function serializeMainCharacter(character: CharacterConfig) {
    return {
        name: character.name,
        role: character.role,
        baseProfile: character.baseProfile,
    };
}

function serializeSideCharacter(character: CharacterConfig) {
    return {
        name: character.name,
        role: character.role,
        baseProfile: character.baseProfile,
    };
}

/**
 * Run character development (personas, traits, likes/dislikes)
 * 
 * @param cachedContentName Optional Gemini cache name for EOD pipeline
 * @param pipelineState Accumulated outputs from previous pipeline steps
 */
export async function runCharacterDeveloper(
    apiKeys: Record<string, string>,
    modelConfig: ModelSelection,
    storyName: string,
    currentDay: number,
    novelContext: string,
    recentDialogueTranscript: string,
    
    // [NEW] Context inputs
    updatedStoryArcs: EvolvingStoryArc[],
    evolvingPersonas: { [key: string]: string } | null,
    characterTraits: CharacterTraits | null,
    characterLikesDislikes: CharacterLikesDislikes | null,
    
    // [NEW] Context infrastructure inputs (Same as ArcManager)
    mainCharacters: CharacterConfig[],
    sideCharacters: CharacterConfig[],
    subplots: any[],
    characterChronicles: any,
    characterBiographies: { [characterName: string]: string } | null,
    psychologicalProfiles: any,
    relationshipDynamics: any,
    relationshipDynamicsStructured: any | null,
    playerPsychoanalysisProse: any,
    playerBackstory: any,
    factSheet: any,
    scheduledEvents: any,
    unaskedQuestions: any,
    affection: any,
    playerName: string,
    isGenesis: boolean = false, // [NEW] Optional flag
    forceModel?: string, // [NEW] Allow explicit model override
    apiKeysOverride?: Record<string, string>,
    cachedContentName?: string | null,
    pipelineState?: Record<string, any>
): Promise<ApiCallResult<CharacterDeveloperAnalysis>> {
    if (!isGenesis) {
        const hasBaselineTraits = characterTraits && Object.keys(characterTraits).length > 0;
        if (!hasBaselineTraits) {
            throw new Error("Missing character traits baseline before Character Developer call.");
        }
    }
    
    const mainCharPayload = mainCharacters.map(serializeMainCharacter); 
    const sideCharPayload = sideCharacters.map(serializeSideCharacter);

    const payload: Record<string, any> = {
        story: { name: storyName },
        currentDay,
        playerName,
        isGenesis, // [NEW] Pass to backend
        
        // Narrative Context
        hybridMemoryNovelContext: novelContext, // [STANDARDIZED] Was preProcessedNovelContext
        preProcessedTranscript: recentDialogueTranscript,
        
        // Narrative State
        storyArcs: updatedStoryArcs,
        subplots: subplots || [],
        
        // Character State (To be updated)
        evolvingPersonas,
        characterTraits,
        characterLikesDislikes,
        
        // Supporting Context
        characterChronicles,
        characterBiographies: characterBiographies || {},
        psychologicalProfiles,
        relationshipDynamics,
        relationshipDynamicsStructured: relationshipDynamicsStructured || null,
        playerPsychoanalysisProse,
        playerBackstory,
        factSheet,
        scheduledEvents,
        unaskedQuestions,
        affection,

        mainCharacters: mainCharPayload,
        sideCharacters: sideCharPayload,

        modelConfig: {
            storyModel: forceModel || modelConfig.storyModel || modelConfig.selectedModel,
            selectedModel: forceModel || modelConfig.storyModel || modelConfig.selectedModel, // Legacy fallback
        },
        apiKeys: apiKeysOverride ?? apiKeys,
    };

    // Add EOD pipeline caching parameters if provided
    if (cachedContentName) {
        payload.cachedContentName = cachedContentName;
    }
    if (pipelineState && Object.keys(pipelineState).length > 0) {
        payload.pipelineState = pipelineState;
    }

    const data = await postToCharacterDeveloper(payload);

    return {
        data,
        inputTokens: 0, // These are typically returned by the backend if tracked
        outputTokens: 0,
    };
}
