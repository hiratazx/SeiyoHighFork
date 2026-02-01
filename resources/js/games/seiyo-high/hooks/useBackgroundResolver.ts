/**
 * useBackgroundResolver Hook
 * 
 * Resolves a background identifier to a displayable URL.
 * - For generated locations: retrieves blob from IndexedDB and creates an Object URL
 * - For stock assets: returns the URL as-is
 * 
 * Handles memory management by revoking old blob URLs on cleanup.
 */
import { useState, useEffect, useRef } from 'react';
import { getGeneratedLocation, GeneratedLocation } from '../db';
import { devWarn } from '../lib/devLog';

interface BackgroundResolverResult {
  /** The URL to use for the background image (blob URL or stock URL) */
  url: string;
  /** Whether the background is currently being loaded from IndexedDB */
  isLoading: boolean;
  /** The visual grounding prompt (if this is a generated location) */
  prompt: string | null;
  /** Whether this is a generated location (vs stock asset) */
  isGenerated: boolean;
}

/**
 * Determines if a string looks like a stock asset URL vs a generated location ID.
 * Generated location IDs are formatted like "school_rooftop_evening".
 * Stock URLs contain "/" or start with "http".
 */
function isStockAssetUrl(identifier: string): boolean {
  if (!identifier) return true;
  return identifier.includes('/') || identifier.startsWith('http');
}

/**
 * Hook that resolves a background identifier to a displayable URL.
 * 
 * @param backgroundId - Either a generated location ID (e.g., "school_rooftop_evening")
 *                       or a stock asset URL (e.g., "https://example.com/bg.jpg")
 * @param fallbackUrl - Optional fallback URL if the generated location is not found
 * 
 * @returns BackgroundResolverResult with url, isLoading, prompt, and isGenerated
 * 
 * @example
 * ```tsx
 * const { url, isLoading, prompt } = useBackgroundResolver(
 *   currentLocationId || backgroundUrl,
 *   backgroundUrl // fallback to stock if generated not found
 * );
 * 
 * return <div style={{ backgroundImage: `url(${url})` }} />;
 * ```
 */
export function useBackgroundResolver(
  backgroundId: string | undefined | null,
  fallbackUrl?: string
): BackgroundResolverResult {
  // Track the current blob URL so we can revoke it on cleanup
  const blobUrlRef = useRef<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [generatedLocation, setGeneratedLocation] = useState<GeneratedLocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Determine if this looks like a stock URL vs generated location ID
  const isStock = !backgroundId || isStockAssetUrl(backgroundId);

  // Track refresh counter to force re-fetch when image is regenerated
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Listen for location image update events (triggered by Fix Background button)
  useEffect(() => {
    const handleImageUpdate = (event: CustomEvent<{ locationId: string }>) => {
      if (event.detail.locationId === backgroundId) {
        setRefreshCounter(c => c + 1);
      }
    };

    window.addEventListener('locationImageUpdated', handleImageUpdate as EventListener);
    return () => {
      window.removeEventListener('locationImageUpdated', handleImageUpdate as EventListener);
    };
  }, [backgroundId]);

  // Fetch the generated location from IndexedDB when backgroundId changes or refresh is triggered
  useEffect(() => {
    // Reset state for stock URLs or missing ID
    if (isStock || !backgroundId) {
      setGeneratedLocation(null);
      setIsLoading(false);
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      setBlobUrl(null);
      return;
    }

    // Fetch from IndexedDB
    let cancelled = false;
    setIsLoading(true);

    getGeneratedLocation(backgroundId).then((location) => {
      if (cancelled) return;
      
      setGeneratedLocation(location || null);
      setIsLoading(false);

      if (location?.blob) {
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
        }
        const newUrl = URL.createObjectURL(location.blob);
        blobUrlRef.current = newUrl;
        setBlobUrl(newUrl);
      } else {
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
        setBlobUrl(null);
      }
    }).catch((err) => {
      if (cancelled) return;
      console.error('[useBackgroundResolver] Failed to fetch location:', err);
      setIsLoading(false);
      setGeneratedLocation(null);
    });

    // Cleanup function
    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [backgroundId, isStock, refreshCounter]);

  // Determine the final URL to return
  const resolvedUrl = (() => {
    // Stock asset - return as-is
    if (isStock) {
      const result = backgroundId || fallbackUrl || '';
      if (!result) devWarn(`[useBackgroundResolver] Stock mode but no URL available. backgroundId=${backgroundId}, fallbackUrl=${fallbackUrl}`);
      return result;
    }

    // Generated location found - return blob URL
    if (blobUrl) {
      return blobUrl;
    }



    return fallbackUrl || '';
  })();

  return {
    url: resolvedUrl,
    isLoading,
    prompt: generatedLocation?.prompt || null,
    isGenerated: !isStock && !!generatedLocation,
  };
}

export default useBackgroundResolver;
