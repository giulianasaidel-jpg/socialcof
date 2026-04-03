import { useEffect, useRef, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  buildMedicalNewsSseUrl,
  fetchMedicalNews,
  type MedicalNewsItem,
  type NewsCategory,
  type NewsLanguage,
} from '../services/discovery'

const CATEGORY_META: Record<NewsCategory, { label: string; color: string }> = {
  journal:    { label: 'Revistas',   color: '#6366f1' },
  guidelines: { label: 'Diretrizes', color: '#f59e0b' },
  government: { label: 'Governo',    color: '#3b82f6' },
  education:  { label: 'Educação',   color: '#10b981' },
  research:   { label: 'Pesquisa',   color: '#8b5cf6' },
  global:     { label: 'Global',     color: '#ef4444' },
}

const ALL_CATEGORIES: NewsCategory[] = [
  'journal',
  'guidelines',
  'government',
  'education',
  'research',
  'global',
]

/**
 * Feed de notícias médicas estilo Twitter com SSE, filtros e paginação.
 */
export function MedicalNewsPage() {
  const [items, setItems] = useState<MedicalNewsItem[]>([])
  const [pendingItems, setPendingItems] = useState<MedicalNewsItem[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [category, setCategory] = useState<NewsCategory | null>(null)
  const [language, setLanguage] = useState<NewsLanguage | null>(null)
  const [sseConnected, setSseConnected] = useState(false)
  const sseRef = useRef<EventSource | null>(null)

  useEffect(() => {
    setLoading(true)
    setItems([])
    setPendingItems([])
    setPage(1)

    fetchMedicalNews({
      page: 1,
      limit: 20,
      category: category ?? undefined,
      language: language ?? undefined,
    })
      .then(({ data, totalPages: tp }) => {
        setItems(data)
        setTotalPages(tp)
      })
      .finally(() => setLoading(false))
  }, [category, language])

  useEffect(() => {
    const url = buildMedicalNewsSseUrl()
    if (!url) return

    const es = new EventSource(url)
    sseRef.current = es

    es.onopen = () => setSseConnected(true)
    es.onerror = () => setSseConnected(false)

    es.onmessage = (event) => {
      try {
        const news = JSON.parse(event.data as string) as MedicalNewsItem
        const matchCategory = !category || news.category === category
        const matchLanguage = !language || news.language === language
        if (matchCategory && matchLanguage) {
          setPendingItems((prev) => [news, ...prev])
        }
      } catch {
        // ignore malformed events
      }
    }

    return () => {
      es.close()
      sseRef.current = null
      setSseConnected(false)
    }
  }, [category, language])

  function showPendingItems() {
    setItems((prev) => [...pendingItems, ...prev])
    setPendingItems([])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function loadMore() {
    if (loadingMore || page >= totalPages) return
    setLoadingMore(true)
    const nextPage = page + 1
    const { data } = await fetchMedicalNews({
      page: nextPage,
      limit: 20,
      category: category ?? undefined,
      language: language ?? undefined,
    })
    setItems((prev) => [...prev, ...data])
    setPage(nextPage)
    setLoadingMore(false)
  }

  return (
    <div className="pb-16">
      <div className="mx-auto max-w-[600px]">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-ink">🩺 MedFeed</h1>
          <LiveIndicator connected={sseConnected} />
        </div>

        <FilterTabs
          activeCategory={category}
          activeLanguage={language}
          onCategory={setCategory}
          onLanguage={setLanguage}
        />

        {pendingItems.length > 0 && (
          <button
            type="button"
            onClick={showPendingItems}
            className="mt-3 w-full rounded-full bg-[#1d9bf0] py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#1a8cd8]"
          >
            ↑ {pendingItems.length}{' '}
            {pendingItems.length === 1 ? 'nova notícia' : 'novas notícias'}
          </button>
        )}

        {loading ? (
          <FeedSkeleton />
        ) : (
          <>
            {items.length === 0 ? (
              <div className="py-16 text-center text-[14px] text-ink-muted">
                Nenhuma notícia encontrada para os filtros selecionados.
              </div>
            ) : (
              items.map((item) => <NewsCard key={item.id} item={item} />)
            )}

            {page < totalPages && (
              <div className="py-4">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="w-full rounded-full border border-ink/10 py-3.5 text-[14px] font-semibold text-[#1d9bf0] transition-colors hover:bg-ink/[0.03] disabled:opacity-60"
                >
                  {loadingMore ? 'Carregando…' : 'Carregar mais'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function LiveIndicator({ connected }: { connected: boolean }) {
  return (
    <span
      className={[
        'text-[12px] font-semibold',
        connected
          ? 'animate-[livePulse_2s_ease-in-out_infinite] text-[#00ba7c]'
          : 'text-ink-muted',
      ].join(' ')}
    >
      {connected ? '● ao vivo' : '○ offline'}
    </span>
  )
}

function FilterTabs({
  activeCategory,
  activeLanguage,
  onCategory,
  onLanguage,
}: {
  activeCategory: NewsCategory | null
  activeLanguage: NewsLanguage | null
  onCategory: (c: NewsCategory | null) => void
  onLanguage: (l: NewsLanguage | null) => void
}) {
  return (
    <div className="mb-2 border-b border-ink/[0.08]">
      <div className="flex gap-1.5 overflow-x-auto pb-3">
        <TabPill
          active={activeCategory === null}
          onClick={() => onCategory(null)}
          label="Para você"
        />
        {ALL_CATEGORIES.map((cat) => (
          <TabPill
            key={cat}
            active={activeCategory === cat}
            onClick={() => onCategory(activeCategory === cat ? null : cat)}
            label={CATEGORY_META[cat].label}
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
  const meta = CATEGORY_META[item.category]
  const timeAgo = formatDistanceToNow(new Date(item.publishedAt), {
    addSuffix: false,
    locale: ptBR,
  })

  return (
    <article className="animate-[slideDown_0.25s_ease] border-b border-ink/[0.08] py-4">
      <div className="mb-2.5 flex items-center gap-2.5">
        <SourceAvatar source={item.source} category={item.category} />
        <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
          <span className="truncate text-[15px] font-bold text-ink">
            {item.source}
          </span>
          <span className="shrink-0 text-[14px] text-ink-muted">· {timeAgo}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
            style={{ backgroundColor: meta.color }}
          >
            {meta.label}
          </span>
          <span className="rounded-full bg-ink/[0.06] px-2.5 py-0.5 text-[11px] font-semibold text-ink-muted dark:bg-white/[0.08]">
            {item.language.toUpperCase()}
          </span>
        </div>
      </div>

      <h3 className="mb-1.5 line-clamp-2 text-[15px] font-bold leading-snug text-ink">
        {item.title}
      </h3>

      {item.summary && (
        <p className="mb-3 line-clamp-3 text-[14px] leading-relaxed text-ink-muted">
          {item.summary}
        </p>
      )}

      <div className="flex justify-end">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[14px] font-medium text-[#1d9bf0] hover:underline"
        >
          Ler artigo ↗
        </a>
      </div>
    </article>
  )
}

function SourceAvatar({
  source,
  category,
}: {
  source: string
  category: NewsCategory
}) {
  const initials = source
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  const color = CATEGORY_META[category].color

  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  )
}

function FeedSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="border-b border-ink/[0.08] py-4">
          <div className="mb-2.5 flex items-center gap-2.5">
            <div className="h-9 w-9 animate-pulse rounded-full bg-ink/[0.08]" />
            <div className="h-4 w-28 animate-pulse rounded bg-ink/[0.08]" />
            <div className="ml-auto h-5 w-16 animate-pulse rounded-full bg-ink/[0.08]" />
          </div>
          <div className="mb-1.5 h-5 w-full animate-pulse rounded bg-ink/[0.08]" />
          <div className="mb-3 space-y-1.5">
            <div className="h-4 w-full animate-pulse rounded bg-ink/[0.08]" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-ink/[0.08]" />
          </div>
          <div className="flex justify-end">
            <div className="h-4 w-20 animate-pulse rounded bg-ink/[0.08]" />
          </div>
        </div>
      ))}
    </>
  )
}
