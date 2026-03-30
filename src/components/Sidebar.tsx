import { NavLink } from 'react-router-dom'
import { useAppWorkspace } from '../context/AppWorkspaceContext'

type NavItem = { to: string; label: string; end?: boolean }

const navItems: NavItem[] = [
  { to: '/', label: 'Visão geral', end: true },
  { to: '/criar', label: 'Novo conteúdo' },
  { to: '/concorrencia', label: 'Concorrência' },
  { to: '/produtos', label: 'Produtos' },
  { to: '/agenda', label: 'Agenda' },
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

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-black/[0.06] bg-white/80 px-4 py-6 backdrop-blur-xl">
      <div
        className="mb-6 flex flex-col gap-1 rounded-xl border border-black/[0.08] bg-[#fafafa] p-1"
        role="group"
        aria-label="Linha Social Cof"
      >
        <button
          type="button"
          onClick={() => setWorkspaceId('socialcof')}
          className={[
            'w-full rounded-lg px-2 py-2 text-left text-[10px] font-semibold leading-tight transition',
            workspaceId === 'socialcof'
              ? 'bg-[#0071e3] text-white'
              : 'text-[#6e6e73] hover:bg-white',
          ].join(' ')}
        >
          Social Cof — produtos
        </button>
        <button
          type="button"
          onClick={() => setWorkspaceId('diretoria-medica')}
          className={[
            'w-full rounded-lg px-2 py-2 text-left text-[10px] font-semibold leading-tight transition',
            workspaceId === 'diretoria-medica'
              ? 'bg-[#0071e3] text-white'
              : 'text-[#6e6e73] hover:bg-white',
          ].join(' ')}
        >
          Social Cof — médicos
        </button>
      </div>
      <div className="mb-8 px-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6e6e73]">
          {brandShortName}
        </p>
        <p className="mt-0.5 text-lg font-semibold tracking-tight text-[#1d1d1f]">
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
                    ? 'bg-[#0071e3]/10 text-[#0071e3]'
                    : 'text-[#1d1d1f] hover:bg-black/[0.04]',
                ].join(' ')
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#6e6e73]">
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
                      ? 'bg-[#0071e3]/10 text-[#0071e3]'
                      : 'text-[#1d1d1f] hover:bg-black/[0.04]',
                  ].join(' ')
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
      <div className="mt-auto">
        <div className="rounded-2xl border border-black/[0.06] bg-[#f5f5f7] p-4">
          <p className="text-xs font-medium text-[#6e6e73]">Modo protótipo</p>
          <p className="mt-1 text-[13px] leading-snug text-[#1d1d1f]">
            Dados fictícios para validar fluxos com o time.
          </p>
        </div>
      </div>
    </aside>
  )
}
