/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import {useState, useEffect, useRef} from 'react';

export const useTypewriter = (
  text: string,
  speed = 30,
  onComplete?: () => void,
  pauseDuration = 750,
  resetKey?: number, // Optional key to force restart even if text is the same
) => {
  const [displayText, setDisplayText] = useState('');
  // Use ref for callback to avoid restarting typewriter when callback identity changes
  const onCompleteRef = useRef(onComplete);
  
  // Keep ref up to date without triggering effect
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    setDisplayText(''); // Always start fresh
    if (!text) {
      return;
    }

    let intervalId: ReturnType<typeof setInterval>;
    let completionTimeoutId: ReturnType<typeof setTimeout>;

    // Delay start of typing to allow UI to clear
    const startTimeoutId = setTimeout(() => {
        let i = 0;
        intervalId = setInterval(() => {
            i += 1;
            setDisplayText(text.substring(0, i));

            if (i >= text.length) {
                clearInterval(intervalId);
                completionTimeoutId = setTimeout(() => {
                    if (onCompleteRef.current) {
                        onCompleteRef.current();
                    }
                }, pauseDuration); // Pause for reading
            }
        }, speed);
    }, 50);

    // Main cleanup function
    return () => {
        clearTimeout(startTimeoutId);
        clearInterval(intervalId);
        clearTimeout(completionTimeoutId);
    };
  }, [text, speed, pauseDuration, resetKey]); // Removed onComplete from deps

  return displayText;
};
