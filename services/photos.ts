// Photos are stored as small data URLs, not blob: URLs.
// A blob: URL only lives as long as the tab that created it, so it disappears on
// refresh and cannot be written to a backup file.

export const MAX_PHOTO_EDGE = 256
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('That file could not be read.'))
    reader.readAsDataURL(file)
  })
}

/** Shrinks an image data URL to at most `max` pixels on its long edge and re-encodes it as JPEG. */
export function shrinkPhoto(dataUrl: string, max = MAX_PHOTO_EDGE): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(dataUrl); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

/** Reads a picked file and returns a compact data URL that survives a page reload. */
export async function fileToPhoto(file: File, max = MAX_PHOTO_EDGE): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file (JPG, PNG, WebP).')
  if (file.size > MAX_PHOTO_BYTES) throw new Error('That image is larger than 15 MB. Pick a smaller one.')
  return shrinkPhoto(await readAsDataUrl(file), max)
}
