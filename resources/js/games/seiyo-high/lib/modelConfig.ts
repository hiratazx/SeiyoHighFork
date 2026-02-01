/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import { AiModelId, GeminiModel, ProviderId, OpenRouterModel } from "../types";
export type { ProviderId } from "../types";

export const PROVIDERS: { id: ProviderId; displayName: string }[] = [
  { id: 'gemini', displayName: 'Google Gemini' },
  // { id: 'openrouter', displayName: 'OpenRouter' }, // Uncomment to re-enable
];

export interface ModelInfo {
  provider: ProviderId;
  id: AiModelId; // The ID used for API calls
  displayName: string; // The user-facing name
  description: string; // A description for the UI
}

export const AVAILABLE_MODELS: readonly ModelInfo[] = [
  {
    provider: 'gemini',
    id: 'gemini-3-flash-preview',
    displayName: 'Gemini 3 Flash Preview',
    description: '⭐ RECOMMENDED for Dialogue. Good for Story too. The sweet spot for quality and cost.',
  },
  {
    provider: 'gemini',
    id: 'gemini-3-pro-preview',
    displayName: 'Gemini 3 Pro Preview',
    description: '🏆 Excellent storytelling - recommended for Story if budget allows. ⚠️ NOT recommended for Dialogue (too expensive for frequent calls).',
  },
  {
    provider: 'gemini',
    id: 'gemini-flash-latest',
    displayName: 'Gemini Flash (Latest)',
    description: 'Legacy model. Use Gemini 3 Flash instead.',
  },
  {
    provider: 'gemini',
    id: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    description: 'Legacy model. Fastest but lower quality.',
  },
  {
    provider: 'gemini',
    id: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    description: 'Legacy model. Good quality but expensive. Use Gemini 3 models instead.',
  }
  // OpenRouter models temporarily hidden; re-add entries to expose in UI
];

export const GEMINI_MODELS: readonly GeminiModel[] = AVAILABLE_MODELS
  .filter(m => m.provider === 'gemini')
  .map(m => m.id as GeminiModel);

export const modelConfigs: { [key in AiModelId]: ModelInfo } = 
    Object.fromEntries(AVAILABLE_MODELS.map(m => [m.id, m])) as { [key in AiModelId]: ModelInfo };