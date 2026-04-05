import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { GenerateFeedPrefill } from '../components/GeneratePanel'
import { MediaPeekEyeButton, MediaPeekModal } from '../components/MediaPeek'
import type { MediaPeekModel } from '../lib/mediaPeek'
import { mediaPeekHasPreview } from '../lib/mediaPeek'
import { api } from '../lib/api'

type ApiIgAccount = {
  id: string
  externalId?: string
  _id?: string
  documentId?: string
  handle: string
  displayName: string
  workspace?: string
  relatedInstagramAccountIds?: string[]
  relatedTikTokAccountIds?: string[]
  relatedMedNewsSourceIds?: string[]
}

type RelatedFeedType =
  | 'instagram_post'
  | 'instagram_reel'
  | 'instagram_story'
  | 'tiktok_post'
  | 'medical_news'

type RelatedFeedItem = { type: RelatedFeedType; sortAt: string; payload: Record<string, unknown> }

type RelatedFeedPage = {
  data: RelatedFeedItem[]
  total: number
  page: number
  limit: number
  pages: number
}

type RelatedNewsSourceMeta = {
  id: string
  name: string
  url: string
  newsPageUrl: string | null
  lastScrapedAt: string | null
  isActive: boolean
  category: string
  language: string
}

type RelatedFeedWithSources = RelatedFeedPage & { relatedNewsSources: RelatedNewsSourceMeta[] }

type FeedSourceTab = 'news' | 'instagram' | 'tiktok'

const DEFAULT_LIMIT = 30

const FEED_SOURCE_TABS: { id: FeedSourceTab; label: string; short: string }[] = [
  { id: 'news', label: 'Notícias de sites', short: 'Notícias' },
  { id: 'instagram', label: 'Instagram (posts, reels, stories)', short: 'Instagram' },
  { id: 'tiktok', label: 'TikTok', short: 'TikTok' },
]

const ROW_TYPE_SHORT: Record<RelatedFeedType, string> = {
  medical_news: 'Notícias',
  instagram_post: 'Post',
  instagram_reel: 'Reel',
  instagram_story: 'Story',
  tiktok_post: 'TikTok',
}

function str(p: Record<string, unknown>, k: string): string {
  const v = p[k]
  return typeof v === 'string' ? v : ''
}

function transcriptText(p: Record<string, unknown>): string {
  const t = p.transcript
  return typeof t === 'string' && t.trim() ? t.trim() : ''
}

function transcriptFlagOn(p: Record<string, unknown>): boolean {
  if (transcriptText(p)) return true
  for (const k of ['hasTranscript', 'transcribed', 'hasTranscription', 'transcriptAvailable']) {
    const v = p[k]
    if (v === true || v === 'true' || v === 1) return true
  }
  return false
}

function isMongoId(s: string): boolean {
  return /^[a-f0-9]{24}$/i.test(s)
}

function igAccountMongoId(a: ApiIgAccount): string {
  if (a.documentId && isMongoId(a.documentId)) return a.documentId
  if (isMongoId(a.id)) return a.id
  const raw = a._id
  if (typeof raw === 'string' && isMongoId(raw)) return raw
  return ''
}

