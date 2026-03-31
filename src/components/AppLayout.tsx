import { Outlet } from 'react-router-dom'
import { useAppWorkspace } from '../context/AppWorkspaceContext'
import { AppFooter } from './AppFooter'
import { Sidebar } from './Sidebar'

/**
 * Layout em duas colunas: menu lateral, conteúdo e rodapé legal.
 */
export function AppLayout() {
  const { workspaceId } = useAppWorkspace()
  return (
    <div className="flex min-h-dvh bg-surface">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="min-w-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-8 py-10">
            <Outlet key={workspaceId} />
          </div>
        </main>
        <AppFooter />
      </div>
    </div>
  )
}
