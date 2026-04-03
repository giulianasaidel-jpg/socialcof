import { useEffect, useState } from 'react'
import { useAppWorkspace } from '../context/AppWorkspaceContext'
import { api } from '../lib/api'

type StoryAccount = {
  id: string
  displayName: string
  followers: number
}

type InstagramStory = {
  id: string
  storyId: string
  mediaType: 'image' | 'video'
  thumbnailUrl: string | null
  videoUrl: string | null
  transcript: string | null
  syncedAt: string
  expiresAt: string | null
  account: StoryAccount
}

type StoriesResponse = {
  data: InstagramStory[]
  total: number
  page: number
  limit: number
  pages: number
}

const PAGE_LIMIT = 20

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('pt-BR')
}

function StoryCard({ story }: { story: InstagramStory }) {
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const hasVideo = story.mediaType === 'video' && !!story.videoUrl

  return (
    <div className="overflow-hidden rounded-2xl border border-ink/[0.06] bg-card shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <div className="relative overflow-hidden bg-ink/[0.06]" style={{ aspectRatio: '9/16' }}>
        {hasVideo ? (
          <video
            controls
            src={story.videoUrl!}
            poster={story.thumbnailUrl ?? undefined}
            className="h-full w-full object-cover"
          />
        ) : story.thumbnailUrl ? (
          <img src={story.thumbnailUrl} alt="Story" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-2xl" role="img" aria-label="Sem mídia">🖼️</span>
          </div>
        )}
        <span
          className={[
            'absolute right-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white',
            story.mediaType === 'video' ? 'bg-brand/80' : 'bg-ink/60',
          ].join(' ')}
        >
          {story.mediaType === 'video' ? '▶ Vídeo' : '🖼 Imagem'}
        </span>
      </div>

      <div className="space-y-2 p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[10px] font-bold text-brand">
            {story.account.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-ink">{story.account.displayName}</p>
            <p className="text-[10px] text-ink-muted">{formatNumber(story.account.followers)} seguidores</p>
          </div>
        </div>

        <p className="text-[11px] text-ink-muted">Sync: {formatDate(story.syncedAt)}</p>
        {story.expiresAt && (
          <p className="text-[11px] text-ink-muted">Expira: {formatDate(story.expiresAt)}</p>
        )}

        {story.transcript && (
          <div className="rounded-xl border border-ink/[0.06] bg-surface">
            <button
              type="button"
              onClick={() => setTranscriptOpen((o) => !o)}
              className="flex w-full items-center justify-between px-3 py-2 text-[12px] font-medium text-ink"
            >
              <span>Transcrição</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 14 14"
                fill="none"
                className={transcriptOpen ? 'rotate-180 transition-transform' : 'transition-transform'}
              >
                <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {transcriptOpen && (
              <p className="select-text border-t border-ink/[0.06] px-3 py-2 text-[11px] leading-relaxed text-ink-muted">
                {story.transcript}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Página de stories do Instagram: listagem paginada com filtros e conta de origem embutida.
 */
export function InstagramStoriesPage() {
  const { instagramAccounts, workspaceId } = useAppWorkspace()

  const [accountId, setAccountId] = useState('')
  const [mediaType, setMediaType] = useState<'image' | 'video' | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const [data, setData] = useState<StoriesResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetchStories()
  }, [accountId, mediaType, dateFrom, dateTo, page, workspaceId])

  async function fetchStories() {
    setLoading(true)
    setError(null)
    try {
      const p = new URLSearchParams({ workspace: workspaceId, page: String(page), limit: String(PAGE_LIMIT) })
      if (accountId) p.set('accountId', accountId)
      if (mediaType) p.set('mediaType', mediaType)
      if (dateFrom) p.set('dateFrom', dateFrom)
      if (dateTo) p.set('dateTo', dateTo)
      const res = await api.get<StoriesResponse>(`/instagram-stories?${p}`)
      setData(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar stories.')
    } finally {
      setLoading(false)
    }
  }

  function resetPage() {
    setPage(1)
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Instagram</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">Stories</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
          Stories sincronizados com thumbnail, transcrição e conta de origem.
        </p>
      </header>

      <section className="rounded-2xl border border-ink/[0.06] bg-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="stories-account" className="text-sm font-medium text-ink">
              Conta
            </label>
            <select
              id="stories-account"
              value={accountId}
              onChange={(e) => { setAccountId(e.target.value); resetPage() }}
              className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            >
              <option value="">Todas as contas</option>
              {instagramAccounts.map((a) => (
                <option key={a.id} value={a.handle}>{a.displayName} (@{a.handle})</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="stories-media-type" className="text-sm font-medium text-ink">
              Tipo de mídia
            </label>
            <select
              id="stories-media-type"
              value={mediaType}
              onChange={(e) => { setMediaType(e.target.value as 'image' | 'video' | ''); resetPage() }}
              className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            >
              <option value="">Todos</option>
              <option value="image">Imagem</option>
              <option value="video">Vídeo</option>
            </select>
          </div>

          <div>
            <label htmlFor="stories-date-from" className="text-sm font-medium text-ink">De</label>
            <input
              id="stories-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); resetPage() }}
              className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[14px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div>
            <label htmlFor="stories-date-to" className="text-sm font-medium text-ink">Até</label>
            <input
              id="stories-date-to"
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => { setDateTo(e.target.value); resetPage() }}
              className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[14px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>
      </section>

      <section>
        {data && (
          <p className="mb-4 text-[13px] text-ink-muted">
            {data.total.toLocaleString('pt-BR')} story(ies) · página {data.page} de {data.pages}
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-ink/[0.06]" style={{ aspectRatio: '9/16' }} />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-[14px] text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            <p className="font-semibold">Erro ao carregar stories</p>
            <p className="mt-1 font-mono text-[13px]">{error}</p>
          </div>
        ) : !data || data.data.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink/[0.12] bg-surface px-6 py-16 text-center text-[14px] text-ink-muted">
            Nenhum story encontrado para os filtros selecionados.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {data.data.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        )}

        {data && data.pages > 1 && (
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-full border border-ink/[0.1] px-4 py-2 text-[14px] font-medium text-ink hover:bg-ink/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-[13px] text-ink-muted">
              Página {page} de {data.pages} · {data.total.toLocaleString('pt-BR')} stories
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
              disabled={page >= data.pages}
              className="rounded-full border border-ink/[0.1] px-4 py-2 text-[14px] font-medium text-ink hover:bg-ink/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
