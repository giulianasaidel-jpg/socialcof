import { useEffect, useState } from 'react'
import { PaginationWithChannel } from '../components/PaginationWithChannel'
import { MediaPeekEyeButton, MediaPeekModal } from '../components/MediaPeek'
import type { MediaPeekModel } from '../lib/mediaPeek'
import { mediaPeekHasVisual } from '../lib/mediaPeek'
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

function storyPeek(story: InstagramStory): MediaPeekModel {
  return {
    title: `${story.account.displayName} · story`,
    thumbnailUrl: story.thumbnailUrl,
    videoUrl: story.videoUrl,
  }
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
  const [mediaPeek, setMediaPeek] = useState<MediaPeekModel | null>(null)

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

  const storiesPaginationAccount = instagramAccounts.find((a) => a.handle === accountId)

  return (
    <div className="space-y-8">
      <MediaPeekModal model={mediaPeek} onClose={() => setMediaPeek(null)} />
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
          <div className="h-40 animate-pulse rounded-2xl bg-ink/[0.06]" />
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
          <div className="overflow-hidden rounded-2xl border border-ink/[0.06] bg-card shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-ink/[0.06] bg-surface text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                    <th className="w-14 px-3 py-3">Mídia</th>
                    <th className="px-4 py-3">Conta</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Sync</th>
                    <th className="px-4 py-3">Expira</th>
                    <th className="px-4 py-3">Transcrição</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((story) => {
                    const peek = storyPeek(story)
                    const canPeek = mediaPeekHasVisual(peek)
                    return (
                      <tr key={story.id} className="border-b border-ink/[0.04] last:border-0">
                        <td className="px-3 py-3 align-middle">
                          {canPeek ? (
                            <MediaPeekEyeButton onClick={() => setMediaPeek(peek)} />
                          ) : (
                            <span className="inline-flex h-9 w-9 items-center justify-center text-ink-subtle">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-ink">{story.account.displayName}</p>
                          <p className="text-[11px] text-ink-muted">{formatNumber(story.account.followers)} seg.</p>
                        </td>
                        <td className="px-4 py-3 text-ink-muted">{story.mediaType === 'video' ? 'Vídeo' : 'Imagem'}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{formatDate(story.syncedAt)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                          {story.expiresAt ? formatDate(story.expiresAt) : '—'}
                        </td>
                        <td className="max-w-[220px] px-4 py-3">
                          {story.transcript ? (
                            <details className="text-[12px]">
                              <summary className="cursor-pointer text-brand">Ver</summary>
                              <p className="mt-1 max-h-28 overflow-y-auto text-ink-muted">{story.transcript}</p>
                            </details>
                          ) : (
                            <span className="text-ink-subtle">—</span>
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
            countLabel="stories"
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(data.pages, p + 1))}
            platform="instagram"
            channelImageUrl={storiesPaginationAccount?.profilePicS3Url}
            channelTitle={storiesPaginationAccount ? `@${storiesPaginationAccount.handle}` : undefined}
          />
        )}
      </section>
    </div>
  )
}