function igAccountExternalId(a: ApiIgAccount): string {
  if (a.externalId) return a.externalId
  if (!isMongoId(a.id)) return a.id
  return ''
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function payloadIgExternal(p: Record<string, unknown>): string | null {
  const top = str(p, 'accountId')
  if (top && !isMongoId(top)) return top
  const acc = asRecord(p.account)
  if (acc) {
    const h = str(acc, 'handle').replace(/^@/, '')
    if (h) return h
    const aid = str(acc, 'id')
    if (aid && !isMongoId(aid)) return aid
    if (aid) return aid
  }
  if (top) return top
  return null
}

function tiktokAccountMongo(p: Record<string, unknown>): string | null {
  const a = str(p, 'tiktokAccountId')
  if (isMongoId(a)) return a
  const b = str(p, 'accountId')
  if (isMongoId(b)) return b
  const acc = asRecord(p.account)
  if (acc?.id && isMongoId(String(acc.id))) return String(acc.id)
  return null
}

function medSourceMongoId(p: Record<string, unknown>): string | null {
  for (const k of ['medNewsSourceId', 'sourceId', 'medNewsSource']) {
    const v = str(p, k)
    if (isMongoId(v)) return v
  }
  return null
}

type TikTokListItem = { id: string; handle: string; displayName: string; _id?: string }

type TikTokAccountsListResponse = { data: TikTokListItem[] }

function ttAccountMongoId(a: TikTokListItem): string {
  if (isMongoId(a.id)) return a.id
  const raw = a._id
  if (typeof raw === 'string' && isMongoId(raw)) return raw
  return ''
}

function accountFromPayload(p: Record<string, unknown>): Record<string, unknown> | null {
  return asRecord(p.account)
}

function profilePicUrl(acc: Record<string, unknown> | null, payload: Record<string, unknown>): string | null {
  if (acc) {
    for (const k of ['profilePicS3Url', 'profilePicUrl', 'profileImageUrl', 'avatarUrl']) {
      const v = acc[k]
      if (typeof v === 'string' && v.trim()) return v
    }
  }
  for (const k of ['sourceImageUrl', 'sourceLogoUrl', 'sourceAvatarUrl']) {
    const v = payload[k]
    if (typeof v === 'string' && v.trim()) return v
  }
  return null
}

type OriginLookup = { igAccounts: ApiIgAccount[]; tiktokList: TikTokListItem[] }

function originLine(
  feedType: RelatedFeedType,
  p: Record<string, unknown>,
  lookup?: OriginLookup,
): { primary: string; secondary: string; avatarUrl: string | null; idLine?: string } {
  if (feedType === 'medical_news') {
    const source = str(p, 'source') || str(p, 'medNewsSourceName') || 'Fonte'
    const mid = medSourceMongoId(p)
    return {
      primary: source,
      secondary: str(p, 'author') ? `por ${str(p, 'author')}` : 'Notícia médica',
      avatarUrl: profilePicUrl(null, p),
      idLine: mid ? `Fonte (ObjectId): ${mid}` : undefined,
    }
  }
  if (feedType === 'tiktok_post') {
    const pic = profilePicUrl(accountFromPayload(p), p)
    const tm = tiktokAccountMongo(p)
    let primary = 'TikTok'
    let secondary = ''
    const acc = accountFromPayload(p)
    if (acc) {
      primary = str(acc, 'displayName') || primary
      const h = str(acc, 'handle')
      secondary = h ? `@${h.replace(/^@/, '')}` : ''
    }
    if (lookup && tm) {
      const row = lookup.tiktokList.find((t) => ttAccountMongoId(t) === tm)
      if (row) {
        primary = row.displayName
        secondary = `@${row.handle}`
      }
    }
    return {
      primary,
      secondary,
      avatarUrl: pic,
      idLine: tm ? `Conta TikTok (ObjectId): ${tm}` : undefined,
    }
  }
  const acc = accountFromPayload(p)
  const pic = profilePicUrl(acc, p)
  if (acc) {
    let name = str(acc, 'displayName') || 'Perfil'
    let handle = str(acc, 'handle').replace(/^@/, '')
    const rawId = str(acc, 'id')
    if (lookup && rawId && isMongoId(rawId)) {
      const row = lookup.igAccounts.find((x) => igAccountMongoId(x) === rawId)
      if (row) {
        name = row.displayName
        handle = row.handle
      }
    }
    const secondary = handle
      ? `@${handle}`
      : str(acc, 'profileUrl') || (rawId && !isMongoId(rawId) ? rawId : '')
    return {
      primary: name,
      secondary,
      avatarUrl: pic,
      idLine: rawId && isMongoId(rawId) ? `Conta Instagram (ObjectId): ${rawId}` : undefined,
    }
  }
  const ext = payloadIgExternal(p)
  let primary = ext || 'Conta Instagram'
  let secondary = ext && !isMongoId(ext) ? `@${ext}` : ext && isMongoId(ext) ? '' : ''
  if (lookup && ext && isMongoId(ext)) {
    const row = lookup.igAccounts.find((x) => igAccountMongoId(x) === ext)
    if (row) {
      primary = row.displayName
      secondary = `@${row.handle}`
    }
  }
  return {
    primary,
    secondary,
    avatarUrl: pic,
    idLine: ext && isMongoId(ext) ? `Conta Instagram (ObjectId): ${ext}` : undefined,
  }
}

function formatDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('pt-BR')
}

