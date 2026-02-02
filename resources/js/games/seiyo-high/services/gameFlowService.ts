/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import * as geminiService from './geminiService';
import * as apiService from './apiService';
import * as characterDeveloperService from './characterDeveloper.service'; // [NEW]
import * as novelistService from '../features/novelist/novelist.service';
import * as psychoanalystService from '../features/psychoanalyst/psychoanalyst.service';
import * as transitionDirectorService from '../features/transitionDirector/transitionDirector.service';
import * as relationshipAnalystService from '../features/relationshipAnalyst/relationshipAnalyst.service';
import { convertProfilesArrayToObject } from '../features/relationshipAnalyst/relationshipAnalyst.service';
import * as canonArchivistService from '../features/canonArchivist/canonArchivist.service';
import * as castAnalystService from '../features/castAnalyst/castAnalyst.service';
import * as arcManagerService from '../features/arcManager/arcManager.service';
import { v4 as uuidv4 } from 'uuid';
import * as dungeonMasterService from '../features/dungeonMaster/dungeonMaster.service';
import * as persistenceService from './persistenceService';
import { db, getGeneratedLocationSummaries, getKnownLocationIds } from '../db'; // [FIX] Import db for direct Dexie access
import { STORY_NAME } from '../storyConfig';
import { handleGeneratedAssets } from './UnifiedAiService'; // [GENERATIVE IMAGES]
import { devLog, devWarn, devDebug } from '../lib/devLog';
import { getAvailableGenericSetInfo, findGenericSpriteSet, genericSpriteSets } from '../lib/genericSprites';
import {
    EOD_STEP_KEY, EOD_KEY_FINAL_HISTORY, EOD_PIPELINE_PREFIX, EOD_KEY_ERRORS, EOD_KEY_SEGMENT_ENDED,
    EOD_KEY_CAST_ANALYST_RAW, EOD_KEY_UPDATED_MAIN_CHARS, EOD_KEY_UPDATED_SIDE_CHARS,
    EOD_KEY_UPDATED_AVAILABLE_SPRITES, EOD_KEY_PROMO_AFFECTION_PREFIX, EOD_KEY_NEWLY_PROMOTED_NAMES,
    EOD_KEY_RELATIONSHIP_ANALYST_RAW, EOD_KEY_PLAYER_ANALYSIS_RAW,
    EOD_KEY_MERGED_PROFILES, EOD_KEY_MERGED_PROFILES_TRANSLATED,
    EOD_KEY_RELATIONSHIP_DYNAMICS, EOD_KEY_RELATIONSHIP_DYNAMICS_TRANSLATED, EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED, EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED_TRANSLATED,
    EOD_KEY_CHARACTER_CHRONICLES, EOD_KEY_CHARACTER_BIOGRAPHIES, EOD_KEY_UNASKED_QUESTIONS, EOD_KEY_AFFECTION,
    EOD_KEY_NOVEL_CHAPTERS, EOD_KEY_PLAYER_PSYCHOANALYSIS_PROSE,
    EOD_KEY_PLAYER_BACKSTORY, EOD_KEY_NEW_CHRONICLE_ENTRIES, EOD_KEY_NEWLY_INSPIRED_QUESTIONS,
    EOD_KEY_NOVEL_CHAPTER_RAW, EOD_KEY_ARCHIVIST_RAW, EOD_KEY_UPDATED_FACT_SHEET, EOD_KEY_UPDATED_SCHEDULE,
    EOD_KEY_UPDATED_CHARACTER_BIOGRAPHIES, EOD_KEY_UPDATED_CHARACTER_CHRONICLES,
    EOD_KEY_ARC_MANAGER_RAW, EOD_KEY_PLANNER_RAW, EOD_KEY_FINAL_ITINERARY_DAY, EOD_KEY_DAY_CALENDAR, EOD_KEY_FINAL_EVOLVING_PERSONAS,
    EOD_KEY_FINAL_LIKES_DISLIKES, EOD_KEY_FINAL_STORY_ARCS, EOD_KEY_FINAL_SUBPLOTS,
    EOD_KEY_CHARACTER_TRAITS, // [NEW]
    EOD_KEY_TRANSLATION_RAW, EOD_KEY_TRANSLATED_NOVEL, EOD_KEY_TRANSLATED_PLAYER_PROSE, EOD_KEY_TRANSLATED_ITINERARY_DAY,
    EOD_KEY_OPENING_SCENE_RAW, EOD_KEY_FINAL_SCENE_MENTAL_MODEL, EOD_KEY_PLAYTHROUGH_SUMMARIES,
    NEW_GAME_STEP_KEY, NEW_GAME_PIPELINE_PREFIX, NEW_GAME_KEY_UI_TRANSLATIONS, NEW_GAME_KEY_FOUNDATION,
    NEW_GAME_KEY_DAY_ONE_ITINERARY, NEW_GAME_KEY_DAY_ONE_ITINERARY_TRANSLATED, NEW_GAME_KEY_OPENING_SCENE,
    NEW_GAME_KEY_DAY_CALENDAR, // [NEW] Weather/calendar system
    NEW_GAME_KEY_ERRORS, NEW_GAME_KEY_INITIAL_TRAITS, // [NEW]
    NEW_GAME_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED, NEW_GAME_KEY_PLAYER_NAME, // [NEW]
    NEW_GAME_KEY_FOUNDATION_NEW_CHARACTER, // [NEW] Character created by Narrative Architect
    SEGMENT_STEP_KEY, SEGMENT_PIPELINE_PREFIX, SEGMENT_KEY_UPDATED_FULL_HISTORY,
    SEGMENT_KEY_ANALYST_DATA, SEGMENT_KEY_DIRECTOR_RESULT, SEGMENT_KEY_ERRORS,
    SEGMENT_KEY_RELATIONSHIP_KEYS_MODIFIED_TODAY,
    // EOD Pipeline State Bucket for caching/resume support
    PipelineStateBucket,
    savePipelineStateBucket,
    loadPipelineStateBucket,
    clearPipelineStateBucket
} from './persistenceService';
import {
  AppState,
  ChronicleEntry,
  DailyItinerary,
  DayLog,
  DaySegment,
  DialogueEntry,
  EndOfDayStep,
  FullItinerary,
  GeminiModel,
  AiModelId,
  InitialStoryFoundation,
  ItinerarySegment,
  ModelSelection,
  NewGameStep,
  NextDayResponse,
  NovelChapter,
  ArcManagerAnalysis,
  PromptDayLog,
  PsychologicalProfiles,
  RelationshipDynamicsStructured,
  SegmentLog,
  SegmentTransitionStep,
  TransitionDirectorResponse,
  TDPreGenerationCompliance,
  VnScene,
  PromptHistoryEntry,
  ApiCallResult,
  PlayerAnalysisResponse,
  SpriteSet,
  NewChronicleEntry,
  EndOfDayTranslationBundle,
  CharacterLikesDislikes,
  EvolvingStoryArc,
  Subplot,
  ScheduledEvent,
  SceneMentalModel,
  AiPersona,
  NarrativeArchitectNextDayPayload,
  CharacterConfig,
  CharacterTraits, // [NEW]
  CanonArchivistResponse,
  DayCalendar,
} from '../types';
import { isDailyItineraryValid, processItineraryPlaceholders } from '../lib/itineraryUtils';
import { mapFullHistoryForAI, mapHistoryForAI, sanitizeObject, assembleHybridMemory, assembleVolumeAwareNovelContext, assembleNovelistMemory } from '../lib/promptUtils';
import { AVAILABLE_MODELS } from '../lib/modelConfig';
import { isCharacterMatch } from '../lib/characterUtils';

// ═══════════════════════════════════════════════════════════════════════════════
// TD COMPLIANCE LOGGING HELPER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Formats and logs the TransitionDirector's pre-generation compliance report
 * in a nicely styled format similar to the DM's compliance report.
 * 
 * @param compliance The pre-generation compliance checks from TD
 * @param thoughtSummary Optional AI thought summary for debugging
 */
function logTDComplianceReport(compliance: TDPreGenerationCompliance, thoughtSummary?: string): void {
    const hasIssue = (field: string | undefined) => 
        field?.toLowerCase().includes('violation') || 
        field?.toLowerCase().includes('conflict') ||
        field?.toLowerCase().includes('rewrite required');
    
    const hasRewrite = (field: string | undefined) =>
        field?.toLowerCase().includes('rewrite required');
    
    const hasConflict = (field: string | undefined) =>
        field?.toLowerCase().includes('conflict');

    // Determine header based on coherence decision
    const coherenceDecision = compliance.story_coherence_scan?.coherence_decision || '';
    const isRewrite = hasRewrite(coherenceDecision);
    const isWeaveIn = coherenceDecision.toLowerCase().includes('weave in');
    const hasAnyConflict = hasConflict(compliance.story_coherence_scan?.player_plans_conflict) ||
                          hasConflict(compliance.story_coherence_scan?.emergent_arrangements_conflict);

    let headerStyle: string;
    let headerText: string;
    
    if (isRewrite) {
        headerStyle = 'background: #e74c3c; color: white; font-size: 14px; padding: 4px 8px; border-radius: 4px;';
        headerText = '🔄 TD COMPLIANCE: REWRITE REQUIRED';
    } else if (isWeaveIn) {
        headerStyle = 'background: #f39c12; color: white; font-size: 14px; padding: 4px 8px; border-radius: 4px;';
        headerText = '🔀 TD COMPLIANCE: WEAVE IN';
    } else if (hasAnyConflict) {
        headerStyle = 'background: #f39c12; color: white; font-size: 14px; padding: 4px 8px; border-radius: 4px;';
        headerText = '⚠️ TD COMPLIANCE: CONFLICT DETECTED';
    } else {
        headerStyle = 'background: #2ecc71; color: white; font-size: 14px; padding: 4px 8px; border-radius: 4px;';
        headerText = '✅ TD COMPLIANCE: PROCEED';
    }

    devLog(`%c${headerText}`, headerStyle);

    // Story Coherence Scan (the most important part)
    if (compliance.story_coherence_scan) {
        const scan = compliance.story_coherence_scan;
        devLog('%c📖 STORY COHERENCE SCAN:', 'color: #9b59b6; font-weight: bold; font-size: 12px;');
        
        devLog('%c  🎮 Player Plans Detected:', hasConflict(scan.player_plans_conflict) ? 'color: #f39c12; font-weight: bold;' : 'color: #3498db;', 
            scan.player_plans_detected || '(none)');
        devLog('%c  ⚡ Player Plans Conflict:', hasConflict(scan.player_plans_conflict) ? 'color: #e74c3c; font-weight: bold;' : 'color: #2ecc71;', 
            scan.player_plans_conflict || 'N/A');
        
        devLog('%c  📅 Emergent Arrangements:', hasConflict(scan.emergent_arrangements_conflict) ? 'color: #f39c12; font-weight: bold;' : 'color: #3498db;', 
            scan.emergent_arrangements_detected || '(none)');
        devLog('%c  ⚡ Arrangements Conflict:', hasConflict(scan.emergent_arrangements_conflict) ? 'color: #e74c3c; font-weight: bold;' : 'color: #2ecc71;', 
            scan.emergent_arrangements_conflict || 'N/A');
        
        const decisionStyle = isRewrite 
            ? 'color: #e74c3c; font-weight: bold; font-size: 13px;' 
            : isWeaveIn 
                ? 'color: #f39c12; font-weight: bold; font-size: 13px;'
                : 'color: #2ecc71; font-weight: bold; font-size: 13px;';
        devLog('%c  🎯 DECISION:', decisionStyle, scan.coherence_decision || '(not provided)');
        
        // Log the substance plan if this is a rewrite
        if (scan.rewrite_substance_plan) {
            devLog('%c  📝 REWRITE SUBSTANCE PLAN:', 'color: #e74c3c; font-weight: bold; font-size: 12px;', scan.rewrite_substance_plan);
        }
    }

    // Other compliance checks (collapsible group)
    devLog('%c📋 OTHER COMPLIANCE CHECKS:', 'color: #7f8c8d; font-weight: bold; font-size: 11px;');
    devLog('%c  🔒 Physical Constraints:', hasIssue(compliance.physical_constraint_check) ? 'color: #e74c3c;' : 'color: #95a5a6;', 
        compliance.physical_constraint_check || '(not provided)');
    devLog('%c  👻 Ghost Characters:', 'color: #95a5a6;', 
        compliance.ghost_character_resolution || '(not provided)');
    devLog('%c  📛 Character References:', 'color: #95a5a6;', 
        compliance.character_reference_plan || '(not provided)');
    devLog('%c  🧠 Knowledge Boundaries:', 'color: #95a5a6;', 
        compliance.knowledge_boundaries || '(not provided)');
    
    // AI Thought Summary - shows Gemini's reasoning process for debugging
    if (thoughtSummary) {
        devLog('%c🧠 TD THOUGHT SUMMARY:', 'background: #3498db; color: white; font-size: 12px; padding: 2px 6px; border-radius: 3px;');
        devLog('%c' + thoughtSummary, 'color: #7f8c8d; font-style: italic; white-space: pre-wrap; padding-left: 8px;');
    }
}

// Helper to get daySegments - loads from persisted worldConfig, NOT React state
// This prevents data corruption from stale React state
const getDaySegmentsFromDeps = (deps: { daySegments?: string[]; worldConfig?: { day_structure: string[] } | null }): string[] => {
    // First try persisted worldConfig (most reliable)
    if (deps.worldConfig?.day_structure && deps.worldConfig.day_structure.length > 0) {
        return deps.worldConfig.day_structure;
    }
    // Fallback to React state (less reliable but may be more up-to-date)
    if (deps.daySegments && deps.daySegments.length > 0) {
        return deps.daySegments;
    }
    throw new Error('CRITICAL: daySegments not available. Cannot safely sort segments without corrupting save data.');
};

/**
 * Gets the first segment from an itinerary by sorting according to the day structure.
 * This is robust against AI returning segments in wrong order and works with any day structure.
 */
function getFirstSegmentByOrder(
    segments: ItinerarySegment[], 
    dayStructure: string[]
): ItinerarySegment | undefined {
    if (!segments || segments.length === 0) return undefined;
    
    // Sort segments by their position in the day structure
    const sorted = [...segments].sort((a, b) => {
        const indexA = dayStructure.indexOf(a.segment);
        const indexB = dayStructure.indexOf(b.segment);
        // Unknown segments go to the end
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });
    
    return sorted[0];
}

// FIX: Import TranslationSet from its source file.
import { TranslationSet } from '../lib/translations';
import { executeApiCallWithPolicy } from './geminiService';
// [NEW] Import extension
import { executeCharacterDeveloperStep } from './gameFlowServiceExtensions';
import { CharacterDeveloperAnalysis } from '../types'; // [NEW]

export type GameFlowDeps = Omit<ReturnType<typeof import('../hooks/useGameLoop')['useGameLoop']>, 'state' | 'handlers' | 'uiState' | 'devState'> &
  ReturnType<typeof import('../hooks/useGameLoop')['useGameLoop']>['state'] &
  ReturnType<typeof import('../hooks/useGameLoop')['useGameLoop']>['handlers'] &
  ReturnType<typeof import('../hooks/useGameLoop')['useGameLoop']>['uiState'] &
  ReturnType<typeof import('../hooks/useGameLoop')['useGameLoop']>['devState'] &
  { promptHistory: PromptHistoryEntry[] } &
  { shouldContinue?: () => boolean };

type Setters = GameFlowDeps & {
      setUiTranslations: (value: import('react').SetStateAction<TranslationSet>) => void;
      setCharacterTraits: (value: import('react').SetStateAction<CharacterTraits | null>) => void; // [NEW]
      setCharacterBiographies: (value: import('react').SetStateAction<{ [key: string]: string }>) => void;
      setIsPipelineCompleteAndReady: (value: import('react').SetStateAction<boolean>) => void;
  setOpeningSceneCache: (value: import('react').SetStateAction<VnScene | null>) => void;
  setPlaythroughSummaries: (value: import('react').SetStateAction<string[]>) => void;
  setDayCalendar: (value: import('react').SetStateAction<DayCalendar | null>) => void;
  startCountdown: (stepKey: string, seconds: number, type: 'success' | 'error' | 'timeout' | null) => void;
  waitForCountdown: () => Promise<void>;
};

const isProcessingRef = { current: false };
const MAX_PLAYER_DIALOGUE_RETRIES = 3;

const RELATIONSHIP_KEY_DELIMITERS = ['|', '+'];

// APP_SETTINGS_KEY must match useAppSettings.ts
const APP_SETTINGS_KEY = 'vn_app_settings_v1';

/**
 * Get the CURRENT model config from localStorage.
 * This ensures model changes take effect immediately, even mid-pipeline.
 * Falls back to deps.modelConfig if localStorage read fails.
 */
const getCurrentModelConfig = (deps: { modelConfig?: ModelSelection; getModelConfig?: () => ModelSelection }): ModelSelection => {
    // First try the getter function if available
    if (deps.getModelConfig) {
        return deps.getModelConfig();
    }
    
    // Read directly from localStorage for the most current value
    try {
        const raw = localStorage.getItem(APP_SETTINGS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.modelConfig) {
                return parsed.modelConfig;
            }
        }
    } catch (e) {
        devWarn('[gameFlowService] Failed to read modelConfig from localStorage:', e);
    }
    
    // Fallback to deps snapshot
    return deps.modelConfig!;
};

/**
 * Get the CURRENT API keys with robust fallback.
 * Checks getter → localStorage → deps snapshot, prioritizing whichever has a valid Gemini key.
 */
const getCurrentApiKeys = (deps: { apiKeys?: Record<string, string>; getApiKeys?: () => Record<string, string> }): Record<string, string> => {
    const hasValidGeminiKey = (keys: Record<string, string> | undefined): boolean => {
        return !!(keys?.gemini && keys.gemini.length > 10);
    };

    // First try the getter function if available AND has valid key
    if (deps.getApiKeys) {
        const getterKeys = deps.getApiKeys();
        if (hasValidGeminiKey(getterKeys)) {
            return getterKeys;
        }
    }
    
    // Try localStorage as fallback
    try {
        const raw = localStorage.getItem(APP_SETTINGS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (hasValidGeminiKey(parsed?.apiKeys)) {
                devWarn('[gameFlowService] API key missing from state but found in localStorage - using localStorage');
                return parsed.apiKeys;
            }
        }
    } catch (e) {
        devWarn('[gameFlowService] Failed to read apiKeys from localStorage:', e);
    }
    
    // Try deps snapshot
    if (hasValidGeminiKey(deps.apiKeys)) {
        return deps.apiKeys!;
    }

    // Return whatever we have (may be empty - backend will return proper error)
    devWarn('[gameFlowService] No valid API key found in getter, localStorage, or deps');
    return deps.getApiKeys?.() || deps.apiKeys || {};
};

const structuredDynamicsToProse = (structured: any): string | null => {
    if (!structured || typeof structured !== 'object') return null;
    const paragraphs: string[] = [];
    Object.entries(structured).forEach(([key, paras]) => {
        if (!Array.isArray(paras)) return;
        const body = paras
            .map((p: any) => (p && p.paragraph ? p.paragraph : ''))
            .filter(Boolean)
            .join(' ');
        if (body) paragraphs.push(`${key}: ${body}`);
    });
    return paragraphs.length > 0 ? paragraphs.join('\n\n') : null;
};

const firstName = (s: string) => (s || '').split(' ')[0] || s;

/**
 * [NEW GAME PIPELINE] Helper to get side characters including any foundation-created character.
 * This ensures all subsequent AI steps in the new game pipeline know about the new character.
 */
const getNewGameSideCharacters = async (includeBaseProfile: boolean = false): Promise<{ name: string; lastName?: string; role?: string; appearance?: string; baseProfile?: string }[]> => {
    const gameConfig = await apiService.fetchGameConfig(STORY_NAME);
    const freshSideCharacters = gameConfig.characters
        .filter(c => c.type === 'side')
        .map(c => includeBaseProfile 
            ? { ...c, baseProfile: (c as any).baseProfile ?? 'Generated during gameplay.' }
            : { name: c.name }
        );
    
    // Check for foundation-created character
    const foundationNewChar = await persistenceService.loadPipelineData<CharacterConfig>(NEW_GAME_KEY_FOUNDATION_NEW_CHARACTER);
    if (foundationNewChar) {
        // Avoid duplicates
        if (!freshSideCharacters.some(c => c.name === foundationNewChar.name)) {
            const newCharEntry = includeBaseProfile 
                ? { 
                    name: foundationNewChar.name, 
                    lastName: foundationNewChar.lastName,
                    role: foundationNewChar.role,
                    appearance: foundationNewChar.appearance,
                    baseProfile: foundationNewChar.baseProfile ?? 'AI-generated character.' 
                }
                : { name: foundationNewChar.name };
            freshSideCharacters.push(newCharEntry as any);
            devLog(`[NewGame Pipeline] Including foundation character: ${foundationNewChar.name}`);
        }
    }
    
    return freshSideCharacters;
};

// Extract character developer payload (supports decoded_response and string bodies)
const extractCdPayload = (raw: any) => {
    const parseMaybe = (x: any) => {
        if (typeof x === 'string') {
            try { return JSON.parse(x); } catch { return x; }
        }
        return x;
    };
    const root = parseMaybe(raw);
    const decoded = parseMaybe(root?.decoded_response);
    const inner = parseMaybe(root?.data);

    const pick = (obj: any, key: string) => (obj && typeof obj === 'object') ? obj[key] : undefined;

    const updates =
        pick(root, 'character_updates') ??
        pick(decoded, 'character_updates') ??
        pick(inner, 'character_updates');

    const updatedTraits =
        pick(root, 'updated_traits') ??
        pick(decoded, 'updated_traits') ??
        pick(inner, 'updated_traits');

    const updatedLikes =
        pick(root, 'updated_likes_dislikes') ??
        pick(decoded, 'updated_likes_dislikes') ??
        pick(inner, 'updated_likes_dislikes');

    return { updates, updatedTraits, updatedLikes };
};

const normalizeLikesDislikesShape = (likesDislikes: any, mainCharacters: { name: string }[]) => {
    const normalized: CharacterLikesDislikes = {};
    if (likesDislikes && typeof likesDislikes === 'object') {
        Object.entries(likesDislikes).forEach(([rawName, entry]) => {
            const name = firstName(rawName);
            const likes = Array.isArray((entry as any)?.likes) ? (entry as any).likes : [];
            const dislikes = Array.isArray((entry as any)?.dislikes) ? (entry as any).dislikes : [];
            normalized[name] = { likes, dislikes };
        });
    }
    // Ensure every main character key exists with default arrays (first-name keyed)
    mainCharacters.forEach(c => {
        const key = firstName(c.name);
        if (!normalized[key]) {
            normalized[key] = { likes: [], dislikes: [] };
        } else {
            normalized[key].likes = normalized[key].likes || [];
            normalized[key].dislikes = normalized[key].dislikes || [];
        }
    });
    return normalized;
};

// Derive traits and likes/dislikes from character_updates (used when the model returns genesis-only schema)
const deriveTraitsAndLikes = (characterUpdates: any[] | undefined | null, mainCharacters: { name: string }[]) => {
    const traits: CharacterTraits = {};
    const likes: CharacterLikesDislikes = {};
    if (Array.isArray(characterUpdates)) {
        characterUpdates.forEach((cu: any) => {
            const name = firstName(cu?.character_name);
            if (!name) return;
            if (Array.isArray(cu.traits)) {
                traits[name] = cu.traits;
            }
            if (cu.likes_dislikes && typeof cu.likes_dislikes === 'object') {
                likes[name] = {
                    likes: Array.isArray(cu.likes_dislikes.likes) ? cu.likes_dislikes.likes : [],
                    dislikes: Array.isArray(cu.likes_dislikes.dislikes) ? cu.likes_dislikes.dislikes : [],
                };
            }
        });
    }
    return {
        traits: Object.keys(traits).length ? traits : null,
        likes: Object.keys(likes).length ? normalizeLikesDislikesShape(likes, mainCharacters) : null,
    };
};

const canonicalizeRelationshipKey = (key: string, playerName?: string): string => {
    if (!key) return key;

    let parts: string[] = [];
    for (const delimiter of RELATIONSHIP_KEY_DELIMITERS) {
        if (key.includes(delimiter)) {
            parts = key.split(delimiter);
            break;
        }
    }
    if (parts.length === 0) parts = [key];

    const trimmed = Array.from(new Set(parts.map(p => p.trim()).filter(Boolean)));
    if (trimmed.length === 0) return key;

    const playerLower = playerName ? playerName.toLowerCase() : '';
    const nonPlayer = playerLower
        ? trimmed.filter(name => name.toLowerCase() !== playerLower)
        : trimmed;
    const hasPlayer = playerLower ? trimmed.some(name => name.toLowerCase() === playerLower) : false;

    nonPlayer.sort((a, b) => a.localeCompare(b));
    if (hasPlayer && playerName) nonPlayer.push(playerName);

    return nonPlayer.join(' + ');
};

const canonicalizeStructuredDynamics = (
    structured: RelationshipDynamicsStructured | null | undefined,
    playerName?: string
): RelationshipDynamicsStructured | null => {
    if (!structured) return structured ?? null;

    const result: RelationshipDynamicsStructured = {};
    Object.entries(structured).forEach(([key, paragraphs]) => {
        if (!Array.isArray(paragraphs)) return;
        const canonicalKey = canonicalizeRelationshipKey(key, playerName);
        if (!canonicalKey) return;
        if (!result[canonicalKey]) result[canonicalKey] = [];
        result[canonicalKey] = [...result[canonicalKey], ...paragraphs];
    });
    return result;
};

/**
 * Normalizes an ownerId to extract just the first name.
 * The AI sometimes outputs full names like "Hina Sato" but character configs use first names only ("Hina").
 * This function extracts the first word (first name) from the ownerId.
 * Special values like 'System' and 'Unknown' are preserved as-is.
 */
const normalizeOwnerId = (rawOwnerId: string | undefined | null): string => {
    if (!rawOwnerId) return 'Unknown';
    
    // Preserve special system values
    if (rawOwnerId === 'System' || rawOwnerId === 'Unknown') {
        return rawOwnerId;
    }
    
    // Extract first name (first word) from potentially full name
    // "Hina Sato" -> "Hina", "Nana" -> "Nana"
    const firstName = rawOwnerId.trim().split(/\s+/)[0];
    return firstName || rawOwnerId;
};

/**
 * Ensure every arc beat has a stable beat_id. Leaves existing ids intact.
 * [NEW] Also normalizes owner_id -> ownerId for API responses and extracts first name.
 */
const normalizeArcsWithBeatIds = (arcs: EvolvingStoryArc[] | null | undefined): EvolvingStoryArc[] => {
    if (!arcs || !Array.isArray(arcs)) return [];
    return arcs.map((arc) => {
        const beats = Array.isArray(arc.storyArcBeats) ? arc.storyArcBeats : [];
        const normalizedBeats = beats.map((beat) => {
            if (beat && beat.beat_id) return beat;
            return { ...beat, beat_id: `beat_${uuidv4()}` };
        });
        
        // [NEW] Map owner_id (snake_case from API) to ownerId (camelCase for frontend)
        let rawOwnerId = arc.ownerId;
        if (!rawOwnerId && (arc as any).owner_id) {
            rawOwnerId = (arc as any).owner_id;
        }
        // [NEW] Fallback for legacy arcs: derive from involvedCharacters or set to 'Unknown'
        if (!rawOwnerId) {
            if (arc.id === 'global_adventure_arc') {
                rawOwnerId = 'System';
            } else if (arc.involvedCharacters && arc.involvedCharacters.length > 0) {
                rawOwnerId = arc.involvedCharacters[0];
            } else {
                rawOwnerId = 'Unknown';
            }
        }
        
        // [FIX] Normalize ownerId to first name only (AI sometimes outputs full names)
        const ownerId = normalizeOwnerId(rawOwnerId);
        
        const normalizedArc = { ...arc, storyArcBeats: normalizedBeats, ownerId };
        // Clean up the snake_case version if it was present
        delete (normalizedArc as any).owner_id;
        
        return normalizedArc;
    });
};

/**
 * Reconstructs the 'finalFullHistory' object if it's missing from pipeline storage.
 * This is crucial for resuming pipelines from an imported save state.
 */
function reconstructFinalHistory(deps: GameFlowDeps): DayLog[] {
    devWarn("Reconstructing finalFullHistory from game state for pipeline resumption.");
    const finalSegmentLog: SegmentLog = { segment: deps.currentSegment, dialogue: deps.history };
    const dayLogForToday = deps.fullHistory.find(d => d.day === deps.currentDay) ?? { day: deps.currentDay, segments: [] };
    const otherSegments = dayLogForToday.segments.filter(s => s.segment !== deps.currentSegment);
    const finalSegments = [...otherSegments, finalSegmentLog];
    // Use dynamic day structure - NO FALLBACK to prevent data corruption
    const segmentOrder = getDaySegmentsFromDeps(deps);
    finalSegments.sort((a, b) => segmentOrder.indexOf(a.segment) - segmentOrder.indexOf(b.segment));

    const reconstructedHistory = [...deps.fullHistory.filter(d => d.day !== deps.currentDay), { ...dayLogForToday, segments: finalSegments }];
    reconstructedHistory.sort((a, b) => a.day - b.day);
    return reconstructedHistory;
}

function stripStoryArcsFromItinerary(itinerary: DailyItinerary): DailyItinerary {
    if (!itinerary) return itinerary;

    // Unwrap if the provider wrapped the payload in a "DailyItinerary" envelope
    const source = (itinerary as any).DailyItinerary && typeof (itinerary as any).DailyItinerary === 'object'
        ? (itinerary as any).DailyItinerary
        : itinerary;

    const clone = JSON.parse(JSON.stringify(source));
    if ('story_arcs' in clone) {
        delete (clone as any).story_arcs;
    }
    return clone;
}

function shouldCompressChronicles(day: number): boolean {
    return day >= 29 && ((day - 1) % 14 === 0);
}

async function getPlaythroughSummaries(deps: GameFlowDeps): Promise<string[]> {
    const persisted = await persistenceService.loadPipelineData<string[]>(EOD_KEY_PLAYTHROUGH_SUMMARIES);
    if (persisted) {
        return persisted;
    }
    return deps.playthroughSummaries || [];
}


async function updateAndSaveError(setters: Setters, step: EndOfDayStep, message: string) { const currentErrors = await persistenceService.loadEodErrors() || {}; currentErrors[step] = message; await persistenceService.saveEodErrors(currentErrors); if (setters.setEndOfDayErrors) setters.setEndOfDayErrors(currentErrors); else console.error("setEndOfDayErrors setter missing!"); }
async function updateAndSaveNewGameError(setters: Setters, step: NewGameStep, message: string) { const currentErrors = await persistenceService.loadNewGameErrors() || {}; currentErrors[step] = message; await persistenceService.saveNewGameErrors(currentErrors); if (setters.setNewGameErrors) setters.setNewGameErrors(currentErrors); else console.error("setNewGameErrors setter missing!"); }
async function updateAndSaveSegmentError(setters: Setters, step: SegmentTransitionStep, message: string) { const currentErrors = await persistenceService.loadSegmentTransitionErrors() || {}; currentErrors[step] = message; await persistenceService.saveSegmentTransitionErrors(currentErrors); if (setters.setSegmentTransitionErrors) setters.setSegmentTransitionErrors(currentErrors); else console.error("setSegmentTransitionErrors setter missing!"); }

