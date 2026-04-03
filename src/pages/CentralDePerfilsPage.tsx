import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../lib/api'

const WORKSPACE_LABELS: Record<string, string> = {
  'socialcof': 'Social Cof — Produtos',
  'diretoria-medica': 'Social Cof — Médicos',
}

type InstagramAccountFull = {
  id: string
  handle: string
  displayName: string
  followers: number
  workspace: string
  profilePicS3Url: string | null
  brandColors: string[]
  referenceImages: string[]
}

type TikTokAccount = {
  id: string
  handle: string
  displayName: string
  profileUrl: string
  followers: number
  isVerified: boolean
  profilePicUrl: string | null
  workspace: string
}

type ApiAccountFull = {
  id: string
  externalId?: string
  handle: string
  displayName: string
  followers?: number
  workspace?: string
  profilePicS3Url?: string | null
  brandColors?: string[]
  referenceImages?: string[]
}

type TikTokAccountsResponse = {
  data: TikTokAccount[]
  total: number
  page: number
  limit: number
  pages: number
}

type AddingTo = { workspace: string; network: 'instagram' | 'tiktok' }

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('pt-BR')
}

/**
 * Modal para adicionar conta Instagram ou TikTok a um workspace via discover.
 */
function AddAccountModal({
  target,
  onClose,
  onSuccess,
}: {
  target: AddingTo
  onClose: () => void
  onSuccess: () => void
}) {
  const [handle, setHandle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const networkLabel = target.network === 'instagram' ? 'Instagram' : 'TikTok'
  const endpoint = target.network === 'instagram'
    ? '/instagram-accounts/discover'
    : '/tiktok-accounts/discover'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const cleanHandle = handle.trim().replace(/^@/, '')
    if (!cleanHandle) {
      setError('Informe o @ da conta.')
      return
    }
    setLoading(true)
    try {
      await api.post(endpoint, { handle: cleanHandle, workspace: target.workspace })
      setDone(true)
      onSuccess()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg.includes('409') ? 'Esta conta já existe no banco.' : `Erro: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">
              Adicionar conta {networkLabel}
            </h2>
            <p className="mt-0.5 text-[13px] text-ink-muted">
              Workspace: <span className="font-medium text-ink">{target.workspace}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-ink/[0.06]"
            aria-label="Fechar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {done ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <p className="text-[14px] font-medium text-emerald-800 dark:text-emerald-300">
              Conta adicionada com sucesso.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full rounded-xl border border-ink/[0.1] py-2 text-[13px] font-medium text-ink hover:bg-ink/[0.04]"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label htmlFor="add-account-handle" className="text-[13px] font-medium text-ink">
                @ da conta
              </label>
              <input
                id="add-account-handle"
                value={handle}
                onChange={(e) => { setHandle(e.target.value); setError('') }}
                placeholder="handle sem @"
                autoFocus
                className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700 dark:bg-red-950/30 dark:text-red-400">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand py-3 text-[15px] font-medium text-white hover:bg-brand/90 disabled:opacity-60"
            >
              {loading ? 'Buscando perfil…' : 'Descobrir e adicionar'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

/**
 * Modal de branding de uma conta Instagram: foto de perfil S3, cores e imagens de referência.
 */
function BrandingModal({ account, onClose }: { account: InstagramAccountFull; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-3xl bg-card shadow-2xl">
        <div className="flex items-start justify-between border-b border-ink/[0.06] p-6">
          <div className="flex items-center gap-3">
            {account.profilePicS3Url ? (
              <img
                src={account.profilePicS3Url}
                alt={account.displayName}
                className="h-14 w-14 rounded-full object-cover ring-2 ring-ink/[0.06]"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-xl font-bold text-white">
                {account.handle[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-[16px] font-semibold text-ink">{account.displayName}</p>
              <p className="text-[13px] text-ink-muted">@{account.handle}</p>
              {account.followers > 0 && (
                <p className="text-[12px] text-ink-subtle">{formatNumber(account.followers)} seguidores</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-ink/[0.06]"
            aria-label="Fechar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Foto de perfil S3
            </p>
            {account.profilePicS3Url ? (
              <img
                src={account.profilePicS3Url}
                alt={account.displayName}
                className="h-24 w-24 rounded-2xl object-cover shadow-[0_2px_12px_rgba(0,0,0,0.10)]"
              />
            ) : (
              <p className="text-[13px] text-ink-muted">Nenhuma foto enviada ainda.</p>
            )}
          </div>

          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Cores da marca
              {account.brandColors.length > 0 && (
                <span className="ml-1 font-normal normal-case">({account.brandColors.length})</span>
              )}
            </p>
            {account.brandColors.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {account.brandColors.map((color, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-ink/[0.08] bg-surface px-2.5 py-1.5"
                  >
                    <div
                      className="h-4 w-4 rounded-full border border-ink/[0.1]"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-mono text-[12px] text-ink">{color}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-ink-muted">Nenhuma cor cadastrada.</p>
            )}
          </div>

          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Imagens de referência
              {account.referenceImages.length > 0 && (
                <span className="ml-1 font-normal normal-case">({account.referenceImages.length})</span>
              )}
            </p>
            {account.referenceImages.length > 0 ? (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {account.referenceImages.map((url) => (
                  <div
                    key={url}
                    className="aspect-square overflow-hidden rounded-xl border border-ink/[0.06]"
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-ink-muted">Nenhuma imagem de referência.</p>
            )}
          </div>

          <a
            href="/branding"
            className="block rounded-xl border border-ink/[0.1] px-4 py-2.5 text-center text-[13px] font-medium text-ink-muted transition hover:bg-ink/[0.04] hover:text-ink"
          >
            Editar branding
          </a>
        </div>
      </div>
    </div>
  )
}

/**
 * Central de perfis: contas Instagram e TikTok agrupadas por workspace, com modal de branding por conta.
 */
export function CentralDePerfilsPage() {
  const [instagramAccounts, setInstagramAccounts] = useState<InstagramAccountFull[]>([])
  const [tiktokAccounts, setTiktokAccounts] = useState<TikTokAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedAccount, setSelectedAccount] = useState<InstagramAccountFull | null>(null)
  const [addingTo, setAddingTo] = useState<AddingTo | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get<ApiAccountFull[]>('/instagram-accounts'),
      api.get<TikTokAccountsResponse>('/tiktok-accounts?limit=100'),
    ])
      .then(([igAccounts, tiktokRes]) => {
        setInstagramAccounts(
          igAccounts.map((a) => ({
            id: a.externalId ?? a.id,
            handle: a.handle,
            displayName: a.displayName,
            followers: a.followers ?? 0,
            workspace: a.workspace ?? 'socialcof',
            profilePicS3Url: a.profilePicS3Url ?? null,
            brandColors: a.brandColors ?? [],
            referenceImages: a.referenceImages ?? [],
          })),
        )
        setTiktokAccounts(tiktokRes.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [refreshKey])

  const workspaces = Array.from(
    new Set([
      ...instagramAccounts.map((a) => a.workspace),
      ...tiktokAccounts.map((a) => a.workspace),
    ]),
  ).sort()

  const workspaceSections = workspaces.map((ws) => ({
    id: ws,
    label: WORKSPACE_LABELS[ws] ?? ws,
    instagram: instagramAccounts.filter((a) => a.workspace === ws),
    tiktok: tiktokAccounts.filter((a) => a.workspace === ws),
  }))

  function handleAddSuccess() {
    setAddingTo(null)
    setRefreshKey((k) => k + 1)
  }

  return (
    <>
      {addingTo && (
        <AddAccountModal
          target={addingTo}
          onClose={() => setAddingTo(null)}
          onSuccess={handleAddSuccess}
        />
      )}
      {selectedAccount && (
        <BrandingModal account={selectedAccount} onClose={() => setSelectedAccount(null)} />
      )}

      <div className="space-y-10">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Central de perfis</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
            Branding e contas vinculadas por workspace e rede social.
          </p>
        </header>

        {loading ? (
          <div className="space-y-8">
            {[1, 2].map((k) => (
              <div key={k} className="space-y-3">
                <div className="h-5 w-48 animate-pulse rounded-lg bg-ink/[0.06]" />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-20 animate-pulse rounded-2xl bg-ink/[0.06]" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : workspaceSections.length === 0 ? (
          <p className="text-[14px] text-ink-muted">Nenhuma conta cadastrada.</p>
        ) : (
          workspaceSections.map((ws) => (
            <section key={ws.id} className="space-y-6">
              <h2 className="text-xl font-semibold tracking-tight text-ink">{ws.label}</h2>

              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  Instagram
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {ws.instagram.map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => setSelectedAccount(account)}
                      className="flex items-center gap-3 rounded-2xl border border-ink/[0.06] bg-card p-4 text-left shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition hover:border-brand/40 hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
                    >
                      {account.profilePicS3Url ? (
                        <img
                          src={account.profilePicS3Url}
                          alt={account.handle}
                          className="h-10 w-10 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-sm font-bold text-white">
                          {account.handle[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-ink">{account.displayName}</p>
                        <p className="text-[12px] text-ink-muted">@{account.handle}</p>
                        {account.followers > 0 && (
                          <p className="text-[11px] text-ink-subtle">{formatNumber(account.followers)} seguidores</p>
                        )}
                      </div>
                      {(account.brandColors.length > 0 || account.referenceImages.length > 0) && (
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {account.brandColors.length > 0 && (
                            <div className="flex gap-1">
                              {account.brandColors.slice(0, 4).map((c, i) => (
                                <div
                                  key={i}
                                  className="h-3 w-3 rounded-full border border-ink/[0.1]"
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                          )}
                          {account.referenceImages.length > 0 && (
                            <p className="text-[10px] text-ink-subtle">
                              {account.referenceImages.length} ref.
                            </p>
                          )}
                        </div>
                      )}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAddingTo({ workspace: ws.id, network: 'instagram' })}
                    className="flex min-h-[72px] items-center justify-center rounded-2xl border border-dashed border-ink/[0.15] bg-surface transition hover:border-brand/40 hover:bg-brand/[0.03]"
                    aria-label="Adicionar conta Instagram"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-ink/30">
                      <path d="M9 2v14M2 9h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  TikTok
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {ws.tiktok.map((account) => (
                    <a
                      key={account.id}
                      href={account.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-2xl border border-ink/[0.06] bg-card p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition hover:border-brand/40 hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
                    >
                      {account.profilePicUrl ? (
                        <img
                          src={account.profilePicUrl}
                          alt={account.handle}
                          className="h-10 w-10 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
                          {account.handle[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium text-ink">
                          {account.displayName}{account.isVerified ? ' ✓' : ''}
                        </p>
                        <p className="text-[12px] text-ink-muted">@{account.handle}</p>
                        {account.followers > 0 && (
                          <p className="text-[11px] text-ink-subtle">{formatNumber(account.followers)} seguidores</p>
                        )}
                      </div>
                    </a>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAddingTo({ workspace: ws.id, network: 'tiktok' })}
                    className="flex min-h-[72px] items-center justify-center rounded-2xl border border-dashed border-ink/[0.15] bg-surface transition hover:border-brand/40 hover:bg-brand/[0.03]"
                    aria-label="Adicionar conta TikTok"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-ink/30">
                      <path d="M9 2v14M2 9h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </section>
          ))
        )}
      </div>
    </>
  )
}
