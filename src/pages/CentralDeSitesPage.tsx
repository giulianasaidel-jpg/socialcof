import { useEffect, useState, useCallback, type FormEvent } from 'react'
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
type NewsMethod = 'api' | 'rss' | 'html'
type NewsPriority = 'P1' | 'P2' | 'P3'
type NewsLanguage = 'pt' | 'en'
type NewsSpecialty =
  | 'residencia'
  | 'clinica_medica'
  | 'cirurgia'
  | 'pediatria'
  | 'preventiva'
  | 'gineco'
  | 'outras'

interface MedNewsSource {
  _id: string
  name: string
  url: string
  specialty: NewsSpecialty
  category: NewsCategory
  language: NewsLanguage
  priority: NewsPriority
  method: NewsMethod
  country: string
  isActive: boolean
  lastScrapedAt: string | null
  createdAt: string
  updatedAt: string
}

interface ScrapeResult {
  scraped: number
  saved: number
  lastScrapedAt: string
}

type SourceFormData = {
  name: string
  url: string
  specialty: NewsSpecialty
  category: NewsCategory
  language: NewsLanguage
  priority: NewsPriority
  method: NewsMethod
  country: string
  isActive: boolean
}

type ToastItem = { id: number; message: string; type: 'success' | 'error' }

const CATEGORY_LABELS: Record<NewsCategory, string> = {
  education: 'Educação',
  government: 'Governo',
  journal: 'Periódico',
  guidelines: 'Diretrizes',
  research: 'Pesquisa',
  global: 'Global',
  news: 'Notícias',
  society: 'Sociedade Médica',
}

const PRIORITY_COLORS: Record<NewsPriority, string> = {
  P1: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  P2: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  P3: 'bg-ink/[0.06] text-ink-muted',
}

const LANGUAGE_FLAGS: Record<NewsLanguage, string> = {
  pt: '🇧🇷',
  en: '🇺🇸',
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

const SPECIALTY_COLORS: Record<NewsSpecialty, string> = {
  residencia:     'bg-purple-100 text-purple-700',
  clinica_medica: 'bg-blue-100 text-blue-700',
  cirurgia:       'bg-red-100 text-red-700',
  pediatria:      'bg-green-100 text-green-700',
  preventiva:     'bg-teal-100 text-teal-700',
  gineco:         'bg-pink-100 text-pink-700',
  outras:         'bg-gray-100 text-gray-600',
}

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

const DEFAULT_FORM: SourceFormData = {
  name: '',
  url: '',
  specialty: 'outras',
  category: 'news',
  language: 'pt',
  priority: 'P2',
  method: 'html',
  country: 'Brasil',
  isActive: true,
}

let toastSeq = 0

/**
 * Returns a human-readable relative time string in pt-BR.
 */
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora mesmo'
  if (mins < 60) return `há ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `há ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `há ${days}d`
}

/**
 * Floating toast notifications container.
 */
