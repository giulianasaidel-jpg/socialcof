import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useAppWorkspace } from '../context/AppWorkspaceContext'

export type TwitterLikePost = {
  id: string
  mode: 'light' | 'dark'
  bodyFontSize: number
  profileName: string
  profileHandle: string
  profileImageUrl: string
  slides: string[]
  slideHtmls: string[]
  caption: string
  sourceTranscript: string
  sourceCaption: string
  sourceNewsId: string | null
  sourceTikTokPostId: string | null
  sourceInstagramStoryId: string | null
  status: 'Rascunho' | 'Aprovado' | 'Publicado'
  generatedAt: string
  createdAt: string
}

type SourceMode = 'post' | 'tiktok' | 'story' | 'news' | 'text' | 'direct'

type MedicalNewsListItem = {
  id: string
  title: string
  summary: string
  source: string
  publishedAt: string
}

type MedicalNewsPageResponse = {
  data: MedicalNewsListItem[]
  total: number
  page: number
  totalPages: number
}

type DashPost = {
  id: string
  title: string
  postedAt: string
  format: string
  thumbnailUrl?: string | null
  transcript?: string | null
}

type PostsPage = {
  data: DashPost[]
  total: number
  page: number
  limit: number
}

type TikTokSourcePost = {
  id: string
  title: string
  thumbnailUrl: string | null
  transcript: string | null
  postedAt: string | null
}

type TikTokSourceResponse = {
  data: TikTokSourcePost[]
  total: number
  page: number
  limit: number
}

type StorySourcePost = {
  id: string
  mediaType: 'image' | 'video'
  thumbnailUrl: string | null
  transcript: string | null
  syncedAt: string
  account: { id: string; displayName: string }
}

type StoriesSourceResponse = {
  data: StorySourcePost[]
  total: number
  page: number
  limit: number
}

type TikTokAccountOption = {
  id: string
  handle: string
  displayName: string
}

type TikTokAccountsResponse = {
  data: TikTokAccountOption[]
}

type AccountBrandingData = {
  id: string
  externalId?: string
  profilePicS3Url?: string | null
}

const POSTS_PER_PAGE = 10

const NEWS_WORKSPACE_LABELS: Record<string, string> = {
  socialcof: 'Social Cof',
  'diretoria-medica': 'Médicos',
  medcof: 'Medcof',
  'professores-medcof': 'Professores',
  concorrentes: 'Concorrentes',
  creators: 'Creators',
}

export const TONE_SUGGESTIONS = [
  'educativo e direto',
  'empático',
  'urgente e impactante',
  'motivacional',
  'informativo',
]