function rowKey(row: RelatedFeedItem, index: number): string {
  const p = row.payload
  const id =
    str(p, 'id') ||
    str(p, 'instagramPostId') ||
    str(p, 'tiktokPostId') ||
    str(p, 'storyId') ||
    String(index)
  return `${row.type}-${id}-${row.sortAt}`
}

function interestRowPeekModel(row: RelatedFeedType, p: Record<string, unknown>): MediaPeekModel {
  const title = str(p, 'title') || (row === 'instagram_story' ? 'Story' : 'Item')
  const thumb =
    (p.thumbnailUrl as string | undefined) ||
    (p.imageUrl as string | undefined) ||
    null
  const video = (p.videoUrl as string | undefined) || null
  const rawCar = p.carouselImages as string[] | undefined
  const carouselImages =
    Array.isArray(rawCar) && rawCar.filter(Boolean).length ? rawCar.filter((x): x is string => typeof x === 'string' && !!x) : undefined
  const summary = row === 'medical_news' ? str(p, 'summary').trim() : ''
  return {
    title,
    thumbnailUrl: thumb,
    videoUrl: video,
    carouselImages,
    textBody: summary || null,
  }
}

function OriginAvatar({
  url,
  label,
}: {
  url: string | null
  label: string
}) {
  const initial = label.trim().charAt(0).toUpperCase() || '?'
  return (
    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-ink/[0.08] bg-ink/[0.06]">
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[13px] font-bold text-ink-muted">
          {initial}
        </div>
      )}
    </div>
  )
}

