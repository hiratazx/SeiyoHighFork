/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import { CharacterConfig } from '../types';
import { devLog } from './devLog';

// Define common honorifics/suffixes (consider adding more if needed)
// Regex explanation: Matches optional whitespace (\s*), then a hyphen or space ([- ]?), then the suffix, anchored to the end ($). Case-insensitive (i).
const honorificRegex = /(\s*[- ]?(san|sama|kun|chan|sensei|senpai|kohai))\s*$/i;

/**
 * Checks if a speaker's name (which could include honorifics or be a full name)
 * corresponds to a specific character. Strips common honorifics before matching.
 * @param speakerName The name from the AI's response (e.g., "Nana Asahi", "Asahi Nana", "Nana", "Satoshi-sensei").
 * @param character The character object, which contains 'name' (firstName) and 'lastName'.
 * @returns True if it's a match, false otherwise.
 */
export const isCharacterMatch = (speakerName: string | undefined, character: CharacterConfig): boolean => {
  if (!speakerName || !character) return false;

  // Clean the speaker name by removing common honorifics
  const cleanedSpeakerName = speakerName.replace(honorificRegex, '').trim();

  // If cleaning resulted in an empty string, it wasn't a valid name match
  if (!cleanedSpeakerName) return false;

  // Case 1: Direct match with the first name (e.g., "Nana")
  if (cleanedSpeakerName === character.name) {
    return true;
  }

  // Case 2: Match full name (first + last, any order)
  // Ensure lastName exists before checking includes
  if (character.lastName && 
      cleanedSpeakerName.includes(character.name) && 
      cleanedSpeakerName.includes(character.lastName)) {
    return true;
  }
  
  // Case 3: Handle potential full name match where AI might only return first name from config
  // (e.g., AI returns "Nana Asahi", config only has character.name = "Nana")
  // Check if the cleaned name *starts with* the character's first name, followed by a space
  // This is less strict but can catch cases where AI uses full name but config doesn't.
  if (cleanedSpeakerName.startsWith(character.name + ' ')) {
      // Optional: Add a check here if lastName exists to make it more robust
      if (!character.lastName || cleanedSpeakerName.includes(character.lastName)) {
          return true;
      }
  }

  return false;
};

/**
 * Normalizes a character name from the AI response to match the character config's name.
 * Handles cases where AI returns full names (e.g., "Nana Asahi") but config only has first name ("Nana").
 * @param aiName The name from the AI response (could be first name, full name, or with honorifics)
 * @param allCharacters Array of all character configs to search
 * @returns The normalized character name from the config, or the ORIGINAL name for ghost characters
 */
export const normalizeCharacterName = (aiName: string | undefined, allCharacters: CharacterConfig[]): string | null => {
  if (!aiName) return null;

  // Special case: "Narrator" should pass through unchanged (for solo scenes with no characters)
  if (aiName === 'Narrator' || aiName.toLowerCase() === 'narrator') {
    return 'Narrator';
  }

  // First, try direct match (most common case)
  const directMatch = allCharacters.find(c => c.name === aiName);
  if (directMatch) return directMatch.name;

  // Use isCharacterMatch to find the character
  const matchedCharacter = allCharacters.find(c => isCharacterMatch(aiName, c));
  if (matchedCharacter) return matchedCharacter.name;

  // If still no match, try case-insensitive first name match
  const caseInsensitiveMatch = allCharacters.find(c => 
    c.name.toLowerCase() === aiName.toLowerCase() || 
    aiName.toLowerCase().startsWith(c.name.toLowerCase() + ' ')
  );
  if (caseInsensitiveMatch) return caseInsensitiveMatch.name;

  // [FIX] Ghost characters: Return the original name instead of null
  // This allows player-introduced characters (e.g., "my brother Keitaro") to pass through
  // The frontend handles unknown character names gracefully (shows dialogue without sprite)
  devLog(`[normalizeCharacterName] Unknown character "${aiName}" - treating as ghost character (no sprite)`);
  return aiName;
};
