/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React, { useState, useEffect } from 'react';
import { TranslationSet } from '../lib/translations';
import { ModelSelection, AiModelId, ProviderId, ImageStyleMode, ImagenModel, SpriteModel, SpriteStyleMode } from '../types';
import { AVAILABLE_MODELS, PROVIDERS } from '../lib/modelConfig';

interface ModelSelectionModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (selection: ModelSelection) => void;
  currentSelection: ModelSelection;
  t: TranslationSet;
}

export const ModelSelectionModal: React.FC<ModelSelectionModalProps> = ({ isVisible, onClose, onSave, currentSelection, t }) => {
  const [dmModel, setDmModel] = useState<AiModelId>(currentSelection.dungeonMasterModel);
  const [storyModel, setStoryModel] = useState<AiModelId>(currentSelection.storyModel);
  const [providerTab, setProviderTab] = useState<ProviderId>('gemini');
  
  // HuggingFace demo: default to OFF for generative features (free tier friendly)
  const isHfDemo = import.meta.env.VITE_IS_HF_BUILD === 'true';
  const defaultGenerativeEnabled = !isHfDemo; // true for main site, false for HF demo
  
  // [GENERATIVE IMAGES] State for image generation settings
  // Note: Can be disabled for free-tier API keys that don't support image generation
  const [enableGenerativeImages, setEnableGenerativeImages] = useState<boolean>(
    currentSelection.enableGenerativeImages ?? defaultGenerativeEnabled
  );
  const [imageStyleMode, setImageStyleMode] = useState<ImageStyleMode>(
    currentSelection.imageStyleMode ?? 'hybrid'
  );
  const [imagenModel, setImagenModel] = useState<ImagenModel>(
    currentSelection.imagenModel ?? 'imagen-4.0-generate-001'
  );
  
  // [GENERATIVE SPRITES] State for sprite generation settings
  const [enableSpriteGeneration, setEnableSpriteGeneration] = useState<boolean>(
    currentSelection.enableSpriteGeneration ?? defaultGenerativeEnabled
  );
  const [spriteModel, setSpriteModel] = useState<SpriteModel>(
    currentSelection.spriteModel ?? 'gemini-2.5-flash-image'
  );
  const [spriteStyleMode, setSpriteStyleMode] = useState<SpriteStyleMode>(
    currentSelection.spriteStyleMode ?? 'hybrid'
  );

  useEffect(() => {
    if (isVisible) {
      setDmModel(currentSelection.dungeonMasterModel);
      setStoryModel(currentSelection.storyModel);
      // Respect saved preference, default OFF for HF demo (free tier friendly)
      setEnableGenerativeImages(currentSelection.enableGenerativeImages ?? defaultGenerativeEnabled);
      setImageStyleMode(currentSelection.imageStyleMode ?? 'hybrid');
      setImagenModel(currentSelection.imagenModel ?? 'imagen-4.0-generate-001');
      // [GENERATIVE SPRITES]
      setEnableSpriteGeneration(currentSelection.enableSpriteGeneration ?? defaultGenerativeEnabled);
      setSpriteModel(currentSelection.spriteModel ?? 'gemini-2.5-flash-image');
      setSpriteStyleMode(currentSelection.spriteStyleMode ?? 'hybrid');
    }
  }, [isVisible, currentSelection, defaultGenerativeEnabled]);

  if (!isVisible) {
    return null;
  }

  const handleSave = () => {
    onSave({
      dungeonMasterModel: dmModel,
      storyModel: storyModel,
      selectedModel: storyModel, // Legacy fallback
      // [GENERATIVE IMAGES]
      enableGenerativeImages,
      imageStyleMode,
      imagenModel,
      // [GENERATIVE SPRITES]
      enableSpriteGeneration,
      spriteModel,
      spriteStyleMode,
    });
  };

  const availableModelsForTab = AVAILABLE_MODELS.filter(m => m.provider === providerTab);

  // Reusable model list component
  const ModelList = ({ selected, onChange, name }: { selected: AiModelId; onChange: (m: AiModelId) => void; name: string }) => (
    <div className="flex flex-col gap-2">
      {availableModelsForTab.map(modelInfo => (
        <label key={modelInfo.id} className="flex items-center p-3 bg-white/5 rounded-md cursor-pointer hover:bg-white/10 transition-colors">
          <input
            type="radio"
            name={name}
            value={modelInfo.id}
            checked={selected === modelInfo.id}
            onChange={() => onChange(modelInfo.id)}
            className="w-5 h-5 accent-cyan-400"
          />
          <div className="ml-4">
            <span className="font-semibold text-white">{modelInfo.displayName}</span>
            <p className="text-xs text-gray-400">{modelInfo.description}</p>
          </div>
        </label>
      ))}
    </div>
  );

  return (
    <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="vn-modal-panel max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-3xl font-bold text-center mb-6 text-shadow-medium">
          {t.selectYourModel}
        </h2>

        <div className="flex flex-col gap-6 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
          {/* Provider tabs */}
          <div className="flex gap-2">
            {PROVIDERS.map(p => (
              <button
                key={p.id}
                onClick={() => setProviderTab(p.id)}
                className={`px-3 py-2 rounded-md border ${
                  providerTab === p.id
                    ? 'border-cyan-400 text-cyan-300 bg-white/5'
                    : 'border-white/10 text-gray-300 hover:border-cyan-300 hover:text-cyan-200'
                }`}
              >
                {p.displayName}
              </button>
            ))}
          </div>

          {/* Two-column layout for model selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dungeon Master Column */}
            <div className="p-4 bg-black/20 rounded-lg border border-white/20">
              <h3 className="text-xl font-bold text-cyan-300 flex items-center gap-2">
                <span>🎭</span> In-Game Dialogue
              </h3>
              <p className="text-sm text-gray-300 mt-1 mb-4">
                Powers real-time character conversations.
              </p>
              <ModelList selected={dmModel} onChange={setDmModel} name="dmModel" />
            </div>

            {/* Story Engine Column */}
            <div className="p-4 bg-black/20 rounded-lg border border-white/20">
              <h3 className="text-xl font-bold text-purple-300 flex items-center gap-2">
                <span>🧠</span> Story Engine
              </h3>
              <p className="text-sm text-gray-300 mt-1 mb-4">
                Powers end-of-day story logic and narrative coherence.
              </p>
              <ModelList selected={storyModel} onChange={setStoryModel} name="storyModel" />
            </div>
          </div>

          {/* [GENERATIVE IMAGES] Image Generation Settings */}
          <div className="p-4 bg-black/20 rounded-lg border border-white/20">
            <h3 className="text-xl font-bold text-amber-300 flex items-center gap-2">
              <span>🎨</span> AI Background Generation
            </h3>
            <p className="text-sm text-gray-300 mt-1 mb-4">
              Generate anime-style backgrounds for each location.
            </p>
            
            {/* Toggle */}
            <label className="flex items-center gap-3 p-3 bg-white/5 rounded-md cursor-pointer hover:bg-white/10 transition-colors mb-4">
              <input
                type="checkbox"
                checked={enableGenerativeImages}
                onChange={(e) => setEnableGenerativeImages(e.target.checked)}
                className="w-5 h-5 accent-amber-400"
              />
              <div>
                <span className="font-semibold text-white">Enable AI Background Generation</span>
                <p className="text-xs text-gray-400">
                  Requires Tier 1 API. Free tier: disable this (uses stock backgrounds). Free tier has strict rate limits — only for a quick try.
                </p>
              </div>
            </label>
            
            {/* Model and mode selectors - only show when enabled */}
            {enableGenerativeImages && (
            <>
                {/* Background Image Model Selection */}
                <div className="flex flex-col gap-2 mb-4">
                  <span className="text-sm text-gray-300 font-medium">Background Image Model:</span>
                  
                  {/* Imagen Models (Primary) */}
                  <div className="text-xs text-amber-400 font-medium mt-1 mb-1">📷 Imagen 4 (Excellent Quality)</div>
                  <label className="flex items-center p-3 bg-white/5 rounded-md cursor-pointer hover:bg-white/10 transition-colors">
                    <input
                      type="radio"
                      name="imagenModel"
                      value="imagen-4.0-fast-generate-001"
                      checked={imagenModel === 'imagen-4.0-fast-generate-001'}
                      onChange={() => setImagenModel('imagen-4.0-fast-generate-001')}
                      className="w-5 h-5 accent-amber-400"
                    />
                    <div className="ml-4">
                      <span className="font-semibold text-white">Imagen 4 Fast</span>
                      <p className="text-xs text-gray-400">
                        Bang for your buck. Great for hybrid mode with Gemini 3 Flash. $0.02/image.
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center p-3 bg-amber-500/10 border border-amber-500/30 rounded-md cursor-pointer hover:bg-amber-500/20 transition-colors">
                    <input
                      type="radio"
                      name="imagenModel"
                      value="imagen-4.0-generate-001"
                      checked={imagenModel === 'imagen-4.0-generate-001'}
                      onChange={() => setImagenModel('imagen-4.0-generate-001')}
                      className="w-5 h-5 accent-amber-400"
                    />
                    <div className="ml-4">
                      <span className="font-semibold text-white">Imagen 4 Standard</span>
                      <span className="ml-2 text-xs text-amber-400">Default</span>
                      <p className="text-xs text-gray-400">
                        Excellent image quality. Sometimes generates unexpected images. $0.04/image.
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center p-3 bg-white/5 rounded-md cursor-pointer hover:bg-white/10 transition-colors">
                    <input
                      type="radio"
                      name="imagenModel"
                      value="imagen-4.0-ultra-generate-001"
                      checked={imagenModel === 'imagen-4.0-ultra-generate-001'}
                      onChange={() => setImagenModel('imagen-4.0-ultra-generate-001')}
                      className="w-5 h-5 accent-amber-400"
                    />
                    <div className="ml-4">
                      <span className="font-semibold text-white">Imagen 4 Ultra</span>
                      <p className="text-xs text-gray-400">
                        Beautiful images but slow. Still risk of unexpected images. $0.06/image.
                      </p>
                    </div>
                  </label>

                  {/* Gemini Native Image Models (Alternative) */}
                  <div className="text-xs text-emerald-400/70 font-medium mt-3 mb-1">✨ Gemini Native (More Consistent)</div>
                  <label className="flex items-center p-3 bg-white/5 rounded-md cursor-pointer hover:bg-white/10 transition-colors">
                    <input
                      type="radio"
                      name="imagenModel"
                      value="gemini-2.5-flash-image"
                      checked={imagenModel === 'gemini-2.5-flash-image'}
                      onChange={() => setImagenModel('gemini-2.5-flash-image')}
                      className="w-5 h-5 accent-emerald-400"
                    />
                    <div className="ml-4">
                      <span className="font-semibold text-white">Gemini 2.5 Flash Image</span>
                      <p className="text-xs text-gray-400">
                        Lower quality than Imagen but more consistent. Good alternative. $0.039/image.
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center p-3 bg-white/5 rounded-md cursor-pointer hover:bg-white/10 transition-colors">
                    <input
                      type="radio"
                      name="imagenModel"
                      value="gemini-3-pro-image-preview"
                      checked={imagenModel === 'gemini-3-pro-image-preview'}
                      onChange={() => setImagenModel('gemini-3-pro-image-preview')}
                      className="w-5 h-5 accent-emerald-400"
                    />
                    <div className="ml-4">
                      <span className="font-semibold text-white">Gemini 3.0 Pro Image</span>
                      <p className="text-xs text-gray-400">
                        Good quality and consistent but expensive. Try it if curious. $0.134/image.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Generation Mode */}
                <div className="flex flex-col gap-2">
                  <span className="text-sm text-gray-300 font-medium">Generation Mode:</span>
                  <label className="flex items-center p-3 bg-white/5 rounded-md cursor-pointer hover:bg-white/10 transition-colors">
                    <input
                      type="radio"
                      name="imageMode"
                      value="hybrid"
                      checked={imageStyleMode === 'hybrid'}
                      onChange={() => setImageStyleMode('hybrid')}
                      className="w-5 h-5 accent-amber-400"
                    />
                    <div className="ml-4">
                      <span className="font-semibold text-white">Hybrid Mode</span>
                      <p className="text-xs text-gray-400">
                        Uses stock backgrounds + generates when needed. Fewer API calls, great balance.
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center p-3 bg-white/5 rounded-md cursor-pointer hover:bg-white/10 transition-colors">
                    <input
                      type="radio"
                      name="imageMode"
                      value="override"
                      checked={imageStyleMode === 'override'}
                      onChange={() => setImageStyleMode('override')}
                      className="w-5 h-5 accent-amber-400"
                    />
                    <div className="ml-4">
                      <span className="font-semibold text-white">Override Mode</span>
                      <p className="text-xs text-gray-400">
                        Builds all locations from scratch, tailored to your story. Most immersive.
                      </p>
                    </div>
                  </label>
                </div>
              </>
            )}
          </div>

          {/* [GENERATIVE SPRITES] Character Sprite Generation Settings */}
          <div className="p-4 bg-black/20 rounded-lg border border-white/20">
            <h3 className="text-xl font-bold text-pink-300 flex items-center gap-2">
              <span>🎭</span> AI Character Sprite Generation
            </h3>
            <p className="text-sm text-gray-300 mt-1 mb-4">
              Generate unique character portraits for emergent and adventure arc characters.
            </p>
            
            {/* Toggle */}
            <label className="flex items-center gap-3 p-3 bg-white/5 rounded-md cursor-pointer hover:bg-white/10 transition-colors mb-4">
              <input
                type="checkbox"
                checked={enableSpriteGeneration}
                onChange={(e) => setEnableSpriteGeneration(e.target.checked)}
                className="w-5 h-5 accent-pink-400"
              />
              <div>
                <span className="font-semibold text-white">Enable Generative Sprites</span>
                <p className="text-xs text-gray-400">
                  Requires Tier 1 API. Free tier: disable this (uses stock sprites). Free tier has strict rate limits — only for a quick try.
                </p>
              </div>
            </label>
            
            {/* Mode selector and model selector - only show when enabled */}
            {enableSpriteGeneration && (
              <>
                {/* Sprite Model Selection */}
                <div className="flex flex-col gap-2 mb-4">
                  <span className="text-sm text-gray-300 font-medium">Sprite Quality:</span>
                  <label className="flex items-center p-3 bg-white/5 rounded-md cursor-pointer hover:bg-white/10 transition-colors">
                    <input
                      type="radio"
                      name="spriteModel"
                      value="gemini-2.5-flash-image"
                      checked={spriteModel === 'gemini-2.5-flash-image'}
                      onChange={() => setSpriteModel('gemini-2.5-flash-image')}
                      className="w-5 h-5 accent-pink-400"
                    />
                    <div className="ml-4">
                      <span className="font-semibold text-white">Gemini 2.5 Flash Image</span>
                      <p className="text-xs text-gray-400">
                        Fast generation. $0.04 per sprite.
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center p-3 bg-white/5 rounded-md cursor-pointer hover:bg-white/10 transition-colors">
                    <input
                      type="radio"
                      name="spriteModel"
                      value="gemini-3-pro-image-preview"
                      checked={spriteModel === 'gemini-3-pro-image-preview'}
                      onChange={() => setSpriteModel('gemini-3-pro-image-preview')}
                      className="w-5 h-5 accent-pink-400"
                    />
                    <div className="ml-4">
                      <span className="font-semibold text-white">Gemini 3 Pro Image</span>
                      <p className="text-xs text-gray-400">
                        Higher quality. $0.13 per sprite.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Generation Mode */}
                <div className="flex flex-col gap-2">
                  <span className="text-sm text-gray-300 font-medium">Generation Mode:</span>
                  <label className="flex items-center p-3 bg-white/5 rounded-md cursor-pointer hover:bg-white/10 transition-colors">
                    <input
                      type="radio"
                      name="spriteMode"
                      value="hybrid"
                      checked={spriteStyleMode === 'hybrid'}
                      onChange={() => setSpriteStyleMode('hybrid')}
                      className="w-5 h-5 accent-pink-400"
                    />
                    <div className="ml-4">
                      <span className="font-semibold text-white">Hybrid Mode</span>
                      <p className="text-xs text-gray-400">
                        Use stock sprites when available, generate for unique characters.
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center p-3 bg-white/5 rounded-md cursor-pointer hover:bg-white/10 transition-colors">
                    <input
                      type="radio"
                      name="spriteMode"
                      value="override"
                      checked={spriteStyleMode === 'override'}
                      onChange={() => setSpriteStyleMode('override')}
                      className="w-5 h-5 accent-pink-400"
                    />
                    <div className="ml-4">
                      <span className="font-semibold text-white">Override Mode</span>
                      <p className="text-xs text-gray-400">
                        Always generate unique sprites. Maximum variety, more API calls.
                      </p>
                    </div>
                  </label>
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={onClose}
            className="vn-primary-button w-36"
            aria-label={t.cancel}
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSave}
            className="vn-primary-button w-36"
            aria-label={t.save}
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
};
