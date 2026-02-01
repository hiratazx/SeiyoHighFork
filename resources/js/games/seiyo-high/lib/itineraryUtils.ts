/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import { DailyItinerary, DaySegment, ItinerarySegment } from '../types';

// The single source of truth for valid segment names.
const VALID_SEGMENTS: DaySegment[] = ['Morning', 'Afternoon', 'Evening', 'Night'];

/**
 * Validates a single itinerary segment.
 * Checks if the segment name is one of the allowed values.
 * @param segment The ItinerarySegment object from the AI.
 * @returns True if the segment is valid, false otherwise.
 */
function isValidSegment(segment: ItinerarySegment): boolean {
  if (!segment || typeof segment.segment !== 'string') return false;
  return VALID_SEGMENTS.includes(segment.segment as DaySegment);
}

/**
 * Validates a full daily itinerary.
 * Checks for the correct number of segments and ensures each one has a valid name.
 * @param itinerary The DailyItinerary object from the AI.
 * @returns True if the entire day's plan is valid, false otherwise.
 */
export function isDailyItineraryValid(itinerary: DailyItinerary): boolean {
  if (!itinerary || !Array.isArray(itinerary.segments) || itinerary.segments.length !== VALID_SEGMENTS.length) {
    console.error(`Validation failed: Itinerary does not have exactly ${VALID_SEGMENTS.length} segments.`);
    return false;
  }

  for (const segment of itinerary.segments) {
    if (!isValidSegment(segment)) {
      console.error(`Validation failed: Invalid segment name found: "${segment.segment}"`);
      return false;
    }
  }

  return true;
}

/**
 * Validates a potentially revised itinerary segment from the Transition Director.
 * This is a simpler check as it only deals with a single, optional segment.
 * @param segment The optional ItinerarySegment object from the AI.
 * @returns True if the segment is valid or null/undefined, false otherwise.
 */
export function isRevisedSegmentValid(segment: ItinerarySegment | undefined | null): boolean {
    if (!segment) {
        return true; // No revision is a valid state.
    }
    return isValidSegment(segment);
}

/**
 * Replaces all instances of the {PLAYER_NAME} placeholder in a daily itinerary
 * with the actual player's name.
 * @param itinerary The DailyItinerary object to process.
 * @param playerName The player's name to insert.
 * @returns The processed itinerary with the player's name.
 */
export function processItineraryPlaceholders(itinerary: DailyItinerary, playerName: string): DailyItinerary {
  const replace = (text: string | null | undefined) =>
    typeof text === 'string' ? text.replace(/{PLAYER_NAME}/g, playerName) : (text ?? '');

  // Deep copy to avoid mutating the original object state, which can cause unexpected side effects.
  const processedItinerary = JSON.parse(JSON.stringify(itinerary));

  processedItinerary.day_theme = replace(processedItinerary.day_theme);
  if (Array.isArray(processedItinerary.segments)) {
    for (const segment of processedItinerary.segments) {
      segment.scenarioProse = replace(segment.scenarioProse);
    }
  }
  return processedItinerary;
}