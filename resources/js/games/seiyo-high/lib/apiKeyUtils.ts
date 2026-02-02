/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { devWarn } from './devLog';

const APP_SETTINGS_KEY = 'vn_app_settings_v1';

/**
 * Robust API keys retrieval with fallback.
 * If React state has empty/missing keys but localStorage has them, use localStorage.
 * This handles edge cases where localStorage might be cleared but React state still has the key,
 * or vice versa (e.g., browser privacy settings, race conditions).
 */
export function getRobustApiKeys(stateApiKeys: Record<string, string> | undefined): Record<string, string> {
  const hasValidGeminiKey = (keys: Record<string, string> | undefined): boolean => {
    return !!(keys?.gemini && keys.gemini.length > 10);
  };

  // If state has valid key, use it
  if (hasValidGeminiKey(stateApiKeys)) {
    return stateApiKeys!;
  }

  // State doesn't have key - try localStorage
  try {
    const raw = localStorage.getItem(APP_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (hasValidGeminiKey(parsed?.apiKeys)) {
        devWarn('[apiKeyUtils] API key missing from state but found in localStorage - using localStorage value');
        return parsed.apiKeys;
      }
    }
  } catch (e) {
    devWarn('[apiKeyUtils] Failed to read apiKeys from localStorage:', e);
  }

  // Neither has valid key - return state keys (even if empty) to preserve original behavior
  // Backend will return proper validation error
  if (stateApiKeys) {
    devWarn('[apiKeyUtils] API key appears empty in both state and localStorage');
    return stateApiKeys;
  }

  // Return empty object - backend will return proper validation error
  devWarn('[apiKeyUtils] No API keys found in state or localStorage');
  return {};
}
