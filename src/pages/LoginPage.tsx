import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'

/**
 * Tela de login: autentica via POST /auth/login ou POST /auth/google e redireciona para o dashboard.
 */
export function LoginPage() {
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
        setError('E-mail ou senha inválidos.')
      } else {
        setError(`Erro ao conectar: ${msg}`)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSuccess(credential: string) {
    setError('')
    setLoading(true)
    try {
      await loginWithGoogle(credential)
      navigate('/', { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('403')) {
        setError('Acesso restrito ao domínio @grupomedcof.com.br.')
      } else {
        setError(`Erro ao autenticar com Google: ${msg}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Social Cof
          </h1>
          <p className="mt-1 text-[14px] text-ink-muted">
            Entre com seu e-mail e senha
          </p>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="space-y-4 rounded-2xl border border-ink/[0.08] bg-card p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
        >
          <div>
            <label
              htmlFor="login-email"
              className="text-sm font-medium text-ink"
            >
              E-mail
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              placeholder="nome@empresa.com.br"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="text-sm font-medium text-ink"
            >
              Senha
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-brand py-3 text-[15px] font-medium text-white transition hover:bg-brand-hover disabled:opacity-60"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>

          <div className="relative flex items-center gap-3">
            <div className="h-px flex-1 bg-ink/[0.08]" />
            <span className="text-[12px] text-ink-muted">ou</span>
            <div className="h-px flex-1 bg-ink/[0.08]" />
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={({ credential }) => {
                if (credential) void handleGoogleSuccess(credential)
              }}
              onError={() => setError('Erro ao autenticar com Google.')}
              width={300}
              text="signin_with"
              shape="pill"
            />
          </div>
        </form>
      </div>
    </div>
  )
}
