import { Outlet } from 'react-router-dom'
import { useAppWorkspace } from '../context/AppWorkspaceContext'
import { Sidebar } from './Sidebar'

/**
 * Layout em duas colunas: menu lateral e área de conteúdo.
 */
export function AppLayout() {
  const { workspaceId } = useAppWorkspace()
  return (
    <div className="flex min-h-dvh bg-[#f5f5f7]">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-8 py-10">
          <Outlet key={workspaceId} />
        </div>
      </main>
    </div>
  )
}
