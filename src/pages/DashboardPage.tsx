import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppWorkspace } from '../context/AppWorkspaceContext'
import { api } from '../lib/api'
import { GeneratePanel, type GenerateFeedPrefill } from '../components/GeneratePanel'
import { PaginationWithChannel } from '../components/PaginationWithChannel'
import { MediaPeekEyeButton, MediaPeekModal } from '../components/MediaPeek'
import type { MediaPeekModel } from '../lib/mediaPeek'
import { mediaPeekHasVisual } from '../lib/mediaPeek'

type Post = {
  id: string
  title: string
  postedAt: string
  format: string
  likes: number
  comments: number
  saves: number
  reach?: number
  impressions?: number
  thumbnailUrl?: string | null
  postUrl?: string | null
  carouselImages?: string[]
  videoUrl?: string | null
  transcript?: string | null
  instagramAccountId?: string
  accountId?: string
}

type AccountStats = { followers: number; totalPosts: number; recentPosts: Post[] }
type PostsResponse = { data: Post[]; total: number; page: number; limit: number }

type InstagramStory = {
  id: string
  storyId: string
  mediaType: 'image' | 'video'
  thumbnailUrl: string | null
  videoUrl: string | null
  transcript: string | null
  postedAt: string | null
  syncedAt: string
  expiresAt: string | null
  account: {
    id: string
    handle: string
    displayName: string
    profileUrl: string
    profilePicS3Url: string | null
    followers: number
    workspace: string
  } | null
}

type StoriesResponse = { data: InstagramStory[]; total: number; page: number; limit: number; pages: number }

type TikTokAccount = {
  id: string
  handle: string
  displayName: string
  profileUrl: string
  followers: number
  following: number
  likesCount: number
  isVerified: boolean
  profilePicUrl: string | null
  lastSyncAt: string | null
  workspace?: string
}

type TikTokFeedPost = {
  id: string
  title: string
  postUrl: string
  likes: number
  comments: number
  shares: number
  views: number
  hashtags: string[]
  videoUrl: string | null
  thumbnailUrl: string | null
  transcript: string | null
  postedAt: string | null
  account: { id: string; displayName: string; followers: number; profileUrl: string } | null
}

type TikTokPostsResponse = { data: TikTokFeedPost[]; total: number; page: number; limit: number; pages: number }
type TikTokAccountsResponse = { data: TikTokAccount[]; total: number; page: number; limit: number; pages: number }

type ActiveTab = 'instagram-posts' | 'instagram-stories' | 'tiktok'

type ScrapeTimerState<T> = { loading: boolean; elapsed: number; result: T | null; error: string | null }

type XPostTarget = {
  transcript: string
  accountId: string
}

const IG_FORMAT_OPTIONS = ['', 'Reels', 'Carrossel', 'Estático']
const PAGE_LIMIT = 20

const TABS: { id: ActiveTab; label: string; icon: string }[] = [
  { id: 'instagram-posts', label: 'Instagram Posts', icon: '📸' },
  { id: 'instagram-stories', label: 'Instagram Stories', icon: '⏳' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('pt-BR')
}

function avg(arr: number[]): number {
  if (!arr.length) return 0
  return Math.round(arr.reduce((s, v) => s + v, 0) / arr.length)
}

function useScrapeTimer<T>(): [ScrapeTimerState<T>, {
  start: () => void
  finish: (result: T) => void
  fail: (error: string) => void
  reset: () => void
}] {
  const init: ScrapeTimerState<T> = { loading: false, elapsed: 0, result: null, error: null }
  const [state, setState] = useState(init)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  function clearTimer() {
    if (timer.current) { clearInterval(timer.current); timer.current = null }
  }

  return [state, {
    start: () => {
      clearTimer()
      setState({ loading: true, elapsed: 0, result: null, error: null })
      timer.current = setInterval(() => setState((s) => ({ ...s, elapsed: s.elapsed + 1 })), 1000)
    },
    finish: (result) => { clearTimer(); setState((s) => ({ ...s, loading: false, result })) },
    fail: (error) => { clearTimer(); setState((s) => ({ ...s, loading: false, error })) },
    reset: () => { clearTimer(); setState(init) },
  }]
}

function ScrapeButton({ loading, elapsed, label, loadingLabel, onClick, disabled }: {
  loading: boolean; elapsed: number; label: string; loadingLabel: string
  onClick: () => void; disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className="inline-flex items-center gap-2 rounded-full border border-ink/[0.12] bg-card px-4 py-2 text-[13px] font-medium text-ink hover:bg-ink/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink/30 border-t-ink" />{loadingLabel} {elapsed}s</>
      ) : label}
    </button>
  )
}

function ThumbnailPlaceholder({ size = 40, label = false }: { size?: number; label?: boolean }) {
  return (
    <div
      style={{ width: size, height: size, minWidth: size }}
      className="flex flex-col items-center justify-center gap-1 rounded bg-ink/[0.06]"
    >
      <span style={{ fontSize: size * 0.4 }} role="img" aria-label="Imagem indisponível">🖼️</span>
      {label && <span className="text-center text-[10px] leading-tight text-ink-subtle">Imagem não disponível</span>}
    </div>
  )
}

function igPostPeekModel(p: Post): MediaPeekModel {
  return {
    title: p.title,
    thumbnailUrl: p.thumbnailUrl,
    videoUrl: p.videoUrl,
    carouselImages: p.carouselImages,
  }
}

function tiktokPostPeekModel(p: TikTokFeedPost): MediaPeekModel {
  return {
    title: p.title,
    thumbnailUrl: p.thumbnailUrl,
    videoUrl: p.videoUrl,
  }
}

function storyPeekModel(s: InstagramStory): MediaPeekModel {
  return {
    title: s.account ? `@${s.account.handle} · story` : 'Story',
    thumbnailUrl: s.thumbnailUrl,
    videoUrl: s.videoUrl,
  }
}

