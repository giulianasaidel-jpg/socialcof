import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { api } from '../lib/api'

type NewsCategory =
  | 'education'
  | 'government'
  | 'journal'
  | 'guidelines'
  | 'research'
  | 'global'
  | 'news'
  | 'society'
type NewsLanguage = 'pt' | 'en'
type NewsSpecialty =
  | 'residencia'
  | 'clinica_medica'
  | 'cirurgia'
  | 'pediatria'
  | 'preventiva'
  | 'gineco'
  | 'outras'

type MedicalNewsItem = {
  id: string
  title: string
  summary: string
  source: string
  url: string
  category: NewsCategory
  language: NewsLanguage
  specialty: NewsSpecialty
  author: string | null
  tags: string[]
  wordCount: number | null
  publishedAt: string
}

type MedicalNewsResponse = {
  data: MedicalNewsItem[]
  total: number
  page: number
  totalPages: number
}

const CATEGORY_META: Record<NewsCategory, { label: string; color: string }> = {
  journal:    { label: 'Revistas',        color: '#6366f1' },
  guidelines: { label: 'Diretrizes',      color: '#f59e0b' },
  government: { label: 'Governo',         color: '#3b82f6' },
  education:  { label: 'Educação',        color: '#10b981' },
  research:   { label: 'Pesquisa',        color: '#8b5cf6' },
  global:     { label: 'Global',          color: '#ef4444' },
  news:       { label: 'Notícias',        color: '#06b6d4' },
  society:    { label: 'Soc. Médica',     color: '#f97316' },
}

const FALLBACK_META = { label: 'Geral', color: '#6b7280' }

const ALL_CATEGORIES: NewsCategory[] = [
  'journal',
  'guidelines',
  'government',
  'education',
  'research',
  'global',
]

const SPECIALTY_TABS: { value: NewsSpecialty | undefined; label: string }[] = [
  { value: undefined,        label: 'Todas' },
  { value: 'residencia',     label: 'Residências' },
  { value: 'clinica_medica', label: 'Clínica Médica' },
  { value: 'cirurgia',       label: 'Cirurgia' },
  { value: 'pediatria',      label: 'Pediatria' },
  { value: 'preventiva',     label: 'Preventiva' },
  { value: 'gineco',         label: 'Gineco/Obst' },
  { value: 'outras',         label: 'Outras' },
]

const SPECIALTY_COLORS: Record<NewsSpecialty, string> = {
  residencia:     'bg-purple-100 text-purple-700',
  clinica_medica: 'bg-blue-100 text-blue-700',
  cirurgia:       'bg-red-100 text-red-700',
  pediatria:      'bg-green-100 text-green-700',
  preventiva:     'bg-teal-100 text-teal-700',
  gineco:         'bg-pink-100 text-pink-700',
  outras:         'bg-gray-100 text-gray-600',
}

const SPECIALTY_LABELS: Record<NewsSpecialty, string> = {
  residencia:     'Residência',
  clinica_medica: 'Clínica Médica',
  cirurgia:       'Cirurgia',
  pediatria:      'Pediatria',
  preventiva:     'Preventiva',
  gineco:         'Gineco/Obst',
  outras:         'Outras',
}

const PAGE_SIZE = 20

/**
 * Builds the query string for the medical news endpoint.
 */
function buildQuery(params: {
  page: number
  category: NewsCategory | null
  language: NewsLanguage | null
  specialty: NewsSpecialty | null
}): string {
  const q = new URLSearchParams()
  q.set('page', String(params.page))
  q.set('limit', String(PAGE_SIZE))
  if (params.category) q.set('category', params.category)
  if (params.language) q.set('language', params.language)
  if (params.specialty) q.set('specialty', params.specialty)
  return q.toString()
}

/**
 * Feed de notícias médicas com paginação e filtros de categoria e idioma.
 */
