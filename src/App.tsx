import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { AppWorkspaceProvider } from './context/AppWorkspaceContext'
import { CreatePage } from './pages/CreatePage'
import { DashboardPage } from './pages/DashboardPage'
import { CompetitorsPage } from './pages/CompetitorsPage'
import { ProductsPage } from './pages/ProductsPage'
import { SchedulePage } from './pages/SchedulePage'
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage'
import { MedicalNewsPage } from './pages/MedicalNewsPage'
import { TrendsPage } from './pages/TrendsPage'

/**
 * Rotas do protótipo de alta fidelidade SocialCof.
 */
function App() {
  return (
    <BrowserRouter>
      <AppWorkspaceProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="criar" element={<CreatePage />} />
            <Route path="concorrencia" element={<CompetitorsPage />} />
            <Route
              path="biblioteca"
              element={<Navigate to="/concorrencia" replace />}
            />
            <Route path="produtos" element={<ProductsPage />} />
            <Route path="agenda" element={<SchedulePage />} />
            <Route path="trends" element={<TrendsPage />} />
            <Route path="noticias-medicas" element={<MedicalNewsPage />} />
            <Route path="admin" element={<AdminOverviewPage />} />
            <Route
              path="admin/instagram"
              element={<Navigate to="/admin" replace />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AppWorkspaceProvider>
    </BrowserRouter>
  )
}

export default App
