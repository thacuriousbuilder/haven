

import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

interface CompressionResult {
  base64: string;
  originalSizeMB: number;
  compressedSizeMB: number;
}

/**
 * Compresses and resizes an image to ensure it's under the size limit
 * Supabase Edge Functions have a 6MB request limit
 * We target 2MB to leave room for other request data
 */
export async function compressImageForUpload(
  imageUri: string,
  maxSizeMB: number = 2
): Promise<CompressionResult> {
  
  // Start with moderate compression
  let quality = 0.6;
  let width = 1024;
  
  let result = await manipulateAsync(
    imageUri,
    [{ resize: { width } }],
    { compress: quality, format: SaveFormat.JPEG, base64: true }
  );

  if (!result.base64) {
    throw new Error('Failed to compress image - no base64 data');
  }

  const sizeInBytes = (result.base64.length * 3) / 4;
  const originalSizeMB = sizeInBytes / (1024 * 1024);

  // If still too large, compress more aggressively
  if (originalSizeMB > maxSizeMB) {
    console.log(`Image too large (${originalSizeMB.toFixed(2)}MB), compressing more...`);
    
    width = 800;
    quality = 0.5;

    result = await manipulateAsync(
      imageUri,
      [{ resize: { width } }],
      { compress: quality, format: SaveFormat.JPEG, base64: true }
    );

    if (!result.base64) {
      throw new Error('Failed to compress image - no base64 data');
    }
  }

  const finalSizeInBytes = (result.base64.length * 3) / 4;
  const finalSizeMB = finalSizeInBytes / (1024 * 1024);

  if (finalSizeMB > maxSizeMB) {
    throw new Error(
      `Image too large (${finalSizeMB.toFixed(2)}MB). Please try a different photo.`
    );
  }

  console.log(`✅ Image compressed: ${originalSizeMB.toFixed(2)}MB → ${finalSizeMB.toFixed(2)}MB`);

  return {
    base64: result.base64,
    originalSizeMB,
    compressedSizeMB: finalSizeMB,
  };
}