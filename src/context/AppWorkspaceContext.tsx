import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../lib/api'
import type { MedCofInstagramAccount, ProductMetric } from '../data/mock'

export type AppWorkspaceId = 'socialcof' | 'diretoria-medica'

const STORAGE_KEY = 'socialcof-workspace'

type AppWorkspaceContextValue = {
  workspaceId: AppWorkspaceId
  setWorkspaceId: (id: AppWorkspaceId) => void
  brandShortName: string
  brandSubtitle: string
  products: ProductMetric[]
  instagramAccounts: MedCofInstagramAccount[]
  isLoading: boolean
  loadError: string | null
}

type ApiInstagramAccount = {
  id: string
  externalId?: string
  handle: string
  displayName: string
  followers?: number
  workspace?: string
}

type ApiProduct = {
  id: string
  name: string
  slug: string
  defaultPrompt?: string
  linkedInstagramAccountIds?: string[]
}

const AppWorkspaceContext = createContext<AppWorkspaceContextValue | null>(null)

function toMedCofAccount(a: ApiInstagramAccount): MedCofInstagramAccount {
  const id = a.externalId ?? a.id
  return {
    id,
    handle: a.handle,
    displayName: a.displayName,
    profileUrl: `https://www.instagram.com/${a.handle}/`,
    followers: a.followers ?? 0,
  }
}

function toProductMetric(p: ApiProduct): ProductMetric {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    defaultPrompt: p.defaultPrompt,
    linkedInstagramAccountIds: p.linkedInstagramAccountIds ?? [],
    postsThisMonth: 0,
    carouselsThisMonth: 0,
    avgEngagementPct: 0,
    reach30d: 0,
    topFormat: 'Carrossel',
  }
}

const WORKSPACE_BRAND: Record<AppWorkspaceId, { shortName: string; subtitle: string }> = {
  'socialcof': { shortName: 'Social Cof', subtitle: 'Produtos' },
  'diretoria-medica': { shortName: 'Social Cof', subtitle: 'Médicos' },
}

/**
 * Fornece marca, produtos e contas conforme o workspace ativo (carregados da API).
 */
export function AppWorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaceId, setWorkspaceIdState] = useState<AppWorkspaceId>(() => {
    if (typeof window === 'undefined') return 'socialcof'
    const v = window.localStorage.getItem(STORAGE_KEY)
    return v === 'diretoria-medica' ? 'diretoria-medica' : 'socialcof'
  })
  const [instagramAccounts, setInstagramAccounts] = useState<MedCofInstagramAccount[]>([])
  const [products, setProducts] = useState<ProductMetric[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const setWorkspaceId = useCallback((id: AppWorkspaceId) => {
    setWorkspaceIdState(id)
    window.localStorage.setItem(STORAGE_KEY, id)
  }, [])

  useEffect(() => {
    setIsLoading(true)
    setLoadError(null)
    Promise.all([
      api.get<ApiInstagramAccount[]>('/instagram-accounts'),
      api.get<ApiProduct[]>('/products'),
    ])
      .then(([accounts, prods]) => {
        setInstagramAccounts(accounts.map(toMedCofAccount))
        setProducts(prods.map(toProductMetric))
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        setLoadError(msg)
      })
      .finally(() => setIsLoading(false))
  }, [workspaceId])

  const brand = WORKSPACE_BRAND[workspaceId]

  const value = useMemo(
    (): AppWorkspaceContextValue => ({
      workspaceId,
      setWorkspaceId,
      brandShortName: brand.shortName,
      brandSubtitle: brand.subtitle,
      products,
      instagramAccounts,
      isLoading,
      loadError,
    }),
    [workspaceId, setWorkspaceId, brand, products, instagramAccounts, isLoading, loadError],
  )

  useEffect(() => {
    document.title = `${brand.shortName} — ${brand.subtitle}`
  }, [brand])

  return (
    <AppWorkspaceContext.Provider value={value}>
      {children}
    </AppWorkspaceContext.Provider>
  )
}

/**
 * Acesso ao workspace ativo (marca, produtos, contas Instagram).
 */
export function useAppWorkspace(): AppWorkspaceContextValue {
  const ctx = useContext(AppWorkspaceContext)
  if (!ctx) {
    throw new Error('useAppWorkspace deve ser usado dentro de AppWorkspaceProvider')
  }
  return ctx
}