async function executeArchiveStep(deps: GameFlowDeps, setters: Setters, currentStep: EndOfDayStep): Promise<boolean> {
    const startStep = EndOfDayStep.NOT_STARTED;
    const completeStep = EndOfDayStep.ARCHIVE_SEGMENT_COMPLETE;
    if (currentStep >= completeStep) {
         devLog("Skipping completed step: ARCHIVE_SEGMENT_COMPLETE");
         return true;
    }

    setters.setAnalysisMessage('Archiving final moments...');
    devLog("Starting step: Archiving final moments...");

    try {
        const finalFullHistory = reconstructFinalHistory(deps);
        await persistenceService.savePipelineData(EOD_KEY_FINAL_HISTORY, finalFullHistory);
        await persistenceService.savePipelineData(EOD_KEY_SEGMENT_ENDED, deps.currentSegment);
        // Persist baseline dynamic context to Dexie so all later steps load from Dexie only.
        // Seed Dexie with current state without overwriting existing non-null data.
        const existingChronicles = await persistenceService.loadPipelineData<{ [key: string]: ChronicleEntry[] }>(EOD_KEY_CHARACTER_CHRONICLES);
        await persistenceService.savePipelineData(EOD_KEY_CHARACTER_CHRONICLES, deps.characterChronicles ?? existingChronicles ?? {});

        const existingBiographies = await persistenceService.loadPipelineData<{ [key: string]: string }>(EOD_KEY_CHARACTER_BIOGRAPHIES);
        await persistenceService.savePipelineData(EOD_KEY_CHARACTER_BIOGRAPHIES, deps.characterBiographies ?? existingBiographies ?? {});

        const existingQuestions = await persistenceService.loadPipelineData<{ [character: string]: string } | null>(EOD_KEY_UNASKED_QUESTIONS);
        await persistenceService.savePipelineData(EOD_KEY_UNASKED_QUESTIONS, deps.unaskedQuestions ?? existingQuestions ?? {});

        const existingAffection = await persistenceService.loadPipelineData<{ [character: string]: number } | null>(EOD_KEY_AFFECTION);
        await persistenceService.savePipelineData(EOD_KEY_AFFECTION, deps.affection ?? existingAffection ?? {});

        // [FIX] Load character data from MAIN game state in Dexie as ultimate fallback
        // This ensures we never lose data due to stale React state (deps)
        const mainStateData = await persistenceService.loadCharacterDataFromMainState();
        
        const existingTraits = await persistenceService.loadPipelineData<CharacterTraits | null>(EOD_KEY_CHARACTER_TRAITS);
        const traitsToPersist = deps.characterTraits ?? existingTraits ?? mainStateData.characterTraits ?? null;
        if (!traitsToPersist || Object.keys(traitsToPersist).length === 0) {
            throw new Error("Missing character traits to archive; cannot seed Dexie snapshot.");
        }
        await persistenceService.savePipelineData(EOD_KEY_CHARACTER_TRAITS, traitsToPersist);

        const existingLikesDislikes = await persistenceService.loadPipelineData<CharacterLikesDislikes | null>(EOD_KEY_FINAL_LIKES_DISLIKES);
        await persistenceService.savePipelineData(EOD_KEY_FINAL_LIKES_DISLIKES, deps.characterLikesDislikes ?? existingLikesDislikes ?? mainStateData.characterLikesDislikes ?? null);

        const existingEvolvingPersonas = await persistenceService.loadPipelineData<{ [key: string]: string } | null>(EOD_KEY_FINAL_EVOLVING_PERSONAS);
        await persistenceService.savePipelineData(EOD_KEY_FINAL_EVOLVING_PERSONAS, deps.evolvingPersonas ?? existingEvolvingPersonas ?? mainStateData.evolvingPersonas ?? null);

        await persistenceService.savePipelineData(EOD_KEY_UPDATED_MAIN_CHARS, deps.mainCharacters || []);
        await persistenceService.savePipelineData(EOD_KEY_UPDATED_SIDE_CHARS, deps.sideCharacters || []);
        await persistenceService.savePipelineData(EOD_KEY_UPDATED_AVAILABLE_SPRITES, deps.availableGenericSetNames || []);
        await persistenceService.savePipelineData(EOD_KEY_NOVEL_CHAPTERS, deps.novelChapters || []);
        
        // [FIX] Profiles are accumulated during segment transitions - only seed if Dexie is empty
        const existingProfiles = await persistenceService.loadPipelineData<PsychologicalProfiles | null>(EOD_KEY_MERGED_PROFILES);
        if (!existingProfiles || Object.keys(existingProfiles).length === 0) {
            await persistenceService.savePipelineData(EOD_KEY_MERGED_PROFILES, deps.psychologicalProfiles || {});
        }
        
        // [FIX] Same for translated profiles - preserve segment transition translations
        const existingProfilesTranslated = await persistenceService.loadPipelineData<PsychologicalProfiles | null>(EOD_KEY_MERGED_PROFILES_TRANSLATED);
        if (!existingProfilesTranslated || Object.keys(existingProfilesTranslated).length === 0) {
            await persistenceService.savePipelineData(EOD_KEY_MERGED_PROFILES_TRANSLATED, deps.psychologicalProfilesTranslated || null);
        }
        
        await persistenceService.savePipelineData(EOD_KEY_RELATIONSHIP_DYNAMICS, deps.relationshipDynamics ?? '');
        await persistenceService.savePipelineData(EOD_KEY_RELATIONSHIP_DYNAMICS_TRANSLATED, deps.relationshipDynamicsTranslated ?? null);
        // Archive step ONLY runs on fresh EOD starts (skipped on resume), so always seed from deps
        await persistenceService.savePipelineData(EOD_KEY_PLAYER_PSYCHOANALYSIS_PROSE, deps.playerPsychoanalysisProse || 'No analysis yet.');
        await persistenceService.savePipelineData(EOD_KEY_TRANSLATED_PLAYER_PROSE, deps.playerPsychoanalysisProseTranslated || null);
        await persistenceService.savePipelineData(EOD_KEY_PLAYER_BACKSTORY, deps.playerBackstory || null);
        const existingSummaries = deps.playthroughSummaries && deps.playthroughSummaries.length > 0 ? deps.playthroughSummaries : [];
        if (existingSummaries.length > 0) {
            await persistenceService.savePipelineData(EOD_KEY_PLAYTHROUGH_SUMMARIES, existingSummaries);
        }
        // [IMPORT GUARD] Check session before persisting step - abort if import happened
        if (deps.shouldContinue && !deps.shouldContinue()) { devLog("[EOD Archive] Session invalidated - skipping step persistence"); return false; }
        await persistenceService.saveCurrentEndOfDayStep(completeStep);
        setters.setEndOfDayStep(completeStep);
        devLog("Step Completed: ARCHIVE_SEGMENT_COMPLETE");
        return true;
    } catch (e: any) {
        console.error(`Error during Archive Step:`, e);
        await updateAndSaveError(setters, startStep, e.message || 'Archiving failed');
        return false;
    }
}

async function executeCastingAnalysisStep(deps: GameFlowDeps, setters: Setters, currentStep: EndOfDayStep, overrideModel?: AiModelId): Promise<boolean> {
    const startStep = EndOfDayStep.CASTING_ANALYSIS_START;
    const completeStep = EndOfDayStep.CASTING_ANALYSIS_COMPLETE;
    if (currentStep >= completeStep) {
        devLog("Skipping completed step: CASTING_ANALYSIS_COMPLETE");
        return true;
    }

    setters.setEndOfDayStep(startStep);
    setters.setAnalysisMessage('Reviewing cast performances...');
    devLog("Executing step: CASTING_ANALYSIS_START");
    const stepKey = `vn_eod_pipeline_v6_${startStep}`;
    if (setters.startCountdown) setters.startCountdown(stepKey, 240, 'timeout');

    try {
        if (!getCurrentApiKeys(deps)?.gemini) {
            throw new Error("Missing Gemini API key. Please set your API key before generating relationship dynamics.");
        }
        const finalFullHistory = await persistenceService.loadPipelineData<DayLog[]>(EOD_KEY_FINAL_HISTORY);
        if (!finalFullHistory) throw new Error("Missing final history for cast analysis.");
        const dayLogForToday = finalFullHistory.find(d => d.day === deps.currentDay);
        if (!dayLogForToday) throw new Error(`Could not find day log for Day ${deps.currentDay}`);

        const persistedMainCharacters = await persistenceService.loadPipelineData<CharacterConfig[]>(EOD_KEY_UPDATED_MAIN_CHARS);
        if (!persistedMainCharacters) throw new Error("Missing updated main characters for cast analysis.");
        const persistedSideCharacters = await persistenceService.loadPipelineData<CharacterConfig[]>(EOD_KEY_UPDATED_SIDE_CHARS);
        if (!persistedSideCharacters) throw new Error("Missing updated side characters for cast analysis.");
        const persistedAvailableSpriteNames = await persistenceService.loadPipelineData<string[]>(EOD_KEY_UPDATED_AVAILABLE_SPRITES);
        if (!persistedAvailableSpriteNames) throw new Error("Missing available sprites for cast analysis.");
        const persistedNovelChapters = await persistenceService.loadPipelineData<NovelChapter[]>(EOD_KEY_NOVEL_CHAPTERS) || [];

        const spritelessSideCharacters = persistedSideCharacters.filter(c => !c.image).map(c => c.name);
        const placeholderNameMatchers = /('s dad|'s mom|'s mother|'s father|dad|mom)$/i;
        const charactersWithPlaceholderNames = persistedSideCharacters
          .filter(c => placeholderNameMatchers.test(c.name))
          .map(c => c.name);

        const playthroughSummaries = await getPlaythroughSummaries(deps);

        // Relationship dynamics must be sourced from Dexie only.
        const persistedRelationshipDynamics = await persistenceService.loadPipelineData<string>(EOD_KEY_RELATIONSHIP_DYNAMICS);
        if (persistedRelationshipDynamics === null || persistedRelationshipDynamics === undefined) {
            throw new Error("Missing relationship dynamics in Dexie for Cast Analyst.");
        }
        const persistedRelationshipDynamicsStructured = await persistenceService.loadPipelineData<any>(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED);

        // [FIX] Load character context data for Cast Analyst
        const persistedEvolvingPersonas = await persistenceService.loadPipelineData<{ [key: string]: string } | null>(EOD_KEY_FINAL_EVOLVING_PERSONAS) ?? deps.evolvingPersonas;
        const persistedCharacterTraits = await persistenceService.loadPipelineData<CharacterTraits | null>(EOD_KEY_CHARACTER_TRAITS) ?? deps.characterTraits;
        const persistedCharacterLikesDislikes = await persistenceService.loadPipelineData<CharacterLikesDislikes | null>(EOD_KEY_FINAL_LIKES_DISLIKES) ?? deps.characterLikesDislikes;
        const persistedCharacterBiographies = await persistenceService.loadPipelineData<{ [key: string]: string }>(EOD_KEY_CHARACTER_BIOGRAPHIES) ?? deps.characterBiographies;
        const persistedCharacterChronicles = await persistenceService.loadPipelineData<{ [key: string]: ChronicleEntry[] }>(EOD_KEY_CHARACTER_CHRONICLES) ?? deps.characterChronicles;

        // [CACHE REBUILD] Load additional context from Dexie for cache rebuilding
        // NOTE: Some keys (UPDATED_FACT_SHEET, FINAL_STORY_ARCS, FINAL_SUBPLOTS) don't exist yet at this step
        // (created by CanonArchivist/ArcManager later). We load from main Dexie state as fallback.
        const factSheetForCast = deps.factSheet ?? await persistenceService.loadFactSheetFromMainState();
        const affectionForCast = await persistenceService.loadPipelineData<{ [character: string]: number } | null>(EOD_KEY_AFFECTION) ?? deps.affection ?? {};
        const profilesForCast = await persistenceService.loadPipelineData<PsychologicalProfiles>(EOD_KEY_MERGED_PROFILES) ?? deps.psychologicalProfiles;
        // Previous day's analysis - intentionally using old prose for cache rebuild context
        const playerProseForCast = deps.playerPsychoanalysisProse;
        const playerBackstoryForCast = deps.playerBackstory;
        const storyArcsForCast = deps.storyArcs ?? [];
        const subplotsForCast = deps.subplots ?? [];

        // [NEW] Load pipeline state bucket for cached mode user prompt overrides
        // Contains accumulated outputs from previous steps (e.g., RelationshipAnalyst)
        const pipelineStateBucket = await loadPipelineStateBucket() ?? {};
        devLog("[EOD Pipeline] CastAnalyst: Loaded pipeline state bucket", {
            hasRAOutputs: !!pipelineStateBucket.updated_relationship_dynamics,
            modifiedKeys: pipelineStateBucket.modified_relationship_keys?.length ?? 0,
        });

        const result = await geminiService.executeApiCallWithPolicy(
            'CastAnalyst',
            getCurrentModelConfig(deps),
            getCurrentApiKeys(deps),
            (cm, ak) => castAnalystService.runCastAnalyst(
                ak, cm as GeminiModel, dayLogForToday, persistedMainCharacters, persistedSideCharacters,
                deps.playerName,
                persistedRelationshipDynamics, 
                persistedRelationshipDynamicsStructured,
                deps.originalMainCharacters, deps.originalSideCharacters,
                getAvailableGenericSetInfo(persistedAvailableSpriteNames),
                spritelessSideCharacters,
                charactersWithPlaceholderNames,
                finalFullHistory,
                persistedNovelChapters,
                deps.currentDay,
                deps.modelConfig,
                getCurrentApiKeys(deps),
                // [FIX] Pass character context data
                persistedEvolvingPersonas,
                persistedCharacterTraits,
                persistedCharacterLikesDislikes,
                persistedCharacterBiographies,
                persistedCharacterChronicles,
                playthroughSummaries,
                // [CACHE REBUILD] Additional fields for cache rebuilding
                factSheetForCast,
                affectionForCast,
                profilesForCast,
                playerProseForCast,
                playerBackstoryForCast,
                storyArcsForCast,
                subplotsForCast,
                // [NEW] EOD Pipeline caching parameters
                pipelineStateBucket.cacheName || null, // cachedContentName from EOD cache
                pipelineStateBucket // Pass accumulated outputs from RA for user prompt overrides
            ),
            overrideModel
        );
        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
        setters.updateStats(result.inputTokens, result.outputTokens);
        const castAnalystData = result.data;

        // [FIX] Validate CastAnalyst returned valid data
        if (!castAnalystData || typeof castAnalystData !== 'object') {
            throw new Error("CastAnalyst returned invalid or empty response.");
        }
        
        // [GENERATIVE SPRITES] Extract generated sprite data for inline use
        const generatedSprites = castAnalystData.generated_sprites as Array<{
            character_name: string;
            data: string;
            mime: string;
            prompt: string;
        }> | undefined;
        
        const playerName = deps.playerName;

        const normalizedPlayerName = playerName.trim().toLowerCase();
        const allExistingCharacters = [...persistedMainCharacters, ...persistedSideCharacters];
        const existingFirstNames = new Set(
          allExistingCharacters.map(c => c.name.trim().toLowerCase())
        );
        const existingFullNames = new Set(
          allExistingCharacters.map(c => `${c.name} ${c.lastName}`.trim().toLowerCase())
        );

        const filterNewCharacter = (char: { name: string, baseProfile: string }) => {
          const newName = char.name.trim();
          const newNameNorm = newName.toLowerCase();

          if (newNameNorm === normalizedPlayerName) {
            devWarn(`[CastAnalyst Filter] Blocking canonization of new character '${newName}' because it matches the Player's name.`);
            return false;
          }

          if (existingFirstNames.has(newNameNorm)) {
            devWarn(`[CastAnalyst Filter] Blocking canonization of new character '${newName}' because an NPC with this first name already exists.`);
            return false;
          }

          if (existingFullNames.has(newNameNorm)) {
            devWarn(`[CastAnalyst Filter] Blocking canonization of new character '${newName}' because an NPC with this full name already exists.`);
            return false;
          }
          
          const existingLastNames = new Set(allExistingCharacters.map(c => (c.lastName || '').trim().toLowerCase()).filter(Boolean));
          if (existingLastNames.has(newNameNorm)) {
             devWarn(`[CastAnalyst Filter] Blocking canonization of new character '${newName}' because it matches an existing NPC's last name.`);
             return false;
          }

          return true;
        };

        if (castAnalystData.newly_canonized_side_characters) {
          castAnalystData.newly_canonized_side_characters = 
            castAnalystData.newly_canonized_side_characters.filter(filterNewCharacter);
        }
        if (castAnalystData.character_updates) {
          castAnalystData.character_updates = castAnalystData.character_updates.filter(
            (char: any) => char.name.trim().toLowerCase() !== normalizedPlayerName
          );
        }
        if (castAnalystData.promotions) {
          castAnalystData.promotions = castAnalystData.promotions.filter(
            (char: any) => char.name.trim().toLowerCase() !== normalizedPlayerName
          );
        }

        let mainCharactersAfterUpdate = [...persistedMainCharacters];
        let sideCharactersAfterUpdate = [...persistedSideCharacters];
        let availableGenericNamesAfterUpdate = [...persistedAvailableSpriteNames];
        const newlyPromotedCharacterNames = new Set<string>();

        if (castAnalystData.character_updates && castAnalystData.character_updates.length > 0) {
          const allCurrentNames = new Set([...mainCharactersAfterUpdate, ...sideCharactersAfterUpdate].map(c => c.name.toLowerCase()));

          castAnalystData.character_updates.forEach((update: any) => {
            let character = mainCharactersAfterUpdate.find(c => c.name === update.name);
            if (!character) {
              character = sideCharactersAfterUpdate.find(c => c.name === update.name);
            }
            if (!character) {
              devWarn(`[CastAnalyst Update] Could not find character '${update.name}' to update.`);
              return;
            }

            if (update.updated_name) {
              const newNameParts = update.updated_name.trim().split(' ');
              const newFirstName = newNameParts[0];
              const newLastName = newNameParts.length > 1 ? newNameParts.slice(1).join(' ') : "";
              
              if (allCurrentNames.has(newFirstName.toLowerCase()) && newFirstName.toLowerCase() !== character.name.toLowerCase()) {
                 devWarn(`[CastAnalyst Update] SKIPPING name update for '${update.name}'. The new name '${newFirstName}' is already taken.`);
              } else {
                devLog(`[CastAnalyst Update] Renaming '${character.name}' to '${newFirstName} ${newLastName}'`);
                character.name = newFirstName;
                character.lastName = newLastName;
                allCurrentNames.delete(update.name.toLowerCase());
                allCurrentNames.add(newFirstName.toLowerCase());
              }
            }

            if (update.updated_baseProfile) {
              character.baseProfile = update.updated_baseProfile;
            }

            if (update.updated_role) {
              character.role = update.updated_role;
            }

            // [GENERATIVE SPRITES] Check for generated sprite first, then stock sprite
            if (!character.image) {
              const generatedSpriteData = generatedSprites?.find(
                s => s.character_name.toLowerCase() === character!.name.toLowerCase()
              );
              
              if (generatedSpriteData?.data && generatedSpriteData?.mime) {
                character.image = `data:${generatedSpriteData.mime};base64,${generatedSpriteData.data}`;
                character.generatedSpritePrompt = generatedSpriteData.prompt;
                devLog(`[CastAnalyst Update] Using generated sprite for ${character.name} (data URL)`);
              } else if (update.assignedSpriteSetName && availableGenericNamesAfterUpdate.includes(update.assignedSpriteSetName)) {
                const assignedSetName = update.assignedSpriteSetName;
                const assignedSet = findGenericSpriteSet(assignedSetName);
                if (assignedSet) {
                  devLog(`[CastAnalyst Update] Retroactively assigning sprite set ${assignedSetName} to ${character.name}`);
                  character.image = assignedSet.expressions.neutral;
                  character.appearance = assignedSet.description;
                  character.spriteSets = [assignedSet];
                  availableGenericNamesAfterUpdate = availableGenericNamesAfterUpdate.filter(name => name !== assignedSetName);
                }
              }
            }
          });
        }

        if (castAnalystData.newly_canonized_side_characters && castAnalystData.newly_canonized_side_characters.length > 0) {
            const newSideChars: CharacterConfig[] = [];
            for (const newCharData of castAnalystData.newly_canonized_side_characters) {
                if (mainCharactersAfterUpdate.some(mc => mc.name === newCharData.name) || sideCharactersAfterUpdate.some(sc => sc.name === newCharData.name)) {
                    continue;
                }
                
                const nameParts = newCharData.name.trim().split(' ');
                const firstName = nameParts[0];
                const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : "";

                if (existingFirstNames.has(firstName.toLowerCase())) {
                   devWarn(`[CastAnalyst Filter] Blocking '${newCharData.name}' post-split because first name '${firstName}' is already in use.`);
                   continue;
                }

                // [GENERATIVE SPRITES] Check if we have a generated sprite for this character
                const generatedSpriteData = generatedSprites?.find(
                    s => s.character_name.toLowerCase() === firstName.toLowerCase()
                );
                
                let assignedSet: SpriteSet | undefined = undefined;
                const assignedSetName: string | null = newCharData.assignedSpriteSetName;
                let assignedImageUrl: string | undefined = undefined;
                let assignedAppearance: string = 'Appearance not specified.';
                
                // Priority: generated sprite > stock sprite
                let generatedPrompt: string | undefined;
                if (generatedSpriteData?.data && generatedSpriteData?.mime) {
                    assignedImageUrl = `data:${generatedSpriteData.mime};base64,${generatedSpriteData.data}`;
                    generatedPrompt = generatedSpriteData.prompt;
                    assignedAppearance = generatedSpriteData.prompt || 'Generated sprite.';
                    devLog(`[CastAnalyst] Using generated sprite for ${firstName} (data URL)`);
                } else if (assignedSetName && availableGenericNamesAfterUpdate.includes(assignedSetName)) {
                    assignedSet = findGenericSpriteSet(assignedSetName);
                    if (assignedSet) {
                        assignedImageUrl = assignedSet.expressions.neutral;
                        assignedAppearance = assignedSet.description;
                        availableGenericNamesAfterUpdate = availableGenericNamesAfterUpdate.filter(name => name !== assignedSetName);
                    }
                }
                // FIX: Add the missing 'role' property from newCharData.
                const newSideCharConfig: CharacterConfig = {
                    name: firstName,
                    lastName: lastName,
                    baseProfile: newCharData.baseProfile,
                    role: newCharData.role,
                    image: assignedImageUrl,
                    appearance: assignedAppearance,
                    color: newCharData.suggested_color || 'text-gray-200', // AI-suggested color or default
                    spriteSets: assignedSet ? [assignedSet] : undefined,
                    generatedSpritePrompt: generatedPrompt,
                };
                newSideChars.push(newSideCharConfig);
            }
            sideCharactersAfterUpdate.push(...newSideChars);
        }

        if (castAnalystData.promotions && castAnalystData.promotions.length > 0) {
            const promotedCharsConfig: CharacterConfig[] = [];
            const remainingSideChars: CharacterConfig[] = [];
            const promotionsToSave: Promise<void>[] = [];

            for (const sc of sideCharactersAfterUpdate) {
                const promotionData = castAnalystData.promotions.find((p: any) => p.name === sc.name);
                if (promotionData) {
                    if (mainCharactersAfterUpdate.some(mc => mc.name === sc.name)) {
                        remainingSideChars.push(sc); // Keep if already a main char
                    } else {
                        promotedCharsConfig.push(sc);
                        newlyPromotedCharacterNames.add(sc.name);
                        promotionsToSave.push(
                            persistenceService.savePipelineData(EOD_KEY_PROMO_AFFECTION_PREFIX + sc.name, promotionData.initialAffectionEstimate)
                        );
                    }
                } else {
                    remainingSideChars.push(sc); // Keep if not promoted
                }
            }

            await Promise.all(promotionsToSave);

            sideCharactersAfterUpdate = remainingSideChars;
            mainCharactersAfterUpdate.push(...promotedCharsConfig);
        }

        await persistenceService.savePipelineData(EOD_KEY_CAST_ANALYST_RAW, castAnalystData);
        await persistenceService.savePipelineData(EOD_KEY_UPDATED_MAIN_CHARS, mainCharactersAfterUpdate);
        await persistenceService.savePipelineData(EOD_KEY_UPDATED_SIDE_CHARS, sideCharactersAfterUpdate);
        await persistenceService.savePipelineData(EOD_KEY_UPDATED_AVAILABLE_SPRITES, availableGenericNamesAfterUpdate);
        await persistenceService.savePipelineData(EOD_KEY_NEWLY_PROMOTED_NAMES, Array.from(newlyPromotedCharacterNames));
        
        // [NEW] Save CA outputs to Pipeline State Bucket for subsequent personas
        const existingBucket = await loadPipelineStateBucket() ?? {};
        const updatedBucket: PipelineStateBucket = {
            ...existingBucket,
            // CA outputs that subsequent personas may need
            promotions: castAnalystData.promotions || [],
            newly_canonized_side_characters: castAnalystData.newly_canonized_side_characters || [],
            character_updates: castAnalystData.character_updates || [],
        };
        await savePipelineStateBucket(updatedBucket);
        devLog("[EOD Pipeline] Saved CA outputs to pipeline state bucket");
        
        // [IMPORT GUARD] Check session before persisting step - abort if import happened
        if (deps.shouldContinue && !deps.shouldContinue()) { devLog("[EOD CastingAnalysis] Session invalidated - skipping step persistence"); return false; }
        await persistenceService.saveCurrentEndOfDayStep(completeStep);
        setters.setEndOfDayStep(completeStep);
        devLog("Step Completed: CASTING_ANALYSIS_COMPLETE");
        return true;

    } catch (e: any) {
        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
        console.error(`Error during Casting Analysis Step:`, e);
        if (e.message !== 'Extension context invalidated.') {
            await updateAndSaveError(setters, startStep, e.message || 'Casting analysis failed');
            // Note: CastAnalyst uses Flash models with optimized settings, which auto-retry on 503 errors
            // No timer needed - the auto-retry mechanism handles it
        } else {
            devWarn('Caught "Extension context invalidated". Suppressing error to allow auto-retry on reload.');
        }
        return false;
    }
}

async function executeRelationshipAnalysisStep(deps: GameFlowDeps, setters: Setters, currentStep: EndOfDayStep, overrideModel?: AiModelId): Promise<boolean> {
    const startStep = EndOfDayStep.RELATIONSHIP_ANALYSIS_START;
    const completeStep = EndOfDayStep.RELATIONSHIP_ANALYSIS_COMPLETE;
    if (currentStep >= completeStep) {
        devLog("Skipping completed step: RELATIONSHIP_ANALYSIS_COMPLETE");
        return true;
    }

    setters.setEndOfDayStep(startStep);
    setters.setAnalysisMessage('Analyzing relationship shifts...');
    devLog("Executing step: RELATIONSHIP_ANALYSIS_START");
    const stepKey = `vn_eod_pipeline_v6_${startStep}`;
    if (setters.startCountdown) setters.startCountdown(stepKey, 240, 'timeout');

    try {
        const finalFullHistory = await persistenceService.loadPipelineData<DayLog[]>(EOD_KEY_FINAL_HISTORY);
        if (!finalFullHistory) throw new Error("Missing final history for relationship analysis.");
        const dayLogForToday = finalFullHistory.find(d => d.day === deps.currentDay);
        if (!dayLogForToday) throw new Error(`Could not find day log for Day ${deps.currentDay}`);

        const mainCharactersAfterUpdate = await persistenceService.loadPipelineData<CharacterConfig[]>(EOD_KEY_UPDATED_MAIN_CHARS);
        if (!mainCharactersAfterUpdate) throw new Error("Missing updated main character list for relationship analysis.");

        const sideCharactersAfterUpdate = await persistenceService.loadPipelineData<CharacterConfig[]>(EOD_KEY_UPDATED_SIDE_CHARS);
        if (!sideCharactersAfterUpdate) throw new Error("Missing updated side character list for relationship analysis.");
        const playthroughSummaries = await getPlaythroughSummaries(deps);
        // All inputs must come from Dexie; fail if missing to avoid in-memory fallbacks.
        const relationshipDynamicsForApi = await persistenceService.loadPipelineData<string>(EOD_KEY_RELATIONSHIP_DYNAMICS);
        const relationshipDynamicsStructuredForApi = await persistenceService.loadPipelineData<any>(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED);
        const relationshipDynamicsStructuredTranslatedForApi = await persistenceService.loadPipelineData<any>(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED_TRANSLATED);
        const profilesForApi = (await persistenceService.loadPipelineData<PsychologicalProfiles>(EOD_KEY_MERGED_PROFILES))
            ?? deps.psychologicalProfiles
            ?? {} as Partial<PsychologicalProfiles>;
        const profilesTranslatedForApi = (await persistenceService.loadPipelineData<PsychologicalProfiles>(EOD_KEY_MERGED_PROFILES_TRANSLATED))
            ?? deps.psychologicalProfilesTranslated
            ?? null;
        const novelChaptersForApi = await persistenceService.loadPipelineData<NovelChapter[]>(EOD_KEY_NOVEL_CHAPTERS) ?? deps.novelChapters ?? [];
        const characterTraitsForApi = await persistenceService.loadPipelineData<CharacterTraits | null>(EOD_KEY_CHARACTER_TRAITS) ?? deps.characterTraits;
        const evolvingPersonasForApi = await persistenceService.loadPipelineData<{ [key: string]: string } | null>(EOD_KEY_FINAL_EVOLVING_PERSONAS) ?? deps.evolvingPersonas;
        // [FIX] Load likes/dislikes, chronicles, biographies from pipeline keys (consistent with other steps)
        // The service has internal hydration as a fallback for non-EOD calls (segment transitions)
        const likesDislikesForApi = await persistenceService.loadPipelineData<CharacterLikesDislikes | null>(EOD_KEY_FINAL_LIKES_DISLIKES) ?? deps.characterLikesDislikes;
        const chroniclesForApi = await persistenceService.loadPipelineData<{ [key: string]: ChronicleEntry[] }>(EOD_KEY_CHARACTER_CHRONICLES) ?? deps.characterChronicles ?? {};
        const biographiesForApi = await persistenceService.loadPipelineData<{ [key: string]: string }>(EOD_KEY_CHARACTER_BIOGRAPHIES) ?? deps.characterBiographies ?? {};

        if (relationshipDynamicsForApi === undefined) {
            throw new Error("Missing relationship dynamics in Dexie for Relationship Analyst.");
        }
        
        // Subplots: Load directly from main Dexie state (source of truth)
        // NOTE: EOD_KEY_FINAL_SUBPLOTS doesn't exist yet at this step (created by ArcManager later)
        const subplotsForApi = await persistenceService.loadSubplotsFromMainState();

        // Load pipeline state bucket for cache name
        const pipelineStateBucketForRA = await loadPipelineStateBucket() ?? {};
        
        const result = await geminiService.executeApiCallWithPolicy(
            'RelationshipAnalyst',
            getCurrentModelConfig(deps),
            getCurrentApiKeys(deps),
            (cm, ak) => relationshipAnalystService.runRelationshipAnalyst({
                language: deps.language,
                relationshipDynamics: relationshipDynamicsForApi,
                relationshipDynamicsStructured: relationshipDynamicsStructuredForApi,
                relationshipDynamicsStructuredTranslated: relationshipDynamicsStructuredTranslatedForApi,
                psychologicalProfiles: profilesForApi as PsychologicalProfiles,
                fullHistory: finalFullHistory,
                novelChapters: novelChaptersForApi,
                currentDay: deps.currentDay,
                currentSegment: deps.currentSegment,
                evolvingPersonas: evolvingPersonasForApi,
                characterTraits: characterTraitsForApi,
                characterLikesDislikes: likesDislikesForApi,
                characterChronicles: chroniclesForApi,
                characterBiographies: biographiesForApi,
                playerPsychoanalysisProse: deps.playerPsychoanalysisProse,
                playerBackstory: deps.playerBackstory,
                mainCharacters: mainCharactersAfterUpdate,
                sideCharacters: sideCharactersAfterUpdate,
                playerName: deps.playerName,
                modelSelection: deps.modelConfig,
                apiKeys: getCurrentApiKeys(deps),
                playthroughSummaries,
                storyName: STORY_NAME,
                subplots: subplotsForApi,
                overrideModel: cm,
                cachedContentName: pipelineStateBucketForRA.cacheName || null,
                pipelineState: {} // RA is first step, no previous outputs
            }),
            overrideModel
        );
        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
        setters.updateStats(result.inputTokens, result.outputTokens);
        const analystData = result.data;

        await persistenceService.savePipelineData(EOD_KEY_RELATIONSHIP_ANALYST_RAW, analystData);
        // Profiles: load baseline from Dexie (if any) to support resume and avoid null spread.
        const baselineProfiles = await persistenceService.loadPipelineData<PsychologicalProfiles>(EOD_KEY_MERGED_PROFILES) ?? deps.psychologicalProfiles ?? {};
        const profilesObject = convertProfilesArrayToObject(analystData.updated_character_profiles);
        const mergedProfiles = { ...baselineProfiles, ...profilesObject } as PsychologicalProfiles;
        await persistenceService.savePipelineData(EOD_KEY_MERGED_PROFILES, mergedProfiles);
        setters.setPsychologicalProfiles(mergedProfiles);

        if (analystData.updated_character_profiles_translated) {
            const baselineProfilesTranslated = await persistenceService.loadPipelineData<PsychologicalProfiles>(EOD_KEY_MERGED_PROFILES_TRANSLATED) ?? deps.psychologicalProfilesTranslated ?? {};
            const translatedProfilesObject = convertProfilesArrayToObject(analystData.updated_character_profiles_translated);
            const mergedTranslatedProfiles = { ...baselineProfilesTranslated, ...translatedProfilesObject } as PsychologicalProfiles;
            await persistenceService.savePipelineData(EOD_KEY_MERGED_PROFILES_TRANSLATED, mergedTranslatedProfiles);
            setters.setPsychologicalProfilesTranslated(mergedTranslatedProfiles);
        }
        // NOTE: No else branch - preserve existing translated profiles when RA doesn't update any

        // Strict: require structured dynamics in the AI response.
        const structuredFromAnalyst = analystData.updated_relationship_dynamics_structured;
        const structuredNormalized = canonicalizeStructuredDynamics(structuredFromAnalyst, deps.playerName);
        if (!structuredNormalized || Object.keys(structuredNormalized).length === 0) {
            throw new Error("Relationship Analyst returned no structured relationship dynamics.");
        }

        setters.setRelationshipDynamics(analystData.updated_relationship_dynamics);
        if (analystData.updated_relationship_dynamics_translated) {
            setters.setRelationshipDynamicsTranslated(analystData.updated_relationship_dynamics_translated);
        }
        if (setters.setRelationshipDynamicsStructured) {
            setters.setRelationshipDynamicsStructured(structuredNormalized);
        }
        if (setters.setRelationshipDynamicsStructuredTranslated) {
            const nextStructuredTranslated = canonicalizeStructuredDynamics(
                analystData.updated_relationship_dynamics_structured_translated,
                deps.playerName
            );
            setters.setRelationshipDynamicsStructuredTranslated(nextStructuredTranslated);
        }

        await persistenceService.savePipelineData(EOD_KEY_RELATIONSHIP_DYNAMICS, analystData.updated_relationship_dynamics);
        await persistenceService.savePipelineData(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED, structuredNormalized);
        if (analystData.updated_relationship_dynamics_translated) {
             await persistenceService.savePipelineData(EOD_KEY_RELATIONSHIP_DYNAMICS_TRANSLATED, analystData.updated_relationship_dynamics_translated);
        } else {
             await persistenceService.savePipelineData(EOD_KEY_RELATIONSHIP_DYNAMICS_TRANSLATED, null);
        }
        await persistenceService.savePipelineData(
            EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED_TRANSLATED,
            canonicalizeStructuredDynamics(analystData.updated_relationship_dynamics_structured_translated, deps.playerName)
        );
        await persistenceService.savePipelineData(EOD_KEY_NEW_CHRONICLE_ENTRIES, analystData.new_chronicle_entries || []);
        await persistenceService.savePipelineData(EOD_KEY_NEWLY_INSPIRED_QUESTIONS, analystData.newly_inspired_questions || []);
        
        // Track which relationship keys EOD RA modified
        // Subsequent EOD personas get these in user prompt (Baseline + Override pattern)
        // Use the backend-provided list of actually modified keys, not all keys from merged result
        const eodModifiedKeys: string[] = analystData.modified_relationship_keys || [];
        await persistenceService.savePipelineData(SEGMENT_KEY_RELATIONSHIP_KEYS_MODIFIED_TODAY, eodModifiedKeys);
        
        // [NEW] Save RA outputs to Pipeline State Bucket for cached mode user prompts
        // This enables resume/retry and provides accumulated data for subsequent personas
        const existingBucket = await loadPipelineStateBucket() ?? {};
        const updatedBucket: PipelineStateBucket = {
            ...existingBucket,
            // RA outputs that subsequent personas need in their user prompts
            updated_relationship_dynamics: analystData.updated_relationship_dynamics,
            updated_relationship_dynamics_structured: structuredNormalized,
            updated_character_profiles: Object.fromEntries(
                Object.entries(mergedProfiles).filter(([_, v]) => v !== undefined)
            ) as Record<string, string>,
            new_chronicle_entries: analystData.new_chronicle_entries || [],
            newly_inspired_questions: analystData.newly_inspired_questions || [],
            modified_relationship_keys: eodModifiedKeys,
        };
        await savePipelineStateBucket(updatedBucket);
        devLog("[EOD Pipeline] Saved RA outputs to pipeline state bucket");
        
        // [IMPORT GUARD] Check session before persisting step - abort if import happened
        if (deps.shouldContinue && !deps.shouldContinue()) { devLog("[EOD RelationshipAnalysis] Session invalidated - skipping step persistence"); return false; }
        await persistenceService.saveCurrentEndOfDayStep(completeStep);
        setters.setEndOfDayStep(completeStep);
        devLog("Step Completed: RELATIONSHIP_ANALYSIS_COMPLETE");
        return true;

    } catch (e: any) {
        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
        console.error(`Error during Relationship Analysis Step:`, e);
        if (e.message !== 'Extension context invalidated.') {
            await updateAndSaveError(setters, startStep, e.message || 'Relationship analysis failed');
        } else {
            devWarn('Caught "Extension context invalidated". Suppressing error to allow auto-retry on reload.');
        }
        return false;
    }
}

