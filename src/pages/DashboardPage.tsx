import { useEffect, useRef, useState } from 'react'
import { useAppWorkspace } from '../context/AppWorkspaceContext'
import { api } from '../lib/api'

type RecentPost = {
  id: string
  title: string
  postedAt: string
  format: string
  likes: number
  comments: number
  saves: number
  reach: number
  impressions: number
}

type AccountStats = {
  followers: number
  totalPosts: number
  recentPosts: RecentPost[]
}

type Post = {
  id: string
  title: string
  postedAt: string
  format: string
  likes: number
  comments: number
  saves: number
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

/**
 * Visão geral: macros, métricas agregadas e tabela paginada de posts com filtro de formato.
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

  const handleAccountChange = (id: string) => {
    setSelectedAccountId(id)
    setPage(1)
    setScrape(scrapeInit)
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
  const avgReach = avg(recentPosts.map((p) => p.reach))
  const avgSaves = avg(recentPosts.map((p) => p.saves))

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
        </div>
        <button
          type="button"
          onClick={() => void runScrape()}
          disabled={scrape.loading || !selectedAccountId}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-ink/[0.12] bg-card px-5 py-2.5 text-[14px] font-medium text-ink hover:bg-ink/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
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
            {
              label: 'Média de alcance',
              value: statsLoading ? '…' : recentPosts.length ? avgReach.toLocaleString('pt-BR') : '—',
              hint: 'Por post nos posts recentes',
            },
            {
              label: 'Média de salvamentos',
              value: statsLoading ? '…' : recentPosts.length ? avgSaves.toLocaleString('pt-BR') : '—',
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
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Publicações
          </h2>
          {postsData && (
            <p className="text-[13px] text-ink-muted">
              {postsData.total.toLocaleString('pt-BR')} publicação(ões) no total
            </p>
          )}
        </div>

        {postsLoading ? (
          <div className="h-48 animate-pulse rounded-2xl bg-ink/[0.06]" />
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-ink/[0.06] bg-card shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-[14px]">
                  <thead>
                    <tr className="border-b border-ink/[0.06] bg-surface text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                      <th className="px-5 py-3 font-medium">Post</th>
                      <th className="px-5 py-3 font-medium">Publicado em</th>
                      <th className="px-5 py-3 font-medium">Formato</th>
                      <th className="px-5 py-3 font-medium">Curtidas</th>
                      <th className="px-5 py-3 font-medium">Comentários</th>
                      <th className="px-5 py-3 font-medium">Salvamentos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(postsData?.data ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-[14px] text-ink-muted">
                          Nenhuma publicação no período. Ajuste as datas, o formato ou a conta.
                        </td>
                      </tr>
                    ) : (
                      (postsData?.data ?? []).map((p) => (
                        <tr key={p.id} className="border-b border-ink/[0.04] last:border-0">
                          <td className="max-w-[240px] px-5 py-4 font-medium text-ink">
                            <span className="line-clamp-2">{p.title}</span>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-ink-muted">
                            {formatDate(p.postedAt)}
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex rounded-full bg-brand/10 px-2.5 py-0.5 text-[12px] font-medium text-brand">
                              {p.format}
                            </span>
                          </td>
                          <td className="px-5 py-4 tabular-nums text-ink-muted">
                            {p.likes.toLocaleString('pt-BR')}
                          </td>
                          <td className="px-5 py-4 tabular-nums text-ink-muted">
                            {p.comments.toLocaleString('pt-BR')}
                          </td>
                          <td className="px-5 py-4 tabular-nums text-ink-muted">
                            {p.saves.toLocaleString('pt-BR')}
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
        )}
      </section>
    </div>
  )
}
