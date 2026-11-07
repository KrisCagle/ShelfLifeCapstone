import { request } from './api'

const MAX_EDGE = 1600
const QUALITY = 0.85

/**
 * Redraws a photo as a smaller JPEG. A phone picture can be 5MB or more, and this is
 * what keeps storage cheap. Redrawing also leaves behind the file's metadata, including
 * the GPS location phones record, so a photo of a shelf can't reveal where it was taken.
 */
async function shrink(file: File): Promise<Blob> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('That photo format isn’t supported here. Try a JPEG or PNG.')
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
  if (!blob) throw new Error('Couldn’t read that photo. Try another one.')
  return blob
}

/** Shrinks and uploads a photo, returning the URL to save on the item. */
export async function uploadPhoto(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', await shrink(file), 'photo.jpg')
  const { url } = await request<{ url: string }>('/photos', { method: 'POST', body: form })
  return url
}
