import { useCallback, useMemo, useState } from 'react'
import { useAppWorkspace } from '../context/AppWorkspaceContext'
import type { ProductMetric } from '../data/mock'

type ProductStudioState = {
  communicationGuideFile: string
  communicationGuideLink: string
  visualIdFile: string
  visualIdLink: string
  manualFile: string
  prompt: string
}

function initialStudioState(
  productList: ProductMetric[],
): Record<string, ProductStudioState> {
  const o: Record<string, ProductStudioState> = {}
  for (const p of productList) {
    o[p.id] = {
      communicationGuideFile: '',
      communicationGuideLink: '',
      visualIdFile: '',
      visualIdLink: '',
      manualFile: '',
      prompt: p.defaultPrompt ?? '',
    }
  }
  return o
}

/**
 * Lista de produtos com anexos; contas Instagram vinculadas e filtro por perfil.
 */
export function ProductsPage() {
  const { products, instagramAccounts, brandShortName, brandSubtitle } =
    useAppWorkspace()
  const brandLine = `${brandShortName} · ${brandSubtitle}`
  const [studio, setStudio] = useState<Record<string, ProductStudioState>>(
    () => initialStudioState(products),
  )
  const [filterAccountId, setFilterAccountId] = useState('')

  const filteredProducts = useMemo(() => {
    if (!filterAccountId) return products
    return products.filter((p) =>
      p.linkedInstagramAccountIds.includes(filterAccountId),
    )
  }, [filterAccountId, products])

  const patch = useCallback(
    (productId: string, partial: Partial<ProductStudioState>) => {
      setStudio((s) => ({
        ...s,
        [productId]: { ...s[productId], ...partial },
      }))
    },
    [],
  )

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Produtos
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
          Cadastre guia de comunicação, identidade visual e manual. Cada produto
          lista as contas Instagram associadas ({brandLine}) — use o
          filtro para enxergar só o que importa para um perfil.
        </p>
      </header>

      <section className="rounded-2xl border border-ink/[0.06] bg-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <label
          htmlFor="product-ig-filter"
          className="text-sm font-medium text-ink"
        >
          Filtrar produtos por conta Instagram
        </label>
        <select
          id="product-ig-filter"
          value={filterAccountId}
          onChange={(e) => setFilterAccountId(e.target.value)}
          className="mt-2 w-full max-w-xl rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        >
          <option value="">Todas as contas — mostrar todos os produtos</option>
          {instagramAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.displayName} (@{a.handle})
            </option>
          ))}
        </select>
        <p className="mt-2 text-[13px] text-ink-muted">
          {filterAccountId
            ? `${filteredProducts.length} produto(s) com esta conta na estratégia.`
            : `${products.length} produtos no total.`}
        </p>
      </section>

      <div className="space-y-8">
        {filteredProducts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink/[0.12] bg-surface px-6 py-10 text-center text-[15px] text-ink-muted">
            Nenhum produto usa esta conta no cadastro. Escolha outra conta ou
            “Todas”.
          </p>
        ) : null}
        {filteredProducts.map((p) => {
          const row = studio[p.id]
          if (!row) return null
          const linkedAccounts = p.linkedInstagramAccountIds
            .map((id) => instagramAccounts.find((a) => a.id === id))
            .filter(Boolean)
          return (
            <article
              key={p.id}
              className="rounded-2xl border border-ink/[0.06] bg-card p-8 shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
            >
              <h2 className="text-xl font-semibold tracking-tight text-ink">
                {p.name}
              </h2>
              <p className="mt-1 text-[13px] text-ink-muted">@{p.slug}</p>

              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                  Instagram vinculado
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {linkedAccounts.map((a) =>
                    a ? (
                      <li key={a.id}>
                        <a
                          href={a.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex rounded-full bg-surface px-3 py-1 text-[12px] font-medium text-brand hover:bg-brand/10"
                        >
                          @{a.handle}
                        </a>
                      </li>
                    ) : null,
                  )}
                </ul>
              </div>

              <div className="mt-8 grid gap-8 lg:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-ink">
                    Guia de comunicação
                  </h3>
                  <label className="block text-[13px] font-medium text-ink-muted">
                    Anexo (PDF ou documento)
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.md,.txt"
                      className="mt-2 block w-full text-[14px] text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:text-[13px] file:font-medium file:text-white"
                      onChange={(e) =>
                        patch(p.id, {
                          communicationGuideFile:
                            e.target.files?.[0]?.name ?? '',
                        })
                      }
                    />
                  </label>
                  {row.communicationGuideFile ? (
                    <p className="text-[12px] text-brand">
                      {row.communicationGuideFile}
                    </p>
                  ) : null}
                  <label className="block text-[13px] font-medium text-ink-muted">
                    Ou link (Drive, Notion, etc.)
                    <input
                      type="url"
                      value={row.communicationGuideLink}
                      onChange={(e) =>
                        patch(p.id, {
                          communicationGuideLink: e.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-2.5 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                      placeholder="https://…"
                    />
                  </label>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-ink">
                    ID visual
                  </h3>
                  <label className="block text-[13px] font-medium text-ink-muted">
                    Anexo (marca, paleta, templates)
                    <input
                      type="file"
                      accept=".pdf,.zip,image/*"
                      className="mt-2 block w-full text-[14px] text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:text-[13px] file:font-medium file:text-white"
                      onChange={(e) =>
                        patch(p.id, {
                          visualIdFile: e.target.files?.[0]?.name ?? '',
                        })
                      }
                    />
                  </label>
                  {row.visualIdFile ? (
                    <p className="text-[12px] text-brand">{row.visualIdFile}</p>
                  ) : null}
                  <label className="block text-[13px] font-medium text-ink-muted">
                    Ou link (Figma, Canva brand kit…)
                    <input
                      type="url"
                      value={row.visualIdLink}
                      onChange={(e) =>
                        patch(p.id, { visualIdLink: e.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-2.5 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                      placeholder="https://…"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <h3 className="text-sm font-semibold text-ink">
                  Manual de comunicação
                </h3>
                <label className="block text-[13px] font-medium text-ink-muted">
                  Anexo do manual
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx"
                    className="mt-2 block w-full text-[14px] text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-ink file:px-4 file:py-2 file:text-[13px] file:font-medium file:text-white"
                    onChange={(e) =>
                      patch(p.id, { manualFile: e.target.files?.[0]?.name ?? '' })
                    }
                  />
                </label>
                {row.manualFile ? (
                  <p className="text-[12px] text-brand">{row.manualFile}</p>
                ) : null}
              </div>

              <div className="mt-8">
                <label
                  htmlFor={`prompt-${p.id}`}
                  className="text-sm font-semibold text-ink"
                >
                  Prompt pronto
                </label>
                <p className="mt-1 text-[13px] text-ink-muted">
                  Instruções fixas para IA ou redatores ao produzir peças deste
                  produto.
                </p>
                <textarea
                  id={`prompt-${p.id}`}
                  value={row.prompt}
                  onChange={(e) => patch(p.id, { prompt: e.target.value })}
                  rows={5}
                  className="mt-3 w-full resize-y rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[15px] leading-relaxed text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
