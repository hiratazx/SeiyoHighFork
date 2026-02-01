/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React, { useState, useMemo, useEffect } from 'react';
import { TranslationSet } from '../lib/translations';
import { CharacterLikesDislikes, EvolvingStoryArc, NovelChapter, Subplot, ScheduledEvent, SceneMentalModel, ChronicleEntry, StoryArcBeat, CharacterConfig, CharacterTraits, RelationshipDynamicsStructured, DailyItinerary } from '../types';
import { decryptString, regenerateImage } from '../services/apiService';
import { db, GeneratedLocation, clearGeneratedLocations, storeGeneratedLocation } from '../db';
import { compressToWebP } from '../services/UnifiedAiService';
import { devWarn } from '../lib/devLog';

interface DevToolsModalProps {
  isVisible: boolean;
  onClose: () => void;
  characters: CharacterConfig[];
  evolvingPersonas: { [key: string]: string } | null;
  characterLikesDislikes: CharacterLikesDislikes | null;
  characterTraits: CharacterTraits | null; // [NEW]
  storyArcs: EvolvingStoryArc[] | null;
  subplots: Subplot[] | null;
  factSheet: { [day: number]: string[] };
  relationshipDynamics: string | null;
  relationshipDynamicsStructured?: RelationshipDynamicsStructured | null;
  playerName: string;
  playerBackstory: string | null;
  unaskedQuestions: { [key: string]: string | undefined } | null;
  scheduledEvents: ScheduledEvent[];
  sceneMentalModel: SceneMentalModel | null;
  characterChronicles: { [characterName: string]: ChronicleEntry[] };
  characterBiographies: { [characterName: string]: string };
  playthroughSummaries: string[];
  novelChapters: NovelChapter[];
  fullItinerary: DailyItinerary[] | null;
  currentDay: number;
  t: TranslationSet;
  // Debug action props (moved from main UI)
  onOpenItinerary?: () => void;
  onToggleShowMotivations?: () => void;
  showMotivations?: boolean;
  onTogglePromptLogging?: () => void;
  isPromptLoggingEnabled?: boolean;
  // [GENERATIVE IMAGES] For image regeneration
  apiKeys?: Record<string, string>;
  modelConfig?: { imagenModel?: string; storyModel?: string };
}

type MemoryLabel = 'Volume' | 'Brutal Summary' | 'Novel Chapter' | 'Raw Transcript' | 'Current Day';

interface MemoryTimelineEntry {
  day: number;
  label: MemoryLabel;
  detail: string;
}

function buildMemoryTimeline(
  playthroughSummaries: string[],
  currentDay: number,
  recencyWindow: number = 2,
  maxProseCount: number = 12,
): MemoryTimelineEntry[] {
  if (!currentDay || currentDay < 1) {
    return [];
  }

  let contiguousCycles = 0;
  for (let i = 0; i < playthroughSummaries.length; i++) {
    const summary = (playthroughSummaries[i] || '').trim();
    if (summary) {
      contiguousCycles += 1;
    } else {
      break;
    }
  }

  const includedVolumes = Math.max(0, contiguousCycles - 1);
  const archivedDays = includedVolumes * 14;
  const latestProseDay = currentDay - recencyWindow - 1;
  const totalHybridDays = Math.max(0, latestProseDay - archivedDays);
  const proseDays = Math.min(maxProseCount, totalHybridDays);
  const proseStartDay = proseDays > 0 ? latestProseDay - proseDays + 1 : Number.POSITIVE_INFINITY;

  const timeline: MemoryTimelineEntry[] = [];

  for (let day = 1; day <= currentDay; day++) {
    let label: MemoryLabel | null = null;
    let detail = `Day ${day}`;

    if (day <= archivedDays) {
      const volumeIndex = Math.ceil(day / 14);
      label = 'Volume';
      detail = `Volume ${volumeIndex}`;
    } else if (day === currentDay) {
      label = 'Current Day';
    } else if (day >= currentDay - recencyWindow) {
      label = 'Raw Transcript';
    } else if (proseDays > 0 && day >= proseStartDay && day <= latestProseDay) {
      label = 'Novel Chapter';
    } else if (day > archivedDays && day <= latestProseDay) {
      label = 'Brutal Summary';
    }

    if (label) {
      timeline.push({ day, label, detail });
    }
  }

  return timeline;
}

