import { useEffect, useRef, useState } from 'react'
import { api, getAccessToken } from '../lib/api'
import { useAppWorkspace } from '../context/AppWorkspaceContext'

type StoryReply = {
  id: string
  mode: 'light' | 'dark'
  font: string
  stickerFontSize: number
  answerFontSize: number
  textColor: string
  highlightColor: string
  backgroundUrl?: string | null
  backgroundOverlayColor?: string
  imageSearchQuery?: string | null
  question: string
  answer: string
  questionHtml: string
  answerHtml: string
  caption: string
  profileName: string
  profileHandle: string
  profileImageUrl: string
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

type AltBgResponse = { urls: string[]; query: string; page: number }

type FontOption = { value: string; label: string; vibe: string }

const FONTS: FontOption[] = [
  { value: 'classic',    label: 'Inter',             vibe: 'padrão Stories' },
  { value: 'modern',     label: 'Playfair Display',  vibe: 'elegante/serif' },
  { value: 'strong',     label: 'Oswald',            vibe: 'bold condensado' },
  { value: 'typewriter', label: 'Courier Prime',     vibe: 'máquina de escrever' },
  { value: 'editor',     label: 'DM Serif Display',  vibe: 'editorial' },
  { value: 'poster',     label: 'Anton',             vibe: 'cartaz/display' },
  { value: 'literature', label: 'Lora',              vibe: 'literário/serif' },
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

const SOURCE_TABS: { id: SourceMode; label: string }[] = [
  { id: 'texto', label: 'Texto livre' },
  { id: 'direto', label: 'Q&A direto' },
  { id: 'post', label: 'Post IG' },
  { id: 'news', label: 'Notícia' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'story', label: 'Story' },
]

function StoryReplyGenerateModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (reply: StoryReply) => void
}) {
  const { instagramAccounts, products, workspaceId } = useAppWorkspace()

  const [accountId, setAccountId] = useState(instagramAccounts[0]?.handle ?? '')
  const [productId, setProductId] = useState(products[0]?.id ?? '')
  const [sourceMode, setSourceMode] = useState<SourceMode>('texto')
  const [mode, setMode] = useState<'dark' | 'light'>('dark')
  const [font, setFont] = useState('classic')
  const [stickerFontSize, setStickerFontSize] = useState(42)
  const [answerFontSize, setAnswerFontSize] = useState(44)
  const [textColor, setTextColor] = useState('#ffffff')
  const [highlightColor, setHighlightColor] = useState('#FF6B2B')
  const [tone, setTone] = useState('')
  const [backgroundUrl, setBackgroundUrl] = useState('')
  const [backgroundOverlayColor, setBackgroundOverlayColor] = useState('')

  const [sourceTranscript, setSourceTranscript] = useState('')
  const [sourceCaption, setSourceCaption] = useState('')
  const [directQuestion, setDirectQuestion] = useState('')
  const [directAnswer, setDirectAnswer] = useState('')

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
    setError(null)
    setGenerating(true)
    try {
      const body: Record<string, unknown> = {
        accountId,
        productId,
        mode,
        font,
        stickerFontSize,
        answerFontSize,
        textColor,
        highlightColor,
        ...(tone ? { tone } : {}),
        ...(backgroundUrl ? { backgroundUrl } : {}),
        ...(backgroundOverlayColor ? { backgroundOverlayColor } : {}),
      }
      if (sourceMode === 'post' && selectedPostId) body.sourcePostId = selectedPostId
      else if (sourceMode === 'news' && selectedNewsId) body.sourceNewsId = selectedNewsId
      else if (sourceMode === 'tiktok' && selectedTiktokPostId) body.sourceTikTokPostId = selectedTiktokPostId
      else if (sourceMode === 'story' && selectedStoryId) body.sourceInstagramStoryId = selectedStoryId
      else if (sourceMode === 'texto') {
        if (sourceTranscript) body.sourceTranscript = sourceTranscript
        if (sourceCaption) body.sourceCaption = sourceCaption
      } else if (sourceMode === 'direto') {
        body.question = directQuestion
        body.answer = directAnswer
      }
      const reply = await api.post<StoryReply>('/story-replies/generate', body)
      onCreate(reply)
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
            Nova Caixinha de Perguntas
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

          <div>
            <label className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">Tipografia</label>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {FONTS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFont(f.value)}
                  className={[
                    'flex flex-col rounded-lg border px-3 py-2 text-left transition',
                    font === f.value
                      ? 'border-brand/30 bg-brand/10'
                      : 'border-ink/[0.1] hover:border-brand/20',
                  ].join(' ')}
                >
                  <span className={['text-[13px] font-medium', font === f.value ? 'text-brand' : 'text-ink'].join(' ')}>
                    {f.label}
                  </span>
                  <span className="text-[11px] text-ink-muted">{f.vibe}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">Cor do texto</label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-ink/[0.1] bg-surface p-0.5"
                />
                <input
                  type="text"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-full rounded-xl border border-ink/[0.1] bg-surface px-3 py-2 font-mono text-[13px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>
            <div>
              <label className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">Destaque (~til~)</label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="color"
                  value={highlightColor}
                  onChange={(e) => setHighlightColor(e.target.value)}
                  className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-ink/[0.1] bg-surface p-0.5"
                />
                <input
                  type="text"
                  value={highlightColor}
                  onChange={(e) => setHighlightColor(e.target.value)}
                  className="w-full rounded-xl border border-ink/[0.1] bg-surface px-3 py-2 font-mono text-[13px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
                Caixinha ({stickerFontSize}px)
              </label>
              <input
                type="range"
                min={24}
                max={72}
                value={stickerFontSize}
                onChange={(e) => setStickerFontSize(Number(e.target.value))}
                className="mt-2 w-full accent-brand"
              />
              <div className="mt-0.5 flex justify-between text-[11px] text-ink-subtle">
                <span>24</span>
                <span>72</span>
              </div>
            </div>
            <div>
              <label className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
                Resposta ({answerFontSize}px)
              </label>
              <input
                type="range"
                min={24}
                max={72}
                value={answerFontSize}
                onChange={(e) => setAnswerFontSize(Number(e.target.value))}
                className="mt-2 w-full accent-brand"
              />
              <div className="mt-0.5 flex justify-between text-[11px] text-ink-subtle">
                <span>24</span>
                <span>72</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">Tom (opcional)</label>
            <input
              type="text"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              placeholder="ex: didático, direto, descontraído"
              className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[14px] text-ink placeholder:text-ink-subtle outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div>
            <label className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
              Imagem de fundo
              <span className="ml-2 rounded-full bg-ink/[0.06] px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-ink-muted">
                opcional — Unsplash busca automaticamente
              </span>
            </label>
            <input
              type="text"
              value={backgroundUrl}
              onChange={(e) => setBackgroundUrl(e.target.value)}
              placeholder="https://images.unsplash.com/photo-xxx"
              className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[13px] font-mono text-ink placeholder:text-ink-subtle outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            <input
              type="text"
              value={backgroundOverlayColor}
              onChange={(e) => setBackgroundOverlayColor(e.target.value)}
              placeholder="Overlay: rgba(0,0,0,0.65)"
              className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[13px] font-mono text-ink placeholder:text-ink-subtle outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
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
                placeholder="Cole o conteúdo aqui para gerar a caixinha…"
                className="w-full resize-none rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[14px] text-ink placeholder:text-ink-subtle outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
          )}

          {sourceMode === 'direto' && (
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={directQuestion}
                onChange={(e) => setDirectQuestion(e.target.value)}
                placeholder="Qual a dose de ataque de amiodarona?"
                className="w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[14px] text-ink placeholder:text-ink-subtle outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              <textarea
                value={directAnswer}
                onChange={(e) => setDirectAnswer(e.target.value)}
                rows={4}
                placeholder="**150mg** IV em 10 min, seguido de manutenção…"
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
            {generating ? 'Gerando…' : 'Gerar caixinha'}
          </button>
        </div>
      </aside>
    </div>
  )
}

function StoryIframe({
  src,
  html,
  className,
}: {
  src?: string
  html?: string
  className?: string
}) {
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
      className={`relative overflow-hidden ${className ?? ''}`}
      style={{ aspectRatio: '9 / 16' }}
    >
      <iframe
        key={src ?? html?.slice(0, 60)}
        {...(src ? { src } : { srcDoc: html ?? '' })}
        style={{
          position: 'absolute',
          width: 1080,
          height: 1920,
          border: 'none',
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
        }}
        sandbox="allow-same-origin"
        title="Story preview"
      />
    </div>
  )
}

