/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import { AppState, EndOfDayStep, EvolvingStoryArc, NewGameStep } from '../types';
import { db, GeneratedLocation, storeGeneratedLocation, clearGeneratedLocations } from '../db';
import { devLog, devWarn, devDebug } from '../lib/devLog';

/**
 * Normalizes an ownerId to extract just the first name.
 * The AI sometimes outputs full names like "Hina Sato" but character configs use first names only ("Hina").
 */
function normalizeOwnerId(rawOwnerId: string | undefined | null): string {
    if (!rawOwnerId) return 'Unknown';
    if (rawOwnerId === 'System' || rawOwnerId === 'Unknown') return rawOwnerId;
    // Extract first name (first word) from potentially full name
    const firstName = rawOwnerId.trim().split(/\s+/)[0];
    return firstName || rawOwnerId;
}

/**
 * [NEW] Backfill ownerId for legacy story arcs that don't have it.
 * [FIX] Also normalizes ownerId to first name only (AI sometimes outputs full names).
 * This ensures all arcs have an explicit owner for the "needing arcs" logic.
 */
function backfillArcOwners(storyArcs: EvolvingStoryArc[] | null): EvolvingStoryArc[] | null {
    if (!storyArcs || storyArcs.length === 0) return storyArcs;

    return storyArcs.map(arc => {
        let rawOwnerId = (arc as any).ownerId;

        // 1. If ownerId doesn't exist, derive it
        if (!rawOwnerId) {
            // EXCEPTION: Handle Global Adventure Arc
            if (arc.id === 'global_adventure_arc') {
                rawOwnerId = 'System';
            } else {
                // HEURISTIC: First character in involvedCharacters is the owner.
                rawOwnerId = (arc.involvedCharacters && arc.involvedCharacters.length > 0)
                    ? arc.involvedCharacters[0]
                    : 'Unknown';
            }
        }

        // 2. Normalize to first name only (AI sometimes outputs full names like "Hina Sato")
        const ownerId = normalizeOwnerId(rawOwnerId);

        return { ...arc, ownerId };
    });
}

export const migrateSaveFile = (importedState: any): AppState => {
  const migratedState = { ...importedState };

  // 1. Add Robustness Trackers (if they don't exist)
  if (migratedState.endOfDayStep === undefined) {
    migratedState.endOfDayStep = EndOfDayStep.NOT_STARTED;
  }
  if (migratedState.newGameStep === undefined) {
    migratedState.newGameStep = NewGameStep.NOT_STARTED;
  }
  if (migratedState.isSegmentAnalysisComplete === undefined) {
    migratedState.isSegmentAnalysisComplete = false;
  }

  // 2. Add New Curiosity & Backstory Systems (if they don't exist)
  if (migratedState.playerBackstory === undefined) {
    migratedState.playerBackstory = null;
  }
  if (migratedState.unaskedQuestions === undefined) {
    migratedState.unaskedQuestions = null;
  }

  if (migratedState.characterBiographies === undefined) {
    migratedState.characterBiographies = {};
  }

  // 3. Migrate fleshedOutCharacterProfiles to evolvingPersonas
  if (migratedState.fleshedOutCharacterProfiles !== undefined) {
    migratedState.evolvingPersonas = migratedState.fleshedOutCharacterProfiles;
    delete migratedState.fleshedOutCharacterProfiles;
  }
// FIX: Remove deprecated key management properties during migration.
  if (migratedState.keyIndexes !== undefined) {
    delete migratedState.keyIndexes;
  }
  if (migratedState.keyMode !== undefined) {
    delete migratedState.keyMode;
  }

  // 5. Clean up deprecated newGameCache
  if (migratedState.newGameCache !== undefined) {
    delete migratedState.newGameCache;
  }

  // [NEW] 6. Initialize Character Traits (Backwards Compatibility)
  // This ensures the field exists (as null) so the Character Developer can
  // detect it and trigger the "Retrofit Protocol" to generate them.
  if (migratedState.characterTraits === undefined) {
    migratedState.characterTraits = null;
  }

  if (!Array.isArray(migratedState.playthroughSummaries)) {
    migratedState.playthroughSummaries = [];
  }

  // [NEW] 7. Backfill ownerId for legacy story arcs
  // This ensures all arcs have an explicit owner for the "needing arcs" logic.
  if (migratedState.storyArcs) {
    migratedState.storyArcs = backfillArcOwners(migratedState.storyArcs);
  }

  // [GENERATIVE IMAGES] 8. Initialize location state if missing
  if (migratedState.currentLocationId === undefined) {
    migratedState.currentLocationId = undefined;
  }
  if (migratedState.currentLocationDescription === undefined) {
    migratedState.currentLocationDescription = undefined;
  }

  return migratedState as AppState;
};

