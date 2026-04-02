import { NavLink } from 'react-router-dom'
import { useAppWorkspace } from '../context/AppWorkspaceContext'
import { useTheme } from '../context/ThemeContext'

type NavItem = { to: string; label: string; end?: boolean }

const navItems: NavItem[] = [
  { to: '/', label: 'Visão geral', end: true },
  { to: '/criar', label: 'Novo conteúdo' },
  { to: '/rascunhos', label: 'Rascunhos' },
  { to: '/concorrencia', label: 'Concorrência' },
  { to: '/produtos', label: 'Produtos' },
  { to: '/agenda', label: 'Agenda' },
  { to: '/trends', label: 'Trends' },
  { to: '/noticias-medicas', label: 'Notícias médicas' },
]

const adminNavItems: NavItem[] = [
  { to: '/admin', label: 'Painel admin', end: true },
]

/**
 * Navegação lateral principal do protótipo Social Cof.
 */
export function Sidebar() {
  const { workspaceId, setWorkspaceId, brandShortName, brandSubtitle } =
    useAppWorkspace()
  const { theme, toggleTheme } = useTheme()

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-ink/10 bg-white/70 px-4 py-6 shadow-[4px_0_32px_rgba(28,29,32,0.06)] backdrop-blur-2xl dark:bg-[#1c1d20]/95 dark:shadow-[4px_0_32px_rgba(0,0,0,0.3)]">
      <div
        className="mb-5 overflow-hidden rounded-3xl bg-[#e8e8ed] p-px shadow-[inset_0_1px_1px_rgba(0,0,0,0.05)] dark:bg-[#2a2b30]"
        role="group"
        aria-label="Linha Social Cof"
      >
        <div className="flex gap-px">
          <button
            type="button"
            onClick={() => setWorkspaceId('socialcof')}
            className={[
              'flex min-h-[34px] flex-1 flex-col items-center justify-center rounded-[23px] px-1 py-1 text-center transition-all duration-200',
              workspaceId === 'socialcof'
                ? 'bg-brand text-white shadow-sm'
                : 'text-ink-muted hover:bg-white/60 hover:text-ink dark:hover:bg-white/10',
            ].join(' ')}
          >
            <span
              className={[
                'text-[8px] font-medium leading-none',
                workspaceId === 'socialcof' ? 'text-white/90' : 'opacity-65',
              ].join(' ')}
            >
              Social Cof
            </span>
            <span
              className={[
                'mt-px text-[10px] font-semibold leading-none tracking-tight',
                workspaceId === 'socialcof' ? 'text-white' : '',
              ].join(' ')}
            >
              Produtos
            </span>
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceId('diretoria-medica')}
            className={[
              'flex min-h-[34px] flex-1 flex-col items-center justify-center rounded-[23px] px-1 py-1 text-center transition-all duration-200',
              workspaceId === 'diretoria-medica'
                ? 'bg-brand text-white shadow-sm'
                : 'text-ink-muted hover:bg-white/60 hover:text-ink dark:hover:bg-white/10',
            ].join(' ')}
          >
            <span
              className={[
                'text-[8px] font-medium leading-none',
                workspaceId === 'diretoria-medica' ? 'text-white/90' : 'opacity-65',
              ].join(' ')}
            >
              Social Cof
            </span>
            <span
              className={[
                'mt-px text-[10px] font-semibold leading-none tracking-tight',
                workspaceId === 'diretoria-medica' ? 'text-white' : '',
              ].join(' ')}
            >
              Médicos
            </span>
          </button>
        </div>
      </div>
      <div className="mb-8 px-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          {brandShortName}
        </p>
        <p className="mt-0.5 text-lg font-semibold tracking-tight text-ink">
          {brandSubtitle}
        </p>
      </div>
      <nav className="flex flex-1 flex-col gap-6" aria-label="Principal">
        <div className="flex flex-col gap-0.5">
          {navItems.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end === true}
              className={({ isActive }) =>
                [
                  'rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors',
                  isActive
                    ? 'bg-brand/10 text-brand'
                    : 'text-ink hover:bg-ink/[0.04]',
                ].join(' ')
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Administração
          </p>
          <div className="flex flex-col gap-0.5">
            {adminNavItems.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end === true}
                className={({ isActive }) =>
                  [
                    'rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors',
                    isActive
                      ? 'bg-brand/10 text-brand'
                      : 'text-ink hover:bg-ink/[0.04]',
                  ].join(' ')
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
      <div className="mt-auto space-y-3">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[15px] font-medium text-ink-muted transition-colors hover:bg-ink/[0.04] hover:text-ink"
        >
          {theme === 'dark' ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          )}
          {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        </button>
        <div className="rounded-2xl border border-ink/10 bg-surface/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <p className="text-xs font-medium text-ink-muted">Modo protótipo</p>
          <p className="mt-1 text-[13px] leading-snug text-ink">
            Dados fictícios para validar fluxos com o time.
          </p>
        </div>
      </div>
    </aside>
  )
}
