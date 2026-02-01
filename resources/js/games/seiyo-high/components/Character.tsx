/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React, { useState, useRef, useEffect } from 'react';
import { CharacterConfig } from '../types';

const usePrevious = <T,>(value: T): T | undefined => {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

interface CharacterProps {
  isLoading: boolean;
  character: CharacterConfig;
  isSpeaking: boolean;
  activeSet: string;
  expression: string;
  isLeaving: boolean;
}

const CharacterKeyframes = () => (
  <style>
    {`
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
      .animate-float {
        animation: float 6s ease-in-out infinite;
      }
    `}
  </style>
);

export const Character: React.FC<CharacterProps> = ({
  isLoading,
  character,
  isSpeaking,
  activeSet,
  expression,
  isLeaving,
}) => {
  const getUrlForExpression = (set: string | undefined, exp: string | undefined): string => {
    const setName = set || 'default';
    const expName = exp || 'neutral';

    // Gracefully handle potentially missing or empty spriteSets
    const currentSet = character.spriteSets?.find(s => s.name === setName);

    if (currentSet) {
      // Try the specific expression, then 'neutral', then 'normal' (as legacy fallback), then base image
      return currentSet.expressions[expName] 
          || currentSet.expressions['neutral'] // Prefer 'neutral' as standard fallback
          || currentSet.expressions['normal']  // Keep 'normal' for backwards compatibility
          || character.image!; // Non-null assertion: We know image exists due to App.tsx check
    }
    
    // If no spriteSets or the specific set wasn't found, use the base image directly
    return character.image!; // Non-null assertion
  };

  const currentImageUrl = getUrlForExpression(activeSet, expression);
  const [previousImageUrl, setPreviousImageUrl] = useState<string | null>(null);
  const prevExpression = usePrevious(expression);
  const prevSet = usePrevious(activeSet);
  const isFirstRender = useRef(true);

  // This effect manages the logic for the cross-fade animation.
  useEffect(() => {
    // Don't animate on the very first time the component appears.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // If the expression or set has changed, we need to start the cross-fade.
    if (prevExpression !== expression || prevSet !== activeSet) {
      // Set the *previous* image URL so it can be rendered temporarily.
      const prevUrl = getUrlForExpression(prevSet, prevExpression);
      setPreviousImageUrl(prevUrl);

      // Set a timer to remove the previous image after the fade completes.
      // This duration MUST match the CSS transition duration.
      const timer = setTimeout(() => {
        setPreviousImageUrl(null);
      }, 500); // Using 500ms for a quicker, snappier fade.

      // Cleanup: If the component unmounts mid-fade, clear the timer.
      return () => clearTimeout(timer);
    }
  }, [expression, activeSet, prevExpression, prevSet, getUrlForExpression]);
  
  // Restoring EXACT old logic, but fixing the broken class name.
  // We use 'brightness-[0.7]' because 'brightness-70' does not exist in default Tailwind.
  const transitionClass = isLoading
    ? 'opacity-100 scale-95 brightness-50 drop-shadow-xl'
    : isSpeaking
      ? 'opacity-100 scale-100 brightness-100 drop-shadow-2xl' // Speaking: Normal size, fully lit
      : 'opacity-100 scale-95 brightness-[0.7] drop-shadow-xl'; // Not Speaking: Smaller, 70% brightness

  const animationClass = isLeaving 
    ? 'animate-fade-out' 
    : (isFirstRender.current ? 'animate-fade-in' : '');

  return (
    <>
      <CharacterKeyframes />
      <div
        className={`vn-character animate-float ${transitionClass} ${animationClass}`}
      >
        {/* --- NEW RENDER LOGIC --- */}
        
        {/* The current, correct sprite is ALWAYS rendered as the base layer. */}
        <img
          src={currentImageUrl}
          alt={`Character sprite for ${character.name} (${expression})`}
          className="absolute inset-0 w-full h-full object-contain rounded-xl"
        />
        
        {/* The PREVIOUS sprite is rendered ON TOP, but it is told to fade OUT. */}
        {previousImageUrl && (
          <img
            src={previousImageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-contain rounded-xl transition-opacity duration-500 ease-out"
            // When this image appears, its opacity is immediately transitioned to 0, creating the fade effect.
            style={{ opacity: 0 }}
          />
        )}
      </div>
    </>
  );
};