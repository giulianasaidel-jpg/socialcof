import { useEffect, useRef, useState } from 'react'
import { api, getAccessToken } from '../lib/api'
import { useAppWorkspace } from '../context/AppWorkspaceContext'

type ImageSlide = {
  backgroundUrl: string
  overlayHtml: string
  overlayText: string
}

type ImagePost = {
  id: string
  layout: 'static' | 'carousel' | 'panoramic'
  mode: 'light' | 'dark'
  bodyFontSize: number
  overlayPhase?: 'preview' | 'final'
  overlayFont?: string
  bandStyle?: 'gradient' | 'solid'
  bandColor?: string
  bandTextColor?: string
  overlayBodyColor?: string
  overlayStrongColor?: string
  slides: ImageSlide[]
  caption: string
  profileName: string
  profileHandle: string
  profileImageUrl: string | null
  brandColors: string[]
  sourceTranscript: string | null
  sourceCaption: string | null
  sourcePostId: string | null
  sourceNewsId: string | null
  sourceTikTokPostId: string | null
  sourceInstagramStoryId: string | null
  status: 'Rascunho' | 'Aprovado' | 'Publicado'
  generatedAt: string
  createdAt: string
}

type AltBgResponse = { urls: string[]; query: string; page: number; slideIndex: number }

const OVERLAY_FONTS = [
  { value: 'montserrat', label: 'Montserrat' },
  { value: 'inter',      label: 'Inter' },
  { value: 'playfair',   label: 'Playfair' },
  { value: 'dm-sans',    label: 'DM Sans' },
  { value: 'lora',       label: 'Lora' },
  { value: 'oswald',     label: 'Oswald' },
]

type SourceMode = 'texto' | 'direto' | 'post' | 'news' | 'tiktok' | 'story'

