import { useId } from 'react'

type Platform = 'instagram' | 'tiktok'

function InstagramGlyph({ className }: { className?: string }) {
  const gid = useId().replace(/:/g, '')
  return (
    <svg className={className} viewBox="0 0 24 24" width={36} height={36} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fd5949" />
          <stop offset="50%" stopColor="#d6249f" />
          <stop offset="100%" stopColor="#285aeb" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gid})`}
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"
      />
    </svg>
  )
}

function TikTokGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={36} height={36} fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.18v-.71h-2.91v16.5a2.75 2.75 0 1 1-2.75-2.75c.15 0 .3.02.44.04v-3.35a6.12 6.12 0 0 0-.44-.02 6.07 6.07 0 1 0 6.07 6.07V9.37a8.45 8.45 0 0 0 4.92 1.57V8.26a4.9 4.9 0 0 1-2.56-.57z" />
    </svg>
  )
}

function ChannelMark({
  platform,
  imageUrl,
  title,
}: {
  platform: Platform
  imageUrl?: string | null
  title?: string
}) {
  const alt = title || (platform === 'instagram' ? 'Instagram' : 'TikTok')
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={alt}
        className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-ink/[0.08]"
      />
    )
  }
  if (platform === 'instagram') {
    return <InstagramGlyph className="h-9 w-9 shrink-0 rounded-md" />
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-card ring-2 ring-ink/[0.08]">
      <TikTokGlyph className="h-5 w-5" />
    </span>
  )
}

export function PaginationWithChannel({
  page,
  pages,
  total,
  countLabel,
  onPrev,
  onNext,
  platform,
  channelImageUrl,
  channelTitle,
}: {
  page: number
  pages: number
  total: number
  countLabel: string
  onPrev: () => void
  onNext: () => void
  platform: Platform
  channelImageUrl?: string | null
  channelTitle?: string
}) {
  if (pages <= 1) return null
  const btnCls =
    'shrink-0 rounded-full border border-ink/[0.1] px-4 py-2 text-[14px] font-medium text-ink hover:bg-ink/[0.04] disabled:cursor-not-allowed disabled:opacity-40'
  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      <button type="button" onClick={onPrev} disabled={page <= 1} className={btnCls}>
        Anterior
      </button>
      <div className="flex min-w-0 flex-1 items-center justify-center gap-2.5 px-2">
        <ChannelMark platform={platform} imageUrl={channelImageUrl} title={channelTitle} />
        <span className="truncate text-center text-[13px] text-ink-muted">
          Página {page} de {pages} · {total.toLocaleString('pt-BR')} {countLabel}
        </span>
      </div>
      <button type="button" onClick={onNext} disabled={page >= pages} className={btnCls}>
        Próxima
      </button>
    </div>
  )
}
