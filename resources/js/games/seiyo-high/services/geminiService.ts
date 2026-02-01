/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Gemini Service - Model Policy & API Call Orchestration
 * 
 * Note: Direct Gemini SDK calls have been removed. All AI calls now route
 * through the backend for security (IP protection, key management).
 * This service handles model selection and provides a unified interface
 * for the backend-proxied API calls.
 */
import {
  ApiCallResult,
  ModelSelection,
  AiPersona,
  AiModelId,
} from '../types';
import { modelConfigs } from '../lib/modelConfig';
import { devLog } from '../lib/devLog';

export type ModelPolicy = AiModelId | AiModelId[];

/**
 * Gets the selected model for a given AI persona.
 * Routes DungeonMaster to its dedicated model, all others to storyModel.
 */
function getModelPolicy(persona: AiPersona, modelConfig: ModelSelection): ModelPolicy {
    if (persona === 'DungeonMaster') {
        return modelConfig.dungeonMasterModel || modelConfig.selectedModel;
    }
    return modelConfig.storyModel || modelConfig.selectedModel;
}

/**
 * Executes an API call using a smart policy based on the AI persona.
 * This is the main entry point for all AI service calls.
 * 
 * @param persona The AI persona making the call (for model routing)
 * @param modelConfig The user's model configuration
 * @param apiKeys The user's API keys
 * @param apiCallFn Callback that performs the actual API call (typically to backend)
 * @param overrideModel Optional model override
 */
export async function executeApiCallWithPolicy<T>(
    persona: AiPersona,
    modelConfig: ModelSelection,
    apiKeys: Record<string, string>,
    apiCallFn: (currentModel: AiModelId, apiKey: string) => Promise<ApiCallResult<T>>,
    overrideModel?: AiModelId 
): Promise<ApiCallResult<T>> {

    // 1. Get the model - all personas now use the single selected model
    const policy = getModelPolicy(persona, modelConfig);
    const modelToUse = overrideModel || (Array.isArray(policy) ? policy[0] : policy);
    
    // 2. Get API key for the model
    const modelInfo = modelConfigs[modelToUse];
    const providerId = modelInfo?.provider;
    const apiKeyToUse = providerId ? (apiKeys[providerId] || '').trim() : '';
    if (!apiKeyToUse) {
        console.error("[Policy] No API key provided.");
        throw new Error("API_ERROR_NO_KEY");
    }
    
    devLog(`[Policy] Using model: ${modelToUse} for persona: ${persona}`);
    return await apiCallFn(modelToUse, apiKeyToUse);
}
