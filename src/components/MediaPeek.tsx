import { useEffect, useState } from 'react'
import type { MediaPeekModel } from '../lib/mediaPeek'

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function MediaPeekEyeButton({
  onClick,
  label = 'Ver mídia',
}: {
  onClick: (e: React.MouseEvent) => void
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick(e)
      }}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ink/[0.1] text-ink-muted transition hover:border-brand/30 hover:bg-brand/10 hover:text-brand"
      aria-label={label}
    >
      <EyeIcon />
    </button>
  )
}

function peekSignature(model: MediaPeekModel): string {
  return [
    model.videoUrl ?? '',
    model.thumbnailUrl ?? '',
    (model.carouselImages ?? []).join(','),
    model.textBody?.slice(0, 40) ?? '',
  ].join('|')
}

function MediaPeekModalInner({ model, onClose }: { model: MediaPeekModel; onClose: () => void }) {
  const [slide, setSlide] = useState(0)
  const car = model.carouselImages?.filter((u): u is string => typeof u === 'string' && u.length > 0) ?? []
  const hasVideo = !!model.videoUrl
  const useCarousel = !hasVideo && car.length > 1
  const singleStill =
    !hasVideo && car.length === 1
      ? car[0]
      : !hasVideo && car.length === 0
        ? model.thumbnailUrl
        : null
  const textOnly =
    !hasVideo && !singleStill && !useCarousel && model.textBody && model.textBody.trim().length > 0

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl">
      <div className="flex items-center justify-between border-b border-ink/[0.06] px-4 py-3">
        <p className="min-w-0 truncate pr-2 text-[14px] font-semibold text-ink">{model.title || 'Pré-visualização'}</p>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-2 text-ink-muted hover:bg-ink/[0.06] hover:text-ink"
          aria-label="Fechar"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="overflow-y-auto p-4">
        {hasVideo && (
          <video
            controls
            src={model.videoUrl!}
            poster={model.thumbnailUrl ?? undefined}
            className="mx-auto max-h-[70vh] w-full rounded-xl bg-black object-contain"
          />
        )}
        {useCarousel && (
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-xl bg-ink/[0.06]">
              <img
                src={car[slide]}
                alt=""
                className="mx-auto max-h-[70vh] w-full object-contain"
              />
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={slide <= 0}
                onClick={() => setSlide((s) => Math.max(0, s - 1))}
                className="rounded-lg border border-ink/[0.1] px-3 py-1.5 text-[13px] font-medium disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-[13px] text-ink-muted">
                {slide + 1} / {car.length}
              </span>
              <button
                type="button"
                disabled={slide >= car.length - 1}
                onClick={() => setSlide((s) => Math.min(car.length - 1, s + 1))}
                className="rounded-lg border border-ink/[0.1] px-3 py-1.5 text-[13px] font-medium disabled:opacity-40"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
        {!hasVideo && !useCarousel && singleStill && (
          <img src={singleStill} alt="" className="mx-auto max-h-[70vh] w-full rounded-xl object-contain" />
        )}
        {textOnly && (
          <pre className="whitespace-pre-wrap break-words rounded-xl bg-surface p-4 text-[13px] leading-relaxed text-ink">
            {model.textBody}
          </pre>
        )}
        {!hasVideo && !useCarousel && !singleStill && !textOnly && (
          <p className="py-8 text-center text-[14px] text-ink-muted">Nada para pré-visualizar.</p>
        )}
      </div>
    </div>
  )
}

export function MediaPeekModal({ model, onClose }: { model: MediaPeekModel | null; onClose: () => void }) {
  if (!model) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
        aria-label="Fechar"
        onClick={onClose}
      />
      <MediaPeekModalInner key={peekSignature(model)} model={model} onClose={onClose} />
    </div>
  )
}
