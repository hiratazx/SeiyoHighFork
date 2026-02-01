import {
    GameFlowDeps,
    Setters,
    updateAndSaveError
} from './gameFlowServiceHelpers';
import { STORY_NAME } from '../storyConfig';
import { mapFullHistoryForAI, assembleVolumeAwareNovelContext } from '../lib/promptUtils';
import { EOD_PIPELINE_PREFIX, PipelineStateBucket, loadPipelineStateBucket, savePipelineStateBucket } from './persistenceService';
import { EndOfDayStep, GeminiModel, AiModelId, CharacterConfig, PsychologicalProfiles, EvolvingStoryArc, Subplot, CharacterLikesDislikes, CharacterDeveloperAnalysis, CharacterTraits, InitialStoryFoundation, NextDayResponse, NovelChapter, PlayerAnalysisResponse, ScheduledEvent, DailyItinerary, DayLog, NewChronicleEntry, ChronicleEntry } from '../types';
import * as persistenceService from './persistenceService';
import { EOD_KEY_FINAL_HISTORY, EOD_KEY_NOVEL_CHAPTER_RAW, EOD_KEY_MERGED_PROFILES, EOD_KEY_RELATIONSHIP_DYNAMICS, EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED, EOD_KEY_UPDATED_FACT_SHEET, EOD_KEY_UPDATED_SCHEDULE, EOD_KEY_PLAYER_ANALYSIS_RAW, EOD_KEY_PLAYER_BACKSTORY, EOD_KEY_UPDATED_MAIN_CHARS, EOD_KEY_UPDATED_SIDE_CHARS, EOD_KEY_FINAL_STORY_ARCS, EOD_KEY_FINAL_SUBPLOTS, EOD_KEY_FINAL_EVOLVING_PERSONAS, EOD_KEY_FINAL_LIKES_DISLIKES, EOD_KEY_CHARACTER_TRAITS, EOD_KEY_CHARACTER_DEVELOPER_RAW, EOD_KEY_NEW_CHRONICLE_ENTRIES, EOD_KEY_NEWLY_INSPIRED_QUESTIONS, EOD_KEY_SEGMENT_ENDED, EOD_KEY_PLAYTHROUGH_SUMMARIES, EOD_KEY_CHARACTER_CHRONICLES, EOD_KEY_CHARACTER_BIOGRAPHIES, EOD_KEY_UNASKED_QUESTIONS, EOD_KEY_AFFECTION, EOD_KEY_UPDATED_CHARACTER_CHRONICLES, EOD_KEY_UPDATED_CHARACTER_BIOGRAPHIES } from './persistenceService';
import * as geminiService from '../services/geminiService';
import { runCharacterDeveloper } from './characterDeveloper.service';
import { devLog, devWarn, devDebug } from '../lib/devLog';

// Flatten structured relationship dynamics into prose for personas that expect text.
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

const normalizeLikesDislikesShape = (likesDislikes: any, mainCharacters: CharacterConfig[]) => {
    const normalized: CharacterLikesDislikes = {};
    if (likesDislikes && typeof likesDislikes === 'object') {
        Object.entries(likesDislikes).forEach(([name, entry]) => {
            const likes = Array.isArray((entry as any)?.likes) ? (entry as any).likes : [];
            const dislikes = Array.isArray((entry as any)?.dislikes) ? (entry as any).dislikes : [];
            normalized[name] = { likes, dislikes };
        });
    }
    mainCharacters.forEach(c => {
        if (!normalized[c.name]) {
            normalized[c.name] = { likes: [], dislikes: [] };
        } else {
            normalized[c.name].likes = normalized[c.name].likes || [];
            normalized[c.name].dislikes = normalized[c.name].dislikes || [];
        }
    });
    return normalized;
};

// Derive traits and likes/dislikes from character_updates (fallback for genesis-like responses)
const firstName = (s: string) => (s || '').split(' ')[0] || s;

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

