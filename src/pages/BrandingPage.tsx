import { useEffect, useRef, useState } from 'react'
import { api, getAccessToken } from '../lib/api'
import { useAppWorkspace } from '../context/AppWorkspaceContext'

type AccountBranding = {
  id: string
  handle: string
  displayName: string
  followers?: number
  profilePicS3Url?: string | null
  brandColors: string[]
  referenceImages: string[]
}

type ApiAccountFull = {
  id: string
  externalId?: string
  handle: string
  displayName: string
  followers?: number
  profilePicS3Url?: string | null
  brandColors?: string[]
  referenceImages?: string[]
}

const MAX_REFERENCE_IMAGES = 20

async function uploadMultipart<T>(path: string, formData: FormData): Promise<T> {
  const token = getAccessToken()
  const res = await fetch(`${api.getBaseUrl()}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`)
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

async function deleteWithBody<T>(path: string, body: unknown): Promise<T> {
  const token = getAccessToken()
  const res = await fetch(`${api.getBaseUrl()}${path}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`)
    throw new Error(text || `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as unknown as T
  return res.json() as Promise<T>
}

function ProfilePicSection({
  account,
  onUpdated,
}: {
  account: AccountBranding
  onUpdated: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await uploadMultipart<{ profilePicS3Url: string }>(
        `/instagram-accounts/${account.id}/branding/profile-pic`,
        fd,
      )
      onUpdated(res.profilePicS3Url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar foto.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <section className="rounded-2xl border border-ink/[0.06] bg-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <h2 className="mb-4 text-[15px] font-semibold text-ink">Foto de perfil</h2>
      <div className="flex items-center gap-5">
        {account.profilePicS3Url ? (
          <img
            src={account.profilePicS3Url}
            alt={account.displayName}
            className="h-20 w-20 rounded-full object-cover ring-2 ring-ink/[0.06]"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand/10 text-2xl font-bold text-brand">
            {account.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-[14px] font-semibold text-ink">{account.displayName}</p>
          <p className="text-[13px] text-ink-muted">@{account.handle}</p>
          {account.followers != null && (
            <p className="text-[12px] text-ink-subtle">
              {account.followers.toLocaleString('pt-BR')} seguidores
            </p>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="mt-3 rounded-lg border border-ink/[0.1] px-3.5 py-1.5 text-[13px] font-medium text-ink-muted disabled:opacity-60 hover:border-brand/30 hover:text-brand"
          >
            {uploading ? 'Enviando…' : account.profilePicS3Url ? 'Trocar foto' : 'Enviar foto'}
          </button>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-[13px] text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </p>
      )}
    </section>
  )
}

function BrandColorsSection({
  account,
  onUpdated,
}: {
  account: AccountBranding
  onUpdated: (colors: string[]) => void
}) {
  const [colors, setColors] = useState<string[]>(account.brandColors)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setColors(account.brandColors)
  }, [account.id])

  const isDirty = JSON.stringify(colors) !== JSON.stringify(account.brandColors)

  function addColor() {
    setColors((prev) => [...prev, '#1D9BF0'])
  }

  function removeColor(i: number) {
    setColors((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateColor(i: number, value: string) {
    setColors((prev) => prev.map((c, idx) => (idx === i ? value : c)))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await api.patch<{ brandColors: string[] }>(
        `/instagram-accounts/${account.id}/branding/colors`,
        { colors },
      )
      onUpdated(res.brandColors)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar cores.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-2xl border border-ink/[0.06] bg-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-ink">Cores da marca</h2>
        {isDirty && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-brand px-4 py-1.5 text-[13px] font-medium text-white disabled:opacity-60 hover:bg-brand/90"
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {colors.map((color, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-ink/[0.1]">
              <div className="absolute inset-0 rounded-lg" style={{ backgroundColor: color }} />
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : '#000000'}
                onChange={(e) => updateColor(i, e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                title="Escolher cor"
              />
            </div>
            <input
              type="text"
              value={color}
              onChange={(e) => updateColor(i, e.target.value)}
              className="w-32 rounded-lg border border-ink/[0.1] bg-surface px-2.5 py-1.5 font-mono text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
              placeholder="#000000"
            />
            <button
              type="button"
              onClick={() => removeColor(i)}
              className="rounded-lg p-1.5 text-ink-muted hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
              aria-label="Remover cor"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M1 1l10 10M11 1L1 11"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addColor}
          className="self-start rounded-lg border border-dashed border-ink/[0.15] px-3.5 py-1.5 text-[13px] font-medium text-ink-muted hover:border-brand/30 hover:text-brand"
        >
          + Adicionar cor
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-[13px] text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </p>
      )}
    </section>
  )
}

function ReferenceImagesSection({
  account,
  onUpdated,
}: {
  account: AccountBranding
  onUpdated: (images: string[]) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const images = account.referenceImages
  const canUploadMore = images.length < MAX_REFERENCE_IMAGES

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      Array.from(files).forEach((f) => fd.append('files', f))
      const res = await uploadMultipart<{ added: number; referenceImages: string[] }>(
        `/instagram-accounts/${account.id}/branding/reference-images`,
        fd,
      )
      onUpdated(res.referenceImages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar imagens.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDelete(url: string) {
    setDeleting(url)
    setError(null)
    try {
      await deleteWithBody<void>(
        `/instagram-accounts/${account.id}/branding/reference-images`,
        { url },
      )
      onUpdated(images.filter((img) => img !== url))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover imagem.')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <section className="rounded-2xl border border-ink/[0.06] bg-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Imagens de referência</h2>
          <p className="mt-0.5 text-[12px] text-ink-muted">
            {images.length} / {MAX_REFERENCE_IMAGES}
          </p>
        </div>
        {canUploadMore && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="shrink-0 rounded-lg border border-ink/[0.1] px-3.5 py-1.5 text-[13px] font-medium text-ink-muted disabled:opacity-60 hover:border-brand/30 hover:text-brand"
          >
            {uploading ? 'Enviando…' : '+ Adicionar imagens'}
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleUpload}
      />

      {images.length > 0 ? (
        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-6">
          {images.map((url) => (
            <div
              key={url}
              className="group relative aspect-square overflow-hidden rounded-xl border border-ink/[0.06]"
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => handleDelete(url)}
                disabled={deleting === url}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-[13px] font-bold text-white opacity-0 transition group-hover:opacity-100 disabled:cursor-not-allowed"
                aria-label="Remover imagem"
              >
                {deleting === url ? '…' : '×'}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-ink/[0.12] bg-surface px-6 py-10 text-center">
          <p className="text-[14px] font-medium text-ink">Nenhuma imagem de referência</p>
          <p className="mt-1 text-[13px] text-ink-muted">
            Adicione referências visuais para guiar a geração de conteúdo com IA.
          </p>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-[13px] text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </p>
      )}
    </section>
  )
}

/**
 * Gerencia o branding por conta: foto de perfil, paleta de cores e imagens de referência.
 */
export function BrandingPage() {
  const { instagramAccounts } = useAppWorkspace()
  const [selectedId, setSelectedId] = useState('')
  const [accountData, setAccountData] = useState<AccountBranding | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedId && instagramAccounts.length > 0) {
      setSelectedId(instagramAccounts[0].id)
    }
  }, [instagramAccounts, selectedId])

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    setError(null)
    api
      .get<ApiAccountFull[]>('/instagram-accounts')
      .then((accounts) => {
        const acc = accounts.find((a) => (a.externalId ?? a.id) === selectedId)
        if (!acc) return
        setAccountData({
          id: acc.externalId ?? acc.id,
          handle: acc.handle,
          displayName: acc.displayName,
          followers: acc.followers,
          profilePicS3Url: acc.profilePicS3Url ?? null,
          brandColors: acc.brandColors ?? [],
          referenceImages: acc.referenceImages ?? [],
        })
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Erro ao carregar conta.'),
      )
      .finally(() => setLoading(false))
  }, [selectedId])

  function updateAccountData(patch: Partial<AccountBranding>) {
    setAccountData((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Branding</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
          Foto de perfil, paleta de cores e imagens de referência por conta.
        </p>
      </header>

      <div className="max-w-xs">
        <label
          htmlFor="branding-account"
          className="mb-1.5 block text-[13px] font-medium text-ink"
        >
          Conta
        </label>
        <select
          id="branding-account"
          value={selectedId}
          onChange={(e) => {
            setSelectedId(e.target.value)
            setAccountData(null)
          }}
          className="w-full rounded-xl border border-ink/[0.1] bg-surface px-3.5 py-2.5 text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          {instagramAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.displayName} (@{a.handle})
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((k) => (
            <div key={k} className="h-40 animate-pulse rounded-2xl bg-ink/[0.06]" />
          ))}
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </p>
      )}

      {accountData && !loading && (
        <div className="flex flex-col gap-6">
          <ProfilePicSection
            account={accountData}
            onUpdated={(url) => updateAccountData({ profilePicS3Url: url })}
          />
          <BrandColorsSection
            account={accountData}
            onUpdated={(colors) => updateAccountData({ brandColors: colors })}
          />
          <ReferenceImagesSection
            account={accountData}
            onUpdated={(images) => updateAccountData({ referenceImages: images })}
          />
        </div>
      )}
    </div>
  )
}
