/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
/* tslint:disable */
import {
    ApiCallResult,
    AiModelId,
    CharacterConfig,
    CharacterLikesDislikes,
    CharacterTraits,
    ChronicleEntry,
    EvolvingStoryArc,
    PlayerAnalysisResponse,
    Subplot,
} from '../../types';
import { postToPsychoanalyst } from '../../services/apiService';
import { STORY_NAME } from '../../storyConfig';

/**
 * Additional context needed for cache rebuilding.
 * These fields are required by UniversalCacheBuilder when the cache expires mid-pipeline.
 */
export interface PsychoanalystCacheContext {
    currentDay: number;
    factSheet?: { [day: number]: string[] };
    evolvingPersonas?: { [key: string]: string } | null;
    characterTraits?: CharacterTraits | null;
    characterLikesDislikes?: CharacterLikesDislikes | null;
    characterBiographies?: { [characterName: string]: string } | null;
    characterChronicles?: { [characterName: string]: ChronicleEntry[] } | null;
    storyArcs?: EvolvingStoryArc[];
    subplots?: Subplot[] | null;
    affection?: { [key: string]: number };
    mainCharacters?: CharacterConfig[];
    sideCharacters?: CharacterConfig[];
}

/**
 * Generate player psychological analysis
 * 
 * @param cachedContentName Optional Gemini cache name for EOD pipeline
 * @param pipelineState Accumulated outputs from previous pipeline steps
 * @param cacheContext Additional context for cache rebuilding (if cache expires mid-pipeline)
 */
export async function generatePlayerProseAnalysis(
  apiKeys: Record<string, string>,
  modelName: AiModelId,
  playerName: string,
  previousDayAnalysis: string,
  previousBackstory: string | null,
  hybridMemoryNovelContext: string,
  recentPastTranscript: any[],
  currentDayTranscript: any[], // Changed to array
  relationshipDynamics: string,
  relationshipDynamicsStructured: any | null = null,
  cachedContentName?: string | null,
  pipelineState?: Record<string, any>,
  cacheContext?: PsychoanalystCacheContext, // [NEW] For cache rebuilding
  language: string = 'English' // [FIX] Language for translation
): Promise<ApiCallResult<PlayerAnalysisResponse>> {
  

  const payload: Record<string, any> = {
      clientData: {
          language, // [FIX] Pass language for translation
          playerName,
          previousDayAnalysis,
          previousBackstory,
          hybridMemoryNovelContext,
          recentPastTranscript,
          currentDayTranscript, // Send as array
          relationshipDynamics,
          relationshipDynamicsStructured: relationshipDynamicsStructured || null,
          // [CACHE REBUILD FIX] Include all fields needed by UniversalCacheBuilder
          currentDay: cacheContext?.currentDay ?? 1,
          factSheet: cacheContext?.factSheet ?? {},
          evolvingPersonas: cacheContext?.evolvingPersonas ?? null,
          characterTraits: cacheContext?.characterTraits ?? null,
          characterLikesDislikes: cacheContext?.characterLikesDislikes ?? null,
          characterBiographies: cacheContext?.characterBiographies ?? null,
          characterChronicles: cacheContext?.characterChronicles ?? null,
          storyArcs: cacheContext?.storyArcs ?? [],
          subplots: cacheContext?.subplots ?? [],
          affection: cacheContext?.affection ?? {},
          // Strip base64 image blobs - backend doesn't need them
          mainCharacters: (cacheContext?.mainCharacters ?? []).map(({ image, ...rest }) => rest),
          sideCharacters: (cacheContext?.sideCharacters ?? []).map(({ image, ...rest }) => rest),
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
      const result = await postToPsychoanalyst(payload);
      return {
          data: result,
          inputTokens: 0, // Mock values as backend doesn't return usage yet
          outputTokens: 0
      };
  } catch (error: any) {
      console.error("Psychoanalyst Backend Error:", error);
      throw error;
  }
}
