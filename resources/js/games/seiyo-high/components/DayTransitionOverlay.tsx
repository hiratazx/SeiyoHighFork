/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React, {useState, useEffect} from 'react';
import { TranslationSet } from '../lib/translations';

interface DayTransitionOverlayProps {
  isVisible: boolean;
  day: number; // This now represents the day we are transitioning TO.
  t: TranslationSet;
}

export const DayTransitionOverlay: React.FC<DayTransitionOverlayProps> = ({
  isVisible,
  day,
  t
}) => {
  const [text, setText] = useState('');
  const [textOpacity, setTextOpacity] = useState(0);

  useEffect(() => {
    if (isVisible) {
      // Phase 1: Fade in "End of Day X"
      // The `day` prop is the NEW day, so `day - 1` is the day that just ended.
      setText(`${t.endOfDay} ${day - 1}`);
      const fadeInTimer = setTimeout(() => setTextOpacity(1), 100);

      // Phase 2: Switch text to "Day Y"
      const switchTextTimer = setTimeout(() => {
        setText(`${t.day} ${day}`);
      }, 4000); // Hold "End of Day" for twice as long

      // Phase 3: Fade out text before the overlay itself disappears
      const fadeOutTimer = setTimeout(() => setTextOpacity(0), 5500); // Fade out later to give time for the new text to be seen

      return () => {
        clearTimeout(fadeInTimer);
        clearTimeout(switchTextTimer);
        clearTimeout(fadeOutTimer);
      };
    }
  }, [isVisible, day, t]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="day-transition-overlay opacity-100">
      <h2
        className="day-transition-text text-shadow-medium"
        style={{opacity: textOpacity, transform: `scale(${textOpacity * 1.05})`}}
      >
        {text}
      </h2>
    </div>
  );
};