export function InstagramInterestsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const perfilQuery = searchParams.get('perfil')?.trim() ?? ''
  const [accounts, setAccounts] = useState<ApiIgAccount[]>([])
  const [metaLoading, setMetaLoading] = useState(true)
  const [profileExternalId, setProfileExternalId] = useState('')
  const [feedSourceTab, setFeedSourceTab] = useState<FeedSourceTab>('news')
  const [feedPages, setFeedPages] = useState({ news: 1, instagram: 1, tiktok: 1 })
  const [limit] = useState(DEFAULT_LIMIT)
  const [feed, setFeed] = useState<RelatedFeedPage | null>(null)
  const [relatedNewsSources, setRelatedNewsSources] = useState<RelatedNewsSourceMeta[]>([])
  const [feedLoading, setFeedLoading] = useState(false)
  const [feedError, setFeedError] = useState<string | null>(null)
  const [scrapingKey, setScrapingKey] = useState<string | null>(null)
  const [scrapeMessage, setScrapeMessage] = useState<string | null>(null)
  const [tiktokList, setTiktokList] = useState<TikTokListItem[]>([])
  const [mediaPeek, setMediaPeek] = useState<MediaPeekModel | null>(null)

  const accountOptions = useMemo(
    () =>
      accounts.map((a) => ({
        externalId: igAccountExternalId(a) || igAccountMongoId(a) || a.id,
        label: `${a.displayName} (@${a.handle})`,
        workspace: a.workspace ?? '',
      })),
    [accounts],
  )

  useEffect(() => {
    setMetaLoading(true)
    api
      .get<ApiIgAccount[]>('/instagram-accounts')
      .then((list) => setAccounts(list))
      .catch(() => setAccounts([]))
      .finally(() => setMetaLoading(false))
  }, [])

  useEffect(() => {
    if (accounts.length === 0) return
    const q = perfilQuery
    const matches =
      q &&
      accounts.some(
        (a) => igAccountExternalId(a) === q || igAccountMongoId(a) === q || a.id === q,
      )
    if (matches) {
      setProfileExternalId(q)
      setFeedPages({ news: 1, instagram: 1, tiktok: 1 })
      return
    }
    setProfileExternalId((prev) => {
      if (
        prev &&
        accounts.some(
          (a) => igAccountExternalId(a) === prev || igAccountMongoId(a) === prev || a.id === prev,
        )
      )
        return prev
      const first = accounts[0]
      return first ? igAccountExternalId(first) || igAccountMongoId(first) || first.id : ''
    })
  }, [accounts, perfilQuery])

  const loadFeed = useCallback(async () => {
    if (!profileExternalId) return
    setFeedLoading(true)
    setFeedError(null)
    try {
      const q = new URLSearchParams({
        page: String(feedPages[feedSourceTab]),
        limit: String(limit),
      })
      const base = `/instagram-accounts/${encodeURIComponent(profileExternalId)}/related-feed`
      if (feedSourceTab === 'news') {
        const res = await api.get<RelatedFeedWithSources>(`${base}/news?${q}`)
        setFeed({
          data: res.data ?? [],
          total: res.total,
          page: res.page,
          limit: res.limit,
          pages: res.pages,
        })
        setRelatedNewsSources(Array.isArray(res.relatedNewsSources) ? res.relatedNewsSources : [])
      } else if (feedSourceTab === 'instagram') {
        const res = await api.get<RelatedFeedPage>(`${base}/instagram?${q}`)
        setFeed(res)
        setRelatedNewsSources([])
      } else {
        const res = await api.get<RelatedFeedPage>(`${base}/tiktok?${q}`)
        setFeed(res)
        setRelatedNewsSources([])
      }
    } catch (err) {
      setFeedError(err instanceof Error ? err.message : 'Erro ao carregar feed.')
      setFeed(null)
      setRelatedNewsSources([])
    } finally {
      setFeedLoading(false)
    }
  }, [profileExternalId, feedPages, feedSourceTab, limit])

  useEffect(() => {
    setFeed(null)
    setRelatedNewsSources([])
  }, [feedSourceTab, profileExternalId])

  useEffect(() => {
    void loadFeed()
  }, [loadFeed])

  useEffect(() => {
    api
      .get<TikTokAccountsListResponse>('/tiktok-accounts?limit=200')
      .then((res) => setTiktokList(res.data ?? []))
      .catch(() => setTiktokList([]))
  }, [])

  function setFeedTab(tab: FeedSourceTab) {
    setFeedSourceTab(tab)
  }

  function openTwitterNews(p: Record<string, unknown>) {
    navigate('/twitter-posts', {
      state: {
        generateFromNews: {
          id: str(p, 'id'),
          title: str(p, 'title'),
          summary: str(p, 'summary'),
          source: str(p, 'source'),
          publishedAt: str(p, 'publishedAt'),
        },
      },
    })
  }

  function openTwitterFromIgPost(p: Record<string, unknown>) {
    const postId = str(p, 'id') || str(p, 'instagramPostId')
    if (!postId) return
    const prefill: GenerateFeedPrefill = {
      mode: 'post',
      accountId: profileExternalId,
      sourcePostId: postId,
      dashPost: {
        id: postId,
        title: str(p, 'title') || 'Post',
        postedAt: str(p, 'postedAt') || str(p, 'sortAt') || new Date().toISOString(),
        format: str(p, 'format') || 'Estático',
        thumbnailUrl: (p.thumbnailUrl as string | null | undefined) ?? null,
        transcript: (p.transcript as string | null | undefined) ?? null,
      },
    }
    navigate('/twitter-posts', { state: { generateFromFeed: prefill } })
  }

  function openTwitterFromStory(p: Record<string, unknown>) {
    const storyId = str(p, 'id') || str(p, 'storyId')
    if (!storyId) return
    const acc = asRecord(p.account)
    const prefill: GenerateFeedPrefill = {
      mode: 'story',
      accountId: profileExternalId,
      sourceInstagramStoryId: storyId,
      story: {
        id: storyId,
        mediaType: p.mediaType === 'video' ? 'video' : 'image',
        thumbnailUrl: (p.thumbnailUrl as string | null) ?? null,
        transcript: (p.transcript as string | null) ?? null,
        syncedAt: str(p, 'syncedAt') || str(p, 'sortAt') || new Date().toISOString(),
        account: {
          id: acc?.id != null ? String(acc.id) : payloadIgExternal(p) ?? '',
          displayName: acc?.displayName != null ? String(acc.displayName) : '—',
        },
      },
    }
    navigate('/twitter-posts', { state: { generateFromFeed: prefill } })
  }

  function openTwitterFromTikTok(p: Record<string, unknown>) {
    const postId = str(p, 'id') || str(p, 'tiktokPostId')
    if (!postId) return
    const prefill: GenerateFeedPrefill = {
      mode: 'tiktok',
      accountId: profileExternalId,
      tiktokAccountId: tiktokAccountMongo(p) ?? undefined,
      tiktokPost: {
        id: postId,
        title: str(p, 'title') || 'TikTok',
        thumbnailUrl: (p.thumbnailUrl as string | null) ?? null,
        transcript: (p.transcript as string | null) ?? null,
        postedAt: str(p, 'postedAt') || null,
      },
    }
    navigate('/twitter-posts', { state: { generateFromFeed: prefill } })
  }

  async function runScrape(row: RelatedFeedItem, index: number) {
    const k = rowKey(row, index)
    setScrapingKey(k)
    setScrapeMessage(null)
    try {
      const p = row.payload
      if (row.type === 'instagram_post') {
        const ext = payloadIgExternal(p)
        if (!ext) throw new Error('Sem conta Instagram no item.')
        await api.post(`/instagram-accounts/${encodeURIComponent(ext)}/scrape/posts?limit=50`)
      } else if (row.type === 'instagram_reel') {
        const ext = payloadIgExternal(p)
        if (!ext) throw new Error('Sem conta Instagram no item.')
        await api.post(`/instagram-accounts/${encodeURIComponent(ext)}/scrape/reels?limit=10`)
      } else if (row.type === 'instagram_story') {
        const ext = payloadIgExternal(p)
        if (!ext) throw new Error('Sem conta Instagram no item.')
        await api.post(`/instagram-accounts/${encodeURIComponent(ext)}/scrape/stories`)
      } else if (row.type === 'tiktok_post') {
        const mongo = tiktokAccountMongo(p)
        if (!mongo) throw new Error('Sem ID Mongo da conta TikTok no item.')
        await api.post(`/tiktok-accounts/${mongo}/scrape/posts?limit=30`)
      } else if (row.type === 'medical_news') {
        const sid = medSourceMongoId(p)
        if (!sid) throw new Error('Sem ID da fonte de notícias no item.')
        await api.post(`/medical-news/sources/${sid}/scrape`)
      }
      setScrapeMessage('Scrape disparado. Atualizando…')
      await loadFeed()
    } catch (err) {
      setScrapeMessage(err instanceof Error ? err.message : 'Falha no scrape.')
    } finally {
      setScrapingKey(null)
    }
  }

  const items = feed?.data ?? []
  const tabMeta = FEED_SOURCE_TABS.find((t) => t.id === feedSourceTab)

  return (
    <div className="space-y-8">
      <MediaPeekModal model={mediaPeek} onClose={() => setMediaPeek(null)} />
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Interesses por perfil</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
          Escolha o perfil para ver o feed agregado. Cada aba (notícias, Instagram ou TikTok) usa um endpoint dedicado na
          API, com paginação própria. Para vincular ou editar fontes, use a Central de perfis.
        </p>
      </header>

      <div className="rounded-2xl border border-ink/[0.06] bg-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        <label htmlFor="interest-profile" className="text-[13px] font-medium text-ink">
          Perfil Instagram
        </label>
        <select
          id="interest-profile"
          value={profileExternalId}
          onChange={(e) => {
            const v = e.target.value
            setProfileExternalId(v)
            setFeedPages({ news: 1, instagram: 1, tiktok: 1 })
            setSearchParams(
              (prev) => {
                const n = new URLSearchParams(prev)
                if (v) n.set('perfil', v)
                else n.delete('perfil')
                return n
              },
              { replace: true },
            )
          }}
          disabled={metaLoading || accountOptions.length === 0}
          className="mt-2 w-full max-w-xl rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
        >
          {accountOptions.length === 0 ? (
            <option value="">Nenhuma conta</option>
          ) : (
            accountOptions.map((o) => (
              <option key={o.externalId} value={o.externalId}>
                {o.label}
                {o.workspace ? ` · ${o.workspace}` : ''}
              </option>
            ))
          )}
        </select>
        <p className="mt-3 text-[13px] text-ink-muted">
          <Link to="/central-de-perfis" className="font-medium text-brand hover:underline">
            Central de perfis
          </Link>
          {' — '}
          vincular Instagram, TikTok e fontes de notícias a cada conta.
        </p>
      </div>

      <div className="sticky top-0 z-20 -mx-1 border-b border-ink/[0.06] bg-surface/95 py-3 backdrop-blur-md px-1">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Fonte do feed</p>
        <div className="flex flex-wrap gap-1.5">
          {FEED_SOURCE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFeedTab(t.id)}
              className={[
                'rounded-xl px-4 py-2 text-[13px] font-medium transition',
                feedSourceTab === t.id
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-card text-ink-muted shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:text-ink',
              ].join(' ')}
            >
              {t.short}
            </button>
          ))}
        </div>
      </div>

      {scrapeMessage && (
        <p className="rounded-xl border border-ink/[0.08] bg-surface px-4 py-3 text-[13px] text-ink-muted">
          {scrapeMessage}
        </p>
      )}

      {feedError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {feedError}
        </p>
      )}

      <div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">{tabMeta?.label ?? feedSourceTab}</h2>
          {feed && (
            <div className="text-right text-[12px] text-ink-muted">
              <p>Página {feed.page} — ordenado do mais recente ao mais antigo</p>
              {items.length > 0 ? (
                <p className="mt-1 max-w-xs text-[11px] text-ink-subtle sm:max-w-md">
                  Quando a API envia ObjectId, ele aparece em mono na origem de cada card.
                </p>
              ) : null}
            </div>
          )}
        </div>

        {feedSourceTab === 'news' && relatedNewsSources.length > 0 ? (
          <div className="mb-4 rounded-2xl border border-ink/[0.06] bg-card p-4 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Fontes vinculadas (relatedNewsSources)
            </p>
            <div className="flex flex-wrap gap-2">
              {relatedNewsSources.map((s) => {
                const chipCls = [
                  'inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition',
                  s.isActive
                    ? 'border-ink/[0.1] bg-surface text-ink hover:border-brand/30'
                    : 'border-ink/[0.06] bg-ink/[0.03] text-ink-muted',
                ].join(' ')
                const inner = (
                  <>
                    <span className="truncate">{s.name}</span>
                    {!s.isActive ? <span className="shrink-0 text-[10px]">inativa</span> : null}
                  </>
                )
                return s.url ? (
                  <a
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={chipCls}
                    title={s.url}
                  >
                    {inner}
                  </a>
                ) : (
                  <span key={s.id} className={chipCls} title={s.id}>
                    {inner}
                  </span>
                )
              })}
            </div>
          </div>
        ) : null}

        {feedLoading && !feed ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((x) => (
              <div key={x} className="h-16 animate-pulse rounded-xl bg-ink/[0.06]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink/[0.12] bg-card px-6 py-14 text-center text-[14px] text-ink-muted">
            Nenhum item neste tipo nesta página. Tente “Mais antigos” ou outro tipo acima.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-ink/[0.06] bg-card divide-y divide-ink/[0.06]">
            {items.map((row, index) => {
              const p = row.payload
              const k = rowKey(row, index)
              const origin = originLine(row.type, p, {
                igAccounts: accounts,
                tiktokList,
              })
              const peekModel = interestRowPeekModel(row.type, p)
              const dateStr =
                row.type === 'medical_news'
                  ? formatDate(str(p, 'publishedAt'))
                  : row.type === 'instagram_story'
                    ? formatDate(str(p, 'postedAt') || str(p, 'syncedAt'))
                    : formatDate(str(p, 'postedAt'))

              const tx = transcriptText(p)
              const txFlag = transcriptFlagOn(p)
              const showTranscriptBlock =
                tx &&
                (row.type === 'instagram_post' ||
                  row.type === 'instagram_reel' ||
                  row.type === 'instagram_story' ||
                  row.type === 'tiktok_post')

              return (
                <div key={k} className="flex flex-wrap items-start gap-3 px-4 py-4">
                  <div className="flex w-10 shrink-0 justify-center pt-1">
                    {mediaPeekHasPreview(peekModel) ? (
                      <MediaPeekEyeButton onClick={() => setMediaPeek(peekModel)} />
                    ) : (
                      <span className="text-[11px] text-ink-subtle">—</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start gap-2">
                      <OriginAvatar url={origin.avatarUrl} label={origin.primary} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-ink">{origin.primary}</p>
                        {origin.secondary && (
                          <p className="truncate text-[12px] text-ink-muted">{origin.secondary}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="rounded-lg bg-ink/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                          {ROW_TYPE_SHORT[row.type] ?? row.type}
                        </span>
                        {(row.type === 'instagram_post' || row.type === 'instagram_reel') && txFlag && (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-800 dark:text-emerald-400">
                            Transcrição
                          </span>
                        )}
                      </div>
                    </div>
                    {origin.idLine ? (
                      <p
                        className="mt-0.5 truncate font-mono text-[10px] leading-tight text-ink-subtle"
                        title={origin.idLine}
                      >
                        {origin.idLine}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[12px] text-ink-muted">{dateStr}</p>
                    <h3 className="mt-1 line-clamp-2 text-[15px] font-medium leading-snug text-ink">
                      {str(p, 'title') || (row.type === 'instagram_story' ? 'Story' : '—')}
                    </h3>
                    {row.type === 'instagram_post' || row.type === 'instagram_reel' ? (
                      <p className="mt-1 text-[11px] text-ink-subtle">
                        {str(p, 'format')}
                        {typeof p.likes === 'number' ? ` · ${formatNumber(p.likes)} curtidas` : ''}
                        {typeof p.comments === 'number' ? ` · ${formatNumber(p.comments)} comentários` : ''}
                      </p>
                    ) : null}
                    {row.type === 'tiktok_post' && typeof p.views === 'number' ? (
                      <p className="mt-1 text-[11px] text-ink-subtle">{formatNumber(p.views)} views</p>
                    ) : null}
                    {row.type === 'tiktok_post' && txFlag && !showTranscriptBlock ? (
                      <span className="mt-1 inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-800 dark:text-emerald-400">
                        Transcrição
                      </span>
                    ) : null}
                    {row.type === 'instagram_story' && txFlag && !showTranscriptBlock ? (
                      <span className="mt-1 inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-800 dark:text-emerald-400">
                        Transcrição
                      </span>
                    ) : null}
                    {showTranscriptBlock ? (
                      <details className="mt-2 text-[12px]">
                        <summary className="cursor-pointer font-medium text-brand">Transcrição</summary>
                        <p className="mt-1 max-h-28 overflow-y-auto text-[11px] leading-relaxed text-ink-muted">{tx}</p>
                      </details>
                    ) : null}
                  </div>
                  <div className="flex min-w-[9rem] shrink-0 flex-col flex-wrap gap-2 sm:items-end">
                    {row.type === 'medical_news' && (
                      <button
                        type="button"
                        onClick={() => openTwitterNews(p)}
                        className="rounded-lg bg-brand px-3 py-1.5 text-[12px] font-medium text-white hover:bg-brand/90"
                      >
                        Twitter Post
                      </button>
                    )}
                    {(row.type === 'instagram_post' || row.type === 'instagram_reel') && (
                      <button
                        type="button"
                        onClick={() => openTwitterFromIgPost(p)}
                        disabled={!str(p, 'id') && !str(p, 'instagramPostId')}
                        className="rounded-lg bg-brand px-3 py-1.5 text-[12px] font-medium text-white hover:bg-brand/90 disabled:opacity-40"
                      >
                        Twitter Post
                      </button>
                    )}
                    {row.type === 'instagram_story' && (
                      <button
                        type="button"
                        onClick={() => openTwitterFromStory(p)}
                        disabled={!str(p, 'id') && !str(p, 'storyId')}
                        className="rounded-lg bg-brand px-3 py-1.5 text-[12px] font-medium text-white hover:bg-brand/90 disabled:opacity-40"
                      >
                        Twitter Post
                      </button>
                    )}
                    {row.type === 'tiktok_post' && (
                      <button
                        type="button"
                        onClick={() => openTwitterFromTikTok(p)}
                        disabled={!str(p, 'id') && !str(p, 'tiktokPostId')}
                        className="rounded-lg bg-brand px-3 py-1.5 text-[12px] font-medium text-white hover:bg-brand/90 disabled:opacity-40"
                      >
                        Twitter Post
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={
                        scrapingKey === k ||
                        (row.type === 'medical_news' && !medSourceMongoId(p)) ||
                        ((row.type === 'instagram_post' ||
                          row.type === 'instagram_reel' ||
                          row.type === 'instagram_story') &&
                          !payloadIgExternal(p)) ||
                        (row.type === 'tiktok_post' && !tiktokAccountMongo(p))
                      }
                      onClick={() => void runScrape(row, index)}
                      className="rounded-lg border border-ink/[0.12] px-3 py-1.5 text-[12px] font-medium text-ink disabled:opacity-40 hover:bg-ink/[0.04]"
                    >
                      {scrapingKey === k ? '…' : 'Scrap'}
                    </button>
                    {(row.type === 'medical_news' ? str(p, 'url') : str(p, 'postUrl')) && (
                      <a
                        href={row.type === 'medical_news' ? str(p, 'url') : str(p, 'postUrl')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] font-medium text-brand hover:underline"
                      >
                        Abrir
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {feed && feed.pages > 1 && (
          <nav
            className="mt-8 flex flex-col items-center gap-2 border-t border-ink/[0.06] pt-6"
            aria-label="Paginação do feed"
          >
            <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              disabled={feedPages[feedSourceTab] <= 1 || feedLoading}
              onClick={() =>
                setFeedPages((prev) => ({
                  ...prev,
                  [feedSourceTab]: Math.max(1, prev[feedSourceTab] - 1),
                }))
              }
                className="rounded-xl border border-ink/[0.1] px-5 py-2.5 text-[13px] font-medium text-ink disabled:opacity-40 hover:bg-ink/[0.04]"
              >
                ← Mais recentes
              </button>
              <span className="text-[13px] text-ink-muted">
                {feed.page} / {feed.pages}
                {feed.total != null ? ` · ${feed.total} itens` : ''}
              </span>
              <button
                type="button"
              disabled={feedPages[feedSourceTab] >= feed.pages || feedLoading}
              onClick={() =>
                setFeedPages((prev) => ({
                  ...prev,
                  [feedSourceTab]: prev[feedSourceTab] + 1,
                }))
              }
                className="rounded-xl border border-ink/[0.1] px-5 py-2.5 text-[13px] font-medium text-ink disabled:opacity-40 hover:bg-ink/[0.04]"
              >
                Mais antigos →
              </button>
            </div>
          </nav>
        )}
      </div>
    </div>
  )
}
