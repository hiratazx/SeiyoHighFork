// src/db.ts
import Dexie, { Table } from 'dexie';
import { AppState, EndOfDayStep, NewGameStep, SegmentTransitionStep } from './types';
import { DB_NAME, LEGACY_DB_NAME } from './storyConfig';
import { devLog, devWarn } from './lib/devLog';

// Main App State
export interface DbAppState {
  id: number; // Primary key (constant: 1)
  state: AppState;
}

// Generic Pipeline Data (intermediate results)
export interface DbPipelineData {
  key: string; // Primary key (e.g., EOD_KEY_CAST_ANALYST_RAW)
  data: any;   // Can be any JSON-serializable data
}

// Pipeline Step Trackers
export interface DbStepData {
  id: string; // Primary key (e.g., EOD_STEP_KEY, NEW_GAME_STEP_KEY)
  step: number | string; // Current step value (number or '0.5')
}

// Pipeline Error Storage
export interface DbErrorData {
   id: string; // Primary key (e.g., EOD_KEY_ERRORS, NEW_GAME_KEY_ERRORS)
   errors: { [step: number]: string | undefined }; // Error object keyed by step number
}

// ========== GENERATIVE IMAGE STORAGE ==========
/**
 * Stores generated background images in IndexedDB.
 * This keeps large blobs out of the main AppState for better performance.
 */
export interface GeneratedLocation {
  /** Primary Key: "{location_key}_{segment}" e.g., "school_rooftop_evening" */
  id: string;
  /** Human readable location name */
  name: string;
  /** Time segment: "Morning", "Afternoon", "Evening", "Night" */
  segment: string;
  /** The full visual description - the prompt used to generate this image */
  prompt: string;
  /** Concise one-sentence summary for location lists (avoids context bloat) */
  summary: string;
  /** The actual image file as a Blob */
  blob: Blob;
  /** Timestamp when this was created */
  createdAt: number;
}

export class AppDatabase extends Dexie {
  // Declare tables with explicit types
  appState!: Table<DbAppState, number>;
  pipelineData!: Table<DbPipelineData, string>;
  stepData!: Table<DbStepData, string>;
  errorData!: Table<DbErrorData, string>;
  // [GENERATIVE IMAGES] New table for generated background images
  generatedLocations!: Table<GeneratedLocation, string>;


  constructor() {
    super(DB_NAME); // Story-specific DB name from storyConfig.ts
    // FIX: Cast 'this' to Dexie to resolve a TypeScript type inference issue
    // where the 'version' method from the base class is not being correctly identified.
    
    // Version 1: Original schema
    (this as Dexie).version(1).stores({
      appState: 'id',          // Index 'id'
      pipelineData: 'key',     // Index 'key'
      stepData: 'id',          // Index 'id'
      errorData: 'id',         // Index 'id' for errors table
    });
    
    // Version 2: Add generatedLocations table for AI-generated backgrounds
    (this as Dexie).version(2).stores({
      appState: 'id',
      pipelineData: 'key',
      stepData: 'id',
      errorData: 'id',
      generatedLocations: 'id, segment', // Index by ID (primary) and segment (for queries)
    });
  }
}

// Export singleton instance
export const db = new AppDatabase();

// ========== HELPER FUNCTIONS FOR GENERATED LOCATIONS ==========

/**
 * Summary of a generated location for AI context.
 * Lightweight version without the blob data - uses concise summary not full prompt.
 */
export interface GeneratedLocationSummary {
  /** Canonical ID: "{location}_{segment}" */
  id: string;
  /** Human-readable name */
  name: string;
  /** Time segment: Morning, Afternoon, Evening, Night */
  segment: string;
  /** Concise one-sentence summary of the location (for lists, avoids context bloat) */
  summary: string;
}

/**
 * Get all known location IDs from IndexedDB.
 * Used to tell backend which images we already have cached.
 */
export async function getKnownLocationIds(): Promise<string[]> {
  const locations = await db.generatedLocations.toArray();
  return locations.map(l => l.id);
}