function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[]
  onDismiss: (id: number) => void
}) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            'pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg text-[14px] font-medium',
            t.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white',
          ].join(' ')}
        >
          <span>{t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="opacity-70 hover:opacity-100 leading-none"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

/**
 * Toggle switch component.
 */
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={[
        'relative h-6 w-11 rounded-full transition-colors',
        value ? 'bg-brand' : 'bg-ink/20',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
          value ? 'translate-x-5' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  )
}

/**
 * Modal form for creating and editing a MedNewsSource.
 */
function SourceFormModal({
  initial,
  title,
  onClose,
  onSubmit,
}: {
  initial: SourceFormData
  title: string
  onClose: () => void
  onSubmit: (data: SourceFormData) => Promise<void>
}) {
  const [form, setForm] = useState<SourceFormData>(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set<K extends keyof SourceFormData>(key: K, value: SourceFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onSubmit(form)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-3xl bg-card p-6 shadow-2xl">
        <h2 className="mb-5 text-[18px] font-semibold text-ink">{title}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-[13px] font-medium text-ink-muted">Nome *</label>
            <input
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full rounded-xl border border-ink/10 bg-surface px-3 py-2 text-[14px] text-ink outline-none focus:border-brand"
              placeholder="Ex: CFM Notícias"
            />
          </div>

          <div>
            <label className="mb-1 block text-[13px] font-medium text-ink-muted">URL *</label>
            <input
              required
              type="url"
              value={form.url}
              onChange={(e) => set('url', e.target.value)}
              className="w-full rounded-xl border border-ink/10 bg-surface px-3 py-2 text-[14px] text-ink outline-none focus:border-brand"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="mb-1 block text-[13px] font-medium text-ink-muted">Especialidade *</label>
            <select
              value={form.specialty}
              onChange={(e) => set('specialty', e.target.value as NewsSpecialty)}
              className="w-full rounded-xl border border-ink/10 bg-surface px-3 py-2 text-[14px] text-ink outline-none focus:border-brand"
            >
              {(Object.entries(SPECIALTY_LABELS) as [NewsSpecialty, string][]).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[13px] font-medium text-ink-muted">Método *</label>
              <select
                value={form.method}
                onChange={(e) => set('method', e.target.value as NewsMethod)}
                className="w-full rounded-xl border border-ink/10 bg-surface px-3 py-2 text-[14px] text-ink outline-none focus:border-brand"
              >
                <option value="html">html</option>
                <option value="rss">rss</option>
                <option value="api">api</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[13px] font-medium text-ink-muted">Prioridade *</label>
              <select
                value={form.priority}
                onChange={(e) => set('priority', e.target.value as NewsPriority)}
                className="w-full rounded-xl border border-ink/10 bg-surface px-3 py-2 text-[14px] text-ink outline-none focus:border-brand"
              >
                <option value="P1">P1</option>
                <option value="P2">P2</option>
                <option value="P3">P3</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[13px] font-medium text-ink-muted">Categoria *</label>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value as NewsCategory)}
                className="w-full rounded-xl border border-ink/10 bg-surface px-3 py-2 text-[14px] text-ink outline-none focus:border-brand"
              >
                {(Object.entries(CATEGORY_LABELS) as [NewsCategory, string][]).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[13px] font-medium text-ink-muted">Idioma *</label>
              <select
                value={form.language}
                onChange={(e) => set('language', e.target.value as NewsLanguage)}
                className="w-full rounded-xl border border-ink/10 bg-surface px-3 py-2 text-[14px] text-ink outline-none focus:border-brand"
              >
                <option value="pt">🇧🇷 Português</option>
                <option value="en">🇺🇸 English</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[13px] font-medium text-ink-muted">País</label>
            <input
              value={form.country}
              onChange={(e) => set('country', e.target.value)}
              className="w-full rounded-xl border border-ink/10 bg-surface px-3 py-2 text-[14px] text-ink outline-none focus:border-brand"
              placeholder="Brasil"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-ink/10 bg-surface px-3 py-2.5">
            <span className="text-[14px] font-medium text-ink">Ativo</span>
            <Toggle value={form.isActive} onChange={(v) => set('isActive', v)} />
          </div>

          {error && <p className="text-[13px] text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-[14px] font-medium text-ink-muted hover:bg-ink/[0.04]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-brand px-5 py-2 text-[14px] font-semibold text-white disabled:opacity-50"
            >
              {loading ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * Confirmation modal for deleting a source.
 */
function DeleteConfirmModal({
  sourceName,
  onClose,
  onConfirm,
}: {
  sourceName: string
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [loading, setLoading] = useState(false)

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
        <h2 className="text-[17px] font-semibold text-ink">Remover fonte</h2>
        <p className="mt-2 text-[14px] text-ink-muted">
          Deseja remover <strong className="text-ink">{sourceName}</strong>? Essa ação não pode ser
          desfeita.
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
            {loading ? 'Removendo…' : 'Remover'}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Card displaying a single MedNewsSource with action buttons.
 */
function SourceCard({
  source,
  scraping,
  onScrape,
  onEdit,
  onDelete,
}: {
  source: MedNewsSource
  scraping: boolean
  onScrape: (id: string) => void
  onEdit: (source: MedNewsSource) => void
  onDelete: (source: MedNewsSource) => void
}) {
  const canScrape = source.method === 'html'

  return (
    <div className="rounded-2xl border border-ink/10 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={[
              'mt-1 h-2.5 w-2.5 shrink-0 rounded-full',
              source.isActive ? 'bg-green-500' : 'bg-ink/25',
            ].join(' ')}
          />
          <div className="min-w-0">
            <p className="text-[15px] font-semibold leading-tight text-ink">{source.name}</p>
            <p className="mt-0.5 truncate text-[13px] text-ink-muted">{source.url}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span
            className={[
              'rounded-full px-2 py-0.5 text-[11px] font-bold uppercase',
              PRIORITY_COLORS[source.priority],
            ].join(' ')}
          >
            {source.priority}
          </span>
          <span
            className={[
              'rounded-full px-2 py-0.5 text-[11px] font-semibold',
              SPECIALTY_COLORS[source.specialty],
            ].join(' ')}
          >
            {SPECIALTY_LABELS[source.specialty]}
          </span>
          <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] text-ink-muted">
            {CATEGORY_LABELS[source.category]}
          </span>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className="text-[12px]">{LANGUAGE_FLAGS[source.language]}</span>
        <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] text-ink-muted">
          {source.language}
        </span>
        <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] text-ink-muted">
          {source.method}
        </span>
        {source.country && (
          <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] text-ink-muted">
            {source.country}
          </span>
        )}
      </div>

      <p className="mt-2 text-[12px] text-ink-muted">
        {source.lastScrapedAt
          ? `Último scraping: ${relativeTime(source.lastScrapedAt)}`
          : 'Nunca executado'}
      </p>

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          title={canScrape ? 'Disparar scraping manual' : 'Só disponível para fontes HTML'}
          disabled={!canScrape || scraping}
          onClick={() => onScrape(source._id)}
          className="rounded-xl border border-ink/10 px-3 py-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-ink/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {scraping ? 'Scraping…' : 'Scraping manual'}
        </button>
        <button
          type="button"
          onClick={() => onEdit(source)}
          className="rounded-xl border border-ink/10 px-3 py-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-ink/[0.04]"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={() => onDelete(source)}
          className="rounded-xl border border-red-200 px-3 py-1.5 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20"
        >
          Remover
        </button>
      </div>
    </div>
  )
}

/**
 * Central de Sites: admin page to manage HTML scraping sources via Apify.
 */
export function CentralDeSitesPage() {
  const [sources, setSources] = useState<MedNewsSource[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSpecialty, setFilterSpecialty] = useState<NewsSpecialty | null>(null)
  const [filterPriority, setFilterPriority] = useState<NewsPriority | ''>('')
  const [filterActive, setFilterActive] = useState<'active' | 'inactive' | ''>('')
  const [scrapingIds, setScrapingIds] = useState<Set<string>>(new Set())
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [modalCreate, setModalCreate] = useState(false)
  const [editingSource, setEditingSource] = useState<MedNewsSource | null>(null)
  const [deletingSource, setDeletingSource] = useState<MedNewsSource | null>(null)

  function addToast(message: string, type: ToastItem['type']) {
    const id = ++toastSeq
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }

  function dismissToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const loadSources = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<MedNewsSource[]>('/medical-news/sources')
      setSources(data)
    } catch {
      // silent — no sources or network error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSources()
  }, [loadSources])

  async function handleScrape(id: string) {
    setScrapingIds((prev) => new Set(prev).add(id))
    try {
      const result = await api.post<ScrapeResult>(`/medical-news/sources/${id}/scrape`)
      setSources((prev) =>
        prev.map((s) => (s._id === id ? { ...s, lastScrapedAt: result.lastScrapedAt } : s)),
      )
      addToast(`Scraping concluído: ${result.saved} novas notícias salvas`, 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Erro no scraping', 'error')
    } finally {
      setScrapingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  async function handleCreate(data: SourceFormData) {
    const created = await api.post<MedNewsSource>('/medical-news/sources', data)
    setSources((prev) => [created, ...prev])
    addToast('Fonte criada com sucesso', 'success')
  }

  async function handleEdit(data: SourceFormData) {
    if (!editingSource) return
    const updated = await api.patch<MedNewsSource>(
      `/medical-news/sources/${editingSource._id}`,
      data,
    )
    setSources((prev) => prev.map((s) => (s._id === updated._id ? updated : s)))
    addToast('Fonte atualizada', 'success')
  }

  async function handleDelete() {
    if (!deletingSource) return
    try {
      await api.delete(`/medical-news/sources/${deletingSource._id}`)
      setSources((prev) => prev.filter((s) => s._id !== deletingSource._id))
      setDeletingSource(null)
      addToast('Fonte removida', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Erro ao remover fonte', 'error')
      throw err
    }
  }

  const filtered = sources.filter((s) => {
    if (filterSpecialty && s.specialty !== filterSpecialty) return false
    if (filterPriority && s.priority !== filterPriority) return false
    if (filterActive === 'active' && !s.isActive) return false
    if (filterActive === 'inactive' && s.isActive) return false
    if (search) {
      const q = search.toLowerCase()
      return s.name.toLowerCase().includes(q) || s.url.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-bold text-ink">Central de Sites</h1>
          <button
            type="button"
            onClick={() => setModalCreate(true)}
            className="rounded-xl bg-brand px-4 py-2 text-[14px] font-semibold text-white hover:opacity-90"
          >
            + Adicionar fonte
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto border-b border-ink/[0.08] pb-3">
          {SPECIALTY_TABS.map((tab) => (
            <button
              key={tab.value ?? 'all-specialty'}
              type="button"
              onClick={() => setFilterSpecialty(tab.value ?? null)}
              className={[
                'shrink-0 rounded-full border font-medium transition-colors px-3.5 py-1.5 text-[13px]',
                filterSpecialty === (tab.value ?? null)
                  ? 'border-transparent bg-ink text-surface'
                  : 'border-ink/[0.1] text-ink-muted hover:border-ink/20 hover:text-ink',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['P1', 'P2', 'P3'] as NewsPriority[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setFilterPriority((prev) => (prev === p ? '' : p))}
              className={[
                'rounded-full px-3 py-1 text-[13px] font-semibold transition-colors',
                filterPriority === p
                  ? PRIORITY_COLORS[p]
                  : 'bg-ink/[0.06] text-ink-muted hover:bg-ink/10',
              ].join(' ')}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFilterActive((prev) => (prev === 'active' ? '' : 'active'))}
            className={[
              'rounded-full px-3 py-1 text-[13px] font-medium transition-colors',
              filterActive === 'active'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-ink/[0.06] text-ink-muted hover:bg-ink/10',
            ].join(' ')}
          >
            Ativo
          </button>
          <button
            type="button"
            onClick={() => setFilterActive((prev) => (prev === 'inactive' ? '' : 'inactive'))}
            className={[
              'rounded-full px-3 py-1 text-[13px] font-medium transition-colors',
              filterActive === 'inactive'
                ? 'bg-ink/10 text-ink'
                : 'bg-ink/[0.06] text-ink-muted hover:bg-ink/10',
            ].join(' ')}
          >
            Inativo
          </button>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou URL…"
            className="ml-auto rounded-xl border border-ink/10 bg-card px-3 py-1.5 text-[13px] text-ink placeholder:text-ink-muted outline-none focus:border-brand"
          />
        </div>

        {loading ? (
          <p className="text-[14px] text-ink-muted">Carregando…</p>
        ) : filtered.length === 0 ? (
          <p className="text-[14px] text-ink-muted">Nenhuma fonte encontrada.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((source) => (
              <SourceCard
                key={source._id}
                source={source}
                scraping={scrapingIds.has(source._id)}
                onScrape={handleScrape}
                onEdit={setEditingSource}
                onDelete={setDeletingSource}
              />
            ))}
          </div>
        )}
      </div>

      {modalCreate && (
        <SourceFormModal
          title="Adicionar fonte"
          initial={DEFAULT_FORM}
          onClose={() => setModalCreate(false)}
          onSubmit={handleCreate}
        />
      )}

      {editingSource && (
        <SourceFormModal
          title="Editar fonte"
          initial={{
            name: editingSource.name,
            url: editingSource.url,
            specialty: editingSource.specialty,
            category: editingSource.category,
            language: editingSource.language,
            priority: editingSource.priority,
            method: editingSource.method,
            country: editingSource.country ?? 'Global',
            isActive: editingSource.isActive,
          }}
          onClose={() => setEditingSource(null)}
          onSubmit={handleEdit}
        />
      )}

      {deletingSource && (
        <DeleteConfirmModal
          sourceName={deletingSource.name}
          onClose={() => setDeletingSource(null)}
          onConfirm={handleDelete}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  )
}
