export type MediaPeekModel = {
  title?: string
  thumbnailUrl?: string | null
  videoUrl?: string | null
  carouselImages?: string[] | null | undefined
  textBody?: string | null
}

export function mediaPeekHasVisual(m: Pick<MediaPeekModel, 'thumbnailUrl' | 'videoUrl' | 'carouselImages'>): boolean {
  if (m.videoUrl) return true
  if (m.thumbnailUrl) return true
  const c = m.carouselImages?.filter(Boolean) ?? []
  return c.length > 0
}

export function mediaPeekHasPreview(m: MediaPeekModel): boolean {
  if (mediaPeekHasVisual(m)) return true
  return !!(m.textBody && m.textBody.trim())
}
