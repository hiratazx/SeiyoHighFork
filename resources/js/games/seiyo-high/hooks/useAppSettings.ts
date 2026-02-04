/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import { useState, useCallback } from 'react';
import { AppState, ModelSelection } from '../types';
import { TranslationSet, englishStrings } from '../lib/translations';
import { ProviderId, PROVIDERS } from '../lib/modelConfig';
import { devWarn } from '../lib/devLog';

const APP_SETTINGS_KEY = 'vn_app_settings_v1';

const loadPersistedSettings = () => {
  try {
    const raw = localStorage.getItem(APP_SETTINGS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    devWarn('[AppSettings] Failed to load settings from localStorage:', e);
    return null;
  }
};

const persistSettings = (data: any) => {
  try {
    localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(data));
  } catch (e) {
    devWarn('[AppSettings] Failed to persist settings to localStorage:', e);
  }
};

export const useAppSettings = () => {
  const persisted = loadPersistedSettings();
  const [apiKeys, setApiKeys] = useState<{ [provider: string]: string }>(
    persisted?.apiKeys ?? Object.fromEntries(PROVIDERS.map(p => [p.id, '']))
  );
  const [modelConfig, setModelConfig] = useState<ModelSelection>(() => {
    if (persisted?.modelConfig) {
      const p = persisted.modelConfig;
      
      // Base object to preserve all additional settings (generative images, sprites, etc.)
      const preservedSettings = {
        // Background image settings
        enableGenerativeImages: p.enableGenerativeImages,
        imageStyleMode: p.imageStyleMode,
        imagenModel: p.imagenModel,
        // Sprite generation settings
        enableSpriteGeneration: p.enableSpriteGeneration,
        spriteModel: p.spriteModel,
        spriteStyleMode: p.spriteStyleMode,
      };
      
      // 1. Fully migrated: new dual-model format
      if (p.dungeonMasterModel && p.storyModel) {
        return {
          dungeonMasterModel: p.dungeonMasterModel,
          storyModel: p.storyModel,
          selectedModel: p.selectedModel,
          ...preservedSettings,
        };
      }
      
      // 2. Migration from single-model era (selectedModel only)
      if (p.selectedModel) {
        return {
          dungeonMasterModel: p.selectedModel,
          storyModel: p.selectedModel,
          selectedModel: p.selectedModel,
          ...preservedSettings,
        };
      }
      
      // 3. Migration from legacy per-persona era
      const legacyModel = p.narrativeArchitect || p.dungeonMaster;
      if (legacyModel) {
        return {
          dungeonMasterModel: p.dungeonMaster || legacyModel,
          storyModel: p.narrativeArchitect || legacyModel,
          selectedModel: legacyModel,
          ...preservedSettings,
        };
      }
    }
    
    // Fresh install: Gemini 3 Flash for both - the sweet spot for quality and cost
    // Pro is available for hardcore players who want the best regardless of cost
    // HuggingFace demo: disable image generation by default (free tier friendly)
    const isHfDemo = import.meta.env.VITE_IS_HF_BUILD === 'true';
    return {
      dungeonMasterModel: 'gemini-3-flash-preview',
      storyModel: 'gemini-3-flash-preview',
      // Image generation disabled by default for HF demo (requires Tier 1)
      enableGenerativeImages: !isHfDemo,
      imageStyleMode: 'hybrid',
      imagenModel: 'imagen-4.0-generate-001',
      // Sprite generation disabled by default for HF demo (requires Tier 1)
      enableSpriteGeneration: !isHfDemo,
      spriteModel: 'gemini-2.5-flash-image',
      spriteStyleMode: 'hybrid',
    };
  });
  const [language, setLanguage] = useState<string>(persisted?.language ?? 'English');
  const [uiTranslations, setUiTranslationsInternal] = useState<TranslationSet>(englishStrings);
  const [notification, setNotification] = useState<string | null>(null);

  // Wrapper to always merge with englishStrings for backwards compatibility
  // This ensures new translation keys have English fallbacks
  const setUiTranslations = useCallback((translations: TranslationSet) => {
    setUiTranslationsInternal({ ...englishStrings, ...translations });
  }, []);

  const handleSaveApiKeys = useCallback((keys: { [provider: string]: string }) => {
    setApiKeys(keys);
    persistSettings({ apiKeys: keys, modelConfig, language });
  }, [modelConfig, language]);

  const handleImportKeys = useCallback((key: string, provider: ProviderId) => {
    setApiKeys(prev => {
      const next = {
      ...prev,
      [provider]: key.trim(),
      };
      persistSettings({ apiKeys: next, modelConfig, language });
      return next;
    });
    setNotification('Key imported successfully!');
    setTimeout(() => setNotification(null), 3000);
  }, [modelConfig, language]);

  const handleSaveModelSelection = useCallback((selection: ModelSelection) => {
    setModelConfig(selection);
    persistSettings({ apiKeys, modelConfig: selection, language });
  }, [apiKeys, language]);

  const handleSaveLanguage = useCallback((lang: string) => {
    setLanguage(lang);
    persistSettings({ apiKeys, modelConfig, language: lang });
  }, [apiKeys, modelConfig]);
  
  const state = {
    apiKeys,
    modelConfig,
    language,
    uiTranslations,
    notification,
  };

  const setters = {
    setApiKeys,
    setModelConfig,
    setLanguage: handleSaveLanguage,
    setUiTranslations,
    setNotification,
  };

  const handlers = {
    handleSaveApiKeys,
    handleImportKeys,
    handleSaveModelSelection,
    handleSaveLanguage,
  };

  return {
    ...state,
    ...setters,
    ...handlers,
  };
};