function StoryReplyDrawer({
  storyReply,
  onClose,
  onUpdate,
  onDelete,
}: {
  storyReply: StoryReply
  onClose: () => void
  onUpdate: (updated: StoryReply) => void
  onDelete: (id: string) => void
}) {
  const [editingField, setEditingField] = useState<'question' | 'answer' | 'caption' | null>(null)
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [modeSaving, setModeSaving] = useState(false)
  const [fontSaving, setFontSaving] = useState(false)
  const [localStickerFontSize, setLocalStickerFontSize] = useState(storyReply.stickerFontSize ?? 42)
  const [localAnswerFontSize, setLocalAnswerFontSize] = useState(storyReply.answerFontSize ?? 44)
  const [fontSizeSaving, setFontSizeSaving] = useState(false)
  const [localTextColor, setLocalTextColor] = useState(storyReply.textColor ?? '#ffffff')
  const [localHighlightColor, setLocalHighlightColor] = useState(storyReply.highlightColor ?? '#FF6B2B')
  const [colorSaving, setColorSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [previewVersion, setPreviewVersion] = useState(0)
  const [htmlEditMode, setHtmlEditMode] = useState(false)
  const [htmlEditText, setHtmlEditText] = useState('')
  const [htmlSaving, setHtmlSaving] = useState(false)
  const [altBgLoading, setAltBgLoading] = useState(false)
  const [altBgData, setAltBgData] = useState<AltBgResponse | null>(null)
  const [bgSaving, setBgSaving] = useState(false)
  const [localBgOverlayColor, setLocalBgOverlayColor] = useState(storyReply.backgroundOverlayColor ?? '')
  const uploadInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLocalStickerFontSize(storyReply.stickerFontSize ?? 42)
    setLocalAnswerFontSize(storyReply.answerFontSize ?? 44)
  }, [storyReply.stickerFontSize, storyReply.answerFontSize])

  useEffect(() => {
    setLocalBgOverlayColor(storyReply.backgroundOverlayColor ?? '')
  }, [storyReply.backgroundOverlayColor])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const previewSrc = `${api.getBaseUrl()}/story-replies/${storyReply.id}/preview/answer?v=${previewVersion}`

  function openEdit(field: 'question' | 'answer' | 'caption') {
    setHtmlEditMode(false)
    setEditText(storyReply[field])
    setEditingField(field)
  }

  function openHtmlEdit() {
    setEditingField(null)
    setHtmlEditText(storyReply.answerHtml)
    setHtmlEditMode(true)
  }

  function cancelHtmlEdit() {
    setHtmlEditMode(false)
    setHtmlEditText('')
  }

  async function saveHtmlEdit() {
    setHtmlSaving(true)
    try {
      const updated = await api.patch<StoryReply>(`/story-replies/${storyReply.id}/html`, {
        answerHtml: htmlEditText,
      })
      onUpdate(updated)
      setPreviewVersion((v) => v + 1)
      setHtmlEditMode(false)
    } finally {
      setHtmlSaving(false)
    }
  }

  function cancelEdit() {
    setEditingField(null)
    setEditText('')
  }

  async function fetchAlternateBgs(page = 1) {
    setAltBgLoading(true)
    try {
      const res = await api.post<AltBgResponse>(
        `/story-replies/${storyReply.id}/alternate-backgrounds`,
        { page },
      )
      setAltBgData(res)
    } catch { } finally {
      setAltBgLoading(false)
    }
  }

  async function pickBackground(url: string) {
    setBgSaving(true)
    try {
      const updated = await api.patch<StoryReply>(`/story-replies/${storyReply.id}`, { backgroundUrl: url })
      onUpdate(updated)
      setAltBgData(null)
      setPreviewVersion((v) => v + 1)
    } finally {
      setBgSaving(false)
    }
  }

  async function handleUploadBackground(file: File) {
    setBgSaving(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const token = getAccessToken()
      const res = await fetch(
        `${api.getBaseUrl()}/story-replies/${storyReply.id}/upload-background`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        },
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const updated = (await res.json()) as StoryReply
      onUpdate(updated)
      setPreviewVersion((v) => v + 1)
    } finally {
      setBgSaving(false)
    }
  }

  async function handleBgOverlayColorCommit() {
    setBgSaving(true)
    try {
      const updated = await api.patch<StoryReply>(`/story-replies/${storyReply.id}`, {
        backgroundOverlayColor: localBgOverlayColor,
      })
      onUpdate(updated)
      setPreviewVersion((v) => v + 1)
    } finally {
      setBgSaving(false)
    }
  }

  async function saveEdit() {
    if (!editingField) return
    setSaving(true)
    try {
      const updated = await api.patch<StoryReply>(`/story-replies/${storyReply.id}`, {
        [editingField]: editText,
      })
      onUpdate(updated)
      if (editingField !== 'caption') setPreviewVersion((v) => v + 1)
      setEditingField(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleModeToggle() {
    const newMode: 'light' | 'dark' = storyReply.mode === 'dark' ? 'light' : 'dark'
    setModeSaving(true)
    try {
      const updated = await api.patch<StoryReply>(`/story-replies/${storyReply.id}`, { mode: newMode })
      onUpdate(updated)
      setPreviewVersion((v) => v + 1)
    } finally {
      setModeSaving(false)
    }
  }

  async function handleFontChange(newFont: string) {
    setFontSaving(true)
    try {
      const updated = await api.patch<StoryReply>(`/story-replies/${storyReply.id}`, { font: newFont })
      onUpdate(updated)
      setPreviewVersion((v) => v + 1)
    } finally {
      setFontSaving(false)
    }
  }

  async function handleColorsCommit() {
    setColorSaving(true)
    try {
      const updated = await api.patch<StoryReply>(`/story-replies/${storyReply.id}`, {
        textColor: localTextColor,
        highlightColor: localHighlightColor,
      })
      onUpdate(updated)
      setPreviewVersion((v) => v + 1)
    } finally {
      setColorSaving(false)
    }
  }

  async function handleStickerFontSizeCommit(size: number) {
    setFontSizeSaving(true)
    try {
      const updated = await api.patch<StoryReply>(`/story-replies/${storyReply.id}`, { stickerFontSize: size })
      onUpdate(updated)
      setPreviewVersion((v) => v + 1)
    } finally {
      setFontSizeSaving(false)
    }
  }

  async function handleAnswerFontSizeCommit(size: number) {
    setFontSizeSaving(true)
    try {
      const updated = await api.patch<StoryReply>(`/story-replies/${storyReply.id}`, { answerFontSize: size })
      onUpdate(updated)
      setPreviewVersion((v) => v + 1)
    } finally {
      setFontSizeSaving(false)
    }
  }

  async function handleStatusChange(status: StoryReply['status']) {
    setStatusSaving(true)
    try {
      const updated = await api.patch<StoryReply>(`/story-replies/${storyReply.id}`, { status })
      onUpdate(updated)
    } finally {
      setStatusSaving(false)
    }
  }

  async function handleDownload(type: 'question' | 'answer') {
    setDownloading(true)
    try {
      const token = getAccessToken()
      const res = await fetch(`${api.getBaseUrl()}/story-replies/${storyReply.id}/export/${type}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `story-${type}-${storyReply.id}.png`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  async function handleCopyCaption() {
    await navigator.clipboard.writeText(storyReply.caption)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDelete() {
    if (!confirm('Remover esta caixinha?')) return
    setDeleting(true)
    try {
      await api.delete(`/story-replies/${storyReply.id}`)
      onDelete(storyReply.id)
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
            Story Reply
          </p>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-ink/[0.06]">
            <CloseIcon />
          </button>
        </div>

        <div className="flex flex-col gap-6 p-5">
          <div className="flex items-center gap-3">
            {storyReply.profileImageUrl ? (
              <img
                src={storyReply.profileImageUrl}
                alt={storyReply.profileName}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-[14px] font-bold text-brand">
                {storyReply.profileName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-ink">{storyReply.profileName}</p>
              <p className="text-[13px] text-ink-muted">@{storyReply.profileHandle}</p>
            </div>
            <div className="ml-auto shrink-0">
              <StatusBadge status={storyReply.status} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleModeToggle}
              disabled={modeSaving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink/[0.1] px-3 py-1.5 text-[13px] font-medium text-ink-muted disabled:opacity-60 hover:border-brand/30 hover:text-brand"
            >
              {modeSaving ? '…' : storyReply.mode === 'dark' ? '🌑 Escuro' : '☀️ Claro'}
            </button>
            <span className="text-[12px] text-ink-subtle">{formatDate(storyReply.createdAt)}</span>
          </div>

          <div className="rounded-2xl border border-ink/[0.06] bg-surface p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Estilo</p>

            <div className="mb-3 grid grid-cols-2 gap-1.5">
              {FONTS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => handleFontChange(f.value)}
                  disabled={fontSaving}
                  className={[
                    'flex flex-col rounded-lg border px-3 py-2 text-left transition disabled:opacity-60',
                    storyReply.font === f.value
                      ? 'border-brand/30 bg-brand/10'
                      : 'border-ink/[0.1] hover:border-brand/20',
                  ].join(' ')}
                >
                  <span className={['text-[12px] font-medium', storyReply.font === f.value ? 'text-brand' : 'text-ink'].join(' ')}>
                    {f.label}
                  </span>
                  <span className="text-[11px] text-ink-muted">{f.vibe}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-ink-muted">Cor do texto</label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="color"
                    value={localTextColor}
                    onChange={(e) => setLocalTextColor(e.target.value)}
                    className="h-8 w-8 shrink-0 cursor-pointer rounded-lg border border-ink/[0.1] bg-surface p-0.5"
                  />
                  <input
                    type="text"
                    value={localTextColor}
                    onChange={(e) => setLocalTextColor(e.target.value)}
                    className="w-full rounded-lg border border-ink/[0.1] bg-card px-2.5 py-1.5 font-mono text-[12px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-ink-muted">Destaque (~til~)</label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="color"
                    value={localHighlightColor}
                    onChange={(e) => setLocalHighlightColor(e.target.value)}
                    className="h-8 w-8 shrink-0 cursor-pointer rounded-lg border border-ink/[0.1] bg-surface p-0.5"
                  />
                  <input
                    type="text"
                    value={localHighlightColor}
                    onChange={(e) => setLocalHighlightColor(e.target.value)}
                    className="w-full rounded-lg border border-ink/[0.1] bg-card px-2.5 py-1.5 font-mono text-[12px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>
            </div>

            {(localTextColor !== storyReply.textColor || localHighlightColor !== storyReply.highlightColor) && (
              <button
                type="button"
                onClick={handleColorsCommit}
                disabled={colorSaving}
                className="mt-3 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-white disabled:opacity-60 hover:bg-brand/90"
              >
                {colorSaving ? 'Salvando…' : 'Aplicar cores'}
              </button>
            )}

            <div className="mt-3 grid grid-cols-2 gap-4 border-t border-ink/[0.06] pt-3">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-ink-muted">Caixinha</label>
                  <span className="text-[12px] tabular-nums text-ink-muted">
                    {fontSizeSaving ? '…' : `${localStickerFontSize}px`}
                  </span>
                </div>
                <input
                  type="range"
                  min={24}
                  max={72}
                  value={localStickerFontSize}
                  onChange={(e) => setLocalStickerFontSize(Number(e.target.value))}
                  onMouseUp={(e) => handleStickerFontSizeCommit(Number((e.target as HTMLInputElement).value))}
                  onTouchEnd={() => handleStickerFontSizeCommit(localStickerFontSize)}
                  disabled={fontSizeSaving}
                  className="mt-2 w-full accent-brand disabled:opacity-60"
                />
                <div className="mt-0.5 flex justify-between text-[11px] text-ink-subtle">
                  <span>24</span>
                  <span>72</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-ink-muted">Resposta</label>
                  <span className="text-[12px] tabular-nums text-ink-muted">
                    {fontSizeSaving ? '…' : `${localAnswerFontSize}px`}
                  </span>
                </div>
                <input
                  type="range"
                  min={24}
                  max={72}
                  value={localAnswerFontSize}
                  onChange={(e) => setLocalAnswerFontSize(Number(e.target.value))}
                  onMouseUp={(e) => handleAnswerFontSizeCommit(Number((e.target as HTMLInputElement).value))}
                  onTouchEnd={() => handleAnswerFontSizeCommit(localAnswerFontSize)}
                  disabled={fontSizeSaving}
                  className="mt-2 w-full accent-brand disabled:opacity-60"
                />
                <div className="mt-0.5 flex justify-between text-[11px] text-ink-subtle">
                  <span>24</span>
                  <span>72</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-ink/[0.06] bg-surface p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Imagem de fundo</p>

            {storyReply.backgroundUrl && (
              <img
                src={storyReply.backgroundUrl}
                alt=""
                className="mb-3 h-28 w-full rounded-xl object-cover"
              />
            )}

            <div className="mb-3">
              <label className="text-[11px] font-medium text-ink-muted">Overlay (transparência)</label>
              <input
                type="text"
                value={localBgOverlayColor}
                onChange={(e) => setLocalBgOverlayColor(e.target.value)}
                placeholder="rgba(0,0,0,0.65)"
                className="mt-1 w-full rounded-lg border border-ink/[0.1] bg-card px-2.5 py-1.5 font-mono text-[12px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              {localBgOverlayColor !== (storyReply.backgroundOverlayColor ?? '') && (
                <button
                  type="button"
                  onClick={handleBgOverlayColorCommit}
                  disabled={bgSaving}
                  className="mt-1.5 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-white disabled:opacity-60 hover:bg-brand/90"
                >
                  {bgSaving ? 'Salvando…' : 'Aplicar overlay'}
                </button>
              )}
            </div>

            {altBgData ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] text-ink-muted">
                    Busca: <span className="font-medium text-ink">"{altBgData.query}"</span>
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
                      onClick={() => void pickBackground(url)}
                      disabled={bgSaving}
                      className="overflow-hidden rounded-lg border-2 border-transparent transition hover:border-brand disabled:opacity-50"
                      style={{ aspectRatio: '9 / 16' }}
                    >
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => void fetchAlternateBgs(altBgData.page + 1)}
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
                  onClick={() => void fetchAlternateBgs(1)}
                  disabled={altBgLoading}
                  className="rounded-lg border border-ink/[0.1] px-3.5 py-2 text-[13px] font-medium text-ink-muted disabled:opacity-60 hover:border-brand/30 hover:text-brand"
                >
                  {altBgLoading ? 'Buscando…' : '🔄 Outra imagem'}
                </button>
                <button
                  type="button"
                  onClick={() => uploadInputRef.current?.click()}
                  disabled={bgSaving}
                  className="rounded-lg border border-ink/[0.1] px-3.5 py-2 text-[13px] font-medium text-ink-muted disabled:opacity-60 hover:border-brand/30 hover:text-brand"
                >
                  {bgSaving ? 'Enviando…' : '↑ Upload'}
                </button>
              </div>
            )}
          </div>

          <StoryIframe src={previewSrc} className="w-full rounded-2xl border border-ink/[0.08] shadow-sm" />

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
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Pergunta</p>
                {editingField === 'question' ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-ink/[0.1] bg-surface px-3.5 py-2.5 text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
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
                        onClick={cancelEdit}
                        className="rounded-lg border border-ink/[0.1] px-4 py-2 text-[14px] font-medium text-ink-muted hover:text-ink"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-ink/[0.08] bg-surface px-4 py-3">
                      <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink">{storyReply.question}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEdit('question')}
                      className="self-start rounded-lg border border-ink/[0.1] px-3.5 py-2 text-[13px] font-medium text-ink-muted hover:border-brand/30 hover:text-brand"
                    >
                      Editar pergunta
                    </button>
                  </>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Resposta</p>
                {editingField === 'answer' ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-[12px] text-ink-muted">
                      Use <code className="rounded bg-ink/[0.06] px-1 font-mono">~palavra~</code> para destacar com a cor de destaque.
                    </p>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={4}
                      className="w-full resize-none rounded-xl border border-ink/[0.1] bg-surface px-3.5 py-2.5 text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
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
                        onClick={cancelEdit}
                        className="rounded-lg border border-ink/[0.1] px-4 py-2 text-[14px] font-medium text-ink-muted hover:text-ink"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-ink/[0.08] bg-surface px-4 py-3">
                      <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink">{storyReply.answer}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit('answer')}
                        className="rounded-lg border border-ink/[0.1] px-3.5 py-2 text-[13px] font-medium text-ink-muted hover:border-brand/30 hover:text-brand"
                      >
                        Editar resposta
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
                        onClick={() => handleDownload('answer')}
                        disabled={downloading}
                        className="rounded-lg border border-ink/[0.1] px-3.5 py-2 text-[13px] font-medium text-ink-muted disabled:opacity-60 hover:border-brand/30 hover:text-brand"
                      >
                        ↓ Baixar PNG
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {storyReply.caption && (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Legenda</p>
              {editingField === 'caption' ? (
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
                      onClick={cancelEdit}
                      className="rounded-lg border border-ink/[0.1] px-4 py-2 text-[14px] font-medium text-ink-muted hover:text-ink"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-ink/[0.08] bg-surface px-4 py-3">
                    <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink">{storyReply.caption}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCopyCaption}
                      className="rounded-lg border border-ink/[0.1] px-3.5 py-2 text-[13px] font-medium text-ink-muted hover:border-brand/30 hover:text-brand"
                    >
                      {copied ? '✓ Copiado' : 'Copiar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit('caption')}
                      className="rounded-lg border border-ink/[0.1] px-3.5 py-2 text-[13px] font-medium text-ink-muted hover:border-brand/30 hover:text-brand"
                    >
                      Editar
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Status</p>
            <div className="flex gap-1.5">
              {(['Rascunho', 'Aprovado', 'Publicado'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleStatusChange(s)}
                  disabled={storyReply.status === s || statusSaving}
                  className={[
                    'rounded-lg border px-3.5 py-1.5 text-[13px] font-medium transition',
                    storyReply.status === s
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
            {deleting ? 'Removendo…' : 'Remover'}
          </button>
        </div>
      </aside>
    </div>
  )
}

function StoryReplyCard({ storyReply, onClick }: { storyReply: StoryReply; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-2xl border border-ink/[0.06] bg-card text-left shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition hover:border-brand/30 hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)]"
    >
      <StoryIframe html={storyReply.questionHtml} className="w-full pointer-events-none" />

      <div className="flex flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex rounded-full bg-ink/[0.07] px-2 py-0.5 text-[11px] font-medium text-ink-muted">
            {storyReply.mode === 'dark' ? 'Escuro' : 'Claro'}
          </span>
          <StatusBadge status={storyReply.status} />
        </div>
        <p className="text-[13px] font-semibold text-ink group-hover:text-brand">
          @{storyReply.profileHandle}
        </p>
        <p className="text-[11px] text-ink-subtle">{formatDate(storyReply.createdAt)}</p>
      </div>
    </button>
  )
}

/**
 * Página de Story Replies (Caixinha de Perguntas): lista, criação com IA, edição e download.
 */
export function StoryRepliesPage() {
  const { instagramAccounts } = useAppWorkspace()
  const [accountFilter, setAccountFilter] = useState('')
  const [replies, setReplies] = useState<StoryReply[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedReply, setSelectedReply] = useState<StoryReply | null>(null)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [modalKey, setModalKey] = useState(0)

  useEffect(() => {
    void fetchReplies()
  }, [accountFilter])

  async function fetchReplies() {
    setLoading(true)
    setError(null)
    try {
      const p = new URLSearchParams()
      if (accountFilter) p.set('accountId', accountFilter)
      const query = p.toString() ? `?${p}` : ''
      const res = await api.get<StoryReply[]>(`/story-replies${query}`)
      setReplies(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar.')
    } finally {
      setLoading(false)
    }
  }

  function handleCreate(reply: StoryReply) {
    setReplies((prev) => [reply, ...prev])
  }

  function handleUpdate(updated: StoryReply) {
    setReplies((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    setSelectedReply(updated)
  }

  function handleDelete(id: string) {
    setReplies((prev) => prev.filter((r) => r.id !== id))
  }

  const filtered = statusFilter === 'Todos' ? replies : replies.filter((r) => r.status === statusFilter)

  return (
    <>
      {selectedReply && (
        <StoryReplyDrawer
          storyReply={selectedReply}
          onClose={() => setSelectedReply(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}

      {showGenerateModal && (
        <StoryReplyGenerateModal
          key={modalKey}
          onClose={() => setShowGenerateModal(false)}
          onCreate={handleCreate}
        />
      )}

      <div className="space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Instagram</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">Story Replies</h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
              Caixinha de perguntas com pergunta + resposta gerados com IA, prontos para publicar como story.
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
              {filtered.length} caixinha{filtered.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((k) => (
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
            <p className="text-[15px] font-medium text-ink">Nenhuma caixinha encontrada</p>
            <p className="mt-1 text-[13px] text-ink-muted">
              {statusFilter === 'Todos'
                ? 'Clique em "Gerar novo" para criar a primeira.'
                : `Sem caixinhas com status "${statusFilter}".`}
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((reply) => (
              <StoryReplyCard key={reply.id} storyReply={reply} onClick={() => setSelectedReply(reply)} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
