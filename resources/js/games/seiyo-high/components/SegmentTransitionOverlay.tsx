/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React, {useState, useEffect} from 'react';
import { TranslationSet } from '../lib/translations';
import { DaySegment } from '../types';

interface SegmentTransitionOverlayProps {
  isVisible: boolean;
  segment: DaySegment; // The upcoming segment
  t: TranslationSet;
}

export const SegmentTransitionOverlay: React.FC<SegmentTransitionOverlayProps> = ({
  isVisible,
  segment,
  t,
}) => {
  const [textOpacity, setTextOpacity] = useState(0);

  useEffect(() => {
    if (isVisible) {
      // Fade in text quickly
      const fadeInTimer = setTimeout(() => setTextOpacity(1), 100);
      // Fade out text before overlay disappears
      const fadeOutTimer = setTimeout(() => setTextOpacity(0), 2500);

      return () => {
        clearTimeout(fadeInTimer);
        clearTimeout(fadeOutTimer);
      };
    }
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }
  
  const translatedSegment = (): string => {
    switch (segment) {
      case 'Morning': return t.segmentMorning;
      case 'Afternoon': return t.segmentAfternoon;
      case 'Evening': return t.segmentEvening;
      case 'Night': return t.segmentNight;
      default: return segment; // Fallback to the English key
    }
  };

  return (
    <div className="segment-transition-overlay opacity-100">
      <h2
        className="segment-transition-text text-shadow-medium"
        style={{opacity: textOpacity, transform: `scale(${textOpacity * 1.05})`}}
      >
        {translatedSegment()}
      </h2>
    </div>
  );
};