async function executePlayerAnalysisStep(deps: GameFlowDeps, setters: Setters, currentStep: EndOfDayStep, overrideModel?: AiModelId): Promise<boolean> {
    const startStep = EndOfDayStep.PLAYER_ANALYSIS_START;
    const completeStep = EndOfDayStep.PLAYER_ANALYSIS_COMPLETE;
    if (currentStep >= completeStep) {
        devLog("Skipping completed step: PLAYER_ANALYSIS_COMPLETE");
        return true;
    }

    setters.setEndOfDayStep(startStep);
    setters.setAnalysisMessage('Analyzing your choices...');
    devLog("Executing step: PLAYER_ANALYSIS_START");
    const stepKey = `vn_eod_pipeline_v6_${startStep}`;
    if (setters.startCountdown) setters.startCountdown(stepKey, 240, 'timeout');

    try {
        const finalFullHistory = await persistenceService.loadPipelineData<DayLog[]>(EOD_KEY_FINAL_HISTORY);
        if (!finalFullHistory) throw new Error("Missing final history for player analysis.");
        const dayLogForToday = finalFullHistory.find(d => d.day === deps.currentDay);
        if (!dayLogForToday) throw new Error(`Could not find day log for Day ${deps.currentDay}`);

        const playthroughSummaries = await getPlaythroughSummaries(deps);
        const persistedNovelChapters = await persistenceService.loadPipelineData<NovelChapter[]>(EOD_KEY_NOVEL_CHAPTERS) || [];
        
        // [NEW] Split Hybrid Memory components for cleaner backend formatting
        const hybridMemoryNovelContext = assembleVolumeAwareNovelContext(
            persistedNovelChapters,
            playthroughSummaries,
            { recentTranscriptBuffer: 2 }
        );
        
        // Get recent past days (last 2 days, EXCLUDING today) for the "Short-Term Memory" block
        const recencyWindow = 2;
        const recentPastDays = finalFullHistory.filter(d => 
            d.day >= deps.currentDay - recencyWindow && d.day < deps.currentDay
        );
        const recentPastTranscript = mapFullHistoryForAI(recentPastDays);

        const currentDayTranscriptArray = mapFullHistoryForAI([dayLogForToday]);
        const currentDayTranscript = JSON.stringify(currentDayTranscriptArray);

        const currentRelationshipDynamics = await persistenceService.loadPipelineData<string>(EOD_KEY_RELATIONSHIP_DYNAMICS);
        if (currentRelationshipDynamics === null) throw new Error("Missing relationship dynamics for player analysis.");
        const currentRelationshipDynamicsStructured = await persistenceService.loadPipelineData<any>(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED);

        // [NEW] Load pipeline state bucket for cached mode user prompt overrides
        // Contains accumulated outputs from previous steps (RA, CA)
        const pipelineStateBucket = await loadPipelineStateBucket() ?? {};
        devLog("[EOD Pipeline] Psychoanalyst: Loaded pipeline state bucket", {
            hasRAOutputs: !!pipelineStateBucket.updated_relationship_dynamics,
            hasCAOutputs: !!pipelineStateBucket.promotions,
        });

        // [CACHE REBUILD FIX] Load latest from DEXIE for cache rebuild context
        // NOTE: EOD_KEY_UPDATED_FACT_SHEET doesn't exist yet (created by CanonArchivist in Step 5)
        const factSheetForCache = deps.factSheet ?? await persistenceService.loadFactSheetFromMainState();
        const evolvingPersonasForPsycho = await persistenceService.loadPipelineData<{ [key: string]: string } | null>(EOD_KEY_FINAL_EVOLVING_PERSONAS) ?? deps.evolvingPersonas;
        const characterTraitsForPsycho = await persistenceService.loadPipelineData<CharacterTraits | null>(EOD_KEY_CHARACTER_TRAITS) ?? deps.characterTraits;
        const characterLikesDislikesForPsycho = await persistenceService.loadPipelineData<CharacterLikesDislikes | null>(EOD_KEY_FINAL_LIKES_DISLIKES) ?? deps.characterLikesDislikes;
        const characterBiographiesForPsycho = await persistenceService.loadPipelineData<{ [key: string]: string }>(EOD_KEY_CHARACTER_BIOGRAPHIES) ?? deps.characterBiographies;
        const characterChroniclesForPsycho = await persistenceService.loadPipelineData<{ [key: string]: ChronicleEntry[] }>(EOD_KEY_CHARACTER_CHRONICLES) ?? deps.characterChronicles;
        const affectionForPsycho = await persistenceService.loadPipelineData<{ [character: string]: number } | null>(EOD_KEY_AFFECTION) ?? deps.affection;
        const mainCharactersForPsycho = await persistenceService.loadPipelineData<CharacterConfig[]>(EOD_KEY_UPDATED_MAIN_CHARS) ?? deps.mainCharacters;
        const sideCharactersForPsycho = await persistenceService.loadPipelineData<CharacterConfig[]>(EOD_KEY_UPDATED_SIDE_CHARS) ?? deps.sideCharacters;

        // Build cache context from DEXIE data for rebuilding if cache expires
        const psychoCacheContext: psychoanalystService.PsychoanalystCacheContext = {
            currentDay: deps.currentDay,
            factSheet: factSheetForCache,
            evolvingPersonas: evolvingPersonasForPsycho,
            characterTraits: characterTraitsForPsycho,
            characterLikesDislikes: characterLikesDislikesForPsycho,
            characterBiographies: characterBiographiesForPsycho,
            characterChronicles: characterChroniclesForPsycho,
            storyArcs: deps.storyArcs || [],
            affection: affectionForPsycho || {},
            mainCharacters: mainCharactersForPsycho,
            sideCharacters: sideCharactersForPsycho,
        };

        const result = await geminiService.executeApiCallWithPolicy(
            'Psychoanalyst',
            getCurrentModelConfig(deps),
            getCurrentApiKeys(deps),
            (cm, ak) => {
                const providerId = cm.startsWith('gemini') ? 'gemini' : 'openrouter';
                return psychoanalystService.generatePlayerProseAnalysis(
                    { ...getCurrentApiKeys(deps), [providerId]: ak },
                    cm,
                    deps.playerName,
                    deps.playerPsychoanalysisProse || 'No analysis yet.',
                    deps.playerBackstory,
                    hybridMemoryNovelContext,
                    recentPastTranscript,
                    currentDayTranscriptArray,
                    currentRelationshipDynamics,
                    currentRelationshipDynamicsStructured,
                    pipelineStateBucket.cacheName || null, // cachedContentName from EOD cache
                    pipelineStateBucket, // Pass accumulated outputs from RA/CA for user prompt overrides
                    psychoCacheContext, // [NEW] Cache rebuild context
                    deps.language || 'English' // [FIX] Pass language for translation
                );
            },
            overrideModel
        );
        

        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
        setters.updateStats(result.inputTokens, result.outputTokens);
        const playerAnalysisData = result.data;

        // [FIX] Validate Psychoanalyst returned valid data
        if (!playerAnalysisData || !playerAnalysisData.new_psychoanalysis_prose) {
            throw new Error("Psychoanalyst returned invalid or empty response (missing psychoanalysis prose).");
        }

        await persistenceService.savePipelineData(EOD_KEY_PLAYER_ANALYSIS_RAW, playerAnalysisData);
        await persistenceService.savePipelineData(EOD_KEY_PLAYER_BACKSTORY, playerAnalysisData.updated_player_backstory);
        
        // [FIX] Save player prose to its own key AND update UI state
        if (playerAnalysisData.new_psychoanalysis_prose) {
            await persistenceService.savePipelineData(EOD_KEY_PLAYER_PSYCHOANALYSIS_PROSE, playerAnalysisData.new_psychoanalysis_prose);
            setters.setPlayerPsychoanalysisProse(playerAnalysisData.new_psychoanalysis_prose);
        }
        if (playerAnalysisData.updated_player_backstory) {
             setters.setPlayerBackstory(playerAnalysisData.updated_player_backstory);
        }
        
        // Handle translated player prose (Psychoanalyst now translates directly)
        if (playerAnalysisData.new_psychoanalysis_prose_translated) {
            await persistenceService.savePipelineData(EOD_KEY_TRANSLATED_PLAYER_PROSE, playerAnalysisData.new_psychoanalysis_prose_translated);
            setters.setPlayerPsychoanalysisProseTranslated(playerAnalysisData.new_psychoanalysis_prose_translated);
        }

        // [NEW] Save Psychoanalyst outputs to Pipeline State Bucket for subsequent personas
        const existingBucket = await loadPipelineStateBucket() ?? {};
        const updatedBucket: PipelineStateBucket = {
            ...existingBucket,
            // Psychoanalyst outputs that subsequent personas may need
            updated_player_profile: {
                psychoanalysis: playerAnalysisData.new_psychoanalysis_prose,
                backstory: playerAnalysisData.updated_player_backstory,
            },
        };
        await savePipelineStateBucket(updatedBucket);
        devLog("[EOD Pipeline] Saved Psychoanalyst outputs to pipeline state bucket");

        // [IMPORT GUARD] Check session before persisting step - abort if import happened
        if (deps.shouldContinue && !deps.shouldContinue()) { devLog("[EOD PlayerAnalysis] Session invalidated - skipping step persistence"); return false; }
        await persistenceService.saveCurrentEndOfDayStep(completeStep);
        setters.setEndOfDayStep(completeStep);
        devLog("Step Completed: PLAYER_ANALYSIS_COMPLETE");
        return true;

    } catch (e: any) {
        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
        console.error(`Error during Player Analysis Step:`, e);
        if (e.message !== 'Extension context invalidated.') {
            await updateAndSaveError(setters, startStep, e.message || 'Player analysis failed');
        } else {
            devWarn('Caught "Extension context invalidated". Suppressing error to allow auto-retry on reload.');
        }
        return false;
    }
}

async function executeNovelChapterStep(deps: GameFlowDeps, setters: Setters, currentStep: EndOfDayStep, overrideModel?: AiModelId): Promise<boolean> {
    const startStep = EndOfDayStep.NOVEL_CHAPTER_START;
    const completeStep = EndOfDayStep.NOVEL_CHAPTER_COMPLETE;
    if (currentStep >= completeStep) {
        devLog("Skipping completed step: NOVEL_CHAPTER_COMPLETE");
        return true;
    }

    setters.setEndOfDayStep(startStep);
    setters.setAnalysisMessage("Writing today's novel chapter...");
    devLog("Executing step: NOVEL_CHAPTER_START");
    const stepKey = `vn_eod_pipeline_v6_${startStep}`;
    if (setters.startCountdown) setters.startCountdown(stepKey, 240, 'timeout');

    try {
        const finalFullHistory = await persistenceService.loadPipelineData<DayLog[]>(EOD_KEY_FINAL_HISTORY);
        if (!finalFullHistory) throw new Error("Missing final history for novel chapter.");
        const dayLogForToday = finalFullHistory.find(d => d.day === deps.currentDay);
        if (!dayLogForToday) throw new Error(`Could not find day log for Day ${deps.currentDay}`);

        const endOfDayProfiles = await persistenceService.loadPipelineData<PsychologicalProfiles>(EOD_KEY_MERGED_PROFILES);
        if (!endOfDayProfiles) throw new Error("Missing updated profiles for novel chapter.");
        const currentRelationshipDynamics = await persistenceService.loadPipelineData<string>(EOD_KEY_RELATIONSHIP_DYNAMICS);
        if (currentRelationshipDynamics === null) throw new Error("Missing relationship dynamics for novel chapter.");
        const currentRelationshipDynamicsStructured = await persistenceService.loadPipelineData<any>(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED);
        const playerAnalysisData = await persistenceService.loadPipelineData<PlayerAnalysisResponse>(EOD_KEY_PLAYER_ANALYSIS_RAW);
        if (!playerAnalysisData) throw new Error("Missing player analysis for novel chapter.");
        const playerBackstory = await persistenceService.loadPipelineData<string | null>(EOD_KEY_PLAYER_BACKSTORY);
        const mainCharactersAfterUpdate = await persistenceService.loadPipelineData<CharacterConfig[]>(EOD_KEY_UPDATED_MAIN_CHARS);
        if (!mainCharactersAfterUpdate) throw new Error("Missing updated main character list for novel chapter.");
        const sideCharactersAfterUpdate = await persistenceService.loadPipelineData<CharacterConfig[]>(EOD_KEY_UPDATED_SIDE_CHARS);
        if (!sideCharactersAfterUpdate) throw new Error("Missing updated side character list for novel chapter.");

        // [CACHE REBUILD] Load additional context from Dexie for cache rebuilding
        // NOTE: EOD_KEY_UPDATED_FACT_SHEET doesn't exist yet (created by CanonArchivist in Step 5)
        const factSheetForNovel = deps.factSheet ?? await persistenceService.loadFactSheetFromMainState();
        const likesDislikesForNovel = await persistenceService.loadPipelineData<CharacterLikesDislikes | null>(EOD_KEY_FINAL_LIKES_DISLIKES) ?? deps.characterLikesDislikes;
        const biographiesForNovel = await persistenceService.loadPipelineData<{ [key: string]: string }>(EOD_KEY_CHARACTER_BIOGRAPHIES) ?? deps.characterBiographies ?? {};
        const chroniclesForNovel = await persistenceService.loadPipelineData<{ [key: string]: ChronicleEntry[] }>(EOD_KEY_CHARACTER_CHRONICLES) ?? deps.characterChronicles ?? {};
        const storyArcsForNovel = await persistenceService.loadPipelineData<EvolvingStoryArc[]>(EOD_KEY_FINAL_STORY_ARCS) ?? deps.storyArcs ?? [];
        const subplotsForNovel = await persistenceService.loadPipelineData<Subplot[]>(EOD_KEY_FINAL_SUBPLOTS) ?? deps.subplots ?? [];

        const playthroughSummaries = await getPlaythroughSummaries(deps);
        const baseNovelChapters = await persistenceService.loadPipelineData<NovelChapter[]>(EOD_KEY_NOVEL_CHAPTERS) ?? deps.novelChapters ?? [];
        const hybridNovelContext = assembleNovelistMemory(
            baseNovelChapters,
            playthroughSummaries
        );

        // [NEW] Load pipeline state bucket for cached mode user prompt overrides
        const pipelineStateBucket = await loadPipelineStateBucket() ?? {};
        devLog("[EOD Pipeline] Novelist: Loaded pipeline state bucket", {
            hasRAOutputs: !!pipelineStateBucket.updated_relationship_dynamics,
            hasCAOutputs: !!pipelineStateBucket.promotions,
            hasPsychOutputs: !!pipelineStateBucket.updated_player_profile,
        });

        // [NEW] Prepare recent novel chapters (previous 2 days) for continuity
        // This is a special requirement for the Novelist - it needs these in user prompt even with cache
        // Novel chapters are stored by index where index 0 = Day 1
        const recentNovelChaptersArray: { day: number; chapter: NovelChapter }[] = [];
        for (let i = 0; i < baseNovelChapters.length; i++) {
            const dayNum = i + 1; // index 0 = Day 1
            if (dayNum >= deps.currentDay - 2 && dayNum < deps.currentDay && baseNovelChapters[i]) {
                recentNovelChaptersArray.push({ day: dayNum, chapter: baseNovelChapters[i] });
            }
        }
        const recentNovelChaptersText = recentNovelChaptersArray.length > 0
            ? recentNovelChaptersArray.map(({ day, chapter }) => `**Day ${day}:**\n${chapter.proseChapter || ''}`).join('\n\n---\n\n')
            : 'No previous chapters available.';

        const result = await geminiService.executeApiCallWithPolicy(
            'Novelist',
            getCurrentModelConfig(deps),
            getCurrentApiKeys(deps),
            (cm, ak) => {
                const providerId = cm.startsWith('gemini') ? 'gemini' : 'openrouter';
                return novelistService.generateNovelChapter(
                    { ...getCurrentApiKeys(deps), [providerId]: ak },
                    cm,
                    hybridNovelContext,
                    [dayLogForToday as any],
                    deps.psychologicalProfiles,
                    endOfDayProfiles,
                    deps.evolvingPersonas,
                    currentRelationshipDynamics,
                    currentRelationshipDynamicsStructured,
                    deps.affection,
                    playerAnalysisData.new_psychoanalysis_prose,
                    playerBackstory,
                    deps.playerName,
                    deps.currentDay,
                    deps.characterTraits,
                    // [CACHE REBUILD] Additional fields for cache rebuilding
                    factSheetForNovel,
                    likesDislikesForNovel,
                    biographiesForNovel,
                    chroniclesForNovel,
                    storyArcsForNovel,
                    subplotsForNovel,
                    mainCharactersAfterUpdate,
                    sideCharactersAfterUpdate,
                    pipelineStateBucket.cacheName || null, // cachedContentName from EOD cache
                    pipelineStateBucket, // Pass accumulated outputs from previous steps
                    recentNovelChaptersText, // Previous 2 days' chapters for continuity
                    deps.language || 'English' // [FIX] Pass language for translation
                );
            },
            overrideModel
        );
        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
         setters.updateStats(result.inputTokens, result.outputTokens);
        const novelChapterData = result.data;

        // [FIX] Validate Novelist returned valid data
        if (!novelChapterData || !novelChapterData.proseChapter) {
            throw new Error("Novelist returned invalid or empty response (missing proseChapter).");
        }

        // Push the latest chapter into UI state immediately so exports/UI stay in sync.
        setters.setNovelChapters(prev => {
            const nextChapters = [...(prev || [])];
            const dayIndex = Math.max(deps.currentDay - 1, 0);
            if (dayIndex < nextChapters.length) {
                nextChapters[dayIndex] = novelChapterData;
            } else {
                if (dayIndex > nextChapters.length) {
                    nextChapters.length = dayIndex;
                }
                nextChapters.push(novelChapterData);
            }
            return nextChapters;
        });

        // Keep Dexie in sync with the latest chapters so downstream steps stay Dexie-fed.
        const chaptersForDexie = [...baseNovelChapters];
        const dexieDayIndex = Math.max(deps.currentDay - 1, 0);
        if (dexieDayIndex < chaptersForDexie.length) {
            chaptersForDexie[dexieDayIndex] = novelChapterData;
        } else {
            if (dexieDayIndex > chaptersForDexie.length) {
                chaptersForDexie.length = dexieDayIndex;
            }
            chaptersForDexie.push(novelChapterData);
        }
        await persistenceService.savePipelineData(EOD_KEY_NOVEL_CHAPTERS, chaptersForDexie);

        const existingPlaythroughSummaries = await persistenceService.loadPipelineData<string[]>(EOD_KEY_PLAYTHROUGH_SUMMARIES);
        const basePlaythroughSummaries = existingPlaythroughSummaries
            ? [...existingPlaythroughSummaries]
            : [...(deps.playthroughSummaries || [])];
        let shouldPersistPlaythroughSummaries = false;

        if (novelChapterData.playthroughSummary) {
            const cycleIndex = Math.floor((Math.max(deps.currentDay, 1) - 1) / 14);
            const updatedSummaries = [...basePlaythroughSummaries];
            while (updatedSummaries.length <= cycleIndex) {
                updatedSummaries.push('');
            }
            if (updatedSummaries[cycleIndex] !== novelChapterData.playthroughSummary) {
                updatedSummaries[cycleIndex] = novelChapterData.playthroughSummary;
                shouldPersistPlaythroughSummaries = true;
            }
            setters.setPlaythroughSummaries(prev => {
                const next = prev ? [...prev] : [];
                while (next.length <= cycleIndex) {
                    next.push('');
                }
                next[cycleIndex] = novelChapterData.playthroughSummary!;
                return next;
            });

            if (shouldPersistPlaythroughSummaries) {
                await persistenceService.savePipelineData(EOD_KEY_PLAYTHROUGH_SUMMARIES, updatedSummaries);
            }
        } else if (existingPlaythroughSummaries === null && basePlaythroughSummaries.length > 0) {
            // Ensure existing summaries remain available if we resume later in the pipeline.
            await persistenceService.savePipelineData(EOD_KEY_PLAYTHROUGH_SUMMARIES, basePlaythroughSummaries);
        }

        await persistenceService.savePipelineData(EOD_KEY_NOVEL_CHAPTER_RAW, novelChapterData);
        
        // Handle translated novel chapter (Novelist now translates directly)
        const translatedChapter = novelChapterData.proseChapterTranslated;
        if (translatedChapter) {
            await persistenceService.savePipelineData(EOD_KEY_TRANSLATED_NOVEL, translatedChapter);
            // Update UI state with translated chapter
            setters.setNovelChaptersTranslated(prev => {
                const nextChapters = [...(prev || [])];
                const dayIndex = Math.max(deps.currentDay - 1, 0);
                if (dayIndex < nextChapters.length) {
                    nextChapters[dayIndex] = translatedChapter;
                } else {
                    if (dayIndex > nextChapters.length) {
                        nextChapters.length = dayIndex;
                    }
                    nextChapters.push(translatedChapter);
                }
                return nextChapters;
            });
        }
        
        // Note: Novel chapter is NOT saved to pipeline state bucket because subsequent 
        // personas (CanonArchivist, ArcManager, etc.) don't use it - they use the transcript directly

        // [IMPORT GUARD] Check session before persisting step - abort if import happened
        if (deps.shouldContinue && !deps.shouldContinue()) { devLog("[EOD NovelChapter] Session invalidated - skipping step persistence"); return false; }
        await persistenceService.saveCurrentEndOfDayStep(completeStep);
        setters.setEndOfDayStep(completeStep);
        devLog("Step Completed: NOVEL_CHAPTER_COMPLETE");
        return true;

    } catch (e: any) {
        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
        console.error(`Error during Novel Chapter Step:`, e);
        if (e.message !== 'Extension context invalidated.') {
            await updateAndSaveError(setters, startStep, e.message || 'Novel chapter generation failed');
        } else {
            devWarn('Caught "Extension context invalidated". Suppressing error to allow auto-retry on reload.');
        }
        return false;
    }
}

async function executeArchivistStep(deps: GameFlowDeps, setters: Setters, currentStep: EndOfDayStep, overrideModel?: AiModelId): Promise<boolean> {
    const startStep = EndOfDayStep.ARCHIVIST_START;
    const completeStep = EndOfDayStep.ARCHIVIST_COMPLETE;
    if (currentStep >= completeStep) {
        devLog("Skipping completed step: ARCHIVIST_COMPLETE");
        return true;
    }

    setters.setEndOfDayStep(startStep);
    const isCompressionDay = shouldCompressChronicles(deps.currentDay);
    setters.setAnalysisMessage(
        isCompressionDay ? 'Extracting key facts & archiving long-term memories...' : 'Extracting key facts...'
    );
    devLog("Executing step: ARCHIVIST_START");
    const stepKey = `vn_eod_pipeline_v6_${startStep}`;
    if (setters.startCountdown) setters.startCountdown(stepKey, 240, 'timeout');

    try {
        const finalFullHistory = await persistenceService.loadPipelineData<DayLog[]>(EOD_KEY_FINAL_HISTORY);
        if (!finalFullHistory) throw new Error("Missing final history for archivist.");
        const dayLogForToday = finalFullHistory.find(d => d.day === deps.currentDay);
        
        const cleanedTranscript = mapFullHistoryForAI(dayLogForToday ? [dayLogForToday] : []);

        // [NEW] Load pipeline state bucket for cached mode user prompt overrides
        const pipelineStateBucket = await loadPipelineStateBucket() ?? {};
        devLog("[EOD Pipeline] CanonArchivist: Loaded pipeline state bucket", {
            hasRAOutputs: !!pipelineStateBucket.updated_relationship_dynamics,
            hasCAOutputs: !!pipelineStateBucket.promotions,
        });

        // [CACHE REBUILD FIX] Load all context from DEXIE (latest pipeline data) for cache rebuilding
        const playthroughSummaries = await persistenceService.loadPipelineData<string[]>(EOD_KEY_PLAYTHROUGH_SUMMARIES) || deps.playthroughSummaries || [];
        const novelChaptersForCache = await persistenceService.loadPipelineData<NovelChapter[]>(EOD_KEY_NOVEL_CHAPTERS) || deps.novelChapters || [];
        const hybridMemoryNovelContext = assembleVolumeAwareNovelContext(
            novelChaptersForCache,
            playthroughSummaries,
            { recentTranscriptBuffer: 2 }
        );
        const recencyWindow = 2;
        const recentPastDays = finalFullHistory.filter(d => 
            d.day >= deps.currentDay - recencyWindow && d.day < deps.currentDay
        );
        const recentPastTranscript = mapFullHistoryForAI(recentPastDays);

        // Load latest pipeline data from Dexie for cache rebuild context
        const relationshipDynamicsForCache = await persistenceService.loadPipelineData<string>(EOD_KEY_RELATIONSHIP_DYNAMICS) ?? deps.relationshipDynamics;
        const relationshipDynamicsStructuredForCache = await persistenceService.loadPipelineData<any>(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED) ?? deps.relationshipDynamicsStructured;
        const evolvingPersonasForCache = await persistenceService.loadPipelineData<{ [key: string]: string } | null>(EOD_KEY_FINAL_EVOLVING_PERSONAS) ?? deps.evolvingPersonas;
        const characterTraitsForCache = await persistenceService.loadPipelineData<CharacterTraits | null>(EOD_KEY_CHARACTER_TRAITS) ?? deps.characterTraits;
        const characterLikesDislikesForCache = await persistenceService.loadPipelineData<CharacterLikesDislikes | null>(EOD_KEY_FINAL_LIKES_DISLIKES) ?? deps.characterLikesDislikes;
        const mainCharactersForCache = await persistenceService.loadPipelineData<CharacterConfig[]>(EOD_KEY_UPDATED_MAIN_CHARS) ?? deps.mainCharacters;
        const sideCharactersForCache = await persistenceService.loadPipelineData<CharacterConfig[]>(EOD_KEY_UPDATED_SIDE_CHARS) ?? deps.sideCharacters;
        const affectionForCache = await persistenceService.loadPipelineData<{ [character: string]: number } | null>(EOD_KEY_AFFECTION) ?? deps.affection;

        // [CACHE REBUILD FIX] Build cache context from DEXIE data for rebuilding if cache expires
        const archivistCacheContext: canonArchivistService.CanonArchivistCacheContext = {
            playerName: deps.playerName,
            playerPsychoanalysisProse: deps.playerPsychoanalysisProse,
            playerBackstory: deps.playerBackstory,
            evolvingPersonas: evolvingPersonasForCache,
            characterTraits: characterTraitsForCache,
            characterLikesDislikes: characterLikesDislikesForCache,
            relationshipDynamics: relationshipDynamicsForCache,
            relationshipDynamicsStructured: relationshipDynamicsStructuredForCache,
            storyArcs: deps.storyArcs || [],
            affection: affectionForCache || {},
            hybridMemoryNovelContext,
            recentPastTranscript,
            mainCharacters: mainCharactersForCache,
            sideCharacters: sideCharactersForCache,
        };

        const result = await canonArchivistService.generateFactSheet(
            getCurrentApiKeys(deps),
            deps.modelConfig,
            cleanedTranscript,
            deps.factSheet,
            deps.currentDay,
            deps.characterChronicles,
            deps.characterBiographies,
            pipelineStateBucket.cacheName || null, // cachedContentName from EOD cache
            pipelineStateBucket, // Pass accumulated outputs from previous steps
            archivistCacheContext // [NEW] Cache rebuild context from Dexie
        );
        
        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
         setters.updateStats(result.inputTokens, result.outputTokens);
        const archivistData = result.data as CanonArchivistResponse;

        // [FIX] Validate CanonArchivist returned valid data (facts array can be empty on day 1)
        if (!archivistData || typeof archivistData !== 'object') {
            throw new Error("CanonArchivist returned invalid or empty response.");
        }

        await persistenceService.savePipelineData(EOD_KEY_ARCHIVIST_RAW, archivistData);
        const newFactSheet = { ...deps.factSheet, [deps.currentDay]: archivistData.facts };
        await persistenceService.savePipelineData(EOD_KEY_UPDATED_FACT_SHEET, newFactSheet);

        const existingSchedule = deps.scheduledEvents || [];
        const newRawEvents = archivistData.scheduledEvents || [];
        const relevantExistingSchedule = existingSchedule.filter(e => e.day > deps.currentDay || (e.day === deps.currentDay && !e.isComplete));
        const combinedSchedule = [...relevantExistingSchedule];

        newRawEvents.forEach(newEvent => {
            if (!combinedSchedule.some(e => e.day === newEvent.day && e.description === newEvent.description)) {
                combinedSchedule.push({ ...newEvent, isComplete: false });
            }
        });
        combinedSchedule.sort((a,b) => a.day - b.day);
        await persistenceService.savePipelineData(EOD_KEY_UPDATED_SCHEDULE, combinedSchedule);

        if (archivistData.updated_character_biographies) {
            const mergedBiographies = { ...deps.characterBiographies, ...archivistData.updated_character_biographies };
            setters.setCharacterBiographies(mergedBiographies);
            await persistenceService.savePipelineData(EOD_KEY_UPDATED_CHARACTER_BIOGRAPHIES, mergedBiographies);
        }

        if (archivistData.updated_character_chronicles) {
            const mergedChronicles: { [key: string]: ChronicleEntry[] } = { ...deps.characterChronicles };
            Object.entries(archivistData.updated_character_chronicles).forEach(([name, entries]) => {
                mergedChronicles[name] = entries as ChronicleEntry[];
            });
            setters.setCharacterChronicles(mergedChronicles);
            await persistenceService.savePipelineData(EOD_KEY_UPDATED_CHARACTER_CHRONICLES, mergedChronicles);
        }

        // [NEW] Save CanonArchivist outputs to Pipeline State Bucket for subsequent personas
        const existingBucket = await loadPipelineStateBucket() ?? {};
        const updatedBucket: PipelineStateBucket = {
            ...existingBucket,
            // CanonArchivist outputs - new facts that may be relevant
            new_facts: archivistData.facts || [],
        };
        await savePipelineStateBucket(updatedBucket);
        devLog("[EOD Pipeline] Saved CanonArchivist outputs to pipeline state bucket");

        // [IMPORT GUARD] Check session before persisting step - abort if import happened
        if (deps.shouldContinue && !deps.shouldContinue()) { devLog("[EOD Archivist] Session invalidated - skipping step persistence"); return false; }
        await persistenceService.saveCurrentEndOfDayStep(completeStep);
        setters.setEndOfDayStep(completeStep);
        devLog("Step Completed: ARCHIVIST_COMPLETE");
        return true;

    } catch (e: any) {
        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
        console.error(`Error during Archivist Step:`, e);
        if (e.message !== 'Extension context invalidated.') {
            await updateAndSaveError(setters, startStep, e.message || 'Fact extraction failed');
        } else {
            devWarn('Caught "Extension context invalidated". Suppressing error to allow auto-retry on reload.');
        }
        return false;
    }
}