// ========== GENERATIVE IMAGES: HYDRATED EXPORT/IMPORT ==========

/**
 * Represents a generated location in export format (Base64 instead of Blob).
 */
interface ExportedGeneratedLocation {
  id: string;
  name: string;
  segment: string;
  prompt: string;
  /** Concise summary for AI context */
  summary?: string;
  /** Base64-encoded image data */
  data: string;
  /** MIME type */
  mime: string;
  createdAt: number;
}

/**
 * Represents a hydrated save file with embedded assets.
 * Note: Generated character sprites are stored directly in character.image as base64 data URLs,
 * so they're included in the gameState and don't need separate handling.
 */
export interface HydratedSaveFile {
  gameState: AppState;
  assets: ExportedGeneratedLocation[];
  version: number;
}

/**
 * Convert a Blob to Base64 string.
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert Base64 string to Blob.
 */
async function base64ToBlob(base64: string, mime: string): Promise<Blob> {
  const response = await fetch(`data:${mime};base64,${base64}`);
  return response.blob();
}

/**
 * Export the current game state with all generated assets bundled.
 * 
 * This creates a portable save file that includes all AI-generated
 * backgrounds, so the full visual experience is preserved when importing.
 * 
 * @param state The current AppState to export
 * @returns A HydratedSaveFile object containing state + assets
 * 
 * @example
 * ```typescript
 * const hydrated = await exportHydratedSave(getCurrentState());
 * const json = JSON.stringify(hydrated);
 * // Download as file...
 * ```
 */
export async function exportHydratedSave(state: AppState): Promise<HydratedSaveFile> {
  // Fetch all generated locations from IndexedDB
  const generatedLocations = await db.generatedLocations.toArray();
  
  // Filter out entries with invalid blobs (can happen from corrupted data)
  const validLocations = generatedLocations.filter(loc => loc.blob instanceof Blob);
  if (validLocations.length < generatedLocations.length) {
    devWarn(`[exportHydratedSave] Skipped ${generatedLocations.length - validLocations.length} locations with invalid blobs`);
  }
  
  // Convert Blobs to Base64 for JSON serialization
  const assets: ExportedGeneratedLocation[] = await Promise.all(
    validLocations.map(async (loc) => ({
      id: loc.id,
      name: loc.name,
      segment: loc.segment,
      prompt: loc.prompt,
      summary: loc.summary,
      data: await blobToBase64(loc.blob),
      // Use actual blob MIME type - will be 'image/webp' after compression, or original if fallback
      mime: loc.blob.type || 'image/png',
      createdAt: loc.createdAt,
    }))
  );
  
  devLog(`[exportHydratedSave] Exported ${assets.length} generated locations`);
  // Note: Generated character sprites are stored directly in character.image as base64 data URLs,
  // so they're automatically included in the gameState export.
  
  return {
    gameState: state,
    assets,
    version: 2,
  };
}

/**
 * Import a hydrated save file, restoring both state and generated assets.
 * 
 * This restores the full visual experience by:
 * 1. Importing all bundled assets to IndexedDB
 * 2. Migrating the game state
 * 
 * @param hydratedSave The imported HydratedSaveFile object
 * @returns The migrated AppState
 * 
 * @example
 * ```typescript
 * const imported = JSON.parse(fileContent);
 * const state = await importHydratedSave(imported);
 * // Load state into game...
 * ```
 */