export const DevToolsModal: React.FC<DevToolsModalProps> = ({
  isVisible,
  onClose,
  characters,
  evolvingPersonas,
  characterLikesDislikes,
  characterTraits, // [NEW]
  storyArcs,
  subplots,
  factSheet,
  relationshipDynamics,
  relationshipDynamicsStructured,
  playerName,
  playerBackstory,
  unaskedQuestions,
  novelChapters,
  scheduledEvents,
  sceneMentalModel,
  characterChronicles,
  characterBiographies,
  playthroughSummaries,
  fullItinerary,
  currentDay,
  t,
  onOpenItinerary,
  onToggleShowMotivations,
  showMotivations,
  onTogglePromptLogging,
  isPromptLoggingEnabled,
  apiKeys,
  modelConfig,
}) => {
  const [activeTab, setActiveTab] = useState('Personas & Likes');
  const [selectedItineraryDay, setSelectedItineraryDay] = useState(0);
  
  // Decrypter state
  const [encryptedInput, setEncryptedInput] = useState('');
  const [decryptedOutput, setDecryptedOutput] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  
  // [GENERATIVE IMAGES] Generated locations state
  const [generatedLocations, setGeneratedLocations] = useState<GeneratedLocation[]>([]);
  const [locationPreviews, setLocationPreviews] = useState<Record<string, string>>({});
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null);
  const [regeneratingLocationId, setRegeneratingLocationId] = useState<string | null>(null);
  
  // Auto-select the latest/current day when itinerary data changes
  useEffect(() => {
    if (fullItinerary && fullItinerary.length > 0) {
      setSelectedItineraryDay(fullItinerary.length - 1);
    }
  }, [fullItinerary?.length]);
  
  // [GENERATIVE IMAGES] Fetch generated locations when modal opens or tab is selected
  useEffect(() => {
    if (isVisible && activeTab === 'Generated Locations') {
      setIsLoadingLocations(true);
      db.generatedLocations.toArray()
        .then((locations) => {
          // Filter out corrupted entries (blob not a valid Blob)
          const validLocations = locations.filter(loc => loc.blob instanceof Blob);
          if (validLocations.length < locations.length) {
            devWarn(`[DevTools] Skipped ${locations.length - validLocations.length} locations with invalid blobs`);
          }
          
          // Sort by createdAt descending (newest first)
          validLocations.sort((a, b) => b.createdAt - a.createdAt);
          setGeneratedLocations(validLocations);
          
          // Create object URLs for previews
          const previews: Record<string, string> = {};
          validLocations.forEach((loc) => {
            previews[loc.id] = URL.createObjectURL(loc.blob);
          });
          setLocationPreviews(previews);
          setIsLoadingLocations(false);
        })
        .catch((err) => {
          console.error('[DevTools] Failed to load generated locations:', err);
          setIsLoadingLocations(false);
          setGeneratedLocations([]);
        });
    }
  }, [isVisible, activeTab]);
  
  // Cleanup object URLs when component unmounts
  useEffect(() => {
    return () => {
      Object.values(locationPreviews).forEach(url => {
        try { URL.revokeObjectURL(url); } catch {}
      });
    };
  }, [locationPreviews]);

  const memoryTimeline = useMemo(
    () => buildMemoryTimeline(playthroughSummaries, currentDay),
    [playthroughSummaries, currentDay]
  );

  if (!isVisible) {
    return null;
  }

  const processedStoryArcs = storyArcs
    ?.map(arc => {
      const replacePlaceholder = (text: string | undefined) => 
        text?.replace(/{PLAYER_NAME}/g, playerName) ?? '';
      return {
        ...arc,
        summary: replacePlaceholder(arc.summary),
      };
    })
    // Sort by ownerId alphabetically, then by startDay ascending
    .sort((a, b) => {
      const ownerA = (a.ownerId || 'zzz').toLowerCase();
      const ownerB = (b.ownerId || 'zzz').toLowerCase();
      
      if (ownerA !== ownerB) {
        return ownerA.localeCompare(ownerB);
      }
      
      return (a.startDay ?? 0) - (b.startDay ?? 0);
    });

  const safeSubplots = (subplots ?? []).map(subplot => ({
    ...subplot,
    involvedCharacters: Array.isArray(subplot.involvedCharacters) ? subplot.involvedCharacters : [],
  }));

  const resolveBorderColor = (color?: string) =>
    color ? color.replace('text-', '') : '#facc15';

  return (
    <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="vn-modal-panel max-w-4xl w-full flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex-shrink-0">
          <h2 className="text-3xl font-bold text-center mb-2 text-shadow-medium text-cyan-300">{t.devTools}</h2>
          
          {/* Quick Actions */}
          <div className="flex justify-center gap-4 mb-4">
            {onOpenItinerary && (
              <button 
                onClick={() => { onOpenItinerary(); onClose(); }} 
                className="px-4 py-2 bg-blue-600/40 border-2 border-blue-400/50 rounded-lg text-white hover:bg-blue-500/40 transition-colors"
              >
                {t.itinerary}
              </button>
            )}
            {onToggleShowMotivations && (
              <button 
                onClick={onToggleShowMotivations} 
                className={`px-4 py-2 border-2 rounded-lg transition-colors ${showMotivations ? 'bg-purple-600/60 border-purple-400 text-white' : 'bg-purple-600/20 border-purple-400/50 text-purple-200 hover:bg-purple-500/40'}`}
              >
                {t.motivations}: {showMotivations ? 'ON' : 'OFF'}
              </button>
            )}
            {onTogglePromptLogging && (
              <button 
                onClick={onTogglePromptLogging} 
                className={`px-4 py-2 border-2 rounded-lg transition-colors ${isPromptLoggingEnabled ? 'bg-green-600/60 border-green-400 text-white' : 'bg-green-600/20 border-green-400/50 text-green-200 hover:bg-green-500/40'}`}
              >
                {t.promptLogging}: {isPromptLoggingEnabled ? t.on : t.off}
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap justify-center border-b-2 border-white/20 -mb-px">
            <button onClick={() => setActiveTab('Personas & Likes')} className={`px-4 py-2 ${activeTab === 'Personas & Likes' ? 'border-b-2 border-purple-400 text-white' : 'text-gray-400'}`}>Personas & Likes</button>
            <button onClick={() => setActiveTab('Base Profiles')} className={`px-4 py-2 ${activeTab === 'Base Profiles' ? 'border-b-2 border-purple-400 text-white' : 'text-gray-400'}`}>Base Profiles</button>
            <button onClick={() => setActiveTab('Player Backstory')} className={`px-4 py-2 ${activeTab === 'Player Backstory' ? 'border-b-2 border-purple-400 text-white' : 'text-gray-400'}`}>Player Backstory</button>
            <button onClick={() => setActiveTab('Story Arcs')} className={`px-4 py-2 ${activeTab === 'Story Arcs' ? 'border-b-2 border-purple-400 text-white' : 'text-gray-400'}`}>{t.storyArcs}</button>
            <button onClick={() => setActiveTab('Subplots')} className={`px-4 py-2 ${activeTab === 'Subplots' ? 'border-b-2 border-purple-400 text-white' : 'text-gray-400'}`}>{t.subplots}</button>
            <button onClick={() => setActiveTab('Relationships')} className={`px-4 py-2 ${activeTab === 'Relationships' ? 'border-b-2 border-purple-400 text-white' : 'text-gray-400'}`}>{t.relationships}</button>
            <button onClick={() => setActiveTab('Fact Sheet')} className={`px-4 py-2 ${activeTab === 'Fact Sheet' ? 'border-b-2 border-purple-400 text-white' : 'text-gray-400'}`}>{t.factSheet}</button>
            <button onClick={() => setActiveTab('Unasked Questions')} className={`px-4 py-2 ${activeTab === 'Unasked Questions' ? 'border-b-2 border-purple-400 text-white' : 'text-gray-400'}`}>Unasked Questions</button>
            <button onClick={() => setActiveTab('Brutal Summaries')} className={`px-4 py-2 ${activeTab === 'Brutal Summaries' ? 'border-b-2 border-purple-400 text-white' : 'text-gray-400'}`}>Brutal Summaries</button>
            <button onClick={() => setActiveTab('Mental Model')} className={`px-4 py-2 ${activeTab === 'Mental Model' ? 'border-b-2 border-purple-400 text-white' : 'text-gray-400'}`}>Mental Model</button>
            <button onClick={() => setActiveTab('Schedule')} className={`px-4 py-2 ${activeTab === 'Schedule' ? 'border-b-2 border-purple-400 text-white' : 'text-gray-400'}`}>Schedule</button>
            <button onClick={() => setActiveTab('Chronicles')} className={`px-4 py-2 ${activeTab === 'Chronicles' ? 'border-b-2 border-purple-400 text-white' : 'text-gray-400'}`}>Chronicles</button>
            <button onClick={() => setActiveTab('Playthroughs')} className={`px-4 py-2 ${activeTab === 'Playthroughs' ? 'border-b-2 border-purple-400 text-white' : 'text-gray-400'}`}>Playthroughs</button>
            <button onClick={() => setActiveTab('Itinerary')} className={`px-4 py-2 ${activeTab === 'Itinerary' ? 'border-b-2 border-purple-400 text-white' : 'text-gray-400'}`}>{t.itinerary}</button>
            <button onClick={() => setActiveTab('Generated Locations')} className={`px-4 py-2 ${activeTab === 'Generated Locations' ? 'border-b-2 border-emerald-400 text-white' : 'text-gray-400'}`}>🖼️ Locations</button>
            <button onClick={() => setActiveTab('Generated Sprites')} className={`px-4 py-2 ${activeTab === 'Generated Sprites' ? 'border-b-2 border-pink-400 text-white' : 'text-gray-400'}`}>🎭 Sprites</button>
            <button onClick={() => setActiveTab('Decrypter')} className={`px-4 py-2 ${activeTab === 'Decrypter' ? 'border-b-2 border-red-400 text-white' : 'text-gray-400'}`}>Decrypter</button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar mt-6">
          {activeTab === 'Personas & Likes' && (
            <div className="space-y-6">
              {characters.map(char => (
                <div key={char.name} className="p-4 bg-black/20 rounded-lg border-l-4" style={{ borderColor: resolveBorderColor(char.color) }}>
                  <h4 className={`text-xl font-bold ${char.color} mb-2`}>{char.name}</h4>
                  <div>
                    <h5 className="font-semibold text-gray-200 mt-2">Evolving Persona:</h5>
                    <pre className="text-gray-300 whitespace-pre-wrap font-sans text-sm p-2 bg-black/20 rounded mt-1">
                      {evolvingPersonas?.[char.name] || 'Not generated yet.'}
                    </pre>
                  </div>

                  {/* [NEW] Character Traits Section */}
                  {characterTraits && characterTraits[char.name] && characterTraits[char.name].length > 0 && (
                    <div>
                      <h5 className="font-semibold text-gray-200 mt-2">Character Traits:</h5>
                      <div className="space-y-2 mt-1">
                        {characterTraits[char.name].map((trait) => (
                          <div key={trait.id} className="bg-black/30 p-2 rounded border border-gray-700">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-purple-300 text-sm">{trait.name}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                trait.status === 'permanent' ? 'bg-red-900 text-red-200' :
                                trait.status === 'established' ? 'bg-green-900 text-green-200' :
                                trait.status === 'fading' ? 'bg-gray-700 text-gray-400' :
                                'bg-blue-900 text-blue-200'
                              }`}>
                                {trait.status}
                              </span>
                            </div>
                            <p className="text-xs text-gray-300 italic mb-1">"{trait.description}"</p>
                            <div className="flex justify-between text-[10px] text-gray-500">
                              <span>Origin: {trait.origin}</span>
                              <span className="uppercase tracking-wider">{trait.category}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h5 className="font-semibold text-gray-200 mt-2">Likes:</h5>
                    <ul className="list-disc list-inside pl-2 text-sm">
                      {characterLikesDislikes?.[char.name]?.likes.map((like, i) => <li key={i}>{like}</li>) || <li>Not generated yet.</li>}
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-semibold text-gray-200 mt-2">Dislikes:</h5>
                    <ul className="list-disc list-inside pl-2 text-sm">
                      {characterLikesDislikes?.[char.name]?.dislikes.map((dislike, i) => <li key={i}>{dislike}</li>) || <li>Not generated yet.</li>}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {activeTab === 'Base Profiles' && (
            <div className="space-y-6">
              {characters.map(char => (
                <div key={char.name} className="p-4 bg-black/20 rounded-lg border-l-4" style={{ borderColor: resolveBorderColor(char.color) }}>
                  <h4 className={`text-xl font-bold ${char.color} mb-2`}>{char.name}</h4>
                  <div>
                    <h5 className="font-semibold text-gray-200 mt-2">Author's Canon:</h5>
                    <pre className="text-gray-300 whitespace-pre-wrap font-sans text-sm p-2 bg-black/20 rounded mt-1">
                      {char.baseProfile || 'No base profile found.'}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'Player Backstory' && (
            <div>
              <h3 className="text-xl font-bold text-purple-300 mb-2">Player's Living Autobiography</h3>
              <div className="bg-gray-800 p-4 rounded-md">
                <p className="text-gray-300 whitespace-pre-wrap">
                  {playerBackstory || "The player's backstory has not yet been established."}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'Story Arcs' && (
            <div className="space-y-4">
              {processedStoryArcs?.map((arc, i) => (
                <div key={i} className="p-4 bg-black/20 rounded-lg">
                  <h4 className="text-xl font-bold text-green-300">{arc.title} <span className="text-sm font-normal text-gray-400">({arc.status})</span></h4>
                  <p className="italic text-gray-300 my-2">"{arc.summary}"</p>
                  <p className="text-sm text-gray-400">Involves: {(arc.involvedCharacters ?? []).join(', ') || 'None'}</p>
                  <p className="text-xs text-gray-500 mt-1">ID: {arc.id} | Owner: <span className="text-cyan-400">{arc.ownerId || 'Unknown'}</span> | Start: Day {arc.startDay}</p>
                  
                  {/* === BEGIN NEW CODE SNIPPET === */}
                  {/* Check if storyArcBeats exists and has items */}
                  {arc.storyArcBeats && arc.storyArcBeats.length > 0 && (
                    <div className="mt-3">
                      <h5 className="text-sm font-semibold text-gray-300">
                        Story Arc Beats
                      </h5>
                      
                      {/* Use a table for clean formatting */}
                      <table className="w-full text-left text-xs mt-2 table-fixed">
                        <thead className="bg-black/20 text-gray-400">
                          <tr>
                            <th className="w-1/12 p-1">#</th>
                            <th className="w-2/12 p-1">Status</th>
                            <th className="w-2/12 p-1">Req. Aff</th>
                            <th className="w-3/12 p-1">Beat ID</th>
                            <th className="w-4/12 p-1">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {arc.storyArcBeats.map((beat: StoryArcBeat, idx: number) => (
                            <tr key={beat.beat_id || `${beat.beat}-${idx}`} className="border-b border-gray-800 align-top">
                              <td className="p-1">{beat.beat}</td>
                              
                              {/* Add color-coding for status */}
                              <td className={`p-1 font-medium ${
                                beat.status === 'completed' 
                                  ? 'text-green-400' 
                                  : 'text-yellow-400'
                              }`}>
                                {beat.status}
                              </td>
                              
                              <td className="p-1">{beat.requiredAffection}</td>
                              
                              <td className="p-1 text-[10px] text-gray-400 break-words">
                                {beat.beat_id || '(missing id)'}
                              </td>

                              {/* Add break-words to handle long descriptions */}
                              <td className="p-1 text-gray-300 break-words">
                                {beat.description}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {/* === END NEW CODE SNIPPET === */}

                </div>
              )) || <p className="italic text-gray-400">No story arcs generated yet.</p>}
            </div>
          )}

          {activeTab === 'Subplots' && (
            <div className="space-y-4">
              {safeSubplots.length > 0 ? (
                safeSubplots.map((subplot, i) => {
                  const involved = subplot.involvedCharacters.length > 0
                    ? subplot.involvedCharacters.join(', ')
                    : 'Not specified';
                  return (
                    <div key={i} className="p-4 bg-black/20 rounded-lg">
                      <h4 className="text-xl font-bold text-yellow-300">{subplot.title} <span className="text-sm font-normal text-gray-400">({subplot.status})</span></h4>
                      <p className="text-gray-300 my-2">{subplot.summary}</p>
                      <p className="text-sm text-gray-400">Involves: {involved}</p>
                    </div>
                  );
                })
              ) : (
                <p className="italic text-gray-400">No subplots generated yet.</p>
              )}
            </div>
          )}
          
          {activeTab === 'Relationships' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-green-300 mb-2">{t.relationshipDynamics}</h3>
              {relationshipDynamicsStructured && Object.keys(relationshipDynamicsStructured).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(relationshipDynamicsStructured)
                    .filter(([key]) => key !== '__legacy__')
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([pairName, paragraphs]) => (
                      <div key={pairName} className="border-l-4 border-green-500/50 pl-4 py-2">
                        <div className="text-base font-bold text-green-200 mb-2">{pairName}</div>
                        <div className="space-y-3">
                          {paragraphs.map((p, idx) => (
                            <p key={`${pairName}-${p.paragraph_id || idx}`} className="text-slate-200 whitespace-pre-wrap italic leading-relaxed">
                              {p.paragraph}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-slate-300 whitespace-pre-wrap italic p-4 bg-black/20 rounded">
                  {relationshipDynamics || 'No relationship dynamics generated yet.'}
                </p>
              )}
            </div>
          )}

          {activeTab === 'Fact Sheet' && (
            <div className="space-y-4">
              {Object.keys(factSheet).length > 0 ? Object.entries(factSheet).map(([day, facts]) => (
                <div key={day} className="p-4 bg-black/20 rounded-lg">
                  <h4 className="text-xl font-bold text-blue-300">{t.day} {day}</h4>
                  <ul className="list-disc list-inside pl-2 text-sm space-y-1 mt-2">
                    {facts.map((fact, j) => <li key={j}>{fact}</li>)}
                  </ul>
                </div>
              )) : <p className="italic text-gray-400">No facts recorded yet.</p>}
            </div>
          )}

          {activeTab === 'Unasked Questions' && (
            <div>
                <h3 className="text-xl font-bold text-purple-300 mb-2">AI's Secret Notes (Unasked Questions)</h3>
                <div className="bg-gray-800 p-4 rounded-md">
                    {unaskedQuestions && Object.keys(unaskedQuestions).length > 0 ? (
                        Object.entries(unaskedQuestions).map(([charName, question]) => (
                            <div key={charName} className="mb-3">
                                <p className="font-semibold text-purple-400">{charName} is pondering:</p>
                                <p className="text-gray-300 italic">"{question}"</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-400">No unasked questions are currently pending.</p>
                    )}
                </div>
            </div>
          )}
          
          {activeTab === 'Brutal Summaries' && (
            <div>
              <h3 className="text-lg font-semibold text-pink-300 mb-2">Brutal Summaries (for AI Memory)</h3>
              {novelChapters && novelChapters.length > 0 ? (
                novelChapters.map((chapter, index) => (
                  <div key={index} className="mb-4">
                    <h4 className="text-md font-semibold text-cyan-300">Day {index + 1}:</h4>
                    <ul className="list-disc list-inside bg-gray-900 p-3 rounded-md text-xs">
                      {chapter.brutalSummary.map((point, pointIndex) => (
                        <li key={pointIndex}>{point}</li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400">No brutal summaries have been generated yet.</p>
              )}
            </div>
          )}

          {activeTab === 'Mental Model' && (
            <div>
              <h3 className="text-xl font-bold text-purple-300 mb-2">Current Scene Mental Model</h3>
              {sceneMentalModel ? (
                <pre className="text-gray-200 whitespace-pre-wrap font-sans text-sm p-4 bg-black/20 rounded">
                  {JSON.stringify(sceneMentalModel, null, 2)}
                </pre>
              ) : (
                <p className="italic text-gray-400">No active Scene Mental Model. This is generated at the start of a new scene/segment.</p>
              )}
            </div>
          )}

          {activeTab === 'Schedule' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-yellow-300 mb-2">Global Event Calendar</h3>
              {scheduledEvents && scheduledEvents.length > 0 ? (
                <div className="p-4 bg-black/20 rounded-lg">
                  <ul className="list-disc list-inside space-y-2">
                    {scheduledEvents.map((event, i) => (
                      <li key={i} className={event.isComplete ? 'text-gray-500 line-through' : 'text-gray-200'}>
                        <span className="font-semibold">Day {event.day}:</span> {event.description}
                        <span className="text-xs text-gray-400"> (Completed: {event.isComplete ? 'Yes' : 'No'})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="italic text-gray-400">The event calendar is currently empty.</p>
              )}
            </div>
          )}

          {activeTab === 'Chronicles' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-yellow-300 mb-2">Character Chronicles (Personal Memories)</h3>
              {(() => {
                const chronicleKeys = Array.from(
                  new Set([
                    ...(characterChronicles ? Object.keys(characterChronicles) : []),
                    ...(characterBiographies ? Object.keys(characterBiographies) : []),
                  ])
                );

                if (chronicleKeys.length === 0) {
                  return <p className="italic text-gray-400">No character chronicles or biographies have been recorded yet.</p>;
                }

                return chronicleKeys.map((charName) => {
                  const entries = characterChronicles?.[charName] ?? [];
                  const biography = characterBiographies?.[charName];
                  const charInfo = characters.find(c => c.name === charName);
                  const charBorder = charInfo?.color ? charInfo.color.replace('text-', '') : '#facc15';

                  return (
                    <div key={charName} className="p-4 bg-black/20 rounded-lg border-l-4" style={{ borderColor: charBorder }}>
                      <h4 className={`text-xl font-bold ${charInfo?.color || 'text-white'} mb-2`}>{charName}</h4>
                      <div className="space-y-3">
                        <div className="p-3 bg-black/30 rounded border border-yellow-900/60">
                          <h5 className="text-sm font-semibold text-yellow-200 uppercase tracking-wide">Compressed Biography</h5>
                          <p className="text-gray-200 text-sm whitespace-pre-wrap mt-1">
                            {biography || 'No biography summary recorded yet.'}
                          </p>
                        </div>
                        {entries.length > 0 ? (
                          entries.map((entry, i) => (
                            <div key={i} className="p-2 bg-black/20 rounded-md">
                              <p className="text-gray-300">
                                <span className="font-semibold text-cyan-400">Day {entry.day}, {entry.segment}:</span> "{entry.summary}"
                              </p>
                              <div className="text-xs text-gray-500 mt-1 space-x-4">
                                <span>
                                  Category: <span className="font-semibold text-gray-400">{entry.category}</span>
                                </span>
                                <span>
                                  Participants:{' '}
                                  <span className="font-semibold text-gray-400">
                                    {entry.participants && entry.participants.length > 0 ? entry.participants.join(', ') : 'None'}
                                  </span>
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-400 italic">No raw chronicle entries remain for this character.</p>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {activeTab === 'Playthroughs' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-indigo-300">Playthrough Summaries (Volume Memory)</h3>
              {playthroughSummaries.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No cycle summaries have been generated yet. Complete Day 14 (and every 14 days thereafter) to capture a volume summary.
                </p>
              ) : (
                playthroughSummaries.map((summary, index) => {
                  const startDay = index * 14 + 1;
                  const endDay = (index + 1) * 14;
                  return (
                    <div key={index} className="bg-black/20 border border-indigo-700 rounded p-4">
                      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-400 mb-2">
                        <span>Volume {index + 1}</span>
                        <span>Days {startDay}–{endDay}</span>
                      </div>
                      <pre className="whitespace-pre-wrap text-gray-100 text-sm">
                        {summary && summary.trim().length > 0
                          ? summary
                          : 'No summary was generated for this cycle (legacy save).'}
                      </pre>
                    </div>
                  );
                })
              )}
              <div className="bg-black/10 border border-indigo-900/40 rounded p-4 mt-6">
                <h4 className="text-lg font-semibold text-indigo-200 mb-2">
                  Hybrid Memory Timeline (Day {currentDay})
                </h4>
                <p className="text-xs text-gray-400 mb-3">
                  Visualizes how the hybrid memory system classifies each day: volumes for archived cycles,
                  brutal summaries for older buffer days, vivid prose for the 12-day fidelity window,
                  raw transcripts for the last two days, and today&apos;s live transcript.
                </p>
                {memoryTimeline.length === 0 ? (
                  <p className="text-sm text-gray-500">Not enough history yet to build the hybrid timeline.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs md:text-sm border-collapse">
                      <thead>
                        <tr className="text-gray-400 uppercase tracking-wide">
                          <th className="py-2 pr-4 border-b border-white/10">Day</th>
                          <th className="py-2 pr-4 border-b border-white/10">Classification</th>
                          <th className="py-2 border-b border-white/10">Detail</th>
                        </tr>
                      </thead>
                      <tbody>
                        {memoryTimeline.map(entry => (
                          <tr key={entry.day} className="border-b border-white/5">
                            <td className="py-1 pr-4 text-gray-200 font-semibold">Day {entry.day}</td>
                            <td className="py-1 pr-4">
                              {entry.label === 'Volume' && <span className="text-indigo-300">Volume</span>}
                              {entry.label === 'Brutal Summary' && <span className="text-pink-300">Brutal Summary</span>}
                              {entry.label === 'Novel Chapter' && <span className="text-green-300">Novel Chapter</span>}
                              {entry.label === 'Raw Transcript' && <span className="text-yellow-200">Raw Transcript</span>}
                              {entry.label === 'Current Day' && <span className="text-cyan-200">Current Day</span>}
                            </td>
                            <td className="py-1 text-gray-300">{entry.detail}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'Itinerary' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-amber-300">{t.itinerary}</h3>
              {!fullItinerary || fullItinerary.length === 0 ? (
                <p className="text-gray-400 italic">No itinerary has been generated yet.</p>
              ) : (
                <>
                  {/* Day selector buttons */}
                  <div className="flex flex-wrap gap-2 pb-3 border-b border-amber-700/30">
                    {fullItinerary.map((_, dayIndex) => (
                      <button
                        key={dayIndex}
                        onClick={() => setSelectedItineraryDay(dayIndex)}
                        className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                          selectedItineraryDay === dayIndex
                            ? 'bg-amber-600 text-white'
                            : 'bg-amber-900/30 text-amber-300 hover:bg-amber-800/50'
                        }`}
                      >
                        Day {dayIndex + 1}
                      </button>
                    ))}
                  </div>

                  {/* Selected day's itinerary */}
                  {fullItinerary[selectedItineraryDay] && (
                    <div className="bg-black/20 border border-amber-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-bold text-amber-200">Day {selectedItineraryDay + 1}</h4>
                        <span className="text-sm text-amber-400 italic">"{fullItinerary[selectedItineraryDay].day_theme}"</span>
                      </div>
                      <div className="space-y-4">
                        {fullItinerary[selectedItineraryDay].segments.map((segment, segIndex) => (
                          <div key={segIndex} className="border-l-4 border-amber-500/50 pl-4 py-2 bg-black/10 rounded-r">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-amber-100 uppercase tracking-wide text-sm">{segment.segment}</span>
                              <span className="text-xs text-gray-400">{segment.location_hint}</span>
                            </div>
                            <div className="mb-2">
                              <span className="text-xs text-gray-500 uppercase">Focus: </span>
                              <span className="text-sm text-gray-300">{segment.character_focus?.join(', ') || 'N/A'}</span>
                            </div>
                            <div className="bg-black/20 rounded p-3">
                              <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                                {segment.scenarioProse}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'Generated Locations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-emerald-300">🖼️ AI-Generated Backgrounds</h3>
                {generatedLocations.length > 0 && (
                  <button
                    onClick={async () => {
                      if (confirm('Clear all generated locations from cache? This cannot be undone.')) {
                        await clearGeneratedLocations();
                        setGeneratedLocations([]);
                        Object.values(locationPreviews).forEach(url => URL.revokeObjectURL(url));
                        setLocationPreviews({});
                      }
                    }}
                    className="px-3 py-1.5 text-xs bg-red-900/40 border border-red-700/50 text-red-300 rounded hover:bg-red-800/50 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
              
              {isLoadingLocations ? (
                <p className="text-gray-400 italic">Loading generated locations...</p>
              ) : generatedLocations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 italic mb-2">No AI-generated backgrounds yet.</p>
                  <p className="text-sm text-gray-500">
                    Enable "AI Background Generation" in Model Settings to generate custom backgrounds.
                  </p>
                </div>
              ) : (
                <>
                  {/* Summary stats */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-black/20 rounded-lg border border-emerald-700/30">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-300">{generatedLocations.length}</p>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Locations</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-300">
                        {(generatedLocations.reduce((sum, loc) => sum + (loc.blob?.size || 0), 0) / 1024 / 1024).toFixed(1)} MB
                      </p>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Total Size</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-300">
                        {Math.round(generatedLocations.reduce((sum, loc) => sum + (loc.blob?.size || 0), 0) / generatedLocations.length / 1024)} KB
                      </p>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Avg Size</p>
                    </div>
                  </div>

                  {/* Location cards */}
                  <div className="space-y-3">
                    {generatedLocations.map((loc) => (
                      <div
                        key={loc.id}
                        className="bg-black/20 border border-emerald-700/30 rounded-lg overflow-hidden hover:border-emerald-600/50 transition-colors"
                      >
                        {/* Header (always visible) */}
                        <button
                          onClick={() => setExpandedLocationId(expandedLocationId === loc.id ? null : loc.id)}
                          className="w-full flex items-center gap-4 p-3 text-left hover:bg-emerald-900/10 transition-colors"
                        >
                          {/* Thumbnail */}
                          <div className="flex-shrink-0 w-20 h-12 rounded overflow-hidden bg-black/40">
                            {locationPreviews[loc.id] && (
                              <img
                                src={locationPreviews[loc.id]}
                                alt={loc.name}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          
                          {/* Info */}
                          <div className="flex-grow min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-emerald-200 truncate">{loc.name}</h4>
                              <span className="text-xs px-2 py-0.5 bg-emerald-900/40 text-emerald-300 rounded">
                                {loc.segment}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 truncate">{loc.id}</p>
                          </div>
                          
                          {/* Size & Expand indicator */}
                          <div className="flex-shrink-0 text-right">
                            <p className="text-sm text-gray-300">{((loc.blob?.size || 0) / 1024).toFixed(0)} KB</p>
                            <p className="text-xs text-gray-500">{loc.blob?.type?.split('/')[1]?.toUpperCase() || 'IMG'}</p>
                          </div>
                          <span className="text-gray-500 ml-2">
                            {expandedLocationId === loc.id ? '▼' : '▶'}
                          </span>
                        </button>
                        
                        {/* Expanded details */}
                        {expandedLocationId === loc.id && (
                          <div className="border-t border-emerald-900/30 p-4 space-y-4">
                            {/* Large preview */}
                            <div className="rounded-lg overflow-hidden bg-black/40 max-h-64 flex items-center justify-center">
                              {locationPreviews[loc.id] && (
                                <img
                                  src={locationPreviews[loc.id]}
                                  alt={loc.name}
                                  className="max-w-full max-h-64 object-contain"
                                />
                              )}
                            </div>
                            
                            {/* Prompt */}
                            <div>
                              <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                                Generation Prompt
                              </h5>
                              <p className="text-sm text-gray-200 bg-black/30 p-3 rounded whitespace-pre-wrap">
                                {loc.prompt || 'No prompt recorded'}
                              </p>
                            </div>
                            
                            {/* Metadata */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Created:</span>{' '}
                                <span className="text-gray-300">
                                  {new Date(loc.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Format:</span>{' '}
                                <span className="text-gray-300">{loc.blob?.type || 'unknown'}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Size:</span>{' '}
                                <span className="text-gray-300">{((loc.blob?.size || 0) / 1024).toFixed(1)} KB</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Segment:</span>{' '}
                                <span className="text-gray-300">{loc.segment}</span>
                              </div>
                            </div>

                            {/* Regenerate Button */}
                            {apiKeys?.gemini && loc.prompt && (
                              <button
                                onClick={async () => {
                                  if (regeneratingLocationId) return;
                                  setRegeneratingLocationId(loc.id);
                                  try {
                                    const result = await regenerateImage(
                                      loc.prompt,
                                      loc.segment,
                                      '16:9', // Default aspect ratio
                                      apiKeys,
                                      modelConfig?.imagenModel,
                                      modelConfig?.storyModel || 'gemini-3-flash-preview'
                                    );
                                    if (result.success && result.data) {
                                      // Compress to WebP for efficient storage (same as regular generation)
                                      const newBlob = await compressToWebP(result.data, result.mime || 'image/png');
                                      
                                      // Store the new image (this replaces the old one)
                                      await storeGeneratedLocation(
                                        loc.id,
                                        loc.name,
                                        loc.segment,
                                        loc.prompt,
                                        loc.summary || '',
                                        newBlob
                                      );
                                      
                                      // Update local state
                                      const updatedLocations = await db.generatedLocations.toArray();
                                      updatedLocations.sort((a, b) => b.createdAt - a.createdAt);
                                      setGeneratedLocations(updatedLocations);
                                      
                                      // Update preview URL
                                      URL.revokeObjectURL(locationPreviews[loc.id]);
                                      setLocationPreviews(prev => ({
                                        ...prev,
                                        [loc.id]: URL.createObjectURL(newBlob)
                                      }));
                                    } else {
                                      alert('Regeneration failed: ' + (result.error || 'Unknown error'));
                                    }
                                  } catch (err: any) {
                                    console.error('Regeneration error:', err);
                                    alert('Regeneration failed: ' + err.message);
                                  } finally {
                                    setRegeneratingLocationId(null);
                                  }
                                }}
                                disabled={regeneratingLocationId === loc.id}
                                className={`w-full mt-2 px-4 py-2 rounded transition-colors ${
                                  regeneratingLocationId === loc.id
                                    ? 'bg-gray-700 text-gray-400 cursor-wait'
                                    : 'bg-emerald-800/50 hover:bg-emerald-700/60 text-emerald-200 border border-emerald-600/50'
                                }`}
                              >
                                {regeneratingLocationId === loc.id ? '🔄 Regenerating...' : '🔄 Regenerate Image'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'Generated Sprites' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-pink-300">🎭 AI-Generated Character Sprites</h3>
              <p className="text-sm text-gray-400">
                Characters with AI-generated sprites. Shows the appearance prompts used for generation.
              </p>

              {(() => {
                const generatedChars = characters.filter(c => c.image?.startsWith('data:') && c.generatedSpritePrompt);
                if (generatedChars.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <p className="text-gray-400 italic">No AI-generated character sprites yet.</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Enable "AI Character Sprite Generation" in Model Settings.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {generatedChars.map((char) => (
                      <div
                        key={char.name}
                        className="bg-black/20 border border-pink-700/30 rounded-lg overflow-hidden hover:border-pink-500/50 transition-colors"
                      >
                        <div className="flex">
                          {/* Character Portrait */}
                          <div className="w-32 h-32 flex-shrink-0 bg-black/40">
                            {char.image && (
                              <img
                                src={char.image}
                                alt={char.name}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-grow p-3">
                            <h4 className={`font-semibold ${char.color || 'text-gray-200'}`}>
                              {char.name} {char.lastName || ''}
                            </h4>
                            <p className="text-xs text-gray-500 mb-2">{char.role}</p>
                            
                            {/* Appearance Prompt */}
                            <div className="bg-black/30 rounded p-2 max-h-24 overflow-y-auto custom-scrollbar">
                              <p className="text-xs text-gray-300 whitespace-pre-wrap">
                                {char.generatedSpritePrompt}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === 'Decrypter' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-red-300">String Decrypter</h3>
              <p className="text-sm text-gray-400">
                Paste an encrypted string (starting with "ENC::...") to decrypt it. Useful for debugging encrypted save game data.
              </p>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Encrypted String:</label>
                  <textarea
                    value={encryptedInput}
                    onChange={(e) => {
                      setEncryptedInput(e.target.value);
                      setDecryptError(null);
                    }}
                    placeholder="Paste ENC::... string here"
                    className="w-full h-32 p-3 bg-black/40 border border-red-700/50 rounded-lg text-gray-200 text-sm font-mono resize-none focus:outline-none focus:border-red-500"
                  />
                </div>
                
                <button
                  onClick={async () => {
                    if (!encryptedInput.trim()) return;
                    setIsDecrypting(true);
                    setDecryptError(null);
                    setDecryptedOutput(null);
                    
                    const result = await decryptString(encryptedInput.trim());
                    
                    if (result.error) {
                      setDecryptError(result.error);
                    } else {
                      const output = typeof result.decrypted === 'string' 
                        ? result.decrypted 
                        : JSON.stringify(result.decrypted, null, 2);
                      setDecryptedOutput(output);
                      if (result.message) {
                        setDecryptError(result.message);
                      }
                    }
                    setIsDecrypting(false);
                  }}
                  disabled={isDecrypting || !encryptedInput.trim()}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    isDecrypting || !encryptedInput.trim()
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-500'
                  }`}
                >
                  {isDecrypting ? 'Decrypting...' : 'Decrypt'}
                </button>
                
                {decryptError && (
                  <div className="p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
                    <p className="text-yellow-300 text-sm">{decryptError}</p>
                  </div>
                )}
                
                {decryptedOutput !== null && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Decrypted Result:</label>
                    <pre className="w-full p-3 bg-black/40 border border-green-700/50 rounded-lg text-green-300 text-sm font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {decryptedOutput}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 text-center flex-shrink-0">
          <button onClick={onClose} className="vn-primary-button w-48" aria-label={t.close}>
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
