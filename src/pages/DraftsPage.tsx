import { useEffect, useState } from 'react'
import { api } from '../lib/api'

type Slide = {
  index?: number
  title?: string
  content?: string
  body?: string
  imageUrl?: string
}

type Draft = {
  id: string
  productId: string
  accountId?: string
  title: string
  type: string
  templateType?: string
  status: string
  caption?: string
  hashtags?: string[]
  slides?: Slide[]
  coverImageUrl?: string
  basedOnUrl?: string
  updatedAt?: string
  createdAt?: string
  generatedAt?: string
}

const TEMPLATE_LABELS: Record<string, string> = {
  'twitter-quote': 'Citação (Twitter)',
  'carousel-tips': 'Dicas numeradas',
  'carousel-numbered': 'Passo a passo',
  'carousel-before-after': 'Antes e depois',
  'carousel-story': 'Narrativa',
  'static-announcement': 'Anúncio',
}

const STATUS_OPTIONS = ['Todos', 'Rascunho', 'Em revisão', 'Aprovado']

/** Retorna o `imageUrl` do primeiro slide que tiver imagem, ou a capa do draft. */
function coverImage(d: Draft): string | null {
  return (
    d.coverImageUrl ??
    d.slides?.find((s) => s.imageUrl)?.imageUrl ??
    null
  )
}

/** Retorna a data mais relevante disponível no draft. */
function draftDate(d: Draft): string | null {
  return d.updatedAt ?? d.createdAt ?? d.generatedAt ?? null
}

