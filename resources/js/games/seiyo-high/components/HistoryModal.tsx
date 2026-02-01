/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React, { useState, useEffect } from 'react';
import { TranslationSet } from '../lib/translations';

interface StoryModalProps {
  isVisible: boolean;
  onClose: () => void;
  novelChapters: string[];
  t: TranslationSet;
}

export const StoryModal: React.FC<StoryModalProps> = ({ isVisible, onClose, novelChapters, t }) => {
  const [selectedDay, setSelectedDay] = useState(0);

  useEffect(() => {
    if (isVisible && novelChapters.length > 0) {
      setSelectedDay(novelChapters.length - 1);
    }
  }, [isVisible, novelChapters]);

  if (!isVisible) {
    return null;
  }
  
  const selectedChapterContent = novelChapters[selectedDay];

  return (
    <div className="absolute inset-0 bg-black/60 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="vn-modal-panel w-full max-w-4xl h-[90vh] flex flex-col md:flex-row gap-6"
        onClick={(e) => e.stopPropagation()} 
      >
        {/* Left Side: Chapter Navigation */}
        <div className="flex-shrink-0 md:w-48 border-b-2 md:border-b-0 md:border-r-2 border-white/20 pb-4 md:pb-0 md:pr-4">
          <h2 className="text-3xl font-bold text-center mb-4 text-shadow-medium text-blue-300">
            {t.history}
          </h2>
          <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto md:max-h-[calc(90vh-150px)] custom-scrollbar pr-2">
            {novelChapters.map((_, index) => (
              <button
                key={index}
                onClick={() => setSelectedDay(index)}
                className={`w-full text-left p-3 rounded-md font-semibold transition-colors text-lg ${selectedDay === index ? 'bg-blue-500 text-white' : 'bg-black/30 text-gray-300 hover:bg-white/20'}`}
              >
                {t.day} {index + 1}
              </button>
            ))}
             {novelChapters.length === 0 && (
                <p className="text-center text-gray-400 italic mt-4 w-full">{t.noTraitsObserved}</p>
            )}
          </div>
        </div>

        {/* Right Side: Chapter Content */}
        <div className="flex-grow flex flex-col min-h-0">
          <div className="flex-grow overflow-y-auto pr-4 custom-scrollbar space-y-4">
            {selectedChapterContent ? (
              selectedChapterContent.split('\n').map((paragraph, index) => (
                <p key={index} className="text-gray-200 text-lg leading-relaxed first-letter:text-2xl first-letter:font-bold">
                  {paragraph}
                </p>
              ))
            ) : (
                <p className="text-center text-gray-400 italic mt-8">{t.noTraitsObserved}</p>
            )}
          </div>
          <div className="mt-6 text-center flex-shrink-0">
            <button
              onClick={onClose}
              className="vn-primary-button w-48"
              aria-label={t.close}
            >
              {t.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
