/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React, { useState, useEffect, useRef } from 'react';
import { TranslationSet } from '../lib/translations';
import { DayLog } from '../types';

interface ReplayMenuProps {
  /** History from the active game session */
  fullHistory: DayLog[];
  /** History imported from another save file (for viewing other playthroughs) */
  importedHistory: DayLog[] | null;
  /** Handler for importing a save file for replay */
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Handler to start replay - receives the full DayLog and source ('active' or 'imported') */
  onStartReplay: (dayLog: DayLog, source: 'active' | 'imported') => void;
  /** Handler to clear imported data and return to active game view */
  onClearImported: () => void;
  onBackToMenu: () => void;
  t: TranslationSet;
}

export const ReplayMenu: React.FC<ReplayMenuProps> = ({
  fullHistory,
  importedHistory,
  onImport,
  onStartReplay,
  onClearImported,
  onBackToMenu,
  t,
}) => {
  // Track which source the user wants to view
  const [viewSource, setViewSource] = useState<'active' | 'imported'>('active');
  
  // Track if we're waiting for an import to complete
  const pendingImportRef = useRef(false);
  
  // Auto-switch to imported view when import completes
  useEffect(() => {
    if (pendingImportRef.current && importedHistory && importedHistory.length > 0) {
      setViewSource('imported');
      pendingImportRef.current = false;
    }
  }, [importedHistory]);
  
  // Determine which history to display
  const historyToShow = viewSource === 'imported' && importedHistory 
    ? importedHistory 
    : fullHistory;
  
  // Sort days numerically
  const availableDays = [...historyToShow].sort((a, b) => a.day - b.day);
  
  const hasActiveHistory = fullHistory.length > 0;
  const hasImportedHistory = importedHistory && importedHistory.length > 0;

  return (
    <div className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center p-8">
      <div className="vn-modal-panel max-w-4xl w-full max-h-[90vh] flex flex-col">
        <h2 className="text-3xl font-bold text-center mb-6 text-shadow-medium flex-shrink-0">
          {t.replay || "Replay Memories"}
        </h2>

        {/* Source Toggle - only show if we have imported data */}
        {hasImportedHistory && (
          <div className="flex justify-center gap-4 mb-6 flex-shrink-0">
            <button
              onClick={() => setViewSource('active')}
              className={`px-4 py-2 rounded-lg transition-all ${
                viewSource === 'active' 
                  ? 'bg-cyan-600 text-white' 
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
              }`}
            >
              {t.yourMemories || "Your Memories"} ({fullHistory.length})
            </button>
            <button
              onClick={() => setViewSource('imported')}
              className={`px-4 py-2 rounded-lg transition-all ${
                viewSource === 'imported' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
              }`}
            >
              {t.importedSave || "Imported Save"} ({importedHistory.length})
            </button>
          </div>
        )}

        {/* Main Content Area */}
        {availableDays.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <p className="text-xl text-gray-400 italic">
              {viewSource === 'imported' 
                ? (t.noImportedMemories || "No memories in imported save.")
                : (t.noMemoriesYet || "No memories recorded yet. Start playing to create memories!")}
            </p>
            
            {/* Import button when no active history */}
            {!hasActiveHistory && (
              <label className="vn-primary-button cursor-pointer">
                {t.importSaveToReplay || "Import Save to Replay"}
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    pendingImportRef.current = true;
                    onImport(e);
                  }}
                  aria-label={t.importSaveToReplay || "Import Save to Replay"}
                />
              </label>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-2 min-h-0">
            <div className="flex flex-col items-center gap-4">
              <h3 className="text-xl text-gray-300 flex-shrink-0">
                {t.selectDayToReplay || "Select a day to replay"}
              </h3>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3 mt-4 w-full">
                {availableDays.map((dayLog) => (
                  <button
                    key={dayLog.day}
                    onClick={() => onStartReplay(dayLog, viewSource)}
                    className={`py-3 text-lg rounded-lg transition-colors ${
                      viewSource === 'imported'
                        ? 'bg-purple-700/50 hover:bg-purple-600/60 border border-purple-500/30'
                        : 'vn-secondary-button hover:bg-cyan-600/50'
                    }`}
                    aria-label={`${t.day || "Day"} ${dayLog.day}`}
                  >
                    {t.day || "Day"} {dayLog.day}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="mt-8 pt-4 border-t border-white/10 flex-shrink-0 flex flex-wrap justify-center gap-4">
          {/* Import Another Save - always available when there's active history */}
          {hasActiveHistory && (
            <label className="vn-secondary-button cursor-pointer px-4">
              {t.viewOtherSave || "View Other Save"}
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  // Mark that we're waiting for import, then trigger it
                  // useEffect will switch viewSource when data arrives
                  pendingImportRef.current = true;
                  onImport(e);
                }}
                aria-label={t.viewOtherSave || "View Other Save"}
              />
            </label>
          )}
          
          {/* Clear Imported - only when viewing imported data */}
          {hasImportedHistory && viewSource === 'imported' && (
            <button 
              onClick={() => {
                onClearImported();
                setViewSource('active');
              }} 
              className="vn-secondary-button px-4 text-red-300 hover:text-red-200"
            >
              {t.clearImported || "Clear Imported"}
            </button>
          )}
          
          <button onClick={onBackToMenu} className="vn-secondary-button px-8">
            {t.menu || "Menu"}
          </button>
        </div>
      </div>
    </div>
  );
};
