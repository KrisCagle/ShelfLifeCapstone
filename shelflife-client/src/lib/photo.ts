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

/** Uploads an image that's already the right size, returning its URL. */
export async function uploadBlob(blob: Blob): Promise<string> {
  const form = new FormData()
  form.append('file', blob, 'photo.jpg')
  const { url } = await request<{ url: string }>('/photos', { method: 'POST', body: form })
  return url
}

/** Shrinks and uploads a photo, returning the URL to save on the item. */
export const uploadPhoto = async (file: File): Promise<string> => uploadBlob(await shrink(file))

/** Sets only an item's photo, leaving everything else as it is. */
export const setItemPhoto = (itemId: number, photoUrl: string | null) =>
  request<void>(`/items/${itemId}/photo`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photoUrl }) })

/** Where a frame drawn over a cover-fitted video sits in the video's own pixels. */
export function frameInVideo(
  video: { width: number; height: number },
  shown: { left: number; top: number; width: number; height: number },
  frame: { left: number; top: number; width: number; height: number },
) {
  // object-fit: cover scales the video until it fills the box, then centers it.
  const scale = Math.max(shown.width / video.width, shown.height / video.height)
  const offsetX = (video.width * scale - shown.width) / 2
  const offsetY = (video.height * scale - shown.height) / 2
  const x = Math.max(0, (frame.left - shown.left + offsetX) / scale)
  const y = Math.max(0, (frame.top - shown.top + offsetY) / scale)
  return {
    x,
    y,
    width: Math.min(video.width - x, frame.width / scale),
    height: Math.min(video.height - y, frame.height / scale),
  }
}

/** Crops the framed part of the live video into a JPEG, at most MAX_EDGE on its long side. */
export async function captureFrame(video: HTMLVideoElement, frame: HTMLElement): Promise<Blob> {
  const area = frameInVideo({ width: video.videoWidth, height: video.videoHeight }, video.getBoundingClientRect(), frame.getBoundingClientRect())
  const scale = Math.min(1, MAX_EDGE / Math.max(area.width, area.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(area.width * scale)
  canvas.height = Math.round(area.height * scale)
  canvas.getContext('2d')!.drawImage(video, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
  if (!blob) throw new Error('Couldn’t capture that shot. Try again.')
  return blob
}