async function executeTranslationStep(deps: GameFlowDeps, setters: Setters, currentStep: EndOfDayStep, _overrideModel?: AiModelId): Promise<boolean> {
    // NOTE: Translation step is now OBSOLETE - all personas handle their own translation:
    // - RelationshipAnalyst: translates NPC psychological profiles
    // - Psychoanalyst: translates player psychoanalysis prose  
    // - Novelist: translates prose chapters
    // This step is kept for pipeline compatibility but does no work.
    
    const completeStep = EndOfDayStep.TRANSLATION_COMPLETE;

    if (currentStep >= completeStep) {
        devLog("Skipping completed step: TRANSLATION_COMPLETE");
        return true;
    }

    // Mark step complete immediately - translation is now handled by individual personas
    // [IMPORT GUARD] Check session before persisting step - abort if import happened
    if (deps.shouldContinue && !deps.shouldContinue()) { devLog("[EOD Translation] Session invalidated - skipping step persistence"); return false; }
    await persistenceService.saveCurrentEndOfDayStep(completeStep);
    setters.setEndOfDayStep(completeStep);    
    return true;
}

async function executeArcManagerStep(deps: GameFlowDeps, setters: Setters, currentStep: EndOfDayStep, overrideModel?: AiModelId): Promise<boolean> {
    const startStep = EndOfDayStep.ARC_MANAGER_START;
    const completeStep = EndOfDayStep.ARC_MANAGER_COMPLETE;
    if (currentStep >= completeStep) {
        devLog("Skipping completed step: ARC_MANAGER_COMPLETE");
        return true;
    }
    
    setters.setEndOfDayStep(startStep);
    setters.setAnalysisMessage('Analyzing story arc progress...');
    devLog("Executing step: ARC_MANAGER_START");
    const stepKey = `vn_eod_pipeline_v6_${startStep}`;
    if (setters.startCountdown) setters.startCountdown(stepKey, 240, 'timeout');

    try {
        const finalFullHistory = await persistenceService.loadPipelineData<DayLog[]>(EOD_KEY_FINAL_HISTORY);
        if (!finalFullHistory) throw new Error("Missing final history for Arc Manager.");
        
        // [FIX] Separate current day (subject for analysis) from previous days (context)
        const RECENT_TRANSCRIPT_WINDOW = 2;
        const previousDaysTranscript = finalFullHistory.filter(dayLog =>
            dayLog.day >= deps.currentDay - RECENT_TRANSCRIPT_WINDOW && dayLog.day < deps.currentDay
        );
        const currentDayLog = finalFullHistory.find(dayLog => dayLog.day === deps.currentDay);
        const currentDayTranscriptArray = currentDayLog ? [currentDayLog] : [];

        // [FIX] For Arc Manager, we DON'T add current day's novel chapter because:
        // - Current day is already covered by currentDayTranscript (raw dialogue)
        // - Previous 2 days are covered by previousDaysTranscript (raw dialogue)
        // So the novel context should only include days BEFORE the transcript window
        const persistedNovelChapters = await persistenceService.loadPipelineData<NovelChapter[]>(EOD_KEY_NOVEL_CHAPTERS) ?? deps.novelChapters ?? [];
        const playthroughSummaries = await getPlaythroughSummaries(deps);
        
        // recentTranscriptBuffer = RECENT_TRANSCRIPT_WINDOW + 1 (for current day)
        // This ensures the novel context excludes all days covered by raw transcripts
        const novelContext = assembleVolumeAwareNovelContext(
            persistedNovelChapters,
            playthroughSummaries,
            { recentTranscriptBuffer: RECENT_TRANSCRIPT_WINDOW + 1 }
        );

        const endOfDayProfiles = await persistenceService.loadPipelineData<PsychologicalProfiles>(EOD_KEY_MERGED_PROFILES);
        if (!endOfDayProfiles) throw new Error("Missing updated profiles for Arc Manager.");
        const currentRelationshipDynamics = await persistenceService.loadPipelineData<string>(EOD_KEY_RELATIONSHIP_DYNAMICS);
        if (currentRelationshipDynamics === null) throw new Error("Missing relationship dynamics for Arc Manager.");
        const currentRelationshipDynamicsStructured = await persistenceService.loadPipelineData<any>(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED);
        const updatedFactSheet = await persistenceService.loadPipelineData<{[day: number]: string[]}>(EOD_KEY_UPDATED_FACT_SHEET);
        if (!updatedFactSheet) throw new Error("Missing updated fact sheet for Arc Manager.");
        const updatedSchedule = await persistenceService.loadPipelineData<ScheduledEvent[]>(EOD_KEY_UPDATED_SCHEDULE);
        if (!updatedSchedule) throw new Error("Missing updated schedule for Arc Manager.");
        const playerAnalysisData = await persistenceService.loadPipelineData<PlayerAnalysisResponse>(EOD_KEY_PLAYER_ANALYSIS_RAW);
        if (!playerAnalysisData) throw new Error("Missing player analysis for Arc Manager.");
        const playerBackstory = await persistenceService.loadPipelineData<string | null>(EOD_KEY_PLAYER_BACKSTORY);
        const mainCharactersAfterUpdate = await persistenceService.loadPipelineData<CharacterConfig[]>(EOD_KEY_UPDATED_MAIN_CHARS);
        if (!mainCharactersAfterUpdate) throw new Error("Missing updated main characters for Arc Manager.");
        const sideCharactersAfterUpdate = await persistenceService.loadPipelineData<CharacterConfig[]>(EOD_KEY_UPDATED_SIDE_CHARS);
        if (!sideCharactersAfterUpdate) throw new Error("Missing updated side characters for Arc Manager.");
        const storyArcsFromDexie = await persistenceService.loadPipelineData<EvolvingStoryArc[]>(EOD_KEY_FINAL_STORY_ARCS) ?? deps.storyArcs ?? [];
        const subplotsFromDexie = await persistenceService.loadPipelineData<Subplot[] | null>(EOD_KEY_FINAL_SUBPLOTS) ?? deps.subplots ?? [];
        const evolvingPersonasFromDexie = await persistenceService.loadPipelineData<{ [key: string]: string } | null>(EOD_KEY_FINAL_EVOLVING_PERSONAS) ?? deps.evolvingPersonas;
        const likesDislikesFromDexie = await persistenceService.loadPipelineData<CharacterLikesDislikes | null>(EOD_KEY_FINAL_LIKES_DISLIKES) ?? deps.characterLikesDislikes;
        const traitsFromDexie = await persistenceService.loadPipelineData<CharacterTraits | null>(EOD_KEY_CHARACTER_TRAITS) ?? deps.characterTraits;
        const chroniclesFromDexie = await persistenceService.loadPipelineData<{ [key: string]: ChronicleEntry[] }>(EOD_KEY_UPDATED_CHARACTER_CHRONICLES)
            ?? await persistenceService.loadPipelineData<{ [key: string]: ChronicleEntry[] }>(EOD_KEY_CHARACTER_CHRONICLES)
            ?? deps.characterChronicles;
        const biographiesFromDexie = await persistenceService.loadPipelineData<{ [key: string]: string }>(EOD_KEY_UPDATED_CHARACTER_BIOGRAPHIES)
            ?? await persistenceService.loadPipelineData<{ [key: string]: string }>(EOD_KEY_CHARACTER_BIOGRAPHIES)
            ?? deps.characterBiographies;
        const baseQuestions = await persistenceService.loadPipelineData<{ [character: string]: string } | null>(EOD_KEY_UNASKED_QUESTIONS) ?? deps.unaskedQuestions ?? {};
        const newlyInspiredQuestions = await persistenceService.loadPipelineData<Array<{ character: string; question: string; }>>(EOD_KEY_NEWLY_INSPIRED_QUESTIONS) || [];
        const mergedQuestions = { ...baseQuestions };
        newlyInspiredQuestions.forEach(q => { mergedQuestions[q.character] = q.question; });
        await persistenceService.savePipelineData(EOD_KEY_UNASKED_QUESTIONS, mergedQuestions);
        const affectionFromDexie = await persistenceService.loadPipelineData<{ [character: string]: number } | null>(EOD_KEY_AFFECTION) ?? deps.affection;

        // [FIX] Load today's itinerary from the saved AppState in Dexie
        // This is the authoritative source - it's been there all day
        let todaysItinerary: DailyItinerary | null = null;
        try {
            const savedState = await db.appState.get(1); // APP_STATE_ID = 1
            const savedFullItinerary = savedState?.state?.fullItinerary;
            if (savedFullItinerary && savedFullItinerary.length > 0) {
                todaysItinerary = savedFullItinerary[deps.currentDay - 1] ?? null;
            }
        } catch (e) {
            console.error("[EOD Pipeline] ArcManager: Failed to load itinerary from Dexie:", e);
        }
        
        // Fallback to deps if Dexie load failed
        if (!todaysItinerary) {
            todaysItinerary = deps.fullItinerary?.[deps.currentDay - 1] ?? null;
        }
        
        devLog("[EOD Pipeline] ArcManager: Loaded today's itinerary", {
            currentDay: deps.currentDay,
            hasItinerary: !!todaysItinerary,
            segmentCount: todaysItinerary?.segments?.length ?? 0
        });

        // [NEW] Load pipeline state bucket for cached mode user prompt overrides
        const pipelineStateBucket = await loadPipelineStateBucket() ?? {};
        devLog("[EOD Pipeline] ArcManager: Loaded pipeline state bucket", {
            hasRAOutputs: !!pipelineStateBucket.updated_relationship_dynamics,
            hasCAOutputs: !!pipelineStateBucket.promotions,
            hasPsychoOutputs: !!pipelineStateBucket.updated_player_profile,
            hasArchivistOutputs: !!pipelineStateBucket.new_facts,
        });

        // [FIX] Use explicit ownerId to determine which characters need arcs.
        // This is more robust than checking involvedCharacters (which includes supporting roles).
        const arcOwners = new Set<string>();
        (deps.storyArcs || []).forEach(arc => {
            // Ignore arcs owned by 'System' (Global Arcs) or 'Unknown' (Migration failures)
            // Only consider active arcs (ongoing or dormant)
            if (arc.ownerId && arc.ownerId !== 'System' && arc.ownerId !== 'Unknown' &&
                (arc.status === 'ongoing' || arc.status === 'dormant')) {
                arcOwners.add(arc.ownerId);
            }
        });
        
        const charactersNeedingArcs = mainCharactersAfterUpdate
             .filter(mc => !arcOwners.has(mc.name))
             .map(mc => mc.name);
        
        const result = await geminiService.executeApiCallWithPolicy(
            'ArcManager',
            getCurrentModelConfig(deps),
            getCurrentApiKeys(deps),
            (cm, ak) => {
                const providerId = cm.startsWith('gemini') ? 'gemini' : 'openrouter';
                return arcManagerService.manageArcsAndSubplots(
                    { ...getCurrentApiKeys(deps), [providerId]: ak },
                    getCurrentModelConfig(deps),
                    STORY_NAME,
                    deps.currentDay,
                    novelContext,
                    mapFullHistoryForAI(previousDaysTranscript), // [FIX] Previous days for context
                    mapFullHistoryForAI(currentDayTranscriptArray), // [FIX] Current day for analysis
                    endOfDayProfiles,
                    storyArcsFromDexie,
                    deps.playerName,
                    subplotsFromDexie,
                    currentRelationshipDynamics,
                    currentRelationshipDynamicsStructured,
                    evolvingPersonasFromDexie,
                    traitsFromDexie, // [NEW] Dexie-first
                    likesDislikesFromDexie,
                    updatedFactSheet,
                    chroniclesFromDexie,
                    biographiesFromDexie,
                    updatedSchedule,
                    mergedQuestions,
                    affectionFromDexie,
                    playerAnalysisData.new_psychoanalysis_prose,
                    playerBackstory,
                    mainCharactersAfterUpdate,
                    sideCharactersAfterUpdate,
                    charactersNeedingArcs,
                    todaysItinerary, // [NEW] Today's planned itinerary for beat tracking
                    cm,
                    pipelineStateBucket.cacheName || null, // cachedContentName from EOD cache
                    pipelineStateBucket // Pass accumulated outputs from previous steps
                );
            },
            overrideModel
        );
        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
        setters.updateStats(result.inputTokens, result.outputTokens);
        const arcManagerData = result.data;

        // [FIX] Validate ArcManager returned valid data structure
        // The arcs array itself can be empty, but the field MUST exist - if it doesn't,
        // something went wrong (e.g., polling returned queue response instead of AI result)
        if (!arcManagerData || typeof arcManagerData !== 'object' || !('updated_story_arcs' in arcManagerData)) {
            throw new Error("ArcManager returned invalid response (missing updated_story_arcs). Possible polling/queue issue.");
        }

        await persistenceService.savePipelineData(EOD_KEY_ARC_MANAGER_RAW, arcManagerData);
        // [MODIFIED] Arc Manager no longer manages Personas/Likes. These are handled by Character Developer.
        // await persistenceService.savePipelineData(EOD_KEY_FINAL_EVOLVING_PERSONAS, arcManagerData.updated_evolving_personas);
        // await persistenceService.savePipelineData(EOD_KEY_FINAL_LIKES_DISLIKES, arcManagerData.updated_likes_dislikes);
        const normalizedArcs = normalizeArcsWithBeatIds(arcManagerData.updated_story_arcs);
        await persistenceService.savePipelineData(EOD_KEY_FINAL_STORY_ARCS, normalizedArcs);
        await persistenceService.savePipelineData(EOD_KEY_FINAL_SUBPLOTS, arcManagerData.subplot_analysis);
        
        // [NEW] Save ArcManager outputs to Pipeline State Bucket for subsequent personas
        const existingBucket = await loadPipelineStateBucket() ?? {};
        const updatedBucket: PipelineStateBucket = {
            ...existingBucket,
            // ArcManager outputs
            arc_updates: arcManagerData.updated_story_arcs || [],
        };
        await savePipelineStateBucket(updatedBucket);
        devLog("[EOD Pipeline] Saved ArcManager outputs to pipeline state bucket");
        
        // [IMPORT GUARD] Check session before persisting step - abort if import happened
        if (deps.shouldContinue && !deps.shouldContinue()) { devLog("[EOD ArcManager] Session invalidated - skipping step persistence"); return false; }
        await persistenceService.saveCurrentEndOfDayStep(completeStep);
        setters.setEndOfDayStep(completeStep);
        devLog("Step Completed: ARC_MANAGER_COMPLETE");
        return true;

    } catch (e: any) {
        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
        console.error(`Error during Arc Manager Step:`, e);
        if (e.message !== 'Extension context invalidated.') {
            await updateAndSaveError(setters, startStep, e.message || 'Arc management failed');
        } else {
            devWarn('Caught "Extension context invalidated". Suppressing error to allow auto-retry on reload.');
        }
        return false;
    }
}

async function executePlannerStep(deps: GameFlowDeps, setters: Setters, currentStep: EndOfDayStep, overrideModel?: AiModelId): Promise<boolean> {
    const startStep = EndOfDayStep.PLANNER_START;
    const completeStep = EndOfDayStep.PLANNER_COMPLETE;
    if (currentStep >= completeStep) {
        devLog("Skipping completed step: PLANNER_COMPLETE");
        return true;
    }

    const isEndOfCycle = (deps.currentDay > 0) && (deps.currentDay % 14 === 0);
    if (isEndOfCycle && !deps.isPipelineResumePending) {
        devLog(`Skipping Planner Step (Day ${deps.currentDay} - End of Playthrough).`);
        await persistenceService.savePipelineData(EOD_KEY_PLANNER_RAW, null);
        await persistenceService.savePipelineData(EOD_KEY_FINAL_ITINERARY_DAY, null);
        const updatedSchedule = await persistenceService.loadPipelineData<ScheduledEvent[]>(EOD_KEY_UPDATED_SCHEDULE);
        await persistenceService.savePipelineData(EOD_KEY_UPDATED_SCHEDULE, updatedSchedule); 
        
        await persistenceService.saveCurrentEndOfDayStep(completeStep);
        setters.setEndOfDayStep(completeStep);
        return true;
    }
    
    setters.setEndOfDayStep(startStep);
    setters.setAnalysisMessage("Planning tomorrow's events...");
    devLog("Executing step: PLANNER_START");
    const stepKey = `vn_eod_pipeline_v6_${startStep}`;
    if (setters.startCountdown) setters.startCountdown(stepKey, 240, 'timeout');

    try {
        const finalFullHistory = await persistenceService.loadPipelineData<DayLog[]>(EOD_KEY_FINAL_HISTORY);
        if (!finalFullHistory) throw new Error("Missing final history for planner.");
        const RECENT_TRANSCRIPT_WINDOW = 2;
        const recentTranscriptDays = finalFullHistory.filter(dayLog =>
            dayLog.day >= deps.currentDay - RECENT_TRANSCRIPT_WINDOW && dayLog.day <= deps.currentDay
        );
        if (recentTranscriptDays.length === 0) throw new Error("Missing transcript data for planner.");
        const recentDialogueTranscript = JSON.stringify(mapFullHistoryForAI(recentTranscriptDays), null, 2);

        const novelChapterData = await persistenceService.loadPipelineData<NovelChapter>(EOD_KEY_NOVEL_CHAPTER_RAW);
        const persistedNovelChapters = await persistenceService.loadPipelineData<NovelChapter[]>(EOD_KEY_NOVEL_CHAPTERS) ?? deps.novelChapters ?? [];
        const plannerChapters = (() => {
            const chapters = [...persistedNovelChapters];
            if (novelChapterData) {
                const dayIndex = Math.max(0, deps.currentDay - 1);
                if (dayIndex < chapters.length) {
                    chapters[dayIndex] = novelChapterData;
                } else {
                    chapters.push(novelChapterData);
                }
            }
            return chapters;
        })();
        const playthroughSummaries = await getPlaythroughSummaries(deps);
        const novelContext = assembleVolumeAwareNovelContext(
            plannerChapters,
            playthroughSummaries,
            2
        );

        const endOfDayProfiles = await persistenceService.loadPipelineData<PsychologicalProfiles>(EOD_KEY_MERGED_PROFILES);
        if (!endOfDayProfiles) throw new Error("Missing updated profiles for planner.");
        const currentRelationshipDynamics = await persistenceService.loadPipelineData<string>(EOD_KEY_RELATIONSHIP_DYNAMICS);
        if (currentRelationshipDynamics === null) throw new Error("Missing relationship dynamics for planner.");
        const currentRelationshipDynamicsStructured = await persistenceService.loadPipelineData<RelationshipDynamicsStructured | null>(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED);
        const updatedFactSheet = await persistenceService.loadPipelineData<{[day: number]: string[]}>(EOD_KEY_UPDATED_FACT_SHEET);
        if (!updatedFactSheet) throw new Error("Missing updated fact sheet for planner.");
        const updatedSchedule = await persistenceService.loadPipelineData<ScheduledEvent[]>(EOD_KEY_UPDATED_SCHEDULE);
        if (!updatedSchedule) throw new Error("Missing updated schedule for planner.");
        const playerAnalysisData = await persistenceService.loadPipelineData<PlayerAnalysisResponse>(EOD_KEY_PLAYER_ANALYSIS_RAW);
        if (!playerAnalysisData) throw new Error("Missing player analysis for planner.");
        const playerBackstory = await persistenceService.loadPipelineData<string | null>(EOD_KEY_PLAYER_BACKSTORY);
        const mainCharactersAfterUpdate = await persistenceService.loadPipelineData<CharacterConfig[]>(EOD_KEY_UPDATED_MAIN_CHARS);
        if (!mainCharactersAfterUpdate) throw new Error("Missing updated main characters for planner.");
        const sideCharactersAfterUpdate = await persistenceService.loadPipelineData<CharacterConfig[]>(EOD_KEY_UPDATED_SIDE_CHARS);
        if (!sideCharactersAfterUpdate) throw new Error("Missing updated side characters for planner.");

        const finalStoryArcs = await persistenceService.loadPipelineData<EvolvingStoryArc[]>(EOD_KEY_FINAL_STORY_ARCS);
        if (!finalStoryArcs) throw new Error("Missing final story arcs from Arc Manager.");
        const finalSubplots = await persistenceService.loadPipelineData<Subplot[] | null>(EOD_KEY_FINAL_SUBPLOTS);
        const finalEvolvingPersonas = await persistenceService.loadPipelineData<{ [key: string]: string } | null>(EOD_KEY_FINAL_EVOLVING_PERSONAS);
        const finalLikesDislikes = await persistenceService.loadPipelineData<CharacterLikesDislikes | null>(EOD_KEY_FINAL_LIKES_DISLIKES);
        if (!finalLikesDislikes) throw new Error("Missing final likes/dislikes from Arc Manager.");
        const finalCharacterTraits = await persistenceService.loadPipelineData<CharacterTraits | null>(EOD_KEY_CHARACTER_TRAITS) || deps.characterTraits; // [NEW]
        const chroniclesFromDexie = await persistenceService.loadPipelineData<{ [key: string]: ChronicleEntry[] }>(EOD_KEY_UPDATED_CHARACTER_CHRONICLES)
            ?? await persistenceService.loadPipelineData<{ [key: string]: ChronicleEntry[] }>(EOD_KEY_CHARACTER_CHRONICLES)
            ?? deps.characterChronicles;
        const biographiesFromDexie = await persistenceService.loadPipelineData<{ [key: string]: string }>(EOD_KEY_UPDATED_CHARACTER_BIOGRAPHIES)
            ?? await persistenceService.loadPipelineData<{ [key: string]: string }>(EOD_KEY_CHARACTER_BIOGRAPHIES)
            ?? deps.characterBiographies;
        const baseQuestions = await persistenceService.loadPipelineData<{ [character: string]: string } | null>(EOD_KEY_UNASKED_QUESTIONS) ?? deps.unaskedQuestions ?? {};
        const newlyInspiredQuestions = await persistenceService.loadPipelineData<Array<{ character: string; question: string; }>>(EOD_KEY_NEWLY_INSPIRED_QUESTIONS) || [];
        const mergedQuestions = { ...baseQuestions };
        newlyInspiredQuestions.forEach(q => { mergedQuestions[q.character] = q.question; });
        await persistenceService.savePipelineData(EOD_KEY_UNASKED_QUESTIONS, mergedQuestions);
        const affectionFromDexie = await persistenceService.loadPipelineData<{ [character: string]: number } | null>(EOD_KEY_AFFECTION) ?? deps.affection;

        // [NEW] Load pipeline state bucket for cached mode user prompt overrides
        const pipelineStateBucket = await loadPipelineStateBucket() ?? {};
        devLog("[EOD Pipeline] NarrativeArchitect: Loaded pipeline state bucket", {
            hasRAOutputs: !!pipelineStateBucket.updated_relationship_dynamics,
            hasArcOutputs: !!pipelineStateBucket.arc_updates,
            hasCharDevOutputs: !!pipelineStateBucket.evolving_personas,
        });

        const payload: NarrativeArchitectNextDayPayload = {
            story: { name: STORY_NAME },
            currentDay: deps.currentDay,
            playerName: deps.playerName,
            hybridMemoryNovelContext: novelContext || 'The story has just begun.', // [STANDARDIZED] Was preProcessedNovelContext
            preProcessedTranscript: recentDialogueTranscript,
            psychologicalProfiles: endOfDayProfiles,
            relationshipDynamics: currentRelationshipDynamics,
            relationshipDynamicsStructured: currentRelationshipDynamicsStructured,
            factSheet: updatedFactSheet,
            scheduledEvents: updatedSchedule, // [STANDARDIZED] Was schedule
            storyArcs: finalStoryArcs,
            subplots: finalSubplots,
            evolvingPersonas: finalEvolvingPersonas,
            characterTraits: finalCharacterTraits, // [NEW]
            characterLikesDislikes: finalLikesDislikes,
            characterChronicles: chroniclesFromDexie,
            characterBiographies: biographiesFromDexie,
            unaskedQuestions: mergedQuestions,
            affection: affectionFromDexie,
            playerPsychoanalysisProse: playerAnalysisData.new_psychoanalysis_prose ?? deps.playerPsychoanalysisProse,
            playerBackstory: playerBackstory ?? deps.playerBackstory,
            mainCharacters: mainCharactersAfterUpdate.map(({ image, ...rest }) => rest),
            sideCharacters: sideCharactersAfterUpdate.map(({ image, ...rest }) => rest),
            modelConfig: deps.modelConfig,
            apiKeys: getCurrentApiKeys(deps),
            // EOD pipeline caching parameters
            cachedContentName: pipelineStateBucket.cacheName || null, // cachedContentName from EOD cache
            pipelineState: pipelineStateBucket,
        };

        // [GENERATIVE IMAGES] Add generated location summaries for NA context
        const enableGenerativeImages = deps.modelConfig?.enableGenerativeImages;
        if (enableGenerativeImages) {
            try {
                const [knownIds, summaries] = await Promise.all([
                    getKnownLocationIds(),
                    getGeneratedLocationSummaries(),
                ]);
                (payload as any).clientContext = {
                    knownLocationIds: knownIds,
                    generatedLocationSummaries: summaries,
                };
            } catch (error) {
                devWarn('[NarrativeArchitect] Failed to fetch known location data:', error);
            }
        }

        const result = await geminiService.executeApiCallWithPolicy(
            'NarrativeArchitect',
            getCurrentModelConfig(deps),
            getCurrentApiKeys(deps),
            async (cm, ak) => {
                const providerId = cm.startsWith('gemini') ? 'gemini' : 'openrouter';
                const currentModelCfg = getCurrentModelConfig(deps);
                const payloadWithOverride = {
                    ...payload,
                    apiKeys: { ...payload.apiKeys, [providerId]: ak },
                    modelConfig: { ...currentModelCfg, narrativeArchitect: cm }
                };
                const data = await apiService.postToNarrativeArchitectNextDay(payloadWithOverride);
                return {
                    data,
                    inputTokens: 0,
                    outputTokens: 0
                };
            },
            overrideModel
        );
        
        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
        setters.updateStats(result.inputTokens, result.outputTokens);
        const parseMaybe = (x: any) => {
            if (typeof x === 'string') {
                try { return JSON.parse(x); } catch { return x; }
            }
            return x;
        };
        const root = parseMaybe(result.data);
        const decoded = parseMaybe(root?.decoded_response);
        const inner = parseMaybe(root?.data);

        const itinerary = root?.itinerary ?? decoded?.itinerary ?? inner?.itinerary;
        const updatedScheduleResult =
            root?.updated_scheduled_events ??
            decoded?.updated_scheduled_events ??
            inner?.updated_scheduled_events ??
            [];
        
        // [NEW] Extract dayCalendar for the next day
        const dayCalendar = root?.dayCalendar ?? decoded?.dayCalendar ?? inner?.dayCalendar ?? null;

        // Validate itinerary before proceeding to downstream steps.
        const segments = itinerary?.segments;
        if (!itinerary || !Array.isArray(segments) || segments.length === 0) {
            throw new Error("Narrative Architect returned an empty itinerary.");
        }
        const proseTooShort = segments.some((seg: any) => !seg?.scenarioProse || seg.scenarioProse.trim().length < 40);
        if (proseTooShort) {
            throw new Error("Itinerary scenarioProse missing or too short.");
        }

        const normalizedPlanner = { itinerary, updated_scheduled_events: updatedScheduleResult };

        await persistenceService.savePipelineData(EOD_KEY_PLANNER_RAW, normalizedPlanner);
        await persistenceService.savePipelineData(EOD_KEY_FINAL_ITINERARY_DAY, itinerary);
        await persistenceService.savePipelineData(EOD_KEY_UPDATED_SCHEDULE, updatedScheduleResult);
        
        // [NEW] Save dayCalendar for the next day and update state
        if (dayCalendar) {
            await persistenceService.savePipelineData(EOD_KEY_DAY_CALENDAR, dayCalendar);
            setters.setDayCalendar(dayCalendar);
            devLog("[EOD Pipeline] Next day calendar generated:", dayCalendar);
        }

        // [NEW] Save NarrativeArchitect outputs to Pipeline State Bucket for subsequent personas
        const existingBucket = await loadPipelineStateBucket() ?? {};
        const updatedBucket: PipelineStateBucket = {
            ...existingBucket,
            // NarrativeArchitect outputs
            next_day_itinerary: itinerary,
        };
        await savePipelineStateBucket(updatedBucket);
        devLog("[EOD Pipeline] Saved NarrativeArchitect outputs to pipeline state bucket");

        // Verify itinerary persistence and presence of prose to catch silent trimming early.
        const verifyItinerary = await persistenceService.loadPipelineData<DailyItinerary>(EOD_KEY_FINAL_ITINERARY_DAY);
        const verifySegments = verifyItinerary?.segments ?? [];
        const hasProse = Array.isArray(verifySegments) && verifySegments.some(seg => typeof seg?.scenarioProse === 'string' && seg.scenarioProse.trim().length > 0);
        if (!verifyItinerary || !hasProse) {
            throw new Error("Itinerary persistence failed or scenarioProse missing after save.");
        }

        // [IMPORT GUARD] Check session before persisting step - abort if import happened
        if (deps.shouldContinue && !deps.shouldContinue()) { devLog("[EOD Planner] Session invalidated - skipping step persistence"); return false; }
        await persistenceService.saveCurrentEndOfDayStep(completeStep);
        setters.setEndOfDayStep(completeStep);
        devLog("Step Completed: PLANNER_COMPLETE");
        return true;

    } catch (e: any) {
        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
        console.error(`Error during Planner Step:`, e);
        if (e.message !== 'Extension context invalidated.') {
            await updateAndSaveError(setters, startStep, e.message || 'Planning failed');
        } else {
            devWarn('Caught "Extension context invalidated". Suppressing error to allow auto-retry on reload.');
        }
        return false;
    }
}