const deriveTraitsAndLikes = (characterUpdates: any[] | undefined | null, mainCharacters: CharacterConfig[]) => {
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

async function getPlaythroughSummaries(deps: GameFlowDeps): Promise<string[]> {
    const persisted = await persistenceService.loadPipelineData<string[]>(EOD_KEY_PLAYTHROUGH_SUMMARIES);
    if (persisted) {
        return persisted;
    }
    return deps.playthroughSummaries || [];
}

export async function executeCharacterDeveloperStep(deps: GameFlowDeps, setters: Setters, currentStep: EndOfDayStep, overrideModel?: AiModelId): Promise<boolean> {
    const startStep = EndOfDayStep.CHARACTER_DEVELOPER_START;
    const completeStep = EndOfDayStep.CHARACTER_DEVELOPER_COMPLETE;
    
    if (currentStep >= completeStep) {
        devLog("Skipping completed step: CHARACTER_DEVELOPER_COMPLETE");
        return true;
    }

    setters.setEndOfDayStep(startStep);
    setters.setAnalysisMessage('Developing character psychology and traits...');
    devLog("Executing step: CHARACTER_DEVELOPER_START");
    const stepKey = `vn_eod_pipeline_v6_${startStep}`;
    if (setters.startCountdown) setters.startCountdown(stepKey, 240, 'timeout');

    try {
        // 1. Load Context Data
        const finalFullHistory = await persistenceService.loadPipelineData<DayLog[]>(EOD_KEY_FINAL_HISTORY);
        if (!finalFullHistory) throw new Error("Missing final history for Character Developer.");
        const RECENT_TRANSCRIPT_WINDOW = 2;
        const recentTranscriptDays = finalFullHistory.filter(dayLog =>
            dayLog.day >= deps.currentDay - RECENT_TRANSCRIPT_WINDOW && dayLog.day <= deps.currentDay
        );
        if (recentTranscriptDays.length === 0) throw new Error("Missing transcript data for Character Developer.");
        const recentDialogueTranscript = JSON.stringify(mapFullHistoryForAI(recentTranscriptDays));

        const novelChapterData = await persistenceService.loadPipelineData<NovelChapter>(EOD_KEY_NOVEL_CHAPTER_RAW);
        const characterDevChapters = (() => {
            const chapters = [...(deps.novelChapters || [])];
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
        // [FIX] Use assembleVolumeAwareNovelContext instead of assembleHybridMemory
        // to avoid including raw JSON transcript in the novel context.
        // The transcript is already passed separately as recentDialogueTranscript.
        const novelContext = assembleVolumeAwareNovelContext(
            characterDevChapters,
            playthroughSummaries,
            { recentTranscriptBuffer: RECENT_TRANSCRIPT_WINDOW + 1 }
        );

        // 2. Load Updated State from Previous Steps (Arc Manager & Analysis)
        const updatedStoryArcs = await persistenceService.loadPipelineData<EvolvingStoryArc[]>(EOD_KEY_FINAL_STORY_ARCS);
        if (!updatedStoryArcs) throw new Error("Missing updated story arcs from Arc Manager.");
        
        const updatedSubplots = await persistenceService.loadPipelineData<Subplot[]>(EOD_KEY_FINAL_SUBPLOTS);
        
        const endOfDayProfiles = await persistenceService.loadPipelineData<PsychologicalProfiles>(EOD_KEY_MERGED_PROFILES);
        if (!endOfDayProfiles) throw new Error("Missing updated profiles for Character Developer.");
        
        const mainCharacters = await persistenceService.loadPipelineData<CharacterConfig[]>(EOD_KEY_UPDATED_MAIN_CHARS);
        const sideCharacters = await persistenceService.loadPipelineData<CharacterConfig[]>(EOD_KEY_UPDATED_SIDE_CHARS);
        if (!mainCharacters || !sideCharacters) throw new Error("Missing updated character lists.");

        const currentRelationshipDynamics = await persistenceService.loadPipelineData<any>(EOD_KEY_RELATIONSHIP_DYNAMICS);
        if (!currentRelationshipDynamics) throw new Error("Missing relationship dynamics for Character Developer.");
        const relationshipDynamicsProse = typeof currentRelationshipDynamics === 'string'
            ? currentRelationshipDynamics
            : (structuredDynamicsToProse(currentRelationshipDynamics) || 'No dynamics established yet.');
        const relationshipDynamicsStructured = await persistenceService.loadPipelineData<any>(EOD_KEY_RELATIONSHIP_DYNAMICS_STRUCTURED);
        
        // [FIX] Load character data from MAIN game state as ultimate fallback to prevent data loss
        const mainStateData = await persistenceService.loadCharacterDataFromMainState();
        
        const likesDislikesFromDexieRaw = await persistenceService.loadPipelineData<CharacterLikesDislikes | null>(EOD_KEY_FINAL_LIKES_DISLIKES) 
            ?? deps.characterLikesDislikes 
            ?? mainStateData.characterLikesDislikes;
        const likesDislikesFromDexie = normalizeLikesDislikesShape(likesDislikesFromDexieRaw, mainCharacters || []);
        const evolvingPersonasFromDexie = await persistenceService.loadPipelineData<{ [key: string]: string } | null>(EOD_KEY_FINAL_EVOLVING_PERSONAS) 
            ?? deps.evolvingPersonas 
            ?? mainStateData.evolvingPersonas;
        
        // [FIX START] --- PREPARE DYNAMIC CONTEXT MERGE WITH DEDUPLICATION ---
        
        // A. Merge Chronicles (History + New from Today)
        const newChronicleEntries = await persistenceService.loadPipelineData<NewChronicleEntry[]>(EOD_KEY_NEW_CHRONICLE_ENTRIES) || [];
        const baseChronicles = await persistenceService.loadPipelineData<{ [key: string]: ChronicleEntry[] }>(EOD_KEY_UPDATED_CHARACTER_CHRONICLES)
            ?? await persistenceService.loadPipelineData<{ [key: string]: ChronicleEntry[] }>(EOD_KEY_CHARACTER_CHRONICLES)
            ?? deps.characterChronicles
            ?? {};
        // Deep copy existing chronicles to avoid mutating state
        const mergedChronicles = JSON.parse(JSON.stringify(baseChronicles));
        const segmentEnded = await persistenceService.loadPipelineData<string>(EOD_KEY_SEGMENT_ENDED) || deps.currentSegment;

        newChronicleEntries.forEach(entry => {
            const { character, ...rest } = entry;
            if (!mergedChronicles[character]) {
                mergedChronicles[character] = [];
            }

            const entryToAdd: ChronicleEntry = { 
                ...rest, 
                day: deps.currentDay, 
                segment: segmentEnded 
            };

            // DEDUPLICATION CHECK (Matches executeFinalSaveStep logic)
            const alreadyExists = mergedChronicles[character].some((existingEntry: ChronicleEntry) =>
                existingEntry.day === entryToAdd.day && 
                existingEntry.segment === entryToAdd.segment &&
                existingEntry.summary === entryToAdd.summary && 
                existingEntry.category === entryToAdd.category
            );

            if (!alreadyExists) {
                mergedChronicles[character].push(entryToAdd);
            }
        });

        // B. Merge Unasked Questions (Pending + New from Today)
        const newQuestions = await persistenceService.loadPipelineData<Array<{ character: string; question: string; }>>(EOD_KEY_NEWLY_INSPIRED_QUESTIONS) || [];
        const baseQuestions = await persistenceService.loadPipelineData<{ [character: string]: string } | null>(EOD_KEY_UNASKED_QUESTIONS) ?? deps.unaskedQuestions ?? {};
        const mergedQuestions = { ...baseQuestions };
        
        newQuestions.forEach(q => {
            mergedQuestions[q.character] = q.question;
        });
        await persistenceService.savePipelineData(EOD_KEY_UNASKED_QUESTIONS, mergedQuestions);

        // [FIX END] ---------------------------------------

        const updatedFactSheet = await persistenceService.loadPipelineData<any>(EOD_KEY_UPDATED_FACT_SHEET);
        const updatedSchedule = await persistenceService.loadPipelineData<ScheduledEvent[]>(EOD_KEY_UPDATED_SCHEDULE);
        const playerAnalysisData = await persistenceService.loadPipelineData<PlayerAnalysisResponse>(EOD_KEY_PLAYER_ANALYSIS_RAW);
        const playerBackstory = await persistenceService.loadPipelineData<string>(EOD_KEY_PLAYER_BACKSTORY);
        
        const biographiesFromDexie = await persistenceService.loadPipelineData<{ [key: string]: string }>(EOD_KEY_UPDATED_CHARACTER_BIOGRAPHIES)
            ?? await persistenceService.loadPipelineData<{ [key: string]: string }>(EOD_KEY_CHARACTER_BIOGRAPHIES)
            ?? deps.characterBiographies;
        const affectionFromDexie = await persistenceService.loadPipelineData<{ [character: string]: number } | null>(EOD_KEY_AFFECTION) ?? deps.affection;

        // Traits must come from Dexie; if absent, hydrate from React state or MAIN game state and persist.
        let baselineTraits = await persistenceService.loadPipelineData<CharacterTraits | null>(EOD_KEY_CHARACTER_TRAITS);
        if (!baselineTraits || Object.keys(baselineTraits).length === 0) {
            // Try React state first, then main game state as ultimate fallback
            baselineTraits = deps.characterTraits ?? mainStateData.characterTraits ?? null;
            if (baselineTraits && Object.keys(baselineTraits).length > 0) {
                await persistenceService.savePipelineData(EOD_KEY_CHARACTER_TRAITS, baselineTraits);
            }
        }
        if (!baselineTraits || Object.keys(baselineTraits).length === 0) {
            throw new Error("Missing character traits in Dexie for Character Developer.");
        }

        // [NEW] Load pipeline state bucket for cached mode user prompt overrides
        const pipelineStateBucket = await loadPipelineStateBucket() ?? {};
        devLog("[EOD Pipeline] CharacterDeveloper: Loaded pipeline state bucket", {
            hasRAOutputs: !!pipelineStateBucket.updated_relationship_dynamics,
            hasCAOutputs: !!pipelineStateBucket.promotions,
            hasPsychoOutputs: !!pipelineStateBucket.updated_player_profile,
            hasArcOutputs: !!pipelineStateBucket.arc_updates,
        });

        // 3. Execute API Call
        const result = await geminiService.executeApiCallWithPolicy<CharacterDeveloperAnalysis>(
            'CharacterDeveloper',
            deps.modelConfig,
            deps.apiKeys,
            (cm, _ak) => runCharacterDeveloper(
                deps.apiKeys,
                deps.modelConfig,
                STORY_NAME,
                deps.currentDay,
                novelContext, // [FIX] Use novelContext (no embedded transcript) instead of hybridMemory
                recentDialogueTranscript,
                updatedStoryArcs,
                evolvingPersonasFromDexie,
                baselineTraits,
                likesDislikesFromDexie,
                mainCharacters,
                sideCharacters,
                updatedSubplots || [],
                mergedChronicles,
                biographiesFromDexie,
                endOfDayProfiles,
                relationshipDynamicsProse,
                relationshipDynamicsStructured,
                playerAnalysisData?.new_psychoanalysis_prose || deps.playerPsychoanalysisProse,
                playerBackstory || deps.playerBackstory,
                updatedFactSheet,
                updatedSchedule,
                mergedQuestions,
                affectionFromDexie,
                deps.playerName,
                false, // isGenesis
                cm, // forceModel
                undefined, // apiKeysOverride
                pipelineStateBucket.cacheName || null, // cachedContentName from EOD cache
                pipelineStateBucket // Pass accumulated outputs from previous steps
            ),
            overrideModel
        );

        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
        setters.updateStats(result.inputTokens, result.outputTokens);
        const raw = result.data as any;

        // [FIX] Validate CharacterDeveloper returned valid data structure
        // The personas object itself can have no changes, but the field MUST exist - if it doesn't,
        // something went wrong (e.g., polling returned queue response instead of AI result)
        if (!raw || typeof raw !== 'object' || !('updated_evolving_personas' in raw)) {
            throw new Error("CharacterDeveloper returned invalid response (missing updated_evolving_personas). Possible polling/queue issue.");
        }

        const { updates, updatedTraits, updatedLikes } = extractCdPayload(raw);

        const derived = deriveTraitsAndLikes(updates, mainCharacters || []);
        const traitsToPersist = updatedTraits || derived.traits || {};
        const likesToPersist = normalizeLikesDislikesShape(
            updatedLikes || derived.likes || {},
            mainCharacters || []
        );

        // 4. Save Results
        await persistenceService.savePipelineData(EOD_KEY_CHARACTER_DEVELOPER_RAW, raw);
        
        // Update critical state
        await persistenceService.savePipelineData(EOD_KEY_FINAL_EVOLVING_PERSONAS, raw.updated_evolving_personas);
        await persistenceService.savePipelineData(EOD_KEY_FINAL_LIKES_DISLIKES, likesToPersist);
        await persistenceService.savePipelineData(EOD_KEY_CHARACTER_TRAITS, traitsToPersist);

        // [NEW] Save CharacterDeveloper outputs to Pipeline State Bucket for subsequent personas
        const existingBucket = await loadPipelineStateBucket() ?? {};
        const updatedBucket: PipelineStateBucket = {
            ...existingBucket,
            // CharacterDeveloper outputs
            evolving_personas: raw.updated_evolving_personas || {},
            updated_likes_dislikes: likesToPersist,
        };
        await savePipelineStateBucket(updatedBucket);
        devLog("[EOD Pipeline] Saved CharacterDeveloper outputs to pipeline state bucket");

        await persistenceService.saveCurrentEndOfDayStep(completeStep);
        setters.setEndOfDayStep(completeStep);
        devLog("Step Completed: CHARACTER_DEVELOPER_COMPLETE");
        return true;

    } catch (e: any) {
        if (setters.startCountdown) setters.startCountdown(stepKey, 0, null);
        console.error(`Error during Character Developer Step:`, e);
        if (e.message !== 'Extension context invalidated.') {
            await updateAndSaveError(setters, startStep, e.message || 'Character development failed');
        }
        return false;
    }
}