/**
 * Get summaries of all generated locations.
 * Used to provide AI context about available cached backgrounds.
 * @param segment Optional - if provided, only returns locations for that segment
 */
export async function getGeneratedLocationSummaries(segment?: string): Promise<GeneratedLocationSummary[]> {
  let locations = await db.generatedLocations.toArray();
  
  // Filter by segment if provided (case-insensitive comparison)
  if (segment) {
    const segmentLower = segment.toLowerCase();
    locations = locations.filter(l => l.segment.toLowerCase() === segmentLower);
  }
  
  return locations.map(l => ({
    id: l.id,
    name: l.name,
    segment: l.segment,
    summary: l.summary || l.prompt.slice(0, 100), // Fallback for old data
  }));
}

/**
 * Store a generated background image in IndexedDB.
 */
export async function storeGeneratedLocation(
  id: string,
  name: string,
  segment: string,
  prompt: string,
  summary: string,
  blob: Blob
): Promise<void> {
  await db.generatedLocations.put({
    id,
    name,
    segment,
    prompt,
    summary,
    blob,
    createdAt: Date.now(),
  });
}

/**
 * Get a generated location by ID.
 */
export async function getGeneratedLocation(id: string): Promise<GeneratedLocation | undefined> {
  return db.generatedLocations.get(id);
}

/**
 * Clear all generated locations (useful for new playthroughs or debugging).
 */
export async function clearGeneratedLocations(): Promise<void> {
  await db.generatedLocations.clear();
}

// ========== LEGACY DB MIGRATION ==========

/**
 * Migrate data from the legacy database to the new story-scoped database.
 * This ensures backwards compatibility when renaming from VnAppStateDatabase_v1 to SeiyoHigh_v1.
 * 
 * Called once on app init. Safe to call multiple times - it's a no-op if:
 * - Legacy DB doesn't exist
 * - New DB already has data (already migrated)
 * 
 * @returns true if migration was performed, false otherwise
 */
export async function migrateFromLegacyDb(): Promise<boolean> {
  // Check if legacy DB exists
  const legacyExists = await Dexie.exists(LEGACY_DB_NAME);
  if (!legacyExists) {
    devLog('[DB Migration] No legacy DB found, skipping migration');
    return false;
  }
  
  // Check if new DB already has data (already migrated)
  const hasData = await db.appState.count() > 0;
  if (hasData) {
    devLog('[DB Migration] New DB already has data, skipping migration');
    return false;
  }
  
  devLog(`[DB Migration] Migrating from ${LEGACY_DB_NAME} to ${DB_NAME}...`);
  
  // Open legacy DB with same schema
  const legacyDb = new Dexie(LEGACY_DB_NAME);
  legacyDb.version(2).stores({
    appState: 'id',
    pipelineData: 'key',
    stepData: 'id',
    errorData: 'id',
    generatedLocations: 'id, segment',
  });
  
  try {
    // Copy all tables
    const appState = await legacyDb.table('appState').toArray();
    const pipelineData = await legacyDb.table('pipelineData').toArray();
    const stepData = await legacyDb.table('stepData').toArray();
    const errorData = await legacyDb.table('errorData').toArray();
    const locations = await legacyDb.table('generatedLocations').toArray();
    
    // Bulk insert into new DB
    if (appState.length) await db.appState.bulkPut(appState);
    if (pipelineData.length) await db.pipelineData.bulkPut(pipelineData);
    if (stepData.length) await db.stepData.bulkPut(stepData);
    if (errorData.length) await db.errorData.bulkPut(errorData);
    if (locations.length) await db.generatedLocations.bulkPut(locations);
    
    devLog(`[DB Migration] Successfully migrated to ${DB_NAME}:`, {
      appState: appState.length,
      pipelineData: pipelineData.length,
      stepData: stepData.length,
      errorData: errorData.length,
      generatedLocations: locations.length,
    });
    
    return true;
  } catch (error) {
    console.error('[DB Migration] Error during migration:', error);
    throw error;
  } finally {
    legacyDb.close();
  }
}
