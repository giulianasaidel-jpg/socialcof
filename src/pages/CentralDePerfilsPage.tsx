import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

const WORKSPACE_LABELS: Record<string, string> = {
  'socialcof': 'Social Cof — Produtos',
  'diretoria-medica': 'Social Cof — Médicos',
  'medcof': 'Medcof',
  'professores-medcof': 'Professores Medcof',
  'concorrentes': 'Concorrentes',
  'creators': 'Creators',
}

const WORKSPACE_TAB_LABEL: Record<string, string> = {
  'socialcof': 'Social Cof',
  'diretoria-medica': 'Médicos',
  'medcof': 'Medcof',
  'professores-medcof': 'Professores',
  'concorrentes': 'Concorrentes',
  'creators': 'Creators',
}

const WORKSPACE_ORDER = ['medcof', 'professores-medcof', 'concorrentes', 'creators']

/**
 * Ordena workspace ids pela ordem definida em WORKSPACE_ORDER; desconhecidos vão ao final em ordem alfabética.
 */
function sortWorkspaces(ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    const ai = WORKSPACE_ORDER.indexOf(a)
    const bi = WORKSPACE_ORDER.indexOf(b)
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    return a.localeCompare(b)
  })
}

type InstagramAccountFull = {
  documentId: string
  id: string
  handle: string
  displayName: string
  followers: number
  workspace: string
  profilePicS3Url: string | null
  brandColors: string[]
  referenceImages: string[]
  relatedInstagramAccountIds: string[]
  relatedTikTokAccountIds: string[]
  relatedMedNewsSourceIds: string[]
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
  relatedInstagramAccountIds?: string[]
  relatedTikTokAccountIds?: string[]
  relatedMedNewsSourceIds?: string[]
}

type MedNewsSourceRow = { _id: string; name: string }

type TikTokAccountsResponse = {
  data: TikTokAccount[]
  total: number
  page: number
  limit: number
  pages: number
}

type AddingTo = { workspace: string; network: 'instagram' | 'tiktok' }

type BulkDiscoverResult = {
  handle: string
  status: 'created' | 'updated' | 'failed'
  account?: { displayName: string; followers: number; profilePicS3Url: string | null }
  error?: string
}

type BulkDiscoverResponse = {
  summary: { total: number; created: number; updated: number; failed: number }
  results: BulkDiscoverResult[]
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('pt-BR')
}

function uniqIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))]
}

function instagramPatchPath(a: InstagramAccountFull): string {
  return a.id || a.documentId
}

function findIgByRelationId(rid: string, list: InstagramAccountFull[]): InstagramAccountFull | null {
  return list.find((x) => x.documentId === rid || x.id === rid) ?? null
}

function isIgLinked(related: string[], other: InstagramAccountFull): boolean {
  return related.includes(other.documentId) || (!!other.id && related.includes(other.id))
}

