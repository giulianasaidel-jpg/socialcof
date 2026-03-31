import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DiscoveryToolbar } from '../components/DiscoveryToolbar'
import { useAppWorkspace } from '../context/AppWorkspaceContext'
import { usePaginatedList } from '../hooks/usePaginatedList'
import {
  type CreatePagePrefill,
  setCreatePrefill,
} from '../services/createPrefill'
import {
  buildBriefingFromTrend,
  fetchTikTokTrends,
  productIdForAccount,
  type TikTokTrendItem,
} from '../services/discovery'

const PAGE_SIZE = 5

/**
 * Lista trends do TikTok vindas do crawler (ou mock em desenvolvimento), com paginação e geração de post por perfil.
 */
export function TrendsPage() {
  const navigate = useNavigate()
  const { instagramAccounts, products } = useAppWorkspace()
  const [items, setItems] = useState<TikTokTrendItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState(
    () => instagramAccounts[0]?.id ?? '',
  )

  const {
    page,
    setPage,
    pageItems,
    totalPages,
    rangeLabel,
  } = usePaginatedList(items, PAGE_SIZE)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchTikTokTrends()
      setItems(data)
      setPage(1)
      setUpdatedAt(new Date().toISOString())
    } catch {
      setError('Não foi possível carregar as trends. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [setPage])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (
      selectedAccountId &&
      !instagramAccounts.some((a) => a.id === selectedAccountId)
    ) {
      setSelectedAccountId(instagramAccounts[0]?.id ?? '')
    }
  }, [instagramAccounts, selectedAccountId])

  const hasApi = Boolean(import.meta.env.VITE_CRAWLER_API_BASE)

  const selectedAccount = instagramAccounts.find(
    (a) => a.id === selectedAccountId,
  )

  const goToCreateWithTrend = (trend: TikTokTrendItem) => {
    if (!selectedAccount) return
    const briefing = buildBriefingFromTrend(trend, selectedAccount)
    const pid = productIdForAccount(products, selectedAccount.id)
    const payload: CreatePagePrefill = {
      accountId: selectedAccount.id,
      postBriefing: briefing,
      ...(pid ? { productId: pid } : {}),
    }
    setCreatePrefill(payload)
    navigate('/criar', { state: { createPrefill: payload } })
  }

  const accountOptions = instagramAccounts.map((a) => ({
    id: a.id,
    label: `${a.displayName} (@${a.handle})`,
  }))

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">
            Trends
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
            Temas em alta no TikTok relevantes para conteúdo de saúde. A coleta
            é feita pelo crawler no backend; aqui você vê o snapshot mais
            recente.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="shrink-0 rounded-xl bg-brand px-4 py-2.5 text-[15px] font-medium text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
        >
          {loading ? 'Atualizando…' : 'Atualizar lista'}
        </button>
      </header>

      <DiscoveryToolbar
        profileLabel="Perfil / médico para o post"
        profileHint="O briefing será gerado para esta conta Instagram."
        accountSelectId="trends-target-account"
        accountValue={selectedAccountId}
        onAccountChange={setSelectedAccountId}
        accountOptions={accountOptions}
        rangeLabel={rangeLabel}
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        disabledPrev={page <= 1}
        disabledNext={page >= totalPages}
      />

      <div className="rounded-2xl border border-ink/10 bg-white/90 p-4 text-[13px] leading-relaxed text-ink-muted shadow-[0_2px_12px_rgba(28,29,32,0.06)]">
        <p>
          <span className="font-medium text-ink">Fonte:</span>{' '}
          {hasApi
            ? 'API do crawler (`VITE_CRAWLER_API_BASE`).'
            : 'Modo demonstração — configure `VITE_CRAWLER_API_BASE` apontando para o serviço que expõe GET `/tiktok/trends`.'}
        </p>
        {updatedAt && (
          <p className="mt-1 text-ink-subtle">
            Última atualização na interface:{' '}
            {new Date(updatedAt).toLocaleString('pt-BR')}
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-brand/30 bg-brand/5 px-4 py-3 text-[15px] text-ink">
          {error}
        </p>
      )}

      {loading && items.length === 0 ? (
        <ul className="space-y-3">
          {[1, 2, 3, 4].map((k) => (
            <li
              key={k}
              className="h-24 animate-pulse rounded-2xl bg-ink/[0.06]"
            />
          ))}
        </ul>
      ) : (
        <ol className="space-y-3">
          {pageItems.map((t) => (
            <li
              key={t.id}
              className="rounded-2xl border border-ink/10 bg-white p-5 shadow-[0_2px_12px_rgba(28,29,32,0.06)]"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-1 flex-wrap items-start gap-3">
                  <span className="flex h-9 min-w-[2.25rem] items-center justify-center rounded-xl bg-brand/10 text-sm font-semibold text-brand">
                    #{t.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px] font-semibold leading-snug text-ink">
                      {t.title}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[13px] text-ink-muted">
                      {t.hashtag && (
                        <span className="rounded-lg bg-ink/[0.04] px-2 py-0.5 font-mono text-ink">
                          #{t.hashtag}
                        </span>
                      )}
                      {t.volumeLabel && (
                        <span className="rounded-lg px-2 py-0.5">
                          {t.volumeLabel}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-[12px] text-ink-subtle">
                      Coletado em:{' '}
                      {new Date(t.fetchedAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => goToCreateWithTrend(t)}
                  disabled={!selectedAccount}
                  className="shrink-0 rounded-xl bg-brand px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Gerar post
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
