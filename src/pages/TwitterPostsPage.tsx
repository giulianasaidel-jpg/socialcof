import { useEffect, useRef, useState } from 'react'
import { api, getAccessToken } from '../lib/api'
import { useAppWorkspace } from '../context/AppWorkspaceContext'

type TwitterLikePost = {
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
  status: 'Rascunho' | 'Aprovado' | 'Publicado'
  generatedAt: string
  createdAt: string
}

type SourceMode = 'post' | 'text' | 'direct'

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

const POSTS_PER_PAGE = 10

type AccountBrandingData = {
  id: string
  externalId?: string
  profilePicS3Url?: string | null
}

const TONE_SUGGESTIONS = [
  'educativo e direto',
  'empático',
  'urgente e impactante',
  'motivacional',
  'informativo',
]

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
      : status === 'Publicado'
        ? 'bg-blue-500/15 text-blue-800 dark:text-blue-400'
        : 'bg-ink/[0.08] text-ink-muted'
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-medium ${cls}`}>
      {status}
    </span>
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


function injectAvatarCss(html: string): string {
  const style = `<style>
img[style*="border-radius: 50%"],
img[style*="border-radius:50%"],
img[style*="border-radius: 50px"],
img[style*="border-radius:50px"] {
  width: 72px !important;
  height: 72px !important;
  min-width: 72px !important;
  min-height: 72px !important;
}
body { overflow: hidden !important; }
</style>`
  return html.includes('</head>')
    ? html.replace('</head>', `${style}</head>`)
    : `${style}${html}`
}

function scaleFontsInDocument(doc: Document, fontScale: number): void {
  if (fontScale === 1) return
  const win = doc.defaultView
  if (!win) return

  const entries: Array<{ el: HTMLElement; fs: number; lh: number }> = []
  doc.body.querySelectorAll('*').forEach((node) => {
    const el = node as HTMLElement
    const computed = win.getComputedStyle(el)
    const fs = parseFloat(computed.fontSize)
    const lh = parseFloat(computed.lineHeight)
    if (fs > 17) entries.push({ el, fs, lh })
  })

  for (const { el, fs, lh } of entries) {
    el.style.fontSize = `${(fs * fontScale).toFixed(1)}px`
    if (!isNaN(lh) && lh > 0) {
      el.style.lineHeight = `${(lh * fontScale).toFixed(1)}px`
    }
  }
}

function SlideViewer({
  post,
  onUpdate,
}: {
  post: TwitterLikePost
  onUpdate: (updated: TwitterLikePost) => void
}) {
  const [index, setIndex] = useState(0)
  const [editMode, setEditMode] = useState(false)
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [fontScale, setFontScale] = useState(1.0)
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = containerRef.current
    if (el) setScale(el.offsetWidth / 560)
  }, [])

  const totalSlides = post.slides.length
  const baseHtml = injectAvatarCss(post.slideHtmls[index] ?? '')

  function handleIframeLoad() {
    try {
      const doc = iframeRef.current?.contentDocument
      if (doc) scaleFontsInDocument(doc, fontScale)
    } catch { /* cross-origin safety */ }
  }

  function openEdit() {
    setEditText(post.slides[index] ?? '')
    setEditMode(true)
  }

  function cancelEdit() {
    setEditMode(false)
    setEditText('')
  }

  async function saveEdit() {
    const newSlides = [...post.slides]
    newSlides[index] = editText
    setSaving(true)
    try {
      const updated = await api.patch<TwitterLikePost>(`/twitter-posts/${post.id}`, {
        slides: newSlides,
      })
      onUpdate(updated)
      setEditMode(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDownloadSlide() {
    setDownloading(true)
    try {
      const token = getAccessToken()
      const res = await fetch(`${api.getBaseUrl()}/twitter-posts/${post.id}/slides/${index}/export`, {
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
      const res = await fetch(`${api.getBaseUrl()}/twitter-posts/${post.id}/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `slides-${post.id}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
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
          onClick={() => setIndex((i) => Math.min(totalSlides - 1, i + 1))}
          disabled={index === totalSlides - 1}
          className="rounded-lg border border-ink/[0.08] p-2 text-ink-muted disabled:opacity-30 hover:bg-ink/[0.04]"
          aria-label="Próximo slide"
        >
          <ChevronRight />
        </button>

        <div className="ml-auto flex items-center gap-px overflow-hidden rounded-lg border border-ink/[0.08]">
          <button
            type="button"
            onClick={() => setFontScale((s) => Math.max(0.7, +(s - 0.1).toFixed(1)))}
            disabled={fontScale <= 0.7}
            className="flex h-7 w-7 items-center justify-center text-[11px] font-bold text-ink-muted disabled:opacity-30 hover:bg-ink/[0.06]"
            aria-label="Diminuir fonte"
          >
            A-
          </button>
          <span className="min-w-[36px] border-x border-ink/[0.08] text-center text-[11px] tabular-nums text-ink-muted">
            {Math.round(fontScale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setFontScale((s) => Math.min(1.6, +(s + 0.1).toFixed(1)))}
            disabled={fontScale >= 1.6}
            className="flex h-7 w-7 items-center justify-center text-[13px] font-bold text-ink-muted disabled:opacity-30 hover:bg-ink/[0.06]"
            aria-label="Aumentar fonte"
          >
            A+
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-2xl border border-ink/[0.08] shadow-sm"
        style={{ aspectRatio: '1 / 1' }}
      >
        <iframe
          ref={iframeRef}
          key={`${index}-${fontScale}`}
          srcDoc={baseHtml}
          onLoad={handleIframeLoad}
          style={{
            position: 'absolute',
            width: 560,
            height: 560,
            border: 'none',
            transformOrigin: 'top left',
            transform: `scale(${scale})`,
          }}
          sandbox="allow-same-origin"
          title={`Slide ${index + 1}`}
        />
      </div>

      {editMode ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={4}
            className="w-full resize-none rounded-xl border border-ink/[0.1] bg-surface px-3.5 py-2.5 text-[14px] text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-brand/30"
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
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openEdit}
            className="rounded-lg border border-ink/[0.1] px-3.5 py-2 text-[13px] font-medium text-ink-muted hover:border-brand/30 hover:text-brand"
          >
            Editar texto
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
              ↓ Baixar todos
            </button>
          )}
        </div>
      )}

      {totalSlides > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {post.slides.map((text, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
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
  post: TwitterLikePost
  onUpdate: (updated: TwitterLikePost) => void
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

  function cancelEdit() {
    setEditMode(false)
    setEditText('')
  }

  async function saveEdit() {
    setSaving(true)
    try {
      const updated = await api.patch<TwitterLikePost>(`/twitter-posts/${post.id}`, {
        caption: editText,
      })
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
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        Legenda do post
      </p>
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
              onClick={cancelEdit}
              className="rounded-lg border border-ink/[0.1] px-4 py-2 text-[14px] font-medium text-ink-muted hover:text-ink"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-ink/[0.08] bg-surface px-4 py-3">
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink">
            {post.caption}
          </p>
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

function PostDrawer({
  post,
  onClose,
  onUpdate,
  onDelete,
}: {
  post: TwitterLikePost
  onClose: () => void
  onUpdate: (updated: TwitterLikePost) => void
  onDelete: (id: string) => void
}) {
  const [statusSaving, setStatusSaving] = useState(false)
  const [modeSaving, setModeSaving] = useState(false)
  const [fontSizeSaving, setFontSizeSaving] = useState(false)
  const [localFontSize, setLocalFontSize] = useState(post.bodyFontSize ?? 20)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setLocalFontSize(post.bodyFontSize ?? 20)
  }, [post.bodyFontSize])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleStatusChange(status: TwitterLikePost['status']) {
    setStatusSaving(true)
    try {
      const updated = await api.patch<TwitterLikePost>(`/twitter-posts/${post.id}`, { status })
      onUpdate(updated)
    } finally {
      setStatusSaving(false)
    }
  }

  async function handleModeToggle() {
    const newMode: 'light' | 'dark' = post.mode === 'dark' ? 'light' : 'dark'
    setModeSaving(true)
    try {
      const updated = await api.patch<TwitterLikePost>(`/twitter-posts/${post.id}`, {
        mode: newMode,
      })
      onUpdate(updated)
    } finally {
      setModeSaving(false)
    }
  }

  async function handleFontSizeCommit(size: number) {
    setFontSizeSaving(true)
    try {
      const updated = await api.patch<TwitterLikePost>(`/twitter-posts/${post.id}`, {
        bodyFontSize: size,
      })
      onUpdate(updated)
    } finally {
      setFontSizeSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Remover este post?')) return
    setDeleting(true)
    try {
      await api.delete(`/twitter-posts/${post.id}`)
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
            Twitter Post
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-ink/[0.06]"
          >
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
            <div className="ml-auto flex shrink-0 items-center gap-2">
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
            <span className="text-[12px] text-ink-subtle">{formatDate(post.createdAt)}</span>
            <span className="text-[12px] text-ink-subtle">{post.slides.length} slides</span>
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
              min={14}
              max={28}
              value={localFontSize}
              onChange={(e) => setLocalFontSize(Number(e.target.value))}
              onMouseUp={(e) => handleFontSizeCommit(Number((e.target as HTMLInputElement).value))}
              onTouchEnd={() => handleFontSizeCommit(localFontSize)}
              disabled={fontSizeSaving}
              className="w-full accent-brand disabled:opacity-60"
            />
            <div className="mt-0.5 flex justify-between text-[11px] text-ink-subtle">
              <span>14</span>
              <span>28</span>
            </div>
          </div>

          <SlideViewer post={post} onUpdate={onUpdate} />

          <CaptionSection post={post} onUpdate={onUpdate} />

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              Status
            </p>
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

function GeneratePanel({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (post: TwitterLikePost) => void
}) {
  const { instagramAccounts, products } = useAppWorkspace()
  const [sourceMode, setSourceMode] = useState<SourceMode>('text')
  const [accountId, setAccountId] = useState('')
  const [avatarAccountId, setAvatarAccountId] = useState('')
  const [productId, setProductId] = useState('')
  const [mode, setMode] = useState<'light' | 'dark'>('dark')
  const [bodyFontSize, setBodyFontSize] = useState(20)
  const [profileName, setProfileName] = useState('')
  const [profileHandle, setProfileHandle] = useState('')
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [slideCount, setSlideCount] = useState(5)
  const [tone, setTone] = useState('educativo e direto')
  const [sourcePostId, setSourcePostId] = useState('')
  const [sourceTranscript, setSourceTranscript] = useState('')
  const [sourceCaption, setSourceCaption] = useState('')
  const [directTexts, setDirectTexts] = useState(['', ''])
  const [dashPosts, setDashPosts] = useState<DashPost[]>([])
  const [dashPostsLoading, setDashPostsLoading] = useState(false)
  const [dashPostsPage, setDashPostsPage] = useState(1)
  const [dashPostsTotal, setDashPostsTotal] = useState(0)
  const [selectedDashPost, setSelectedDashPost] = useState<DashPost | null>(null)
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

  useEffect(() => {
    if (!accountId && instagramAccounts.length > 0) {
      setAccountId(instagramAccounts[0].id)
    }
    if (!avatarAccountId && instagramAccounts.length > 0) {
      setAvatarAccountId(instagramAccounts[0].id)
    }
  }, [instagramAccounts, accountId, avatarAccountId])

  useEffect(() => {
    if (!productId && products.length > 0) {
      setProductId(products[0].id)
    }
  }, [products, productId])

  useEffect(() => {
    setSelectedDashPost(null)
    setSourcePostId('')
    setDashPostsPage(1)
  }, [accountId])

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
          // not parseable JSON — fall through
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
                  { id: 'post' as SourceMode, label: 'Post existente' },
                  { id: 'text' as SourceMode, label: 'Texto livre' },
                  { id: 'direct' as SourceMode, label: 'Textos diretos' },
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
                  {dashPosts.length === 0 ? (
                    <p className="px-4 py-6 text-center text-[13px] text-ink-muted">
                      Nenhum post encontrado para esta conta.
                    </p>
                  ) : (
                    dashPosts.map((post) => (
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

          <div className="grid grid-cols-2 gap-3">
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
          </div>

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
            disabled={generating}
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

function PostCard({ post, onClick }: { post: TwitterLikePost; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-2xl border border-ink/[0.06] bg-card text-left shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition hover:border-brand/30 hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)]"
    >
      <div
        className={[
          'flex w-full items-center justify-center px-5 py-8',
          post.mode === 'dark' ? 'bg-[#0f1117]' : 'bg-[#f5f8fa]',
        ].join(' ')}
      >
        <p
          className={[
            'line-clamp-4 text-center text-[13px] leading-snug',
            post.mode === 'dark' ? 'text-white/90' : 'text-[#0f1419]',
          ].join(' ')}
        >
          {post.slides[0] ?? '…'}
        </p>
      </div>

      <div className="flex flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex rounded-full bg-ink/[0.07] px-2 py-0.5 text-[11px] font-medium text-ink-muted">
            {post.mode === 'dark' ? 'Escuro' : 'Claro'}
          </span>
          <StatusBadge status={post.status} />
          <span className="ml-auto text-[11px] text-ink-subtle">{post.slides.length} slides</span>
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
 * Gerencia Twitter/X-style carousel posts: lista, criação com IA, edição e download.
 */
export function TwitterPostsPage() {
  const [posts, setPosts] = useState<TwitterLikePost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPost, setSelectedPost] = useState<TwitterLikePost | null>(null)
  const [showGeneratePanel, setShowGeneratePanel] = useState(false)
  const [statusFilter, setStatusFilter] = useState('Todos')

  useEffect(() => {
    setLoading(true)
    api
      .get<TwitterLikePost[]>('/twitter-posts')
      .then(setPosts)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Erro ao carregar posts.'),
      )
      .finally(() => setLoading(false))
  }, [])

  function handleCreate(post: TwitterLikePost) {
    setPosts((prev) => [post, ...prev])
  }

  function handleUpdate(updated: TwitterLikePost) {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    setSelectedPost(updated)
  }

  function handleDelete(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }

  const filtered =
    statusFilter === 'Todos' ? posts : posts.filter((p) => p.status === statusFilter)

  return (
    <>
      {selectedPost && (
        <PostDrawer
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}

      {showGeneratePanel && (
        <GeneratePanel onClose={() => setShowGeneratePanel(false)} onCreate={handleCreate} />
      )}

      <div className="space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-ink">Twitter Posts</h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
              Cards no estilo X/Twitter gerados com IA, prontos para exportar como imagem.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowGeneratePanel(true)}
            className="shrink-0 rounded-xl bg-brand px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-brand/90"
          >
            Gerar novo
          </button>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-4">
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
            <p className="text-[13px] text-ink-muted">
              {filtered.length} post{filtered.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((k) => (
              <div key={k} className="h-64 animate-pulse rounded-2xl bg-ink/[0.06]" />
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
              <PostCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
