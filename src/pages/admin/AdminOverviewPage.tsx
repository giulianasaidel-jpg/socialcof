import { useEffect, useState, type FormEvent } from 'react'
import { useAppWorkspace } from '../../context/AppWorkspaceContext'
import { api } from '../../lib/api'

type AdminUser = {
  id: string
  email: string
  role?: 'admin' | 'user'
  allowedInstagramAccountIds: string[]
}

type DiscoveredAccount = {
  id: string
  handle: string
  displayName: string
  profileUrl: string
  followers: number
  status: string
  workspace: string
}

/**
 * Normaliza e-mail para comparação.
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Valida formato básico de e-mail.
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))
}

/**
 * Painel admin: gerencia usuários e contas Instagram permitidas via API.
 */
export function AdminOverviewPage() {
  const { instagramAccounts, brandShortName, brandSubtitle } =
    useAppWorkspace()
  const brandLine = `${brandShortName} · ${brandSubtitle}`
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [formError, setFormError] = useState('')

  const [discoverHandle, setDiscoverHandle] = useState('')
  const [discoverWorkspace, setDiscoverWorkspace] = useState('medcof')
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [discoverError, setDiscoverError] = useState('')
  const [discovered, setDiscovered] = useState<DiscoveredAccount | null>(null)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncDone, setSyncDone] = useState(false)

  useEffect(() => {
    api
      .get<AdminUser[]>('/admin/users')
      .then((data) => {
        const withAccounts = data.map((u) => ({
          ...u,
          allowedInstagramAccountIds: u.allowedInstagramAccountIds ?? [],
        }))
        setUsers(withAccounts)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  /**
   * Adiciona usuário via POST /admin/users.
   */
  async function addUser(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    const email = normalizeEmail(newEmail)
    if (!email) {
      setFormError('Informe um e-mail.')
      return
    }
    if (!isValidEmail(email)) {
      setFormError('E-mail inválido.')
      return
    }
    if (users.some((u) => normalizeEmail(u.email) === email)) {
      setFormError('Este e-mail já está na lista.')
      return
    }
    try {
      const created = await api.post<AdminUser>('/admin/users', { email, role: 'user' })
      setUsers((prev) => [
        ...prev,
        { ...created, allowedInstagramAccountIds: created.allowedInstagramAccountIds ?? [] },
      ])
      setNewEmail('')
    } catch {
      setFormError('Não foi possível adicionar o usuário.')
    }
  }

  /**
   * Remove usuário via DELETE /admin/users/:id.
   */
  async function removeUser(id: string) {
    try {
      await api.delete(`/admin/users/${id}`)
      setUsers((prev) => prev.filter((u) => u.id !== id))
    } catch {}
  }

  /**
   * Liga ou desliga uma conta Instagram e persiste via PUT /admin/users/:id/accounts.
   */
  async function toggleAccount(userId: string, instagramAccountId: string) {
    const user = users.find((u) => u.id === userId)
    if (!user) return
    const has = user.allowedInstagramAccountIds.includes(instagramAccountId)
    const updated = has
      ? user.allowedInstagramAccountIds.filter((x) => x !== instagramAccountId)
      : [...user.allowedInstagramAccountIds, instagramAccountId]

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, allowedInstagramAccountIds: updated } : u,
      ),
    )

    try {
      await api.put(`/admin/users/${userId}/accounts`, updated)
    } catch {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, allowedInstagramAccountIds: user.allowedInstagramAccountIds }
            : u,
        ),
      )
    }
  }

  async function discoverAccount(e: FormEvent) {
    e.preventDefault()
    setDiscoverError('')
    setDiscovered(null)
    setSyncDone(false)
    const handle = discoverHandle.trim().replace(/^@/, '')
    if (!handle) {
      setDiscoverError('Informe o @ da conta.')
      return
    }
    setDiscoverLoading(true)
    try {
      const account = await api.post<DiscoveredAccount>(
        '/instagram-accounts/discover',
        { handle, workspace: discoverWorkspace },
      )
      setDiscovered(account)
      setDiscoverHandle('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('409')) {
        setDiscoverError('Esta conta já existe no banco.')
      } else {
        setDiscoverError(`Erro: ${msg}`)
      }
    } finally {
      setDiscoverLoading(false)
    }
  }

  async function syncAccount(accountId: string) {
    setSyncLoading(true)
    setSyncDone(false)
    try {
      await api.post(`/instagram-accounts/${accountId}/sync`)
      setSyncDone(true)
    } catch {}
    finally {
      setSyncLoading(false)
    }
  }

  return (
    <div className="space-y-10">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          Administração
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
          Acessos ao portal
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
          Defina quem entra pelo e-mail e quais contas Instagram cada pessoa
          pode usar no {brandLine}.
        </p>
      </header>

      <section className="rounded-2xl border border-ink/[0.06] bg-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          Descobrir conta Instagram
        </h2>
        <p className="mt-1 text-[13px] text-ink-muted">
          Scrapa o perfil público via Apify e salva no banco com followers e
          displayName reais. Após descobrir, clique em{' '}
          <strong className="font-medium text-ink">Sincronizar posts</strong>{' '}
          para importar as publicações.
        </p>

        <form
          onSubmit={(e) => void discoverAccount(e)}
          className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto_auto]"
        >
          <div>
            <label
              htmlFor="discover-handle"
              className="text-sm font-medium text-ink"
            >
              @ da conta
            </label>
            <input
              id="discover-handle"
              value={discoverHandle}
              onChange={(e) => {
                setDiscoverHandle(e.target.value)
                setDiscoverError('')
              }}
              placeholder="grupomedcof"
              className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label
              htmlFor="discover-workspace"
              className="text-sm font-medium text-ink"
            >
              Workspace
            </label>
            <input
              id="discover-workspace"
              value={discoverWorkspace}
              onChange={(e) => setDiscoverWorkspace(e.target.value)}
              placeholder="medcof"
              className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={discoverLoading}
              className="rounded-full bg-brand px-6 py-3 text-[15px] font-medium text-white hover:bg-brand-hover disabled:opacity-60 active:scale-[0.98]"
            >
              {discoverLoading ? 'Buscando…' : 'Descobrir'}
            </button>
          </div>
        </form>

        {discoverError && (
          <p className="mt-3 text-[13px] text-red-700">{discoverError}</p>
        )}

        {discovered && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-400">
              Conta criada com sucesso
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[15px] font-semibold text-ink">
                  {discovered.displayName}
                </p>
                <p className="text-[13px] text-ink-muted">
                  @{discovered.handle} ·{' '}
                  {discovered.followers.toLocaleString('pt-BR')} seguidores ·{' '}
                  workspace: {discovered.workspace}
                </p>
                <a
                  href={discovered.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-[13px] text-brand hover:underline"
                >
                  Abrir perfil
                </a>
              </div>
              <button
                type="button"
                onClick={() => void syncAccount(discovered.id)}
                disabled={syncLoading || syncDone}
                className="rounded-full border border-ink/[0.12] bg-card px-4 py-2 text-[14px] font-medium text-ink hover:bg-ink/[0.04] disabled:opacity-60"
              >
                {syncLoading
                  ? 'Sincronizando…'
                  : syncDone
                    ? 'Posts importados ✓'
                    : 'Sincronizar posts'}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-ink/[0.06] bg-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          Conceder acesso por e-mail
        </h2>
        <p className="mt-1 text-[13px] text-ink-muted">
          Novo usuário aparece na lista abaixo; em seguida marque as contas
          Instagram liberadas para ele.
        </p>
        <form
          onSubmit={(e) => void addUser(e)}
          className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="min-w-0 flex-1">
            <label
              htmlFor="admin-new-email"
              className="text-sm font-medium text-ink"
            >
              E-mail
            </label>
            <input
              id="admin-new-email"
              type="email"
              autoComplete="email"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value)
                setFormError('')
              }}
              className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              placeholder="nome@empresa.com.br"
            />
          </div>
          <button
            type="submit"
            className="rounded-full bg-brand px-6 py-3 text-[15px] font-medium text-white hover:bg-brand-hover active:scale-[0.98]"
          >
            Adicionar
          </button>
        </form>
        {formError ? (
          <p className="mt-3 text-[13px] text-red-700">{formError}</p>
        ) : null}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-ink">
          Usuários e contas permitidas
        </h2>
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((k) => (
              <div key={k} className="h-24 animate-pulse rounded-2xl bg-ink/[0.06]" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <p className="rounded-xl border border-ink/[0.06] bg-surface px-4 py-6 text-[14px] text-ink-muted">
            Nenhum usuário. Adicione um e-mail acima.
          </p>
        ) : (
          <ul className="space-y-6">
            {users.map((u) => (
              <li
                key={u.id}
                className="rounded-2xl border border-ink/[0.06] bg-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/[0.06] pb-4">
                  <div>
                    <p className="text-[15px] font-semibold text-ink">
                      {u.email}
                    </p>
                    <p className="mt-1 text-[13px] text-ink-muted">
                      {u.allowedInstagramAccountIds.length === 0
                        ? 'Nenhuma conta Instagram selecionada — o usuário não verá contas no app.'
                        : `${u.allowedInstagramAccountIds.length} conta(s) liberada(s)`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeUser(u.id)}
                    className="rounded-full border border-red-200 bg-card px-4 py-2 text-[13px] font-medium text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Revogar acesso
                  </button>
                </div>
                <fieldset className="mt-5">
                  <legend className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                    Contas Instagram ({brandLine})
                  </legend>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {instagramAccounts.map((acc) => {
                      const checked = u.allowedInstagramAccountIds.includes(acc.id)
                      return (
                        <label
                          key={acc.id}
                          className={[
                            'flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-[14px] transition',
                            checked
                              ? 'border-brand/40 bg-brand/5'
                              : 'border-ink/[0.08] bg-surface hover:border-ink/[0.12]',
                          ].join(' ')}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => void toggleAccount(u.id, acc.id)}
                            className="h-4 w-4 rounded border-ink/[0.2] text-brand focus:ring-brand"
                          />
                          <span className="min-w-0">
                            <span className="font-medium text-ink">
                              {acc.displayName}
                            </span>
                            <span className="block text-[12px] text-ink-muted">
                              @{acc.handle}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