function InstagramCardInterestsPanel({
  account,
  instagramAccounts,
  tiktokAccounts,
  medNewsSources,
  onPatched,
}: {
  account: InstagramAccountFull
  instagramAccounts: InstagramAccountFull[]
  tiktokAccounts: TikTokAccount[]
  medNewsSources: MedNewsSourceRow[]
  onPatched: (a: InstagramAccountFull) => void
}) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const relIg = uniqIds(account.relatedInstagramAccountIds)
  const relTt = uniqIds(account.relatedTikTokAccountIds)
  const relMed = uniqIds(account.relatedMedNewsSourceIds)

  async function save(next: InstagramAccountFull) {
    setBusy(true)
    setError('')
    const payload = {
      relatedInstagramAccountIds: uniqIds(next.relatedInstagramAccountIds),
      relatedTikTokAccountIds: uniqIds(next.relatedTikTokAccountIds),
      relatedMedNewsSourceIds: uniqIds(next.relatedMedNewsSourceIds),
    }
    try {
      await api.patch(`/instagram-accounts/${encodeURIComponent(instagramPatchPath(next))}`, payload)
      onPatched({ ...next, ...payload })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const igCandidates = instagramAccounts.filter(
    (o) => o.documentId !== account.documentId && !isIgLinked(relIg, o),
  )
  const ttCandidates = tiktokAccounts.filter((o) => !relTt.includes(o.id))
  const medCandidates = medNewsSources.filter((s) => !relMed.includes(s._id))

  return (
    <div className="space-y-3 border-t border-ink/[0.06] bg-surface/50 px-3 py-3">
      {error ? (
        <p className="rounded-lg bg-red-50 px-2 py-1.5 text-[11px] text-red-700 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Notícias</p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {relMed.length === 0 ? (
            <span className="text-[11px] text-ink-muted">Nenhuma fonte vinculada.</span>
          ) : (
            relMed.map((rid) => {
              const src = medNewsSources.find((s) => s._id === rid)
              return (
                <span
                  key={rid}
                  className="inline-flex max-w-full items-center gap-1 rounded-lg border border-ink/[0.08] bg-card px-2 py-0.5 text-[11px] text-ink"
                >
                  <span className="truncate" title={rid}>
                    {src?.name ?? rid}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void save({ ...account, relatedMedNewsSourceIds: relMed.filter((x) => x !== rid) })
                    }
                    className="shrink-0 rounded px-0.5 text-ink-muted hover:text-red-600 disabled:opacity-40"
                    aria-label="Remover fonte"
                  >
                    ×
                  </button>
                </span>
              )
            })
          )}
        </div>
        {medCandidates.length > 0 ? (
          <select
            defaultValue=""
            disabled={busy}
            onChange={(e) => {
              const v = e.target.value
              e.currentTarget.value = ''
              if (!v) return
              void save({ ...account, relatedMedNewsSourceIds: [...relMed, v] })
            }}
            className="w-full rounded-lg border border-ink/[0.1] bg-surface px-2 py-1.5 text-[12px] text-ink"
          >
            <option value="">+ Adicionar fonte de notícias</option>
            {medCandidates.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-[10px] text-ink-subtle">
            {medNewsSources.length === 0
              ? 'Nenhuma fonte no catálogo (Central de Sites).'
              : 'Todas as fontes listadas já estão vinculadas.'}
          </p>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Instagram</p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {relIg.length === 0 ? (
            <span className="text-[11px] text-ink-muted">Nenhuma conta vinculada.</span>
          ) : (
            relIg.map((rid) => {
              const o = findIgByRelationId(rid, instagramAccounts)
              return (
                <span
                  key={rid}
                  className="inline-flex max-w-full items-center gap-1 rounded-lg border border-ink/[0.08] bg-card px-2 py-0.5 text-[11px] text-ink"
                >
                  <span className="truncate" title={rid}>
                    {o ? `${o.displayName} (@${o.handle})` : rid}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void save({ ...account, relatedInstagramAccountIds: relIg.filter((x) => x !== rid) })
                    }
                    className="shrink-0 rounded px-0.5 text-ink-muted hover:text-red-600 disabled:opacity-40"
                    aria-label="Remover conta"
                  >
                    ×
                  </button>
                </span>
              )
            })
          )}
        </div>
        {igCandidates.length > 0 ? (
          <select
            defaultValue=""
            disabled={busy}
            onChange={(e) => {
              const v = e.target.value
              e.currentTarget.value = ''
              if (!v) return
              void save({ ...account, relatedInstagramAccountIds: [...relIg, v] })
            }}
            className="w-full rounded-lg border border-ink/[0.1] bg-surface px-2 py-1.5 text-[12px] text-ink"
          >
            <option value="">+ Adicionar conta Instagram</option>
            {igCandidates.map((o) => (
              <option key={o.documentId} value={o.documentId}>
                {o.displayName} (@{o.handle})
              </option>
            ))}
          </select>
        ) : (
          <p className="text-[10px] text-ink-subtle">
            {instagramAccounts.filter((x) => x.documentId !== account.documentId).length === 0
              ? 'Não há outras contas Instagram.'
              : 'Todas as outras contas já estão vinculadas.'}
          </p>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">TikTok</p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {relTt.length === 0 ? (
            <span className="text-[11px] text-ink-muted">Nenhuma conta vinculada.</span>
          ) : (
            relTt.map((rid) => {
              const o = tiktokAccounts.find((t) => t.id === rid)
              return (
                <span
                  key={rid}
                  className="inline-flex max-w-full items-center gap-1 rounded-lg border border-ink/[0.08] bg-card px-2 py-0.5 text-[11px] text-ink"
                >
                  <span className="truncate" title={rid}>
                    {o ? `${o.displayName} (@${o.handle})` : rid}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void save({ ...account, relatedTikTokAccountIds: relTt.filter((x) => x !== rid) })
                    }
                    className="shrink-0 rounded px-0.5 text-ink-muted hover:text-red-600 disabled:opacity-40"
                    aria-label="Remover TikTok"
                  >
                    ×
                  </button>
                </span>
              )
            })
          )}
        </div>
        {ttCandidates.length > 0 ? (
          <select
            defaultValue=""
            disabled={busy}
            onChange={(e) => {
              const v = e.target.value
              e.currentTarget.value = ''
              if (!v) return
              void save({ ...account, relatedTikTokAccountIds: [...relTt, v] })
            }}
            className="w-full rounded-lg border border-ink/[0.1] bg-surface px-2 py-1.5 text-[12px] text-ink"
          >
            <option value="">+ Adicionar conta TikTok</option>
            {ttCandidates.map((o) => (
              <option key={o.id} value={o.id}>
                {o.displayName} (@{o.handle})
              </option>
            ))}
          </select>
        ) : (
          <p className="text-[10px] text-ink-subtle">
            {tiktokAccounts.length === 0
              ? 'Nenhuma conta TikTok carregada.'
              : 'Todas as contas TikTok já estão vinculadas.'}
          </p>
        )}
      </div>

      {busy ? <p className="text-[10px] text-ink-muted">Salvando…</p> : null}
    </div>
  )
}

function AdminProfileDeleteModal({
  title,
  entityLabel,
  onClose,
  onConfirm,
}: {
  title: string
  entityLabel: string
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm()
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-card p-6 shadow-2xl">
        <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
        <p className="mt-2 text-[14px] text-ink-muted">
          Remover <strong className="text-ink">{entityLabel}</strong> permanentemente? Não dá para desfazer.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-[14px] font-medium text-ink-muted hover:bg-ink/[0.04]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="rounded-xl bg-red-500 px-5 py-2 text-[14px] font-semibold text-white disabled:opacity-50"
          >
            {loading ? 'Excluindo…' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Modal para descobrir múltiplas contas Instagram em lote via POST /instagram-accounts/bulk-discover.
 */
function BulkAddInstagramModal({
  workspace,
  onClose,
  onSuccess,
}: {
  workspace: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [handles, setHandles] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [response, setResponse] = useState<BulkDiscoverResponse | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const parsed = handles
      .split(/[\n,]+/)
      .map((h) => h.trim().replace(/^@/, ''))
      .filter(Boolean)
    if (parsed.length === 0) {
      setError('Informe ao menos um handle.')
      return
    }
    setLoading(true)
    try {
      const res = await api.post<BulkDiscoverResponse>(
        '/instagram-accounts/bulk-discover',
        { handles: parsed, workspace },
      )
      setResponse(res)
      setHandles('')
      onSuccess()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(`Erro: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-3xl bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">Adicionar contas em lote</h2>
            <p className="mt-0.5 text-[13px] text-ink-muted">
              Workspace: <span className="font-medium text-ink">{workspace}</span>
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

        {!response ? (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label htmlFor="bulk-handles-central" className="text-[13px] font-medium text-ink">
                Handles (um por linha ou separados por vírgula)
              </label>
              <textarea
                id="bulk-handles-central"
                value={handles}
                onChange={(e) => { setHandles(e.target.value); setError('') }}
                placeholder={'oslermedicina\ndr.joaosilva\nmedcoficial'}
                rows={5}
                autoFocus
                className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[14px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
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
              {loading ? 'Processando…' : 'Descobrir e adicionar'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { label: 'Total', value: response.summary.total, cls: 'bg-ink/[0.06] text-ink' },
                  { label: 'Criados', value: response.summary.created, cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' },
                  { label: 'Atualizados', value: response.summary.updated, cls: 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-400' },
                  { label: 'Falhas', value: response.summary.failed, cls: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400' },
                ] as const
              ).map(({ label, value, cls }) => (
                <div key={label} className={`rounded-xl px-3 py-1.5 text-[12px] font-medium ${cls}`}>
                  {label}: {value}
                </div>
              ))}
            </div>

            <ul className="divide-y divide-ink/[0.06] rounded-xl border border-ink/[0.06] bg-surface">
              {response.results.map((r) => (
                <li key={r.handle} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    {r.account?.profilePicS3Url ? (
                      <img
                        src={r.account.profilePicS3Url}
                        alt={r.handle}
                        className="h-7 w-7 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-[10px] font-bold text-white">
                        {r.handle[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-[13px] font-medium text-ink">
                        {r.account?.displayName ?? `@${r.handle}`}
                      </p>
                      {r.error && (
                        <p className="text-[11px] text-red-600">{r.error}</p>
                      )}
                    </div>
                  </div>
                  <span
                    className={[
                      'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                      r.status === 'created'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : r.status === 'updated'
                          ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400',
                    ].join(' ')}
                  >
                    {r.status}
                  </span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-ink/[0.1] py-2.5 text-[13px] font-medium text-ink hover:bg-ink/[0.04]"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  )
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
      setError(`Erro: ${msg}`)
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
function BrandingModal({
  account,
  onClose,
  onRefresh,
  refreshing,
}: {
  account: InstagramAccountFull
  onClose: () => void
  onRefresh: () => Promise<void>
  refreshing: boolean
}) {
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

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void onRefresh()}
              disabled={refreshing}
              className="flex-1 rounded-xl border border-ink/[0.1] px-4 py-2.5 text-center text-[13px] font-medium text-ink-muted transition hover:bg-ink/[0.04] hover:text-ink disabled:opacity-50"
            >
              {refreshing ? 'Atualizando…' : 'Atualizar branding'}
            </button>
            <a
              href="/branding"
              className="flex-1 rounded-xl border border-ink/[0.1] px-4 py-2.5 text-center text-[13px] font-medium text-ink-muted transition hover:bg-ink/[0.04] hover:text-ink"
            >
              Editar branding
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Central de perfis: contas Instagram e TikTok agrupadas por workspace, com modal de branding por conta.
 */
export function CentralDePerfilsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [instagramAccounts, setInstagramAccounts] = useState<InstagramAccountFull[]>([])
  const [tiktokAccounts, setTiktokAccounts] = useState<TikTokAccount[]>([])
  const [medNewsSources, setMedNewsSources] = useState<MedNewsSourceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedAccount, setSelectedAccount] = useState<InstagramAccountFull | null>(null)
  const [addingTo, setAddingTo] = useState<AddingTo | null>(null)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const [bulkAddingWorkspace, setBulkAddingWorkspace] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [adminDeleteTarget, setAdminDeleteTarget] = useState<
    | { kind: 'instagram'; account: InstagramAccountFull }
    | { kind: 'tiktok'; account: TikTokAccount }
    | null
  >(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get<ApiAccountFull[]>('/instagram-accounts'),
      api.get<TikTokAccountsResponse>('/tiktok-accounts?limit=100'),
      api.get<MedNewsSourceRow[]>('/medical-news/sources').catch(() => []),
    ])
      .then(([igAccounts, tiktokRes, sources]) => {
        setInstagramAccounts(
          igAccounts.map((a) => ({
            documentId: a.id,
            id: a.externalId ?? a.id,
            handle: a.handle,
            displayName: a.displayName,
            followers: a.followers ?? 0,
            workspace: a.workspace ?? 'socialcof',
            profilePicS3Url: a.profilePicS3Url ?? null,
            brandColors: a.brandColors ?? [],
            referenceImages: a.referenceImages ?? [],
            relatedInstagramAccountIds: a.relatedInstagramAccountIds ?? [],
            relatedTikTokAccountIds: a.relatedTikTokAccountIds ?? [],
            relatedMedNewsSourceIds: a.relatedMedNewsSourceIds ?? [],
          })),
        )
        setTiktokAccounts(tiktokRes.data)
        setMedNewsSources(Array.isArray(sources) ? sources : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [refreshKey])

  const allWorkspaces = sortWorkspaces(
    Array.from(new Set([
      ...instagramAccounts.map((a) => a.workspace),
      ...tiktokAccounts.map((a) => a.workspace),
    ])),
  )

  const workspaceSections = allWorkspaces
    .filter((ws) => activeTab === null || ws === activeTab)
    .map((ws) => ({
      id: ws,
      label: WORKSPACE_LABELS[ws] ?? ws,
      instagram: instagramAccounts.filter((a) => a.workspace === ws),
      tiktok: tiktokAccounts.filter((a) => a.workspace === ws),
    }))

  function handleAddSuccess() {
    setAddingTo(null)
    setRefreshKey((k) => k + 1)
  }

  function mergeInstagramAccountPatched(next: InstagramAccountFull) {
    setInstagramAccounts((prev) => prev.map((a) => (a.documentId === next.documentId ? next : a)))
    setSelectedAccount((p) => (p?.documentId === next.documentId ? next : p))
  }

  /**
   * Chama POST /instagram-accounts/discover para atualizar foto de perfil, cores e imagens da conta.
   */
  async function refreshAccount(account: InstagramAccountFull) {
    setRefreshingId(account.documentId)
    try {
      const updated = await api.post<ApiAccountFull>('/instagram-accounts/discover', {
        handle: account.handle,
        workspace: account.workspace,
      })
      const mapped: InstagramAccountFull = {
        documentId: updated.id,
        id: updated.externalId ?? updated.id,
        handle: updated.handle,
        displayName: updated.displayName,
        followers: updated.followers ?? 0,
        workspace: updated.workspace ?? account.workspace,
        profilePicS3Url: updated.profilePicS3Url ?? null,
        brandColors: updated.brandColors ?? [],
        referenceImages: updated.referenceImages ?? [],
        relatedInstagramAccountIds: updated.relatedInstagramAccountIds ?? account.relatedInstagramAccountIds,
        relatedTikTokAccountIds: updated.relatedTikTokAccountIds ?? account.relatedTikTokAccountIds,
        relatedMedNewsSourceIds: updated.relatedMedNewsSourceIds ?? account.relatedMedNewsSourceIds,
      }
      setInstagramAccounts((prev) => prev.map((a) => (a.documentId === account.documentId ? mapped : a)))
      setSelectedAccount((prev) => (prev?.documentId === account.documentId ? mapped : prev))
    } catch {}
    finally {
      setRefreshingId(null)
    }
  }

  async function executeAdminDelete() {
    if (!adminDeleteTarget) return
    if (adminDeleteTarget.kind === 'instagram') {
      const id = adminDeleteTarget.account.documentId
      await api.delete(`/instagram-accounts/${id}`)
      setInstagramAccounts((prev) => prev.filter((a) => a.documentId !== id))
      setSelectedAccount((prev) => (prev?.documentId === id ? null : prev))
    } else {
      const id = adminDeleteTarget.account.id
      await api.delete(`/tiktok-accounts/${id}`)
      setTiktokAccounts((prev) => prev.filter((a) => a.id !== id))
    }
    setAdminDeleteTarget(null)
  }

  return (
    <>
      {adminDeleteTarget && (
        <AdminProfileDeleteModal
          title={adminDeleteTarget.kind === 'instagram' ? 'Excluir Instagram' : 'Excluir TikTok'}
          entityLabel={`@${adminDeleteTarget.account.handle}`}
          onClose={() => setAdminDeleteTarget(null)}
          onConfirm={executeAdminDelete}
        />
      )}
      {addingTo && (
        <AddAccountModal
          target={addingTo}
          onClose={() => setAddingTo(null)}
          onSuccess={handleAddSuccess}
        />
      )}
      {bulkAddingWorkspace && (
        <BulkAddInstagramModal
          workspace={bulkAddingWorkspace}
          onClose={() => setBulkAddingWorkspace(null)}
          onSuccess={() => setRefreshKey((k) => k + 1)}
        />
      )}
      {selectedAccount && (
        <BrandingModal
          account={selectedAccount}
          onClose={() => setSelectedAccount(null)}
          onRefresh={() => refreshAccount(selectedAccount)}
          refreshing={refreshingId === selectedAccount.documentId}
        />
      )}

      <div className="space-y-10">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Central de perfis</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
            Branding e contas vinculadas por workspace e rede social.
          </p>
        </header>

        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-ink/[0.06] bg-surface p-1.5">
          <button
            type="button"
            onClick={() => setActiveTab(null)}
            className={[
              'rounded-xl px-4 py-2 text-[13px] font-medium transition',
              activeTab === null
                ? 'bg-card text-ink shadow-[0_1px_4px_rgba(0,0,0,0.08)]'
                : 'text-ink-muted hover:text-ink',
            ].join(' ')}
          >
            Todos
          </button>
          {allWorkspaces.map((ws) => (
            <button
              key={ws}
              type="button"
              onClick={() => setActiveTab(ws)}
              className={[
                'rounded-xl px-4 py-2 text-[13px] font-medium transition',
                activeTab === ws
                  ? 'bg-card text-ink shadow-[0_1px_4px_rgba(0,0,0,0.08)]'
                  : 'text-ink-muted hover:text-ink',
              ].join(' ')}
            >
              {WORKSPACE_TAB_LABEL[ws] ?? ws}
            </button>
          ))}
        </div>

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
                    <div
                      key={account.documentId}
                      className="group relative flex flex-col overflow-hidden rounded-2xl border border-ink/[0.06] bg-card shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition hover:border-brand/40 hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedAccount(account)}
                        className={[
                          'flex w-full items-center gap-3 p-4 text-left transition hover:bg-ink/[0.02]',
                          isAdmin ? 'pr-12' : 'pr-14',
                        ].join(' ')}
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
                          <div className="flex shrink-0 flex-col items-end gap-1 pr-1">
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
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setAdminDeleteTarget({ kind: 'instagram', account })
                          }}
                          aria-label="Excluir conta Instagram"
                          className="absolute right-10 top-2 rounded-lg p-1.5 text-red-500/70 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950/30"
                          title="Excluir conta"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path
                              d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14ZM10 11v6M14 11v6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); void refreshAccount(account) }}
                        disabled={refreshingId === account.documentId}
                        aria-label="Atualizar branding"
                        className="absolute right-2 top-2 rounded-lg p-1.5 text-ink/30 opacity-0 transition hover:bg-ink/[0.06] hover:text-ink-muted group-hover:opacity-100 disabled:opacity-50"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 16 16"
                          fill="none"
                          className={refreshingId === account.documentId ? 'animate-spin' : ''}
                        >
                          <path
                            d="M13.65 2.35A8 8 0 1 0 15 8h-2a6 6 0 1 1-1.05-3.37L10 6h5V1l-1.35 1.35Z"
                            fill="currentColor"
                          />
                        </svg>
                      </button>
                      <InstagramCardInterestsPanel
                        account={account}
                        instagramAccounts={instagramAccounts}
                        tiktokAccounts={tiktokAccounts}
                        medNewsSources={medNewsSources}
                        onPatched={mergeInstagramAccountPatched}
                      />
                      <Link
                        to={`/interesses-por-perfil?perfil=${encodeURIComponent(account.id)}`}
                        className="border-t border-ink/[0.06] px-3 py-2.5 text-center text-[12px] font-medium text-brand transition hover:bg-brand/[0.06]"
                      >
                        Abrir feed de interesses
                      </Link>
                    </div>
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
                  <button
                    type="button"
                    onClick={() => setBulkAddingWorkspace(ws.id)}
                    className="flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-ink/[0.15] bg-surface transition hover:border-brand/40 hover:bg-brand/[0.03]"
                    aria-label="Adicionar contas em lote"
                  >
                    <svg width="18" height="14" viewBox="0 0 18 14" fill="none" className="text-ink/30">
                      <path d="M2 2h14M2 7h10M2 12h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    <span className="text-[10px] font-medium text-ink/30">lote</span>
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  TikTok
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {ws.tiktok.map((account) => (
                    <div
                      key={account.id}
                      className="group relative overflow-hidden rounded-2xl border border-ink/[0.06] bg-card shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition hover:border-brand/40 hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
                    >
                      <a
                        href={account.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={[
                          'flex items-center gap-3 p-4 transition hover:bg-ink/[0.02]',
                          isAdmin ? 'pr-12' : '',
                        ].join(' ')}
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
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setAdminDeleteTarget({ kind: 'tiktok', account })}
                          aria-label="Excluir conta TikTok"
                          className="absolute right-2 top-2 rounded-lg p-1.5 text-red-500/70 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950/30"
                          title="Excluir conta"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path
                              d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14ZM10 11v6M14 11v6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
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
