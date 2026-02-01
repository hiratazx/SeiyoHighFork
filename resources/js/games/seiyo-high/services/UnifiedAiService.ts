import { GeneratedBackgroundPayload } from '../types';
import { storeGeneratedLocation } from '../db';
import { devLog, devWarn } from '../lib/devLog';

// ========== GENERATIVE IMAGES ==========

/**
 * Converts Base64 data directly to a Blob (no compression).
 * Used as fallback when WebP compression fails.
 */
function base64ToBlob(base64Data: string, mimeType: string): Blob {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Compresses an image to WebP format for efficient storage.
 * 
 * PNG images from Imagen 4 are typically 1.5MB+.
 * WebP at 80% quality reduces this to ~200-400KB (85% reduction)
 * with no visible quality loss for anime-style backgrounds.
 * 
 * @param base64Data - The raw Base64 image data
 * @param mimeType - The original MIME type (e.g., 'image/png')
 * @returns A compressed WebP Blob, or the original if compression fails
 */
export async function compressToWebP(base64Data: string, mimeType: string): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          devWarn('[compressToWebP] Canvas context unavailable, using original');
          resolve(base64ToBlob(base64Data, mimeType));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        
        // Convert to WebP at 80% quality - excellent for anime backgrounds
        canvas.toBlob((blob) => {
          if (blob) {
            const savings = ((base64Data.length * 0.75) - blob.size) / (base64Data.length * 0.75) * 100;
            devLog(`[compressToWebP] Compressed: ${Math.round(base64Data.length * 0.75 / 1024)}KB → ${Math.round(blob.size / 1024)}KB (${savings.toFixed(0)}% saved)`);
            resolve(blob);
          } else {
            devWarn('[compressToWebP] WebP encoding failed, using original');
            resolve(base64ToBlob(base64Data, mimeType));
          }
        }, 'image/webp', 0.8);
      } catch (e) {
        devWarn('[compressToWebP] Error during compression:', e);
        resolve(base64ToBlob(base64Data, mimeType));
      }
    };
    
    img.onerror = () => {
      devWarn('[compressToWebP] Image decode failed, using original');
      resolve(base64ToBlob(base64Data, mimeType));
    };
    
    img.src = `data:${mimeType};base64,${base64Data}`;
  });
}

/**
 * Result of handling generated assets from a response.
 */
export interface HandleGeneratedAssetsResult {
  /** The canonical location ID if an image was stored */
  locationId: string | null;
  /** The visual grounding prompt (for passing back to DM) */
  prompt: string | null;
  /** Whether an image was successfully stored */
  success: boolean;
  /** Error message if image generation was expected but failed */
  error: string | null;
}

/**
 * Handles generated background assets from API responses.
 * 
 * This function:
 * 1. Checks if the response contains a generated_background payload
 * 2. Converts the Base64 data to a Blob
 * 3. Stores the Blob in IndexedDB (Dexie)
 * 4. Returns the location ID for state updates
 * 
 * @param response - Any API response that might contain a generated_background
 * @param segment - The current day segment (for storage metadata)
 * @returns The result with locationId if successful, null otherwise
 * 
 * @example
 * ```typescript
 * const response = await dungeonMasterService.call(payload);
 * const assetResult = await handleGeneratedAssets(response, 'Evening');
 * if (assetResult.locationId) {
 *   setCurrentLocationId(assetResult.locationId);
 *   setCurrentLocationDescription(assetResult.prompt);
 * }
 * ```
 */
/**
 * Handles generated background assets from API responses.
 * 
 * This function:
 * 1. Checks if the response contains a generated_background payload
 * 2. Converts the Base64 data to a Blob
 * 3. Stores the Blob in IndexedDB (Dexie)
 * 4. Returns the location ID for state updates
 * 
 * @param response - Any API response that might contain a generated_background
 * @param segment - The current day segment (for storage metadata)
 * @param expectedGeneration - Whether image generation was expected (for error tracking)
 * @returns The result with locationId if successful, error message if failed
 * 
 * @example
 * ```typescript
 * const response = await dungeonMasterService.call(payload);
 * const assetResult = await handleGeneratedAssets(response, 'Evening', enableGenerativeImages);
 * if (assetResult.locationId) {
 *   setCurrentLocationId(assetResult.locationId);
 *   setCurrentLocationDescription(assetResult.prompt);
 * } else if (assetResult.error) {
 *   showNotification(assetResult.error, 'warning');
 * }
 * ```
 */
export async function handleGeneratedAssets(
  response: { generated_background?: GeneratedBackgroundPayload; location_change?: boolean; visual_description?: string; [key: string]: any },
  segment: string,
  expectedGeneration: boolean = false
): Promise<HandleGeneratedAssetsResult> {
  const generatedBackground = response.generated_background;
  
  // Check if generation was expected but not delivered (backend failure)
  if (!generatedBackground) {
    // If the response indicates a location change but no image was generated,
    // this means the backend attempted generation but it failed
    const wasLocationChange = response.location_change === true && response.visual_description;
    const errorMessage = wasLocationChange 
      ? 'Background generation failed. Using fallback image.'
      : null;
    
    return { 
      locationId: null, 
      prompt: null, 
      success: false, 
      error: errorMessage 
    };
  }

  const { id, data, mime, prompt, summary } = generatedBackground;
  
  if (!id || !data || !mime) {
    devWarn('[handleGeneratedAssets] Invalid generated_background payload - missing required fields');
    return { 
      locationId: null, 
      prompt: null, 
      success: false, 
      error: 'Invalid image data received from server.' 
    };
  }

  try {
    // Compress to WebP for efficient storage
    // PNG from Imagen 4 (~1.5MB) → WebP 80% (~250KB) = 85% savings
    const blob = await compressToWebP(data, mime);
    
    // Extract a human-readable name from the ID
    // e.g., "school_rooftop_evening" -> "School Rooftop"
    const nameParts = id.split('_');
    nameParts.pop(); // Remove the segment suffix
    const name = nameParts
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    
    // Use provided summary, or create fallback from prompt
    const locationSummary = summary || prompt.slice(0, 80) + (prompt.length > 80 ? '...' : '');
    
    // Store in IndexedDB
    await storeGeneratedLocation(id, name, segment, prompt, locationSummary, blob);
    
    devLog(`[handleGeneratedAssets] Stored generated location: ${id}`);
    
    return {
      locationId: id,
      prompt: prompt,
      success: true,
      error: null,
    };
  } catch (error) {
    console.error('[handleGeneratedAssets] Failed to store generated asset:', error);
    return { 
      locationId: null, 
      prompt: null, 
      success: false, 
      error: 'Failed to save generated image. Storage may be full.' 
    };
  }
}
