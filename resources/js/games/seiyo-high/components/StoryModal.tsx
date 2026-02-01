/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React, { useState, useEffect, useMemo } from 'react';
import { TranslationSet } from '../lib/translations';
import { CharacterConfig } from '../types';
import { db, GeneratedLocation, storeGeneratedLocation } from '../db';
import { regenerateImage, regenerateSprite } from '../services/apiService';
import { compressToWebP } from '../services/UnifiedAiService';
import { defaultDayStructure } from '../services/persistenceService';

interface StoryModalProps {
  isVisible: boolean;
  onClose: () => void;
  novelChapters: string[];
  novelChaptersTranslated?: string[];
  t: TranslationSet;
  // New props for Locations and Characters tabs
  characters?: CharacterConfig[];
  apiKeys?: Record<string, string>;
  modelConfig?: {
    imagenModel?: string;
    storyModel?: string;
    spriteModel?: string;
  };
  onUpdateCharacter?: (name: string, updates: Partial<CharacterConfig>) => void;
  daySegments?: string[];
}

type TabId = 'story' | 'locations' | 'characters';

export const StoryModal: React.FC<StoryModalProps> = ({
  isVisible,
  onClose,
  novelChapters,
  novelChaptersTranslated,
  t,
  characters = [],
  apiKeys,
  modelConfig,
  onUpdateCharacter,
  daySegments = defaultDayStructure,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('story');
  const [selectedDay, setSelectedDay] = useState(0);
  const chaptersToDisplay = novelChaptersTranslated || novelChapters;

  // Locations state
  const [generatedLocations, setGeneratedLocations] = useState<GeneratedLocation[]>([]);
  const [locationPreviews, setLocationPreviews] = useState<Record<string, string>>({});
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [regeneratingLocationId, setRegeneratingLocationId] = useState<string | null>(null);
  const [activeSegmentTab, setActiveSegmentTab] = useState<string>('all');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Characters state
  const [regeneratingCharacter, setRegeneratingCharacter] = useState<string | null>(null);
  const [lightboxCharacter, setLightboxCharacter] = useState<string | null>(null);

  // Confirmation dialog state
  const [confirmingLocation, setConfirmingLocation] = useState<GeneratedLocation | null>(null);
  const [confirmingCharacter, setConfirmingCharacter] = useState<CharacterConfig | null>(null);

  // Filter to only show generated characters (image starts with 'data:')
  const generatedCharacters = characters.filter(
    (c) => c.image?.startsWith('data:') && c.generatedSpritePrompt
  );

  // Get unique segments from locations for dynamic tabs (in chronological order)
  const availableSegments = useMemo(() => {
    const segments = new Set(generatedLocations.map(loc => loc.segment));
    return Array.from(segments).sort((a, b) => {
      const indexA = daySegments.indexOf(a);
      const indexB = daySegments.indexOf(b);
      // If segment not in order list, put it at the end
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });
  }, [generatedLocations, daySegments]);

  // Filter locations by segment
  const filteredLocations = useMemo(() => {
    if (activeSegmentTab === 'all') return generatedLocations;
    return generatedLocations.filter(loc => loc.segment === activeSegmentTab);
  }, [generatedLocations, activeSegmentTab]);

  useEffect(() => {
    if (isVisible && chaptersToDisplay.length > 0) {
      setSelectedDay(chaptersToDisplay.length - 1);
    }
  }, [isVisible, chaptersToDisplay]);

  // Load locations when tab is selected
  useEffect(() => {
    if (isVisible && activeTab === 'locations') {
      setIsLoadingLocations(true);
      db.generatedLocations
        .toArray()
        .then((locations) => {
          const validLocations = locations.filter((loc) => loc.blob instanceof Blob);
          validLocations.sort((a, b) => b.createdAt - a.createdAt);
          setGeneratedLocations(validLocations);

          const previews: Record<string, string> = {};
          validLocations.forEach((loc) => {
            previews[loc.id] = URL.createObjectURL(loc.blob);
          });
          setLocationPreviews(previews);
          setIsLoadingLocations(false);
        })
        .catch((err) => {
          console.error('[StoryModal] Failed to load locations:', err);
          setIsLoadingLocations(false);
        });
    }
  }, [isVisible, activeTab]);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      Object.values(locationPreviews).forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      });
    };
  }, [locationPreviews]);

  if (!isVisible) {
    return null;
  }

  const selectedChapterContent = chaptersToDisplay[selectedDay];

  const handleRegenerateLocation = async (loc: GeneratedLocation) => {
    if (!apiKeys?.gemini || !loc.prompt || regeneratingLocationId) return;

    setRegeneratingLocationId(loc.id);
    try {
      const result = await regenerateImage(
        loc.prompt,
        loc.segment,
        '16:9',
        apiKeys,
        modelConfig?.imagenModel,
        modelConfig?.storyModel || 'gemini-3-flash-preview'
      );

      if (result.success && result.data) {
        const newBlob = await compressToWebP(result.data, result.mime || 'image/png');
        await storeGeneratedLocation(
          loc.id,
          loc.name,
          loc.segment,
          loc.prompt,
          loc.summary || '',
          newBlob
        );

        // Refresh locations
        const updatedLocations = await db.generatedLocations.toArray();
        updatedLocations.sort((a, b) => b.createdAt - a.createdAt);
        setGeneratedLocations(updatedLocations);

        URL.revokeObjectURL(locationPreviews[loc.id]);
        setLocationPreviews((prev) => ({
          ...prev,
          [loc.id]: URL.createObjectURL(newBlob),
        }));
      } else {
        alert('Regeneration failed: ' + (result.error || 'Unknown error'));
      }
    } catch (err: any) {
      console.error('Location regeneration error:', err);
      alert('Regeneration failed: ' + err.message);
    } finally {
      setRegeneratingLocationId(null);
    }
  };

  const handleRegenerateCharacter = async (character: CharacterConfig) => {
    if (!apiKeys?.gemini || !character.generatedSpritePrompt || regeneratingCharacter) return;

    setRegeneratingCharacter(character.name);
    try {
      const result = await regenerateSprite(
        character.generatedSpritePrompt,
        character.name,
        apiKeys,
        modelConfig?.spriteModel
      );

      if (result.success && result.data && result.mime) {
        const newImageUrl = `data:${result.mime};base64,${result.data}`;
        onUpdateCharacter?.(character.name, { image: newImageUrl });
      } else {
        alert('Regeneration failed: ' + (result.error || 'Unknown error'));
      }
    } catch (err: any) {
      console.error('Character regeneration error:', err);
      alert('Regeneration failed: ' + err.message);
    } finally {
      setRegeneratingCharacter(null);
    }
  };

  return (
    <div
      className="absolute inset-0 bg-black/60 z-40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="vn-modal-panel w-full max-w-4xl h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tab Header */}
        <div className="flex-shrink-0 border-b-2 border-white/20 mb-4">
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setActiveTab('story')}
              className={`px-6 py-3 font-semibold text-lg transition-colors ${
                activeTab === 'story'
                  ? 'border-b-2 border-blue-400 text-blue-300'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              📖 {t.history}
            </button>
            <button
              onClick={() => setActiveTab('locations')}
              className={`px-6 py-3 font-semibold text-lg transition-colors ${
                activeTab === 'locations'
                  ? 'border-b-2 border-cyan-400 text-cyan-300'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🖼️ {t.locations}
            </button>
            <button
              onClick={() => setActiveTab('characters')}
              className={`px-6 py-3 font-semibold text-lg transition-colors ${
                activeTab === 'characters'
                  ? 'border-b-2 border-cyan-400 text-cyan-300'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🎭 {t.characters}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-grow overflow-hidden">
          {/* Story Tab */}
          {activeTab === 'story' && (
            <div className="h-full flex flex-col md:flex-row gap-6">
              {/* Left Side: Chapter Navigation */}
              <div className="flex-shrink-0 md:w-48 border-b-2 md:border-b-0 md:border-r-2 border-white/20 pb-4 md:pb-0 md:pr-4">
                <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto md:max-h-[calc(90vh-240px)] custom-scrollbar pr-2">
                  {chaptersToDisplay.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedDay(index)}
                      className={`w-full text-left p-3 rounded-md font-semibold transition-colors text-lg ${
                        selectedDay === index
                          ? 'bg-blue-500 text-white'
                          : 'bg-black/30 text-gray-300 hover:bg-white/20'
                      }`}
                    >
                      {t.day} {index + 1}
                    </button>
                  ))}
                  {chaptersToDisplay.length === 0 && (
                    <p className="text-center text-gray-400 italic mt-4 w-full">
                      {t.noStoryChaptersAvailable}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Side: Chapter Content */}
              <div className="flex-grow flex flex-col min-h-0">
                <div className="flex-grow overflow-y-auto pr-4 custom-scrollbar">
                  {selectedChapterContent ? (
                    <p className="text-gray-200 text-lg leading-relaxed whitespace-pre-wrap">
                      {selectedChapterContent}
                    </p>
                  ) : (
                    <p className="text-center text-gray-400 italic mt-8">
                      {t.noStoryChaptersAvailable}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Locations Tab */}
          {activeTab === 'locations' && (
            <div className="h-full flex flex-col">
              {isLoadingLocations ? (
                <p className="text-gray-400 italic text-center mt-8">{t.loadingLocations}</p>
              ) : generatedLocations.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 italic mb-2">{t.noGeneratedLocations}</p>
                  <p className="text-sm text-gray-500">
                    {t.enableBackgroundGeneration}
                  </p>
                </div>
              ) : (
                <>
                  {/* Segment Tabs */}
                  <div className="flex-shrink-0 flex flex-wrap gap-2 mb-4 pb-3 border-b border-cyan-900/30">
                    <button
                      onClick={() => setActiveSegmentTab('all')}
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                        activeSegmentTab === 'all'
                          ? 'bg-cyan-600 text-white'
                          : 'bg-cyan-900/30 text-cyan-200 hover:bg-cyan-800/40'
                      }`}
                    >
                      {t.locationsAll} ({generatedLocations.length})
                    </button>
                    {availableSegments.map((segment) => {
                      const count = generatedLocations.filter(l => l.segment === segment).length;
                      return (
                        <button
                          key={segment}
                          onClick={() => setActiveSegmentTab(segment)}
                          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                            activeSegmentTab === segment
                              ? 'bg-cyan-600 text-white'
                              : 'bg-cyan-900/30 text-cyan-200 hover:bg-cyan-800/40'
                          }`}
                        >
                          {segment} ({count})
                        </button>
                      );
                    })}
                  </div>

                  {/* Location Cards */}
                  <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
                    <div className="space-y-3">
                      {filteredLocations.map((loc) => (
                        <div
                          key={loc.id}
                          className="bg-black/20 border border-cyan-700/30 rounded-lg overflow-hidden hover:border-cyan-600/50 transition-colors"
                        >
                          <div className="flex items-center gap-4 p-3">
                            {/* Clickable Thumbnail */}
                            <button
                              onClick={() => setLightboxImage(locationPreviews[loc.id])}
                              className="flex-shrink-0 w-24 h-14 rounded overflow-hidden bg-black/40 hover:ring-2 hover:ring-cyan-400 transition-all cursor-zoom-in"
                            >
                              {locationPreviews[loc.id] && (
                                <img
                                  src={locationPreviews[loc.id]}
                                  alt={loc.name}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </button>

                            {/* Info */}
                            <div className="flex-grow min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-cyan-200 truncate">{loc.name}</h4>
                                <span className="text-xs px-2 py-0.5 bg-cyan-900/40 text-cyan-300 rounded">
                                  {loc.segment}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">
                                {((loc.blob?.size || 0) / 1024).toFixed(0)} KB • {new Date(loc.createdAt).toLocaleDateString()}
                              </p>
                            </div>

                            {/* Regenerate Button */}
                            {apiKeys?.gemini && loc.prompt && (
                              <button
                                onClick={() => setConfirmingLocation(loc)}
                                disabled={regeneratingLocationId === loc.id}
                                className={`flex-shrink-0 px-4 py-1.5 text-sm rounded transition-colors ${
                                  regeneratingLocationId === loc.id
                                    ? 'bg-gray-700 text-gray-400 cursor-wait'
                                    : 'bg-cyan-800/50 hover:bg-cyan-700/60 text-cyan-200 border border-cyan-600/50'
                                }`}
                                title={t.newImageTooltip}
                              >
                                {regeneratingLocationId === loc.id ? `🎨 ${t.generatingImage}` : `🎨 ${t.newImage}`}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Characters Tab */}
          {activeTab === 'characters' && (
            <div className="h-full overflow-y-auto custom-scrollbar pr-2">
              {generatedCharacters.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 italic mb-2">{t.noGeneratedCharacters}</p>
                  <p className="text-sm text-gray-500">
                    {t.enableSpriteGeneration}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {generatedCharacters.map((char) => (
                    <div
                      key={char.name}
                      className="bg-black/20 border border-cyan-700/30 rounded-lg overflow-hidden hover:border-cyan-600/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 p-3">
                        {/* Clickable Portrait */}
                        <button
                          onClick={() => setLightboxCharacter(char.image || null)}
                          className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-black/40 hover:ring-2 hover:ring-cyan-400 transition-all cursor-zoom-in"
                        >
                          {char.image && (
                            <img
                              src={char.image}
                              alt={char.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </button>

                        {/* Info */}
                        <div className="flex-grow min-w-0">
                          <h4 className={`font-semibold truncate ${char.color || 'text-gray-200'}`}>
                            {char.name} {char.lastName || ''}
                          </h4>
                          <p className="text-xs text-gray-500 truncate">{char.role}</p>
                        </div>

                        {/* Regenerate Button */}
                        {apiKeys?.gemini && char.generatedSpritePrompt && (
                          <button
                            onClick={() => setConfirmingCharacter(char)}
                            disabled={regeneratingCharacter === char.name}
                            className={`flex-shrink-0 px-4 py-1.5 text-sm rounded transition-colors ${
                              regeneratingCharacter === char.name
                                ? 'bg-gray-700 text-gray-400 cursor-wait'
                                : 'bg-cyan-800/50 hover:bg-cyan-700/60 text-cyan-200 border border-cyan-600/50'
                            }`}
                            title={t.newPortraitTooltip}
                          >
                            {regeneratingCharacter === char.name ? `🎨 ${t.generatingPortrait}` : `🎨 ${t.newPortrait}`}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="mt-6 text-center flex-shrink-0">
          <button onClick={onClose} className="vn-primary-button w-48" aria-label={t.close}>
            {t.close}
          </button>
        </div>
      </div>

      {/* Lightbox for Location Images */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            e.stopPropagation();
            setLightboxImage(null);
          }}
        >
          <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxImage}
              alt="Full size location"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxImage(null);
              }}
              className="absolute top-2 right-2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center text-xl font-bold transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Lightbox for Character Sprites */}
      {lightboxCharacter && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            e.stopPropagation();
            setLightboxCharacter(null);
          }}
        >
          <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxCharacter}
              alt="Full size character sprite"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxCharacter(null);
              }}
              className="absolute top-2 right-2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center text-xl font-bold transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Location Regeneration */}
      {confirmingLocation && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmingLocation(null);
          }}
        >
          <div
            className="vn-modal-panel max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-cyan-300 mb-3 text-shadow-medium">
              {t.confirmNewImageTitle}
            </h3>
            <p className="text-gray-300 mb-6">
              {t.confirmNewImageMessage}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmingLocation(null);
                }}
                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
              >
                {t.confirmCancel}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const loc = confirmingLocation;
                  setConfirmingLocation(null);
                  handleRegenerateLocation(loc);
                }}
                className="vn-primary-button"
              >
                {t.confirmYes}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Character Regeneration */}
      {confirmingCharacter && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmingCharacter(null);
          }}
        >
          <div
            className="vn-modal-panel max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-cyan-300 mb-3 text-shadow-medium">
              {t.confirmNewPortraitTitle}
            </h3>
            <p className="text-gray-300 mb-6">
              {t.confirmNewPortraitMessage}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmingCharacter(null);
                }}
                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
              >
                {t.confirmCancel}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const char = confirmingCharacter;
                  setConfirmingCharacter(null);
                  handleRegenerateCharacter(char);
                }}
                className="vn-primary-button"
              >
                {t.confirmYes}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