export async function importHydratedSave(hydratedSave: HydratedSaveFile | any): Promise<AppState> {
  // Handle both old-style (just state) and new-style (hydrated) save files
  const isHydrated = hydratedSave.gameState !== undefined && hydratedSave.assets !== undefined;
  
  // [GENERATIVE IMAGES] Always clear existing generated locations before import
  // This ensures a clean slate regardless of save file type
  // Note: Generated character sprites are stored directly in character.image as base64 data URLs,
  // so they're automatically included in the gameState import.
  devLog('[importHydratedSave] Clearing existing generated locations...');
  await clearGeneratedLocations();
  
  if (!isHydrated) {
    // Old-style save file - just migrate the state
    devLog('[importHydratedSave] Old-style save detected, no assets to import');
    return migrateSaveFile(hydratedSave);
  }
  
  // Import assets first (before loading state)
  const assets = hydratedSave.assets as ExportedGeneratedLocation[];
  
  if (assets && assets.length > 0) {
    devLog(`[importHydratedSave] Importing ${assets.length} generated locations...`);
    
    for (const asset of assets) {
      try {
        const blob = await base64ToBlob(asset.data, asset.mime);
        await storeGeneratedLocation(
          asset.id,
          asset.name,
          asset.segment,
          asset.prompt,
          asset.summary || '',
          blob
        );
      } catch (error) {
        devWarn(`[importHydratedSave] Failed to import asset ${asset.id}:`, error);
      }
    }
    
    devLog('[importHydratedSave] Asset import complete');
  }
  
  // Migrate the game state
  const migratedState = migrateSaveFile(hydratedSave.gameState);
  
  // [MIGRATION] Backfill currentLocationId for OLD saves that have assets but no location ID
  // New saves already have currentLocationId - this is ONLY for legacy migration
  if (migratedState.currentLocationId) {
    devLog(`[importHydratedSave] Using saved currentLocationId: ${migratedState.currentLocationId}`);
  } else if (assets && assets.length > 0) {
    // Find the most recent location from history
    let lastLocation: string | undefined;
    
    // Check sceneQueue first (current scene)
    if (migratedState.sceneQueue && migratedState.sceneQueue.length > 0) {
      const lastEntry = migratedState.sceneQueue[migratedState.sceneQueue.length - 1];
      devLog('[importHydratedSave] Last sceneQueue entry:', lastEntry);
      if (lastEntry.location) {
        lastLocation = lastEntry.location;
      }
    }
    
    // Fall back to history if sceneQueue doesn't have it
    if (!lastLocation && migratedState.history && migratedState.history.length > 0) {
      const lastEntry = migratedState.history[migratedState.history.length - 1];
      devLog('[importHydratedSave] Last history entry:', lastEntry);
      if (lastEntry.location) {
        lastLocation = lastEntry.location;
      }
    }
    
    devLog('[importHydratedSave] Found lastLocation:', lastLocation);
    
    // Match to an asset - extract filename from URL if it's a URL
    if (lastLocation) {
      let normalizedLocation: string;
      
      // Check if it's a URL - extract filename
      const urlMatch = lastLocation.match(/\/([^\/]+)\.(jpg|jpeg|png|webp)$/i);
      if (urlMatch) {
        // It's a URL like "https://...school-kendo-dojo-evening.jpg"
        normalizedLocation = urlMatch[1].replace(/-/g, '_').toLowerCase();
      } else {
        // It's already a location ID
        normalizedLocation = lastLocation.toLowerCase().replace(/[^a-z0-9_]/g, '').replace(/ /g, '_');
      }
      
      devLog('[importHydratedSave] Normalized location:', normalizedLocation);
      devLog('[importHydratedSave] Asset IDs:', assets.map(a => a.id));
      const matchingAsset = assets.find(a => a.id.toLowerCase() === normalizedLocation);
      if (matchingAsset) {
        devLog(`[importHydratedSave] Backfilled currentLocationId from history: ${matchingAsset.id}`);
        migratedState.currentLocationId = matchingAsset.id;
      } else {
        devLog('[importHydratedSave] No matching asset found for location');
      }
    } else {
      devLog('[importHydratedSave] No location found in history/sceneQueue');
    }
  }
  
  return migratedState;
}

/**
 * Check if a save file is a hydrated save (contains assets).
 */
export function isHydratedSave(data: any): data is HydratedSaveFile {
  return data && typeof data === 'object' && 
         data.gameState !== undefined && 
         Array.isArray(data.assets);
}
