import { useEffect, useRef, useState } from 'react'
import { useAppWorkspace } from '../context/AppWorkspaceContext'
import { api } from '../lib/api'

type Post = {
  id: string
  title: string
  postedAt: string
  format: string
  likes: number
  comments: number
  saves: number
  reach?: number
  impressions?: number
  thumbnailUrl?: string | null
  postUrl?: string | null
  carouselImages?: string[]
  videoUrl?: string | null
  transcript?: string | null
}

type RecentPost = Post

type AccountStats = {
  followers: number
  totalPosts: number
  recentPosts: RecentPost[]
}

type PostsResponse = {
  data: Post[]
  total: number
  page: number
  limit: number
}

const FORMAT_OPTIONS = ['', 'Reels', 'Carrossel', 'Estático']
const PAGE_LIMIT = 20

function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function avg(arr: number[]): number {
  if (!arr.length) return 0
  return Math.round(arr.reduce((s, v) => s + v, 0) / arr.length)
}

function ThumbnailPlaceholder({ size = 40, label = false }: { size?: number; label?: boolean }) {
  return (
    <div
      style={{ width: size, height: size, minWidth: size }}
      className="flex flex-col items-center justify-center gap-1 rounded bg-ink/[0.06]"
    >
      <span style={{ fontSize: size * 0.4 }} role="img" aria-label="Imagem indisponível">🖼️</span>
      {label && (
        <span className="text-center text-[10px] leading-tight text-ink-subtle">
          Imagem não disponível
        </span>
      )}
    </div>
  )
}

function PostDrawer({ post, onClose, onScrapeReels }: { post: Post; onClose: () => void; onScrapeReels?: () => void }) {
  const igUrl = post.postUrl ?? null
  const slides = post.carouselImages?.length ? post.carouselImages : null
  const [slideIndex, setSlideIndex] = useState(0)
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const isReel = post.format === 'Reels'
  const hasVideo = isReel && !!post.videoUrl
  const notProcessed = isReel && !post.videoUrl && !post.transcript

  useEffect(() => { setSlideIndex(0) }, [post.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-start">
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-sm flex-col overflow-y-auto bg-card shadow-2xl sm:h-screen">
        <div className="flex items-center justify-between border-b border-ink/[0.06] px-5 py-4">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-muted">
            Detalhes do post
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-ink/[0.06]"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-5 p-5">
          <div className="overflow-hidden rounded-2xl bg-surface">
            {hasVideo ? (
              <video
                controls
                src={post.videoUrl!}
                poster={post.thumbnailUrl ?? undefined}
                className="h-64 w-full bg-black object-contain"
              />
            ) : slides ? (
              <div className="relative">
                <img
                  src={slides[slideIndex]}
                  alt={`${post.title} — slide ${slideIndex + 1}`}
                  className="h-64 w-full object-cover"
                />
                {slides.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
                      disabled={slideIndex === 0}
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-ink/50 p-1.5 text-white disabled:opacity-30 hover:bg-ink/70"
                      aria-label="Slide anterior"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlideIndex((i) => Math.min(slides.length - 1, i + 1))}
                      disabled={slideIndex === slides.length - 1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-ink/50 p-1.5 text-white disabled:opacity-30 hover:bg-ink/70"
                      aria-label="Próximo slide"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-ink/60 px-2.5 py-0.5 text-[11px] font-medium text-white">
                      {slideIndex + 1} / {slides.length}
                    </span>
                  </>
                )}
              </div>
            ) : post.thumbnailUrl ? (
              <img
                src={post.thumbnailUrl}
                alt={post.title}
                className="h-64 w-full object-cover"
                onError={(e) => {
                  const el = e.currentTarget.parentElement
                  if (el) el.innerHTML = ''
                }}
              />
            ) : (
              <div className="flex h-64 w-full items-center justify-center">
                <ThumbnailPlaceholder size={64} label />
              </div>
            )}
          </div>

          <div>
            <span className="inline-flex rounded-full bg-brand/10 px-2.5 py-0.5 text-[12px] font-medium text-brand">
              {post.format}
            </span>
            <p className="mt-2 text-[16px] font-semibold leading-snug text-ink">
              {post.title}
            </p>
            <p className="mt-1 text-[13px] text-ink-muted">
              {formatDate(post.postedAt)}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-2">
            {[
              { label: 'Curtidas', value: post.likes },
              { label: 'Comentários', value: post.comments },
              { label: 'Salvamentos', value: post.saves },
              ...(post.reach != null ? [{ label: 'Alcance', value: post.reach }] : []),
              ...(post.impressions != null ? [{ label: 'Impressões', value: post.impressions }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-surface px-3 py-2.5">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                  {label}
                </dt>
                <dd className="mt-1 text-[15px] font-semibold tabular-nums text-ink">
                  {value.toLocaleString('pt-BR')}
                </dd>
              </div>
            ))}
          </dl>

          {post.transcript && (
            <div className="rounded-2xl border border-ink/[0.06] bg-surface">
              <button
                type="button"
                onClick={() => setTranscriptOpen((o) => !o)}
                className="flex w-full items-center justify-between px-4 py-3 text-[14px] font-medium text-ink"
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
                <p className="select-text border-t border-ink/[0.06] px-4 py-3 text-[13px] leading-relaxed text-ink-muted">
                  {post.transcript}
                </p>
              )}
            </div>
          )}

          {notProcessed && (
            <div className="rounded-2xl border border-dashed border-ink/[0.12] bg-surface px-4 py-4 text-center">
              <p className="text-[13px] text-ink-muted">Ainda não processado</p>
              {onScrapeReels && (
                <button
                  type="button"
                  onClick={onScrapeReels}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-4 py-2 text-[13px] font-medium text-brand hover:bg-brand/20"
                >
                  Transcrever / baixar Reels
                </button>
              )}
            </div>
          )}

          {igUrl && (
            <a
              href={igUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-full border border-ink/[0.12] px-4 py-2.5 text-[14px] font-medium text-ink hover:bg-ink/[0.04]"
            >
              Ver no Instagram
            </a>
          )}
        </div>
      </aside>
    </div>
  )
}

