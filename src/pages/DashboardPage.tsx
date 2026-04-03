import { useEffect, useRef, useState } from 'react'
import { useAppWorkspace } from '../context/AppWorkspaceContext'
import { api } from '../lib/api'
import { GeneratePanel, TwitterLikePost } from '../components/GeneratePanel'

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

function Pagination({ page, pages, total, label, onPrev, onNext }: {
  page: number; pages: number; total: number; label: string
  onPrev: () => void; onNext: () => void
}) {
  if (pages <= 1) return null
  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onPrev}
        disabled={page <= 1}
        className="rounded-full border border-ink/[0.1] px-4 py-2 text-[14px] font-medium text-ink hover:bg-ink/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Anterior
      </button>
      <span className="text-[13px] text-ink-muted">
        Página {page} de {pages} · {total.toLocaleString('pt-BR')} {label}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={page >= pages}
        className="rounded-full border border-ink/[0.1] px-4 py-2 text-[14px] font-medium text-ink hover:bg-ink/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Próxima
      </button>
    </div>
  )
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

function DashStoryCard({ story, onXPost }: { story: InstagramStory; onXPost: (t: XPostTarget) => void }) {
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const hasVideo = story.mediaType === 'video' && !!story.videoUrl

  return (
    <div className="overflow-hidden rounded-2xl border border-ink/[0.06] bg-card shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <div className="relative overflow-hidden bg-ink/[0.06]" style={{ aspectRatio: '9/16' }}>
        {hasVideo ? (
          <video controls src={story.videoUrl!} poster={story.thumbnailUrl ?? undefined} className="h-full w-full object-cover" />
        ) : story.thumbnailUrl ? (
          <img src={story.thumbnailUrl} alt="Story" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-2xl" role="img" aria-label="Sem mídia">🖼️</span>
          </div>
        )}
        <span
          className={[
            'absolute right-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white',
            hasVideo ? 'bg-brand/80' : 'bg-ink/60',
          ].join(' ')}
        >
          {hasVideo ? '▶ Vídeo' : '🖼 Imagem'}
        </span>
      </div>
      <div className="space-y-2 p-3">
        {story.account && (
          <div className="flex items-center gap-2">
            {story.account.profilePicS3Url ? (
              <img src={story.account.profilePicS3Url} alt={story.account.displayName} className="h-6 w-6 shrink-0 rounded-full object-cover" />
            ) : (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[10px] font-bold text-brand">
                {story.account.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-ink">{story.account.displayName}</p>
              <p className="text-[10px] text-ink-muted">@{story.account.handle} · {formatNumber(story.account.followers)} seg.</p>
            </div>
          </div>
        )}
        {story.postedAt && <p className="text-[11px] text-ink-muted">Publicado: {formatDate(story.postedAt)}</p>}
        <p className="text-[11px] text-ink-muted">Sync: {formatDate(story.syncedAt)}</p>
        {story.expiresAt && <p className="text-[11px] text-ink-muted">Expira: {formatDate(story.expiresAt)}</p>}
        {story.transcript && (
          <>
            <div className="rounded-xl border border-ink/[0.06] bg-surface">
              <button
                type="button"
                onClick={() => setTranscriptOpen((o) => !o)}
                className="flex w-full items-center justify-between px-3 py-2 text-[12px] font-medium text-ink"
              >
                <span>Transcrição</span>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className={transcriptOpen ? 'rotate-180 transition-transform' : 'transition-transform'}>
                  <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {transcriptOpen && (
                <p className="select-text border-t border-ink/[0.06] px-3 py-2 text-[11px] leading-relaxed text-ink-muted">{story.transcript}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onXPost({
                transcript: story.transcript!,
                accountId: story.account?.handle ?? '',
              })}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-ink/[0.1] py-2 text-[11px] font-medium text-ink-muted hover:bg-ink/[0.04] hover:text-ink"
            >
              <span className="font-bold">𝕏</span> Criar post no X
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function DashTikTokCard({ post, onXPost }: { post: TikTokFeedPost; onXPost: (t: XPostTarget) => void }) {
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const hasVideo = !!post.videoUrl

  return (
    <div className="overflow-hidden rounded-2xl border border-ink/[0.06] bg-card shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="relative overflow-hidden bg-ink/[0.06]" style={{ aspectRatio: '1/1' }}>
        {hasVideo ? (
          <video controls src={post.videoUrl!} poster={post.thumbnailUrl ?? undefined} className="h-full w-full object-cover" />
        ) : post.thumbnailUrl ? (
          <img src={post.thumbnailUrl} alt={post.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-3xl" role="img" aria-label="Sem mídia">🎵</span>
          </div>
        )}
        {hasVideo && <span className="absolute left-2 top-2 rounded bg-ink/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">▶</span>}
      </div>
      <div className="space-y-2 p-4">
        {post.account && (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[11px] font-bold text-brand">
              {post.account.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-ink">{post.account.displayName}</p>
              <p className="text-[10px] text-ink-muted">{formatNumber(post.account.followers)} seguidores</p>
            </div>
          </div>
        )}
        {post.title && <p className="line-clamp-2 text-[13px] text-ink">{post.title}</p>}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] tabular-nums text-ink-muted">
          <span>{formatNumber(post.views)} views</span>
          <span>{formatNumber(post.likes)} curtidas</span>
          <span>{formatNumber(post.shares)} shares</span>
          <span>{formatNumber(post.comments)} comentários</span>
        </div>
        {post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.hashtags.slice(0, 5).map((tag) => (
              <span key={tag} className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">#{tag}</span>
            ))}
            {post.hashtags.length > 5 && <span className="text-[11px] text-ink-muted">+{post.hashtags.length - 5}</span>}
          </div>
        )}
        {post.postedAt && <p className="text-[11px] text-ink-muted">{formatDate(post.postedAt)}</p>}
        {post.transcript && (
          <div className="rounded-xl border border-ink/[0.06] bg-surface">
            <button
              type="button"
              onClick={() => setTranscriptOpen((o) => !o)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-[13px] font-medium text-ink"
            >
              <span>Transcrição</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={transcriptOpen ? 'rotate-180 transition-transform' : 'transition-transform'}>
                <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {transcriptOpen && (
              <p className="select-text border-t border-ink/[0.06] px-3 py-2.5 text-[12px] leading-relaxed text-ink-muted">{post.transcript}</p>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <a
            href={post.postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-full border border-ink/[0.12] px-3 py-1.5 text-center text-[12px] font-medium text-ink hover:bg-ink/[0.04]"
          >
            Ver no TikTok
          </a>
          {post.transcript && (
            <button
              type="button"
              onClick={() => onXPost({
                transcript: post.transcript!,
                accountId: '',
              })}
              className="flex items-center gap-1 rounded-full border border-ink/[0.12] px-3 py-1.5 text-[12px] font-medium text-ink-muted hover:bg-ink/[0.04] hover:text-ink"
              title="Criar post no X"
            >
              <span className="font-bold text-[13px]">𝕏</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function PostDrawer({ post, onClose, onScrapeReels, onXPost }: { post: Post; onClose: () => void; onScrapeReels?: () => void; onXPost?: (t: XPostTarget) => void }) {
  const slides = post.carouselImages?.length ? post.carouselImages : null
  const [slideIndex, setSlideIndex] = useState(0)
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const isReel = post.format === 'Reels'
  const hasVideo = isReel && !!post.videoUrl
  const notProcessed = isReel && !post.videoUrl && !post.transcript

  useEffect(() => { setSlideIndex(0) }, [post.id])
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
              <div className="relative">
                <img src={slides[slideIndex]} alt={`${post.title} — slide ${slideIndex + 1}`} className="h-64 w-full object-cover" />
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
  const { instagramAccounts, isLoading: accountsLoading, loadError: accountsError } = useAppWorkspace()

  const [activeTab, setActiveTab] = useState<ActiveTab>('instagram-posts')
  const [filterWorkspace, setFilterWorkspace] = useState('')
  const [xPostTarget, setXPostTarget] = useState<XPostTarget | null>(null)

  const [igAccountId, setIgAccountId] = useState('')
  const [igDateFrom, setIgDateFrom] = useState('2026-01-01')
  const [igDateTo, setIgDateTo] = useState('2026-03-31')
  const [igFormat, setIgFormat] = useState('')
  const [igPage, setIgPage] = useState(1)
  const [igView, setIgView] = useState<'posts' | 'galeria'>('posts')
  const [igPosts, setIgPosts] = useState<PostsResponse | null>(null)
  const [igPostsLoading, setIgPostsLoading] = useState(false)
  const [igError, setIgError] = useState<string | null>(null)
  const [igStats, setIgStats] = useState<AccountStats | null>(null)
  const [igStatsLoading, setIgStatsLoading] = useState(false)
  const [drawerPost, setDrawerPost] = useState<Post | null>(null)
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

  const selectedAccount = visibleIgAccounts.find((a) => a.id === igAccountId)
  const selectedTiktokAccount = visibleTiktokAccounts.find((a) => a.id === tiktokAccountId)
  const igTotalPages = igPosts ? Math.ceil(igPosts.total / PAGE_LIMIT) : 1
  const recentPosts = igStats?.recentPosts ?? []
  const avgLikes = avg(recentPosts.map((p) => p.likes))
  const posts = igPosts?.data ?? []

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
          onCreate={(_post: TwitterLikePost) => setXPostTarget(null)}
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
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1 rounded-xl border border-ink/[0.08] bg-surface p-1">
                  {(['posts', 'galeria'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setIgView(tab)}
                      className={[
                        'rounded-lg px-4 py-1.5 text-[14px] font-medium capitalize transition',
                        igView === tab ? 'bg-card text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
                      ].join(' ')}
                    >
                      {tab === 'posts' ? 'Posts' : 'Galeria'}
                    </button>
                  ))}
                </div>
                {igPosts && <p className="text-[13px] text-ink-muted">{igPosts.total.toLocaleString('pt-BR')} publicação(ões)</p>}
              </div>

              {igPostsLoading ? (
                <div className="h-48 animate-pulse rounded-2xl bg-ink/[0.06]" />
              ) : igView === 'posts' ? (
                <>
                  <div className="overflow-hidden rounded-2xl border border-ink/[0.06] bg-card shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[680px] text-left text-[14px]">
                        <thead>
                          <tr className="border-b border-ink/[0.06] bg-surface text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                            <th className="w-12 px-3 py-3" />
                            <th className="px-5 py-3 font-medium">Post</th>
                            <th className="px-5 py-3 font-medium">Publicado em</th>
                            <th className="px-5 py-3 font-medium">Formato</th>
                            <th className="px-5 py-3 font-medium">Curtidas</th>
                            <th className="px-5 py-3 font-medium">Comentários</th>
                          </tr>
                        </thead>
                        <tbody>
                          {posts.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-5 py-10 text-center text-[14px] text-ink-muted">
                                Nenhuma publicação no período.
                              </td>
                            </tr>
                          ) : posts.map((p) => (
                            <tr key={p.id} onClick={() => setDrawerPost(p)} className="cursor-pointer border-b border-ink/[0.04] transition hover:bg-ink/[0.02] last:border-0">
                              <td className="px-3 py-3">
                                <div className="relative" style={{ width: 40, height: 40 }}>
                                  {p.thumbnailUrl ? (
                                    <img src={p.thumbnailUrl} alt={p.title} width={40} height={40} className="rounded object-cover" style={{ width: 40, height: 40 }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                                  ) : (
                                    <ThumbnailPlaceholder />
                                  )}
                                  {(p.carouselImages?.length ?? 0) > 0 && (
                                    <span className="absolute right-0.5 top-0.5 rounded bg-ink/70 px-1 text-[9px] font-semibold leading-tight text-white">⧉{p.carouselImages!.length}</span>
                                  )}
                                </div>
                              </td>
                              <td className="max-w-[220px] px-5 py-3 font-medium text-ink"><span className="line-clamp-2">{p.title}</span></td>
                              <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{formatDate(p.postedAt)}</td>
                              <td className="px-5 py-3">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="inline-flex rounded-full bg-brand/10 px-2.5 py-0.5 text-[12px] font-medium text-brand">{p.format}</span>
                                  {p.transcript && <span className="inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">Transcript</span>}
                                </div>
                              </td>
                              <td className="px-5 py-3 tabular-nums text-ink-muted">{p.likes.toLocaleString('pt-BR')}</td>
                              <td className="px-5 py-3 tabular-nums text-ink-muted">{p.comments.toLocaleString('pt-BR')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <Pagination page={igPage} pages={igTotalPages} total={igPosts?.total ?? 0} label="publicações" onPrev={() => setIgPage((p) => Math.max(1, p - 1))} onNext={() => setIgPage((p) => Math.min(igTotalPages, p + 1))} />
                </>
              ) : (
                <>
                  {posts.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-ink/[0.12] bg-surface px-6 py-16 text-center text-[14px] text-ink-muted">
                      Nenhuma publicação no período.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                      {posts.map((p) => (
                        <button key={p.id} type="button" onClick={() => setDrawerPost(p)} className="group relative overflow-hidden rounded-xl" style={{ aspectRatio: '1/1' }}>
                          {p.thumbnailUrl ? (
                            <img src={p.thumbnailUrl} alt={p.title} className="h-full w-full object-cover transition group-hover:scale-[1.03]" onError={(e) => { const parent = e.currentTarget.parentElement; if (parent) { e.currentTarget.remove(); const ph = document.createElement('div'); ph.className = 'flex h-full w-full items-center justify-center bg-ink/[0.06]'; parent.appendChild(ph) } }} />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-ink/[0.06]">
                              <span className="text-2xl" role="img" aria-label="Imagem indisponível">🖼️</span>
                              <span className="text-[10px] text-ink-subtle">Indisponível</span>
                            </div>
                          )}
                          {(p.carouselImages?.length ?? 0) > 0 && <span className="absolute right-1.5 top-1.5 rounded bg-ink/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">⧉ {p.carouselImages!.length}</span>}
                          {p.format === 'Reels' && p.videoUrl && <span className="absolute left-1.5 top-1.5 rounded bg-ink/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">▶</span>}
                          {p.transcript && <span className="absolute bottom-1.5 right-1.5 z-10 rounded bg-emerald-600/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">T</span>}
                          <div className="absolute inset-0 flex items-center justify-center gap-4 bg-ink/50 text-[13px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                            <span>❤️ {p.likes.toLocaleString('pt-BR')}</span>
                            <span>💬 {p.comments.toLocaleString('pt-BR')}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <Pagination page={igPage} pages={igTotalPages} total={igPosts?.total ?? 0} label="publicações" onPrev={() => setIgPage((p) => Math.max(1, p - 1))} onNext={() => setIgPage((p) => Math.min(igTotalPages, p + 1))} />
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
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="animate-pulse rounded-2xl bg-ink/[0.06]" style={{ aspectRatio: '9/16' }} />
                  ))}
                </div>
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
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {storiesData.data.map((story) => (
                    <DashStoryCard key={story.id} story={story} onXPost={setXPostTarget} />
                  ))}
                </div>
              )}
              {storiesData && (
                <Pagination page={storiesPage} pages={storiesData.pages} total={storiesData.total} label="stories" onPrev={() => setStoriesPage((p) => Math.max(1, p - 1))} onNext={() => setStoriesPage((p) => Math.min(storiesData.pages, p + 1))} />
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
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="animate-pulse rounded-2xl bg-ink/[0.06]" style={{ aspectRatio: '1/1' }} />
                  ))}
                </div>
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
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {tiktokData.data.map((post) => (
                    <DashTikTokCard key={post.id} post={post} onXPost={setXPostTarget} />
                  ))}
                </div>
              )}
              {tiktokData && (
                <Pagination page={tiktokPage} pages={tiktokData.pages} total={tiktokData.total} label="posts" onPrev={() => setTiktokPage((p) => Math.max(1, p - 1))} onNext={() => setTiktokPage((p) => Math.min(tiktokData.pages, p + 1))} />
              )}
            </>
          )}
        </section>
      </div>
    </>
  )
}
