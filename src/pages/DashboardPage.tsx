import { useMemo, useState } from 'react'
import { useAppWorkspace } from '../context/AppWorkspaceContext'

function formatPostedDate(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00`)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Verifica se a data do post (YYYY-MM-DD) está no intervalo inclusivo.
 */
function isPostedInRange(
  postedAt: string,
  dateFrom: string,
  dateTo: string,
): boolean {
  if (!dateFrom || !dateTo) return true
  return postedAt >= dateFrom && postedAt <= dateTo
}

/**
 * Visão geral: filtros, macros (publicações + seguidores) e tabela com métricas por post.
 */
export function DashboardPage() {
  const { instagramAccounts, dashboardPosts } = useAppWorkspace()
  const [selectedAccountId, setSelectedAccountId] = useState(
    instagramAccounts[0]?.id ?? '',
  )
  const [dateFrom, setDateFrom] = useState('2026-01-01')
  const [dateTo, setDateTo] = useState('2026-03-31')

  const selectedAccount = instagramAccounts.find(
    (a) => a.id === selectedAccountId,
  )

  const postsForAccount = useMemo(() => {
    return dashboardPosts
      .filter((p) => p.accountId === selectedAccountId)
      .slice()
      .sort((a, b) => (a.postedAt < b.postedAt ? 1 : -1))
  }, [selectedAccountId, dashboardPosts])

  const filteredPosts = useMemo(() => {
    return postsForAccount.filter((p) =>
      isPostedInRange(p.postedAt, dateFrom, dateTo),
    )
  }, [postsForAccount, dateFrom, dateTo])

  const publicationCount = filteredPosts.length

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Visão geral
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
          Filtre por período e conta. Os macros usam só a quantidade de
          publicações no intervalo; curtidas e demais métricas aparecem na
          tabela.
        </p>
      </header>

      <section className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <label
              htmlFor="dash-account"
              className="text-sm font-medium text-ink"
            >
              Conta Instagram
            </label>
            <select
              id="dash-account"
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-black/[0.1] bg-[#fafafa] px-4 py-3 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
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
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="dash-from"
                  className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted"
                >
                  De
                </label>
                <input
                  id="dash-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-black/[0.1] bg-[#fafafa] px-4 py-2.5 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <span
                className="hidden text-ink-muted sm:block sm:pt-6"
                aria-hidden
              >
                —
              </span>
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="dash-to"
                  className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted"
                >
                  Até
                </label>
                <input
                  id="dash-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  min={dateFrom}
                  className="mt-1 w-full rounded-xl border border-black/[0.1] bg-[#fafafa] px-4 py-2.5 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>
          </div>
        </div>
        {selectedAccount && (
          <p className="mt-4 text-[13px] text-ink-muted">
            Dados fictícios para @{selectedAccount.handle}.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-ink">
          Números macro —{' '}
          {selectedAccount ? `@${selectedAccount.handle}` : 'conta'}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
          <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Publicações no período
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ink">
              {publicationCount.toLocaleString('pt-BR')}
            </p>
            <p className="mt-2 text-[12px] text-ink-subtle">
              Dentro do intervalo de datas selecionado.
            </p>
          </div>
          <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Seguidores
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ink">
              {selectedAccount
                ? selectedAccount.followers.toLocaleString('pt-BR')
                : '—'}
            </p>
            <p className="mt-2 text-[12px] text-ink-subtle">
              Total do perfil (não varia com o filtro de datas).
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-ink">
          Publicações recentes
        </h2>
        <p className="mb-4 text-[13px] text-ink-muted">
          {filteredPosts.length === 0
            ? 'Nenhuma publicação no período. Ajuste as datas ou a conta.'
            : `${filteredPosts.length} publicação(ões) no período.`}
        </p>
        <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-[14px]">
              <thead>
                <tr className="border-b border-black/[0.06] bg-[#fafafa] text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  <th className="px-5 py-3 font-medium">Post</th>
                  <th className="px-5 py-3 font-medium">Publicado em</th>
                  <th className="px-5 py-3 font-medium">Formato</th>
                  <th className="px-5 py-3 font-medium">Curtidas</th>
                  <th className="px-5 py-3 font-medium">Comentários</th>
                  <th className="px-5 py-3 font-medium">Salvamentos</th>
                  <th className="px-5 py-3 font-medium">Republicações</th>
                  <th className="px-5 py-3 font-medium">Encaminhamentos</th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-black/[0.04] last:border-0"
                  >
                    <td className="max-w-[220px] px-5 py-4 font-medium text-ink">
                      <span className="line-clamp-2">{p.title}</span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-ink-muted">
                      {formatPostedDate(p.postedAt)}
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
                    <td className="px-5 py-4 tabular-nums text-ink-muted">
                      {p.reposts.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-5 py-4 tabular-nums text-ink-muted">
                      {p.forwards.toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
