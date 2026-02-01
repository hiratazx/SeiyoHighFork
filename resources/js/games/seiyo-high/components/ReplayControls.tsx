/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React from 'react';
import { TranslationSet } from '../lib/translations';
import { DaySegment } from '../types';

interface ReplayControlsProps {
  isPaused: boolean;
  speed: number;
  showOriginalLanguage: boolean;
  availableSegments: DaySegment[];
  currentSegment: DaySegment | null;
  isAtSegmentEnd: boolean;
  onExit: () => void;
  onTogglePause: () => void;
  onToggleLanguage: () => void;
  onRestart: () => void;
  onChangeSpeed: (speed: number) => void;
  onJumpToSegment: (segment: DaySegment) => void;
  onJumpToEnd: () => void;
  onNextSegment: () => void;
  t: TranslationSet;
}

export const ReplayControls: React.FC<ReplayControlsProps> = ({
  isPaused,
  speed,
  showOriginalLanguage,
  availableSegments,
  currentSegment,
  isAtSegmentEnd,
  onExit,
  onTogglePause,
  onToggleLanguage,
  onRestart,
  onChangeSpeed,
  onJumpToSegment,
  onJumpToEnd,
  onNextSegment,
  t,
}) => {
  const speedOptions = [1, 1.5, 2];
  
  // Check if there's a next segment available
  const currentIdx = currentSegment ? availableSegments.indexOf(currentSegment) : -1;
  const hasNextSegment = currentIdx >= 0 && currentIdx < availableSegments.length - 1;
  const nextSegment = hasNextSegment ? availableSegments[currentIdx + 1] : null;

  return (
    <div className="flex flex-col items-center justify-center gap-1.5 md:gap-2 h-full px-2">
      {/* Segment Navigation - segments loaded dynamically from save file in order */}
      {availableSegments.length > 1 && (
        <div className="flex items-center gap-1 md:gap-2 flex-wrap justify-center">
          {availableSegments.map((segment) => (
            <button
              key={segment}
              onClick={() => onJumpToSegment(segment)}
              className={`px-2 py-0.5 md:px-3 md:py-1 rounded text-xs md:text-sm font-medium transition-colors ${
                currentSegment === segment
                  ? 'bg-amber-500 text-white'
                  : 'bg-black/30 text-gray-300 hover:bg-amber-500/30'
              }`}
            >
              {segment}
            </button>
          ))}
        </div>
      )}
      
      {/* Next Segment Button - shown prominently when at segment end */}
      {isAtSegmentEnd && hasNextSegment && nextSegment && (
        <button 
          onClick={onNextSegment}
          className="px-4 py-1.5 md:px-6 md:py-2 rounded-lg text-sm md:text-base font-semibold animate-pulse bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white"
        >
          {t.nextSegment || 'Next'}: {nextSegment}
        </button>
      )}
      
      {/* End of Day message */}
      {isAtSegmentEnd && !hasNextSegment && (
        <div className="text-amber-300 font-semibold text-sm md:text-lg">
          {t.endOfDay || 'End of Day'}
        </div>
      )}
      
      {/* Playback Controls - compact on mobile */}
      <div className="flex items-center gap-1.5 md:gap-2 flex-wrap justify-center">
        <button onClick={onTogglePause} className="px-2 py-1 md:px-3 md:py-1.5 text-xs md:text-sm rounded bg-black/40 border border-white/20 text-white hover:bg-white/20">
          {isPaused ? t.play : t.pause}
        </button>
        <button onClick={onRestart} className="px-2 py-1 md:px-3 md:py-1.5 text-xs md:text-sm rounded bg-black/40 border border-white/20 text-white hover:bg-white/20">
          {t.restart}
        </button>
        <button 
          onClick={onJumpToEnd} 
          className="px-2 py-1 md:px-3 md:py-1.5 text-xs md:text-sm rounded bg-indigo-600/40 border border-indigo-500/50 text-white hover:bg-indigo-500/40"
        >
          {t.skipToEnd || 'Skip'}
        </button>
        <button onClick={onExit} className="px-2 py-1 md:px-3 md:py-1.5 text-xs md:text-sm rounded bg-red-600/40 border border-red-500/50 text-white hover:bg-red-500/40">
          {t.exitReplay}
        </button>
      </div>
      
      {/* Language & Speed Controls - single row */}
      <div className="flex items-center gap-1.5 md:gap-2 flex-wrap justify-center">
        <button 
          onClick={onToggleLanguage} 
          className={`px-2 py-0.5 md:px-3 md:py-1 rounded text-xs md:text-sm font-medium transition-colors ${
            showOriginalLanguage
              ? 'bg-purple-500/50 text-white border border-purple-400/50'
              : 'bg-emerald-500/50 text-white border border-emerald-400/50'
          }`}
        >
          {showOriginalLanguage ? 'Original' : 'English'}
        </button>
        <span className="text-gray-500 text-xs">|</span>
        {speedOptions.map(opt => (
          <button
            key={opt}
            onClick={() => onChangeSpeed(opt)}
            className={`px-1.5 py-0.5 md:px-2 md:py-1 rounded text-xs md:text-sm font-medium transition-colors ${
              speed === opt
                ? 'bg-cyan-500 text-white'
                : 'bg-black/30 text-gray-300 hover:bg-white/20'
            }`}
          >
            {opt}x
          </button>
        ))}
      </div>
    </div>
  );
};