export function MedicalNewsPage() {
  const [items, setItems] = useState<MedicalNewsItem[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<NewsCategory | null>(null)
  const [language, setLanguage] = useState<NewsLanguage | null>(null)
  const [specialty, setSpecialty] = useState<NewsSpecialty | null>(null)

  useEffect(() => {
    setLoading(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    api
      .get<MedicalNewsResponse>(`/medical-news?${buildQuery({ page, category, language, specialty })}`)
      .then(({ data, totalPages: tp }) => {
        setItems(data)
        setTotalPages(tp)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [page, category, language, specialty])

  function handleCategory(c: NewsCategory | null) {
    setCategory(c)
    setPage(1)
  }

  function handleLanguage(l: NewsLanguage | null) {
    setLanguage(l)
    setPage(1)
  }

  function handleSpecialty(s: NewsSpecialty | null) {
    setSpecialty(s)
    setPage(1)
  }

  return (
    <div className="pb-16">
      <h1 className="mb-4 text-xl font-bold tracking-tight text-ink">Atualizações Sites</h1>

      <FilterTabs
        activeCategory={category}
        activeLanguage={language}
        activeSpecialty={specialty}
        onCategory={handleCategory}
        onLanguage={handleLanguage}
        onSpecialty={handleSpecialty}
      />

      {loading ? (
        <FeedSkeleton />
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-[14px] text-ink-muted">
          Nenhuma notícia encontrada para os filtros selecionados.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          )}
        </>
      )}
    </div>
  )
}

/**
 * Numeric pagination with prev / page numbers / next.
 */
function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (p: number) => void
}) {
  const pages = buildPageRange(page, totalPages)

  return (
    <nav className="mt-6 flex items-center justify-center gap-1" aria-label="Paginação">
      <PageBtn
        label="←"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        aria="Página anterior"
      />
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-[14px] text-ink-muted">
            …
          </span>
        ) : (
          <PageBtn
            key={p}
            label={String(p)}
            active={p === page}
            onClick={() => onChange(p as number)}
          />
        ),
      )}
      <PageBtn
        label="→"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        aria="Próxima página"
      />
    </nav>
  )
}

/**
 * Computes the page number range to display, inserting '...' for gaps.
 */
function buildPageRange(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '...')[] = [1]

  if (current > 3) pages.push('...')

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 2) pages.push('...')

  pages.push(total)
  return pages
}

