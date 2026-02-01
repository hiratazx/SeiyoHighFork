/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import { AppState, EndOfDayStep, NewGameStep } from './types';

export const migrateSaveFile = (importedState: any): AppState => {
  const migratedState = { ...importedState };

  // 1. Add Robustness Trackers (if they don't exist)
  if (migratedState.endOfDayStep === undefined) {
    migratedState.endOfDayStep = EndOfDayStep.NOT_STARTED;
  }
  if (migratedState.newGameStep === undefined) {
    migratedState.newGameStep = NewGameStep.NOT_STARTED;
  }
  if (migratedState.newGameCache === undefined) {
    migratedState.newGameCache = null;
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

  return migratedState as AppState;
};