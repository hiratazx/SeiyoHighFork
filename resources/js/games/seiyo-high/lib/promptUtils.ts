/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import { DialogueEntry, PromptHistoryEntry, DayLog, PromptDayLog, NovelChapter } from '../types';

/**
 * Extracts a JSON object from a string that might be wrapped in markdown or other text.
 * @param text The raw text from the AI.
 * @returns The cleaned JSON string, or the original string if no JSON object is found.
 */
export function extractJson(text: string): string {
  const startIndex = text.indexOf('{');
  const endIndex = text.lastIndexOf('}');

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    // Return the original string if no valid JSON object is found
    return text;
  }

  return text.substring(startIndex, endIndex + 1);
}


/**
 * Strips a DialogueEntry array of all UI-specific and translated data,
 * returning a clean PromptHistoryEntry array suitable for AI context.
 */
export function mapHistoryForAI(history: DialogueEntry[]): PromptHistoryEntry[] {
  if (!history || history.length === 0) return []; // Return early if no history

  let lastLocation = '';
  const mappedHistory: PromptHistoryEntry[] = [];

  // Get the current location from the last entry - use raw location ID/URL
  // This shows the AI the exact format it needs to use for location_hint
  const currentSceneLocation = history[history.length - 1].location || 'unknown_location';
  
  // Add the current location at the beginning of the history for the AI
  mappedHistory.push({
    speaker: 'Scene',
    dialogue: `[Current Location: ${currentSceneLocation}]`,
  });

  history.forEach(entry => {
    // Show location changes using raw location ID/URL format
    const entryLocation = entry.location || 'unknown_location';
    if (entryLocation !== lastLocation) {
      mappedHistory.push({
        speaker: 'Scene',
        dialogue: `[Location: ${entryLocation}]`,
      });
      lastLocation = entryLocation;
    }

    mappedHistory.push({
      speaker: entry.speaker,
      dialogue: entry.dialogue,
      motivation: entry.motivation || undefined,
    });
  });

  return mappedHistory;
}

/**
 * Strips a full DayLog array of all UI-specific and translated data,
 * returning a clean PromptDayLog array suitable for end-of-day AI context.
 */
export function mapFullHistoryForAI(fullHistory: DayLog[]): PromptDayLog[] {
    if (!fullHistory) return [];
    return fullHistory.map(dayLog => ({
        day: dayLog.day,
        segments: dayLog.segments.map(segmentLog => ({
            segment: segmentLog.segment,
            dialogue: mapHistoryForAI(segmentLog.dialogue),
        })),
    }));
}

/**
 * Assembles a hybrid memory string for AI context, combining long-term novel chapters
 * and short-term, high-fidelity dialogue transcripts.
 * @param novelChapters The array of summarized novel chapters from previous days.
 * @param fullHistory The complete, raw dialogue log for all previous days.
 * @param currentDay The current in-game day number.
 * @returns A formatted string containing the complete hybrid memory.
 */
function countContiguousVolumes(playthroughSummaries: string[] = []): number {
  let contiguousCycles = 0;
  for (let i = 0; i < playthroughSummaries.length; i++) {
    const summary = typeof playthroughSummaries[i] === 'string' ? playthroughSummaries[i].trim() : '';
    if (summary) {
      contiguousCycles += 1;
    } else {
      break;
    }
  }
  return contiguousCycles;
}

function buildArchivedVolumeSection(
  playthroughSummaries: string[] = [],
  maxCycles?: number
): { section: string | null; includedCycles: number } {
  const volumeBlocks: string[] = [];
  for (let i = 0; i < playthroughSummaries.length; i++) {
    const rawSummary = playthroughSummaries[i];
    const summary = typeof rawSummary === 'string' ? rawSummary.trim() : '';

    if (summary) {
      const startDay = i * 14 + 1;
      const endDay = (i + 1) * 14;
      volumeBlocks.push(`**Volume ${i + 1} (Days ${startDay}-${endDay}):**\n${summary}`);
    } else {
      break;
    }
  }

  if (volumeBlocks.length === 0) {
    return { section: null, includedCycles: 0 };
  }

  const cyclesToInclude =
    typeof maxCycles === 'number'
      ? Math.min(Math.max(maxCycles, 0), volumeBlocks.length)
      : volumeBlocks.length;

  if (cyclesToInclude === 0) {
    return { section: null, includedCycles: 0 };
  }

  const limitedBlocks = volumeBlocks.slice(0, cyclesToInclude);

  const section = `
---
### Long-Term Memory (Archived Volumes)
High-level summaries of past story cycles.
---
${limitedBlocks.join('\n\n')}`;

  return { section, includedCycles: cyclesToInclude };
}

