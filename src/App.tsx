import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AppLayout } from './components/AppLayout'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppWorkspaceProvider } from './context/AppWorkspaceContext'
import { ThemeProvider } from './context/ThemeContext'
import { CreatePage } from './pages/CreatePage'
import { DashboardPage } from './pages/DashboardPage'
import { CompetitorsPage } from './pages/CompetitorsPage'
import { ProductsPage } from './pages/ProductsPage'
import { SchedulePage } from './pages/SchedulePage'
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage'
import { DraftsPage } from './pages/DraftsPage'
import { MedicalNewsPage } from './pages/MedicalNewsPage'
import { TrendsPage } from './pages/TrendsPage'
import { TwitterPostsPage } from './pages/TwitterPostsPage'
import { BrandingPage } from './pages/BrandingPage'
import { TikTokAccountsPage } from './pages/TikTokAccountsPage'
import { TikTokPostsPage } from './pages/TikTokPostsPage'
import { InstagramStoriesPage } from './pages/InstagramStoriesPage'
import { CentralDePerfilsPage } from './pages/CentralDePerfilsPage'
import { LoginPage } from './pages/LoginPage'
import type { ReactNode } from 'react'

/**
 * Protege rotas: redireciona para /login se não autenticado.
 */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="text-[15px] text-ink-muted">Carregando…</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return <>{children}</>
}

/**
 * Rotas do Social Cof.
 */
function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''}>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <RequireAuth>
                  <AppWorkspaceProvider>
                    <AppLayout />
                  </AppWorkspaceProvider>
                </RequireAuth>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="criar" element={<CreatePage />} />
              <Route path="rascunhos" element={<DraftsPage />} />
              <Route path="concorrencia" element={<CompetitorsPage />} />
              <Route
                path="biblioteca"
                element={<Navigate to="/concorrencia" replace />}
              />
              <Route path="produtos" element={<ProductsPage />} />
              <Route path="agenda" element={<SchedulePage />} />
              <Route path="trends" element={<TrendsPage />} />
              <Route path="noticias-medicas" element={<MedicalNewsPage />} />
              <Route path="twitter-posts" element={<TwitterPostsPage />} />
              <Route path="branding" element={<BrandingPage />} />
              <Route path="tiktok" element={<TikTokAccountsPage />} />
              <Route path="tiktok-posts" element={<TikTokPostsPage />} />
              <Route path="instagram-stories" element={<InstagramStoriesPage />} />
              <Route path="central-de-perfis" element={<CentralDePerfilsPage />} />
              <Route path="admin" element={<AdminOverviewPage />} />
              <Route
                path="admin/instagram"
                element={<Navigate to="/admin" replace />}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
    </GoogleOAuthProvider>
  )
}

export default App