type PostOption = { id: string; title: string; postedAt: string }
type PostsResponse = { data: PostOption[]; total: number; page: number; limit: number }
type NewsOption = { id: string; title: string }
type NewsResponse = { data: NewsOption[]; total: number; page: number; limit: number }
type TikTokAccountOption = { id: string; handle: string; displayName: string }
type TikTokPostOption = { id: string; title: string; postedAt: string }
type StoryOption = { id: string; syncedAt: string; account: { displayName: string } }
type StoriesResponse = { data: StoryOption[]; total: number; page: number; limit: number }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'Aprovado'
      ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400'
      : status === 'Publicado'
        ? 'bg-blue-500/15 text-blue-800 dark:text-blue-400'
        : 'bg-ink/[0.08] text-ink-muted'
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-medium ${cls}`}>
      {status}
    </span>
  )
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function ChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const SOURCE_TABS: { id: SourceMode; label: string }[] = [
  { id: 'texto', label: 'Texto livre' },
  { id: 'direto', label: 'Textos diretos' },
  { id: 'post', label: 'Post IG' },
  { id: 'news', label: 'Notícia' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'story', label: 'Story' },
]

function ImagePostGenerateModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (post: ImagePost) => void
}) {
  const { instagramAccounts, products, workspaceId } = useAppWorkspace()

  const [accountId, setAccountId] = useState(instagramAccounts[0]?.handle ?? '')
  const [productId, setProductId] = useState(products[0]?.id ?? '')
  const [backgroundUrlsText, setBackgroundUrlsText] = useState('')
  const [layout, setLayout] = useState<'static' | 'carousel' | 'panoramic'>('static')
  const [slideCount, setSlideCount] = useState(3)
  const [sourceMode, setSourceMode] = useState<SourceMode>('texto')
  const [mode, setMode] = useState<'dark' | 'light'>('dark')
  const [bodyFontSize, setBodyFontSize] = useState(42)
  const [tone, setTone] = useState('')
  const [overlayFont, setOverlayFont] = useState('montserrat')

  const [sourceTranscript, setSourceTranscript] = useState('')
  const [sourceCaption, setSourceCaption] = useState('')
  const [manualTextsRaw, setManualTextsRaw] = useState('')

  const [posts, setPosts] = useState<PostOption[]>([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [selectedPostId, setSelectedPostId] = useState('')

  const [newsList, setNewsList] = useState<NewsOption[]>([])
  const [newsLoading, setNewsLoading] = useState(false)
  const [selectedNewsId, setSelectedNewsId] = useState('')

  const [tiktokAccounts, setTiktokAccounts] = useState<TikTokAccountOption[]>([])
  const [tiktokPosts, setTiktokPosts] = useState<TikTokPostOption[]>([])
  const [tiktokLoading, setTiktokLoading] = useState(false)
  const [selectedTiktokAccountId, setSelectedTiktokAccountId] = useState('')
  const [selectedTiktokPostId, setSelectedTiktokPostId] = useState('')

  const [stories, setStories] = useState<StoryOption[]>([])
  const [storiesLoading, setStoriesLoading] = useState(false)
  const [selectedStoryId, setSelectedStoryId] = useState('')

  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (sourceMode === 'post' && posts.length === 0) loadPosts()
    else if (sourceMode === 'news' && newsList.length === 0) loadNews()
    else if (sourceMode === 'tiktok' && tiktokAccounts.length === 0) loadTiktokAccounts()
    else if (sourceMode === 'story' && stories.length === 0) loadStories()
  }, [sourceMode])

  useEffect(() => {
    if (selectedTiktokAccountId) loadTiktokPosts(selectedTiktokAccountId)
  }, [selectedTiktokAccountId])

  async function loadPosts() {
    setPostsLoading(true)
    try {
      const p = new URLSearchParams({ workspace: workspaceId, page: '1', limit: '30' })
      if (accountId) p.set('accountId', accountId)
      const res = await api.get<PostsResponse>(`/posts?${p}`)
      setPosts(res.data)
    } catch { /* ignore */ } finally {
      setPostsLoading(false)
    }
  }

  async function loadNews() {
    setNewsLoading(true)
    try {
      const res = await api.get<NewsResponse>('/medical-news?page=1&limit=30')
      setNewsList(res.data)
    } catch { /* ignore */ } finally {
      setNewsLoading(false)
    }
  }

  async function loadTiktokAccounts() {
    setTiktokLoading(true)
    try {
      const res = await api.get<TikTokAccountOption[]>(`/tiktok-accounts?workspace=${workspaceId}`)
      setTiktokAccounts(res)
      if (res.length > 0) setSelectedTiktokAccountId(res[0].id)
    } catch { /* ignore */ } finally {
      setTiktokLoading(false)
    }
  }

  async function loadTiktokPosts(tiktokAccountId: string) {
    setTiktokLoading(true)
    try {
      const res = await api.get<TikTokPostOption[]>(`/tiktok-accounts/${tiktokAccountId}/posts`)
      setTiktokPosts(res)
    } catch { /* ignore */ } finally {
      setTiktokLoading(false)
    }
  }

  async function loadStories() {
    setStoriesLoading(true)
    try {
      const p = new URLSearchParams({ workspace: workspaceId, page: '1', limit: '30' })
      if (accountId) p.set('accountId', accountId)
      const res = await api.get<StoriesResponse>(`/instagram-stories?${p}`)
      setStories(res.data)
    } catch { /* ignore */ } finally {
      setStoriesLoading(false)
    }
  }

  async function handleGenerate() {
    if (!accountId || !productId) return
    const backgroundUrls = backgroundUrlsText
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean)
    setError(null)
    setGenerating(true)
    try {
      const body: Record<string, unknown> = {
        accountId,
        productId,
        ...(backgroundUrls.length > 0 ? { backgroundUrls } : {}),
        layout,
        mode,
        bodyFontSize,
        overlayFont,
        ...(layout === 'panoramic' || layout === 'carousel' ? { slideCount } : {}),
        ...(tone ? { tone } : {}),
      }
      if (sourceMode === 'post' && selectedPostId) body.sourcePostId = selectedPostId
      else if (sourceMode === 'news' && selectedNewsId) body.sourceNewsId = selectedNewsId
      else if (sourceMode === 'tiktok' && selectedTiktokPostId) body.sourceTikTokPostId = selectedTiktokPostId
      else if (sourceMode === 'story' && selectedStoryId) body.sourceInstagramStoryId = selectedStoryId
      else if (sourceMode === 'texto') {
        if (sourceTranscript) body.sourceTranscript = sourceTranscript
        if (sourceCaption) body.sourceCaption = sourceCaption
      } else if (sourceMode === 'direto') {
        const manualTexts = manualTextsRaw
          .split('\n---\n')
          .map((t) => t.trim())
          .filter(Boolean)
        body.manualTexts = manualTexts
      }
      const post = await api.post<ImagePost>('/image-posts/generate', body)
      onCreate(post)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-start">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-xl flex-col overflow-y-auto bg-card shadow-2xl sm:h-screen">
        <div className="flex items-center justify-between border-b border-ink/[0.06] px-5 py-4">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-muted">
            Novo Image Post
          </p>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-ink/[0.06]">
            <CloseIcon />
          </button>
        </div>

        <div className="flex flex-col gap-5 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">Conta</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[14px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              >
                {instagramAccounts.map((a) => (
                  <option key={a.id} value={a.handle}>{a.displayName} (@{a.handle})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">Produto</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[14px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              >
                <option value="">Selecione…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">Layout</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {([
                { value: 'static',    label: 'Estático',    desc: '1 slide' },
                { value: 'carousel',  label: 'Carrossel',   desc: 'múltiplos slides' },
                { value: 'panoramic', label: 'Panorâmico',  desc: 'imagem revelada em fatias' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLayout(opt.value)}
                  className={[
                    'flex flex-col rounded-xl border px-3 py-2.5 text-left transition',
                    layout === opt.value
                      ? 'border-brand/30 bg-brand/10'
                      : 'border-ink/[0.1] hover:border-brand/20',
                  ].join(' ')}
                >
                  <span className={['text-[13px] font-semibold', layout === opt.value ? 'text-brand' : 'text-ink'].join(' ')}>
                    {opt.label}
                  </span>
                  <span className="mt-0.5 text-[11px] text-ink-muted">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {(layout === 'panoramic' || layout === 'carousel') && (
            <div>
              <label className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
                Número de slides
              </label>
              <input
                type="number"
                min={2}
                max={10}
                value={slideCount}
                onChange={(e) => setSlideCount(Math.max(2, Math.min(10, Number(e.target.value))))}
                className="mt-2 w-24 rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[14px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
          )}

          <div>
            <label className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">Tipografia</label>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {OVERLAY_FONTS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setOverlayFont(f.value)}
                  className={[
                    'rounded-lg border px-3 py-2 text-[13px] font-medium transition',
                    overlayFont === f.value
                      ? 'border-brand/30 bg-brand/10 text-brand'
                      : 'border-ink/[0.1] text-ink-muted hover:border-brand/20 hover:text-ink',
                  ].join(' ')}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
              {layout === 'panoramic' ? 'Imagem de fundo panorâmica' : 'Imagens de fundo'}
              <span className="ml-2 rounded-full bg-ink/[0.06] px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-ink-muted">
                opcional — Unsplash busca automaticamente
              </span>
            </label>
            <p className="mt-0.5 text-[12px] text-ink-muted">
              {layout === 'panoramic'
                ? 'Uma URL de imagem larga (16:9 ou mais) para fatiar em slides.'
                : 'Uma URL por linha. Deixe vazio para busca automática no Unsplash.'}
            </p>
            <textarea
              value={backgroundUrlsText}
              onChange={(e) => setBackgroundUrlsText(e.target.value)}
              rows={layout === 'panoramic' ? 1 : 3}
              placeholder={
                layout === 'panoramic'
                  ? 'https://images.unsplash.com/photo-xxx (imagem larga)'
                  : 'https://images.unsplash.com/photo-xxx\nhttps://cdn.example.com/slide2.jpg'
              }
              className="mt-2 w-full resize-none rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[13px] font-mono text-ink placeholder:text-ink-subtle outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">Tema visual</label>
              <div className="mt-2 flex gap-2">
                {(['dark', 'light'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={[
                      'rounded-lg border px-4 py-2 text-[13px] font-medium transition',
                      mode === m
                        ? 'border-brand/30 bg-brand/10 text-brand'
                        : 'border-ink/[0.1] text-ink-muted hover:border-brand/20 hover:text-ink',
                    ].join(' ')}
                  >
                    {m === 'dark' ? '🌑 Escuro' : '☀️ Claro'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
                Tamanho do texto ({bodyFontSize}px)
              </label>
              <input
                type="range"
                min={24}
                max={72}
                value={bodyFontSize}
                onChange={(e) => setBodyFontSize(Number(e.target.value))}
                className="mt-3 w-full accent-brand"
              />
            </div>
          </div>

          <div>
            <label className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">Tom (opcional)</label>
            <input
              type="text"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              placeholder="ex: educativo, direto, motivacional"
              className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[14px] text-ink placeholder:text-ink-subtle outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div>
            <label className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">Fonte do conteúdo</label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SOURCE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSourceMode(tab.id)}
                  className={[
                    'rounded-lg border px-3 py-1.5 text-[13px] font-medium transition',
                    sourceMode === tab.id
                      ? 'border-brand/30 bg-brand/10 text-brand'
                      : 'border-ink/[0.1] text-ink-muted hover:border-brand/20 hover:text-ink',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {sourceMode === 'texto' && (
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={sourceCaption}
                onChange={(e) => setSourceCaption(e.target.value)}
                placeholder="Título (opcional)"
                className="w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[14px] text-ink placeholder:text-ink-subtle outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              <textarea
                value={sourceTranscript}
                onChange={(e) => setSourceTranscript(e.target.value)}
                rows={6}
                placeholder="Cole o conteúdo aqui para gerar os textos dos slides…"
                className="w-full resize-none rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[14px] text-ink placeholder:text-ink-subtle outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
          )}

          {sourceMode === 'direto' && (
            <div>
              <p className="mb-1 text-[12px] text-ink-muted">
                Um texto por slide. Separe slides com <code className="rounded bg-ink/[0.06] px-1 font-mono">---</code> em linha própria. Suporta <strong>**negrito**</strong>.
              </p>
              <textarea
                value={manualTextsRaw}
                onChange={(e) => setManualTextsRaw(e.target.value)}
                rows={6}
                placeholder={'**Amiodarona** na PCR: 150mg IV em 10 min\n---\nManutenção: 1mg/min por 6h'}
                className="w-full resize-none rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[14px] text-ink placeholder:text-ink-subtle outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
          )}

          {sourceMode === 'post' && (
            postsLoading ? (
              <div className="h-12 animate-pulse rounded-xl bg-ink/[0.06]" />
            ) : (
              <select
                value={selectedPostId}
                onChange={(e) => setSelectedPostId(e.target.value)}
                className="w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[14px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              >
                <option value="">Selecione um post</option>
                {posts.map((p) => (
                  <option key={p.id} value={p.id}>{p.title || formatDate(p.postedAt)}</option>
                ))}
              </select>
            )
          )}

          {sourceMode === 'news' && (
            newsLoading ? (
              <div className="h-12 animate-pulse rounded-xl bg-ink/[0.06]" />
            ) : (
              <select
                value={selectedNewsId}
                onChange={(e) => setSelectedNewsId(e.target.value)}
                className="w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[14px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              >
                <option value="">Selecione uma notícia</option>
                {newsList.map((n) => (
                  <option key={n.id} value={n.id}>{n.title}</option>
                ))}
              </select>
            )
          )}

          {sourceMode === 'tiktok' && (
            tiktokLoading ? (
              <div className="h-12 animate-pulse rounded-xl bg-ink/[0.06]" />
            ) : (
              <div className="flex flex-col gap-3">
                <select
                  value={selectedTiktokAccountId}
                  onChange={(e) => { setSelectedTiktokAccountId(e.target.value); setSelectedTiktokPostId('') }}
                  className="w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[14px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                >
                  <option value="">Conta TikTok</option>
                  {tiktokAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.displayName} (@{a.handle})</option>
                  ))}
                </select>
                {selectedTiktokAccountId && (
                  <select
                    value={selectedTiktokPostId}
                    onChange={(e) => setSelectedTiktokPostId(e.target.value)}
                    className="w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[14px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  >
                    <option value="">Selecione um post</option>
                    {tiktokPosts.map((p) => (
                      <option key={p.id} value={p.id}>{p.title || formatDate(p.postedAt)}</option>
                    ))}
                  </select>
                )}
              </div>
            )
          )}

          {sourceMode === 'story' && (
            storiesLoading ? (
              <div className="h-12 animate-pulse rounded-xl bg-ink/[0.06]" />
            ) : (
              <select
                value={selectedStoryId}
                onChange={(e) => setSelectedStoryId(e.target.value)}
                className="w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[14px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              >
                <option value="">Selecione um story</option>
                {stories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.account.displayName} · {formatDate(s.syncedAt)}
                  </option>
                ))}
              </select>
            )
          )}

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !accountId || !productId}
            className="rounded-xl bg-brand px-5 py-3 text-[14px] font-semibold text-white disabled:opacity-50 hover:bg-brand/90"
          >
            {generating ? 'Gerando…' : 'Gerar image post'}
          </button>
        </div>
      </aside>
    </div>
  )
}

function SlideViewer({
  post,
  onUpdate,
}: {
  post: ImagePost
  onUpdate: (updated: ImagePost) => void
}) {
  const [index, setIndex] = useState(0)
  const [editMode, setEditMode] = useState(false)
  const [editOverlayText, setEditOverlayText] = useState('')
  const [editBackgroundUrl, setEditBackgroundUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [previewVersion, setPreviewVersion] = useState(0)
  const [htmlEditMode, setHtmlEditMode] = useState(false)
  const [htmlEditText, setHtmlEditText] = useState('')
  const [htmlSaving, setHtmlSaving] = useState(false)
  const [altBgLoading, setAltBgLoading] = useState(false)
  const [altBgData, setAltBgData] = useState<{ urls: string[]; query: string; page: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setScale(el.offsetWidth / 1080)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const totalSlides = post.slides.length
  const slide = post.slides[index]

  function openEdit() {
    setHtmlEditMode(false)
    setEditOverlayText(slide?.overlayText ?? '')
    setEditBackgroundUrl(slide?.backgroundUrl ?? '')
    setEditMode(true)
  }

  function cancelEdit() {
    setEditMode(false)
  }

  function openHtmlEdit() {
    setEditMode(false)
    setHtmlEditText(slide?.overlayHtml ?? '')
    setHtmlEditMode(true)
  }

  function cancelHtmlEdit() {
    setHtmlEditMode(false)
    setHtmlEditText('')
  }

  async function saveHtmlEdit() {
    setHtmlSaving(true)
    try {
      const updated = await api.patch<ImagePost>(`/image-posts/${post.id}/slides/${index}/html`, {
        overlayHtml: htmlEditText,
      })
      onUpdate(updated)
      setPreviewVersion((v) => v + 1)
      setHtmlEditMode(false)
    } finally {
      setHtmlSaving(false)
    }
  }

  async function saveEdit() {
    setSaving(true)
    try {
      const newSlides = post.slides.map((s, i) =>
        i === index
          ? { backgroundUrl: editBackgroundUrl, overlayText: editOverlayText }
          : { backgroundUrl: s.backgroundUrl, overlayText: s.overlayText },
      )
      const updated = await api.patch<ImagePost>(`/image-posts/${post.id}`, { slides: newSlides })
      onUpdate(updated)
      setPreviewVersion((v) => v + 1)
      setEditMode(false)
    } finally {
      setSaving(false)
    }
  }

  async function fetchAlternateBgs(page = 1) {
    setAltBgLoading(true)
    setEditMode(false)
    setHtmlEditMode(false)
    try {
      const res = await api.post<AltBgResponse>(
        `/image-posts/${post.id}/slides/${index}/alternate-backgrounds`,
        { page },
      )
      setAltBgData({ urls: res.urls, query: res.query, page: res.page })
    } catch { /* ignore */ } finally {
      setAltBgLoading(false)
    }
  }

  async function pickAltBackground(url: string) {
    setSaving(true)
    try {
      const newSlides =
        post.layout === 'panoramic'
          ? post.slides.map((s) => ({ backgroundUrl: url, overlayText: s.overlayText }))
          : post.slides.map((s, i) =>
              i === index
                ? { backgroundUrl: url, overlayText: s.overlayText }
                : { backgroundUrl: s.backgroundUrl, overlayText: s.overlayText },
            )
      const updated = await api.patch<ImagePost>(`/image-posts/${post.id}`, { slides: newSlides })
      onUpdate(updated)
      setAltBgData(null)
      setPreviewVersion((v) => v + 1)
    } finally {
      setSaving(false)
    }
  }

  async function handleDownloadSlide() {
    setDownloading(true)
    try {
      const token = getAccessToken()
      const res = await fetch(`${api.getBaseUrl()}/image-posts/${post.id}/slides/${index}/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `slide-${index + 1}.png`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  async function handleDownloadAll() {
    setDownloading(true)
    try {
      const token = getAccessToken()
      const res = await fetch(`${api.getBaseUrl()}/image-posts/${post.id}/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `image-post-${post.id}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  async function handleUploadBackground(file: File) {
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const token = getAccessToken()
      const res = await fetch(
        `${api.getBaseUrl()}/image-posts/${post.id}/slides/${index}/upload-background`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        },
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const updated = (await res.json()) as ImagePost
      onUpdate(updated)
      setPreviewVersion((v) => v + 1)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => { setIndex((i) => Math.max(0, i - 1)); setEditMode(false); setHtmlEditMode(false) }}
          disabled={index === 0}
          className="rounded-lg border border-ink/[0.08] p-2 text-ink-muted disabled:opacity-30 hover:bg-ink/[0.04]"
          aria-label="Slide anterior"
        >
          <ChevronLeft />
        </button>
        <span className="min-w-[84px] text-center text-[14px] font-medium text-ink">
          Slide {index + 1} / {totalSlides}
        </span>
        <button
          type="button"
          onClick={() => { setIndex((i) => Math.min(totalSlides - 1, i + 1)); setEditMode(false); setHtmlEditMode(false) }}
          disabled={index === totalSlides - 1}
          className="rounded-lg border border-ink/[0.08] p-2 text-ink-muted disabled:opacity-30 hover:bg-ink/[0.04]"
          aria-label="Próximo slide"
        >
          <ChevronRight />
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-2xl border border-ink/[0.08] shadow-sm"
        style={{ aspectRatio: '1 / 1' }}
      >
        {slide && (
          <iframe
            key={`${post.id}-${index}-${previewVersion}`}
            src={`${api.getBaseUrl()}/image-posts/${post.id}/slides/${index}/preview?token=${getAccessToken() ?? ''}&v=${previewVersion}`}
            style={{
              position: 'absolute',
              width: 1080,
              height: 1080,
              border: 'none',
              transformOrigin: 'top left',
              transform: `scale(${scale})`,
            }}
            sandbox="allow-same-origin"
            title={`Slide ${index + 1}`}
          />
        )}
      </div>

      {htmlEditMode ? (
        <div className="flex flex-col gap-2">
          <p className="text-[12px] text-ink-muted">Editando HTML direto do slide.</p>
          <textarea
            value={htmlEditText}
            onChange={(e) => setHtmlEditText(e.target.value)}
            rows={10}
            className="w-full resize-none rounded-xl border border-ink/[0.1] bg-surface px-3.5 py-2.5 font-mono text-[12px] text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveHtmlEdit}
              disabled={htmlSaving}
              className="rounded-lg bg-brand px-4 py-2 text-[14px] font-medium text-white disabled:opacity-60 hover:bg-brand/90"
            >
              {htmlSaving ? 'Salvando…' : 'Salvar HTML'}
            </button>
            <button
              type="button"
              onClick={cancelHtmlEdit}
              className="rounded-lg border border-ink/[0.1] px-4 py-2 text-[14px] font-medium text-ink-muted hover:text-ink"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : editMode ? (
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[12px] text-ink-muted">Texto overlay (suporta **negrito**)</label>
            <textarea
              value={editOverlayText}
              onChange={(e) => setEditOverlayText(e.target.value)}
              rows={4}
              className="mt-1 w-full resize-none rounded-xl border border-ink/[0.1] bg-surface px-3.5 py-2.5 text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
          <div>
            <label className="text-[12px] text-ink-muted">URL da imagem de fundo</label>
            <input
              type="text"
              value={editBackgroundUrl}
              onChange={(e) => setEditBackgroundUrl(e.target.value)}
              className="mt-1 w-full rounded-xl border border-ink/[0.1] bg-surface px-3.5 py-2.5 text-[13px] font-mono text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveEdit}
              disabled={saving}
              className="rounded-lg bg-brand px-4 py-2 text-[14px] font-medium text-white disabled:opacity-60 hover:bg-brand/90"
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-lg border border-ink/[0.1] px-4 py-2 text-[14px] font-medium text-ink-muted hover:text-ink"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : altBgData ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-ink-muted">
              Busca: <span className="font-medium text-ink">"{altBgData.query}"</span>
              {post.layout === 'panoramic' && (
                <span className="ml-2 text-ink-subtle">· aplicada em todos os slides</span>
              )}
            </p>
            <button
              type="button"
              onClick={() => setAltBgData(null)}
              className="text-[12px] text-ink-muted hover:text-ink"
            >
              Fechar
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {altBgData.urls.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => pickAltBackground(url)}
                disabled={saving}
                className="aspect-square overflow-hidden rounded-lg border-2 border-transparent transition hover:border-brand disabled:opacity-50"
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => fetchAlternateBgs(altBgData.page + 1)}
            disabled={altBgLoading}
            className="self-start rounded-lg border border-ink/[0.1] px-3.5 py-2 text-[13px] font-medium text-ink-muted disabled:opacity-60 hover:border-brand/30 hover:text-brand"
          >
            {altBgLoading ? 'Buscando…' : 'Ver mais'}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleUploadBackground(file)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => fetchAlternateBgs(1)}
            disabled={altBgLoading}
            className="rounded-lg border border-ink/[0.1] px-3.5 py-2 text-[13px] font-medium text-ink-muted disabled:opacity-60 hover:border-brand/30 hover:text-brand"
          >
            {altBgLoading ? 'Buscando…' : '🔄 Outra imagem'}
          </button>
          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            disabled={saving}
            className="rounded-lg border border-ink/[0.1] px-3.5 py-2 text-[13px] font-medium text-ink-muted disabled:opacity-60 hover:border-brand/30 hover:text-brand"
          >
            {saving ? 'Enviando…' : '↑ Upload imagem'}
          </button>
          <button
            type="button"
            onClick={openEdit}
            className="rounded-lg border border-ink/[0.1] px-3.5 py-2 text-[13px] font-medium text-ink-muted hover:border-brand/30 hover:text-brand"
          >
            Editar slide
          </button>
          <button
            type="button"
            onClick={openHtmlEdit}
            className="rounded-lg border border-ink/[0.1] px-3.5 py-2 text-[13px] font-medium text-ink-muted hover:border-brand/30 hover:text-brand"
          >
            Editar HTML
          </button>
          <button
            type="button"
            onClick={handleDownloadSlide}
            disabled={downloading}
            className="rounded-lg border border-ink/[0.1] px-3.5 py-2 text-[13px] font-medium text-ink-muted disabled:opacity-60 hover:border-brand/30 hover:text-brand"
          >
            ↓ Baixar slide
          </button>
          {totalSlides > 1 && (
            <button
              type="button"
              onClick={handleDownloadAll}
              disabled={downloading}
              className="rounded-lg border border-ink/[0.1] px-3.5 py-2 text-[13px] font-medium text-ink-muted disabled:opacity-60 hover:border-brand/30 hover:text-brand"
            >
              ↓ Baixar todos (ZIP)
            </button>
          )}
        </div>
      )}

      {totalSlides > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {post.slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setIndex(i); setEditMode(false); setHtmlEditMode(false) }}
              className={[
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 text-[10px] font-semibold transition',
                i === index
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-transparent bg-ink/[0.06] text-ink-muted opacity-60 hover:opacity-100',
              ].join(' ')}
              aria-label={`Ir para slide ${i + 1}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CaptionSection({
  post,
  onUpdate,
}: {
  post: ImagePost
  onUpdate: (updated: ImagePost) => void
}) {
  const [editMode, setEditMode] = useState(false)
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!post.caption) return null

  function openEdit() {
    setEditText(post.caption)
    setEditMode(true)
  }

  async function saveEdit() {
    setSaving(true)
    try {
      const updated = await api.patch<ImagePost>(`/image-posts/${post.id}`, { caption: editText })
      onUpdate(updated)
      setEditMode(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(post.caption)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Legenda do post</p>
      {editMode ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={7}
            className="w-full resize-none rounded-xl border border-ink/[0.1] bg-surface px-3.5 py-2.5 text-[14px] leading-relaxed text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveEdit}
              disabled={saving}
              className="rounded-lg bg-brand px-4 py-2 text-[14px] font-medium text-white disabled:opacity-60 hover:bg-brand/90"
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className="rounded-lg border border-ink/[0.1] px-4 py-2 text-[14px] font-medium text-ink-muted hover:text-ink"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-ink/[0.08] bg-surface px-4 py-3">
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink">{post.caption}</p>
        </div>
      )}
      {!editMode && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg border border-ink/[0.1] px-3.5 py-2 text-[13px] font-medium text-ink-muted hover:border-brand/30 hover:text-brand"
          >
            {copied ? '✓ Copiado' : 'Copiar legenda'}
          </button>
          <button
            type="button"
            onClick={openEdit}
            className="rounded-lg border border-ink/[0.1] px-3.5 py-2 text-[13px] font-medium text-ink-muted hover:border-brand/30 hover:text-brand"
          >
            Editar
          </button>
        </div>
      )}
    </div>
  )
}

function ImagePostDrawer({
  post,
  onClose,
  onUpdate,
  onDelete,
}: {
  post: ImagePost
  onClose: () => void
  onUpdate: (updated: ImagePost) => void
  onDelete: (id: string) => void
}) {
  const [statusSaving, setStatusSaving] = useState(false)
  const [modeSaving, setModeSaving] = useState(false)
  const [fontSizeSaving, setFontSizeSaving] = useState(false)
  const [localFontSize, setLocalFontSize] = useState(post.bodyFontSize ?? 42)
  const [localOverlayFont, setLocalOverlayFont] = useState(post.overlayFont ?? 'montserrat')
  const [localBandStyle, setLocalBandStyle] = useState<'gradient' | 'solid'>(post.bandStyle ?? 'gradient')
  const [localBandColor, setLocalBandColor] = useState(post.bandColor ?? 'rgba(0,0,0,0.72)')
  const [localBandTextColor, setLocalBandTextColor] = useState(post.bandTextColor ?? '#ffffff')
  const [localOverlayBodyColor, setLocalOverlayBodyColor] = useState(post.overlayBodyColor ?? '')
  const [localOverlayStrongColor, setLocalOverlayStrongColor] = useState(post.overlayStrongColor ?? '')
  const [finalizing, setFinalizing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setLocalFontSize(post.bodyFontSize ?? 42)
  }, [post.bodyFontSize])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleModeToggle() {
    const newMode: 'light' | 'dark' = post.mode === 'dark' ? 'light' : 'dark'
    setModeSaving(true)
    try {
      const updated = await api.patch<ImagePost>(`/image-posts/${post.id}`, { mode: newMode })
      onUpdate(updated)
    } finally {
      setModeSaving(false)
    }
  }

  async function handleFontSizeCommit(size: number) {
    setFontSizeSaving(true)
    try {
      const updated = await api.patch<ImagePost>(`/image-posts/${post.id}`, { bodyFontSize: size })
      onUpdate(updated)
    } finally {
      setFontSizeSaving(false)
    }
  }

  async function handleStatusChange(status: ImagePost['status']) {
    setStatusSaving(true)
    try {
      const updated = await api.patch<ImagePost>(`/image-posts/${post.id}`, { status })
      onUpdate(updated)
    } finally {
      setStatusSaving(false)
    }
  }

  async function handleFinalize() {
    setFinalizing(true)
    try {
      const payload = {
        overlayFont: localOverlayFont,
        bandStyle: localBandStyle,
        bandColor: localBandColor,
        bandTextColor: localBandTextColor,
        ...(localOverlayBodyColor ? { overlayBodyColor: localOverlayBodyColor } : {}),
        ...(localOverlayStrongColor ? { overlayStrongColor: localOverlayStrongColor } : {}),
      }
      const updated =
        post.overlayPhase === 'final'
          ? await api.patch<ImagePost>(`/image-posts/${post.id}`, payload)
          : await api.post<ImagePost>(`/image-posts/${post.id}/finalize-overlay`, payload)
      onUpdate(updated)
    } finally {
      setFinalizing(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Remover este image post?')) return
    setDeleting(true)
    try {
      await api.delete(`/image-posts/${post.id}`)
      onDelete(post.id)
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-start">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-xl flex-col overflow-y-auto bg-card shadow-2xl sm:h-screen">
        <div className="flex items-center justify-between border-b border-ink/[0.06] px-5 py-4">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-muted">
            Image Post
          </p>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-ink/[0.06]">
            <CloseIcon />
          </button>
        </div>

        <div className="flex flex-col gap-6 p-5">
          <div className="flex items-center gap-3">
            {post.profileImageUrl ? (
              <img
                src={post.profileImageUrl}
                alt={post.profileName}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-[14px] font-bold text-brand">
                {post.profileName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-ink">{post.profileName}</p>
              <p className="text-[13px] text-ink-muted">@{post.profileHandle}</p>
            </div>
            <div className="ml-auto shrink-0">
              <StatusBadge status={post.status} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleModeToggle}
              disabled={modeSaving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink/[0.1] px-3 py-1.5 text-[13px] font-medium text-ink-muted disabled:opacity-60 hover:border-brand/30 hover:text-brand"
            >
              {modeSaving ? '…' : post.mode === 'dark' ? '🌑 Escuro' : '☀️ Claro'}
            </button>
            <span className="inline-flex rounded-full bg-ink/[0.07] px-2.5 py-0.5 text-[12px] font-medium text-ink-muted">
              {post.layout === 'carousel' ? 'Carrossel' : post.layout === 'panoramic' ? 'Panorâmico' : 'Estático'}
            </span>
            <span className="text-[12px] text-ink-subtle">{formatDate(post.createdAt)}</span>
            <span className="text-[12px] text-ink-subtle">{post.slides.length} slide{post.slides.length !== 1 ? 's' : ''}</span>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                Tamanho do texto
              </p>
              <span className="text-[12px] tabular-nums text-ink-muted">
                {fontSizeSaving ? '…' : `${localFontSize}px`}
              </span>
            </div>
            <input
              type="range"
              min={24}
              max={72}
              value={localFontSize}
              onChange={(e) => setLocalFontSize(Number(e.target.value))}
              onMouseUp={(e) => handleFontSizeCommit(Number((e.target as HTMLInputElement).value))}
              onTouchEnd={() => handleFontSizeCommit(localFontSize)}
              disabled={fontSizeSaving}
              className="w-full accent-brand disabled:opacity-60"
            />
            <div className="mt-0.5 flex justify-between text-[11px] text-ink-subtle">
              <span>24</span>
              <span>72</span>
            </div>
          </div>

          <SlideViewer post={post} onUpdate={onUpdate} />

          {(() => {
            const isFinal = post.overlayPhase === 'final'
            return (
            <div className={[
              'flex flex-col gap-4 rounded-2xl border p-4',
              isFinal
                ? 'border-ink/[0.08] bg-surface'
                : 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20',
            ].join(' ')}>
              <div>
                <p className={[
                  'text-[12px] font-semibold uppercase tracking-wide',
                  isFinal ? 'text-ink-muted' : 'text-amber-700 dark:text-amber-400',
                ].join(' ')}>
                  {isFinal ? 'Band / fonte' : 'Preview — configure o band de texto'}
                </p>
                <p className={[
                  'mt-1 text-[12px]',
                  isFinal ? 'text-ink-subtle' : 'text-amber-700/80 dark:text-amber-400/80',
                ].join(' ')}>
                  {isFinal
                    ? 'Alterações aplicadas imediatamente via PATCH.'
                    : 'Escolha fonte, estilo e cores do band antes de finalizar.'}
                </p>
              </div>

              <div>
                <p className="mb-1.5 text-[12px] font-medium text-ink-muted">Tipografia</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {OVERLAY_FONTS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setLocalOverlayFont(f.value)}
                      className={[
                        'rounded-lg border px-3 py-1.5 text-[12px] font-medium transition',
                        localOverlayFont === f.value
                          ? 'border-brand/30 bg-brand/10 text-brand'
                          : 'border-ink/[0.1] text-ink-muted hover:border-brand/20 hover:text-ink',
                      ].join(' ')}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-[12px] font-medium text-ink-muted">Estilo do band</p>
                <div className="flex gap-2">
                  {(['gradient', 'solid'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setLocalBandStyle(s)}
                      className={[
                        'rounded-lg border px-3 py-1.5 text-[12px] font-medium transition',
                        localBandStyle === s
                          ? 'border-brand/30 bg-brand/10 text-brand'
                          : 'border-ink/[0.1] text-ink-muted hover:border-brand/20 hover:text-ink',
                      ].join(' ')}
                    >
                      {s === 'gradient' ? 'Gradiente' : 'Sólido'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-ink-muted">Cor do band</label>
                  <input
                    type="text"
                    value={localBandColor}
                    onChange={(e) => setLocalBandColor(e.target.value)}
                    placeholder="rgba(0,0,0,0.72)"
                    className="mt-1 w-full rounded-lg border border-ink/[0.1] bg-surface px-2.5 py-1.5 font-mono text-[12px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-ink-muted">Texto do band</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={localBandTextColor}
                      onChange={(e) => setLocalBandTextColor(e.target.value)}
                      className="h-8 w-8 shrink-0 cursor-pointer rounded-lg border border-ink/[0.1] bg-surface p-0.5"
                    />
                    <input
                      type="text"
                      value={localBandTextColor}
                      onChange={(e) => setLocalBandTextColor(e.target.value)}
                      className="w-full rounded-lg border border-ink/[0.1] bg-surface px-2.5 py-1.5 font-mono text-[12px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-ink-muted">Cor do texto (opcional)</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={localOverlayBodyColor || '#ffffff'}
                      onChange={(e) => setLocalOverlayBodyColor(e.target.value)}
                      className="h-8 w-8 shrink-0 cursor-pointer rounded-lg border border-ink/[0.1] bg-surface p-0.5"
                    />
                    <input
                      type="text"
                      value={localOverlayBodyColor}
                      onChange={(e) => setLocalOverlayBodyColor(e.target.value)}
                      placeholder="automático"
                      className="w-full rounded-lg border border-ink/[0.1] bg-surface px-2.5 py-1.5 font-mono text-[12px] text-ink placeholder:text-ink-subtle outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-ink-muted">Destaque / borda (opcional)</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={localOverlayStrongColor || '#f97316'}
                      onChange={(e) => setLocalOverlayStrongColor(e.target.value)}
                      className="h-8 w-8 shrink-0 cursor-pointer rounded-lg border border-ink/[0.1] bg-surface p-0.5"
                    />
                    <input
                      type="text"
                      value={localOverlayStrongColor}
                      onChange={(e) => setLocalOverlayStrongColor(e.target.value)}
                      placeholder="automático"
                      className="w-full rounded-lg border border-ink/[0.1] bg-surface px-2.5 py-1.5 font-mono text-[12px] text-ink placeholder:text-ink-subtle outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFinalize}
                disabled={finalizing}
                className="rounded-xl bg-brand px-5 py-2.5 text-[14px] font-semibold text-white disabled:opacity-60 hover:bg-brand/90"
              >
                {finalizing
                  ? 'Aplicando…'
                  : isFinal
                    ? 'Aplicar alterações'
                    : 'Finalizar — aplicar band com texto'}
              </button>
            </div>
            )
          })()}

          <CaptionSection post={post} onUpdate={onUpdate} />

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Status</p>
            <div className="flex gap-1.5">
              {(['Rascunho', 'Aprovado', 'Publicado'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleStatusChange(s)}
                  disabled={post.status === s || statusSaving}
                  className={[
                    'rounded-lg border px-3.5 py-1.5 text-[13px] font-medium transition',
                    post.status === s
                      ? 'border-brand/30 bg-brand/10 text-brand'
                      : 'border-ink/[0.1] text-ink-muted hover:border-brand/30 hover:text-brand',
                  ].join(' ')}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="self-start rounded-lg border border-red-200 px-3.5 py-1.5 text-[13px] font-medium text-red-600 disabled:opacity-60 hover:border-red-400 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            {deleting ? 'Removendo…' : 'Remover post'}
          </button>
        </div>
      </aside>
    </div>
  )
}

function ImageSlideIframe({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setScale(el.offsetWidth / 1080)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: '1 / 1' }}
    >
      <iframe
        key={html.slice(0, 60)}
        srcDoc={html}
        style={{
          position: 'absolute',
          width: 1080,
          height: 1080,
          border: 'none',
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
        }}
        sandbox="allow-same-origin"
        title="Slide preview"
      />
    </div>
  )
}

function ImagePostCard({ post, onClick }: { post: ImagePost; onClick: () => void }) {
  const firstSlide = post.slides[0]

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-2xl border border-ink/[0.06] bg-card text-left shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition hover:border-brand/30 hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)]"
    >
      <div className="relative w-full">
        {firstSlide ? (
          <ImageSlideIframe html={firstSlide.overlayHtml} />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center bg-ink/[0.06]" />
        )}
        {post.slides.length > 1 && (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 backdrop-blur-sm">
            <span className="text-[11px] font-semibold text-white">{post.slides.length}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex rounded-full bg-ink/[0.07] px-2 py-0.5 text-[11px] font-medium text-ink-muted">
            {post.mode === 'dark' ? 'Escuro' : 'Claro'}
          </span>
          <span className="inline-flex rounded-full bg-ink/[0.07] px-2 py-0.5 text-[11px] font-medium text-ink-muted">
            {post.layout === 'carousel' ? 'Carrossel' : post.layout === 'panoramic' ? 'Panorâmico' : 'Estático'}
          </span>
          <StatusBadge status={post.status} />
        </div>
        <p className="text-[13px] font-semibold text-ink group-hover:text-brand">
          @{post.profileHandle}
        </p>
        <p className="text-[11px] text-ink-subtle">{formatDate(post.createdAt)}</p>
      </div>
    </button>
  )
}

/**
 * Página de Image Posts: posts com imagem de fundo e texto overlay, estático ou carrossel.
 */
export function ImagePostsPage() {
  const { instagramAccounts } = useAppWorkspace()
  const [accountFilter, setAccountFilter] = useState('')
  const [posts, setPosts] = useState<ImagePost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPost, setSelectedPost] = useState<ImagePost | null>(null)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [modalKey, setModalKey] = useState(0)

  useEffect(() => {
    void fetchPosts()
  }, [accountFilter])

  async function fetchPosts() {
    setLoading(true)
    setError(null)
    try {
      const p = new URLSearchParams()
      if (accountFilter) p.set('accountId', accountFilter)
      const query = p.toString() ? `?${p}` : ''
      const res = await api.get<ImagePost[]>(`/image-posts${query}`)
      setPosts(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar.')
    } finally {
      setLoading(false)
    }
  }

  function handleCreate(post: ImagePost) {
    setPosts((prev) => [post, ...prev])
  }

  function handleUpdate(updated: ImagePost) {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    setSelectedPost(updated)
  }

  function handleDelete(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }

  const filtered = statusFilter === 'Todos' ? posts : posts.filter((p) => p.status === statusFilter)

  return (
    <>
      {selectedPost && (
        <ImagePostDrawer
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}

      {showGenerateModal && (
        <ImagePostGenerateModal
          key={modalKey}
          onClose={() => setShowGenerateModal(false)}
          onCreate={handleCreate}
        />
      )}

      <div className="space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Instagram</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">Image Posts</h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
              Posts com imagem de fundo e texto overlay gerados com IA. Estático ou carrossel.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setModalKey((k) => k + 1); setShowGenerateModal(true) }}
            className="shrink-0 rounded-xl bg-brand px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-brand/90"
          >
            Gerar novo
          </button>
        </header>

        <div className="flex flex-wrap items-center gap-4">
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="rounded-xl border border-ink/[0.1] bg-surface px-4 py-2.5 text-[14px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          >
            <option value="">Todas as contas</option>
            {instagramAccounts.map((a) => (
              <option key={a.id} value={a.handle}>{a.displayName} (@{a.handle})</option>
            ))}
          </select>

          <div className="flex items-center gap-1 rounded-xl border border-ink/[0.08] bg-surface p-1">
            {['Todos', 'Rascunho', 'Aprovado', 'Publicado'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={[
                  'rounded-lg px-3.5 py-1.5 text-[14px] font-medium transition',
                  statusFilter === s ? 'bg-card text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
                ].join(' ')}
              >
                {s}
              </button>
            ))}
          </div>

          {!loading && (
            <p className="ml-auto text-[13px] text-ink-muted">
              {filtered.length} post{filtered.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((k) => (
              <div key={k} className="h-72 animate-pulse rounded-2xl bg-ink/[0.06]" />
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
            <p className="text-[15px] font-medium text-ink">Nenhum post encontrado</p>
            <p className="mt-1 text-[13px] text-ink-muted">
              {statusFilter === 'Todos'
                ? 'Clique em "Gerar novo" para criar o primeiro.'
                : `Sem posts com status "${statusFilter}".`}
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((post) => (
              <ImagePostCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