function buildHybridNovelSection(
  novelChapters: NovelChapter[] = [],
  archivedDaysCount: number,
  recentTranscriptBuffer: number,
  maxProseCount = 12
): string | null {
  if (!novelChapters.length) return null;

  const annotated = novelChapters.map((chapter, index) => ({
    ...chapter,
    dayNumber: index + 1,
  }));

  const activeChapters = annotated.filter(chapter => chapter.dayNumber > archivedDaysCount);
  const cutoff = Math.max(0, activeChapters.length - recentTranscriptBuffer);
  const chaptersToProcess = activeChapters.slice(0, cutoff);

  if (chaptersToProcess.length === 0) {
    return null;
  }

  const splitIndex = Math.max(0, chaptersToProcess.length - maxProseCount);
  const brutalChapters = chaptersToProcess.slice(0, splitIndex);
  const proseChapters = chaptersToProcess.slice(splitIndex);

  let storySoFar = '';

  if (brutalChapters.length > 0) {
    storySoFar += '**Summary of Recent Events (Fading Memory):**\n';
    storySoFar += brutalChapters.map(chapter => {
      const summaryLines = (chapter.brutalSummary && chapter.brutalSummary.length > 0)
        ? chapter.brutalSummary.join('\n- ')
        : 'No brutal summary was captured for this day.';
      return `Day ${chapter.dayNumber}:\n- ${summaryLines}`;
    }).join('\n\n');
    storySoFar += '\n\n';
  }

  if (proseChapters.length > 0) {
    storySoFar += '**The Story of Recent Days (Vivid Memory):**\n';
    storySoFar += proseChapters.map(chapter => {
      const prose = chapter.proseChapter || 'No prose chapter was recorded for this day.';
      return `**End of Day ${chapter.dayNumber} Summary:**\n${prose}`;
    }).join('\n\n---\n\n');
  }

  if (!storySoFar.trim()) {
    return null;
  }

  return `
---
### Recent History (Hybrid Novel)
Recent days are detailed in prose. As they age, they fade into bullet-point summaries.
---
${storySoFar.trim()}`;
}

export function assembleHybridMemory(
  novelChapters: NovelChapter[] = [],
  fullHistory: DayLog[] = [],
  currentDay: number,
  playthroughSummaries: string[] = [],
): string {
  const memoryParts: string[] = [];

  const contiguousCycles = countContiguousVolumes(playthroughSummaries);
  const maxArchivedCycles = Math.max(0, contiguousCycles - 1);
  const { section: volumeSection, includedCycles } = buildArchivedVolumeSection(
    playthroughSummaries,
    maxArchivedCycles
  );
  if (volumeSection) {
    memoryParts.push(volumeSection);
  }

  const hybridSection = buildHybridNovelSection(novelChapters, includedCycles * 14, 2);
  if (hybridSection) {
    memoryParts.push(hybridSection);
  }

  const recencyWindow = 2;
  const recentDays = fullHistory.filter(dayLog =>
    dayLog.day >= currentDay - recencyWindow && dayLog.day < currentDay
  );

  if (recentDays.length > 0) {
    const recentTranscript = mapFullHistoryForAI(recentDays);
    const transcriptSection = `
---
### Short-Term Memory (Recent Events Transcript)
This is the complete, verbatim dialogue transcript from the last two days. This is your most important and reliable memory. You MUST prioritize this section to perfectly recall a character's recent speaking style, specific promises, emotional state, and the exact nuance of recent conversations.
---
${JSON.stringify(recentTranscript, null, 2)}`;
    memoryParts.push(transcriptSection);
  }

  if (memoryParts.length === 0) {
    return "The story has just begun.";
  }

  return memoryParts.join('\n\n');
}

/**
 * Assembles hybrid memory with custom recent past days (for Transition Director).
 * This allows including current day segments (except the one that just ended) in Recent Past.
 */