async function executeSceneGenerationStep(deps: GameFlowDeps, setters: Setters, currentStep: EndOfDayStep, overrideModel?: AiModelId): Promise<boolean> {
    const startStep = EndOfDayStep.SCENE_GENERATION_START;
    const completeStep = EndOfDayStep.SCENE_GENERATION_COMPLETE;


     if (currentStep >= completeStep) {
         devLog(`[executeSceneGenerationStep] Skipping - currentStep (${currentStep}) >= completeStep (${completeStep})`);
         return true;
     }

    const isEndOfCycle = (deps.currentDay > 0) && (deps.currentDay % 14 === 0);

    if (isEndOfCycle && !deps.isPipelineResumePending) {
        devLog(`Reached Day ${deps.currentDay}, skipping scene generation for next day.`);
        await persistenceService.saveCurrentEndOfDayStep(completeStep);
        setters.setEndOfDayStep(completeStep);
         devLog("Step Skipped (End of Game): SCENE_GENERATION_COMPLETE");
        return true;
    }

    setters.setEndOfDayStep(startStep);
    setters.setAnalysisMessage("Setting tomorrow's opening scene...");
    devLog("Executing step: SCENE_GENERATION_START");
    const stepKey = `vn_eod_pipeline_v6_${startStep}`;
    if (setters.startCountdown) setters.startCountdown(stepKey, 240, 'timeout');

    try {
        const finalFullHistory = await persistenceService.loadPipelineData<DayLog[]>(EOD_KEY_FINAL_HISTORY);
        if (!finalFullHistory) {
            throw new Error("Missing final history for scene generation.");
        }
        
        const dayLogForToday = finalFullHistory.find(d => d.day === deps.currentDay);
        const currentDayTranscript = dayLogForToday ? JSON.stringify(mapFullHistoryForAI([dayLogForToday])) : "No transcript for today.";

        const novelChapterData = await persistenceService.loadPipelineData<NovelChapter>(EOD_KEY_NOVEL_CHAPTER_RAW);
        const persistedNovelChapters = await persistenceService.loadPipelineData<NovelChapter[]>(EOD_KEY_NOVEL_CHAPTERS) ?? deps.novelChapters ?? [];
        const sceneGenChapters = (() => {
            const chapters = [...persistedNovelChapters];
            if (novelChapterData) {
                const dayIndex = Math.max(0, deps.currentDay - 1);
                if (dayIndex < chapters.length) {
                    chapters[dayIndex] = novelChapterData;
                } else {
                    chapters.push(novelChapterData);
                }
            }
            return chapters;
        })();
        const playthroughSummaries = await getPlaythroughSummaries(deps);
        const novelContext = assembleVolumeAwareNovelContext(
            sceneGenChapters,
            playthroughSummaries,
            2
        );

        const nextDayItinerary = await persistenceService.loadPipelineData<DailyItinerary>(EOD_KEY_FINAL_ITINERARY_DAY);
        if (!nextDayItinerary) throw new Error("Missing next day itinerary for scene generation.");
        const processedItinerary = processItineraryPlaceholders(nextDayItinerary, deps.playerName);
        // [FIX] Sort by day structure order, then take first - works with any segment names/counts
        const planForNextScene = getFirstSegmentByOrder(processedItinerary.segments, getDaySegmentsFromDeps(deps));
        if (!planForNextScene) throw new Error("Missing first segment in next day itinerary.");

        const endOfDayProfiles = await persistenceService.loadPipelineData<PsychologicalProfiles>(EOD_KEY_MERGED_PROFILES);
        if (!endOfDayProfiles) throw new Error("Missing end of day profiles for scene generation.");
        const currentRelationshipDynamics = await persistenceService.loadPipelineData<string>(EOD_KEY_RELATIONSHIP_DYNAMICS);
        if (currentRelationshipDynamics === null) throw new Error("Missing relationship dynamics for scene generation.");

        const updatedFactSheet = await persistenceService.loadPipelineData<{[day: number]: string[]}>(EOD_KEY_UPDATED_FACT_SHEET);
        if (!updatedFactSheet) throw new Error("Missing updated fact sheet for scene generation.");
        const updatedLikesDislikes = await persistenceService.loadPipelineData<CharacterLikesDislikes>(EOD_KEY_FINAL_LIKES_DISLIKES);
        if (!updatedLikesDislikes) throw new Error("Missing updated likes/dislikes for scene generation.");

        const updatedEvolvingPersonas = await persistenceService.loadPipelineData<{[key:string]:string} | null >(EOD_KEY_FINAL_EVOLVING_PERSONAS);
        const playerAnalysisData = await persistenceService.loadPipelineData<PlayerAnalysisResponse>(EOD_KEY_PLAYER_ANALYSIS_RAW);
        if (!playerAnalysisData) throw new Error("Missing player analysis for scene generation.");
        const playerBackstory = await persistenceService.loadPipelineData<string | null>(EOD_KEY_PLAYER_BACKSTORY);
        const mainCharactersAfterUpdate = await persistenceService.loadPipelineData<CharacterConfig[]>(EOD_KEY_UPDATED_MAIN_CHARS);
        if (!mainCharactersAfterUpdate) throw new Error("Missing main characters for scene generation.");
        const sideCharactersAfterUpdate = await persistenceService.loadPipelineData<CharacterConfig[]>(EOD_KEY_UPDATED_SIDE_CHARS);
        if (!sideCharactersAfterUpdate) throw new Error("Missing side characters for scene generation.");

        const finalCharacterTraits = await persistenceService.loadPipelineData<CharacterTraits | null>(EOD_KEY_CHARACTER_TRAITS) || deps.characterTraits; // [NEW]
        const chroniclesFromDexie = await persistenceService.loadPipelineData<{ [key: string]: ChronicleEntry[] }>(EOD_KEY_UPDATED_CHARACTER_CHRONICLES)
            ?? await persistenceService.loadPipelineData<{ [key: string]: ChronicleEntry[] }>(EOD_KEY_CHARACTER_CHRONICLES)
            ?? deps.characterChronicles;
        const biographiesFromDexie = await persistenceService.loadPipelineData<{ [key: string]: string }>(EOD_KEY_UPDATED_CHARACTER_BIOGRAPHIES)
            ?? await persistenceService.loadPipelineData<{ [key: string]: string }>(EOD_KEY_CHARACTER_BIOGRAPHIES)
            ?? deps.characterBiographies;
        const baseQuestions = await persistenceService.loadPipelineData<{ [character: string]: string } | null>(EOD_KEY_UNASKED_QUESTIONS) ?? deps.unaskedQuestions ?? {};
        const newlyInspiredQuestions = await persistenceService.loadPipelineData<Array<{ character: string; question: string; }>>(EOD_KEY_NEWLY_INSPIRED_QUESTIONS) || [];
        const mergedQuestions = { ...baseQuestions };
        newlyInspiredQuestions.forEach(q => { mergedQuestions[q.character] = q.question; });
        await persistenceService.savePipelineData(EOD_KEY_UNASKED_QUESTIONS, mergedQuestions);
        const affectionFromDexie = await persistenceService.loadPipelineData<{ [character: string]: number } | null>(EOD_KEY_AFFECTION) ?? deps.affection;

        // [CACHE REBUILD] Load additional context for cache rebuilding
        const storyArcsForTD = await persistenceService.loadPipelineData<EvolvingStoryArc[]>(EOD_KEY_FINAL_STORY_ARCS) ?? deps.storyArcs ?? [];
        const subplotsForTD = await persistenceService.loadPipelineData<Subplot[]>(EOD_KEY_FINAL_SUBPLOTS) ?? deps.subplots ?? [];
        const scheduledEventsForTD = await persistenceService.loadPipelineData<ScheduledEvent[]>(EOD_KEY_UPDATED_SCHEDULE) ?? deps.scheduledEvents ?? [];
        
        // [NEW] Load dayCalendar for weather/season context
        const dayCalendarForTD = await persistenceService.loadPipelineData<import('../types').DayCalendar | null>(EOD_KEY_DAY_CALENDAR) ?? deps.dayCalendar ?? null;

        // [NEW] Load pipeline state bucket for cached mode user prompt overrides
        // This is the FINAL persona - it receives accumulated outputs from all previous steps
        const pipelineStateBucket = await loadPipelineStateBucket() ?? {};
        devLog("[EOD Pipeline] TransitionDirector: Loaded pipeline state bucket", {
            hasRAOutputs: !!pipelineStateBucket.updated_relationship_dynamics,
            hasCAOutputs: !!pipelineStateBucket.promotions,
            hasPsychoOutputs: !!pipelineStateBucket.updated_player_profile,
            hasArcOutputs: !!pipelineStateBucket.arc_updates,
            hasCharDevOutputs: !!pipelineStateBucket.evolving_personas,
            hasItinerary: !!pipelineStateBucket.next_day_itinerary,
        });

        const result = await geminiService.executeApiCallWithPolicy(
            'TransitionDirector',
            getCurrentModelConfig(deps),
            getCurrentApiKeys(deps),
            (cm, _ak) => transitionDirectorService.runTransitionDirector(
                getCurrentApiKeys(deps), cm as GeminiModel, deps.language, novelContext, currentDayTranscript, '',
                planForNextScene, endOfDayProfiles, currentRelationshipDynamics, updatedFactSheet,
                chroniclesFromDexie, biographiesFromDexie, deps.playerName, updatedLikesDislikes, updatedEvolvingPersonas,
                finalCharacterTraits,
                affectionFromDexie, playerAnalysisData.new_psychoanalysis_prose, playerBackstory,
                mainCharactersAfterUpdate, sideCharactersAfterUpdate,
                finalFullHistory,
                persistedNovelChapters,
                playthroughSummaries,
                deps.currentDay,
                planForNextScene,
                getCurrentModelConfig(deps),
                getCurrentApiKeys(deps),
                // [CACHE REBUILD] Additional fields for cache rebuilding
                storyArcsForTD,
                subplotsForTD,
                scheduledEventsForTD,
                mergedQuestions,
                dayCalendarForTD, // [NEW] Weather/calendar for TD
                undefined, // No segment just ended - this is a new day transition
                cm,
                pipelineStateBucket.cacheName || null, // cachedContentName from EOD cache
                pipelineStateBucket // Pass accumulated outputs from all previous steps
            ),
            overrideModel
        );
        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
        setters.updateStats(result.inputTokens, result.outputTokens);
        const openingSceneData = result.data;

        // [DEV] Log TD compliance checks and thought summary for developer inspection
        if (openingSceneData?.pre_generation_compliance) {
            logTDComplianceReport(openingSceneData.pre_generation_compliance, openingSceneData.thought_summary);
        }

        // [FIX] Validate that the TransitionDirector returned a valid opening scene
        if (!openingSceneData || !openingSceneData.opening_scene) {
            throw new Error("TransitionDirector returned invalid or empty opening scene. Scene generation failed.");
        }

        // [IMPORT GUARD] Check session before persisting - abort if import happened
        if (deps.shouldContinue && !deps.shouldContinue()) { devLog("[EOD SceneGeneration] Session invalidated - skipping persistence"); return false; }
        await persistenceService.savePipelineData(EOD_KEY_OPENING_SCENE_RAW, openingSceneData);
        await persistenceService.savePipelineData(EOD_KEY_FINAL_SCENE_MENTAL_MODEL, openingSceneData.scene_mental_model);
        await persistenceService.saveCurrentEndOfDayStep(completeStep);
        setters.setEndOfDayStep(completeStep);
        devLog("Step Completed: SCENE_GENERATION_COMPLETE");
        return true;

    } catch (e: any) {
        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
        console.error(`Error during Scene Generation Step:`, e);
        if (e.message !== 'Extension context invalidated.') {
            await updateAndSaveError(setters, startStep, e.message || 'Scene generation failed');
        } else {
            devWarn('Caught "Extension context invalidated". Suppressing error to allow auto-retry on reload.');
        }
        return false;
    }
}

async function executeFinalSaveStep(deps: GameFlowDeps, setters: Setters, currentStep: EndOfDayStep): Promise<boolean> {
    const startStep = EndOfDayStep.FINAL_STATE_SAVE_START;
    const completeStep = EndOfDayStep.FINAL_STATE_SAVE_COMPLETE;
    if (currentStep >= completeStep) {
        devLog("Skipping completed step: FINAL_STATE_SAVE_COMPLETE");
        return true;
    }
     // [FIX] Block final save if scene generation hasn't completed (except for end-of-cycle)
     if (currentStep < EndOfDayStep.SCENE_GENERATION_COMPLETE && deps.currentDay < 14) {
         console.error("Attempting final save before scene generation completed. Blocking save to prevent data loss.");
         throw new Error("Cannot proceed to final save: Scene generation step did not complete. Please retry the EOD pipeline.");
     }

    setters.setEndOfDayStep(startStep);
    setters.setAnalysisMessage('Saving progress...');
    devLog("Executing step: FINAL_STATE_SAVE_START");

    try {
        const finalMainCharacters = await persistenceService.loadPipelineData<CharacterConfig[]>(EOD_KEY_UPDATED_MAIN_CHARS);
        if (!finalMainCharacters) throw new Error("Missing final main characters.");
        const finalSideCharacters = await persistenceService.loadPipelineData<CharacterConfig[]>(EOD_KEY_UPDATED_SIDE_CHARS);
        if (!finalSideCharacters) throw new Error("Missing final side characters.");
        const finalAvailableSprites = await persistenceService.loadPipelineData<string[]>(EOD_KEY_UPDATED_AVAILABLE_SPRITES);
        if (!finalAvailableSprites) throw new Error("Missing final available sprites.");
        const finalRelationshipDynamics = await persistenceService.loadPipelineData<string>(EOD_KEY_RELATIONSHIP_DYNAMICS);
        const finalRelationshipDynamicsTranslated = await persistenceService.loadPipelineData<string | null>(EOD_KEY_RELATIONSHIP_DYNAMICS_TRANSLATED);

        // Pull structured from Dexie; if missing, use in-memory, but do NOT overwrite with null.
        const structuredFromDexie = await persistenceService.loadPipelineData<any | null>(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED);
        const structuredTranslatedFromDexie = await persistenceService.loadPipelineData<any | null>(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED_TRANSLATED);

        let finalRelationshipDynamicsStructured = canonicalizeStructuredDynamics(
            structuredFromDexie ?? deps.relationshipDynamicsStructured,
            deps.playerName
        );
        let finalRelationshipDynamicsStructuredTranslated = canonicalizeStructuredDynamics(
            structuredTranslatedFromDexie ?? deps.relationshipDynamicsStructuredTranslated,
            deps.playerName
        );

        // Hard guard: structured dynamics must be present at final save.
        if (!finalRelationshipDynamicsStructured || Object.keys(finalRelationshipDynamicsStructured).length === 0) {
            throw new Error("Final save missing structured relationship dynamics. Please rerun Relationship Analyst step.");
        }

        if (finalRelationshipDynamics === undefined) throw new Error("Missing final relationship dynamics in Dexie.");
        const finalMergedProfiles = await persistenceService.loadPipelineData<PsychologicalProfiles>(EOD_KEY_MERGED_PROFILES);
        const finalMergedProfilesTranslated = await persistenceService.loadPipelineData<PsychologicalProfiles | null>(EOD_KEY_MERGED_PROFILES_TRANSLATED);
        const playerAnalysisData = await persistenceService.loadPipelineData<PlayerAnalysisResponse>(EOD_KEY_PLAYER_ANALYSIS_RAW);
        const finalPlayerProse = playerAnalysisData?.new_psychoanalysis_prose ?? deps.playerPsychoanalysisProse;
        const finalPlayerBackstory = await persistenceService.loadPipelineData<string | null>(EOD_KEY_PLAYER_BACKSTORY);
        const novelChapterData = await persistenceService.loadPipelineData<NovelChapter>(EOD_KEY_NOVEL_CHAPTER_RAW);
        const updatedFactSheet = await persistenceService.loadPipelineData<{ [day: number]: string[] }>(EOD_KEY_UPDATED_FACT_SHEET);
        if (!updatedFactSheet) throw new Error("Missing final fact sheet.");
        const updatedSchedule = await persistenceService.loadPipelineData<ScheduledEvent[]>(EOD_KEY_UPDATED_SCHEDULE);
        if (!updatedSchedule) throw new Error("Missing final schedule.");
        const finalEvolvingPersonas = await persistenceService.loadPipelineData<{ [key: string]: string } | null>(EOD_KEY_FINAL_EVOLVING_PERSONAS);
        const finalTraits = await persistenceService.loadPipelineData<CharacterTraits | null>(EOD_KEY_CHARACTER_TRAITS); // [NEW]
        const finalLikesDislikes = await persistenceService.loadPipelineData<CharacterLikesDislikes | null>(EOD_KEY_FINAL_LIKES_DISLIKES);
        const finalStoryArcs = await persistenceService.loadPipelineData<EvolvingStoryArc[]>(EOD_KEY_FINAL_STORY_ARCS);
        const finalSubplots = await persistenceService.loadPipelineData<Subplot[] | null>(EOD_KEY_FINAL_SUBPLOTS);
        const finalItineraryDay = await persistenceService.loadPipelineData<DailyItinerary>(EOD_KEY_FINAL_ITINERARY_DAY);
        const translatedNovelChapter = await persistenceService.loadPipelineData<string | null>(EOD_KEY_TRANSLATED_NOVEL);
        const translatedPlayerProse = await persistenceService.loadPipelineData<string | null>(EOD_KEY_TRANSLATED_PLAYER_PROSE);
        const translatedItineraryDay = await persistenceService.loadPipelineData<DailyItinerary | null>(EOD_KEY_TRANSLATED_ITINERARY_DAY);
        const finalSceneMentalModel = await persistenceService.loadPipelineData<SceneMentalModel | null>(EOD_KEY_FINAL_SCENE_MENTAL_MODEL);
        const finalFullHistory = await persistenceService.loadPipelineData<DayLog[]>(EOD_KEY_FINAL_HISTORY);
        if (!finalFullHistory) throw new Error("Missing final full history.");
        const newlyPromotedNames = await persistenceService.loadPipelineData<string[]>(EOD_KEY_NEWLY_PROMOTED_NAMES) || [];
        const newChronicleEntries = await persistenceService.loadPipelineData<NewChronicleEntry[]>(EOD_KEY_NEW_CHRONICLE_ENTRIES) || [];
        const newlyInspiredQuestions = await persistenceService.loadPipelineData<Array<{ character: string; question: string; }>>(EOD_KEY_NEWLY_INSPIRED_QUESTIONS) || [];
        const segmentEnded = await persistenceService.loadPipelineData<DaySegment>(EOD_KEY_SEGMENT_ENDED);
        if (!segmentEnded) throw new Error("Missing segmentEnded marker.");
        const openingSceneData = await persistenceService.loadPipelineData<TransitionDirectorResponse>(EOD_KEY_OPENING_SCENE_RAW);
        // [FIX] Validate opening scene data exists (except for end-of-cycle)
        if (!openingSceneData?.opening_scene && deps.currentDay < 14) {
            throw new Error("Missing opening scene data. Scene generation step may have failed. Please retry the EOD pipeline.");
        }
        const pendingPlaythroughSummaries = await persistenceService.loadPipelineData<string[]>(EOD_KEY_PLAYTHROUGH_SUMMARIES);
        const mergedUnaskedQuestions = await persistenceService.loadPipelineData<{ [character: string]: string }>(EOD_KEY_UNASKED_QUESTIONS);

        setters.setMainCharacters(finalMainCharacters);
        setters.setSideCharacters(finalSideCharacters);
        setters.setAvailableGenericSetNames(finalAvailableSprites);
        setters.setRelationshipDynamics(finalRelationshipDynamics);
        setters.setRelationshipDynamicsTranslated(finalRelationshipDynamicsTranslated);

        if (setters.setRelationshipDynamicsStructured) {
            setters.setRelationshipDynamicsStructured(finalRelationshipDynamicsStructured);
        }
        if (setters.setRelationshipDynamicsStructuredTranslated) {
            setters.setRelationshipDynamicsStructuredTranslated(finalRelationshipDynamicsStructuredTranslated ?? null);
        }
        // Ensure structured dynamics stay in Dexie for exports/resume.
        await persistenceService.savePipelineData(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED, finalRelationshipDynamicsStructured);
        await persistenceService.savePipelineData(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED_TRANSLATED, finalRelationshipDynamicsStructuredTranslated ?? null);
        setters.setPsychologicalProfiles(finalMergedProfiles);
        setters.setPsychologicalProfilesTranslated(finalMergedProfilesTranslated);
        setters.setPlayerPsychoanalysisProse(finalPlayerProse);
        setters.setPlayerBackstory(finalPlayerBackstory);
        if (pendingPlaythroughSummaries) {
            setters.setPlaythroughSummaries(pendingPlaythroughSummaries);
        }

        if (novelChapterData) {
            setters.setNovelChapters(prev => {
                // Create a copy of the array
                const newChapters = [...prev];
                // Calculate the index for the current day (Day 1 is index 0)
                const dayIndex = deps.currentDay - 1;
                
                // If an entry exists at this index, overwrite it. Otherwise, append.
                if (dayIndex < newChapters.length) {
                    devWarn(`[Fix] Overwriting existing chapter for Day ${deps.currentDay} to prevent duplication.`);
                    newChapters[dayIndex] = novelChapterData;
                } else {
                    newChapters.push(novelChapterData);
                }
                return newChapters;
            });

            if (translatedNovelChapter !== null) {
                setters.setNovelChaptersTranslated(prev => {
                    const newChapters = prev ? [...prev] : [];
                    const dayIndex = deps.currentDay - 1;
                    
                    if (dayIndex < newChapters.length) {
                        newChapters[dayIndex] = translatedNovelChapter;
                    } else {
                        newChapters.push(translatedNovelChapter);
                    }
                    return newChapters;
                });
            }
        }
        if (translatedPlayerProse !== null) setters.setPlayerPsychoanalysisProseTranslated(translatedPlayerProse);


        setters.setFactSheet(updatedFactSheet);
        setters.setScheduledEvents(updatedSchedule);
        setters.setEvolvingPersonas(finalEvolvingPersonas);
        if (finalTraits) setters.setCharacterTraits(finalTraits); // [NEW]
        setters.setCharacterLikesDislikes(finalLikesDislikes);
        setters.setStoryArcs(finalStoryArcs);
        setters.setSubplots(finalSubplots);

        if (finalItineraryDay) {
            setters.setFullItinerary(prev => {
                const newItinerary = prev ? [...prev] : [];
                const nextDayIndex = deps.currentDay;
                while (newItinerary.length <= nextDayIndex) newItinerary.push({ day_theme: '', segments: [] });
                newItinerary[nextDayIndex] = finalItineraryDay;
                return newItinerary;
            });
             if (translatedItineraryDay) {
                setters.setFullItineraryTranslated(prev => {
                    const newItinerary = prev ? [...prev] : [];
                    const nextDayIndex = deps.currentDay;
                    while (newItinerary.length <= nextDayIndex) newItinerary.push({ day_theme: '', segments: [] });
                    newItinerary[nextDayIndex] = translatedItineraryDay;
                    return newItinerary;
                });
            } else if (deps.language !== 'English') {
                 setters.setFullItineraryTranslated(prev => {
                      const newItinerary = prev ? [...prev] : [];
                      const nextDayIndex = deps.currentDay;
                      if(newItinerary[nextDayIndex]) newItinerary[nextDayIndex] = { day_theme: '', segments: [] };
                      return newItinerary;
                 });
            }
        }

        if (mergedUnaskedQuestions) {
            setters.setUnaskedQuestions(mergedUnaskedQuestions);
        } else if (newlyInspiredQuestions.length > 0) {
            setters.setUnaskedQuestions(prev => {
                const updatedQuestions = { ...(prev || {}) };
                newlyInspiredQuestions.forEach(q => { updatedQuestions[q.character] = q.question; });
                return updatedQuestions;
            });
        }

        if (newChronicleEntries.length > 0) {
            setters.setCharacterChronicles(prev => {
                const updatedChronicles = prev ? JSON.parse(JSON.stringify(prev)) : {};
                newChronicleEntries.forEach(newEntry => {
                    const { character, ...rest } = newEntry;
                    if (!updatedChronicles[character]) updatedChronicles[character] = [];
                    const entryToAdd: ChronicleEntry = { ...rest, day: deps.currentDay, segment: segmentEnded };
                    const alreadyExists = updatedChronicles[character].some((existingEntry: ChronicleEntry) =>
                         existingEntry.day === entryToAdd.day && existingEntry.segment === entryToAdd.segment &&
                         existingEntry.summary === entryToAdd.summary && existingEntry.category === entryToAdd.category);
                    if (!alreadyExists) updatedChronicles[character].push(entryToAdd);
                });
                return updatedChronicles;
            });
        }

        setters.setFullHistory(finalFullHistory);

        for (const name of newlyPromotedNames) {
             const promoAffection = await persistenceService.loadPipelineData<number>(EOD_KEY_PROMO_AFFECTION_PREFIX + name);
             if (promoAffection !== null) {
                 setters.setAffection(prev => ({ ...prev, [name]: promoAffection }));
                 await persistenceService.savePipelineData(EOD_KEY_PROMO_AFFECTION_PREFIX + name, null);
             }
        }

         if (newlyPromotedNames.length > 0) {
             setters.setAffectionGainedToday(prev => { const next = {...prev}; newlyPromotedNames.forEach(name => delete next[name]); return next; });
             setters.setAffectionLostToday(prev => { const next = {...prev}; newlyPromotedNames.forEach(name => delete next[name]); return next; });
         }

        setters.setSceneMentalModel(finalSceneMentalModel);
        if (openingSceneData) setters.setOpeningSceneCache(openingSceneData.opening_scene);

        await new Promise(resolve => setTimeout(resolve, 100));
        // [IMPORT GUARD] Check session before final state save - abort if import happened
        if (deps.shouldContinue && !deps.shouldContinue()) { devLog("[EOD FinalSave] Session invalidated - skipping final state persistence"); return false; }
        const finalAppState = setters.getCurrentState();
        await persistenceService.saveState(finalAppState);

        await persistenceService.saveCurrentEndOfDayStep(completeStep);
        setters.setEndOfDayStep(completeStep);
        devLog("Step Completed: FINAL_STATE_SAVE_COMPLETE");
        return true;

    } catch (e: any) {
        console.error(`Error during Final Save Step:`, e);
        await updateAndSaveError(setters, startStep, e.message || 'Final save failed');
        return false;
    }
}

