import { useEffect, useRef, useState, type FormEvent } from 'react'
import { MediaPeekEyeButton, MediaPeekModal } from '../components/MediaPeek'
import type { MediaPeekModel } from '../lib/mediaPeek'
import { mediaPeekHasVisual } from '../lib/mediaPeek'
import { useAuth } from '../context/AuthContext'
import { useAppWorkspace } from '../context/AppWorkspaceContext'
import { api } from '../lib/api'

type TikTokAccount = {
  id: string
  handle: string
  displayName: string
  profileUrl: string
  followers: number
  following: number
  likesCount: number
  workspace: string
  isVerified: boolean
  profilePicUrl: string | null
  lastSyncAt: string | null
}

type TikTokPost = {
  id: string
  text: string
  postUrl: string
  likes: number
  comments: number
  shares: number
  views: number
  hashtags: string[]
  videoUrl: string | null
  thumbnailUrl: string | null
  transcript: string | null
}

type ScrapeTikTokPostsResponse = {
  total: number
  saved: number
  posts: TikTokPost[]
}

type TikTokAccountsResponse = {
  data: TikTokAccount[]
  total: number
  page: number
  limit: number
  pages: number
}

const ACCOUNTS_LIMIT = 6

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

function scrapedPostPeek(post: TikTokPost): MediaPeekModel {
  return { title: post.text || 'Post', thumbnailUrl: post.thumbnailUrl, videoUrl: post.videoUrl }
}

type AccountCardProps = {
  account: TikTokAccount
  isAdmin: boolean
  isScraping: boolean
  onScrape: () => void
  onDelete: () => void
}

