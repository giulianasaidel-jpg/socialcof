import { useState, type FormEvent } from 'react'
import { useAppWorkspace } from '../../context/AppWorkspaceContext'
import {
  adminPortalUsersSeed,
  type AdminPortalUser,
} from '../../data/mock'

/**
 * Normaliza e-mail para comparação.
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Valida formato básico de e-mail (protótipo).
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))
}

/**
 * Painel admin: conceder acesso por e-mail e escolher contas Instagram permitidas.
 */
export function AdminOverviewPage() {
  const { instagramAccounts, brandShortName, brandSubtitle } =
    useAppWorkspace()
  const brandLine = `${brandShortName} · ${brandSubtitle}`
  const [users, setUsers] = useState<AdminPortalUser[]>(() =>
    adminPortalUsersSeed.map((u) => ({
      ...u,
      allowedInstagramAccountIds: [...u.allowedInstagramAccountIds],
    })),
  )
  const [newEmail, setNewEmail] = useState('')
  const [formError, setFormError] = useState('')

  /**
   * Adiciona usuário com acesso inicial sem contas (admin marca depois).
   */
  function addUser(e: FormEvent) {
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
    setUsers((prev) => [
      ...prev,
      {
        id: `admin-u-${Date.now()}`,
        email,
        allowedInstagramAccountIds: [],
      },
    ])
    setNewEmail('')
  }

  /**
   * Remove usuário da lista de acessos.
   */
  function removeUser(id: string) {
    setUsers((prev) => prev.filter((u) => u.id !== id))
  }

  /**
   * Liga ou desliga uma conta Instagram para o usuário.
   */
  function toggleAccount(userId: string, instagramAccountId: string) {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u
        const has = u.allowedInstagramAccountIds.includes(instagramAccountId)
        const allowedInstagramAccountIds = has
          ? u.allowedInstagramAccountIds.filter((x) => x !== instagramAccountId)
          : [...u.allowedInstagramAccountIds, instagramAccountId]
        return { ...u, allowedInstagramAccountIds }
      }),
    )
  }

  return (
    <div className="space-y-10">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6e6e73]">
          Administração
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#1d1d1f]">
          Acessos ao portal
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[#6e6e73]">
          Defina quem entra pelo e-mail e quais contas Instagram cada pessoa
          pode usar no {brandLine}. Alterações ficam só neste navegador
          (protótipo sem backend).
        </p>
      </header>

      <section className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <h2 className="text-lg font-semibold tracking-tight text-[#1d1d1f]">
          Conceder acesso por e-mail
        </h2>
        <p className="mt-1 text-[13px] text-[#6e6e73]">
          Novo usuário aparece na lista abaixo; em seguida marque as contas
          Instagram liberadas para ele.
        </p>
        <form
          onSubmit={addUser}
          className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="min-w-0 flex-1">
            <label
              htmlFor="admin-new-email"
              className="text-sm font-medium text-[#1d1d1f]"
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
              className="mt-2 w-full rounded-xl border border-black/[0.1] bg-[#fafafa] px-4 py-3 text-[15px] text-[#1d1d1f] outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20"
              placeholder="nome@empresa.com.br"
            />
          </div>
          <button
            type="submit"
            className="rounded-full bg-[#0071e3] px-6 py-3 text-[15px] font-medium text-white hover:bg-[#0077ed] active:scale-[0.98]"
          >
            Adicionar
          </button>
        </form>
        {formError ? (
          <p className="mt-3 text-[13px] text-red-700">{formError}</p>
        ) : null}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-[#1d1d1f]">
          Usuários e contas permitidas
        </h2>
        {users.length === 0 ? (
          <p className="rounded-xl border border-black/[0.06] bg-[#fafafa] px-4 py-6 text-[14px] text-[#6e6e73]">
            Nenhum usuário. Adicione um e-mail acima.
          </p>
        ) : (
          <ul className="space-y-6">
            {users.map((u) => (
              <li
                key={u.id}
                className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/[0.06] pb-4">
                  <div>
                    <p className="text-[15px] font-semibold text-[#1d1d1f]">
                      {u.email}
                    </p>
                    <p className="mt-1 text-[13px] text-[#6e6e73]">
                      {u.allowedInstagramAccountIds.length === 0
                        ? 'Nenhuma conta Instagram selecionada — o usuário não verá contas no app.'
                        : `${u.allowedInstagramAccountIds.length} conta(s) liberada(s)`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeUser(u.id)}
                    className="rounded-full border border-red-200 bg-white px-4 py-2 text-[13px] font-medium text-red-800 hover:bg-red-50"
                  >
                    Revogar acesso
                  </button>
                </div>
                <fieldset className="mt-5">
                  <legend className="text-[11px] font-semibold uppercase tracking-wide text-[#6e6e73]">
                    Contas Instagram ({brandLine})
                  </legend>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {instagramAccounts.map((acc) => {
                      const checked = u.allowedInstagramAccountIds.includes(
                        acc.id,
                      )
                      return (
                        <label
                          key={acc.id}
                          className={[
                            'flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-[14px] transition',
                            checked
                              ? 'border-[#0071e3]/40 bg-[#0071e3]/5'
                              : 'border-black/[0.08] bg-[#fafafa] hover:border-black/[0.12]',
                          ].join(' ')}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAccount(u.id, acc.id)}
                            className="h-4 w-4 rounded border-black/[0.2] text-[#0071e3] focus:ring-[#0071e3]"
                          />
                          <span className="min-w-0">
                            <span className="font-medium text-[#1d1d1f]">
                              {acc.displayName}
                            </span>
                            <span className="block text-[12px] text-[#6e6e73]">
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