export function assembleHybridMemoryWithRecentPast(
  novelChapters: NovelChapter[] = [],
  recentPastDays: DayLog[],
  currentDay: number,
  playthroughSummaries: string[] = [],
): string {
  const memoryParts: string[] = [];

  const contiguousCycles = countContiguousVolumes(playthroughSummaries);
  const maxArchivedCycles = Math.max(0, contiguousCycles - 1);
  const { section: volumeSection, includedCycles } = buildArchivedVolumeSection(
    playthroughSummaries,
    maxArchivedCycles
  );
  if (volumeSection) {
    memoryParts.push(volumeSection);
  }

  const hybridSection = buildHybridNovelSection(novelChapters, includedCycles * 14, 2);
  if (hybridSection) {
    memoryParts.push(hybridSection);
  }

  if (recentPastDays.length > 0) {
    const recentTranscript = mapFullHistoryForAI(recentPastDays);
    const transcriptSection = `
---
### Short-Term Memory (Recent Events Transcript)
This is the complete, verbatim dialogue transcript from the last two days plus the current day's previous segments (excluding the segment that just ended). This is your most important and reliable memory. You MUST prioritize this section to perfectly recall a character's recent speaking style, specific promises, emotional state, and the exact nuance of recent conversations.
---
${JSON.stringify(recentTranscript, null, 2)}`;
    memoryParts.push(transcriptSection);
  }

  if (memoryParts.length === 0) {
    return "The story has just begun.";
  }

  return memoryParts.join('\n\n');
}

/**
 * Builds a long-term narrative memory string that combines archived cycle summaries
 * with the hybrid novel view, but omits the short-term transcript section.
 * Useful for personas that already receive explicit transcript payloads.
 */
type VolumeContextConfig = number | {
  recentTranscriptBuffer?: number;
  maxProseCount?: number;
};

export function assembleVolumeAwareNovelContext(
  novelChapters: NovelChapter[] = [],
  playthroughSummaries: string[] = [],
  config?: VolumeContextConfig,
): string {
  const memoryParts: string[] = [];

  const recentTranscriptBuffer =
    typeof config === 'number'
      ? config
      : config?.recentTranscriptBuffer ?? 2;

  const maxProseCount =
    typeof config === 'object' && config !== null && typeof config.maxProseCount === 'number'
      ? config.maxProseCount
      : 12;

  const contiguousCycles = countContiguousVolumes(playthroughSummaries);
  const maxArchivedCycles = Math.max(0, contiguousCycles - 1);
  const { section: volumeSection, includedCycles } = buildArchivedVolumeSection(
    playthroughSummaries,
    maxArchivedCycles
  );
  if (volumeSection) {
    memoryParts.push(volumeSection);
  }

  const hybridSection = buildHybridNovelSection(
    novelChapters,
    includedCycles * 14,
    Math.max(0, recentTranscriptBuffer),
    maxProseCount,
  );
  if (hybridSection) {
    memoryParts.push(hybridSection);
  }

  if (memoryParts.length === 0) {
    return "The story has just begun.";
  }

  return memoryParts.join('\n\n');
}

export function assembleNovelistMemory(
  novelChapters: NovelChapter[] = [],
  playthroughSummaries: string[] = [],
): string {
  return assembleVolumeAwareNovelContext(novelChapters, playthroughSummaries, {
    recentTranscriptBuffer: 0,
    maxProseCount: 13,
  });
}

/**
 * A robust function to clean and sanitize AI-generated text by removing
 * non-printable control characters and normalizing whitespace.
 * @param text The raw text to clean.
 * @returns A cleaned, safe string.
 */
function sanitizeString(text: string): string {
  if (typeof text !== 'string') return text;
  // This regex removes most non-printable ASCII control characters and the Unit Separator.
 const cleanedText = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
  
  return cleanedText
    .replace(/```/g, '')      // Remove triple backticks
    .replace(/`/g, "'")       // Replace single backticks with apostrophes
    .replace(/\\n/g, '\n')    // Normalize newlines
    .replace(/\\t/g, ' ')     // Normalize tabs to spaces
    .replace(/[ \t]+/g, ' ')  // Only condense multiple spaces and tabs
    .trim();
}

/**
 * Recursively traverses an object or array and applies a sanitization
 * function to all string values, preserving the original type structure.
 * @param data The object or array to sanitize.
 * @returns The sanitized data, with the same type as the input.
 */
export function sanitizeObject<T>(data: T): T {
  if (Array.isArray(data)) {
    return (data as any[]).map(item => sanitizeObject(item)) as unknown as T;
  }
  if (data !== null && typeof data === 'object') {
    const newData: { [key: string]: any } = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        newData[key] = sanitizeObject((data as any)[key]);
      }
    }
    return newData as T;
  }
  if (typeof data === 'string') {
    return sanitizeString(data) as unknown as T;
  }
  return data;
}