/** Formata data ISO para exibição localizada. */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'Aprovado'
      ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400'
      : status === 'Em revisão'
        ? 'bg-brand/15 text-brand'
        : 'bg-ink/[0.08] text-ink-muted'
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-medium ${cls}`}>
      {status}
    </span>
  )
}

function SlideCarousel({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0)
  const slide = slides[index]

  return (
    <div className="flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-2xl bg-surface">
        {slide?.imageUrl ? (
          <img
            key={slide.imageUrl}
            src={slide.imageUrl}
            alt={slide.title ?? `Slide ${index + 1}`}
            className="w-full object-cover"
            style={{ aspectRatio: '1 / 1' }}
          />
        ) : (
          <div
            className="flex w-full items-center justify-center bg-ink/[0.06]"
            style={{ aspectRatio: '1 / 1' }}
          >
            <span className="text-[13px] text-ink-subtle">Imagem não disponível</span>
          </div>
        )}

        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-ink/50 p-2 text-white disabled:opacity-30 hover:bg-ink/70"
              aria-label="Slide anterior"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
              disabled={index === slides.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-ink/50 p-2 text-white disabled:opacity-30 hover:bg-ink/70"
              aria-label="Próximo slide"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-ink/60 px-2.5 py-0.5 text-[11px] font-medium text-white">
              {index + 1} / {slides.length}
            </span>
          </>
        )}
      </div>

      {(slide?.title ?? slide?.content ?? slide?.body) && (
        <div className="rounded-xl border border-ink/[0.06] bg-surface px-4 py-3">
          {slide?.title && (
            <p className="text-[14px] font-semibold text-ink">{slide.title}</p>
          )}
          {(slide?.content ?? slide?.body) && (
            <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-muted">
              {slide.content ?? slide.body}
            </p>
          )}
        </div>
      )}

      {slides.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {slides.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={[
                'relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition',
                i === index ? 'border-brand' : 'border-transparent opacity-60 hover:opacity-100',
              ].join(' ')}
              aria-label={`Ir para slide ${i + 1}`}
            >
              {s.imageUrl ? (
                <img src={s.imageUrl} alt={`Slide ${i + 1}`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-ink/[0.08] text-[10px] font-semibold text-ink-muted">
                  {i + 1}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function DraftDrawer({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const date = draftDate(draft)
  const slides = draft.slides ?? []
  const hasImages = slides.some((s) => s.imageUrl) || !!draft.coverImageUrl

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-start">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-lg flex-col overflow-y-auto bg-card shadow-2xl sm:h-screen">
        <div className="flex items-center justify-between border-b border-ink/[0.06] px-5 py-4">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-muted">
            Rascunho
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

        <div className="flex flex-col gap-6 p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-brand/10 px-2.5 py-0.5 text-[12px] font-medium text-brand">
                {draft.type}
              </span>
              {draft.templateType && (
                <span className="inline-flex rounded-full bg-ink/[0.07] px-2.5 py-0.5 text-[12px] font-medium text-ink-muted">
                  {TEMPLATE_LABELS[draft.templateType] ?? draft.templateType}
                </span>
              )}
              <StatusBadge status={draft.status} />
            </div>
            <h2 className="mt-3 text-[18px] font-semibold leading-snug text-ink">
              {draft.title}
            </h2>
            <div className="mt-2 flex flex-wrap gap-4 text-[12px] text-ink-muted">
              {draft.accountId && <span>@{draft.accountId}</span>}
              {date && <span>{formatDate(date)}</span>}
            </div>
          </div>

          {hasImages && slides.length > 0 && <SlideCarousel slides={slides} />}

          {hasImages && slides.length === 0 && draft.coverImageUrl && (
            <div className="overflow-hidden rounded-2xl bg-surface">
              <img
                src={draft.coverImageUrl}
                alt={draft.title}
                className="w-full object-cover"
                style={{ aspectRatio: '1 / 1' }}
              />
            </div>
          )}

          {!hasImages && slides.length > 0 && (
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                Slides ({slides.length})
              </p>
              <ol className="flex flex-col gap-2">
                {slides.map((slide, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-ink/[0.06] bg-surface px-4 py-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[11px] font-bold text-brand">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        {slide.title && (
                          <p className="text-[14px] font-semibold text-ink">{slide.title}</p>
                        )}
                        {(slide.content ?? slide.body) && (
                          <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-muted">
                            {slide.content ?? slide.body}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {draft.basedOnUrl && (
            <div className="rounded-xl border border-ink/[0.06] bg-surface px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                Fonte
              </p>
              <a
                href={draft.basedOnUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block break-all text-[13px] font-medium text-brand hover:underline"
              >
                {draft.basedOnUrl}
              </a>
            </div>
          )}

          {draft.caption && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                Legenda
              </p>
              <p className="whitespace-pre-wrap rounded-xl border border-ink/[0.06] bg-surface px-4 py-3 text-[14px] leading-relaxed text-ink">
                {draft.caption}
              </p>
            </div>
          )}

          {(draft.hashtags?.length ?? 0) > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                Hashtags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {draft.hashtags!.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[12px] font-medium text-brand"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

/**
 * Lista todos os rascunhos gerados, com filtro por status e drawer de detalhes.
 */
export function DraftsPage() {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null)

  useEffect(() => {
    setLoading(true)
    api
      .get<Draft[]>('/drafts')
      .then(setDrafts)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar rascunhos.')
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered =
    statusFilter === 'Todos' ? drafts : drafts.filter((d) => d.status === statusFilter)

  return (
    <>
      {selectedDraft && (
        <DraftDrawer draft={selectedDraft} onClose={() => setSelectedDraft(null)} />
      )}

      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Rascunhos</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
            Posts gerados com IA. Clique em um card para visualizar as imagens prontas para postagem.
          </p>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1 rounded-xl border border-ink/[0.08] bg-surface p-1">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={[
                  'rounded-lg px-3.5 py-1.5 text-[14px] font-medium transition',
                  statusFilter === s
                    ? 'bg-card text-ink shadow-sm'
                    : 'text-ink-muted hover:text-ink',
                ].join(' ')}
              >
                {s}
              </button>
            ))}
          </div>
          {!loading && (
            <p className="text-[13px] text-ink-muted">
              {filtered.length} rascunho{filtered.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((k) => (
              <div key={k} className="h-80 animate-pulse rounded-2xl bg-ink/[0.06]" />
            ))}
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </p>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-ink/[0.12] bg-surface px-6 py-16 text-center">
            <p className="text-[15px] font-medium text-ink">Nenhum rascunho encontrado</p>
            <p className="mt-1 text-[13px] text-ink-muted">
              {statusFilter === 'Todos'
                ? 'Gere o primeiro rascunho em "Novo conteúdo".'
                : `Sem rascunhos com status "${statusFilter}".`}
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((d) => {
              const date = draftDate(d)
              const thumb = coverImage(d)
              const slideCount = d.slides?.length ?? 0
              const hasImages = !!thumb

              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDraft(d)}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-ink/[0.06] bg-card text-left shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition hover:border-brand/30 hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)]"
                >
                  <div className="relative w-full overflow-hidden bg-ink/[0.04]" style={{ aspectRatio: '1 / 1' }}>
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={d.title}
                        className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                        <span className="text-[13px] font-medium text-ink-subtle">
                          {slideCount > 0 ? `${slideCount} slides` : 'Sem imagem'}
                        </span>
                      </div>
                    )}
                    {slideCount > 1 && (
                      <span className="absolute right-2 top-2 rounded-lg bg-ink/70 px-2 py-0.5 text-[11px] font-semibold text-white">
                        ⧉ {slideCount}
                      </span>
                    )}
                    {hasImages && (
                      <div className="absolute inset-0 flex items-center justify-center bg-ink/40 opacity-0 transition group-hover:opacity-100">
                        <span className="rounded-full bg-white/90 px-4 py-1.5 text-[13px] font-semibold text-ink">
                          Ver slides
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 p-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex rounded-full bg-brand/10 px-2.5 py-0.5 text-[12px] font-medium text-brand">
                        {d.type}
                      </span>
                      {d.templateType && (
                        <span className="inline-flex rounded-full bg-ink/[0.07] px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                          {TEMPLATE_LABELS[d.templateType] ?? d.templateType}
                        </span>
                      )}
                      <StatusBadge status={d.status} />
                    </div>

                    <p className="text-[14px] font-semibold leading-snug text-ink group-hover:text-brand">
                      {d.title}
                    </p>

                    {d.caption && !hasImages && (
                      <p className="line-clamp-2 text-[12px] leading-relaxed text-ink-muted">
                        {d.caption}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-1 pt-1">
                      <div className="flex gap-2 text-[11px] text-ink-subtle">
                        {(d.hashtags?.length ?? 0) > 0 && (
                          <span>{d.hashtags!.length} hashtags</span>
                        )}
                      </div>
                      {date && (
                        <span className="text-[11px] text-ink-subtle">{formatDate(date)}</span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
