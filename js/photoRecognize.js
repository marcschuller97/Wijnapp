import { authHeaders } from './auth.js';

const MAX_IMAGES = 6;
const MAX_DIMENSION = 1568;
const JPEG_QUALITY = 0.85;

function resizeImageFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Could not process the photo.'));
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result;
            resolve({ data: result.slice(result.indexOf(',') + 1), mediaType: 'image/jpeg' });
          };
          reader.onerror = () => reject(new Error('Could not read the photo.'));
          reader.readAsDataURL(blob);
        },
        'image/jpeg',
        JPEG_QUALITY
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not open the photo.'));
    };
    img.src = objectUrl;
  });
}

/**
 * Uploads photos to the /api/recognize endpoint and returns the raw wine
 * objects Claude recognized (not yet normalized into draft items).
 * Throws with a user-facing message on failure.
 */
export async function recognizeFromPhotos(files, mode) {
  const fileList = Array.from(files || []).slice(0, MAX_IMAGES);
  if (fileList.length === 0) {
    throw new Error('No photo selected.');
  }

  const images = await Promise.all(fileList.map(resizeImageFile));

  const res = await fetch('/api/recognize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ images, mode }),
  });

  let data;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error('Unexpected response from the server.');
  }

  if (!res.ok) {
    throw new Error(data.error || 'Recognition failed.');
  }
  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new Error('No wine recognized in the photos. Try again with a clearer photo.');
  }

  return data.items;
}