export type GenerateFeedPrefill = {
  mode: 'post' | 'tiktok' | 'story'
  accountId: string
  sourcePostId?: string
  dashPost?: {
    id: string
    title: string
    postedAt: string
    format: string
    thumbnailUrl?: string | null
    transcript?: string | null
  }
  tiktokAccountId?: string
  tiktokPost?: {
    id: string
    title: string
    thumbnailUrl: string | null
    transcript: string | null
    postedAt: string | null
  }
  sourceInstagramStoryId?: string
  story?: {
    id: string
    mediaType: 'image' | 'video'
    thumbnailUrl: string | null
    transcript: string | null
    syncedAt: string
    account: { id: string; displayName: string }
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 3.5h10M5 3.5V2.5h4v1M5.5 6v4M8.5 6v4M3 3.5l.5 8a1 1 0 001 .9h5a1 1 0 001-.9l.5-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function NoTranscriptModal({
  onConfirm,
  onCancel,
  confirming,
}: {
  onConfirm: (description: string) => void
  onCancel: () => void
  confirming: boolean
}) {
  const [description, setDescription] = useState('')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl">
        <h3 className="text-[16px] font-semibold text-ink">Descrição do conteúdo</h3>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
          Este post não possui transcript automático. Descreva o conteúdo para gerarmos os slides.
        </p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          autoFocus
          placeholder="Ex: Neste vídeo falo sobre os critérios diagnósticos de sepse, bundle de 1 hora e manejo inicial…"
          className="mt-4 w-full resize-none rounded-xl border border-ink/[0.1] bg-surface px-3.5 py-2.5 text-[14px] text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-ink/[0.1] px-4 py-2 text-[14px] font-medium text-ink-muted hover:text-ink"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(description)}
            disabled={!description.trim() || confirming}
            className="rounded-lg bg-brand px-4 py-2 text-[14px] font-medium text-white disabled:opacity-60 hover:bg-brand/90"
          >
            {confirming ? 'Gerando…' : 'Gerar slides'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function GeneratePanel({
  onClose,
  onCreate,
  initialTranscript,
  initialAccountId,
  initialNewsSelection,
  initialFeedPrefill,
}: {
  onClose: () => void
  onCreate: (post: TwitterLikePost) => void
  initialTranscript?: string
  initialAccountId?: string
  initialNewsSelection?: {
    id: string
    title: string
    summary?: string
    source?: string
    publishedAt?: string
  }
  initialFeedPrefill?: GenerateFeedPrefill | null
}) {
  const { instagramAccounts, workspaceId, products } = useAppWorkspace()
  const [sourceMode, setSourceMode] = useState<SourceMode>(() => {
    if (initialNewsSelection) return 'news'
    if (initialTranscript) return 'text'
    if (initialFeedPrefill) return initialFeedPrefill.mode
    return 'post'
  })
  const [accountId, setAccountId] = useState(
    () => initialFeedPrefill?.accountId ?? initialAccountId ?? '',
  )
  const [avatarAccountId, setAvatarAccountId] = useState(
    () => initialFeedPrefill?.accountId ?? initialAccountId ?? '',
  )
  const [productId, setProductId] = useState('')
  const [tiktokAccounts, setTiktokAccounts] = useState<TikTokAccountOption[]>([])
  const [tiktokAccountId, setTiktokAccountId] = useState(
    () => (initialFeedPrefill?.mode === 'tiktok' ? initialFeedPrefill.tiktokAccountId ?? '' : ''),
  )
  const [mode, setMode] = useState<'light' | 'dark'>('dark')
  const [bodyFontSize, setBodyFontSize] = useState(20)
  const [profileName, setProfileName] = useState('')
  const [profileHandle, setProfileHandle] = useState('')
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [slideCount, setSlideCount] = useState(5)
  const [tone, setTone] = useState('educativo e direto')
  const [sourcePostId, setSourcePostId] = useState(
    () =>
      initialFeedPrefill?.mode === 'post' && initialFeedPrefill.sourcePostId
        ? initialFeedPrefill.sourcePostId
        : '',
  )
  const [sourceTranscript, setSourceTranscript] = useState(initialTranscript ?? '')
  const [sourceCaption, setSourceCaption] = useState('')
  const [directTexts, setDirectTexts] = useState(['', ''])
  const [dashPosts, setDashPosts] = useState<DashPost[]>([])
  const [dashPostsLoading, setDashPostsLoading] = useState(false)
  const [dashPostsPage, setDashPostsPage] = useState(1)
  const [dashPostsTotal, setDashPostsTotal] = useState(0)
  const [selectedDashPost, setSelectedDashPost] = useState<DashPost | null>(
    () => (initialFeedPrefill?.mode === 'post' && initialFeedPrefill.dashPost ? initialFeedPrefill.dashPost : null),
  )
  const [tiktokPosts, setTiktokPosts] = useState<TikTokSourcePost[]>([])
  const [tiktokPostsLoading, setTiktokPostsLoading] = useState(false)
  const [tiktokPostsPage, setTiktokPostsPage] = useState(1)
  const [tiktokPostsTotal, setTiktokPostsTotal] = useState(0)
  const [selectedTikTokPost, setSelectedTikTokPost] = useState<TikTokSourcePost | null>(
    () =>
      initialFeedPrefill?.mode === 'tiktok' && initialFeedPrefill.tiktokPost
        ? initialFeedPrefill.tiktokPost
        : null,
  )
  const [stories, setStories] = useState<StorySourcePost[]>([])
  const [storiesLoading, setStoriesLoading] = useState(false)
  const [storiesPage, setStoriesPage] = useState(1)
  const [storiesTotal, setStoriesTotal] = useState(0)
  const [selectedStory, setSelectedStory] = useState<StorySourcePost | null>(
    () => (initialFeedPrefill?.mode === 'story' && initialFeedPrefill.story ? initialFeedPrefill.story : null),
  )
  const [newsItems, setNewsItems] = useState<MedicalNewsListItem[]>([])
  const [newsLoading, setNewsLoading] = useState(false)
  const [newsPage, setNewsPage] = useState(1)
  const [newsTotalPages, setNewsTotalPages] = useState(1)
  const [newsWorkspaceFilter, setNewsWorkspaceFilter] = useState<string | null>(() => workspaceId)
  const [selectedNews, setSelectedNews] = useState<MedicalNewsListItem | null>(() =>
    initialNewsSelection
      ? {
          id: initialNewsSelection.id,
          title: initialNewsSelection.title,
          summary: initialNewsSelection.summary ?? '',
          source: initialNewsSelection.source ?? '',
          publishedAt: initialNewsSelection.publishedAt ?? '',
        }
      : null,
  )
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noTranscriptBody, setNoTranscriptBody] = useState<Record<string, unknown> | null>(null)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const newsWorkspaceOptions = useMemo(() => {
    const ids = new Set<string>()
    ids.add('socialcof')
    ids.add('diretoria-medica')
    for (const a of instagramAccounts) {
      if (a.workspace) ids.add(a.workspace)
    }
    return [...ids].sort((x, y) => x.localeCompare(y))
  }, [instagramAccounts])

  useEffect(() => {
    setNewsWorkspaceFilter(workspaceId)
  }, [workspaceId])

  useEffect(() => {
    setNewsPage(1)
  }, [newsWorkspaceFilter])

  useEffect(() => {
    if (!initialFeedPrefill) return
    setSourceMode(initialFeedPrefill.mode)
    setAccountId(initialFeedPrefill.accountId)
    setAvatarAccountId(initialFeedPrefill.accountId)
    setError(null)
    if (initialFeedPrefill.mode === 'post') {
      if (initialFeedPrefill.sourcePostId) setSourcePostId(initialFeedPrefill.sourcePostId)
      if (initialFeedPrefill.dashPost) setSelectedDashPost(initialFeedPrefill.dashPost)
    }
    if (initialFeedPrefill.mode === 'tiktok') {
      if (initialFeedPrefill.tiktokAccountId) setTiktokAccountId(initialFeedPrefill.tiktokAccountId)
      if (initialFeedPrefill.tiktokPost) setSelectedTikTokPost(initialFeedPrefill.tiktokPost)
    }
    if (initialFeedPrefill.mode === 'story') {
      if (initialFeedPrefill.story) setSelectedStory(initialFeedPrefill.story)
    }
  }, [initialFeedPrefill])

  useEffect(() => {
    if (initialFeedPrefill?.accountId) return
    if (!accountId && instagramAccounts.length > 0) {
      setAccountId(instagramAccounts[0].id)
    }
    if (!avatarAccountId && instagramAccounts.length > 0) {
      setAvatarAccountId(instagramAccounts[0].id)
    }
  }, [instagramAccounts, accountId, avatarAccountId, initialFeedPrefill])

  useEffect(() => {
    if (!productId && products.length > 0) {
      setProductId(products[0].id)
    }
  }, [products, productId])

  useEffect(() => {
    api
      .get<TikTokAccountsResponse>('/tiktok-accounts?limit=100')
      .then((res) => setTiktokAccounts(res.data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const account = instagramAccounts.find((a) => a.id === avatarAccountId)
    if (!account) return
    setProfileHandle(account.handle)
    setProfileName((prev) => prev || account.displayName)
  }, [avatarAccountId, instagramAccounts])

  useEffect(() => {
    if (!avatarAccountId) return
    api
      .get<AccountBrandingData[]>('/instagram-accounts')
      .then((accounts) => {
        const found = accounts.find((a) => (a.externalId ?? a.id) === avatarAccountId)
        setProfileImageUrl(found?.profilePicS3Url ?? '')
      })
      .catch(() => {})
  }, [avatarAccountId])

  useEffect(() => {
    if (sourceMode !== 'post' || !accountId) return
    setDashPostsLoading(true)
    const params = new URLSearchParams({
      accountId,
      page: String(dashPostsPage),
      limit: String(POSTS_PER_PAGE),
    })
    api
      .get<PostsPage>(`/posts?${params}`)
      .then((res) => {
        setDashPosts(res.data)
        setDashPostsTotal(res.total)
      })
      .catch(() => setDashPosts([]))
      .finally(() => setDashPostsLoading(false))
  }, [sourceMode, accountId, dashPostsPage])

  useEffect(() => {
    if (sourceMode !== 'post' || dashPostsLoading || !initialFeedPrefill?.dashPost) return
    const dp = initialFeedPrefill.dashPost
    setDashPosts((prev) => (prev.some((p) => p.id === dp.id) ? prev : [dp, ...prev]))
  }, [sourceMode, dashPostsLoading, initialFeedPrefill])

  useEffect(() => {
    if (sourceMode !== 'tiktok' || tiktokPostsLoading || !initialFeedPrefill?.tiktokPost) return
    const tp = initialFeedPrefill.tiktokPost
    setTiktokPosts((prev) => (prev.some((p) => p.id === tp.id) ? prev : [tp, ...prev]))
  }, [sourceMode, tiktokPostsLoading, initialFeedPrefill])

  useEffect(() => {
    if (sourceMode !== 'story' || storiesLoading || !initialFeedPrefill?.story) return
    const st = initialFeedPrefill.story
    setStories((prev) => (prev.some((p) => p.id === st.id) ? prev : [st, ...prev]))
  }, [sourceMode, storiesLoading, initialFeedPrefill])

  useEffect(() => {
    if (sourceMode !== 'tiktok') return
    setTiktokPostsLoading(true)
    const params = new URLSearchParams({ page: String(tiktokPostsPage), limit: String(POSTS_PER_PAGE) })
    if (tiktokAccountId) params.set('accountId', tiktokAccountId)
    api
      .get<TikTokSourceResponse>(`/tiktok-accounts/posts?${params}`)
      .then((res) => {
        setTiktokPosts(res.data)
        setTiktokPostsTotal(res.total)
      })
      .catch(() => setTiktokPosts([]))
      .finally(() => setTiktokPostsLoading(false))
  }, [sourceMode, tiktokPostsPage, tiktokAccountId])

  useEffect(() => {
    if (sourceMode !== 'news') return
    setNewsLoading(true)
    const params = new URLSearchParams({ page: String(newsPage), limit: String(POSTS_PER_PAGE) })
    if (newsWorkspaceFilter) params.set('workspace', newsWorkspaceFilter)
    api
      .get<MedicalNewsPageResponse>(`/medical-news?${params}`)
      .then((res) => {
        setNewsItems(res.data)
        setNewsTotalPages(Math.max(1, res.totalPages))
      })
      .catch(() => {
        setNewsItems([])
        setNewsTotalPages(1)
      })
      .finally(() => setNewsLoading(false))
  }, [sourceMode, newsPage, newsWorkspaceFilter])

  useEffect(() => {
    if (sourceMode !== 'story' || !workspaceId) return
    setStoriesLoading(true)
    const params = new URLSearchParams({ workspace: workspaceId, page: String(storiesPage), limit: String(POSTS_PER_PAGE) })
    if (accountId) params.set('accountId', accountId)
    api
      .get<StoriesSourceResponse>(`/instagram-stories?${params}`)
      .then((res) => {
        setStories(res.data)
        setStoriesTotal(res.total)
      })
      .catch(() => setStories([]))
      .finally(() => setStoriesLoading(false))
  }, [sourceMode, workspaceId, storiesPage, accountId])

  function addDirectText() {
    setDirectTexts((prev) => [...prev, ''])
  }

  function removeDirectText(i: number) {
    setDirectTexts((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateDirectText(i: number, val: string) {
    setDirectTexts((prev) => prev.map((t, idx) => (idx === i ? val : t)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (sourceMode === 'news' && !selectedNews) {
      setError('Selecione uma notícia do feed.')
      return
    }
    setGenerating(true)

    const body: Record<string, unknown> = {
      accountId,
      productId,
      mode,
      bodyFontSize,
      ...(profileName && { profileName }),
      ...(profileHandle && { profileHandle }),
      ...(profileImageUrl && { profileImageUrl }),
    }

    if (sourceMode === 'post') {
      body.sourcePostId = sourcePostId
      body.slideCount = slideCount
      body.tone = tone
    } else if (sourceMode === 'tiktok') {
      body.sourceTikTokPostId = selectedTikTokPost?.id
      body.slideCount = slideCount
      body.tone = tone
    } else if (sourceMode === 'story') {
      body.sourceInstagramStoryId = selectedStory?.id
      body.slideCount = slideCount
      body.tone = tone
    } else if (sourceMode === 'news') {
      body.sourceNewsId = selectedNews!.id
      body.slideCount = slideCount
      body.tone = tone
    } else if (sourceMode === 'text') {
      if (sourceTranscript) body.sourceTranscript = sourceTranscript
      if (sourceCaption) body.sourceCaption = sourceCaption
      body.slideCount = slideCount
      body.tone = tone
    } else {
      body.texts = directTexts.filter(Boolean)
    }

    try {
      const post = await api.post<TwitterLikePost>('/twitter-posts/generate', body)
      onCreate(post)
      onClose()
    } catch (err) {
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message) as { code?: string }
          if (parsed.code === 'NO_TRANSCRIPT') {
            setNoTranscriptBody(body)
            return
          }
        } catch {
        }
      }
      setError(err instanceof Error ? err.message : 'Erro ao gerar post.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleRetryWithDescription(description: string) {
    if (!noTranscriptBody) return
    setRetrying(true)
    try {
      const post = await api.post<TwitterLikePost>('/twitter-posts/generate', {
        ...noTranscriptBody,
        sourceTranscript: description,
      })
      onCreate(post)
      onClose()
      setNoTranscriptBody(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar post.')
      setNoTranscriptBody(null)
    } finally {
      setRetrying(false)
    }
  }

  const inputCls =
    'w-full rounded-xl border border-ink/[0.1] bg-surface px-3.5 py-2.5 text-[14px] text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-brand/30'
  const labelCls = 'mb-1.5 block text-[13px] font-medium text-ink'

  return (
    <>
      {noTranscriptBody && (
        <NoTranscriptModal
          onConfirm={handleRetryWithDescription}
          onCancel={() => setNoTranscriptBody(null)}
          confirming={retrying}
        />
      )}

      <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-start">
        <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
        <aside className="relative z-10 flex h-full w-full max-w-xl flex-col overflow-y-auto bg-card shadow-2xl sm:h-screen">
          <div className="flex items-center justify-between border-b border-ink/[0.06] px-5 py-4">
            <p className="text-[15px] font-semibold text-ink">Gerar Twitter Post</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink-muted hover:bg-ink/[0.06]"
            >
              <CloseIcon />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-5">
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                Fonte do conteúdo
              </label>
              <div className="flex gap-px overflow-hidden rounded-xl border border-ink/[0.08] bg-surface p-0.5">
                {(
                  [
                    { id: 'post' as SourceMode, label: 'Post' },
                    { id: 'tiktok' as SourceMode, label: 'TikTok' },
                    { id: 'story' as SourceMode, label: 'Story' },
                    { id: 'news' as SourceMode, label: 'Notícia' },
                    { id: 'text' as SourceMode, label: 'Texto' },
                    { id: 'direct' as SourceMode, label: 'Direto' },
                  ] as const
                ).map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setSourceMode(id)
                      if (id !== 'post') {
                        setSelectedDashPost(null)
                        setSourcePostId('')
                      } else {
                        setDashPostsPage(1)
                      }
                      if (id !== 'tiktok') {
                        setSelectedTikTokPost(null)
                        setTiktokPostsPage(1)
                        setTiktokAccountId('')
                      }
                      if (id !== 'story') {
                        setSelectedStory(null)
                        setStoriesPage(1)
                      }
                      if (id !== 'news') {
                        setSelectedNews(null)
                      } else {
                        setNewsPage(1)
                      }
                    }}
                    className={[
                      'flex-1 rounded-[9px] px-2 py-2 text-[13px] font-medium transition',
                      sourceMode === id
                        ? 'bg-card text-ink shadow-sm'
                        : 'text-ink-muted hover:text-ink',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {sourceMode === 'post' && (
              <div className="flex flex-col gap-3">
                <div>
                  <label className={labelCls}>Conta fonte</label>
                  <select
                    value={accountId}
                    onChange={(e) => {
                      setAccountId(e.target.value)
                      setSelectedDashPost(null)
                      setSourcePostId('')
                      setDashPostsPage(1)
                    }}
                    className={inputCls}
                  >
                    {instagramAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <label className={labelCls}>Selecionar post</label>

                {selectedDashPost && (
                  <div className="flex items-center gap-3 rounded-xl border border-brand/30 bg-brand/5 px-3 py-2.5">
                    {selectedDashPost.thumbnailUrl ? (
                      <img
                        src={selectedDashPost.thumbnailUrl}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-ink/[0.06] text-[11px] text-ink-subtle">
                        🖼️
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">
                        {selectedDashPost.title}
                      </p>
                      <p className="text-[11px] text-ink-subtle">
                        {selectedDashPost.format} · {formatDate(selectedDashPost.postedAt)}
                      </p>
                      {selectedDashPost.transcript && (
                        <span className="mt-1 inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                          Transcript disponível
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-[13px] text-brand">✓</span>
                  </div>
                )}

                {dashPostsLoading ? (
                  <div className="flex flex-col gap-2">
                    {[1, 2, 3].map((k) => (
                      <div key={k} className="h-14 animate-pulse rounded-xl bg-ink/[0.06]" />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-ink/[0.08]">
                    {dashPosts.filter((p) => p.transcript).length === 0 ? (
                      <p className="px-4 py-6 text-center text-[13px] text-ink-muted">
                        Nenhum post com transcript encontrado.
                      </p>
                    ) : (
                      dashPosts.filter((p) => p.transcript).map((post) => (
                        <button
                          key={post.id}
                          type="button"
                          onClick={() => {
                            setSelectedDashPost(post)
                            setSourcePostId(post.id)
                          }}
                          className={[
                            'flex w-full items-center gap-3 border-b border-ink/[0.05] px-3 py-2.5 text-left transition last:border-0 hover:bg-ink/[0.03]',
                            selectedDashPost?.id === post.id ? 'bg-brand/5' : '',
                          ].join(' ')}
                        >
                          {post.thumbnailUrl ? (
                            <img
                              src={post.thumbnailUrl}
                              alt=""
                              className="h-9 w-9 shrink-0 rounded object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-ink/[0.06] text-[11px] text-ink-subtle">
                              🖼️
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium text-ink">{post.title}</p>
                            <p className="text-[11px] text-ink-subtle">
                              {post.format} · {formatDate(post.postedAt)}
                              {post.transcript && (
                                <span className="ml-1.5 font-medium text-emerald-600 dark:text-emerald-400">· Transcript</span>
                              )}
                            </p>
                          </div>
                          {selectedDashPost?.id === post.id && (
                            <span className="shrink-0 text-[13px] text-brand">✓</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}

                {dashPostsTotal > POSTS_PER_PAGE && (
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setDashPostsPage((p) => Math.max(1, p - 1))}
                      disabled={dashPostsPage <= 1}
                      className="rounded-lg border border-ink/[0.1] px-3 py-1.5 text-[13px] font-medium text-ink-muted disabled:opacity-30 hover:text-ink"
                    >
                      Anterior
                    </button>
                    <span className="text-[12px] text-ink-muted">
                      Página {dashPostsPage} de {Math.ceil(dashPostsTotal / POSTS_PER_PAGE)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setDashPostsPage((p) =>
                          Math.min(Math.ceil(dashPostsTotal / POSTS_PER_PAGE), p + 1),
                        )
                      }
                      disabled={dashPostsPage >= Math.ceil(dashPostsTotal / POSTS_PER_PAGE)}
                      className="rounded-lg border border-ink/[0.1] px-3 py-1.5 text-[13px] font-medium text-ink-muted disabled:opacity-30 hover:text-ink"
                    >
                      Próxima
                    </button>
                  </div>
                )}
              </div>
            )}

            {sourceMode === 'tiktok' && (
              <div className="flex flex-col gap-3">
                <div>
                  <label className={labelCls}>Conta TikTok</label>
                  <select
                    value={tiktokAccountId}
                    onChange={(e) => {
                      setTiktokAccountId(e.target.value)
                      setSelectedTikTokPost(null)
                      setTiktokPostsPage(1)
                    }}
                    className={inputCls}
                  >
                    <option value="">Todas as contas</option>
                    {tiktokAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.displayName} (@{a.handle})
                      </option>
                    ))}
                  </select>
                </div>

                <label className={labelCls}>Selecionar post</label>

                {selectedTikTokPost && (
                  <div className="flex items-center gap-3 rounded-xl border border-brand/30 bg-brand/5 px-3 py-2.5">
                    {selectedTikTokPost.thumbnailUrl ? (
                      <img
                        src={selectedTikTokPost.thumbnailUrl}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-ink/[0.06] text-[11px] text-ink-subtle">
                        🎵
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">
                        {selectedTikTokPost.title}
                      </p>
                      {selectedTikTokPost.transcript ? (
                        <span className="mt-1 inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                          Transcript disponível
                        </span>
                      ) : (
                        <span className="mt-1 inline-flex rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                          Sem transcript
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-[13px] text-brand">✓</span>
                  </div>
                )}

                {tiktokPostsLoading ? (
                  <div className="flex flex-col gap-2">
                    {[1, 2, 3].map((k) => (
                      <div key={k} className="h-14 animate-pulse rounded-xl bg-ink/[0.06]" />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-ink/[0.08]">
                    {tiktokPosts.filter((p) => p.transcript).length === 0 ? (
                      <p className="px-4 py-6 text-center text-[13px] text-ink-muted">
                        Nenhum post TikTok com transcript encontrado.
                      </p>
                    ) : (
                      tiktokPosts.filter((p) => p.transcript).map((post) => (
                        <button
                          key={post.id}
                          type="button"
                          onClick={() => setSelectedTikTokPost(post)}
                          className={[
                            'flex w-full items-center gap-3 border-b border-ink/[0.05] px-3 py-2.5 text-left transition last:border-0 hover:bg-ink/[0.03]',
                            selectedTikTokPost?.id === post.id ? 'bg-brand/5' : '',
                          ].join(' ')}
                        >
                          {post.thumbnailUrl ? (
                            <img
                              src={post.thumbnailUrl}
                              alt=""
                              className="h-9 w-9 shrink-0 rounded object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-ink/[0.06] text-[11px] text-ink-subtle">
                              🎵
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium text-ink">{post.title}</p>
                            <p className="text-[11px] text-ink-subtle">
                              {post.postedAt ? formatDate(post.postedAt) : '—'}
                              {post.transcript && (
                                <span className="ml-1.5 font-medium text-emerald-600 dark:text-emerald-400">· Transcript</span>
                              )}
                            </p>
                          </div>
                          {selectedTikTokPost?.id === post.id && (
                            <span className="shrink-0 text-[13px] text-brand">✓</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}

                {tiktokPostsTotal > POSTS_PER_PAGE && (
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setTiktokPostsPage((p) => Math.max(1, p - 1))}
                      disabled={tiktokPostsPage <= 1}
                      className="rounded-lg border border-ink/[0.1] px-3 py-1.5 text-[13px] font-medium text-ink-muted disabled:opacity-30 hover:text-ink"
                    >
                      Anterior
                    </button>
                    <span className="text-[12px] text-ink-muted">
                      Página {tiktokPostsPage} de {Math.ceil(tiktokPostsTotal / POSTS_PER_PAGE)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTiktokPostsPage((p) => Math.min(Math.ceil(tiktokPostsTotal / POSTS_PER_PAGE), p + 1))}
                      disabled={tiktokPostsPage >= Math.ceil(tiktokPostsTotal / POSTS_PER_PAGE)}
                      className="rounded-lg border border-ink/[0.1] px-3 py-1.5 text-[13px] font-medium text-ink-muted disabled:opacity-30 hover:text-ink"
                    >
                      Próxima
                    </button>
                  </div>
                )}
              </div>
            )}

            {sourceMode === 'story' && (
              <div className="flex flex-col gap-3">
                <div>
                  <label className={labelCls}>Conta fonte</label>
                  <select
                    value={accountId}
                    onChange={(e) => {
                      setAccountId(e.target.value)
                      setSelectedStory(null)
                      setStoriesPage(1)
                    }}
                    className={inputCls}
                  >
                    {instagramAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <label className={labelCls}>Selecionar Instagram Story</label>

                {selectedStory && (
                  <div className="flex items-center gap-3 rounded-xl border border-brand/30 bg-brand/5 px-3 py-2.5">
                    {selectedStory.thumbnailUrl ? (
                      <img
                        src={selectedStory.thumbnailUrl}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-ink/[0.06] text-[11px] text-ink-subtle">
                        📸
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">
                        {selectedStory.account.displayName} · {selectedStory.mediaType}
                      </p>
                      {selectedStory.transcript ? (
                        <span className="mt-1 inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                          Transcript disponível
                        </span>
                      ) : (
                        <span className="mt-1 inline-flex rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                          Sem transcript
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-[13px] text-brand">✓</span>
                  </div>
                )}

                {storiesLoading ? (
                  <div className="flex flex-col gap-2">
                    {[1, 2, 3].map((k) => (
                      <div key={k} className="h-14 animate-pulse rounded-xl bg-ink/[0.06]" />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-ink/[0.08]">
                    {stories.filter((s) => s.transcript).length === 0 ? (
                      <p className="px-4 py-6 text-center text-[13px] text-ink-muted">
                        Nenhum story com transcript encontrado.
                      </p>
                    ) : (
                      stories.filter((s) => s.transcript).map((story) => (
                        <button
                          key={story.id}
                          type="button"
                          onClick={() => setSelectedStory(story)}
                          className={[
                            'flex w-full items-center gap-3 border-b border-ink/[0.05] px-3 py-2.5 text-left transition last:border-0 hover:bg-ink/[0.03]',
                            selectedStory?.id === story.id ? 'bg-brand/5' : '',
                          ].join(' ')}
                        >
                          {story.thumbnailUrl ? (
                            <img
                              src={story.thumbnailUrl}
                              alt=""
                              className="h-9 w-9 shrink-0 rounded object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-ink/[0.06] text-[11px] text-ink-subtle">
                              📸
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium text-ink">
                              {story.account.displayName} · {story.mediaType}
                            </p>
                            <p className="text-[11px] text-ink-subtle">
                              {formatDate(story.syncedAt)}
                              {story.transcript && (
                                <span className="ml-1.5 font-medium text-emerald-600 dark:text-emerald-400">· Transcript</span>
                              )}
                            </p>
                          </div>
                          {selectedStory?.id === story.id && (
                            <span className="shrink-0 text-[13px] text-brand">✓</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}

                {storiesTotal > POSTS_PER_PAGE && (
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setStoriesPage((p) => Math.max(1, p - 1))}
                      disabled={storiesPage <= 1}
                      className="rounded-lg border border-ink/[0.1] px-3 py-1.5 text-[13px] font-medium text-ink-muted disabled:opacity-30 hover:text-ink"
                    >
                      Anterior
                    </button>
                    <span className="text-[12px] text-ink-muted">
                      Página {storiesPage} de {Math.ceil(storiesTotal / POSTS_PER_PAGE)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setStoriesPage((p) => Math.min(Math.ceil(storiesTotal / POSTS_PER_PAGE), p + 1))}
                      disabled={storiesPage >= Math.ceil(storiesTotal / POSTS_PER_PAGE)}
                      className="rounded-lg border border-ink/[0.1] px-3 py-1.5 text-[13px] font-medium text-ink-muted disabled:opacity-30 hover:text-ink"
                    >
                      Próxima
                    </button>
                  </div>
                )}
              </div>
            )}

            {sourceMode === 'news' && (
              <div className="flex flex-col gap-3">
                <label className={labelCls}>Notícia do feed (sites)</label>
                <div>
                  <p className="mb-1.5 text-[12px] font-medium text-ink-muted">Workspace das notícias</p>
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                    <button
                      type="button"
                      onClick={() => setNewsWorkspaceFilter(null)}
                      className={[
                        'shrink-0 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors',
                        newsWorkspaceFilter === null
                          ? 'border-transparent bg-ink text-surface'
                          : 'border-ink/[0.1] text-ink-muted hover:border-ink/20 hover:text-ink',
                      ].join(' ')}
                    >
                      Todos
                    </button>
                    {newsWorkspaceOptions.map((ws) => (
                      <button
                        key={ws}
                        type="button"
                        onClick={() => setNewsWorkspaceFilter(ws)}
                        className={[
                          'shrink-0 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors',
                          newsWorkspaceFilter === ws
                            ? 'border-transparent bg-ink text-surface'
                            : 'border-ink/[0.1] text-ink-muted hover:border-ink/20 hover:text-ink',
                        ].join(' ')}
                      >
                        {NEWS_WORKSPACE_LABELS[ws] ?? ws}
                      </button>
                    ))}
                  </div>
                </div>
                {selectedNews && (
                  <div className="flex items-start gap-3 rounded-xl border border-brand/30 bg-brand/5 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[13px] font-medium text-ink">{selectedNews.title}</p>
                      <p className="mt-0.5 text-[11px] text-ink-subtle">
                        {selectedNews.source || '—'}
                        {selectedNews.publishedAt ? (
                          <>
                            <span className="mx-1 opacity-40">·</span>
                            {formatDate(selectedNews.publishedAt)}
                          </>
                        ) : null}
                      </p>
                      {selectedNews.summary ? (
                        <p className="mt-1 line-clamp-2 text-[12px] text-ink-muted">{selectedNews.summary}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-[13px] text-brand">✓</span>
                  </div>
                )}

                {newsLoading ? (
                  <div className="flex flex-col gap-2">
                    {[1, 2, 3].map((k) => (
                      <div key={k} className="h-14 animate-pulse rounded-xl bg-ink/[0.06]" />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-ink/[0.08]">
                    {newsItems.length === 0 ? (
                      <p className="px-4 py-6 text-center text-[13px] text-ink-muted">
                        Nenhuma notícia encontrada.
                      </p>
                    ) : (
                      newsItems.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => setSelectedNews(n)}
                          className={[
                            'flex w-full items-start gap-3 border-b border-ink/[0.05] px-3 py-2.5 text-left transition last:border-0 hover:bg-ink/[0.03]',
                            selectedNews?.id === n.id ? 'bg-brand/5' : '',
                          ].join(' ')}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-[13px] font-medium text-ink">{n.title}</p>
                            <p className="mt-0.5 text-[11px] text-ink-subtle">
                              {n.source}
                              <span className="mx-1 opacity-40">·</span>
                              {formatDate(n.publishedAt)}
                            </p>
                          </div>
                          {selectedNews?.id === n.id && (
                            <span className="shrink-0 text-[13px] text-brand">✓</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}

                {newsTotalPages > 1 && (
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setNewsPage((p) => Math.max(1, p - 1))}
                      disabled={newsPage <= 1}
                      className="rounded-lg border border-ink/[0.1] px-3 py-1.5 text-[13px] font-medium text-ink-muted disabled:opacity-30 hover:text-ink"
                    >
                      Anterior
                    </button>
                    <span className="text-[12px] text-ink-muted">
                      Página {newsPage} de {newsTotalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setNewsPage((p) => Math.min(newsTotalPages, p + 1))}
                      disabled={newsPage >= newsTotalPages}
                      className="rounded-lg border border-ink/[0.1] px-3 py-1.5 text-[13px] font-medium text-ink-muted disabled:opacity-30 hover:text-ink"
                    >
                      Próxima
                    </button>
                  </div>
                )}
              </div>
            )}

            {sourceMode === 'text' && (
              <div className="flex flex-col gap-4">
                <div>
                  <label className={labelCls}>Transcript</label>
                  <textarea
                    value={sourceTranscript}
                    onChange={(e) => setSourceTranscript(e.target.value)}
                    rows={4}
                    placeholder="Cole o transcript do vídeo…"
                    className="w-full resize-none rounded-xl border border-ink/[0.1] bg-surface px-3.5 py-2.5 text-[14px] text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
                <div>
                  <label className={labelCls}>Legenda</label>
                  <textarea
                    value={sourceCaption}
                    onChange={(e) => setSourceCaption(e.target.value)}
                    rows={3}
                    placeholder="Cole a legenda do post…"
                    className="w-full resize-none rounded-xl border border-ink/[0.1] bg-surface px-3.5 py-2.5 text-[14px] text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
              </div>
            )}

            {sourceMode === 'direct' && (
              <div className="flex flex-col gap-3">
                <label className={labelCls}>Textos dos slides</label>
                {directTexts.map((text, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="mt-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[11px] font-bold text-brand">
                      {i + 1}
                    </div>
                    <textarea
                      value={text}
                      onChange={(e) => updateDirectText(i, e.target.value)}
                      rows={2}
                      placeholder={`Texto do slide ${i + 1}…`}
                      className="flex-1 resize-none rounded-xl border border-ink/[0.1] bg-surface px-3.5 py-2.5 text-[14px] text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                    {directTexts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDirectText(i)}
                        className="mt-3 rounded-lg p-1.5 text-ink-muted hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                        aria-label="Remover slide"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addDirectText}
                  className="self-start rounded-lg border border-dashed border-ink/[0.15] px-3.5 py-2 text-[13px] font-medium text-ink-muted hover:border-brand/30 hover:text-brand"
                >
                  + Adicionar slide
                </button>
              </div>
            )}

            {sourceMode !== 'tiktok' && sourceMode !== 'post' && sourceMode !== 'story' && (
              <div>
                <label className={labelCls}>Conta fonte</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className={inputCls}
                >
                  {instagramAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.displayName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className={labelCls}>Conta do perfil (avatar)</label>
              <p className="mb-1.5 text-[12px] text-ink-subtle">
                Define o avatar, nome e handle exibidos no card. Independente da conta fonte.
              </p>
              <select
                value={avatarAccountId}
                onChange={(e) => setAvatarAccountId(e.target.value)}
                className={inputCls}
              >
                {instagramAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.displayName} (@{a.handle})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Produto</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className={inputCls}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-medium text-ink">Modo visual</label>
              <div className="flex gap-2">
                {(['dark', 'light'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={[
                      'flex-1 rounded-xl border px-4 py-2.5 text-[14px] font-medium transition',
                      mode === m
                        ? 'border-brand/40 bg-brand/10 text-brand'
                        : 'border-ink/[0.1] text-ink-muted hover:border-brand/20',
                    ].join(' ')}
                  >
                    {m === 'dark' ? '🌑 Escuro' : '☀️ Claro'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className={labelCls}>Tamanho do texto</label>
                <span className="text-[12px] tabular-nums text-ink-muted">{bodyFontSize}px</span>
              </div>
              <input
                type="range"
                min={14}
                max={28}
                value={bodyFontSize}
                onChange={(e) => setBodyFontSize(Number(e.target.value))}
                className="w-full accent-brand"
              />
              <div className="mt-0.5 flex justify-between text-[11px] text-ink-subtle">
                <span>14</span>
                <span>28</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Nome do perfil</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="MedCof"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Handle</label>
                <input
                  type="text"
                  value={profileHandle}
                  onChange={(e) => setProfileHandle(e.target.value)}
                  placeholder="augustocelho.medcof"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>
                Avatar
                {profileImageUrl && (
                  <span className="ml-2 text-[11px] font-normal text-ink-subtle">
                    preenchido do branding
                  </span>
                )}
              </label>
              <div className="flex items-center gap-2">
                {profileImageUrl && (
                  <img
                    src={profileImageUrl}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                  />
                )}
                <input
                  type="url"
                  value={profileImageUrl}
                  onChange={(e) => setProfileImageUrl(e.target.value)}
                  placeholder="https://…"
                  className={inputCls}
                />
              </div>
            </div>

            {sourceMode !== 'direct' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Nº de slides</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={slideCount}
                    onChange={(e) => setSlideCount(Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Tom</label>
                  <input
                    type="text"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    list="tone-suggestions"
                    placeholder="educativo e direto"
                    className={inputCls}
                  />
                  <datalist id="tone-suggestions">
                    {TONE_SUGGESTIONS.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={
                generating ||
                (sourceMode === 'news' && !selectedNews) ||
                (sourceMode === 'post' && !sourcePostId) ||
                (sourceMode === 'tiktok' && !selectedTikTokPost) ||
                (sourceMode === 'story' && !selectedStory)
              }
              className="rounded-xl bg-brand py-3 text-[15px] font-semibold text-white disabled:opacity-60 hover:bg-brand/90"
            >
              {generating ? 'Gerando…' : 'Gerar com IA'}
            </button>
          </form>
        </aside>
      </div>
    </>
  )
}
