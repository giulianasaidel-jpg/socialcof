import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAppWorkspace } from '../context/AppWorkspaceContext'
import { api } from '../lib/api'

type Competitor = {
  id: string
  accountId: string
  handle: string
  displayName: string
  profileUrl?: string
  followers?: number | null
  engagementRatePct?: number | null
  avgLikesPerPost?: number | null
  publishedPostsCount?: number | null
}

/**
 * Extrai @usuário ou caminho de URL do Instagram.
 */
function parseInstagramInput(raw: string): {
  handle: string
  displayName: string
} | null {
  const t = raw.trim()
  if (!t) return null
  let handle = ''
  if (/instagram\.com/i.test(t)) {
    try {
      const url = t.startsWith('http') ? t : `https://${t}`
      const u = new URL(url)
      const parts = u.pathname.split('/').filter(Boolean)
      handle = (parts[0] ?? '').replace(/^@/, '')
    } catch {
      return null
    }
  } else {
    handle = t.replace(/^@/, '').split(/[/?#\s]/)[0] ?? ''
  }
  if (!handle || !/^[a-zA-Z0-9._]+$/.test(handle)) return null
  return { handle, displayName: `@${handle}` }
}

/**
 * Copia texto para a área de transferência.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * Concorrência: lista da API filtrada por conta + adicionar/remover via API.
 */
export function CompetitorsPage() {
  const { instagramAccounts, brandShortName, brandSubtitle } = useAppWorkspace()
  const brandLine = `${brandShortName} · ${brandSubtitle}`
  const [accountId, setAccountId] = useState(instagramAccounts[0]?.id ?? '')
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [loading, setLoading] = useState(false)
  const [newIgInput, setNewIgInput] = useState('')
  const [addError, setAddError] = useState('')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  useEffect(() => {
    if (instagramAccounts.length && !accountId) {
      setAccountId(instagramAccounts[0].id)
    }
  }, [instagramAccounts, accountId])

  useEffect(() => {
    if (!accountId) return
    setLoading(true)
    api
      .get<Competitor[]>(`/competitors?accountId=${accountId}`)
      .then(setCompetitors)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [accountId])

  const selectedAccount = useMemo(
    () => instagramAccounts.find((a) => a.id === accountId),
    [accountId, instagramAccounts],
  )

  /**
   * Adiciona concorrente via POST /competitors.
   */
  const addCompetitor = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setAddError('')
      const parsed = parseInstagramInput(newIgInput)
      if (!parsed) {
        setAddError('Use @usuario ou um link instagram.com/… válido.')
        return
      }
      const lower = parsed.handle.toLowerCase()
      if (competitors.some((c) => c.handle.toLowerCase() === lower)) {
        setAddError('Este @ já está na lista para esta conta.')
        return
      }
      try {
        const created = await api.post<Competitor>('/competitors', {
          accountId,
          handle: parsed.handle,
          displayName: parsed.displayName,
          profileUrl: `https://www.instagram.com/${parsed.handle}/`,
        })
        setCompetitors((prev) => [...prev, created])
        setNewIgInput('')
      } catch {
        setAddError('Não foi possível adicionar o concorrente.')
      }
    },
    [newIgInput, competitors, accountId],
  )

  /**
   * Remove concorrente via DELETE /competitors/:id.
   */
  const removeCompetitor = useCallback(async (id: string) => {
    try {
      await api.delete(`/competitors/${id}`)
      setCompetitors((prev) => prev.filter((c) => c.id !== id))
    } catch {}
  }, [])

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Concorrência
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
          Escolha uma das suas contas Instagram ({brandLine}). Inclua perfis
          concorrentes abaixo para acompanhar.
        </p>
      </header>

      <div className="rounded-2xl border border-ink/[0.08] bg-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        <label
          htmlFor="concorrencia-conta"
          className="text-sm font-semibold text-ink"
        >
          Sua conta Instagram
        </label>
        <p className="mt-1 text-[13px] text-ink-muted">
          Concorrentes são filtrados por conta.
        </p>
        <select
          id="concorrencia-conta"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="mt-4 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        >
          {instagramAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.displayName} (@{a.handle})
            </option>
          ))}
        </select>
        {selectedAccount ? (
          <p className="mt-3 text-[13px] text-ink-muted">
            <span className="font-medium text-ink">
              {selectedAccount.displayName}
            </span>{' '}
            —{' '}
            {selectedAccount.followers.toLocaleString('pt-BR')} seguidores{' '}
            <a
              href={selectedAccount.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:underline"
            >
              Abrir perfil
            </a>
          </p>
        ) : null}
      </div>

      <section className="rounded-2xl border border-ink/[0.08] bg-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        <h2 className="text-sm font-semibold text-ink">
          Adicionar Instagram da concorrência
        </h2>
        <p className="mt-1 text-[13px] text-ink-muted">
          Cole o @ do perfil ou o link completo (ex.: instagram.com/usuario).
        </p>
        <form
          onSubmit={(e) => void addCompetitor(e)}
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="min-w-0 flex-1">
            <label htmlFor="concorrencia-novo-ig" className="sr-only">
              Instagram do concorrente
            </label>
            <input
              id="concorrencia-novo-ig"
              value={newIgInput}
              onChange={(e) => {
                setNewIgInput(e.target.value)
                setAddError('')
              }}
              className="w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              placeholder="@concorrente ou https://www.instagram.com/concorrente/"
            />
          </div>
          <button
            type="submit"
            className="rounded-full bg-brand px-6 py-3 text-[15px] font-medium text-white hover:bg-brand-hover active:scale-[0.98]"
          >
            Adicionar
          </button>
        </form>
        {addError ? (
          <p className="mt-2 text-[13px] text-red-700">{addError}</p>
        ) : null}
      </section>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((k) => (
            <div
              key={k}
              className="h-32 animate-pulse rounded-2xl bg-ink/[0.06]"
            />
          ))}
        </div>
      ) : competitors.length === 0 ? (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-[14px] text-amber-950">
          Nenhum concorrente cadastrado para esta conta. Adicione um Instagram
          acima.
        </p>
      ) : (
        <ul className="space-y-8">
          {competitors.map((c) => {
            const profileUrl =
              c.profileUrl ?? `https://www.instagram.com/${c.handle}/`
            return (
              <li
                key={c.id}
                className="rounded-2xl border border-ink/[0.06] bg-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/[0.06] pb-4">
                  <div>
                    <h2 className="mt-0.5 text-lg font-semibold text-ink">
                      {c.displayName}
                    </h2>
                    <p className="text-[14px] text-ink-muted">@{c.handle}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void removeCompetitor(c.id)}
                      className="rounded-full border border-red-200 px-3 py-1.5 text-[12px] font-medium text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Remover
                    </button>
                    <a
                      href={profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-ink/[0.1] px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-ink/[0.04]"
                    >
                      Ver no Instagram
                    </a>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await copyToClipboard(profileUrl)
                        if (ok) {
                          setCopiedKey(c.id)
                          setTimeout(() => setCopiedKey(null), 2000)
                        }
                      }}
                      className="rounded-full border border-ink/[0.1] px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-ink/[0.04]"
                    >
                      {copiedKey === c.id ? 'Link copiado!' : 'Copiar link'}
                    </button>
                  </div>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl bg-surface px-3 py-2.5">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                      Seguidores
                    </dt>
                    <dd className="mt-1 text-[15px] font-semibold tabular-nums text-ink">
                      {c.followers != null
                        ? c.followers.toLocaleString('pt-BR')
                        : '—'}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-surface px-3 py-2.5">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                      Engajamento
                    </dt>
                    <dd className="mt-1 text-[15px] font-semibold tabular-nums text-ink">
                      {c.engagementRatePct != null
                        ? `${c.engagementRatePct.toLocaleString('pt-BR', {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}%`
                        : '—'}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-surface px-3 py-2.5">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                      Média de curtidas
                    </dt>
                    <dd className="mt-1 text-[15px] font-semibold tabular-nums text-ink">
                      {c.avgLikesPerPost != null
                        ? c.avgLikesPerPost.toLocaleString('pt-BR')
                        : '—'}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-surface px-3 py-2.5">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                      Posts no perfil
                    </dt>
                    <dd className="mt-1 text-[15px] font-semibold tabular-nums text-ink">
                      {c.publishedPostsCount != null
                        ? c.publishedPostsCount.toLocaleString('pt-BR')
                        : '—'}
                    </dd>
                  </div>
                </dl>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