export async function handleDayEnd(deps: GameFlowDeps, setters: Setters, overrideModel?: AiModelId) {
    // [FIX] Re-entrance guard to prevent race conditions from React re-renders
    if (isProcessingRef.current) {
        devWarn("[handleDayEnd] Already processing EOD sequence, ignoring duplicate call.");
        return;
    }
    isProcessingRef.current = true;

    try {
    let currentStep = await persistenceService.loadCurrentEndOfDayStep();
    const currentErrors = await persistenceService.loadEodErrors() || {};
    setters.setEndOfDayErrors(currentErrors);

    if (currentStep === EndOfDayStep.FINAL_STATE_SAVE_COMPLETE && Object.keys(currentErrors).length === 0) {
        setters.setIsAnalyzing(true);
        setters.setEndOfDayStep(EndOfDayStep.FINAL_STATE_SAVE_COMPLETE);
        setters.setIsPipelineCompleteAndReady(true);
        devLog("EOD sequence already complete. Awaiting user action.");
        return; // finally block will reset isProcessingRef
    }

    setters.setError(null);
    setters.setIsUnrecoverableError(false);
    const stepToRetry = Object.keys(currentErrors)[0];
    if (stepToRetry || currentStep === EndOfDayStep.NOT_STARTED) {
        await persistenceService.saveEodErrors({});
        setters.setEndOfDayErrors({});
    }
    
    // Clear "modified today" bucket at EOD start.
    // Intra-day dynamics are already persisted to Dexie after each segment transition.
    // EOD cache will load from Dexie (has full state). RA runs and its NEW changes 
    // are tracked in the bucket, going to subsequent EOD personas via user prompt.
    // Bucket is cleared again at day transition for a fresh start.
    if (currentStep === EndOfDayStep.NOT_STARTED) {
        await persistenceService.savePipelineData(SEGMENT_KEY_RELATIONSHIP_KEYS_MODIFIED_TODAY, null);
        devLog("Cleared relationship keys bucket - intra-day dynamics are in Dexie, ready for EOD cache");
        
        // [FIX] Clear old cache name to force fresh cache creation
        // This ensures we always use the latest fullHistory data from Dexie
        await clearPipelineStateBucket();
        devLog("[EOD Pipeline] Cleared pipeline state bucket - will create fresh cache");
        
        // === DM CACHE CLEANUP ===
        // Delete the DM cache to stop billing - it's no longer needed during EOD
        const dmCacheName = await persistenceService.loadPipelineData<string>(persistenceService.DM_CACHE_NAME_KEY);
        if (dmCacheName && getCurrentApiKeys(deps)?.gemini) {
            devLog("[EOD Pipeline] Deleting DM cache:", dmCacheName);
            const deleteResult = await apiService.deleteCache(dmCacheName, getCurrentApiKeys(deps));
            if (deleteResult.deleted) {
                devLog("[EOD Pipeline] DM cache deleted successfully");
            } else {
                devWarn("[EOD Pipeline] Failed to delete DM cache (may have already expired)");
            }
            // Clear the stored cache name regardless of delete result
            await persistenceService.savePipelineData(persistenceService.DM_CACHE_NAME_KEY, null);
        }
    }
    
    devLog(`Starting/Resuming EOD sequence at step: ${EndOfDayStep[currentStep]}`);

    // Use a local variable to consume the override model. 
    // It applies ONLY to the first step executed in this sequence (the one being retried).
    let activeOverride = overrideModel;

    if (currentStep < EndOfDayStep.ARCHIVE_SEGMENT_COMPLETE) {
        if (!await executeArchiveStep(deps, setters, currentStep)) { console.error("EOD sequence halted at Archive Step."); return; }
        if (deps.shouldContinue && !deps.shouldContinue()) { devLog("[EOD] Pipeline aborted - import detected."); return; }
        currentStep = await persistenceService.loadCurrentEndOfDayStep();
    }

    // === EOD CACHE CREATION ===
    // After archive step, create the EOD cache (if using Gemini model)
    // This cache will be used by all 9 pipeline personas
    let pipelineStateBucket = await loadPipelineStateBucket() ?? {};
    
    // Get current model configuration
    const currentModelCfg = getCurrentModelConfig(deps);
    const currentModel = currentModelCfg?.storyModel ?? currentModelCfg?.selectedModel ?? '';
    
    // Check if existing cache was created with a DIFFERENT model (user switched mid-pipeline)
    // If so, we must invalidate the old cache - Gemini requires cache model = request model
    // Also invalidate if cacheModel is missing (old cache from before model tracking was added)
    if (pipelineStateBucket.cacheName && (!pipelineStateBucket.cacheModel || pipelineStateBucket.cacheModel !== currentModel)) {
        devLog(`[EOD Pipeline] Model mismatch: cache=${pipelineStateBucket.cacheModel || 'unknown'}, current=${currentModel}. Invalidating incompatible cache...`);
        setters.setAnalysisMessage('Model changed - rebuilding cache...');
        // Delete the old cache (fire and forget - don't block pipeline on this)
        apiService.deleteCache(pipelineStateBucket.cacheName, getCurrentApiKeys(deps)).catch(err => 
            devWarn('[EOD Pipeline] Failed to delete old cache (non-blocking):', err)
        );
        // Clear the cache reference so we create a new one below
        delete pipelineStateBucket.cacheName;
        delete pipelineStateBucket.cacheModel;
        delete pipelineStateBucket.cacheCreatedAt;
        await savePipelineStateBucket(pipelineStateBucket);
    }
    
    // Create cache if we don't have one (fresh start OR just invalidated due to model switch)
    if (!pipelineStateBucket.cacheName && currentModel?.startsWith('gemini')) {
        devLog("[EOD Pipeline] Creating EOD cache...");
        setters.setAnalysisMessage('Preparing analysis cache...');
        
        // Build the cache payload from PERSISTED history (includes current segment)
        // Use HYBRID MEMORY pattern: novel prose for older days, raw transcript only for recent days
        // CRITICAL: Must use EOD_KEY_FINAL_HISTORY, not deps.fullHistory!
        // deps.fullHistory is stale React state that doesn't include the final segment.
        // executeArchiveStep() just merged deps.history into fullHistory and saved it to Dexie.
        const fullHistory = await persistenceService.loadPipelineData<DayLog[]>(EOD_KEY_FINAL_HISTORY) || deps.fullHistory || [];
        const currentDayIndex = deps.currentDay;
        
        // Build hybrid memory novel context (prose for old days, excludes last 2 days)
        const hybridMemoryNovelContext = assembleVolumeAwareNovelContext(
            deps.novelChapters || [],
            deps.playthroughSummaries || [],
            { recentTranscriptBuffer: 2 }
        );
        
        // Get last 2 days raw transcript (Day N-1 and N-2)
        const pastDays = fullHistory.filter(d => d.day < currentDayIndex);
        const recentPastDays = pastDays.filter(d => d.day >= currentDayIndex - 2);
        const recentPastTranscript = mapFullHistoryForAI(recentPastDays);
        
        // Get current day transcript (finalized for EOD)
        const currentDayLog = fullHistory.find(d => d.day === currentDayIndex);
        const currentDayTranscript = currentDayLog ? mapFullHistoryForAI([currentDayLog]) : [];
        
        const cachePayload = apiService.attachPromptLoggingFlag({
            story: { name: STORY_NAME },
            currentDay: deps.currentDay,
            playerName: deps.playerName,
            modelConfig: getCurrentModelConfig(deps),
            apiKeys: getCurrentApiKeys(deps),
            // HYBRID MEMORY - NOT raw fullHistory (which is too large)
            hybridMemoryNovelContext,  // Pre-processed novel context
            recentPastTranscript,       // Last 2 days raw dialogue
            currentDayTranscript,       // Current day finalized dialogue
            // Other context data (these are small)
            factSheet: deps.factSheet,
            storyArcs: deps.storyArcs,
            characterChronicles: deps.characterChronicles,
            characterBiographies: deps.characterBiographies,
            evolvingPersonas: deps.evolvingPersonas,
            characterTraits: deps.characterTraits,
            characterLikesDislikes: deps.characterLikesDislikes,
            relationshipDynamics: deps.relationshipDynamics,
            relationshipDynamicsStructured: deps.relationshipDynamicsStructured,
            psychologicalProfiles: deps.psychologicalProfiles,
            playerPsychoanalysisProse: deps.playerPsychoanalysisProse,
            playerBackstory: deps.playerBackstory,
            // Strip base64 image blobs - backend doesn't need them
            mainCharacters: (deps.mainCharacters || []).map(({ image, ...rest }) => rest),
            sideCharacters: (deps.sideCharacters || []).map(({ image, ...rest }) => rest),
            affection: deps.affection,
            unaskedQuestions: deps.unaskedQuestions,
        });
        
        const cacheResult = await apiService.createEodCache(cachePayload);
        
        if (cacheResult.cacheName) {
            devLog("[EOD Pipeline] EOD cache created:", cacheResult.cacheName, "for model:", currentModel);
            pipelineStateBucket.cacheName = cacheResult.cacheName;
            pipelineStateBucket.cacheModel = currentModel; // Track which model the cache is for
            pipelineStateBucket.cacheCreatedAt = cacheResult.createdAt || Date.now();
            await savePipelineStateBucket(pipelineStateBucket);
        } else {
            devWarn("[EOD Pipeline] Cache creation failed, proceeding without cache:", cacheResult.error);
        }
    } else if (pipelineStateBucket.cacheName) {
        devLog("[EOD Pipeline] Resuming with existing cache:", pipelineStateBucket.cacheName, "model:", pipelineStateBucket.cacheModel || 'unknown');
    }

    // Helper to check if pipeline should abort (import happened)
    const shouldAbort = () => deps.shouldContinue && !deps.shouldContinue();
    
    // RelationshipAnalyst runs FIRST so its updates go to all other EOD personas via user prompt
    if (currentStep < EndOfDayStep.RELATIONSHIP_ANALYSIS_COMPLETE) {
        if (!await executeRelationshipAnalysisStep(deps, setters, currentStep, activeOverride)) { console.error("EOD sequence halted at Relationship Analysis Step."); return; }
        if (shouldAbort()) { devLog("[EOD] Pipeline aborted - import detected."); return; }
        activeOverride = undefined;
        currentStep = await persistenceService.loadCurrentEndOfDayStep();
    }
    if (currentStep < EndOfDayStep.CASTING_ANALYSIS_COMPLETE) {
        if (!await executeCastingAnalysisStep(deps, setters, currentStep, activeOverride)) { console.error("EOD sequence halted at Casting Analysis Step."); return; }
        if (shouldAbort()) { devLog("[EOD] Pipeline aborted - import detected."); return; }
        activeOverride = undefined;
        currentStep = await persistenceService.loadCurrentEndOfDayStep();
    }
    if (currentStep < EndOfDayStep.PLAYER_ANALYSIS_COMPLETE) {
        if (!await executePlayerAnalysisStep(deps, setters, currentStep, activeOverride)) { console.error("EOD sequence halted at Player Analysis Step."); return; }
        if (shouldAbort()) { devLog("[EOD] Pipeline aborted - import detected."); return; }
        activeOverride = undefined;
        currentStep = await persistenceService.loadCurrentEndOfDayStep();
    }
    if (currentStep < EndOfDayStep.NOVEL_CHAPTER_COMPLETE) {
        if (!await executeNovelChapterStep(deps, setters, currentStep, activeOverride)) { console.error("EOD sequence halted at Novel Chapter Step."); return; }
        if (shouldAbort()) { devLog("[EOD] Pipeline aborted - import detected."); return; }
        activeOverride = undefined;
        currentStep = await persistenceService.loadCurrentEndOfDayStep();
    }
    if (currentStep < EndOfDayStep.ARCHIVIST_COMPLETE) {
        if (!await executeArchivistStep(deps, setters, currentStep, activeOverride)) { console.error("EOD sequence halted at Archivist Step."); return; }
        if (shouldAbort()) { devLog("[EOD] Pipeline aborted - import detected."); return; }
        activeOverride = undefined;
        currentStep = await persistenceService.loadCurrentEndOfDayStep();
    }

    // 7. Translation (MOVED UP - Now runs before Arc Manager/Planner)
    if (currentStep < EndOfDayStep.TRANSLATION_COMPLETE) {
        if (!await executeTranslationStep(deps, setters, currentStep, activeOverride)) { console.error("EOD sequence halted at Translation Step."); return; }
        if (shouldAbort()) { devLog("[EOD] Pipeline aborted - import detected."); return; }
        activeOverride = undefined;
        currentStep = await persistenceService.loadCurrentEndOfDayStep();
    }

    // --- DAY 14 BREAKPOINT ---
    const isDay14Cycle = (deps.currentDay > 0) && (deps.currentDay % 14 === 0);
    
    // ROBUST CHECK: Check both React state AND Database for the resume flag.
    // This fixes the race condition where state update hasn't propagated to 'deps' yet.
    const isResumePending = deps.isPipelineResumePending || await persistenceService.loadIsResumingFlag();

    if (isDay14Cycle && !isResumePending) {
        devLog(`Day ${deps.currentDay} reached: Pausing pipeline AFTER Translation for End Game Screen.`);
        setters.setIsGameCompleted(true);
        setters.setIsAnalyzing(false);
        return; // STOP HERE
    }
    // -------------------------

    // 8. Arc Manager
    if (currentStep < EndOfDayStep.ARC_MANAGER_COMPLETE) {
        if (!await executeArcManagerStep(deps, setters, currentStep, activeOverride)) { console.error("EOD sequence halted at Arc Manager Step."); return; }
        if (shouldAbort()) { devLog("[EOD] Pipeline aborted - import detected."); return; }
        activeOverride = undefined;
        currentStep = await persistenceService.loadCurrentEndOfDayStep();
    }

    // 9. Character Developer [NEW]
    if (currentStep < EndOfDayStep.CHARACTER_DEVELOPER_COMPLETE) {
        if (!await executeCharacterDeveloperStep(deps, setters, currentStep, activeOverride)) { console.error("EOD sequence halted at Character Developer Step."); return; }
        if (shouldAbort()) { devLog("[EOD] Pipeline aborted - import detected."); return; }
        activeOverride = undefined;
        currentStep = await persistenceService.loadCurrentEndOfDayStep();
    }

    // 10. Planner
    if (currentStep < EndOfDayStep.PLANNER_COMPLETE) {
        if (!await executePlannerStep(deps, setters, currentStep, activeOverride)) { console.error("EOD sequence halted at Planner Step."); return; }
        if (shouldAbort()) { devLog("[EOD] Pipeline aborted - import detected."); return; }
        activeOverride = undefined;
        currentStep = await persistenceService.loadCurrentEndOfDayStep();
    }

    // Removed Translation Step from here

    if (currentStep < EndOfDayStep.SCENE_GENERATION_COMPLETE) {
        if (!await executeSceneGenerationStep(deps, setters, currentStep, activeOverride)) { console.error("EOD sequence halted at Scene Generation Step."); return; }
        if (shouldAbort()) { devLog("[EOD] Pipeline aborted - import detected."); return; }
        activeOverride = undefined;
        currentStep = await persistenceService.loadCurrentEndOfDayStep();
    }
    if (currentStep < EndOfDayStep.FINAL_STATE_SAVE_COMPLETE) {
        if (!await executeFinalSaveStep(deps, setters, currentStep)) { console.error("EOD sequence halted at Final Save Step."); return; }
        currentStep = await persistenceService.loadCurrentEndOfDayStep();
    }

    if (currentStep === EndOfDayStep.FINAL_STATE_SAVE_COMPLETE) {
        devLog("End of Day sequence complete.");
        
        // === EOD CACHE CLEANUP ===
        // Delete the EOD cache to stop billing and clean up
        const finalBucket = await loadPipelineStateBucket();
        if (finalBucket?.cacheName && getCurrentApiKeys(deps)?.gemini) {
            devLog("[EOD Pipeline] Deleting EOD cache:", finalBucket.cacheName);
            const deleteResult = await apiService.deleteCache(finalBucket.cacheName, getCurrentApiKeys(deps));
            if (deleteResult.deleted) {
                devLog("[EOD Pipeline] EOD cache deleted successfully");
            } else {
                devWarn("[EOD Pipeline] Failed to delete EOD cache (may have already expired)");
            }
        }
        
        // Clear the pipeline state bucket for next time
        await clearPipelineStateBucket();
        devLog("[EOD Pipeline] Cleared pipeline state bucket");

        setters.setIsPipelineCompleteAndReady(true);
        setters.setIsAnalyzing(true);
        setters.setEndOfDayStep(EndOfDayStep.FINAL_STATE_SAVE_COMPLETE);

        // Clear the resume flag if we used it
        // ROBUST CHECK: Check both React state AND Database for the resume flag.
        // This fixes the race condition where state update hasn't propagated to 'deps' yet.
        const isResumePending = deps.isPipelineResumePending || await persistenceService.loadIsResumingFlag();
        if (isResumePending) {
            devLog("Pipeline resume complete. Resetting resume flag.");
            setters.setIsPipelineResumePending(false);
            await persistenceService.saveIsResumingFlag(false);
        }
    } else {
        console.error("EOD sequence stopped unexpectedly.");
        setters.setIsAnalyzing(true);
    }
    } finally {
        // [FIX] Always reset the processing flag to allow retries
        isProcessingRef.current = false;
    }
}

export const startNewPlaythrough = async (deps: GameFlowDeps, setters: Setters & { handlersRef: React.MutableRefObject<any> }) => {
    try {
        setters.setIsGameCompleted(false);
        setters.setPlaythroughCounter(prev => prev + 1);

        const plannerDataDay14 = await persistenceService.loadPipelineData<NextDayResponse>(EOD_KEY_PLANNER_RAW);
        const finalProfilesDay14 = await persistenceService.loadPipelineData<PsychologicalProfiles>(EOD_KEY_MERGED_PROFILES);
        const finalPersonasDay14 = await persistenceService.loadPipelineData<{ [key: string]: string } | null>(EOD_KEY_FINAL_EVOLVING_PERSONAS);
        const finalTraitsDay14 = await persistenceService.loadPipelineData<CharacterTraits | null>(EOD_KEY_CHARACTER_TRAITS); // [NEW]
        const finalLikesDislikesDay14 = await persistenceService.loadPipelineData<CharacterLikesDislikes | null>(EOD_KEY_FINAL_LIKES_DISLIKES);
        const finalStoryArcsDay14 = await persistenceService.loadPipelineData<EvolvingStoryArc[]>(EOD_KEY_FINAL_STORY_ARCS);
        const finalSubplotsDay14 = await persistenceService.loadPipelineData<Subplot[] | null>(EOD_KEY_FINAL_SUBPLOTS);
        const finalFactSheetDay14 = await persistenceService.loadPipelineData<{ [day: number]: string[] }>(EOD_KEY_UPDATED_FACT_SHEET);
        const finalScheduleDay14 = await persistenceService.loadPipelineData<ScheduledEvent[]>(EOD_KEY_UPDATED_SCHEDULE);
        const finalRelationshipDynamicsDay14 = await persistenceService.loadPipelineData<string>(EOD_KEY_RELATIONSHIP_DYNAMICS);
        const finalBackstoryDay14 = await persistenceService.loadPipelineData<string|null>(EOD_KEY_PLAYER_BACKSTORY);
        const finalChroniclesDay14 = deps.characterChronicles;
        const finalUnaskedQuestionsDay14 = deps.unaskedQuestions;
        const finalAffectionDay14 = deps.affection;

        await setters.resetGameState(deps.playerName, deps.language, true);

        if (finalPersonasDay14) setters.setEvolvingPersonas(finalPersonasDay14);
        if (finalTraitsDay14) setters.setCharacterTraits(finalTraitsDay14); // [NEW]
        if (finalLikesDislikesDay14) setters.setCharacterLikesDislikes(finalLikesDislikesDay14);
        if (finalStoryArcsDay14) setters.setStoryArcs(finalStoryArcsDay14);
        if (finalSubplotsDay14) setters.setSubplots(finalSubplotsDay14);
        if (finalFactSheetDay14) setters.setFactSheet(finalFactSheetDay14);
        if (finalScheduleDay14) setters.setScheduledEvents(finalScheduleDay14.filter(e => e.day > 14));
        if (finalRelationshipDynamicsDay14) setters.setRelationshipDynamics(finalRelationshipDynamicsDay14);
        if (finalProfilesDay14) setters.setPsychologicalProfiles(finalProfilesDay14);
        if (finalBackstoryDay14) setters.setPlayerBackstory(finalBackstoryDay14);
        if (finalChroniclesDay14) setters.setCharacterChronicles(finalChroniclesDay14);
        if (finalUnaskedQuestionsDay14) setters.setUnaskedQuestions(finalUnaskedQuestionsDay14);
        if (finalAffectionDay14) setters.setAffection(finalAffectionDay14);

        // FIX: Fetch fresh config to ensure we use original characters for the next playthrough.
        const gameConfig = await apiService.fetchGameConfig(STORY_NAME);
        const freshMainCharacters = gameConfig.characters.filter(c => c.type === 'main').map(c => ({ name: c.name }));
        const freshSideCharacters = gameConfig.characters.filter(c => c.type === 'side').map(c => ({ name: c.name }));

        const foundationPayload = {
            story: { name: STORY_NAME },
            mainCharacters: freshMainCharacters,
            sideCharacters: freshSideCharacters,
            modelConfig: deps.modelConfig,
            apiKeys: getCurrentApiKeys(deps),
        };
        const initialFoundation = await apiService.postToNarrativeArchitectFoundation(foundationPayload);
        // [FIX] Normalize arcs to ensure ownerId is properly mapped from API response
        const normalizedInitialArcs = normalizeArcsWithBeatIds(initialFoundation.story_arcs);
        setters.setStoryArcs(normalizedInitialArcs);
        // Initial likes/dislikes and relationship dynamics now generated in dedicated steps.
        // [FIX] Store normalized arcs in foundation data
        await persistenceService.savePipelineData(NEW_GAME_KEY_FOUNDATION, { ...initialFoundation, story_arcs: normalizedInitialArcs });

        const genesisDynamics = await persistenceService.loadPipelineData<any>(NEW_GAME_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED);
        const genesisDynamicsProse = structuredDynamicsToProse(genesisDynamics) || 'No dynamics established yet.';
        const genesisLikes = (initialFoundation as any).authentic_likes_dislikes || {};

        const dayOnePayload = {
            story: { name: STORY_NAME },
            playerName: deps.playerName,
            foundationData: initialFoundation,
            mainCharacters: freshMainCharacters,
            sideCharacters: freshSideCharacters,
            modelConfig: deps.modelConfig,
            apiKeys: getCurrentApiKeys(deps),
            relationshipDynamics: genesisDynamicsProse,
        };
        const dayOneItinerary = await apiService.postToNarrativeArchitectDayOne(dayOnePayload);
        const processedItinerary = processItineraryPlaceholders(dayOneItinerary, deps.playerName);

        // [NEW] Extract dayCalendar from the NA response for Day 14+
        const dayCalendarForDay14 = (dayOneItinerary as any).dayCalendar ?? null;
        if (dayCalendarForDay14) {
            await persistenceService.savePipelineData(EOD_KEY_DAY_CALENDAR, dayCalendarForDay14);
            setters.setDayCalendar(dayCalendarForDay14);
            devLog("[Day 14+ Pipeline] New cycle calendar generated:", dayCalendarForDay14);
        }

        const playthroughSummaries = await getPlaythroughSummaries(deps);
        // [FIX] Sort by day structure order, then take first - works with any segment names/counts
        const morningSegmentPlan = getFirstSegmentByOrder(processedItinerary.segments, getDaySegmentsFromDeps(deps));
        if (!morningSegmentPlan) throw new Error("Missing first segment in Day 14+ itinerary.");
        
        const openingSceneResult = await geminiService.executeApiCallWithPolicy(
            'TransitionDirector',
            getCurrentModelConfig(deps),
            getCurrentApiKeys(deps),
            (cm, _ak) => transitionDirectorService.runTransitionDirector(
                getCurrentApiKeys(deps), cm as GeminiModel, deps.language, '', '', '',
                morningSegmentPlan,
                deps.psychologicalProfiles,
                genesisDynamicsProse,
                genesisLikes || {},
                deps.characterChronicles,
                deps.characterBiographies,
                deps.playerName,
                {}, // likes/dislikes now come from Character Developer genesis step
                deps.evolvingPersonas,
                finalTraitsDay14 || null, // [NEW]
                deps.affection,
                deps.playerPsychoanalysisProse,
                deps.playerBackstory,
                deps.mainCharacters, deps.sideCharacters,
                deps.fullHistory,
                deps.novelChapters || [],
                playthroughSummaries,
                deps.currentDay,
                morningSegmentPlan,
                getCurrentModelConfig(deps),
                getCurrentApiKeys(deps),
                // No cache rebuild fields needed - new playthrough doesn't use EOD cache
                [], [], [], null,
                dayCalendarForDay14, // [NEW] Weather/calendar for TD (from NA response)
                undefined // No segment just ended - this is a new playthrough
            )
        );
        setters.updateStats(openingSceneResult.inputTokens, openingSceneResult.outputTokens);
        // FIX: Corrected typo `result.data` to `openingSceneResult.data`.
        const openingSceneData = openingSceneResult.data;

        // [DEV] Log TD compliance checks and thought summary for developer inspection
        if (openingSceneData?.pre_generation_compliance) {
            logTDComplianceReport(openingSceneData.pre_generation_compliance, openingSceneData.thought_summary);
        }

        setters.setFullItinerary([processedItinerary]);
        setters.setSceneMentalModel(openingSceneData.scene_mental_model);
        // Do not wipe pipelineData; we still need genesis caches (traits/likes/dynamics) for exports.
        await persistenceService.clearPipelineStepsAndErrors();

        setters.setIsAnalyzing(false);
        setters.setGameState('playing');
        if (setters.handlersRef.current?.processSceneResponse) {
             setters.handlersRef.current.processSceneResponse(openingSceneData.opening_scene, {delayCharacterAndDialogue: true});
        } else { console.error("processSceneResponse not ready.")};

    } catch (error: any) {
        console.error(`Error starting next playthrough:`, error);
        setters.setIsAnalyzing(false);
        setters.setError(`An error occurred while preparing your next playthrough: ${error.message}`);
        setters.setIsGameCompleted(true);
    }
};

async function executeNewGameResetStep(deps: GameFlowDeps, setters: Setters, currentStep: NewGameStep, name: string, lang: string): Promise<boolean> {
    const completeStep = NewGameStep.RESET_STATE_COMPLETE;
    if (currentStep >= completeStep) { devLog("Skipping completed step: RESET_STATE_COMPLETE"); return true; }
    setters.setNewGameStep(NewGameStep.NOT_STARTED); setters.setLoadingMessage('Initializing...'); devLog("Executing step: RESET_STATE_COMPLETE");
    try {
        await setters.resetGameState(name, lang, false);
        // [IMPORT GUARD] Check session before persisting - abort if import happened
        if (deps.shouldContinue && !deps.shouldContinue()) { devLog("[NewGame Reset] Session invalidated - skipping persistence"); return false; }
        await persistenceService.savePipelineData(NEW_GAME_KEY_PLAYER_NAME, name);
        await persistenceService.saveCurrentNewGameStep(completeStep); setters.setNewGameStep(completeStep); return true;
    } catch (e: any) { console.error(`Error during New Game Reset Step:`, e); await updateAndSaveNewGameError(setters, NewGameStep.NOT_STARTED, e.message || 'State reset failed'); return false; }
}

async function executeUiTranslationStep(deps: GameFlowDeps, setters: Setters, currentStep: NewGameStep, lang: string, overrideModel?: AiModelId): Promise<boolean> {
    const startStep = NewGameStep.UI_TRANSLATION_START; const completeStep = NewGameStep.UI_TRANSLATION_COMPLETE; const isTranslationNeeded = lang.toLowerCase() !== 'english';
    if (currentStep >= completeStep) { devLog("Skipping completed step: UI_TRANSLATION_COMPLETE"); return true; }
    if (!isTranslationNeeded) { await persistenceService.saveCurrentNewGameStep(completeStep); setters.setNewGameStep(completeStep); devLog("Step Skipped (Not Needed): UI_TRANSLATION_COMPLETE"); return true; }
    setters.setNewGameStep(startStep); setters.setLoadingMessage(`${deps.uiTranslations.translatingUI} ${lang}...`); devLog("Executing step: UI_TRANSLATION_START");
    const stepKey = `vn_new_game_pipeline_v6_${startStep}`;
    if (setters.startCountdown) setters.startCountdown(stepKey, 240, 'timeout');

    try {
        const result = await geminiService.executeApiCallWithPolicy(
            'Translator',
            getCurrentModelConfig(deps),
            getCurrentApiKeys(deps),
            async (cm, ak) => {
                // We pass the source English strings to the backend
                const providerId = cm.startsWith('gemini') ? 'gemini' : 'openrouter';
                const currentModelCfg = getCurrentModelConfig(deps);
                const payload = {
                    language: lang,
                    sourceStrings: deps.uiTranslations, // Or englishStrings from import if prefered source of truth
                    apiKeys: { ...getCurrentApiKeys(deps), [providerId]: ak },
                    modelConfig: { ...currentModelCfg, translator: cm }
                };
                const data = await apiService.postToTranslatorUi(payload);
                return { data, inputTokens: 0, outputTokens: 0 }; // Backend handles tokens, placeholder for now
            },
            overrideModel
        );
        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
        setters.updateStats(result.inputTokens, result.outputTokens);
        // [IMPORT GUARD] Check session before persisting - abort if import happened
        if (deps.shouldContinue && !deps.shouldContinue()) { devLog("[NewGame UITranslation] Session invalidated - skipping persistence"); return false; }
        await persistenceService.savePipelineData(NEW_GAME_KEY_UI_TRANSLATIONS, result.data);
        await persistenceService.saveCurrentNewGameStep(completeStep); setters.setNewGameStep(completeStep); devLog("Step Completed: UI_TRANSLATION_COMPLETE"); return true;
    } catch (e: any) {
        console.error(`Error during UI Translation Step:`, e);
        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
        if (e.message !== 'Extension context invalidated.') {
            await updateAndSaveNewGameError(setters, startStep, e.message || 'UI translation failed');
        } else {
            devWarn('Caught "Extension context invalidated". Suppressing error to allow auto-retry on reload.');
        }
        return false;
    }
}

async function executeFoundationGenerationStep(deps: GameFlowDeps, setters: Setters, currentStep: NewGameStep, overrideModel?: AiModelId): Promise<boolean> {
    const startStep = NewGameStep.FOUNDATION_GENERATION_START; const completeStep = NewGameStep.FOUNDATION_GENERATION_COMPLETE;
    if (currentStep >= completeStep) { devLog("Skipping completed step: FOUNDATION_GENERATION_COMPLETE"); return true; }
    setters.setNewGameStep(startStep); setters.setLoadingMessage(deps.uiTranslations.buildingNarrativeFoundation); devLog("Executing step: FOUNDATION_GENERATION_START");
    const stepKey = `vn_new_game_pipeline_v6_${startStep}`;
    if (setters.startCountdown) setters.startCountdown(stepKey, 240, 'timeout');

    try {
        // FIX: Fetch fresh config to ensure we use original characters, avoiding "dirty state" from previous runs.
        // The 'deps.mainCharacters' might still hold the state from the previous game session because
        // the 'resetGameState' update hasn't propagated to this closure yet.
        const gameConfig = await apiService.fetchGameConfig(STORY_NAME);
        const freshMainCharacters = gameConfig.characters.filter(c => c.type === 'main').map(c => ({ name: c.name }));
        const freshSideCharacters = gameConfig.characters.filter(c => c.type === 'side').map(c => ({ name: c.name }));

        // Get all available sprite sets for the new character creation
        // At game start, all sprites are available - use the static list directly
        const availableSetsString = genericSpriteSets
            .map(s => `- **${s.name}**: ${s.description}`)
            .join('\n');

        const payload = {
            story: { name: STORY_NAME },
            mainCharacters: freshMainCharacters,
            sideCharacters: freshSideCharacters,
            availableSetsString: availableSetsString,
            modelConfig: deps.modelConfig,
            apiKeys: getCurrentApiKeys(deps),
        };

        const initialFoundation = await apiService.postToNarrativeArchitectFoundation(payload);
        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
        
        await persistenceService.savePipelineData(NEW_GAME_KEY_FOUNDATION, initialFoundation);
        
        // [NEW] Extract and save the narrative-requested character for later integration
        const narrativeRequestedChar = (initialFoundation as any).narrative_requested_character;
        if (narrativeRequestedChar) {
            // Look up the sprite set to get the actual image URL
            const assignedSpriteName = narrativeRequestedChar.assigned_sprite_set;
            const spriteSet = assignedSpriteName ? findGenericSpriteSet(assignedSpriteName) : undefined;
            
            // [GENERATIVE SPRITES] Check if backend returned a generated sprite
            const generatedSprites = (initialFoundation as any).generated_sprites as Array<{
                character_name: string;
                data: string;
                mime: string;
                prompt: string;
            }> | undefined;
            const characterFirstName = narrativeRequestedChar.first_name;
            const generatedSpriteData = generatedSprites?.find(
                s => s.character_name.toLowerCase() === characterFirstName.toLowerCase()
            );
            
            // Determine the image source: generated sprite data URL > stock sprite > undefined
            let characterImage: string | undefined;
            let hasGeneratedSprite = false;
            let generatedPrompt: string | undefined;
            
            if (generatedSpriteData?.data && generatedSpriteData?.mime) {
                // Store the base64 data URL directly in character.image
                characterImage = `data:${generatedSpriteData.mime};base64,${generatedSpriteData.data}`;
                generatedPrompt = generatedSpriteData.prompt;
                hasGeneratedSprite = true;
                devLog(`[Foundation] Using generated sprite for ${characterFirstName} (data URL)`);
            } else if (spriteSet?.expressions?.neutral) {
                characterImage = spriteSet.expressions.neutral;
            }
            
            // Convert AI output format to CharacterConfig format
            const newCharConfig: CharacterConfig & { _assignedSpriteSetName?: string } = {
                name: characterFirstName,
                lastName: narrativeRequestedChar.last_name,
                role: narrativeRequestedChar.role,
                appearance: spriteSet?.description || narrativeRequestedChar.appearance,
                baseProfile: narrativeRequestedChar.base_profile,
                image: characterImage,
                color: narrativeRequestedChar.suggested_color || 'text-gray-200', // AI-suggested color
                spriteSets: [], // Empty array as per correct format
                _assignedSpriteSetName: hasGeneratedSprite ? undefined : assignedSpriteName, // Only set if using stock sprite
                generatedSpritePrompt: generatedPrompt,
            };
            await persistenceService.savePipelineData(NEW_GAME_KEY_FOUNDATION_NEW_CHARACTER, newCharConfig);
            devLog(`[Foundation] Created new side character: ${newCharConfig.name} ${newCharConfig.lastName} with sprite: ${hasGeneratedSprite ? 'GENERATED' : (assignedSpriteName || 'none')}`);
        }
        
        // [IMPORT GUARD] Check session before persisting step - abort if import happened
        if (deps.shouldContinue && !deps.shouldContinue()) { devLog("[NewGame Foundation] Session invalidated - skipping step persistence"); return false; }
        await persistenceService.saveCurrentNewGameStep(completeStep); setters.setNewGameStep(completeStep); devLog("Step Completed: FOUNDATION_GENERATION_COMPLETE"); return true;
    } catch (e: any) {
        console.error(`Error during Foundation Generation Step:`, e);
        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
        if (e.message !== 'Extension context invalidated.') {
            await updateAndSaveNewGameError(setters, startStep, e.message || 'Foundation generation failed');
        } else {
            devWarn('Caught "Extension context invalidated". Suppressing error to allow auto-retry on reload.');
        }
        return false;
    }
}