function TikTokAccountCard({ account, isAdmin, isScraping, onScrape, onDelete }: AccountCardProps) {
  return (
    <div className="rounded-2xl border border-ink/[0.06] bg-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-start gap-3">
        {account.profilePicUrl ? (
          <img
            src={account.profilePicUrl}
            alt={account.displayName}
            className="h-12 w-12 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[20px] font-bold text-brand">
            {account.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-semibold text-ink">{account.displayName}</p>
            {account.isVerified && (
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                Verificado ✓
              </span>
            )}
          </div>
          <a
            href={account.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] text-ink-muted hover:text-brand hover:underline"
          >
            @{account.handle}
          </a>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: 'Seguidores', value: formatNumber(account.followers) },
          { label: 'Seguindo', value: formatNumber(account.following) },
          { label: 'Curtidas', value: formatNumber(account.likesCount) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-surface px-3 py-2 text-center">
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
              {label}
            </p>
            <p className="mt-0.5 text-[14px] font-semibold tabular-nums text-ink">{value}</p>
          </div>
        ))}
      </div>

      {account.lastSyncAt && (
        <p className="mt-3 text-[11px] text-ink-muted">
          Última sync: {formatDate(account.lastSyncAt)}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onScrape}
          disabled={isScraping}
          className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-4 py-2 text-[13px] font-medium text-brand hover:bg-brand/20 disabled:opacity-60"
        >
          {isScraping ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
              Scraping…
            </>
          ) : (
            'Scrape Posts'
          )}
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-full border border-red-200 px-3 py-2 text-[13px] font-medium text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Excluir
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Página de contas TikTok: listagem, descoberta (admin) e scraping de posts.
 */
export function TikTokAccountsPage() {
  const { user } = useAuth()
  const { workspaceId } = useAppWorkspace()
  const isAdmin = user?.role === 'admin'

  const [accounts, setAccounts] = useState<TikTokAccount[]>([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [accountsError, setAccountsError] = useState<string | null>(null)
  const [accountsPage, setAccountsPage] = useState(1)
  const [accountsTotalPages, setAccountsTotalPages] = useState(1)
  const [accountsTotal, setAccountsTotal] = useState(0)

  const [discoverHandle, setDiscoverHandle] = useState('')
  const [discoverWorkspace, setDiscoverWorkspace] = useState(workspaceId)
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [discoverError, setDiscoverError] = useState('')
  const [discovered, setDiscovered] = useState<TikTokAccount | null>(null)

  const [scrapeAccountId, setScrapeAccountId] = useState<string | null>(null)
  const [scrapeLoading, setScrapeLoading] = useState(false)
  const [scrapeElapsed, setScrapeElapsed] = useState(0)
  const [scrapeResult, setScrapeResult] = useState<ScrapeTikTokPostsResponse | null>(null)
  const [scrapeError, setScrapeError] = useState<string | null>(null)
  const [mediaPeek, setMediaPeek] = useState<MediaPeekModel | null>(null)
  const scrapeTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    void loadAccounts()
  }, [workspaceId, accountsPage])

  /**
   * Carrega a página atual de contas TikTok do workspace via API paginada.
   */
  async function loadAccounts() {
    setAccountsLoading(true)
    setAccountsError(null)
    try {
      const p = new URLSearchParams({ workspace: workspaceId, page: String(accountsPage), limit: String(ACCOUNTS_LIMIT) })
      const res = await api.get<TikTokAccountsResponse>(`/tiktok-accounts?${p}`)
      setAccounts(res.data)
      setAccountsTotalPages(res.pages)
      setAccountsTotal(res.total)
    } catch (err) {
      setAccountsError(err instanceof Error ? err.message : 'Erro ao carregar contas.')
    } finally {
      setAccountsLoading(false)
    }
  }

  /**
   * Descobre e cadastra uma conta TikTok via Apify (admin).
   */
  async function discoverAccount(e: FormEvent) {
    e.preventDefault()
    setDiscoverError('')
    setDiscovered(null)
    const handle = discoverHandle.trim().replace(/^@/, '')
    if (!handle) {
      setDiscoverError('Informe o @ da conta.')
      return
    }
    setDiscoverLoading(true)
    try {
      const account = await api.post<TikTokAccount>('/tiktok-accounts/discover', {
        handle,
        workspace: discoverWorkspace,
      })
      setDiscovered(account)
      setDiscoverHandle('')
      if (accountsPage === 1) {
        void loadAccounts()
      } else {
        setAccountsPage(1)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('409')) {
        setDiscoverError('Esta conta já existe no banco.')
      } else {
        setDiscoverError(`Erro: ${msg}`)
      }
    } finally {
      setDiscoverLoading(false)
    }
  }

  /**
   * Remove uma conta TikTok (admin).
   */
  async function deleteAccount(id: string) {
    try {
      await api.delete(`/tiktok-accounts/${id}`)
      if (scrapeAccountId === id) {
        setScrapeAccountId(null)
        setScrapeResult(null)
      }
      void loadAccounts()
    } catch {
      void 0
    }
  }

  /**
   * Faz scraping dos posts de uma conta TikTok.
   */
  async function scrapeAccountPosts(accountId: string) {
    if (scrapeTimer.current) clearInterval(scrapeTimer.current)
    setScrapeAccountId(accountId)
    setScrapeLoading(true)
    setScrapeElapsed(0)
    setScrapeResult(null)
    setScrapeError(null)
    scrapeTimer.current = setInterval(() => {
      setScrapeElapsed((s) => s + 1)
    }, 1000)
    try {
      const data = await api.post<ScrapeTikTokPostsResponse>(
        `/tiktok-accounts/${accountId}/scrape/posts?limit=30`,
      )
      setScrapeResult(data)
    } catch (err) {
      setScrapeError(err instanceof Error ? err.message : 'Erro ao fazer scraping dos posts.')
    } finally {
      setScrapeLoading(false)
      if (scrapeTimer.current) clearInterval(scrapeTimer.current)
    }
  }

  const scrapeAccount = accounts.find((a) => a.id === scrapeAccountId)

  return (
    <div className="space-y-10">
      <MediaPeekModal model={mediaPeek} onClose={() => setMediaPeek(null)} />
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          Social
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
          Contas TikTok
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
          Gerencie perfis TikTok do workspace, scrape posts com vídeo e
          transcrição automática via Whisper.
        </p>
      </header>

      {isAdmin && (
        <section className="rounded-2xl border border-ink/[0.06] bg-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Descobrir conta TikTok
          </h2>
          <p className="mt-1 text-[13px] text-ink-muted">
            Busca o perfil público via Apify e salva no banco com followers e
            displayName reais.
          </p>

          <form
            onSubmit={(e) => void discoverAccount(e)}
            className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto_auto]"
          >
            <div>
              <label htmlFor="tiktok-handle" className="text-sm font-medium text-ink">
                @ da conta
              </label>
              <input
                id="tiktok-handle"
                value={discoverHandle}
                onChange={(e) => {
                  setDiscoverHandle(e.target.value)
                  setDiscoverError('')
                }}
                placeholder="drcardiooficial"
                className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label htmlFor="tiktok-workspace" className="text-sm font-medium text-ink">
                Workspace
              </label>
              <input
                id="tiktok-workspace"
                value={discoverWorkspace}
                onChange={(e) => setDiscoverWorkspace(e.target.value as typeof workspaceId)}
                placeholder="medcof"
                className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={discoverLoading}
                className="rounded-full bg-brand px-6 py-3 text-[15px] font-medium text-white hover:bg-brand-hover disabled:opacity-60 active:scale-[0.98]"
              >
                {discoverLoading ? 'Buscando…' : 'Descobrir'}
              </button>
            </div>
          </form>

          {discoverError && (
            <p className="mt-3 text-[13px] text-red-700">{discoverError}</p>
          )}

          {discovered && (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-400">
                Conta criada com sucesso
              </p>
              <div className="mt-2">
                <p className="text-[15px] font-semibold text-ink">{discovered.displayName}</p>
                <p className="text-[13px] text-ink-muted">
                  @{discovered.handle} · {formatNumber(discovered.followers)} seguidores ·
                  workspace: {discovered.workspace}
                </p>
                <a
                  href={discovered.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-[13px] text-brand hover:underline"
                >
                  Abrir perfil
                </a>
              </div>
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-ink">
          Contas cadastradas
        </h2>
        {accountsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((k) => (
              <div key={k} className="h-52 animate-pulse rounded-2xl bg-ink/[0.06]" />
            ))}
          </div>
        ) : accountsError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-[14px] text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            <p className="font-semibold">Erro ao carregar contas TikTok</p>
            <p className="mt-1 font-mono text-[13px]">{accountsError}</p>
          </div>
        ) : accounts.length === 0 ? (
          <p className="rounded-xl border border-ink/[0.06] bg-surface px-4 py-8 text-center text-[14px] text-ink-muted">
            {isAdmin
              ? 'Nenhuma conta cadastrada. Use o formulário acima para descobrir um perfil.'
              : 'Nenhuma conta TikTok disponível para este workspace.'}
          </p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map((account) => (
                <TikTokAccountCard
                  key={account.id}
                  account={account}
                  isAdmin={isAdmin}
                  isScraping={scrapeLoading && scrapeAccountId === account.id}
                  onScrape={() => void scrapeAccountPosts(account.id)}
                  onDelete={() => void deleteAccount(account.id)}
                />
              ))}
            </div>
            {accountsTotalPages > 1 && (
              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setAccountsPage((p) => Math.max(1, p - 1))}
                  disabled={accountsPage <= 1}
                  className="rounded-full border border-ink/[0.1] px-4 py-2 text-[14px] font-medium text-ink hover:bg-ink/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-[13px] text-ink-muted">
                  Página {accountsPage} de {accountsTotalPages} · {accountsTotal} conta(s)
                </span>
                <button
                  type="button"
                  onClick={() => setAccountsPage((p) => Math.min(accountsTotalPages, p + 1))}
                  disabled={accountsPage >= accountsTotalPages}
                  className="rounded-full border border-ink/[0.1] px-4 py-2 text-[14px] font-medium text-ink hover:bg-ink/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Próxima
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {(scrapeResult || scrapeError) && scrapeAccount && (
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-ink">
                Posts de @{scrapeAccount.handle}
              </h2>
              {scrapeResult && (
                <p className="mt-0.5 text-[13px] text-ink-muted">
                  {scrapeResult.total} encontrado(s) · {scrapeResult.saved} salvo(s)
                </p>
              )}
              {scrapeError && (
                <p className="mt-1 text-[13px] text-red-700">{scrapeError}</p>
              )}
            </div>
            {scrapeLoading && (
              <div className="flex items-center gap-2 text-[13px] text-ink-muted">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink/30 border-t-ink" />
                Processando… {scrapeElapsed}s
              </div>
            )}
          </div>

          {scrapeResult && scrapeResult.posts.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-ink/[0.06] bg-card">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-ink/[0.06] bg-surface text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                      <th className="w-14 px-3 py-3">Mídia</th>
                      <th className="px-4 py-3">Texto</th>
                      <th className="px-4 py-3">Views</th>
                      <th className="px-4 py-3">Curtidas</th>
                      <th className="px-4 py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scrapeResult.posts.map((post) => {
                      const peek = scrapedPostPeek(post)
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
                          <td className="max-w-[280px] px-4 py-3">
                            <span className="line-clamp-2 text-ink">{post.text || '—'}</span>
                          </td>
                          <td className="px-4 py-3 tabular-nums text-ink-muted">{formatNumber(post.views)}</td>
                          <td className="px-4 py-3 tabular-nums text-ink-muted">{formatNumber(post.likes)}</td>
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

          {scrapeResult && scrapeResult.posts.length === 0 && (
            <p className="rounded-xl border border-dashed border-ink/[0.12] bg-surface px-6 py-12 text-center text-[14px] text-ink-muted">
              Nenhum post encontrado para esta conta.
            </p>
          )}
        </section>
      )}
    </div>
  )
}
