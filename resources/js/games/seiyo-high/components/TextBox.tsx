/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React, {useState, useRef, useEffect, forwardRef} from 'react';
import {DialogueEntry, DaySegment, CharacterConfig} from '../types';
import { TranslationSet } from '../lib/translations';
import { ReplayControls } from './ReplayControls';
import { isCharacterMatch } from '../lib/characterUtils';

// Define props for the new component
interface MobileInputOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  onSendMessage: (message: string) => void;
  history: DialogueEntry[];
  t: TranslationSet;
}

const MobileInputOverlay: React.FC<MobileInputOverlayProps> = ({ isVisible, onClose, onSendMessage, history, t }) => {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isVisible) {
      // A short timeout ensures the element is rendered before we try to focus it.
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isVisible]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex flex-col justify-end"
      onClick={onClose} // Close when clicking the background
    >
      <div
        className="w-full bg-slate-800/90 backdrop-blur-sm rounded-t-lg p-4 border-t-2 border-slate-700"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the content area
      >
        {/* Recent History View */}
        <div className="max-h-32 overflow-y-auto mb-4 flex flex-col-reverse">
          {/* We map a slice of the history to show the last few lines for context */}
          {history.slice(-4).map((entry, index) => (
            <div key={index} className="mb-2 text-sm">
              <span className="font-bold text-gray-400">{entry.speaker}: </span>
              <span className="text-gray-200">{entry.dialogueTranslated || entry.dialogue}</span>
            </div>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit}>
          <div className="flex gap-2 items-center">
            <input
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              type="text"
              className="vn-text-input"
              placeholder={t.typeYourResponse}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-form-type="other"
              data-lpignore="true"
              enterKeyHint="send"
            />
            <button type="submit" className="vn-send-button">{t.send}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface TextBoxProps {
  history: DialogueEntry[];
  currentLine: DialogueEntry | null;
  currentDialogue: string;
  onSendMessage: (message: string, translatedMessage?: string) => void;
  value: string;
  onValueChange: (newValue: string) => void;
  isLocked: boolean;
  isThinking: boolean;
  t: TranslationSet;
  characters: CharacterConfig[];
  choicesForDisplay: string[] | null;
  originalChoices: string[] | null;
  playerName: string;
  currentDay: number;
  currentSegment: DaySegment;
  onOpenProfile: () => void;
  onOpenStory: () => void;
  onBackToMenu: () => void;
  showMotivations: boolean;
  isAwaitingNextScene: boolean;
  onProceedToNextScene: () => void;
  // Replay props
  isReplaying: boolean;
  isReplayPaused: boolean;
  replaySpeed: number;
  showReplayOriginalLanguage: boolean;
  replayAvailableSegments: DaySegment[];
  replayCurrentSegment: DaySegment | null;
  isAtSegmentEnd: boolean;
  onExitReplay: () => void;
  onToggleReplayPause: () => void;
  onToggleReplayLanguage: () => void;
  onRestartReplay: () => void;
  onChangeReplaySpeed: (speed: number) => void;
  onReplayJumpToSegment: (segment: DaySegment) => void;
  onReplayJumpToEnd: () => void;
  onReplayNextSegment: () => void;
  onEndScene: () => void;
  onVetoEndScene: () => void;
}

const TextBoxComponent = forwardRef<HTMLInputElement, TextBoxProps>(
  (
    {history, currentLine, currentDialogue, onSendMessage, value, onValueChange, isLocked, isThinking, t, characters, choicesForDisplay, originalChoices, playerName, currentDay, currentSegment, onOpenProfile, onOpenStory, onBackToMenu, showMotivations, isAwaitingNextScene, onProceedToNextScene, isReplaying, isReplayPaused, replaySpeed, showReplayOriginalLanguage, replayAvailableSegments, replayCurrentSegment, isAtSegmentEnd, onExitReplay, onToggleReplayPause, onToggleReplayLanguage, onRestartReplay, onChangeReplaySpeed, onReplayJumpToSegment, onReplayJumpToEnd, onReplayNextSegment, onEndScene, onVetoEndScene},
    ref,
  ) => {
    const [isInputOverlayVisible, setIsInputOverlayVisible] = useState(false);
    const endOfMessagesRef = useRef<HTMLDivElement>(null);
    const isInitialMount = useRef(true);

    useEffect(() => {
      if (isInitialMount.current) {
        const timer = setTimeout(() => {
          endOfMessagesRef.current?.scrollIntoView({behavior: 'auto'});
          isInitialMount.current = false;
        }, 50);
        return () => clearTimeout(timer);
      } else {
        endOfMessagesRef.current?.scrollIntoView({behavior: 'smooth'});
      }
    }, [history.length, currentDialogue, currentLine]); // Added currentLine to ensure scroll on new line

    const handleFormSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (value.trim() && !isLocked) {
        onSendMessage(value.trim());
        onValueChange('');
      }
    };

    const getSpeakerColor = (speaker: string) => {
      // Rule 1: Narrator
      if (speaker === 'Narrator') {
        return 'text-gray-400';
      }

      // Rule 2: Defined Main Character
      const character = characters.find(c => isCharacterMatch(speaker, c));
      if (character) {
        return character.color;
      }

      // Rule 3: Player (handles both live play and replay)
      // The original logic for identifying a player in replay was too broad and
      // incorrectly colored secondary characters. This new logic is more robust.
      // In live play, we match the exact name. In replay, we use the old logic,
      // which is an acceptable fallback.
      const isLivePlayer = !isReplaying && speaker === playerName;
      const isReplayPlayer = isReplaying && !characters.some(c => isCharacterMatch(speaker, c));
      
      if (isLivePlayer || isReplayPlayer) {
        return 'text-yellow-200';
      }
      
      // Rule 4: Fallback for any other speaker (e.g., secondary characters).
      return 'text-gray-200';
    };

    const renderEntry = (entry: DialogueEntry, isCurrent: boolean) => {
      // For current line, use the already-computed currentDialogue (respects replay language toggle)
      // For history, respect the toggle: English if !showReplayOriginalLanguage during replay
      const dialogueText = isCurrent 
        ? currentDialogue 
        : (isReplaying && !showReplayOriginalLanguage 
            ? entry.dialogue  // Force English during replay when toggle is off
            : (entry.dialogueTranslated || entry.dialogue));

      if (entry.speaker === 'Narrator') {
        return (
          <>
      <p className="vn-dialogue pl-2 italic text-gray-300">
        {dialogueText}
      </p>
      {/* [REPLAY] Hide motivations during replay - dialogue only */}
      {showMotivations && !isReplaying && entry.motivation && (
        <p className="pl-6 italic text-sm text-blue-300/80 mt-1">
          {/* Use backticks ` ` for the template literal */}
          {`[Director's Note: ${entry.motivationTranslated || entry.motivation}]`}
        </p>
      )}
    </>
  );
}
      
      const isPlayerEntry = !characters.some(c => isCharacterMatch(entry.speaker, c)) && entry.speaker !== 'Narrator';

      return (
        <>
          <div className={`vn-speaker ${getSpeakerColor(entry.speaker)}`}>
            {entry.speaker}
          </div>
          <p className="vn-dialogue pl-2">{dialogueText}</p>
          {/* [REPLAY] Hide motivations during replay - dialogue only */}
          {showMotivations && !isReplaying && entry.motivation && (
             <p className={`pl-6 italic text-sm ${isPlayerEntry ? 'text-yellow-200/80' : 'text-purple-300/80'} mt-1`}>
                {isPlayerEntry ? `Intent: ${entry.motivationTranslated || entry.motivation}` : `[${entry.motivationTranslated || entry.motivation}]`}
             </p>
          )}
        </>
      );
    };

    const renderInputArea = () => {
        // [REPLAY] Always show replay controls when replaying, regardless of other state
        if (isReplaying) {
            return (
                <ReplayControls 
                    isPaused={isReplayPaused}
                    speed={replaySpeed}
                    showOriginalLanguage={showReplayOriginalLanguage}
                    availableSegments={replayAvailableSegments}
                    currentSegment={replayCurrentSegment}
                    isAtSegmentEnd={isAtSegmentEnd}
                    onExit={onExitReplay}
                    onTogglePause={onToggleReplayPause}
                    onToggleLanguage={onToggleReplayLanguage}
                    onRestart={onRestartReplay}
                    onChangeSpeed={onChangeReplaySpeed}
                    onJumpToSegment={onReplayJumpToSegment}
                    onJumpToEnd={onReplayJumpToEnd}
                    onNextSegment={onReplayNextSegment}
                    t={t}
                />
            );
        }

        // [GAME] Show scene transition buttons when awaiting next scene (NOT during replay)
        if (isAwaitingNextScene) {
            return (
                <div className="flex items-center justify-center h-[56px] md:h-auto gap-4">
                    <button 
                        onClick={onVetoEndScene} 
                        className="vn-secondary-button w-auto px-4 border-red-400 text-red-200 hover:bg-red-900/30"
                        title="Continue writing in this scene"
                    >
                        {t.vetoEndScene || "Veto End"}
                    </button>
                    <button onClick={onProceedToNextScene} className="vn-primary-button w-64 animate-pulse">
                        {t.nextScene}
                    </button>
                </div>
            );
        }

        if (isThinking) {
            return (
                <div className="flex items-center justify-center flex-grow h-[56px] md:h-auto">
                    <div className="animate-pulse text-gray-400">{t.thinking}</div>
                </div>
            );
        }

        return (
            <div className="flex flex-col gap-2 md:gap-4">
                {choicesForDisplay && originalChoices && choicesForDisplay.length > 0 && (
                    <div className="vn-choices">
                    {choicesForDisplay.map((choice, index) => (
                        // [FIX] AI choice buttons send what they display (translated if available)
                        // AI has multilingual workflow that translates player input internally
                        <button key={index} onClick={() => onSendMessage(choice)} className="vn-choice-button" disabled={isLocked}>{choice}</button>
                    ))}
                    {/* Continue button MUST send hardcoded English for backend prompt logic, but show translated for display */}
                    <button onClick={() => onSendMessage('Continue', t.continue !== 'Continue' ? t.continue : undefined)} className="vn-choice-button" disabled={isLocked}>{t.continue}</button>
                    </div>
                )}
                <form onSubmit={handleFormSubmit} className="flex gap-2 items-center">
                    <input
                        ref={ref} id="user-response-input" type="text" className="vn-text-input text-sm md:text-base py-2 md:py-3"
                        placeholder={t.typeYourResponse} disabled={isLocked} value={value}
                        onChange={(e) => onValueChange(e.target.value)} autoComplete="off"
                    />
                    <button type="submit" className="vn-send-button py-2 md:py-3 px-4 md:px-6 text-sm md:text-base" disabled={isLocked || !value.trim()} aria-label={t.send}>{t.send}</button>
                </form>
            </div>
        );
    };

    const translatedSegment = (): string => {
      // [REPLAY] Use the segment from currentLine during replay
      const segment = isReplaying && currentLine?.segment ? currentLine.segment : currentSegment;
      switch (segment) {
        case 'Morning': return t.segmentMorning;
        case 'Afternoon': return t.segmentAfternoon;
        case 'Evening': return t.segmentEvening;
        case 'Night': return t.segmentNight;
        default: return segment; // Fallback to the English key
      }
    };

    return (
      <>
        <MobileInputOverlay
          isVisible={isInputOverlayVisible}
          onClose={() => setIsInputOverlayVisible(false)}
          onSendMessage={onSendMessage}
          history={history}
          t={t}
        />
        <div className="vn-textbox game-font">
          <div className="flex justify-between items-center mb-1 md:mb-2 flex-shrink-0">
            <div className="flex items-center gap-2 md:gap-4">
              <div className="font-bold text-gray-300 text-sm md:text-lg">
                {/* [REPLAY] Show the replayed day, not the current game day */}
                {t.day} {isReplaying && currentLine?.day ? currentLine.day : currentDay}: {translatedSegment()}
              </div>
              {!isReplaying && (
                <button 
                    onClick={onEndScene} 
                    className="vn-ui-button text-red-200 hover:text-red-100 text-xs md:text-base" 
                    disabled={isLocked}
                    title="Force the scene to end"
                >
                    {t.endScene || "End"}
                </button>
              )}
            </div>
            {!isReplaying && (
              <div className="flex items-center gap-1 md:gap-2">
                {/* --- BUTTONS VISIBLE ON BOTH MOBILE AND DESKTOP --- */}
                <button onClick={onOpenProfile} className="vn-ui-button text-xs md:text-base" disabled={isLocked && !isAwaitingNextScene}>{t.profile}</button>
                <button onClick={onOpenStory} className="vn-ui-button text-xs md:text-base" disabled={isLocked && !isAwaitingNextScene}>{t.history}</button>
                
                {/* --- DESKTOP-ONLY BUTTON --- */}
                <button onClick={onBackToMenu} className="hidden md:block vn-ui-button" disabled={isLocked && !isAwaitingNextScene}>{t.menu}</button>

                {/* --- MOBILE MENU BUTTON (goes directly to main menu) --- */}
                <button onClick={onBackToMenu} className="block md:hidden vn-ui-button text-xs" disabled={isLocked && !isAwaitingNextScene}>
                  {t.menu}
                </button>
              </div>
            )}
          </div>

          <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar border-t-2 border-white/10 pt-2">
            {/* [REPLAY] History is now managed by App.tsx - historyForDisplay contains replayHistory during replay */}
            {history.map((entry, index) => (
              <div key={index} className="mb-3">
                {renderEntry(entry, false)}
              </div>
            ))}
            {currentLine && (
              <div className="mb-3">
                {renderEntry(currentLine, true)}
              </div>
            )}
            <div ref={endOfMessagesRef} />
          </div>

          <div className="pt-4" onClick={(e) => e.stopPropagation()}>
            {renderInputArea()}
          </div>
        </div>
      </>
    );
  },
);
TextBoxComponent.displayName = 'TextBox';

export const TextBox = React.memo(TextBoxComponent);
