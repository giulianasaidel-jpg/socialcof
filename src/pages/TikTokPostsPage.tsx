import { useEffect, useState } from 'react'
import { api } from '../lib/api'

type PostAccount = {
  id: string
  displayName: string
  followers: number
  profileUrl: string
}

type TikTokFeedPost = {
  id: string
  title: string
  postUrl: string
  likes: number
  comments: number
  shares: number
  views: number
  hashtags: string[]
  videoUrl: string | null
  thumbnailUrl: string | null
  transcript: string | null
  postedAt: string | null
  account: PostAccount | null
}

type TikTokPostsResponse = {
  data: TikTokFeedPost[]
  total: number
  page: number
  limit: number
  pages: number
}

type TikTokAccountOption = {
  id: string
  handle: string
  displayName: string
}

type TikTokAccountsResponse = {
  data: TikTokAccountOption[]
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

function TikTokFeedPostCard({ post }: { post: TikTokFeedPost }) {
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const hasVideo = !!post.videoUrl

  return (
    <div className="overflow-hidden rounded-2xl border border-ink/[0.06] bg-card shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="relative overflow-hidden bg-ink/[0.06]" style={{ aspectRatio: '1/1' }}>
        {hasVideo ? (
          <video
            controls
            src={post.videoUrl!}
            poster={post.thumbnailUrl ?? undefined}
            className="h-full w-full object-cover"
          />
        ) : post.thumbnailUrl ? (
          <img src={post.thumbnailUrl} alt={post.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-3xl" role="img" aria-label="Sem mídia">🎵</span>
          </div>
        )}
        {hasVideo && (
          <span className="absolute left-2 top-2 rounded bg-ink/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            ▶
          </span>
        )}
      </div>

      <div className="space-y-2 p-4">
        {post.account && (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[11px] font-bold text-brand">
              {post.account.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-ink">{post.account.displayName}</p>
              <p className="text-[10px] text-ink-muted">{formatNumber(post.account.followers)} seguidores</p>
            </div>
          </div>
        )}

        {post.title && <p className="line-clamp-2 text-[13px] text-ink">{post.title}</p>}

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] tabular-nums text-ink-muted">
          <span>{formatNumber(post.views)} views</span>
          <span>{formatNumber(post.likes)} curtidas</span>
          <span>{formatNumber(post.shares)} shares</span>
          <span>{formatNumber(post.comments)} comentários</span>
        </div>

        {post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.hashtags.slice(0, 5).map((tag) => (
              <span key={tag} className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
                #{tag}
              </span>
            ))}
            {post.hashtags.length > 5 && (
              <span className="text-[11px] text-ink-muted">+{post.hashtags.length - 5}</span>
            )}
          </div>
        )}

        {post.postedAt && (
          <p className="text-[11px] text-ink-muted">{formatDate(post.postedAt)}</p>
        )}

        {post.transcript && (
          <div className="rounded-xl border border-ink/[0.06] bg-surface">
            <button
              type="button"
              onClick={() => setTranscriptOpen((o) => !o)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-[13px] font-medium text-ink"
            >
              <span>Transcrição</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                className={transcriptOpen ? 'rotate-180 transition-transform' : 'transition-transform'}
              >
                <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {transcriptOpen && (
              <p className="select-text border-t border-ink/[0.06] px-3 py-2.5 text-[12px] leading-relaxed text-ink-muted">
                {post.transcript}
              </p>
            )}
          </div>
        )}

        <a
          href={post.postUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-full border border-ink/[0.12] px-3 py-1.5 text-center text-[12px] font-medium text-ink hover:bg-ink/[0.04]"
        >
          Ver no TikTok
        </a>
      </div>
    </div>
  )
}

/**
 * Página de posts TikTok: listagem paginada de todos os posts do workspace com conta embutida.
 */
export function TikTokPostsPage() {
  const [accounts, setAccounts] = useState<TikTokAccountOption[]>([])
  const [accountId, setAccountId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const [data, setData] = useState<TikTokPostsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<TikTokAccountsResponse>('/tiktok-accounts?limit=100')
      .then((res) => setAccounts(res.data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    void fetchPosts()
  }, [accountId, dateFrom, dateTo, page])

  async function fetchPosts() {
    setLoading(true)
    setError(null)
    try {
      const p = new URLSearchParams({ page: String(page), limit: String(PAGE_LIMIT) })
      if (accountId) p.set('accountId', accountId)
      if (dateFrom) p.set('dateFrom', dateFrom)
      if (dateTo) p.set('dateTo', dateTo)
      const res = await api.get<TikTokPostsResponse>(`/tiktok-accounts/posts?${p}`)
      setData(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar posts TikTok.')
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
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">TikTok</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">Posts</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
          Posts TikTok de todas as contas do workspace com vídeo, métricas e transcrição.
        </p>
      </header>

      <section className="rounded-2xl border border-ink/[0.06] bg-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="tiktok-posts-account" className="text-sm font-medium text-ink">
              Conta
            </label>
            <select
              id="tiktok-posts-account"
              value={accountId}
              onChange={(e) => { setAccountId(e.target.value); resetPage() }}
              className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            >
              <option value="">Todas as contas</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.handle}>{a.displayName}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="tiktok-posts-date-from" className="text-sm font-medium text-ink">De</label>
            <input
              id="tiktok-posts-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); resetPage() }}
              className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[14px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div>
            <label htmlFor="tiktok-posts-date-to" className="text-sm font-medium text-ink">Até</label>
            <input
              id="tiktok-posts-date-to"
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
            {data.total.toLocaleString('pt-BR')} post(s) · página {data.page} de {data.pages}
          </p>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-ink/[0.06]" style={{ aspectRatio: '1/1' }} />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-[14px] text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            <p className="font-semibold">Erro ao carregar posts TikTok</p>
            <p className="mt-1 font-mono text-[13px]">{error}</p>
          </div>
        ) : !data || data.data.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink/[0.12] bg-surface px-6 py-16 text-center text-[14px] text-ink-muted">
            Nenhum post encontrado para os filtros selecionados.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.data.map((post) => (
              <TikTokFeedPostCard key={post.id} post={post} />
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
              Página {page} de {data.pages} · {data.total.toLocaleString('pt-BR')} posts
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
