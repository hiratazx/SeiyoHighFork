/**
 * useScreenContext Hook
 * 
 * Detects the device's aspect ratio for generative image requests.
 * The aspect ratio is used by Imagen 4 to generate images that fit the screen.
 */
import { useState, useEffect, useCallback } from 'react';

export type AspectRatio = '16:9' | '9:16' | '1:1';

interface ScreenContext {
  /** Current aspect ratio suitable for image generation */
  aspectRatio: AspectRatio;
  /** Whether the device is in portrait orientation */
  isPortrait: boolean;
  /** Whether the device is in landscape orientation */
  isLandscape: boolean;
}

/**
 * Determines the best Imagen aspect ratio based on window dimensions.
 * 
 * Imagen 4 supports: "1:1", "3:4", "4:3", "9:16", "16:9"
 * We use the three most common for visual novels: 16:9, 9:16, 1:1
 */
function calculateAspectRatio(width: number, height: number): AspectRatio {
  const ratio = width / height;
  
  if (ratio > 1.2) {
    // Landscape / Desktop - width significantly greater than height
    return '16:9';
  } else if (ratio < 0.8) {
    // Portrait / Mobile - height significantly greater than width
    return '9:16';
  } else {
    // Square-ish / Foldable / Tablet in certain orientations
    return '1:1';
  }
}

/**
 * Hook that provides screen context information for generative image requests.
 * 
 * @returns ScreenContext object with aspectRatio, isPortrait, and isLandscape
 * 
 * @example
 * ```tsx
 * const { aspectRatio, isPortrait } = useScreenContext();
 * 
 * // Use in API request
 * const clientContext = {
 *   aspectRatio,
 *   knownLocationIds: await getKnownLocationIds(),
 * };
 * ```
 */
export function useScreenContext(): ScreenContext {
  const [screenContext, setScreenContext] = useState<ScreenContext>(() => {
    // Initialize with current window dimensions (SSR-safe)
    if (typeof window !== 'undefined') {
      const aspectRatio = calculateAspectRatio(window.innerWidth, window.innerHeight);
      return {
        aspectRatio,
        isPortrait: aspectRatio === '9:16',
        isLandscape: aspectRatio === '16:9',
      };
    }
    // Default for SSR
    return {
      aspectRatio: '16:9',
      isPortrait: false,
      isLandscape: true,
    };
  });

  const handleResize = useCallback(() => {
    const aspectRatio = calculateAspectRatio(window.innerWidth, window.innerHeight);
    setScreenContext({
      aspectRatio,
      isPortrait: aspectRatio === '9:16',
      isLandscape: aspectRatio === '16:9',
    });
  }, []);

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;

    // Listen for resize events
    window.addEventListener('resize', handleResize);
    
    // Also listen for orientation changes on mobile
    window.addEventListener('orientationchange', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [handleResize]);

  return screenContext;
}

export default useScreenContext;