function PostDrawerCarousel({ slides, title }: { slides: string[]; title: string }) {
  const [slideIndex, setSlideIndex] = useState(0)
  return (
    <div className="relative">
      <img src={slides[slideIndex]} alt={`${title} — slide ${slideIndex + 1}`} className="h-64 w-full object-cover" />
      {slides.length > 1 && (
        <>
          <button type="button" onClick={() => setSlideIndex((i) => Math.max(0, i - 1))} disabled={slideIndex === 0} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-ink/50 p-1.5 text-white disabled:opacity-30 hover:bg-ink/70" aria-label="Slide anterior">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" onClick={() => setSlideIndex((i) => Math.min(slides.length - 1, i + 1))} disabled={slideIndex === slides.length - 1} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-ink/50 p-1.5 text-white disabled:opacity-30 hover:bg-ink/70" aria-label="Próximo slide">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-ink/60 px-2.5 py-0.5 text-[11px] font-medium text-white">{slideIndex + 1} / {slides.length}</span>
        </>
      )}
    </div>
  )
}

function PostDrawer({ post, onClose, onScrapeReels, onXPost }: { post: Post; onClose: () => void; onScrapeReels?: () => void; onXPost?: (t: XPostTarget) => void }) {
  const slides = post.carouselImages?.length ? post.carouselImages : null
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const isReel = post.format === 'Reels'
  const hasVideo = isReel && !!post.videoUrl
  const notProcessed = isReel && !post.videoUrl && !post.transcript

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-start">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-sm flex-col overflow-y-auto bg-card shadow-2xl sm:h-screen">
        <div className="flex items-center justify-between border-b border-ink/[0.06] px-5 py-4">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-muted">Detalhes do post</p>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-ink/[0.06]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="flex flex-col gap-5 p-5">
          <div className="overflow-hidden rounded-2xl bg-surface">
            {hasVideo ? (
              <video controls src={post.videoUrl!} poster={post.thumbnailUrl ?? undefined} className="h-64 w-full bg-black object-contain" />
            ) : slides ? (
              <PostDrawerCarousel key={post.id} slides={slides} title={post.title} />
            ) : post.thumbnailUrl ? (
              <img src={post.thumbnailUrl} alt={post.title} className="h-64 w-full object-cover" onError={(e) => { const el = e.currentTarget.parentElement; if (el) el.innerHTML = '' }} />
            ) : (
              <div className="flex h-64 w-full items-center justify-center"><ThumbnailPlaceholder size={64} label /></div>
            )}
          </div>
          <div>
            <span className="inline-flex rounded-full bg-brand/10 px-2.5 py-0.5 text-[12px] font-medium text-brand">{post.format}</span>
            <p className="mt-2 text-[16px] font-semibold leading-snug text-ink">{post.title}</p>
            <p className="mt-1 text-[13px] text-ink-muted">{formatDate(post.postedAt)}</p>
          </div>
          <dl className="grid grid-cols-2 gap-2">
            {[
              { label: 'Curtidas', value: post.likes },
              { label: 'Comentários', value: post.comments },
              { label: 'Salvamentos', value: post.saves },
              ...(post.reach != null ? [{ label: 'Alcance', value: post.reach }] : []),
              ...(post.impressions != null ? [{ label: 'Impressões', value: post.impressions }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-surface px-3 py-2.5">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{label}</dt>
                <dd className="mt-1 text-[15px] font-semibold tabular-nums text-ink">{value.toLocaleString('pt-BR')}</dd>
              </div>
            ))}
          </dl>
          {post.transcript && (
            <div className="rounded-2xl border border-ink/[0.06] bg-surface">
              <button type="button" onClick={() => setTranscriptOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-3 text-[14px] font-medium text-ink">
                <span>Transcrição</span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={transcriptOpen ? 'rotate-180 transition-transform' : 'transition-transform'}>
                  <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {transcriptOpen && <p className="select-text border-t border-ink/[0.06] px-4 py-3 text-[13px] leading-relaxed text-ink-muted">{post.transcript}</p>}
            </div>
          )}
          {notProcessed && (
            <div className="rounded-2xl border border-dashed border-ink/[0.12] bg-surface px-4 py-4 text-center">
              <p className="text-[13px] text-ink-muted">Ainda não processado</p>
              {onScrapeReels && (
                <button type="button" onClick={onScrapeReels} className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-4 py-2 text-[13px] font-medium text-brand hover:bg-brand/20">
                  Transcrever / baixar Reels
                </button>
              )}
            </div>
          )}
          {post.transcript && onXPost && (
            <button
              type="button"
              onClick={() => {
                onXPost({ transcript: post.transcript!, accountId: '' })
                onClose()
              }}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-card hover:opacity-90"
            >
              <span className="font-bold">𝕏</span> Criar post no X
            </button>
          )}
          {post.postUrl && (
            <a href={post.postUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-full border border-ink/[0.12] px-4 py-2.5 text-[14px] font-medium text-ink hover:bg-ink/[0.04]">
              Ver no Instagram
            </a>
          )}
        </div>
      </aside>
    </div>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { instagramAccounts, isLoading: accountsLoading, loadError: accountsError } = useAppWorkspace()

  const [activeTab, setActiveTab] = useState<ActiveTab>('instagram-posts')
  const [filterWorkspace, setFilterWorkspace] = useState('')
  const [xPostTarget, setXPostTarget] = useState<XPostTarget | null>(null)

  const [igAccountId, setIgAccountId] = useState('')
  const [igDateFrom, setIgDateFrom] = useState('2026-01-01')
  const [igDateTo, setIgDateTo] = useState('2026-03-31')
  const [igFormat, setIgFormat] = useState('')
  const [igPage, setIgPage] = useState(1)
  const [igPosts, setIgPosts] = useState<PostsResponse | null>(null)
  const [igPostsLoading, setIgPostsLoading] = useState(false)
  const [igError, setIgError] = useState<string | null>(null)
  const [igStats, setIgStats] = useState<AccountStats | null>(null)
  const [igStatsLoading, setIgStatsLoading] = useState(false)
  const [drawerPost, setDrawerPost] = useState<Post | null>(null)
  const [mediaPeek, setMediaPeek] = useState<MediaPeekModel | null>(null)
  const [igRefreshKey, setIgRefreshKey] = useState(0)

  const [storiesAccountId, setStoriesAccountId] = useState('')
  const [storiesMediaType, setStoriesMediaType] = useState<'image' | 'video' | ''>('')
  const [storiesDateFrom, setStoriesDateFrom] = useState('')
  const [storiesDateTo, setStoriesDateTo] = useState('')
  const [storiesPage, setStoriesPage] = useState(1)
  const [storiesData, setStoriesData] = useState<StoriesResponse | null>(null)
  const [storiesLoading, setStoriesLoading] = useState(false)
  const [storiesError, setStoriesError] = useState<string | null>(null)
  const storiesLoaded = useRef(false)

  const [tiktokAccounts, setTiktokAccounts] = useState<TikTokAccount[]>([])
  const [tiktokAccountsLoaded, setTiktokAccountsLoaded] = useState(false)
  const [tiktokAccountId, setTiktokAccountId] = useState('')
  const [tiktokDateFrom, setTiktokDateFrom] = useState('')
  const [tiktokDateTo, setTiktokDateTo] = useState('')
  const [tiktokPage, setTiktokPage] = useState(1)
  const [tiktokData, setTiktokData] = useState<TikTokPostsResponse | null>(null)
  const [tiktokLoading, setTiktokLoading] = useState(false)
  const [tiktokError, setTiktokError] = useState<string | null>(null)
  const tiktokLoaded = useRef(false)

  type ProfileScrapeResult = { profileResult: string | null; postsResult: string | null }
  const [igScrape, igScrapeCtl] = useScrapeTimer<ProfileScrapeResult>()
  type ReelsScrapeResult = { total: number; reels: { id: string; status: 'ok' | 'failed' }[] }
  const [reelsScrape, reelsScrapeCtl] = useScrapeTimer<ReelsScrapeResult>()
  type StoriesScrapeResult = { total: number; ok: number; failed: number }
  const [storiesScrape, storiesScrapeCtl] = useScrapeTimer<StoriesScrapeResult>()
  type TikTokScrapeResult = { total: number; saved: number }
  const [tiktokScrape, tiktokScrapeCtl] = useScrapeTimer<TikTokScrapeResult>()

  useEffect(() => {
    if (!igAccountId) { setIgStats(null); return }
    setIgStatsLoading(true)
    const p = new URLSearchParams()
    if (igDateFrom) p.set('dateFrom', igDateFrom)
    if (igDateTo) p.set('dateTo', igDateTo)
    api.get<AccountStats>(`/instagram-accounts/${igAccountId}/stats?${p}`)
      .then(setIgStats)
      .catch(() => setIgStats(null))
      .finally(() => setIgStatsLoading(false))
  }, [igAccountId, igDateFrom, igDateTo, igRefreshKey])

  useEffect(() => {
    setIgPostsLoading(true)
    setIgError(null)
    const p = new URLSearchParams({ page: String(igPage), limit: String(PAGE_LIMIT) })
    if (igAccountId) p.set('accountId', igAccountId)
    else if (filterWorkspace) p.set('workspace', filterWorkspace)
    if (igDateFrom) p.set('dateFrom', igDateFrom)
    if (igDateTo) p.set('dateTo', igDateTo)
    if (igFormat) p.set('format', igFormat)
    api.get<PostsResponse>(`/posts?${p}`)
      .then(setIgPosts)
      .catch((err: unknown) => { setIgError(err instanceof Error ? err.message : 'Erro ao carregar posts.'); setIgPosts(null) })
      .finally(() => setIgPostsLoading(false))
  }, [igAccountId, igDateFrom, igDateTo, igFormat, igPage, igRefreshKey, filterWorkspace])

  useEffect(() => {
    if (activeTab !== 'instagram-stories' && !storiesLoaded.current) return
    storiesLoaded.current = true
    setStoriesLoading(true)
    setStoriesError(null)
    const p = new URLSearchParams({ page: String(storiesPage), limit: String(PAGE_LIMIT) })
    if (storiesAccountId) p.set('accountId', storiesAccountId)
    else if (filterWorkspace) p.set('workspace', filterWorkspace)
    if (storiesMediaType) p.set('mediaType', storiesMediaType)
    if (storiesDateFrom) p.set('dateFrom', storiesDateFrom)
    if (storiesDateTo) p.set('dateTo', storiesDateTo)
    api.get<StoriesResponse>(`/instagram-stories?${p}`)
      .then(setStoriesData)
      .catch((err: unknown) => { setStoriesError(err instanceof Error ? err.message : 'Erro ao carregar stories.'); setStoriesData(null) })
      .finally(() => setStoriesLoading(false))
  }, [activeTab, storiesAccountId, storiesMediaType, storiesDateFrom, storiesDateTo, storiesPage, filterWorkspace])

  useEffect(() => {
    if (tiktokAccountsLoaded) return
    api.get<TikTokAccountsResponse>('/tiktok-accounts?limit=100')
      .then((res) => { setTiktokAccounts(res.data) })
      .catch(() => {})
      .finally(() => setTiktokAccountsLoaded(true))
  }, [tiktokAccountsLoaded, tiktokAccountId])

  useEffect(() => {
    if (activeTab !== 'tiktok' && !tiktokLoaded.current) return
    tiktokLoaded.current = true
    setTiktokLoading(true)
    setTiktokError(null)
    const p = new URLSearchParams({ page: String(tiktokPage), limit: String(PAGE_LIMIT) })
    if (tiktokAccountId) p.set('accountId', tiktokAccountId)
    else if (filterWorkspace) p.set('workspace', filterWorkspace)
    if (tiktokDateFrom) p.set('dateFrom', tiktokDateFrom)
    if (tiktokDateTo) p.set('dateTo', tiktokDateTo)
    api.get<TikTokPostsResponse>(`/tiktok-accounts/posts?${p}`)
      .then(setTiktokData)
      .catch((err: unknown) => { setTiktokError(err instanceof Error ? err.message : 'Erro ao carregar posts TikTok.'); setTiktokData(null) })
      .finally(() => setTiktokLoading(false))
  }, [activeTab, tiktokAccountId, tiktokDateFrom, tiktokDateTo, tiktokPage, filterWorkspace])

  async function runIgScrape() {
    if (!igAccountId) return
    igScrapeCtl.start()
    try {
      const [profile, postsRaw] = await Promise.all([
        api.post<{ followers: number; displayName: string; verified?: boolean }>(`/instagram-accounts/${igAccountId}/scrape/profile`),
        api.post<{ count?: number } | unknown[]>(`/instagram-accounts/${igAccountId}/scrape/posts?limit=50`),
      ])
      const postsCount = Array.isArray(postsRaw) ? postsRaw.length : (postsRaw as { count?: number }).count ?? '?'
      igScrapeCtl.finish({
        profileResult: `${profile.displayName} · ${profile.followers.toLocaleString('pt-BR')} seguidores${profile.verified ? ' ✓' : ''}`,
        postsResult: `${postsCount} posts importados`,
      })
      setIgRefreshKey((k) => k + 1)
      setIgPage(1)
    } catch (err) {
      igScrapeCtl.fail(err instanceof Error ? err.message : 'Erro ao atualizar.')
    }
  }

  async function runReelsScrape() {
    if (!igAccountId) return
    reelsScrapeCtl.start()
    try {
      const data = await api.post<{ total: number; reels: { id: string; status: 'ok' | 'failed' }[] }>(`/instagram-accounts/${igAccountId}/scrape/reels?limit=10`)
      reelsScrapeCtl.finish(data)
      setIgRefreshKey((k) => k + 1)
      setIgPage(1)
    } catch (err) {
      reelsScrapeCtl.fail(err instanceof Error ? err.message : 'Erro ao processar Reels.')
    }
  }

  async function runStoriesScrape() {
    if (!igAccountId) return
    storiesScrapeCtl.start()
    try {
      const data = await api.post<{ total: number; stories: { id: string; status: 'ok' | 'failed' }[] }>(`/instagram-accounts/${igAccountId}/scrape/stories`)
      const ok = data.stories.filter((s) => s.status === 'ok').length
      const failed = data.stories.filter((s) => s.status === 'failed').length
      storiesScrapeCtl.finish({ total: data.total, ok, failed })
      setStoriesPage(1)
      setStoriesLoading(true)
      const p = new URLSearchParams({ page: '1', limit: String(PAGE_LIMIT) })
      if (storiesAccountId) p.set('accountId', storiesAccountId)
      else if (filterWorkspace) p.set('workspace', filterWorkspace)
      if (storiesMediaType) p.set('mediaType', storiesMediaType)
      api.get<StoriesResponse>(`/instagram-stories?${p}`)
        .then(setStoriesData)
        .catch(() => {})
        .finally(() => setStoriesLoading(false))
    } catch (err) {
      storiesScrapeCtl.fail(err instanceof Error ? err.message : 'Erro ao buscar Stories.')
    }
  }

  async function runTiktokScrape() {
    if (!tiktokAccountId) return
    tiktokScrapeCtl.start()
    try {
      const data = await api.post<{ total: number; saved: number }>(`/tiktok-accounts/${tiktokAccountId}/scrape/posts?limit=30`)
      tiktokScrapeCtl.finish(data)
      setTiktokPage(1)
      tiktokLoaded.current = false
      tiktokLoaded.current = true
      setTiktokLoading(true)
      const p = new URLSearchParams({ page: '1', limit: String(PAGE_LIMIT) })
      if (tiktokAccountId) p.set('accountId', tiktokAccountId)
      api.get<TikTokPostsResponse>(`/tiktok-accounts/posts?${p}`)
        .then(setTiktokData)
        .catch(() => {})
        .finally(() => setTiktokLoading(false))
    } catch (err) {
      tiktokScrapeCtl.fail(err instanceof Error ? err.message : 'Erro ao processar posts TikTok.')
    }
  }

  const igWorkspaces = Array.from(new Set(instagramAccounts.map((a) => a.workspace).filter(Boolean) as string[]))
  const tiktokWorkspaces = Array.from(new Set(tiktokAccounts.map((a) => a.workspace).filter(Boolean)))
  const allWorkspaces = Array.from(new Set([...igWorkspaces, ...tiktokWorkspaces]))

  const visibleIgAccounts = filterWorkspace
    ? instagramAccounts.filter((a) => a.workspace === filterWorkspace)
    : instagramAccounts

  const visibleTiktokAccounts = filterWorkspace
    ? tiktokAccounts.filter((a) => a.workspace === filterWorkspace)
    : tiktokAccounts

  const selectedTiktokAccount = visibleTiktokAccounts.find((a) => a.id === tiktokAccountId)
  const igPaginationAccount = visibleIgAccounts.find((a) => a.id === igAccountId)
  const storiesPaginationAccount = visibleIgAccounts.find((a) => a.handle === storiesAccountId)
  const igTotalPages = igPosts ? Math.ceil(igPosts.total / PAGE_LIMIT) : 1
  const recentPosts = igStats?.recentPosts ?? []
  const avgLikes = avg(recentPosts.map((p) => p.likes))
  const posts = igPosts?.data ?? []

  function accountIdForTwitterFromPost(post: Post): string {
    return igAccountId || post.instagramAccountId || post.accountId || ''
  }

  function goGenerateTwitterFromDashPost(post: Post) {
    const accountId = accountIdForTwitterFromPost(post)
    if (!accountId) return
    const prefill: GenerateFeedPrefill = {
      mode: 'post',
      accountId,
      sourcePostId: post.id,
      dashPost: {
        id: post.id,
        title: post.title,
        postedAt: post.postedAt,
        format: post.format,
        thumbnailUrl: post.thumbnailUrl ?? null,
        transcript: post.transcript ?? null,
      },
    }
    navigate('/twitter-posts', { state: { generateFromFeed: prefill } })
  }

  if (accountsLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-[15px] text-ink-muted">Carregando contas…</p>
      </div>
    )
  }

  if (accountsError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-[14px] text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
        <p className="font-semibold">Erro ao carregar contas</p>
        <p className="mt-1 font-mono text-[13px]">{accountsError}</p>
      </div>
    )
  }

  return (
    <>
      {xPostTarget && (
        <GeneratePanel
          initialTranscript={xPostTarget.transcript}
          initialAccountId={xPostTarget.accountId || igAccountId}
          onClose={() => setXPostTarget(null)}
          onCreate={() => setXPostTarget(null)}
        />
      )}

      {drawerPost && (
        <PostDrawer
          post={drawerPost}
          onClose={() => setDrawerPost(null)}
          onScrapeReels={() => { setDrawerPost(null); void runReelsScrape() }}
          onXPost={(t) => {
            setXPostTarget({ transcript: t.transcript, accountId: igAccountId })
            setDrawerPost(null)
          }}
        />
      )}

      <MediaPeekModal model={mediaPeek} onClose={() => setMediaPeek(null)} />

      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Painel geral</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
            Visão unificada de conteúdo. Selecione a plataforma e gerencie filtros, paginação e scraping.
          </p>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-2xl border border-ink/[0.06] bg-surface p-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            {TABS.map(({ id, label, icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={[
                  'flex items-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-medium transition-all',
                  activeTab === id
                    ? 'bg-card text-ink shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                    : 'text-ink-muted hover:text-ink hover:bg-ink/[0.03]',
                ].join(' ')}
              >
                <span className="text-[16px]">{icon}</span>
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {allWorkspaces.length > 0 && (
              <div className="flex items-center gap-2">
                <label htmlFor="filter-workspace" className="whitespace-nowrap text-[13px] font-medium text-ink-muted">
                  Workspace
                </label>
                <select
                  id="filter-workspace"
                  value={filterWorkspace}
                  onChange={(e) => {
                    setFilterWorkspace(e.target.value)
                    setIgAccountId('')
                    setIgPage(1)
                    setStoriesAccountId('')
                    setStoriesPage(1)
                    setTiktokAccountId('')
                    setTiktokPage(1)
                  }}
                  className="rounded-xl border border-ink/[0.1] bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                >
                  <option value="">Todos os workspaces</option>
                  {allWorkspaces.map((ws) => (
                    <option key={ws} value={ws}>{ws}</option>
                  ))}
                </select>
                {filterWorkspace && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterWorkspace('')
                      setIgPage(1)
                      setStoriesPage(1)
                      setTiktokPage(1)
                    }}
                    className="rounded-lg px-2 py-1.5 text-[12px] text-ink-muted hover:bg-ink/[0.06] hover:text-ink"
                    aria-label="Limpar filtro de workspace"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <section className="rounded-2xl border border-ink/[0.06] bg-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          {activeTab === 'instagram-posts' && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label htmlFor="ig-account" className="text-sm font-medium text-ink">Conta Instagram</label>
                  <select
                    id="ig-account"
                    value={igAccountId}
                    onChange={(e) => { setIgAccountId(e.target.value); setIgPage(1); igScrapeCtl.reset(); reelsScrapeCtl.reset(); setDrawerPost(null) }}
                    className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  >
                    <option value="">Todas as contas</option>
                    {visibleIgAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.displayName} (@{a.handle})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="ig-from" className="text-sm font-medium text-ink">De</label>
                  <input id="ig-from" type="date" value={igDateFrom} onChange={(e) => { setIgDateFrom(e.target.value); setIgPage(1) }} className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[14px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
                </div>
                <div>
                  <label htmlFor="ig-to" className="text-sm font-medium text-ink">Até</label>
                  <input id="ig-to" type="date" value={igDateTo} min={igDateFrom} onChange={(e) => { setIgDateTo(e.target.value); setIgPage(1) }} className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[14px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
                </div>
              </div>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="w-48">
                  <label htmlFor="ig-format" className="text-sm font-medium text-ink">Formato</label>
                  <select
                    id="ig-format"
                    value={igFormat}
                    onChange={(e) => { setIgFormat(e.target.value); setIgPage(1) }}
                    className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  >
                    {IG_FORMAT_OPTIONS.map((f) => (
                      <option key={f} value={f}>{f || 'Todos'}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <ScrapeButton loading={igScrape.loading} elapsed={igScrape.elapsed} label="Atualizar scraping" loadingLabel="Atualizando…" onClick={() => void runIgScrape()} disabled={!igAccountId} />
                  <ScrapeButton loading={reelsScrape.loading} elapsed={reelsScrape.elapsed} label="Transcrever Reels" loadingLabel="Transcrevendo…" onClick={() => void runReelsScrape()} disabled={!igAccountId} />
                </div>
              </div>
              {(igScrape.result || igScrape.error || reelsScrape.result || reelsScrape.error) && (
                <div className="flex flex-wrap gap-3 rounded-xl bg-surface px-4 py-2.5 text-[12px]">
                  {igScrape.result?.profileResult && <span className="font-medium text-emerald-700">✓ {igScrape.result.profileResult}</span>}
                  {igScrape.result?.postsResult && <span className="font-medium text-emerald-700">✓ {igScrape.result.postsResult}</span>}
                  {igScrape.error && <span className="text-red-700">{igScrape.error}</span>}
                  {reelsScrape.result && (
                    <span className="font-medium text-emerald-700">
                      ✓ Reels: {reelsScrape.result.reels.filter((r) => r.status === 'ok').length} ok
                      {reelsScrape.result.reels.some((r) => r.status === 'failed') && (
                        <span className="ml-1 text-amber-700">· {reelsScrape.result.reels.filter((r) => r.status === 'failed').length} falha(s)</span>
                      )}
                    </span>
                  )}
                  {reelsScrape.error && <span className="text-red-700">{reelsScrape.error}</span>}
                </div>
              )}
            </div>
          )}

          {activeTab === 'instagram-stories' && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label htmlFor="stories-account" className="text-sm font-medium text-ink">Conta Instagram</label>
                  <select
                    id="stories-account"
                    value={storiesAccountId}
                    onChange={(e) => { setStoriesAccountId(e.target.value); setStoriesPage(1) }}
                    className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  >
                    <option value="">Todas as contas</option>
                    {visibleIgAccounts.map((a) => (
                      <option key={a.id} value={a.handle}>{a.displayName} (@{a.handle})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="stories-media" className="text-sm font-medium text-ink">Tipo de mídia</label>
                  <select
                    id="stories-media"
                    value={storiesMediaType}
                    onChange={(e) => { setStoriesMediaType(e.target.value as 'image' | 'video' | ''); setStoriesPage(1) }}
                    className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  >
                    <option value="">Todos</option>
                    <option value="image">Imagem</option>
                    <option value="video">Vídeo</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="stories-from" className="text-sm font-medium text-ink">De</label>
                  <input id="stories-from" type="date" value={storiesDateFrom} onChange={(e) => { setStoriesDateFrom(e.target.value); setStoriesPage(1) }} className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[14px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
                </div>
                <div>
                  <label htmlFor="stories-to" className="text-sm font-medium text-ink">Até</label>
                  <input id="stories-to" type="date" value={storiesDateTo} min={storiesDateFrom} onChange={(e) => { setStoriesDateTo(e.target.value); setStoriesPage(1) }} className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[14px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <ScrapeButton loading={storiesScrape.loading} elapsed={storiesScrape.elapsed} label="Buscar Stories (scrape)" loadingLabel="Buscando…" onClick={() => void runStoriesScrape()} disabled={!igAccountId} />
                {(storiesScrape.result || storiesScrape.error) && (
                  <div className="text-[12px]">
                    {storiesScrape.result && (
                      <span className="font-medium text-emerald-700">
                        ✓ {storiesScrape.result.ok} ok
                        {storiesScrape.result.failed > 0 && <span className="ml-1 text-amber-700">· {storiesScrape.result.failed} falha(s)</span>}
                      </span>
                    )}
                    {storiesScrape.error && <span className="text-red-700">{storiesScrape.error}</span>}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'tiktok' && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="tiktok-account" className="text-sm font-medium text-ink">Conta TikTok</label>
                  {tiktokAccounts.length === 0 && tiktokAccountsLoaded ? (
                    <p className="mt-2 text-[13px] text-ink-muted">Nenhuma conta TikTok disponível.</p>
                  ) : (
                    <select
                      id="tiktok-account"
                      value={tiktokAccountId}
                      onChange={(e) => { setTiktokAccountId(e.target.value); setTiktokPage(1); tiktokScrapeCtl.reset() }}
                      className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    >
                      <option value="">Todas as contas</option>
                      {visibleTiktokAccounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.displayName} (@{a.handle})</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label htmlFor="tiktok-from" className="text-sm font-medium text-ink">De</label>
                  <input id="tiktok-from" type="date" value={tiktokDateFrom} onChange={(e) => { setTiktokDateFrom(e.target.value); setTiktokPage(1) }} className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[14px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
                </div>
                <div>
                  <label htmlFor="tiktok-to" className="text-sm font-medium text-ink">Até</label>
                  <input id="tiktok-to" type="date" value={tiktokDateTo} min={tiktokDateFrom} onChange={(e) => { setTiktokDateTo(e.target.value); setTiktokPage(1) }} className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[14px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ScrapeButton loading={tiktokScrape.loading} elapsed={tiktokScrape.elapsed} label="Scrape Posts" loadingLabel="Scraping…" onClick={() => void runTiktokScrape()} disabled={!tiktokAccountId} />
                  {selectedTiktokAccount && (
                    <a href={selectedTiktokAccount.profileUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] text-ink-muted hover:text-brand">
                      {selectedTiktokAccount.followers.toLocaleString('pt-BR')} seguidores
                    </a>
                  )}
                </div>
              </div>
              {(tiktokScrape.result || tiktokScrape.error) && (
                <div className="text-[12px]">
                  {tiktokScrape.result && <span className="font-medium text-emerald-700">✓ {tiktokScrape.result.total} encontrado(s) · {tiktokScrape.result.saved} salvo(s)</span>}
                  {tiktokScrape.error && <span className="text-red-700">{tiktokScrape.error}</span>}
                </div>
              )}
            </div>
          )}
        </section>

        {activeTab === 'instagram-posts' && igAccountId && (
          <section className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Seguidores', value: igStatsLoading ? '…' : igStats ? igStats.followers.toLocaleString('pt-BR') : '—', hint: 'Total do perfil' },
              { label: 'Posts no período', value: igStatsLoading ? '…' : igStats ? igStats.totalPosts.toLocaleString('pt-BR') : '—', hint: 'Dentro do intervalo selecionado' },
              { label: 'Média de curtidas', value: igStatsLoading ? '…' : recentPosts.length ? avgLikes.toLocaleString('pt-BR') : '—', hint: 'Por post nos posts recentes' },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border border-ink/[0.06] bg-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-ink">{card.value}</p>
                <p className="mt-1.5 text-[11px] text-ink-subtle">{card.hint}</p>
              </div>
            ))}
          </section>
        )}

        <section>
          {activeTab === 'instagram-posts' && (
            <>
              {igError && (
                <p className="mb-4 rounded-xl border border-brand/30 bg-brand/5 px-4 py-3 text-[14px] text-ink">{igError}</p>
              )}
              <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
                {igPosts && <p className="text-[13px] text-ink-muted">{igPosts.total.toLocaleString('pt-BR')} publicação(ões)</p>}
              </div>

              {igPostsLoading ? (
                <div className="h-48 animate-pulse rounded-2xl bg-ink/[0.06]" />
              ) : (
                <>
                  <div className="overflow-hidden rounded-2xl border border-ink/[0.06] bg-card shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px] text-left text-[14px]">
                        <thead>
                          <tr className="border-b border-ink/[0.06] bg-surface text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                            <th className="w-14 px-3 py-3 font-medium">Mídia</th>
                            <th className="px-5 py-3 font-medium">Post</th>
                            <th className="px-5 py-3 font-medium">Publicado em</th>
                            <th className="px-5 py-3 font-medium">Formato</th>
                            <th className="px-5 py-3 font-medium">Curtidas</th>
                            <th className="px-5 py-3 font-medium">Comentários</th>
                            <th className="whitespace-nowrap px-4 py-3 font-medium">Twitter</th>
                          </tr>
                        </thead>
                        <tbody>
                          {posts.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-5 py-10 text-center text-[14px] text-ink-muted">
                                Nenhuma publicação no período.
                              </td>
                            </tr>
                          ) : posts.map((p) => {
                            const peek = igPostPeekModel(p)
                            const canPeek = mediaPeekHasVisual(peek)
                            const twitterAcc = accountIdForTwitterFromPost(p)
                            return (
                              <tr key={p.id} className="border-b border-ink/[0.04] transition hover:bg-ink/[0.02] last:border-0">
                                <td className="px-3 py-3 align-middle">
                                  {canPeek ? (
                                    <MediaPeekEyeButton onClick={() => setMediaPeek(peek)} />
                                  ) : (
                                    <span className="inline-flex h-9 w-9 items-center justify-center text-[11px] text-ink-subtle">—</span>
                                  )}
                                </td>
                                <td className="max-w-[220px] px-5 py-3">
                                  <button
                                    type="button"
                                    onClick={() => setDrawerPost(p)}
                                    className="text-left font-medium text-ink hover:text-brand"
                                  >
                                    <span className="line-clamp-2">{p.title}</span>
                                  </button>
                                  {(p.carouselImages?.length ?? 0) > 0 && (
                                    <span className="mt-1 inline-block text-[10px] text-ink-muted">⧉ {p.carouselImages!.length} mídias</span>
                                  )}
                                </td>
                                <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{formatDate(p.postedAt)}</td>
                                <td className="px-5 py-3">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="inline-flex rounded-full bg-brand/10 px-2.5 py-0.5 text-[12px] font-medium text-brand">{p.format}</span>
                                    {p.transcript && <span className="inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">Transcript</span>}
                                  </div>
                                </td>
                                <td className="px-5 py-3 tabular-nums text-ink-muted">{p.likes.toLocaleString('pt-BR')}</td>
                                <td className="px-5 py-3 tabular-nums text-ink-muted">{p.comments.toLocaleString('pt-BR')}</td>
                                <td className="whitespace-nowrap px-4 py-3 align-middle">
                                  <button
                                    type="button"
                                    onClick={() => goGenerateTwitterFromDashPost(p)}
                                    disabled={!twitterAcc}
                                    title={
                                      twitterAcc
                                        ? undefined
                                        : 'Selecione uma conta Instagram no filtro acima para definir o perfil do card.'
                                    }
                                    className="rounded-lg border border-ink/[0.12] px-3 py-1.5 text-[12px] font-semibold text-brand hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    Gerar Twitter Post
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <PaginationWithChannel
                    page={igPage}
                    pages={igTotalPages}
                    total={igPosts?.total ?? 0}
                    countLabel="publicações"
                    onPrev={() => setIgPage((p) => Math.max(1, p - 1))}
                    onNext={() => setIgPage((p) => Math.min(igTotalPages, p + 1))}
                    platform="instagram"
                    channelImageUrl={igPaginationAccount?.profilePicS3Url}
                    channelTitle={igPaginationAccount ? `@${igPaginationAccount.handle}` : undefined}
                  />
                </>
              )}
            </>
          )}

          {activeTab === 'instagram-stories' && (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                {storiesData && (
                  <p className="text-[13px] text-ink-muted">
                    {storiesData.total.toLocaleString('pt-BR')} story(ies)
                    {storiesData.total > 0 && (
                      <span className="ml-2 text-[11px] text-ink-subtle">ordenados por transcrição disponível · mais recentes primeiro</span>
                    )}
                  </p>
                )}
                <p className="rounded-lg bg-amber-50 px-3 py-1.5 text-[11px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                  ⏳ Stories têm TTL de 24 h — expiram automaticamente. Se a lista estiver vazia, rode um novo scrape.
                </p>
              </div>
              {storiesLoading ? (
                <div className="h-40 animate-pulse rounded-2xl bg-ink/[0.06]" />
              ) : storiesError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-[14px] text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
                  <p className="font-semibold">Erro ao carregar stories</p>
                  <p className="mt-1 font-mono text-[13px]">{storiesError}</p>
                </div>
              ) : !storiesData || storiesData.data.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-ink/[0.12] bg-surface px-6 py-12 text-center">
                  <p className="text-[14px] text-ink-muted">Nenhum story encontrado.</p>
                  <p className="mt-1 text-[12px] text-ink-subtle">
                    Stories expiram após 24 h. Selecione uma conta acima e clique em "Buscar Stories (scrape)" para importar os stories atuais.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-ink/[0.06] bg-card shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px] text-left text-[13px]">
                      <thead>
                        <tr className="border-b border-ink/[0.06] bg-surface text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                          <th className="w-14 px-3 py-3">Mídia</th>
                          <th className="px-4 py-3">Conta</th>
                          <th className="px-4 py-3">Tipo</th>
                          <th className="px-4 py-3">Sync</th>
                          <th className="px-4 py-3">Expira</th>
                          <th className="px-4 py-3">Transcrição</th>
                          <th className="px-4 py-3">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {storiesData.data.map((story) => {
                          const peek = storyPeekModel(story)
                          const canPeek = mediaPeekHasVisual(peek)
                          return (
                            <tr key={story.id} className="border-b border-ink/[0.04] last:border-0">
                              <td className="px-3 py-3 align-middle">
                                {canPeek ? (
                                  <MediaPeekEyeButton onClick={() => setMediaPeek(peek)} />
                                ) : (
                                  <span className="inline-flex h-9 w-9 items-center justify-center text-[11px] text-ink-subtle">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {story.account ? (
                                  <div>
                                    <p className="font-medium text-ink">{story.account.displayName}</p>
                                    <p className="text-[11px] text-ink-muted">@{story.account.handle}</p>
                                  </div>
                                ) : '—'}
                              </td>
                              <td className="px-4 py-3 text-ink-muted">{story.mediaType === 'video' ? 'Vídeo' : 'Imagem'}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{formatDate(story.syncedAt)}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{story.expiresAt ? formatDate(story.expiresAt) : '—'}</td>
                              <td className="max-w-[200px] px-4 py-3">
                                {story.transcript ? (
                                  <details className="text-[12px]">
                                    <summary className="cursor-pointer text-brand">Ver</summary>
                                    <p className="mt-1 max-h-28 overflow-y-auto text-ink-muted">{story.transcript}</p>
                                  </details>
                                ) : (
                                  <span className="text-ink-subtle">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {story.transcript ? (
                                  <button
                                    type="button"
                                    onClick={() => setXPostTarget({
                                      transcript: story.transcript!,
                                      accountId: story.account?.handle ?? '',
                                    })}
                                    className="text-[12px] font-medium text-brand hover:underline"
                                  >
                                    𝕏 Post
                                  </button>
                                ) : (
                                  <span className="text-ink-subtle">—</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {storiesData && (
                <PaginationWithChannel
                  page={storiesPage}
                  pages={storiesData.pages}
                  total={storiesData.total}
                  countLabel="stories"
                  onPrev={() => setStoriesPage((p) => Math.max(1, p - 1))}
                  onNext={() => setStoriesPage((p) => Math.min(storiesData.pages, p + 1))}
                  platform="instagram"
                  channelImageUrl={storiesPaginationAccount?.profilePicS3Url}
                  channelTitle={storiesPaginationAccount ? `@${storiesPaginationAccount.handle}` : undefined}
                />
              )}
            </>
          )}

          {activeTab === 'tiktok' && (
            <>
              {tiktokData && (
                <p className="mb-4 text-[13px] text-ink-muted">
                  {tiktokData.total.toLocaleString('pt-BR')} post(s)
                </p>
              )}
              {tiktokLoading ? (
                <div className="h-40 animate-pulse rounded-2xl bg-ink/[0.06]" />
              ) : tiktokError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-[14px] text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
                  <p className="font-semibold">Erro ao carregar posts TikTok</p>
                  <p className="mt-1 font-mono text-[13px]">{tiktokError}</p>
                </div>
              ) : !tiktokData || tiktokData.data.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-ink/[0.12] bg-surface px-6 py-16 text-center text-[14px] text-ink-muted">
                  Nenhum post encontrado para os filtros selecionados.
                </p>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-ink/[0.06] bg-card shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-left text-[13px]">
                      <thead>
                        <tr className="border-b border-ink/[0.06] bg-surface text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                          <th className="w-14 px-3 py-3">Mídia</th>
                          <th className="px-4 py-3">Título</th>
                          <th className="px-4 py-3">Conta</th>
                          <th className="px-4 py-3">Views</th>
                          <th className="px-4 py-3">Curtidas</th>
                          <th className="px-4 py-3">Data</th>
                          <th className="px-4 py-3">Links</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tiktokData.data.map((post) => {
                          const peek = tiktokPostPeekModel(post)
                          const canPeek = mediaPeekHasVisual(peek)
                          return (
                            <tr key={post.id} className="border-b border-ink/[0.04] last:border-0">
                              <td className="px-3 py-3 align-middle">
                                {canPeek ? (
                                  <MediaPeekEyeButton onClick={() => setMediaPeek(peek)} />
                                ) : (
                                  <span className="inline-flex h-9 w-9 items-center justify-center text-[11px] text-ink-subtle">—</span>
                                )}
                              </td>
                              <td className="max-w-[240px] px-4 py-3 font-medium text-ink">
                                <span className="line-clamp-2">{post.title || '—'}</span>
                              </td>
                              <td className="px-4 py-3 text-ink-muted">
                                {post.account?.displayName ?? '—'}
                              </td>
                              <td className="px-4 py-3 tabular-nums text-ink-muted">{formatNumber(post.views)}</td>
                              <td className="px-4 py-3 tabular-nums text-ink-muted">{formatNumber(post.likes)}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                                {post.postedAt ? formatDate(post.postedAt) : '—'}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                  <a
                                    href={post.postUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[12px] font-medium text-brand hover:underline"
                                  >
                                    TikTok
                                  </a>
                                  {post.transcript && (
                                    <button
                                      type="button"
                                      onClick={() => setXPostTarget({
                                        transcript: post.transcript!,
                                        accountId: '',
                                      })}
                                      className="text-[12px] font-medium text-ink-muted hover:text-ink"
                                    >
                                      𝕏
                                    </button>
                                  )}
                                </div>
                                {post.transcript && (
                                  <details className="mt-1 text-[11px]">
                                    <summary className="cursor-pointer text-brand">Transcrição</summary>
                                    <p className="mt-1 max-h-24 overflow-y-auto text-ink-muted">{post.transcript}</p>
                                  </details>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {tiktokData && (
                <PaginationWithChannel
                  page={tiktokPage}
                  pages={tiktokData.pages}
                  total={tiktokData.total}
                  countLabel="posts"
                  onPrev={() => setTiktokPage((p) => Math.max(1, p - 1))}
                  onNext={() => setTiktokPage((p) => Math.min(tiktokData.pages, p + 1))}
                  platform="tiktok"
                  channelImageUrl={selectedTiktokAccount?.profilePicUrl}
                  channelTitle={selectedTiktokAccount ? `@${selectedTiktokAccount.handle}` : undefined}
                />
              )}
            </>
          )}
        </section>
      </div>
    </>
  )
}
