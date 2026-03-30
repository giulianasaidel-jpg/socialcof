import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  dashboardPosts,
  dashboardPostsDiretoriaMedica,
  diretoriaMedicaInstagramAccounts,
  diretoriaMedicaProducts,
  medcofInstagramAccounts,
  products,
  type DashboardPost,
  type MedCofInstagramAccount,
  type ProductMetric,
} from '../data/mock'

export type AppWorkspaceId = 'socialcof' | 'diretoria-medica'

const STORAGE_KEY = 'socialcof-workspace'

type AppWorkspaceContextValue = {
  workspaceId: AppWorkspaceId
  setWorkspaceId: (id: AppWorkspaceId) => void
  brandShortName: string
  brandSubtitle: string
  products: ProductMetric[]
  instagramAccounts: MedCofInstagramAccount[]
  dashboardPosts: DashboardPost[]
}

const AppWorkspaceContext = createContext<AppWorkspaceContextValue | null>(
  null,
)

/**
 * Fornece marca, produtos e contas conforme o workspace (produtos ou médicos).
 */
export function AppWorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaceId, setWorkspaceIdState] = useState<AppWorkspaceId>(() => {
    if (typeof window === 'undefined') return 'socialcof'
    const v = window.localStorage.getItem(STORAGE_KEY)
    return v === 'diretoria-medica' ? 'diretoria-medica' : 'socialcof'
  })

  const setWorkspaceId = useCallback((id: AppWorkspaceId) => {
    setWorkspaceIdState(id)
    window.localStorage.setItem(STORAGE_KEY, id)
  }, [])

  const value = useMemo((): AppWorkspaceContextValue => {
    if (workspaceId === 'diretoria-medica') {
      return {
        workspaceId,
        setWorkspaceId,
        brandShortName: 'Social Cof',
        brandSubtitle: 'Médicos',
        products: diretoriaMedicaProducts,
        instagramAccounts: diretoriaMedicaInstagramAccounts,
        dashboardPosts: dashboardPostsDiretoriaMedica,
      }
    }
    return {
      workspaceId,
      setWorkspaceId,
      brandShortName: 'Social Cof',
      brandSubtitle: 'Produtos',
      products,
      instagramAccounts: medcofInstagramAccounts,
      dashboardPosts,
    }
  }, [workspaceId, setWorkspaceId])

  useEffect(() => {
    document.title = `${value.brandShortName} — ${value.brandSubtitle}`
  }, [value.brandShortName, value.brandSubtitle])

  return (
    <AppWorkspaceContext.Provider value={value}>
      {children}
    </AppWorkspaceContext.Provider>
  )
}

/**
 * Acesso ao workspace ativo (marca, produtos, contas Instagram, posts do dashboard).
 */
export function useAppWorkspace(): AppWorkspaceContextValue {
  const ctx = useContext(AppWorkspaceContext)
  if (!ctx) {
    throw new Error('useAppWorkspace deve ser usado dentro de AppWorkspaceProvider')
  }
  return ctx
}
