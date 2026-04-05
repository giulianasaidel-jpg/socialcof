import { useEffect, useState } from 'react'
import { PaginationWithChannel } from '../components/PaginationWithChannel'
import { MediaPeekEyeButton, MediaPeekModal } from '../components/MediaPeek'
import type { MediaPeekModel } from '../lib/mediaPeek'
import { mediaPeekHasVisual } from '../lib/mediaPeek'
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
  profilePicUrl?: string | null
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

function postPeek(post: TikTokFeedPost): MediaPeekModel {
  return { title: post.title, thumbnailUrl: post.thumbnailUrl, videoUrl: post.videoUrl }
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
  const [mediaPeek, setMediaPeek] = useState<MediaPeekModel | null>(null)

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

  const tiktokPaginationAccount = accounts.find((a) => a.handle === accountId)

  return (
    <div className="space-y-8">
      <MediaPeekModal model={mediaPeek} onClose={() => setMediaPeek(null)} />
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
          <div className="h-40 animate-pulse rounded-2xl bg-ink/[0.06]" />
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
          <div className="overflow-hidden rounded-2xl border border-ink/[0.06] bg-card shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-ink/[0.06] bg-surface text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                    <th className="w-14 px-3 py-3">Mídia</th>
                    <th className="px-4 py-3">Título</th>
                    <th className="px-4 py-3">Conta</th>
                    <th className="px-4 py-3">Views</th>
                    <th className="px-4 py-3">Curtidas</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((post) => {
                    const peek = postPeek(post)
                    const canPeek = mediaPeekHasVisual(peek)
                    return (
                      <tr key={post.id} className="border-b border-ink/[0.04] last:border-0">
                        <td className="px-3 py-3 align-middle">
                          {canPeek ? (
                            <MediaPeekEyeButton onClick={() => setMediaPeek(peek)} />
                          ) : (
                            <span className="inline-flex h-9 w-9 items-center justify-center text-ink-subtle">—</span>
                          )}
                        </td>
                        <td className="max-w-[220px] px-4 py-3 font-medium text-ink">
                          <span className="line-clamp-2">{post.title || '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-ink-muted">{post.account?.displayName ?? '—'}</td>
                        <td className="px-4 py-3 tabular-nums text-ink-muted">{formatNumber(post.views)}</td>
                        <td className="px-4 py-3 tabular-nums text-ink-muted">{formatNumber(post.likes)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                          {post.postedAt ? formatDate(post.postedAt) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <a
                            href={post.postUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[12px] font-medium text-brand hover:underline"
                          >
                            TikTok
                          </a>
                          {post.transcript && (
                            <details className="mt-1 text-[11px]">
                              <summary className="cursor-pointer text-brand">Transcrição</summary>
                              <p className="mt-1 max-h-24 overflow-y-auto text-ink-muted">{post.transcript}</p>
                            </details>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data && (
          <PaginationWithChannel
            page={page}
            pages={data.pages}
            total={data.total}
            countLabel="posts"
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(data.pages, p + 1))}
            platform="tiktok"
            channelImageUrl={tiktokPaginationAccount?.profilePicUrl}
            channelTitle={tiktokPaginationAccount ? `@${tiktokPaginationAccount.handle}` : undefined}
          />
        )}
      </section>
    </div>
  )
}
