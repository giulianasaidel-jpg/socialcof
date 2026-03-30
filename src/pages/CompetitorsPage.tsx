import { useCallback, useMemo, useState, type FormEvent } from 'react'
import { useAppWorkspace } from '../context/AppWorkspaceContext'
import {
  competitorsForMedCofAccount,
  type CompetitorProfile,
} from '../data/mock'

const MANUAL_COMPETITORS_STORAGE_KEY = 'socialcof-concorrencia-manual'

type ManualCompetitorRow = {
  id: string
  handle: string
  displayName: string
  profileUrl: string
}

/**
 * Extrai @usuário ou caminho de URL do Instagram.
 */
function parseInstagramInput(raw: string): {
  handle: string
  displayName: string
  profileUrl: string
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
  return {
    handle,
    displayName: `@${handle}`,
    profileUrl: `https://www.instagram.com/${handle}/`,
  }
}

/**
 * Carrega mapa workspace::conta → concorrentes adicionados manualmente.
 */
function loadManualMap(): Record<string, ManualCompetitorRow[]> {
  try {
    const raw = localStorage.getItem(MANUAL_COMPETITORS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, ManualCompetitorRow[]>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/**
 * Persiste mapa de concorrentes manuais.
 */
function saveManualMap(map: Record<string, ManualCompetitorRow[]>) {
  localStorage.setItem(MANUAL_COMPETITORS_STORAGE_KEY, JSON.stringify(map))
}

type UnifiedCompetitor = {
  id: string
  handle: string
  displayName: string
  profileUrl: string
  followers: number | null
  engagementRatePct: number | null
  avgLikesPerPost: number | null
  publishedPostsCount: number | null
  insightsToBorrow: string[]
  isManual: boolean
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
 * Concorrência: concorrentes do mock + perfis que você adicionar (@ ou link).
 */
export function CompetitorsPage() {
  const {
    products,
    instagramAccounts,
    brandShortName,
    brandSubtitle,
    workspaceId,
  } = useAppWorkspace()
  const [accountId, setAccountId] = useState(instagramAccounts[0].id)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [manualMap, setManualMap] = useState(loadManualMap)
  const [newIgInput, setNewIgInput] = useState('')
  const [addError, setAddError] = useState('')

  const storageRowKey = `${workspaceId}::${accountId}`

  const selectedAccount = useMemo(
    () => instagramAccounts.find((a) => a.id === accountId),
    [accountId, instagramAccounts],
  )

  const mockList = useMemo(
    () => competitorsForMedCofAccount(accountId, products),
    [accountId, products],
  )

  const manualRows = manualMap[storageRowKey] ?? []

  const unifiedList = useMemo((): UnifiedCompetitor[] => {
    const fromManual: UnifiedCompetitor[] = manualRows.map((m) => ({
      id: m.id,
      handle: m.handle,
      displayName: m.displayName,
      profileUrl: m.profileUrl,
      followers: null,
      engagementRatePct: null,
      avgLikesPerPost: null,
      publishedPostsCount: null,
      insightsToBorrow: [
        'Perfil adicionado por você — observe formatos e ganchos que performam e adapte ao seu tom.',
        'Salve posts de referência e compare CTAs e frequência com a sua conta.',
      ],
      isManual: true,
    }))

    const fromMock: UnifiedCompetitor[] = mockList.map(
      (c: CompetitorProfile) => ({
        id: c.id,
        handle: c.handle,
        displayName: c.displayName,
        profileUrl: c.profileUrl,
        followers: c.followers,
        engagementRatePct: c.engagementRatePct,
        avgLikesPerPost: c.avgLikesPerPost,
        publishedPostsCount: c.publishedPostsCount,
        insightsToBorrow: c.insightsToBorrow,
        isManual: false,
      }),
    )

    return [...fromManual, ...fromMock]
  }, [manualRows, mockList])

  const brandLine = `${brandShortName} · ${brandSubtitle}`

  /**
   * Inclui um concorrente digitado (salvo por conta e por linha Social Cof).
   */
  const addManualCompetitor = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      setAddError('')
      const parsed = parseInstagramInput(newIgInput)
      if (!parsed) {
        setAddError('Use @usuario ou um link instagram.com/… válido.')
        return
      }
      const lower = parsed.handle.toLowerCase()
      if (manualRows.some((r) => r.handle.toLowerCase() === lower)) {
        setAddError('Este @ já está na lista para esta conta.')
        return
      }
      if (mockList.some((c) => c.handle.toLowerCase() === lower)) {
        setAddError('Este perfil já aparece nos concorrentes do protótipo.')
        return
      }

      const row: ManualCompetitorRow = {
        id: `manual-${Date.now()}-${lower}`,
        handle: parsed.handle,
        displayName: parsed.displayName,
        profileUrl: parsed.profileUrl,
      }

      setManualMap((prev) => {
        const next = { ...prev }
        const list = [...(next[storageRowKey] ?? []), row]
        next[storageRowKey] = list
        saveManualMap(next)
        return next
      })
      setNewIgInput('')
    },
    [newIgInput, manualRows, mockList, storageRowKey],
  )

  /**
   * Remove concorrente adicionado manualmente.
   */
  const removeManual = useCallback(
    (id: string) => {
      setManualMap((prev) => {
        const next = { ...prev }
        const list = (next[storageRowKey] ?? []).filter((r) => r.id !== id)
        if (list.length === 0) delete next[storageRowKey]
        else next[storageRowKey] = list
        saveManualMap(next)
        return next
      })
    },
    [storageRowKey],
  )

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f]">
          Concorrência
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[#6e6e73]">
          Escolha uma das suas contas Instagram ({brandLine}). Inclua perfis
          concorrentes abaixo; os do protótipo continuam listados quando
          existirem para a conta.
        </p>
      </header>

      <div className="rounded-2xl border border-black/[0.08] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        <label
          htmlFor="concorrencia-conta"
          className="text-sm font-semibold text-[#1d1d1f]"
        >
          Sua conta Instagram
        </label>
        <p className="mt-1 text-[13px] text-[#6e6e73]">
          Concorrentes manuais ficam guardados por conta e por linha (produtos
          ou médicos).
        </p>
        <select
          id="concorrencia-conta"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="mt-4 w-full rounded-xl border border-black/[0.1] bg-[#fafafa] px-4 py-3 text-[15px] text-[#1d1d1f] outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20"
        >
          {instagramAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.displayName} (@{a.handle})
            </option>
          ))}
        </select>
        {selectedAccount ? (
          <p className="mt-3 text-[13px] text-[#6e6e73]">
            <span className="font-medium text-[#1d1d1f]">
              {selectedAccount.displayName}
            </span>{' '}
            —{' '}
            {selectedAccount.followers.toLocaleString('pt-BR')} seguidores
            (simulado){' '}
            <a
              href={selectedAccount.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0071e3] hover:underline"
            >
              Abrir perfil
            </a>
          </p>
        ) : null}
      </div>

      <section className="rounded-2xl border border-black/[0.08] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        <h2 className="text-sm font-semibold text-[#1d1d1f]">
          Adicionar Instagram da concorrência
        </h2>
        <p className="mt-1 text-[13px] text-[#6e6e73]">
          Cole o @ do perfil ou o link completo (ex.: instagram.com/usuario).
        </p>
        <form
          onSubmit={addManualCompetitor}
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="min-w-0 flex-1">
            <label
              htmlFor="concorrencia-novo-ig"
              className="sr-only"
            >
              Instagram do concorrente
            </label>
            <input
              id="concorrencia-novo-ig"
              value={newIgInput}
              onChange={(e) => {
                setNewIgInput(e.target.value)
                setAddError('')
              }}
              className="w-full rounded-xl border border-black/[0.1] bg-[#fafafa] px-4 py-3 text-[15px] text-[#1d1d1f] outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20"
              placeholder="@concorrente ou https://www.instagram.com/concorrente/"
            />
          </div>
          <button
            type="submit"
            className="rounded-full bg-[#0071e3] px-6 py-3 text-[15px] font-medium text-white hover:bg-[#0077ed] active:scale-[0.98]"
          >
            Adicionar
          </button>
        </form>
        {addError ? (
          <p className="mt-2 text-[13px] text-red-700">{addError}</p>
        ) : null}
      </section>

      {unifiedList.length === 0 ? (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-[14px] text-amber-950">
          Nenhum concorrente: adicione um Instagram acima ou aguarde dados do
          protótipo para esta conta.
        </p>
      ) : (
        <ul className="space-y-8">
          {unifiedList.map((c) => {
            const allInsights = c.insightsToBorrow.join('\n')
            return (
              <li
                key={c.id}
                className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/[0.06] pb-4">
                  <div>
                    {c.isManual ? (
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#0071e3]">
                        Adicionado por você
                      </p>
                    ) : null}
                    <h2 className="mt-0.5 text-lg font-semibold text-[#1d1d1f]">
                      {c.displayName}
                    </h2>
                    <p className="text-[14px] text-[#6e6e73]">@{c.handle}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {c.isManual ? (
                      <button
                        type="button"
                        onClick={() => removeManual(c.id)}
                        className="rounded-full border border-red-200 px-3 py-1.5 text-[12px] font-medium text-red-800 hover:bg-red-50"
                      >
                        Remover
                      </button>
                    ) : null}
                    <a
                      href={c.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-black/[0.1] px-3 py-1.5 text-[12px] font-medium text-[#1d1d1f] hover:bg-black/[0.04]"
                    >
                      Ver no Instagram
                    </a>
                  </div>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl bg-[#f5f5f7] px-3 py-2.5">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-[#6e6e73]">
                      Seguidores
                    </dt>
                    <dd className="mt-1 text-[15px] font-semibold tabular-nums text-[#1d1d1f]">
                      {c.followers != null
                        ? c.followers.toLocaleString('pt-BR')
                        : '—'}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-[#f5f5f7] px-3 py-2.5">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-[#6e6e73]">
                      Engajamento
                    </dt>
                    <dd className="mt-1 text-[15px] font-semibold tabular-nums text-[#1d1d1f]">
                      {c.engagementRatePct != null
                        ? `${c.engagementRatePct.toLocaleString('pt-BR', {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}%`
                        : '—'}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-[#f5f5f7] px-3 py-2.5">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-[#6e6e73]">
                      Média de curtidas
                    </dt>
                    <dd className="mt-1 text-[15px] font-semibold tabular-nums text-[#1d1d1f]">
                      {c.avgLikesPerPost != null
                        ? c.avgLikesPerPost.toLocaleString('pt-BR')
                        : '—'}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-[#f5f5f7] px-3 py-2.5">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-[#6e6e73]">
                      Posts no perfil
                    </dt>
                    <dd className="mt-1 text-[15px] font-semibold tabular-nums text-[#1d1d1f]">
                      {c.publishedPostsCount != null
                        ? c.publishedPostsCount.toLocaleString('pt-BR')
                        : '—'}
                    </dd>
                  </div>
                </dl>

                <div className="mt-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6e6e73]">
                      O que funciona no perfil deles — copie para o seu
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await copyToClipboard(allInsights)
                        if (ok) {
                          setCopiedKey(`${c.id}-all`)
                          setTimeout(() => setCopiedKey(null), 2000)
                        }
                      }}
                      className="rounded-full bg-[#1d1d1f] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-black"
                    >
                      {copiedKey === `${c.id}-all` ? 'Copiado!' : 'Copiar todos'}
                    </button>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {c.insightsToBorrow.map((line, i) => {
                      const key = `${c.id}-${i}`
                      return (
                        <li
                          key={key}
                          className="flex gap-2 rounded-xl border border-black/[0.06] bg-[#fafafa] p-3 text-[14px] leading-relaxed text-[#1d1d1f]"
                        >
                          <span className="min-w-0 flex-1">{line}</span>
                          <button
                            type="button"
                            onClick={async () => {
                              const ok = await copyToClipboard(line)
                              if (ok) {
                                setCopiedKey(key)
                                setTimeout(() => setCopiedKey(null), 2000)
                              }
                            }}
                            className="shrink-0 self-start rounded-lg border border-black/[0.08] px-2 py-1 text-[11px] font-medium text-[#0071e3] hover:bg-[#0071e3]/10"
                          >
                            {copiedKey === key ? 'OK' : 'Copiar'}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
