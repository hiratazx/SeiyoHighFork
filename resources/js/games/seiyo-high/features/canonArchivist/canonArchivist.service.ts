/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import { postToCanonArchivist } from '../../services/apiService';
import { STORY_NAME } from '../../storyConfig';
import { 
    ApiCallResult, 
    CanonArchivistResponse, 
    CharacterConfig,
    CharacterLikesDislikes,
    CharacterTraits,
    EvolvingStoryArc,
    ModelSelection, 
    PromptDayLog,
    Subplot
} from '../../types';

/**
 * Additional context needed for cache rebuilding.
 * These fields are required by UniversalCacheBuilder when the cache expires mid-pipeline.
 */
export interface CanonArchivistCacheContext {
    playerName: string;
    playerPsychoanalysisProse?: string | null;
    playerBackstory?: string | null;
    evolvingPersonas?: { [key: string]: string } | null;
    characterTraits?: CharacterTraits | null;
    characterLikesDislikes?: CharacterLikesDislikes | null;
    relationshipDynamics?: string | null;
    relationshipDynamicsStructured?: any | null;
    storyArcs?: EvolvingStoryArc[];
    subplots?: Subplot[] | null;
    affection?: { [key: string]: number };
    hybridMemoryNovelContext?: string;
    recentPastTranscript?: any[];
    mainCharacters?: CharacterConfig[];
    sideCharacters?: CharacterConfig[];
}

/**
 * Generate fact sheet updates from the current day's transcript
 * 
 * @param cachedContentName Optional Gemini cache name for EOD pipeline
 * @param pipelineState Accumulated outputs from previous pipeline steps
 * @param cacheContext Additional context for cache rebuilding (if cache expires mid-pipeline)
 */
export async function generateFactSheet(
  apiKeys: { [provider: string]: string },
  modelConfig: ModelSelection,
  currentDayTranscript: PromptDayLog[], 
  existingFactSheet: { [day: number]: string[] },
  currentDay: number,
  characterChronicles: { [characterName: string]: any[] },
  characterBiographies: { [characterName: string]: string },
  cachedContentName?: string | null,
  pipelineState?: Record<string, any>,
  cacheContext?: CanonArchivistCacheContext // [NEW] For cache rebuilding
): Promise<ApiCallResult<CanonArchivistResponse>> {
  const payload: Record<string, any> = {
      story: { name: STORY_NAME },
      currentDay,
      currentDayTranscript: currentDayTranscript,
      existingFactSheet,
      characterChronicles,
      characterBiographies,
      // [CACHE REBUILD FIX] Include all fields needed by UniversalCacheBuilder
      playerName: cacheContext?.playerName ?? 'Player',
      playerPsychoanalysisProse: cacheContext?.playerPsychoanalysisProse ?? null,
      playerBackstory: cacheContext?.playerBackstory ?? null,
      evolvingPersonas: cacheContext?.evolvingPersonas ?? null,
      characterTraits: cacheContext?.characterTraits ?? null,
      characterLikesDislikes: cacheContext?.characterLikesDislikes ?? null,
      relationshipDynamics: cacheContext?.relationshipDynamics ?? null,
      relationshipDynamicsStructured: cacheContext?.relationshipDynamicsStructured ?? null,
      storyArcs: cacheContext?.storyArcs ?? [],
      subplots: cacheContext?.subplots ?? [],
      affection: cacheContext?.affection ?? {},
      hybridMemoryNovelContext: cacheContext?.hybridMemoryNovelContext ?? '',
      recentPastTranscript: cacheContext?.recentPastTranscript ?? [],
      // Strip base64 image blobs - backend doesn't need them
      mainCharacters: (cacheContext?.mainCharacters ?? []).map(({ image, ...rest }) => rest),
      sideCharacters: (cacheContext?.sideCharacters ?? []).map(({ image, ...rest }) => rest),
      apiKeys,
      modelConfig
  };

  // Add EOD pipeline caching parameters if provided
  if (cachedContentName) {
      payload.cachedContentName = cachedContentName;
  }
  if (pipelineState && Object.keys(pipelineState).length > 0) {
      payload.pipelineState = pipelineState;
  }

  // Use centralized API service for job queue handling
  const result = await postToCanonArchivist(payload);
  
  return {
      data: result,
      inputTokens: (result as any).usage?.input_tokens || 0,
      outputTokens: (result as any).usage?.output_tokens || 0
  };
}