// [NEW] Relationship Dynamics Genesis Step (structured only)
async function executeRelationshipDynamicsGenesisStep(deps: GameFlowDeps, setters: Setters, currentStep: NewGameStep, overrideModel?: AiModelId): Promise<boolean> {
    const startStep = NewGameStep.RELATIONSHIP_DYNAMICS_GENERATION_START;
    const completeStep = NewGameStep.RELATIONSHIP_DYNAMICS_GENERATION_COMPLETE;
    if (currentStep >= completeStep) { devLog("Skipping completed step: RELATIONSHIP_DYNAMICS_GENERATION_COMPLETE"); return true; }
    setters.setNewGameStep(startStep);
    setters.setLoadingMessage((deps.uiTranslations as any)?.generatingRelationshipDynamics || "Generating initial relationship dynamics...");
    devLog("Executing step: RELATIONSHIP_DYNAMICS_GENERATION_START");
    const stepKey = `${NEW_GAME_PIPELINE_PREFIX}${startStep}`;
    // Match other steps: arm timeout countdown
    if (setters.startCountdown) setters.startCountdown(stepKey, 240, 'timeout');

    try {
        // Load foundation arcs
        const initialFoundation = await persistenceService.loadPipelineData<InitialStoryFoundation>(NEW_GAME_KEY_FOUNDATION);
        if (!initialFoundation) throw new Error("Missing foundation data for Relationship Dynamics generation.");

        // Fresh characters (including any foundation-created character)
        const gameConfig = await apiService.fetchGameConfig(STORY_NAME);
        const freshMainCharacters = gameConfig.characters.filter(c => c.type === 'main').map(c => ({ name: c.name }));
        const freshSideCharacters = await getNewGameSideCharacters(false);

        // All personas now use the single selected model
        const modelOverride = undefined;

        const raRequest = {
            language: deps.language,
            relationshipDynamics: null,
            relationshipDynamicsStructured: null,
            relationshipDynamicsStructuredTranslated: null,
            storyArcs: initialFoundation.story_arcs || [],
            isGenesis: true,
            psychologicalProfiles: null,
            fullHistory: [],
            novelChapters: [],
            currentDay: 1,
            currentSegment: 'Morning' as any,
            evolvingPersonas: null,
            characterTraits: null,
            playerPsychoanalysisProse: null,
            playerBackstory: null,
            mainCharacters: freshMainCharacters as any,
            sideCharacters: freshSideCharacters as any,
            playerName: deps.playerName,
            modelSelection: deps.modelConfig,
            apiKeys: getCurrentApiKeys(deps),
            storyName: STORY_NAME,
            playthroughSummaries: [],
        };

        const apiResult = await relationshipAnalystService.runRelationshipAnalyst({
            ...raRequest,
            overrideModel: modelOverride,
        });

        if (!apiResult.data?.updated_relationship_dynamics_structured || Object.keys(apiResult.data.updated_relationship_dynamics_structured).length === 0) {
            throw new Error("Relationship Analyst genesis returned no structured dynamics.");
        }

        // Save structured dynamics
        // [IMPORT GUARD] Check session before persisting - abort if import happened
        if (deps.shouldContinue && !deps.shouldContinue()) { devLog("[NewGame RelDynamics] Session invalidated - skipping persistence"); return false; }
        await persistenceService.savePipelineData(NEW_GAME_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED, apiResult.data.updated_relationship_dynamics_structured);
        if (setters.setRelationshipDynamicsStructured) {
            setters.setRelationshipDynamicsStructured(apiResult.data.updated_relationship_dynamics_structured);
        }
        await persistenceService.saveCurrentNewGameStep(completeStep); setters.setNewGameStep(completeStep); devLog("Step Completed: RELATIONSHIP_DYNAMICS_GENERATION_COMPLETE"); return true;
    } catch (e: any) {
        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null); // stop timeout timer on error
        console.error(`Error during Relationship Dynamics Genesis Step:`, e);
        if (e.message !== 'Extension context invalidated.') {
            await updateAndSaveNewGameError(setters, startStep, e.message || 'Relationship dynamics generation failed');
        } else {
            devWarn('Caught "Extension context invalidated". Suppressing error to allow auto-retry on reload.');
        }
        return false;
    }
}
// [NEW] Foundation Traits Step
async function executeFoundationTraitsStep(deps: GameFlowDeps, setters: Setters, currentStep: NewGameStep, name: string, overrideModel?: AiModelId): Promise<boolean> {
    const startStep = NewGameStep.FOUNDATION_TRAITS_GENERATION_START; 
    const completeStep = NewGameStep.FOUNDATION_TRAITS_GENERATION_COMPLETE;
    
    if (currentStep >= completeStep) { 
        devLog("Skipping completed step: FOUNDATION_TRAITS_GENERATION_COMPLETE"); 
        return true; 
    }

    setters.setNewGameStep(startStep); 
    setters.setLoadingMessage((deps.uiTranslations as any)?.definingCharacterTraits || "Defining character traits...");
    devLog("Executing step: FOUNDATION_TRAITS_GENERATION_START");
    
    const stepKey = `vn_new_game_pipeline_v6_${startStep}`;
    if (setters.startCountdown) setters.startCountdown(stepKey, 240, 'timeout');

    try {
        // Load the Foundation Data generated in the previous step
        const initialFoundation = await persistenceService.loadPipelineData<InitialStoryFoundation>(NEW_GAME_KEY_FOUNDATION);
        if (!initialFoundation) throw new Error("Missing foundation data for Traits generation.");

        // Use fresh characters (including any foundation-created character)
        const gameConfig = await apiService.fetchGameConfig(STORY_NAME);
        const freshMainCharacters = gameConfig.characters
            .filter(c => c.type === 'main')
            .map((c): CharacterConfig => ({
                ...c,
                baseProfile: (c as Partial<CharacterConfig>).baseProfile ?? 'Generated during gameplay.',
            }));
        const freshSideCharactersBase = gameConfig.characters
            .filter(c => c.type === 'side')
            .map((c): CharacterConfig => ({
                ...c,
                baseProfile: (c as Partial<CharacterConfig>).baseProfile ?? 'Generated during gameplay.',
            }));
        
        // Check for foundation-created character
        const foundationNewChar = await persistenceService.loadPipelineData<CharacterConfig>(NEW_GAME_KEY_FOUNDATION_NEW_CHARACTER);
        const freshSideCharacters = foundationNewChar && !freshSideCharactersBase.some(c => c.name === foundationNewChar.name)
            ? [...freshSideCharactersBase, foundationNewChar]
            : freshSideCharactersBase;

        const genesisDynamics = await persistenceService.loadPipelineData<any>(NEW_GAME_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED);
        const genesisDynamicsProse = structuredDynamicsToProse(genesisDynamics) || null;

        const apiResult = await geminiService.executeApiCallWithPolicy<CharacterDeveloperAnalysis>(
            'CharacterDeveloper',
            deps.modelConfig,
            getCurrentApiKeys(deps),
            (cm, _ak) => characterDeveloperService.runCharacterDeveloper(
                getCurrentApiKeys(deps), deps.modelConfig, STORY_NAME, 1,
                "The story begins.", // novelContext
                "No dialogue yet.", // transcript
                initialFoundation.story_arcs,
                null, // evolvingPersonas (null for Genesis)
                null, // traits (null for Genesis)
                {}, // likes/dislikes generated here for genesis
                freshMainCharacters,
                freshSideCharacters,
                [], // subplots
                {}, // chronicles
                {}, // biographies
                {}, // profiles
                genesisDynamicsProse, // relationship dynamics as prose for genesis prompt
                genesisDynamics ?? null, // relationship dynamics structured (for pairing-aware formatting)
                null, // player analysis
                null, // backstory
                {}, // fact sheet
                [], // schedule
                {}, // questions
                {}, // affection
                name,
                true, // [NEW] isGenesis = true
                cm // forceModel
            ),
            overrideModel
        );

        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
        setters.updateStats(apiResult.inputTokens, apiResult.outputTokens);
        
        // Extract from response (handle decoded_response wrapper and string bodies)
        const rawCd = apiResult.data as any;
        const { updates, updatedTraits, updatedLikes } = extractCdPayload(rawCd);

        // Derive traits/likes when model uses genesis-only schema
        const derived = deriveTraitsAndLikes(updates, freshMainCharacters);
        let traitsToPersist = updatedTraits || derived.traits || {};
        let likesToPersist = normalizeLikesDislikesShape(
            updatedLikes || derived.likes || {},
            freshMainCharacters
        );
        // Fallback: rebuild directly from character_updates if traits are empty
        const isEmptyTraits = !traitsToPersist || Object.values(traitsToPersist).every(arr => !Array.isArray(arr) || arr.length === 0);
        if (isEmptyTraits && Array.isArray(updates)) {
            const rebuilt: CharacterTraits = {};
            updates.forEach((cu: any) => {
                const nm = firstName(cu?.character_name);
                if (!nm) return;
                if (Array.isArray(cu.traits) && cu.traits.length) {
                    rebuilt[nm] = cu.traits;
                }
            });
            if (Object.keys(rebuilt).length > 0) {
                traitsToPersist = rebuilt;
            }
            // Rebuild likes if needed
            const rebuiltLikes: CharacterLikesDislikes = {};
            updates.forEach((cu: any) => {
                const nm = firstName(cu?.character_name);
                if (!nm) return;
                const ll = cu?.likes_dislikes;
                const likes = Array.isArray(ll?.likes) ? ll.likes : [];
                const dislikes = Array.isArray(ll?.dislikes) ? ll.dislikes : [];
                rebuiltLikes[nm] = { likes, dislikes };
            });
            likesToPersist = normalizeLikesDislikesShape(rebuiltLikes, freshMainCharacters);
        }

        // Save the Traits
        // [IMPORT GUARD] Check session before persisting - abort if import happened
        if (deps.shouldContinue && !deps.shouldContinue()) { devLog("[NewGame Traits] Session invalidated - skipping persistence"); return false; }
        await persistenceService.savePipelineData(NEW_GAME_KEY_INITIAL_TRAITS, traitsToPersist);
        // Also mirror into EOD cache immediately so exports before TD have traits
        await persistenceService.savePipelineData(EOD_KEY_CHARACTER_TRAITS, traitsToPersist);
        if (setters.setCharacterTraits) {
            setters.setCharacterTraits(traitsToPersist);
        }
        // Validate persistence immediately to surface silent failures
        const verifyTraits = await persistenceService.loadPipelineData<CharacterTraits | null>(NEW_GAME_KEY_INITIAL_TRAITS);
        if (!verifyTraits || Object.values(verifyTraits).every(arr => !arr || (Array.isArray(arr) && arr.length === 0))) {
            throw new Error("Traits persistence failed (empty after save).");
        }
        
        // Persist genesis likes/dislikes alongside foundation (normalized to include dislikes array)
        const normalizedGenesisLikes = likesToPersist;
        await persistenceService.savePipelineData(NEW_GAME_KEY_FOUNDATION, {
            ...initialFoundation,
            authentic_likes_dislikes: normalizedGenesisLikes,
            initial_traits: traitsToPersist, // fallback cache for traits
        } as any);
        // Mirror likes/dislikes into EOD cache immediately for early exports
        await persistenceService.savePipelineData(EOD_KEY_FINAL_LIKES_DISLIKES, normalizedGenesisLikes);
        if (setters.setCharacterLikesDislikes) {
            setters.setCharacterLikesDislikes(normalizedGenesisLikes);
        }

        await persistenceService.saveCurrentNewGameStep(completeStep);
        setters.setNewGameStep(completeStep);
        devLog("Step Completed: FOUNDATION_TRAITS_GENERATION_COMPLETE");
        return true;

    } catch (e: any) {
        console.error(`Error during Foundation Traits Step:`, e);
        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
        if (e.message !== 'Extension context invalidated.') {
            await updateAndSaveNewGameError(setters, startStep, e.message || 'Traits generation failed');
        }
        return false;
    }
}

async function executeDayOneItineraryStep(deps: GameFlowDeps, setters: Setters, currentStep: NewGameStep, name: string, overrideModel?: AiModelId): Promise<boolean> {
    const startStep = NewGameStep.DAY_ONE_ITINERARY_START; const completeStep = NewGameStep.DAY_ONE_ITINERARY_COMPLETE;
    if (currentStep >= completeStep) { devLog("Skipping completed step: DAY_ONE_ITINERARY_COMPLETE"); return true; }
    setters.setNewGameStep(startStep); setters.setLoadingMessage(deps.uiTranslations.planningNarrative); devLog("Executing step: DAY_ONE_ITINERARY_START");
    const stepKey = `vn_new_game_pipeline_v6_${startStep}`;
    if (setters.startCountdown) setters.startCountdown(stepKey, 240, 'timeout');

    try {
        const initialStoryFoundation = await persistenceService.loadPipelineData<InitialStoryFoundation>(NEW_GAME_KEY_FOUNDATION); if (!initialStoryFoundation) throw new Error("Missing foundation for Day One Itinerary.");

        // FIX: Fetch fresh config to ensure we use original characters (including foundation-created character)
        const gameConfig = await apiService.fetchGameConfig(STORY_NAME);
        const freshMainCharacters = gameConfig.characters.filter(c => c.type === 'main').map(c => ({ name: c.name }));
        const freshSideCharacters = await getNewGameSideCharacters(false);

        const payload = {
            story: { name: STORY_NAME },
            playerName: name,
            foundationData: initialStoryFoundation,
            mainCharacters: freshMainCharacters,
            sideCharacters: freshSideCharacters,
            modelConfig: deps.modelConfig,
            apiKeys: getCurrentApiKeys(deps),
        };

        const rawResponse = await apiService.postToNarrativeArchitectDayOne(payload);
        const dayOneItinerary = stripStoryArcsFromItinerary(rawResponse);
        
        // Extract and save dayCalendar for Day 1
        const dayCalendar = (rawResponse as any).dayCalendar ?? null;
        if (dayCalendar) {
            await persistenceService.savePipelineData(NEW_GAME_KEY_DAY_CALENDAR, dayCalendar);
            setters.setDayCalendar(dayCalendar);
            devLog("[New Game Pipeline] Day 1 calendar generated:", dayCalendar);
        }
        
        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
        // [IMPORT GUARD] Check session before persisting - abort if import happened
        if (deps.shouldContinue && !deps.shouldContinue()) { devLog("[NewGame Itinerary] Session invalidated - skipping persistence"); return false; }
        await persistenceService.savePipelineData(NEW_GAME_KEY_DAY_ONE_ITINERARY, dayOneItinerary);
        await persistenceService.saveCurrentNewGameStep(completeStep); setters.setNewGameStep(completeStep); devLog("Step Completed: DAY_ONE_ITINERARY_COMPLETE"); return true;
    } catch (e: any) {
        console.error(`Error during Day One Itinerary Step:`, e);
        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
        if (e.message !== 'Extension context invalidated.') {
            await updateAndSaveNewGameError(setters, startStep, e.message || 'Itinerary planning failed');
        } else {
            devWarn('Caught "Extension context invalidated". Suppressing error to allow auto-retry on reload.');
        }
        return false;
    }
}

// [OBSOLETE] Itinerary translation step - itinerary is never shown to players
// This step is kept as a no-op to maintain pipeline step ordering; original implementation in git history
async function executeItineraryTranslationStep(deps: GameFlowDeps, setters: Setters, currentStep: NewGameStep, name: string, lang: string, overrideModel?: AiModelId): Promise<boolean> {
    const completeStep = NewGameStep.ITINERARY_TRANSLATION_COMPLETE;
    if (currentStep >= completeStep) return true;
    // [IMPORT GUARD] Check session before persisting - abort if import happened
    if (deps.shouldContinue && !deps.shouldContinue()) { devLog("[NewGame ItinTrans] Session invalidated - skipping persistence"); return false; }
    await persistenceService.saveCurrentNewGameStep(completeStep);
    setters.setNewGameStep(completeStep);
    return true;
}

async function executeFirstSceneStep(deps: GameFlowDeps, setters: Setters, currentStep: NewGameStep, name: string, lang: string, overrideModel?: AiModelId): Promise<boolean> {
    const startStep = NewGameStep.FIRST_SCENE_START; const completeStep = NewGameStep.FIRST_SCENE_COMPLETE;
    if (currentStep >= completeStep) { devLog("Skipping completed step: FIRST_SCENE_COMPLETE"); return true; }
    setters.setNewGameStep(startStep); setters.setLoadingMessage(deps.uiTranslations.settingFirstScene); devLog("Executing step: FIRST_SCENE_START");
    const stepKey = `vn_new_game_pipeline_v6_${startStep}`;
    if (setters.startCountdown) setters.startCountdown(stepKey, 240, 'timeout');

    try {
        const initialStoryFoundation = await persistenceService.loadPipelineData<InitialStoryFoundation>(NEW_GAME_KEY_FOUNDATION); if (!initialStoryFoundation) throw new Error("Missing foundation for first scene.");
        const genesisDynamics = await persistenceService.loadPipelineData<any>(NEW_GAME_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED);
        const genesisDynamicsProse = structuredDynamicsToProse(genesisDynamics) || 'No dynamics established yet.';
        const genesisLikes = (initialStoryFoundation as any).authentic_likes_dislikes || {};
        const dayOneItinerary = await persistenceService.loadPipelineData<DailyItinerary>(NEW_GAME_KEY_DAY_ONE_ITINERARY); if (!dayOneItinerary) throw new Error("Missing itinerary for first scene.");
        const processedItinerary = processItineraryPlaceholders(stripStoryArcsFromItinerary(dayOneItinerary), name);
        if (!processedItinerary?.segments || processedItinerary.segments.length === 0) {
            throw new Error("Itinerary has no segments for first scene.");
        }
        // [FIX] Sort by day structure order, then take first - works with any segment names/counts
        const firstSegmentPlan = getFirstSegmentByOrder(processedItinerary.segments, getDaySegmentsFromDeps(deps));
        if (!firstSegmentPlan) throw new Error("Missing first segment for first scene.");
        
        // FIX: Fetch fresh config to ensure we use original characters (including foundation-created character)
        const gameConfig = await apiService.fetchGameConfig(STORY_NAME);
        const freshMainCharacters = gameConfig.characters
            .filter(c => c.type === 'main')
            .map(c => ({ ...c, baseProfile: 'Generated during gameplay.' }));
        const freshSideCharactersBase = gameConfig.characters
            .filter(c => c.type === 'side')
            .map(c => ({ ...c, baseProfile: 'Generated during gameplay.' }));
        
        // Check for foundation-created character
        const foundationNewChar = await persistenceService.loadPipelineData<CharacterConfig>(NEW_GAME_KEY_FOUNDATION_NEW_CHARACTER);
        const freshSideCharacters = foundationNewChar && !freshSideCharactersBase.some(c => c.name === foundationNewChar.name)
            ? [...freshSideCharactersBase, foundationNewChar]
            : freshSideCharactersBase;

        const initialTraits = await persistenceService.loadPipelineData<CharacterTraits>(NEW_GAME_KEY_INITIAL_TRAITS); // [NEW]
        if (initialTraits && setters.setCharacterTraits) {
            setters.setCharacterTraits(initialTraits);
        }

        // [NEW] Load dayCalendar generated by Day 1 itinerary step
        const dayCalendarForNewGame = await persistenceService.loadPipelineData<import('../types').DayCalendar | null>(NEW_GAME_KEY_DAY_CALENDAR) ?? null;

        const initialAffection = Object.fromEntries(freshMainCharacters.map(c => [c.name, 1]));
        
        const result = await geminiService.executeApiCallWithPolicy(
            'TransitionDirector',
            getCurrentModelConfig(deps),
            getCurrentApiKeys(deps),
            (cm, _ak) => transitionDirectorService.runTransitionDirector(
                getCurrentApiKeys(deps),
                cm as GeminiModel,
                lang,
                '',
                '',
                '',
                firstSegmentPlan,
                null,
                genesisDynamicsProse,
                genesisLikes || {},
                {},
                {},
                name,
                genesisLikes || {},
                null,
                initialTraits || null,
                initialAffection,
                null,
                null,
                freshMainCharacters,
                freshSideCharacters,
                deps.fullHistory,
                deps.novelChapters || [],
                [],
                deps.currentDay,
                firstSegmentPlan,
                getCurrentModelConfig(deps),
                getCurrentApiKeys(deps),
                // [CACHE REBUILD] Additional fields for cache rebuilding
                initialStoryFoundation?.story_arcs || [],
                [], // subplots - empty for new game (not in InitialStoryFoundation)
                [], // scheduledEvents - empty for new game
                null, // unaskedQuestions - null for new game
                dayCalendarForNewGame, // [NEW] Weather/calendar for TD
                undefined
            ),
            overrideModel
        );
        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
        setters.updateStats(result.inputTokens, result.outputTokens);

        // [DEV] Log TD compliance checks and thought summary for developer inspection
        if (result.data?.pre_generation_compliance) {
            logTDComplianceReport(result.data.pre_generation_compliance, result.data.thought_summary);
        }

        // Keep relationship dynamics (prose and structured) available beyond this step
        if (setters.setRelationshipDynamics) {
            setters.setRelationshipDynamics(genesisDynamicsProse || null);
        }
        // [IMPORT GUARD] Check session before persisting - abort if import happened
        if (deps.shouldContinue && !deps.shouldContinue()) { devLog("[NewGame FirstScene] Session invalidated - skipping persistence"); return false; }
        await persistenceService.savePipelineData(EOD_KEY_RELATIONSHIP_DYNAMICS, genesisDynamicsProse || null);
        await persistenceService.savePipelineData(NEW_GAME_KEY_OPENING_SCENE, result.data);
        // Promote arcs/likes/traits into shared caches so exports during/after TD have them
        const normalizedFoundationArcs = normalizeArcsWithBeatIds(initialStoryFoundation.story_arcs || []);
        await persistenceService.savePipelineData(EOD_KEY_FINAL_STORY_ARCS, normalizedFoundationArcs);
        if (initialTraits) {
            await persistenceService.savePipelineData(EOD_KEY_CHARACTER_TRAITS, initialTraits);
        }
        if (genesisLikes) {
            await persistenceService.savePipelineData(EOD_KEY_FINAL_LIKES_DISLIKES, genesisLikes);
        }
        // Also promote structured dynamics to EOD cache
        await persistenceService.savePipelineData(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED, genesisDynamics || null);
        await persistenceService.saveCurrentNewGameStep(completeStep); setters.setNewGameStep(completeStep); devLog("Step Completed: FIRST_SCENE_COMPLETE"); return true;
    } catch (e: any) {
        console.error(`Error during First Scene Step:`, e);
        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
        if (e.message !== 'Extension context invalidated.') {
            await updateAndSaveNewGameError(setters, startStep, e.message || 'First scene generation failed');
        } else {
            devWarn('Caught "Extension context invalidated". Suppressing error to allow auto-retry on reload.');
        }
        return false;
    }
}

async function executeNewGameFinalSaveStep(deps: GameFlowDeps, setters: Setters, currentStep: NewGameStep, name: string): Promise<boolean> {
    const startStep = NewGameStep.FINAL_STATE_SAVE_START; const completeStep = NewGameStep.FINAL_STATE_SAVE_COMPLETE;
    if (currentStep >= completeStep) { devLog("Skipping completed step: FINAL_STATE_SAVE_COMPLETE"); return true; }
    setters.setNewGameStep(startStep); setters.setLoadingMessage('Finalizing...'); devLog("Executing step: FINAL_STATE_SAVE_START");
    try {
        const finalUiTranslations = await persistenceService.loadPipelineData<TranslationSet>(NEW_GAME_KEY_UI_TRANSLATIONS);
        const finalInitialStoryFoundation = await persistenceService.loadPipelineData<InitialStoryFoundation>(NEW_GAME_KEY_FOUNDATION); if (!finalInitialStoryFoundation) throw new Error("Missing foundation.");
        const finalDayOneItinerary = await persistenceService.loadPipelineData<DailyItinerary>(NEW_GAME_KEY_DAY_ONE_ITINERARY); if (!finalDayOneItinerary) throw new Error("Missing itinerary.");
        const finalTranslatedItinerary = await persistenceService.loadPipelineData<DailyItinerary>(NEW_GAME_KEY_DAY_ONE_ITINERARY_TRANSLATED);
        const finalOpeningSceneData = await persistenceService.loadPipelineData<TransitionDirectorResponse>(NEW_GAME_KEY_OPENING_SCENE); if (!finalOpeningSceneData) throw new Error("Missing opening scene.");
        const finalTraits = await persistenceService.loadPipelineData<CharacterTraits>(NEW_GAME_KEY_INITIAL_TRAITS); // [NEW]

        // [GENERATIVE IMAGES] Store any generated background in IndexedDB
        const enableGenerativeImages = getCurrentModelConfig(deps)?.enableGenerativeImages;
        if (enableGenerativeImages && finalOpeningSceneData.generated_background) {
            devLog('[FinalSave] Processing generated background from opening scene...');
            const dayStructure = getDaySegmentsFromDeps(deps);
            const firstSegment = getFirstSegmentByOrder(finalDayOneItinerary.segments, dayStructure)?.segment || dayStructure[0];
            await handleGeneratedAssets(finalOpeningSceneData, firstSegment, true);
        }

        const finalProcessedItinerary = processItineraryPlaceholders(finalDayOneItinerary, name);
        const finalProcessedTranslated = finalTranslatedItinerary ? processItineraryPlaceholders(finalTranslatedItinerary, name) : undefined;

        // [IMPORT GUARD] Check session before persisting - abort if import happened
        if (deps.shouldContinue && !deps.shouldContinue()) { devLog("[NewGame FinalSave] Session invalidated - skipping persistence"); return false; }
        if (finalUiTranslations) setters.setUiTranslations(finalUiTranslations);
        const finalDynamics = await persistenceService.loadPipelineData<any>(NEW_GAME_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED);
        const finalLikes = (finalInitialStoryFoundation as any).authentic_likes_dislikes || {};
        setters.setCharacterLikesDislikes(finalLikes);
        if (setters.setRelationshipDynamicsStructured) {
            setters.setRelationshipDynamicsStructured(finalDynamics || null);
        }
        if (setters.setRelationshipDynamics) {
            const finalDynamicsProse = structuredDynamicsToProse(finalDynamics) || 'No dynamics established yet.';
            setters.setRelationshipDynamics(finalDynamicsProse);
            await persistenceService.savePipelineData(EOD_KEY_RELATIONSHIP_DYNAMICS, finalDynamicsProse);
        }
        // Promote structured dynamics into the shared EOD cache so they persist beyond pipeline cleanup.
        await persistenceService.savePipelineData(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED, finalDynamics || null);
        
        // [NEW] Integrate the narrative-requested character into side characters
        const foundationNewChar = await persistenceService.loadPipelineData<CharacterConfig>(NEW_GAME_KEY_FOUNDATION_NEW_CHARACTER);
        if (foundationNewChar) {
            setters.setSideCharacters(prev => {
                // Avoid duplicates by checking if character already exists
                if (prev.some(c => c.name === foundationNewChar.name)) {
                    devLog(`[FinalSave] Character ${foundationNewChar.name} already in side characters, skipping.`);
                    return prev;
                }
                devLog(`[FinalSave] Adding new side character: ${foundationNewChar.name} ${foundationNewChar.lastName || ''}`);
                return [...prev, foundationNewChar];
            });
            // Also remove the used sprite from available generic sprites
            const usedSprite = (foundationNewChar as any)._assignedSpriteSetName;
            if (usedSprite) {
                setters.setAvailableGenericSetNames(prev => prev.filter(s => s !== usedSprite));
                devLog(`[FinalSave] Removed sprite '${usedSprite}' from available pool.`);
            }
        }
        
        // [FIX] Normalize arcs to ensure ownerId is properly mapped
        setters.setStoryArcs(normalizeArcsWithBeatIds(finalInitialStoryFoundation.story_arcs)); setters.setFullItinerary([finalProcessedItinerary]);
        if (finalTraits) setters.setCharacterTraits(finalTraits); // [NEW]
        if (finalProcessedTranslated) setters.setFullItineraryTranslated([finalProcessedTranslated]);
        setters.setSceneMentalModel(finalOpeningSceneData.scene_mental_model);
        // [GENERATIVE IMAGES] Store full TransitionDirectorResponse so handleProceedAfterPipeline can access generated_background
        setters.setOpeningSceneCache(finalOpeningSceneData as any);

        await persistenceService.saveCurrentNewGameStep(completeStep); setters.setNewGameStep(completeStep); devLog("Step Completed: FINAL_STATE_SAVE_COMPLETE");
        setters.setIsPipelineCompleteAndReady(true);
        return true;
    } catch (e: any) { console.error("Error during final state update/save:", e); await updateAndSaveNewGameError(setters, startStep, e.message || 'Final save failed'); return false; }
}

export async function handleNameConfirm(name: string, lang: string, deps: GameFlowDeps, setters: Setters, overrideModel?: AiModelId) {
    if (isProcessingRef.current) { return; }
    isProcessingRef.current = true;
    let currentStep = await persistenceService.loadCurrentNewGameStep();
    const currentErrors = await persistenceService.loadNewGameErrors() || {}; setters.setNewGameErrors(currentErrors);
    setters.setIsLoading(true); setters.setError(null); setters.setIsUnrecoverableError(false);
    const stepToRetry = Object.keys(currentErrors)[0]; if (stepToRetry || currentStep === NewGameStep.NOT_STARTED) {
        await persistenceService.saveNewGameErrors({});
        setters.setNewGameErrors({});
    }
    devLog(`Starting/Resuming New Game sequence at step: ${NewGameStep[currentStep]}`);
    
    // Helper to check if pipeline should abort (import happened)
    const shouldAbort = () => deps.shouldContinue && !deps.shouldContinue();

    if (currentStep < NewGameStep.RESET_STATE_COMPLETE) {
        if (!await executeNewGameResetStep(deps, setters, currentStep, name, lang)) { isProcessingRef.current = false; setters.setIsLoading(false); return; }
        if (shouldAbort()) { devLog("[NewGame] Pipeline aborted - import detected."); isProcessingRef.current = false; return; }
        currentStep = await persistenceService.loadCurrentNewGameStep();
    }
    if (currentStep < NewGameStep.UI_TRANSLATION_COMPLETE) {
        if (!await executeUiTranslationStep(deps, setters, currentStep, lang, overrideModel)) { isProcessingRef.current = false; setters.setIsLoading(false); return; }
        if (shouldAbort()) { devLog("[NewGame] Pipeline aborted - import detected."); isProcessingRef.current = false; return; }
        currentStep = await persistenceService.loadCurrentNewGameStep();
    }
    if (currentStep < NewGameStep.FOUNDATION_GENERATION_COMPLETE) {
        if (!await executeFoundationGenerationStep(deps, setters, currentStep, overrideModel)) { isProcessingRef.current = false; setters.setIsLoading(false); return; }
        if (shouldAbort()) { devLog("[NewGame] Pipeline aborted - import detected."); isProcessingRef.current = false; return; }
        currentStep = await persistenceService.loadCurrentNewGameStep();
    }
    if (currentStep < NewGameStep.RELATIONSHIP_DYNAMICS_GENERATION_COMPLETE) {
        if (!await executeRelationshipDynamicsGenesisStep(deps, setters, currentStep, overrideModel)) { isProcessingRef.current = false; setters.setIsLoading(false); return; }
        if (shouldAbort()) { devLog("[NewGame] Pipeline aborted - import detected."); isProcessingRef.current = false; return; }
        currentStep = await persistenceService.loadCurrentNewGameStep();
    }
    // Traits Step
    if (currentStep < NewGameStep.FOUNDATION_TRAITS_GENERATION_COMPLETE) {
        if (!await executeFoundationTraitsStep(deps, setters, currentStep, name, overrideModel)) { isProcessingRef.current = false; setters.setIsLoading(false); return; }
        if (shouldAbort()) { devLog("[NewGame] Pipeline aborted - import detected."); isProcessingRef.current = false; return; }
        currentStep = await persistenceService.loadCurrentNewGameStep();
    }
    if (currentStep < NewGameStep.DAY_ONE_ITINERARY_COMPLETE) {
        if (!await executeDayOneItineraryStep(deps, setters, currentStep, name, overrideModel)) { isProcessingRef.current = false; setters.setIsLoading(false); return; }
        if (shouldAbort()) { devLog("[NewGame] Pipeline aborted - import detected."); isProcessingRef.current = false; return; }
        currentStep = await persistenceService.loadCurrentNewGameStep();
    }
    if (currentStep < NewGameStep.ITINERARY_TRANSLATION_COMPLETE) {
        if (!await executeItineraryTranslationStep(deps, setters, currentStep, name, lang, overrideModel)) { isProcessingRef.current = false; setters.setIsLoading(false); return; }
        if (shouldAbort()) { devLog("[NewGame] Pipeline aborted - import detected."); isProcessingRef.current = false; return; }
        currentStep = await persistenceService.loadCurrentNewGameStep();
    }
    if (currentStep < NewGameStep.FIRST_SCENE_COMPLETE) {
        if (!await executeFirstSceneStep(deps, setters, currentStep, name, lang, overrideModel)) { isProcessingRef.current = false; setters.setIsLoading(false); return; }
        if (shouldAbort()) { devLog("[NewGame] Pipeline aborted - import detected."); isProcessingRef.current = false; return; }
        currentStep = await persistenceService.loadCurrentNewGameStep();
    }
    if (currentStep < NewGameStep.FINAL_STATE_SAVE_COMPLETE) {
        if (!await executeNewGameFinalSaveStep(deps, setters, currentStep, name)) { isProcessingRef.current = false; setters.setIsLoading(false); return; }
        currentStep = await persistenceService.loadCurrentNewGameStep();
    }

    if (currentStep === NewGameStep.FINAL_STATE_SAVE_COMPLETE) {
        setters.setIsLoading(false);
        isProcessingRef.current = false;
        devLog("New Game sequence complete.");
        setters.setIsPipelineCompleteAndReady(true);
    } else {
        setters.setIsLoading(false);
        isProcessingRef.current = false;
        console.error("New game sequence halted unexpectedly.");
    }
}