function PageBtn({
  label,
  active = false,
  disabled = false,
  onClick,
  aria,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  aria?: string
}) {
  return (
    <button
      type="button"
      aria-label={aria ?? label}
      aria-current={active ? 'page' : undefined}
      disabled={disabled}
      onClick={onClick}
      className={[
        'min-w-[36px] rounded-xl px-2 py-1.5 text-[13px] font-medium transition-colors',
        active
          ? 'bg-ink text-surface'
          : 'text-ink-muted hover:bg-ink/[0.06] hover:text-ink',
        disabled ? 'cursor-not-allowed opacity-30' : '',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

function FilterTabs({
  activeCategory,
  activeLanguage,
  activeSpecialty,
  onCategory,
  onLanguage,
  onSpecialty,
}: {
  activeCategory: NewsCategory | null
  activeLanguage: NewsLanguage | null
  activeSpecialty: NewsSpecialty | null
  onCategory: (c: NewsCategory | null) => void
  onLanguage: (l: NewsLanguage | null) => void
  onSpecialty: (s: NewsSpecialty | null) => void
}) {
  return (
    <div className="mb-2 border-b border-ink/[0.08]">
      <div className="flex gap-1.5 overflow-x-auto pb-3">
        {SPECIALTY_TABS.map((tab) => (
          <TabPill
            key={tab.value ?? 'all-specialty'}
            active={activeSpecialty === (tab.value ?? null)}
            onClick={() => onSpecialty(tab.value ?? null)}
            label={tab.label}
          />
        ))}
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-3">
        <TabPill
          active={activeCategory === null}
          onClick={() => onCategory(null)}
          label="Todos"
          small
        />
        {ALL_CATEGORIES.map((cat) => (
          <TabPill
            key={cat}
            active={activeCategory === cat}
            onClick={() => onCategory(activeCategory === cat ? null : cat)}
            label={CATEGORY_META[cat].label}
            small
          />
        ))}
      </div>
      <div className="flex gap-1.5 pb-3">
        <TabPill
          active={activeLanguage === null}
          onClick={() => onLanguage(null)}
          label="Todos"
          small
        />
        <TabPill
          active={activeLanguage === 'pt'}
          onClick={() => onLanguage(activeLanguage === 'pt' ? null : 'pt')}
          label="🇧🇷 PT"
          small
        />
        <TabPill
          active={activeLanguage === 'en'}
          onClick={() => onLanguage(activeLanguage === 'en' ? null : 'en')}
          label="🇺🇸 EN"
          small
        />
      </div>
    </div>
  )
}

function TabPill({
  active,
  onClick,
  label,
  small = false,
}: {
  active: boolean
  onClick: () => void
  label: string
  small?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'shrink-0 rounded-full border font-medium transition-colors',
        small ? 'px-3 py-1 text-[12px]' : 'px-3.5 py-1.5 text-[13px]',
        active
          ? 'border-transparent bg-ink text-surface'
          : 'border-ink/[0.1] text-ink-muted hover:border-ink/20 hover:text-ink',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

function NewsCard({ item }: { item: MedicalNewsItem }) {
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
  const meta = CATEGORY_META[item.category] ?? FALLBACK_META
  const date = new Date(item.publishedAt)
  const timeAgo = formatDistanceToNow(date, { addSuffix: false, locale: ptBR })
  const publishedDate = format(date, "d 'de' MMM. yyyy", { locale: ptBR })
  const isAiSummary = item.wordCount !== null

  return (
    <>
      <article className="relative flex flex-col overflow-hidden rounded-2xl border border-ink/[0.08] bg-card shadow-sm transition-shadow hover:shadow-md">
        <div className="h-[3px] w-full shrink-0" style={{ backgroundColor: meta.color }} />

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-center gap-2.5">
            <SourceAvatar source={item.source} category={item.category} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-bold text-ink">{item.source}</p>
              <p className="text-[12px] text-ink-muted">
                {timeAgo}
                <span className="mx-1 opacity-40">·</span>
                <time dateTime={item.publishedAt}>{publishedDate}</time>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span
              className={[
                'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                SPECIALTY_COLORS[item.specialty],
              ].join(' ')}
            >
              {SPECIALTY_LABELS[item.specialty]}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
              style={{ backgroundColor: meta.color }}
            >
              {meta.label}
            </span>
            <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] font-semibold text-ink-muted dark:bg-white/[0.08]">
              {item.language.toUpperCase()}
            </span>
          </div>

          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-ink">
            {item.title}
          </h3>

          {item.summary && (
            <div className="flex-1">
              {isAiSummary && (
                <p className="mb-1 flex items-center gap-1 text-[11px] font-medium text-ink-muted/60">
                  <span aria-hidden>✦</span>
                  <span>Resumo por IA</span>
                </p>
              )}
              <p className="line-clamp-4 text-[13px] leading-relaxed text-ink-muted">
                {item.summary}
              </p>
              {isAiSummary && (
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="mt-1.5 text-[12px] font-medium text-[#1d9bf0] hover:underline"
                >
                  Ver resumo completo
                </button>
              )}
            </div>
          )}

          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-ink/[0.05] px-2 py-0.5 text-[11px] text-ink-muted dark:bg-white/[0.05]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-x-1.5 text-[12px] text-ink-muted">
              {item.author && <span>por {item.author}</span>}
              {item.author && item.wordCount !== null && <span>·</span>}
              {item.wordCount !== null && (
                <span>{item.wordCount.toLocaleString('pt-BR')} palavras</span>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  navigate('/twitter-posts', {
                    state: {
                      generateFromNews: {
                        id: item.id,
                        title: item.title,
                        summary: item.summary,
                        source: item.source,
                        publishedAt: item.publishedAt,
                      },
                    },
                  })
                }
                className="text-[13px] font-semibold text-ink hover:underline"
              >
                Gerar Twitter Post
              </button>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] font-semibold text-[#1d9bf0] hover:underline"
              >
                Ler artigo ↗
              </a>
            </div>
          </div>
        </div>
      </article>

      {modalOpen && (
        <SummaryModal item={item} publishedDate={publishedDate} onClose={() => setModalOpen(false)} />
      )}
    </>
  )
}

/**
 * Modal displaying the full AI-generated summary and article metadata.
 */
function SummaryModal({
  item,
  publishedDate,
  onClose,
}: {
  item: MedicalNewsItem
  publishedDate: string
  onClose: () => void
}) {
  const meta = CATEGORY_META[item.category] ?? FALLBACK_META

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[3px]" onClick={onClose} />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-card shadow-2xl">
        <div className="h-[4px] w-full shrink-0" style={{ backgroundColor: meta.color }} />

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <SourceAvatar source={item.source} category={item.category} />
              <div>
                <p className="text-[14px] font-bold text-ink">{item.source}</p>
                <p className="text-[12px] text-ink-muted">
                  <time dateTime={item.publishedAt}>{publishedDate}</time>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="shrink-0 rounded-full p-1.5 text-ink-muted transition-colors hover:bg-ink/[0.06] hover:text-ink"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-1 flex flex-wrap gap-1.5">
            <span
              className={[
                'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                SPECIALTY_COLORS[item.specialty],
              ].join(' ')}
            >
              {SPECIALTY_LABELS[item.specialty]}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
              style={{ backgroundColor: meta.color }}
            >
              {meta.label}
            </span>
            <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
              {item.language.toUpperCase()}
            </span>
          </div>

          <h2 className="mt-3 text-[17px] font-bold leading-snug text-ink">{item.title}</h2>

          {item.summary && (
            <div className="mt-4 rounded-2xl bg-ink/[0.03] p-4 dark:bg-white/[0.04]">
              <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-ink-muted/70">
                <span aria-hidden>✦</span>
                Resumo gerado por IA (GPT-4o-mini)
              </p>
              <p className="text-[14px] leading-relaxed text-ink">{item.summary}</p>
            </div>
          )}

          {item.tags.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
                Tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-ink/[0.06] px-2.5 py-0.5 text-[12px] text-ink-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(item.author || item.wordCount !== null) && (
            <div className="mt-4 flex flex-wrap items-center gap-x-2 text-[13px] text-ink-muted">
              {item.author && <span>por {item.author}</span>}
              {item.author && item.wordCount !== null && <span>·</span>}
              {item.wordCount !== null && (
                <span>{item.wordCount.toLocaleString('pt-BR')} palavras no artigo original</span>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-ink/[0.08] px-6 py-4">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1d9bf0] px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Ler artigo completo ↗
          </a>
        </div>
      </div>
    </div>
  )
}

function SourceAvatar({ source, category }: { source: string; category: NewsCategory }) {
  const initials = source
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  const color = (CATEGORY_META[category] ?? FALLBACK_META).color

  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  )
}

function FeedSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-ink/[0.08] bg-card shadow-sm">
          <div className="h-[3px] w-full animate-pulse bg-ink/[0.08]" />
          <div className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 animate-pulse rounded-xl bg-ink/[0.08]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-32 animate-pulse rounded bg-ink/[0.08]" />
                <div className="h-3 w-16 animate-pulse rounded bg-ink/[0.08]" />
              </div>
            </div>
            <div className="flex gap-1.5">
              <div className="h-5 w-20 animate-pulse rounded-full bg-ink/[0.08]" />
              <div className="h-5 w-16 animate-pulse rounded-full bg-ink/[0.08]" />
            </div>
            <div className="space-y-1.5">
              <div className="h-4 w-full animate-pulse rounded bg-ink/[0.08]" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-ink/[0.08]" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3.5 w-full animate-pulse rounded bg-ink/[0.08]" />
              <div className="h-3.5 w-full animate-pulse rounded bg-ink/[0.08]" />
              <div className="h-3.5 w-3/5 animate-pulse rounded bg-ink/[0.08]" />
            </div>
            <div className="flex justify-between pt-1">
              <div className="h-3.5 w-24 animate-pulse rounded bg-ink/[0.08]" />
              <div className="h-3.5 w-20 animate-pulse rounded bg-ink/[0.08]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