/**
 * Visão geral: macros, métricas agregadas, tabela paginada e galeria de posts.
 */
export function DashboardPage() {
  const { instagramAccounts, isLoading: accountsLoading, loadError: accountsError } = useAppWorkspace()

  const [selectedAccountId, setSelectedAccountId] = useState(
    instagramAccounts[0]?.id ?? '',
  )
  const [dateFrom, setDateFrom] = useState('2026-01-01')
  const [dateTo, setDateTo] = useState('2026-03-31')
  const [formatFilter, setFormatFilter] = useState('')
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState<'posts' | 'galeria'>('posts')
  const [drawerPost, setDrawerPost] = useState<Post | null>(null)

  const [stats, setStats] = useState<AccountStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  const [postsData, setPostsData] = useState<PostsResponse | null>(null)
  const [postsLoading, setPostsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (instagramAccounts.length && !selectedAccountId) {
      setSelectedAccountId(instagramAccounts[0].id)
    }
  }, [instagramAccounts, selectedAccountId])

  useEffect(() => {
    if (!selectedAccountId) return
    setStatsLoading(true)
    const p = new URLSearchParams()
    if (dateFrom) p.set('dateFrom', dateFrom)
    if (dateTo) p.set('dateTo', dateTo)
    api
      .get<AccountStats>(`/instagram-accounts/${selectedAccountId}/stats?${p}`)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false))
  }, [selectedAccountId, dateFrom, dateTo, refreshKey])

  useEffect(() => {
    if (!selectedAccountId) return
    setPostsLoading(true)
    setError(null)
    const p = new URLSearchParams({ accountId: selectedAccountId, page: String(page), limit: String(PAGE_LIMIT) })
    if (dateFrom) p.set('dateFrom', dateFrom)
    if (dateTo) p.set('dateTo', dateTo)
    if (formatFilter) p.set('format', formatFilter)
    api
      .get<PostsResponse>(`/posts?${p}`)
      .then(setPostsData)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar posts.')
        setPostsData(null)
      })
      .finally(() => setPostsLoading(false))
  }, [selectedAccountId, dateFrom, dateTo, formatFilter, page, refreshKey])

  type ScrapeState = { loading: boolean; elapsed: number; profileResult: string | null; postsResult: string | null; error: string | null }
  const scrapeInit: ScrapeState = { loading: false, elapsed: 0, profileResult: null, postsResult: null, error: null }
  const [scrape, setScrape] = useState<ScrapeState>(scrapeInit)
  const scrapeTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  type ReelsScrapeItem = { id: string; shortCode: string; s3VideoUrl?: string; transcript?: string; status: 'ok' | 'failed'; error?: string }
  type ReelsScrapeResponse = { total: number; reels: ReelsScrapeItem[] }
  type ReelsScrapeState = { loading: boolean; elapsed: number; result: ReelsScrapeResponse | null; error: string | null }
  const reelsScrapeInit: ReelsScrapeState = { loading: false, elapsed: 0, result: null, error: null }
  const [reelsScrape, setReelsScrape] = useState<ReelsScrapeState>(reelsScrapeInit)
  const reelsTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  async function runScrape() {
    if (!selectedAccountId) return
    if (scrapeTimer.current) clearInterval(scrapeTimer.current)
    setScrape({ loading: true, elapsed: 0, profileResult: null, postsResult: null, error: null })
    scrapeTimer.current = setInterval(() => {
      setScrape((s) => ({ ...s, elapsed: s.elapsed + 1 }))
    }, 1000)

    try {
      const [profile, postsRaw] = await Promise.all([
        api.post<{ followers: number; displayName: string; verified?: boolean }>(
          `/instagram-accounts/${selectedAccountId}/scrape/profile`,
        ),
        api.post<{ count?: number } | unknown[]>(
          `/instagram-accounts/${selectedAccountId}/scrape/posts?limit=50`,
        ),
      ])

      const postsCount = Array.isArray(postsRaw)
        ? postsRaw.length
        : (postsRaw as { count?: number }).count ?? '?'

      setScrape((s) => ({
        ...s,
        loading: false,
        profileResult: `${profile.displayName} · ${profile.followers.toLocaleString('pt-BR')} seguidores${profile.verified ? ' · verificado ✓' : ''}`,
        postsResult: `${postsCount} posts importados`,
      }))
      setRefreshKey((k) => k + 1)
      setPage(1)
    } catch (err) {
      setScrape((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Erro ao atualizar.',
      }))
    } finally {
      if (scrapeTimer.current) clearInterval(scrapeTimer.current)
    }
  }

  async function runReelsScrape() {
    if (!selectedAccountId) return
    if (reelsTimer.current) clearInterval(reelsTimer.current)
    setReelsScrape({ loading: true, elapsed: 0, result: null, error: null })
    reelsTimer.current = setInterval(() => {
      setReelsScrape((s) => ({ ...s, elapsed: s.elapsed + 1 }))
    }, 1000)

    try {
      const data = await api.post<ReelsScrapeResponse>(
        `/instagram-accounts/${selectedAccountId}/scrape/reels?limit=10`,
      )
      setReelsScrape((s) => ({ ...s, loading: false, result: data }))
      setRefreshKey((k) => k + 1)
      setPage(1)
    } catch (err) {
      setReelsScrape((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Erro ao processar Reels.',
      }))
    } finally {
      if (reelsTimer.current) clearInterval(reelsTimer.current)
    }
  }

  const handleAccountChange = (id: string) => {
    setSelectedAccountId(id)
    setPage(1)
    setScrape(scrapeInit)
    setReelsScrape(reelsScrapeInit)
    setDrawerPost(null)
  }

  const handleFilterChange = (key: 'dateFrom' | 'dateTo' | 'format', val: string) => {
    setPage(1)
    if (key === 'dateFrom') setDateFrom(val)
    else if (key === 'dateTo') setDateTo(val)
    else setFormatFilter(val)
  }

  const selectedAccount = instagramAccounts.find((a) => a.id === selectedAccountId)
  const totalPages = postsData ? Math.ceil(postsData.total / PAGE_LIMIT) : 1
  const recentPosts = stats?.recentPosts ?? []
  const avgLikes = avg(recentPosts.map((p) => p.likes))
  const posts = postsData?.data ?? []

  if (accountsLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-[15px] text-ink-muted">Carregando contas…</p>
      </div>
    )
  }

  if (accountsError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-[14px] text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
        <p className="font-semibold">Erro ao carregar contas Instagram</p>
        <p className="mt-1 font-mono text-[13px]">{accountsError}</p>
      </div>
    )
  }

  return (
    <>
      {drawerPost && (
        <PostDrawer
          post={drawerPost}
          onClose={() => setDrawerPost(null)}
          onScrapeReels={() => { setDrawerPost(null); void runReelsScrape() }}
        />
      )}

      <div className="space-y-10">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">
            Visão geral
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
            Métricas da conta no período selecionado. Use o filtro de formato
            para comparar Reels, Carrossel e Estático.
          </p>
        </header>

        <section className="rounded-2xl border border-ink/[0.06] bg-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <div className="grid gap-6 lg:grid-cols-3">
            <div>
              <label htmlFor="dash-account" className="text-sm font-medium text-ink">
                Conta Instagram
              </label>
              <select
                id="dash-account"
                value={selectedAccountId}
                onChange={(e) => handleAccountChange(e.target.value)}
                className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              >
                {instagramAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.displayName} (@{a.handle})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="text-sm font-medium text-ink">Período</p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  id="dash-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="flex-1 rounded-xl border border-ink/[0.1] bg-surface px-3 py-2.5 text-[14px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
                <span className="text-ink-muted">—</span>
                <input
                  id="dash-to"
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="flex-1 rounded-xl border border-ink/[0.1] bg-surface px-3 py-2.5 text-[14px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="dash-format" className="text-sm font-medium text-ink">
                Formato
              </label>
              <select
                id="dash-format"
                value={formatFilter}
                onChange={(e) => handleFilterChange('format', e.target.value)}
                className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              >
                {FORMAT_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f || 'Todos os formatos'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink/[0.06] bg-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <div>
            <p className="text-sm font-semibold text-ink">Sincronização manual</p>
            <p className="mt-0.5 text-[12px] text-ink-muted">
              Atualiza perfil e posts via Apify em paralelo. Roda automaticamente
              toda meia-noite. Pode levar 30–90 s.
            </p>
            {(scrape.profileResult || scrape.postsResult) && (
              <div className="mt-2 flex flex-wrap gap-3 text-[12px] font-medium text-emerald-700">
                {scrape.profileResult && <span>✓ {scrape.profileResult}</span>}
                {scrape.postsResult && <span>✓ {scrape.postsResult}</span>}
              </div>
            )}
            {scrape.error && (
              <p className="mt-2 text-[12px] text-red-700">{scrape.error}</p>
            )}
            {reelsScrape.result && (
              <div className="mt-2 flex flex-wrap gap-3 text-[12px] font-medium text-emerald-700">
                <span>
                  ✓ Reels: {reelsScrape.result.reels.filter((r) => r.status === 'ok').length} ok
                  {reelsScrape.result.reels.some((r) => r.status === 'failed') && (
                    <span className="ml-1 text-amber-700">
                      · {reelsScrape.result.reels.filter((r) => r.status === 'failed').length} falha(s)
                    </span>
                  )}
                </span>
              </div>
            )}
            {reelsScrape.error && (
              <p className="mt-2 text-[12px] text-red-700">{reelsScrape.error}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void runScrape()}
              disabled={scrape.loading || !selectedAccountId}
              className="inline-flex items-center gap-2 rounded-full border border-ink/[0.12] bg-card px-5 py-2.5 text-[14px] font-medium text-ink hover:bg-ink/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {scrape.loading ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink/30 border-t-ink" />
                  Atualizando… {scrape.elapsed}s
                </>
              ) : (
                'Atualizar'
              )}
            </button>
            <button
              type="button"
              onClick={() => void runReelsScrape()}
              disabled={reelsScrape.loading || !selectedAccountId}
              className="inline-flex items-center gap-2 rounded-full border border-ink/[0.12] bg-card px-5 py-2.5 text-[14px] font-medium text-ink hover:bg-ink/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {reelsScrape.loading ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink/30 border-t-ink" />
                  Transcrevendo… {reelsScrape.elapsed}s
                </>
              ) : (
                'Transcrever Reels'
              )}
            </button>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-ink">
            Macros — {selectedAccount ? `@${selectedAccount.handle}` : 'conta'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: 'Seguidores',
                value: statsLoading ? '…' : stats ? stats.followers.toLocaleString('pt-BR') : '—',
                hint: 'Total do perfil',
              },
              {
                label: 'Posts no período',
                value: statsLoading ? '…' : stats ? stats.totalPosts.toLocaleString('pt-BR') : '—',
                hint: 'Dentro do intervalo selecionado',
              },
              {
                label: 'Média de curtidas',
                value: statsLoading ? '…' : recentPosts.length ? avgLikes.toLocaleString('pt-BR') : '—',
                hint: 'Por post nos posts recentes',
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-ink/[0.06] bg-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-ink">
                  {card.value}
                </p>
                <p className="mt-1.5 text-[11px] text-ink-subtle">{card.hint}</p>
              </div>
            ))}
          </div>
        </section>

        {error && (
          <p className="rounded-xl border border-brand/30 bg-brand/5 px-4 py-3 text-[14px] text-ink">
            {error}
          </p>
        )}

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-ink/[0.08] bg-surface p-1">
              {(['posts', 'galeria'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={[
                    'rounded-lg px-4 py-1.5 text-[14px] font-medium capitalize transition',
                    activeTab === tab
                      ? 'bg-card text-ink shadow-sm'
                      : 'text-ink-muted hover:text-ink',
                  ].join(' ')}
                >
                  {tab === 'posts' ? 'Posts' : 'Galeria'}
                </button>
              ))}
            </div>
            {postsData && (
              <p className="text-[13px] text-ink-muted">
                {postsData.total.toLocaleString('pt-BR')} publicação(ões)
              </p>
            )}
          </div>

          {postsLoading ? (
            <div className="h-48 animate-pulse rounded-2xl bg-ink/[0.06]" />
          ) : activeTab === 'posts' ? (
            <>
              <div className="overflow-hidden rounded-2xl border border-ink/[0.06] bg-card shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-[14px]">
                    <thead>
                      <tr className="border-b border-ink/[0.06] bg-surface text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                        <th className="w-12 px-3 py-3" />
                        <th className="px-5 py-3 font-medium">Post</th>
                        <th className="px-5 py-3 font-medium">Publicado em</th>
                        <th className="px-5 py-3 font-medium">Formato</th>
                        <th className="px-5 py-3 font-medium">Curtidas</th>
                        <th className="px-5 py-3 font-medium">Comentários</th>
                      </tr>
                    </thead>
                    <tbody>
                      {posts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-10 text-center text-[14px] text-ink-muted">
                            Nenhuma publicação no período. Ajuste as datas, o formato ou a conta.
                          </td>
                        </tr>
                      ) : (
                        posts.map((p) => (
                          <tr
                            key={p.id}
                            onClick={() => setDrawerPost(p)}
                            className="cursor-pointer border-b border-ink/[0.04] transition hover:bg-ink/[0.02] last:border-0"
                          >
                            <td className="px-3 py-3">
                              <div className="relative" style={{ width: 40, height: 40 }}>
                                {p.thumbnailUrl ? (
                                  <img
                                    src={p.thumbnailUrl}
                                    alt={p.title}
                                    width={40}
                                    height={40}
                                    className="rounded object-cover"
                                    style={{ width: 40, height: 40 }}
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                ) : (
                                  <ThumbnailPlaceholder />
                                )}
                                {(p.carouselImages?.length ?? 0) > 0 && (
                                  <span className="absolute right-0.5 top-0.5 rounded bg-ink/70 px-1 text-[9px] font-semibold leading-tight text-white">
                                    ⧉{p.carouselImages!.length}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="max-w-[220px] px-5 py-3 font-medium text-ink">
                              <span className="line-clamp-2">{p.title}</span>
                            </td>
                            <td className="whitespace-nowrap px-5 py-3 text-ink-muted">
                              {formatDate(p.postedAt)}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex rounded-full bg-brand/10 px-2.5 py-0.5 text-[12px] font-medium text-brand">
                                  {p.format}
                                </span>
                                {p.transcript && (
                                  <span className="inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                                    Transcript
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3 tabular-nums text-ink-muted">
                              {p.likes.toLocaleString('pt-BR')}
                            </td>
                            <td className="px-5 py-3 tabular-nums text-ink-muted">
                              {p.comments.toLocaleString('pt-BR')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-full border border-ink/[0.1] px-4 py-2 text-[14px] font-medium text-ink hover:bg-ink/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <span className="text-[13px] text-ink-muted">
                    Página {page} de {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded-full border border-ink/[0.1] px-4 py-2 text-[14px] font-medium text-ink hover:bg-ink/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {posts.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-ink/[0.12] bg-surface px-6 py-16 text-center text-[14px] text-ink-muted">
                  Nenhuma publicação no período.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {posts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setDrawerPost(p)}
                      className="group relative overflow-hidden rounded-xl"
                      style={{ aspectRatio: '1/1' }}
                    >
                      {p.thumbnailUrl ? (
                        <img
                          src={p.thumbnailUrl}
                          alt={p.title}
                          className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                          onError={(e) => {
                            const parent = e.currentTarget.parentElement
                            if (parent) {
                              e.currentTarget.remove()
                              const ph = document.createElement('div')
                              ph.className = 'flex h-full w-full items-center justify-center bg-ink/[0.06]'
                              parent.appendChild(ph)
                            }
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-ink/[0.06]">
                          <span className="text-2xl" role="img" aria-label="Imagem indisponível">🖼️</span>
                          <span className="text-[10px] text-ink-subtle">Indisponível</span>
                        </div>
                      )}
                      {(p.carouselImages?.length ?? 0) > 0 && (
                        <span className="absolute right-1.5 top-1.5 rounded bg-ink/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          ⧉ {p.carouselImages!.length}
                        </span>
                      )}
                      {p.format === 'Reels' && p.videoUrl && (
                        <span className="absolute left-1.5 top-1.5 rounded bg-ink/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          ▶
                        </span>
                      )}
                      {p.transcript && (
                        <span className="absolute bottom-1.5 right-1.5 z-10 rounded bg-emerald-600/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          T
                        </span>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center gap-4 bg-ink/50 text-[13px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                        <span>❤️ {p.likes.toLocaleString('pt-BR')}</span>
                        <span>💬 {p.comments.toLocaleString('pt-BR')}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-full border border-ink/[0.1] px-4 py-2 text-[14px] font-medium text-ink hover:bg-ink/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <span className="text-[13px] text-ink-muted">
                    Página {page} de {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded-full border border-ink/[0.1] px-4 py-2 text-[14px] font-medium text-ink hover:bg-ink/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </>
  )
}
