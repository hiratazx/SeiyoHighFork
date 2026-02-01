/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React, { useState, useEffect, useMemo } from 'react';
import { TranslationSet } from '../lib/translations';
import { DailyItinerary, ItinerarySegment, FullItinerary } from '../types';
import { processItineraryPlaceholders } from '../lib/itineraryUtils';

interface ItineraryModalProps {
  isVisible: boolean;
  onClose: () => void;
  itinerary: FullItinerary | null;
  itineraryTranslated?: FullItinerary | null;
  t: TranslationSet;
  currentDay: number;
  playerName: string;
}

export const ItineraryModal: React.FC<ItineraryModalProps> = ({ isVisible, onClose, itinerary, itineraryTranslated, t, currentDay, playerName }) => {
  const [selectedDay, setSelectedDay] = useState(currentDay);

  useEffect(() => {
    if (isVisible) {
      setSelectedDay(currentDay);
    }
  }, [isVisible, currentDay]);

  // Process placeholders in the itinerary before displaying
  const processedItinerary = useMemo(() => {
    if (!itinerary) return null;
    return itinerary.map(dailyItinerary => processItineraryPlaceholders(dailyItinerary, playerName));
  }, [itinerary, playerName]);

  const processedItineraryTranslated = useMemo(() => {
    if (!itineraryTranslated) return null;
    return itineraryTranslated.map(dailyItinerary => processItineraryPlaceholders(dailyItinerary, playerName));
  }, [itineraryTranslated, playerName]);

  if (!isVisible) {
    return null;
  }
  
  const itineraryToDisplay = processedItineraryTranslated || processedItinerary;
  const dailyItinerary = itineraryToDisplay ? itineraryToDisplay[selectedDay - 1] : null;
  const isItineraryValid = dailyItinerary && Array.isArray(dailyItinerary.segments) && dailyItinerary.segments.length > 0;

  return (
    <div className="absolute inset-0 bg-black/60 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="vn-modal-panel max-w-2xl w-full flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex-shrink-0">
            <h2 className="text-3xl font-bold text-center mb-4 text-shadow-medium text-green-300">
                {t.dailyPlan} - {t.day} {selectedDay}
            </h2>
            <div className="flex flex-wrap justify-center gap-2 mb-4 border-b-2 border-white/20 pb-4">
    {itineraryToDisplay && [...Array(itineraryToDisplay.length)].map((_, i) => {
        const day = i + 1;
        // No need to check for availability here, as the array length is based on available data
        return (
            <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-3 py-1 rounded-md text-sm font-semibold transition-colors ${selectedDay === day ? 'bg-green-500 text-white' : 'bg-black/30 text-gray-300 hover:bg-white/20'}`}
            >
                {day}
            </button>
        )
    })}
</div>
        </div>


        <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-6">
          {!isItineraryValid ? (
            <p className="text-center text-gray-400 italic mt-8">{t.noItineraryAvailable}</p>
          ) : (
            <>
                <div className="text-center p-3 bg-black/20 rounded-lg border border-white/10">
                    <h3 className="text-lg font-bold text-gray-200">{t.dayTheme}</h3>
                    <p className="text-xl italic text-green-200 mt-1">"{dailyItinerary.day_theme}"</p>
                </div>
                
                <div className="space-y-6">
                    {dailyItinerary.segments.map((segment: ItinerarySegment) => (
                      <div key={segment.segment} className="p-4 bg-black/20 rounded-lg border-l-4 border-green-400/50">
                          <h4 className="text-2xl font-bold text-green-300 mb-3">{segment.segment}</h4>
                          <div className="space-y-4 pl-2">
                              <div>
                                  <h5 className="font-semibold text-gray-200">{t.itinerary}</h5>
                                  <p className="text-gray-300 pl-2 border-l-2 border-white/20 ml-2 mt-1 whitespace-pre-wrap">
                                      {segment.scenarioProse}
                                  </p>
                              </div>
                              <div>
                                  <h5 className="font-semibold text-gray-200">{t.characterFocus}</h5>
                                  <p className="text-gray-300 font-medium pl-2 border-l-2 border-white/20 ml-2 mt-1">
                                      {segment.character_focus.join(', ')}
                                  </p>
                              </div>
                          </div>
                      </div>
                    ))}
                </div>
            </>
          )}
        </div>

        <div className="mt-8 text-center flex-shrink-0">
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
  );
};