import { NavLink } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

type NavItem = { to: string; label: string; end?: boolean; locked?: boolean }
type NavGroup = { label: string; items: NavItem[] }

const topNavItems: NavItem[] = [
  { to: '/', label: 'Painel geral', end: true },
  { to: '/central-de-perfis', label: 'Central de perfis' },
  { to: '/interesses-por-perfil', label: 'Interesses por perfil' },
  { to: '/branding', label: 'Branding' },
  { to: '/noticias', label: 'Atualizações Sites' },
]

const navGroups: NavGroup[] = [
  {
    label: 'Design templates',
    items: [
      { to: '/twitter-posts', label: 'Twitter-like posts' },
    ],
  },
]

const adminNavItems: NavItem[] = [
  { to: '/admin', label: 'Painel admin', end: true },
  { to: '/central-de-sites', label: 'Central de Sites' },
]

function NavItemEl({ item }: { item: NavItem }) {
  if (item.locked) {
    return (
      <span className="flex items-center justify-between rounded-xl px-3 py-2 text-[14px] font-medium text-ink/30 cursor-not-allowed select-none">
        {item.label}
        <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink/40">
          Em breve
        </span>
      </span>
    )
  }

  return (
    <NavLink
      to={item.to}
      end={item.end === true}
      className={({ isActive }) =>
        [
          'rounded-xl px-3 py-2 text-[14px] font-medium transition-colors',
          isActive ? 'bg-brand/10 text-brand' : 'text-ink hover:bg-ink/[0.04]',
        ].join(' ')
      }
    >
      {item.label}
    </NavLink>
  )
}

/**
 * Navegação lateral principal do protótipo Social Cof.
 */
export function Sidebar() {
  const { theme, toggleTheme } = useTheme()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-ink/10 bg-white/70 px-4 py-6 shadow-[4px_0_32px_rgba(28,29,32,0.06)] backdrop-blur-2xl dark:bg-[#1c1d20]/95 dark:shadow-[4px_0_32px_rgba(0,0,0,0.3)]">
      <div className="mb-6 px-3 flex items-center gap-3">
        <span className="text-3xl">🩺</span>
        <span className="text-[24px] font-extrabold tracking-tight text-ink">SocialCof</span>
      </div>

      <nav className="flex flex-1 flex-col gap-5" aria-label="Principal">
        <div className="flex flex-col gap-0.5">
          {topNavItems.map((item) => (
            <NavItemEl key={item.to} item={item} />
          ))}
        </div>

        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavItemEl key={item.to} item={item} />
              ))}
            </div>
          </div>
        ))}

        {isAdmin && (
          <div>
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
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
                      'rounded-xl px-3 py-2 text-[14px] font-medium transition-colors',
                      isActive ? 'bg-brand/10 text-brand' : 'text-ink hover:bg-ink/[0.04]',
                    ].join(' ')
                  }
                >
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        )}
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