async function executeSegmentArchiveStep(deps: GameFlowDeps, setters: Setters, currentStep: SegmentTransitionStep): Promise<boolean> {
    const completeStep = SegmentTransitionStep.ANALYSIS_START; if (currentStep >= completeStep) { devLog("Skipping completed step: Segment Archive"); return true; }
    setters.setSegmentTransitionStep(SegmentTransitionStep.NOT_STARTED); devLog("Executing step: Segment Archive");
    try {
        const updatedFullHistory = [...deps.fullHistory]; const dayIndex = updatedFullHistory.findIndex(d => d.day === deps.currentDay); const segmentToArchive: SegmentLog = { segment: deps.currentSegment, dialogue: deps.history };
        if (dayIndex !== -1) { const existingSegmentIdx = updatedFullHistory[dayIndex].segments.findIndex(s => s.segment === deps.currentSegment); if (existingSegmentIdx !== -1) updatedFullHistory[dayIndex].segments[existingSegmentIdx] = segmentToArchive; else updatedFullHistory[dayIndex].segments.push(segmentToArchive); } else { updatedFullHistory.push({ day: deps.currentDay, segments: [segmentToArchive] }); }
        // [IMPORT GUARD] Check session before persisting - abort if import happened mid-step
        if (deps.shouldContinue && !deps.shouldContinue()) { devLog("[SegmentArchive] Session invalidated - skipping persistence"); return false; }
        await persistenceService.savePipelineData(SEGMENT_KEY_UPDATED_FULL_HISTORY, updatedFullHistory);
        await persistenceService.saveCurrentSegmentTransitionStep(completeStep); setters.setSegmentTransitionStep(completeStep); devLog("Step Completed: Segment Archive (marked as ANALYSIS_START)"); return true;
    } catch (e: any) { console.error(`Error during Segment Archive Step:`, e); await updateAndSaveSegmentError(setters, SegmentTransitionStep.NOT_STARTED, e.message || 'Segment archiving failed'); return false; }
}

async function executeSegmentAnalysisStep(deps: GameFlowDeps, setters: Setters, currentStep: SegmentTransitionStep, overrideModel?: AiModelId): Promise<boolean> {
    const startStep = SegmentTransitionStep.ANALYSIS_START; const completeStep = SegmentTransitionStep.ANALYSIS_COMPLETE; if (currentStep >= completeStep) { devLog("Skipping completed step: ANALYSIS_COMPLETE"); return true; }
    setters.setSegmentTransitionStep(startStep); devLog("Executing step: ANALYSIS_START");
    const stepKey = `${SEGMENT_PIPELINE_PREFIX}${startStep}`;
    if (setters.startCountdown) setters.startCountdown(stepKey, 240, 'timeout');

    try {
        const updatedFullHistory = await persistenceService.loadPipelineData<DayLog[]>(SEGMENT_KEY_UPDATED_FULL_HISTORY); if(!updatedFullHistory) throw new Error("Missing updated full history for segment analysis.");
        const dayLogForToday = updatedFullHistory.find(d => d.day === deps.currentDay);
        if (!dayLogForToday) throw new Error(`Could not find day log for Day ${deps.currentDay} during segment analysis.`);
        
        const playthroughSummaries = await getPlaythroughSummaries(deps);
        // Intra-day segment transition - use deps directly (no EOD pipeline data exists yet)
        const segmentRelationshipDynamics = deps.relationshipDynamics ?? '';
        const segmentRelationshipDynamicsStructured = deps.relationshipDynamicsStructured ?? null;
        const segmentRelationshipDynamicsStructuredTranslated = deps.relationshipDynamicsStructuredTranslated ?? null;
        const segmentProfilesForApi = deps.psychologicalProfiles ?? {} as PsychologicalProfiles;

        // Validate data exists - except on day 1's first segment where RA generates them
        // Use dynamic day structure for first segment check - NO FALLBACK
        const activeDayStructure = getDaySegmentsFromDeps(deps);
        const isFirstSegmentOfDay1 = deps.currentDay === 1 && deps.currentSegment === activeDayStructure[0];
        if (!segmentProfilesForApi || Object.keys(segmentProfilesForApi).length === 0) {
            if (!isFirstSegmentOfDay1) {
                throw new Error("Missing psychological profiles for segment analysis.");
            }
        }
        if (!segmentRelationshipDynamics) {
            if (!isFirstSegmentOfDay1) {
                throw new Error("Missing relationship dynamics for segment analysis.");
            }
        }

        const result = await geminiService.executeApiCallWithPolicy(
            'RelationshipAnalyst',
            getCurrentModelConfig(deps),
            getCurrentApiKeys(deps),
            (cm, ak) => relationshipAnalystService.runRelationshipAnalyst({
                language: deps.language,
                relationshipDynamics: segmentRelationshipDynamics,
                relationshipDynamicsStructured: segmentRelationshipDynamicsStructured ?? null,
                relationshipDynamicsStructuredTranslated: segmentRelationshipDynamicsStructuredTranslated ?? null,
                psychologicalProfiles: segmentProfilesForApi as PsychologicalProfiles,
                fullHistory: updatedFullHistory,
                novelChapters: deps.novelChapters,
                currentDay: deps.currentDay,
                currentSegment: deps.currentSegment,
                evolvingPersonas: deps.evolvingPersonas,
                characterTraits: deps.characterTraits,
                // [FIX] Include missing context fields for intraday segment analysis
                characterLikesDislikes: deps.characterLikesDislikes,
                characterChronicles: deps.characterChronicles ?? {},
                characterBiographies: deps.characterBiographies ?? {},
                storyArcs: deps.storyArcs ?? [],
                subplots: deps.subplots ?? [],
                factSheet: deps.factSheet ?? {},
                playerPsychoanalysisProse: deps.playerPsychoanalysisProse,
                playerBackstory: deps.playerBackstory,
                mainCharacters: deps.mainCharacters,
                sideCharacters: deps.sideCharacters,
                playerName: deps.playerName,
                modelSelection: getCurrentModelConfig(deps),
                apiKeys: getCurrentApiKeys(deps),
                playthroughSummaries,
                storyName: STORY_NAME,
                overrideModel: cm as GeminiModel
            }),
            overrideModel
        );
        
        const normalizedStructured = canonicalizeStructuredDynamics(
            result.data?.updated_relationship_dynamics_structured,
            deps.playerName
        );
        const normalizedStructuredTranslated = canonicalizeStructuredDynamics(
            result.data?.updated_relationship_dynamics_structured_translated,
            deps.playerName
        );
        const normalizedAnalystData = {
            ...result.data,
            updated_relationship_dynamics_structured: normalizedStructured,
            updated_relationship_dynamics_structured_translated: normalizedStructuredTranslated,
        };
        
        setters.updateStats(result.inputTokens, result.outputTokens);
        await persistenceService.savePipelineData(SEGMENT_KEY_ANALYST_DATA, normalizedAnalystData);
        if (!normalizedStructured || Object.keys(normalizedStructured).length === 0) {
            throw new Error("Relationship Analyst (segment) returned no structured relationship dynamics.");
        }

        // Merge and persist profiles immediately to Dexie for downstream steps/retries
        // [FIX] Load from Dexie first (consistent with translated profiles), fall back to deps
        const baselineProfiles = await persistenceService.loadPipelineData<PsychologicalProfiles>(EOD_KEY_MERGED_PROFILES) ?? segmentProfilesForApi ?? {};
        const profilesObject = convertProfilesArrayToObject(normalizedAnalystData.updated_character_profiles);
        const mergedProfiles = { ...baselineProfiles, ...profilesObject } as PsychologicalProfiles;
        await persistenceService.savePipelineData(EOD_KEY_MERGED_PROFILES, mergedProfiles);
        setters.setPsychologicalProfiles(mergedProfiles);

        if (normalizedAnalystData.updated_character_profiles_translated) {
            const baselineProfilesTranslated = await persistenceService.loadPipelineData<PsychologicalProfiles>(EOD_KEY_MERGED_PROFILES_TRANSLATED) ?? {};
            const translatedProfilesObject = convertProfilesArrayToObject(normalizedAnalystData.updated_character_profiles_translated);
            const mergedTranslatedProfiles = { ...baselineProfilesTranslated, ...translatedProfilesObject } as PsychologicalProfiles;
            await persistenceService.savePipelineData(EOD_KEY_MERGED_PROFILES_TRANSLATED, mergedTranslatedProfiles);
            setters.setPsychologicalProfilesTranslated(mergedTranslatedProfiles);
        }
        // NOTE: No else branch - preserve existing translated profiles when RA doesn't update any

        // Persist updated relationship dynamics for downstream steps/retries
        await persistenceService.savePipelineData(EOD_KEY_RELATIONSHIP_ANALYST_RAW, normalizedAnalystData);
        await persistenceService.savePipelineData(EOD_KEY_RELATIONSHIP_DYNAMICS, normalizedAnalystData.updated_relationship_dynamics);
        await persistenceService.savePipelineData(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED, normalizedStructured);
        await persistenceService.savePipelineData(
            EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED_TRANSLATED,
            normalizedStructuredTranslated
        );
        if (normalizedAnalystData.updated_relationship_dynamics_translated) {
            await persistenceService.savePipelineData(EOD_KEY_RELATIONSHIP_DYNAMICS_TRANSLATED, normalizedAnalystData.updated_relationship_dynamics_translated);
        } else {
            await persistenceService.savePipelineData(EOD_KEY_RELATIONSHIP_DYNAMICS_TRANSLATED, null);
        }

        // Track which relationship keys were modified today (for cache override pattern)
        // Use the backend-provided list of actually modified keys, not all keys from merged result
        const modifiedKeysThisSegment: string[] = result.data?.modified_relationship_keys || [];
        const existingModifiedKeys = await persistenceService.loadPipelineData<string[]>(SEGMENT_KEY_RELATIONSHIP_KEYS_MODIFIED_TODAY) || [];
        const allModifiedToday = [...new Set([...existingModifiedKeys, ...modifiedKeysThisSegment])];
        
        // [IMPORT GUARD] Check session before persisting - abort if import happened mid-step
        if (deps.shouldContinue && !deps.shouldContinue()) { 
            devLog("[SegmentAnalysis] Session invalidated - skipping persistence"); 
            if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
            return false; 
        }
        await persistenceService.savePipelineData(SEGMENT_KEY_RELATIONSHIP_KEYS_MODIFIED_TODAY, allModifiedToday);

        await persistenceService.saveCurrentSegmentTransitionStep(completeStep); setters.setSegmentTransitionStep(completeStep);
        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
        devLog("Step Completed: ANALYSIS_COMPLETE"); return true;
    } catch (e: any) {
        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
        console.error(`Error during Segment Analysis Step:`, e);
        if (e.message !== 'Extension context invalidated.') {
            await updateAndSaveSegmentError(setters, startStep, e.message || 'Segment analysis failed');
        } else {
            devWarn('Caught "Extension context invalidated". Suppressing error to allow auto-retry on reload.');
        }
        return false;
    }
}

async function executeSegmentSceneGenerationStep(deps: GameFlowDeps, setters: Setters, currentStep: SegmentTransitionStep, nextSegment: DaySegment, overrideModel?: GeminiModel): Promise<boolean> {
    const startStep = SegmentTransitionStep.SCENE_GENERATION_START;
    const completeStep = SegmentTransitionStep.SCENE_GENERATION_COMPLETE;
    
    devLog(`[executeSegmentSceneGenerationStep] Current step: ${SegmentTransitionStep[currentStep]} (${currentStep}), Complete step: ${SegmentTransitionStep[completeStep]} (${completeStep})`);
    
    if (currentStep >= completeStep) {
        devLog(`[executeSegmentSceneGenerationStep] Skipping completed step: SCENE_GENERATION_COMPLETE. Current step is ${SegmentTransitionStep[currentStep]}`);
        return true;
    }
    
    setters.setSegmentTransitionStep(startStep);
    setters.setDirectorLoadingMessage?.((deps.uiTranslations as any)?.generatingScene || 'Generating opening scene...');
    setters.setIsDirectorLoading?.(true);
    devLog("[executeSegmentSceneGenerationStep] Executing step: SCENE_GENERATION_START - Making Transition Director API call...");
    const stepKey = `${SEGMENT_PIPELINE_PREFIX}${startStep}`;
    if (setters.startCountdown) setters.startCountdown(stepKey, 240, 'timeout');
    
    try {
        const analystData = await persistenceService.loadPipelineData<relationshipAnalystService.StateAnalysisResponse>(SEGMENT_KEY_ANALYST_DATA);
        if (!analystData) throw new Error("Missing analyst data for scene generation.");
        
        // Convert array format to object format for compatibility
        const profilesObject = convertProfilesArrayToObject(analystData.updated_character_profiles);
        const tempUpdatedProfiles = { ...deps.psychologicalProfiles, ...profilesObject } as PsychologicalProfiles;
        const itineraryForDay = deps.fullItinerary ? deps.fullItinerary[deps.currentDay - 1] : null;
        if (!itineraryForDay) throw new Error(`No itinerary for Day ${deps.currentDay}`);
        
        const planForNextSegment = itineraryForDay.segments.find(s => s.segment === nextSegment);
        if (!planForNextSegment) throw new Error(`No plan for segment ${nextSegment}.`);
        
        const playthroughSummaries = await getPlaythroughSummaries(deps);
        const novelContext = assembleVolumeAwareNovelContext(
            deps.novelChapters || [],
            playthroughSummaries,
            2
        );
        const recentPastTranscript = JSON.stringify(mapFullHistoryForAI(deps.fullHistory.filter(d => d.day < deps.currentDay)));
        
        // Build COMPLETE current day transcript (previous segments + current segment that just ended)
        // This is the ENTIRE day's dialogue for the TD's continuity audit
        const currentDayLog = deps.fullHistory.find(d => d.day === deps.currentDay);
        const previousSegmentsOfToday = currentDayLog?.segments || [];
        const completeCurrentDayLog: DayLog = {
            day: deps.currentDay,
            segments: [
                ...previousSegmentsOfToday,
                { segment: deps.currentSegment, dialogue: deps.history }
            ]
        };
        const currentDayTranscript = mapFullHistoryForAI([completeCurrentDayLog]);
        
        devLog("[executeSegmentSceneGenerationStep] Calling Transition Director API...");
        // The currentSegment is the segment that just ended
        const segmentThatJustEnded = deps.currentSegment;
        
        const result = await geminiService.executeApiCallWithPolicy(
            'TransitionDirector',
            getCurrentModelConfig(deps),
            getCurrentApiKeys(deps),
            (cm, _ak) => transitionDirectorService.runTransitionDirector(
                getCurrentApiKeys(deps), cm as GeminiModel, deps.language, novelContext, recentPastTranscript, '', // Legacy param - unused, actual transcript in completedCurrentDayTranscript
                planForNextSegment, tempUpdatedProfiles, analystData.updated_relationship_dynamics,
                deps.factSheet,
                deps.characterChronicles,
                deps.characterBiographies,
                deps.playerName, deps.characterLikesDislikes,
                deps.evolvingPersonas, deps.characterTraits, deps.affection, deps.playerPsychoanalysisProse, deps.playerBackstory,
                deps.mainCharacters, deps.sideCharacters, deps.fullHistory, deps.novelChapters || [], playthroughSummaries,
                deps.currentDay, planForNextSegment, getCurrentModelConfig(deps), getCurrentApiKeys(deps),
                // No cache rebuild fields needed - segment transitions don't use caching
                [], [], [], null,
                deps.dayCalendar, // Weather/calendar for TD
                segmentThatJustEnded, cm,
                null, // cachedContentName - not using cache for segment transitions
                undefined, // pipelineState - not using pipeline state for segment transitions
                currentDayTranscript // Complete current day transcript for TD continuity audit
            ),
            overrideModel
        );
        
        devLog("[executeSegmentSceneGenerationStep] Transition Director API call completed. Response:", result.data);
        
        // [DEV] Log TD compliance checks and thought summary for developer inspection
        if (result.data?.pre_generation_compliance) {
            logTDComplianceReport(result.data.pre_generation_compliance, result.data.thought_summary);
        }

        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
        setters.updateStats(result.inputTokens, result.outputTokens);

        // [FIX] Validate that the TransitionDirector returned a valid opening scene
        if (!result.data || !result.data.opening_scene) {
            throw new Error("TransitionDirector returned invalid or empty opening scene for segment transition.");
        }

        // [IMPORT GUARD] Check session before persisting - abort if import happened mid-step
        if (deps.shouldContinue && !deps.shouldContinue()) { 
            devLog("[SegmentSceneGeneration] Session invalidated - skipping persistence"); 
            setters.setIsDirectorLoading?.(false);
            return false; 
        }
        await persistenceService.savePipelineData(SEGMENT_KEY_DIRECTOR_RESULT, result.data);
        await persistenceService.saveCurrentSegmentTransitionStep(completeStep);
        setters.setSegmentTransitionStep(completeStep);
        setters.setIsDirectorLoading?.(false);
        devLog("[executeSegmentSceneGenerationStep] Step Completed: SCENE_GENERATION_COMPLETE");
        return true;
    } catch (e: any) {
        console.error(`[executeSegmentSceneGenerationStep] Error during Segment Scene Generation Step:`, e);
        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
        setters.setIsDirectorLoading?.(false);
        if (e.message !== 'Extension context invalidated.') {
            await updateAndSaveSegmentError(setters, startStep, e.message || 'Scene generation failed');
        } else {
            devWarn('[executeSegmentSceneGenerationStep] Caught "Extension context invalidated". Suppressing error to allow auto-retry on reload.');
        }
        return false;
    }
}

async function executeSegmentFinalSaveStep(deps: GameFlowDeps, setters: Setters, currentStep: SegmentTransitionStep, nextSegment: DaySegment): Promise<boolean> {
    const startStep = SegmentTransitionStep.STATE_UPDATE_START;
    const completeStep = SegmentTransitionStep.STATE_UPDATE_COMPLETE;
    if (currentStep >= completeStep) { devLog("Skipping completed step: STATE_UPDATE_COMPLETE"); return true; }
    setters.setSegmentTransitionStep(startStep);
    devLog("Executing step: STATE_UPDATE_START");
    try {
        const directorResult = await persistenceService.loadPipelineData<TransitionDirectorResponse>(SEGMENT_KEY_DIRECTOR_RESULT); if (!directorResult) throw new Error("Missing director result for final save.");
        const analystData = await persistenceService.loadPipelineData<relationshipAnalystService.StateAnalysisResponse>(SEGMENT_KEY_ANALYST_DATA);
        if (!analystData) throw new Error("Missing analyst data for final save.");
        if (!analystData.updated_relationship_dynamics_structured || Object.keys(analystData.updated_relationship_dynamics_structured).length === 0) {
            throw new Error("Relationship analysis missing structured dynamics in segment pipeline. Please rerun the step.");
        }
        const updatedFullHistory = await persistenceService.loadPipelineData<DayLog[]>(SEGMENT_KEY_UPDATED_FULL_HISTORY); if (!updatedFullHistory) throw new Error("Missing updated history for final save.");
        const segmentEnded = deps.currentSegment;

        setters.setRelationshipDynamics(analystData.updated_relationship_dynamics);
        if (analystData.updated_relationship_dynamics_translated) {
            setters.setRelationshipDynamicsTranslated(analystData.updated_relationship_dynamics_translated);
        }

        // Protect structured dynamics from being overwritten to null if the segment analyst payload omits them.
        const structuredFromAnalyst = analystData.updated_relationship_dynamics_structured;
        const structuredTranslatedFromAnalyst = analystData.updated_relationship_dynamics_structured_translated;
        const persistedStructured = await persistenceService.loadPipelineData<any>(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED);
        const persistedStructuredTranslated = await persistenceService.loadPipelineData<any>(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED_TRANSLATED);
        const nextStructured = structuredFromAnalyst ?? persistedStructured ?? null;
        const nextStructuredTranslated = structuredTranslatedFromAnalyst ?? persistedStructuredTranslated ?? null;

        if (!structuredFromAnalyst && !persistedStructured) {
            devWarn("[Segment Final Save] Analyst data missing structured dynamics; preserving previous Dexie state.");
        }

        if (setters.setRelationshipDynamicsStructured) {
            setters.setRelationshipDynamicsStructured(nextStructured);
        }
        if (setters.setRelationshipDynamicsStructuredTranslated) {
            setters.setRelationshipDynamicsStructuredTranslated(nextStructuredTranslated);
        }
        // Convert array format to object format for compatibility
        const profilesObject = convertProfilesArrayToObject(analystData.updated_character_profiles);
        setters.setPsychologicalProfiles(prev => ({...prev, ...profilesObject} as PsychologicalProfiles));
        if (analystData.updated_character_profiles_translated) {
            const translatedProfilesObject = convertProfilesArrayToObject(analystData.updated_character_profiles_translated);
            setters.setPsychologicalProfilesTranslated(prev => ({...prev, ...translatedProfilesObject} as PsychologicalProfiles));
        }
        if (analystData.newly_inspired_questions && analystData.newly_inspired_questions.length > 0) setters.setUnaskedQuestions(prev => { const updated = {...(prev || {})}; analystData.newly_inspired_questions?.forEach(q => { updated[q.character] = q.question; }); return updated; });
        if (analystData.new_chronicle_entries && analystData.new_chronicle_entries.length > 0) setters.setCharacterChronicles(prev => { const updated = {...prev}; analystData.new_chronicle_entries?.forEach(entry => { if (!updated[entry.character]) { updated[entry.character] = []; } updated[entry.character].push({ day: deps.currentDay, segment: segmentEnded, ...entry}); }); return updated; });
        if (directorResult.revised_itinerary_segment) setters.setFullItinerary(prevItinerary => { if (!prevItinerary) return null; const newItinerary = [...prevItinerary]; const dayIndex = deps.currentDay - 1; if(newItinerary[dayIndex]) { const segIndex = newItinerary[dayIndex].segments.findIndex(s => s.segment === nextSegment); if(segIndex !== -1) { newItinerary[dayIndex].segments[segIndex] = { segment: nextSegment, ...directorResult.revised_itinerary_segment!}; } } return newItinerary; });

        // [IMPORT GUARD] Check session before persisting - abort if import happened mid-step
        if (deps.shouldContinue && !deps.shouldContinue()) { 
            devLog("[SegmentFinalSave] Session invalidated - skipping persistence"); 
            return false; 
        }
        
        // Persist the latest structured dynamics so later steps (and exports) see them.
        await persistenceService.savePipelineData(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED, nextStructured);
        await persistenceService.savePipelineData(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED_TRANSLATED, nextStructuredTranslated);

        setters.setFullHistory(updatedFullHistory); setters.setCurrentSegment(nextSegment); setters.setHistory([]); setters.setPromptsToday(0); setters.setSceneMentalModel(directorResult.scene_mental_model);
        // [GENERATIVE IMAGES] Store full TransitionDirectorResponse so handleProceedAfterPipeline can access generated_background
        setters.setOpeningSceneCache(directorResult as any);

        await persistenceService.saveCurrentSegmentTransitionStep(completeStep); setters.setSegmentTransitionStep(completeStep); devLog("Step Completed: STATE_UPDATE_COMPLETE");
        setters.setIsPipelineCompleteAndReady(true);
        return true;
    } catch (e: any) { console.error("Error during segment final state update:", e); await updateAndSaveSegmentError(setters, startStep, e.message || 'Final state update failed'); return false; }
}

export async function handleSegmentTransition(deps: GameFlowDeps, setters: Setters, overrideModel?: GeminiModel) {
    // [FIX] Re-entrance guard to prevent race conditions from React re-renders
    if (isProcessingRef.current) {
        devWarn("[handleSegmentTransition] Already processing a pipeline, ignoring duplicate call.");
        return;
    }
    isProcessingRef.current = true;

    try {
    // Ensure Dexie is the source of truth for resume scenarios; override in-memory if Dexie has newer data.
    const dexieStructured = await persistenceService.loadPipelineData<RelationshipDynamicsStructured | null>(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED);
    if (dexieStructured) {
        // mutate deps so downstream steps see the Dexie value
        (deps as any).relationshipDynamicsStructured = dexieStructured;
    }
    const dexieStructuredTranslated = await persistenceService.loadPipelineData<RelationshipDynamicsStructured | null>(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED_TRANSLATED);
    if (dexieStructuredTranslated !== null && dexieStructuredTranslated !== undefined) {
        (deps as any).relationshipDynamicsStructuredTranslated = dexieStructuredTranslated;
    }
    const dexieProfiles = await persistenceService.loadPipelineData<PsychologicalProfiles | null>(EOD_KEY_MERGED_PROFILES);
    if (dexieProfiles) {
        (deps as any).psychologicalProfiles = dexieProfiles;
    }
    const dexieProfilesTranslated = await persistenceService.loadPipelineData<PsychologicalProfiles | null>(EOD_KEY_MERGED_PROFILES_TRANSLATED);
    if (dexieProfilesTranslated !== null && dexieProfilesTranslated !== undefined) {
        (deps as any).psychologicalProfilesTranslated = dexieProfilesTranslated;
    }
    const dexieDynamics = await persistenceService.loadPipelineData<string | null>(EOD_KEY_RELATIONSHIP_DYNAMICS);
    if (dexieDynamics !== null && dexieDynamics !== undefined) {
        (deps as any).relationshipDynamics = dexieDynamics;
    }
    const dexieDynamicsTranslated = await persistenceService.loadPipelineData<string | null>(EOD_KEY_RELATIONSHIP_DYNAMICS_TRANSLATED);
    if (dexieDynamicsTranslated !== null && dexieDynamicsTranslated !== undefined) {
        (deps as any).relationshipDynamicsTranslated = dexieDynamicsTranslated;
    }
    // [FIX] Hydrate characterTraits from Dexie - was missing, causing TD to fallback hydrate
    const dexieCharacterTraits = await persistenceService.loadPipelineData<any>(EOD_KEY_CHARACTER_TRAITS);
    if (dexieCharacterTraits && Object.keys(dexieCharacterTraits).length > 0) {
        (deps as any).characterTraits = dexieCharacterTraits;
    }
    // [CONSISTENCY] Also hydrate evolvingPersonas and characterLikesDislikes for completeness
    const dexieEvolvingPersonas = await persistenceService.loadPipelineData<{ [key: string]: string } | null>(EOD_KEY_FINAL_EVOLVING_PERSONAS);
    if (dexieEvolvingPersonas && Object.keys(dexieEvolvingPersonas).length > 0) {
        (deps as any).evolvingPersonas = dexieEvolvingPersonas;
    }
    const dexieLikesDislikes = await persistenceService.loadPipelineData<CharacterLikesDislikes | null>(EOD_KEY_FINAL_LIKES_DISLIKES);
    if (dexieLikesDislikes && Object.keys(dexieLikesDislikes).length > 0) {
        (deps as any).characterLikesDislikes = dexieLikesDislikes;
    }

    let currentStep = await persistenceService.loadCurrentSegmentTransitionStep();
    const currentErrors = await persistenceService.loadSegmentTransitionErrors() || {};
    setters.setSegmentTransitionErrors(currentErrors);

    devLog(`[handleSegmentTransition] Starting segment transition. Current step: ${SegmentTransitionStep[currentStep]} (${currentStep}), Errors:`, currentErrors);

    if (currentStep === SegmentTransitionStep.STATE_UPDATE_COMPLETE && Object.keys(currentErrors).length === 0) {
        setters.setIsAwaitingSegmentTransition(true);
        setters.setSegmentTransitionStep(SegmentTransitionStep.STATE_UPDATE_COMPLETE);
        setters.setIsPipelineCompleteAndReady(true);
        devLog("[handleSegmentTransition] Segment transition sequence already complete. Awaiting user action.");
        return;
    }

    setters.setIsAwaitingNextSceneClick(false);
    setters.setError(null);
    setters.setIsUnrecoverableError(false);

    const stepToRetry = Object.keys(currentErrors)[0];
    if (stepToRetry || currentStep === SegmentTransitionStep.NOT_STARTED) {
        await persistenceService.saveSegmentTransitionErrors({});
        setters.setSegmentTransitionErrors({});
    }

    devLog(`Starting/Resuming Segment Transition sequence at step: ${SegmentTransitionStep[currentStep]}`);
    // Use dynamic day structure - NO FALLBACK to prevent data corruption
    const dayStructure = getDaySegmentsFromDeps(deps);
    const nextSegmentIndex = dayStructure.indexOf(deps.currentSegment) + 1;
    const nextSegment = dayStructure[nextSegmentIndex];
    devLog(`Transitioning from ${deps.currentSegment} to ${nextSegment}`);

    // Helper to check if pipeline should abort (import happened)
    const shouldAbort = () => deps.shouldContinue && !deps.shouldContinue();
    
    if (currentStep < SegmentTransitionStep.ANALYSIS_START) {
        if (!await executeSegmentArchiveStep(deps, setters, currentStep)) { setters.setIsAwaitingSegmentTransition(true); return; }
        if (shouldAbort()) { devLog("[SegmentTransition] Pipeline aborted - import detected."); return; }
        currentStep = await persistenceService.loadCurrentSegmentTransitionStep();
    }
    if (currentStep < SegmentTransitionStep.ANALYSIS_COMPLETE) {
        if (!await executeSegmentAnalysisStep(deps, setters, currentStep, overrideModel)) { setters.setIsAwaitingSegmentTransition(true); return; }
        if (shouldAbort()) { devLog("[SegmentTransition] Pipeline aborted - import detected."); return; }
        currentStep = await persistenceService.loadCurrentSegmentTransitionStep();
    }
    if (currentStep < SegmentTransitionStep.SCENE_GENERATION_COMPLETE) {
        devLog(`[handleSegmentTransition] Executing scene generation step. Current step before: ${SegmentTransitionStep[currentStep]} (${currentStep})`);
        if (!await executeSegmentSceneGenerationStep(deps, setters, currentStep, nextSegment, overrideModel)) {
            devLog("[handleSegmentTransition] Scene generation step failed, stopping pipeline.");
            setters.setIsAwaitingSegmentTransition(true);
            return;
        }
        if (shouldAbort()) { devLog("[SegmentTransition] Pipeline aborted - import detected."); return; }
        currentStep = await persistenceService.loadCurrentSegmentTransitionStep();
        devLog(`[handleSegmentTransition] Scene generation step completed. Current step after: ${SegmentTransitionStep[currentStep]} (${currentStep})`);
    } else {
        devLog(`[handleSegmentTransition] Skipping scene generation step - already at or past SCENE_GENERATION_COMPLETE. Current step: ${SegmentTransitionStep[currentStep]} (${currentStep})`);
    }
    if (currentStep < SegmentTransitionStep.STATE_UPDATE_COMPLETE) {
        if (!await executeSegmentFinalSaveStep(deps, setters, currentStep, nextSegment)) { setters.setIsAwaitingSegmentTransition(true); return; }
        currentStep = await persistenceService.loadCurrentSegmentTransitionStep();
    }

    if (currentStep === SegmentTransitionStep.STATE_UPDATE_COMPLETE) {
        devLog("Segment Transition sequence complete.");
        setters.setIsAwaitingSegmentTransition(true);
        setters.setIsPipelineCompleteAndReady(true);
    } else {
        setters.setIsAwaitingSegmentTransition(true);
        console.error("Segment Transition sequence stopped unexpectedly.");
    }

    const finalState = await deps.getCurrentState();
    await persistenceService.saveState(finalState);
    devLog("Segment Transition sequence finished and final state saved.");
    } finally {
        // [FIX] Always reset the processing flag to allow retries
        isProcessingRef.current = false;
    }
}
