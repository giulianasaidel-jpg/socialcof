import { useEffect, useState } from 'react'
import { useAppWorkspace } from '../context/AppWorkspaceContext'
import { referencePosts } from '../data/mock'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  clearPrefillPayload,
  readInitialPostBriefingFromStorage,
  readPrefillPayload,
  type CreatePagePrefill,
} from '../services/createPrefill'

/**
 * Monta hashtags simples a partir de termos (protótipo SEO).
 */
function toHashtag(term: string): string {
  const t = term
    .trim()
    .replace(/^#+/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
  return t ? `#${t}` : ''
}

/**
 * Gera rascunho de legenda com foco em palavra-chave, termos e CTA (protótipo).
 */
function generateSeoCaption(input: {
  primaryKeyword: string
  secondaryTerms: string
  cta: string
  briefing: string
  contentType: string
  productName: string
  handle: string
}): string {
  const primary = input.primaryKeyword.trim()
  if (!primary) return ''

  const secondaries = input.secondaryTerms
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)

  const briefingLine =
    input.briefing.trim().slice(0, 220) ||
    `Conteúdo em ${input.contentType.toLowerCase()} para médicos e estudantes.`

  const forTags = [primary, ...secondaries].slice(0, 12)
  const hashtags = forTags.map(toHashtag).filter(Boolean).join(' ')

  const ctaBlock =
    input.cta.trim() ||
    'Quer ir além? Comenta sua dúvida ou acessa o link na bio.'

  return [
    `${primary} — ${briefingLine}`,
    '',
    secondaries.length > 0
      ? `Também cobrimos: ${secondaries.join(', ')}.`
      : '',
    '',
    ctaBlock,
    '',
    `— ${input.productName} · @${input.handle}`,
    '',
    hashtags,
  ]
    .filter((line) => line !== '')
    .join('\n')
}

const STOPWORDS = new Set([
  'de',
  'da',
  'do',
  'das',
  'dos',
  'e',
  'o',
  'a',
  'os',
  'as',
  'em',
  'no',
  'na',
  'nos',
  'nas',
  'um',
  'uma',
  'para',
  'com',
  'por',
  'que',
  'se',
  'ao',
  'aos',
  'à',
  'às',
])

/**
 * Primeira frase ou trecho curto para gancho da legenda.
 */
function firstSentenceOrHook(text: string): string {
  const t = text.trim()
  if (!t) return ''
  const byStop = t.split(/[.!?]\s/u)
  const first = byStop[0]?.trim() ?? t
  return first.length > 130 ? `${first.slice(0, 127)}…` : first
}

/**
 * Sugere termos para hashtag a partir do corpo (frequência simples).
 */
function suggestTermsFromBody(body: string, max: number): string[] {
  const lower = body.toLowerCase()
  const words = lower.match(/[\p{L}\p{N}]{3,}/gu) ?? []
  const freq = new Map<string, number>()
  for (const w of words) {
    if (STOPWORDS.has(w)) continue
    freq.set(w, (freq.get(w) ?? 0) + 1)
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w)
}

/**
 * Monta legenda SEO a partir do texto do post gerado/colado (protótipo).
 */
function generateSeoCaptionFromPostContent(input: {
  postBody: string
  primaryKeyword: string
  secondaryTerms: string
  cta: string
  productName: string
  handle: string
  contentType: string
}): string {
  const body = input.postBody.trim()
  if (!body) return ''

  const headLine =
    input.primaryKeyword.trim() || firstSentenceOrHook(body)
  const mainBlock =
    body.length <= 2100 ? body : `${body.slice(0, 2050).trim()}…`

  const fromField = input.secondaryTerms
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const fromBody = suggestTermsFromBody(body, 6)
  const merged = [...fromField, ...fromBody]
  const uniqueSecondaries: string[] = []
  const seen = new Set<string>()
  for (const term of merged) {
    const k = term.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    uniqueSecondaries.push(term)
    if (uniqueSecondaries.length >= 10) break
  }

  const ctaBlock =
    input.cta.trim() ||
    'Comenta o que achou e segue @' +
      input.handle +
      ' para mais conteúdo na área da saúde.'

  const tagSeed = [
    input.primaryKeyword.trim() || headLine,
    ...uniqueSecondaries,
  ]
  const hashtags = tagSeed
    .slice(0, 12)
    .map((raw) => toHashtag(raw.replace(/\s+/g, '')))
    .filter(Boolean)
    .join(' ')

  return [
    headLine,
    '',
    mainBlock,
    '',
    ctaBlock,
    '',
    `— ${input.productName} · @${input.handle} · ${input.contentType}`,
    '',
    hashtags,
  ].join('\n')
}

/**
 * Fluxo: conta Instagram, briefing, links de inspiração, formato, gerador de legenda SEO e Canva.
 */
type CreateLocationState = { createPrefill?: CreatePagePrefill }

export function CreatePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { products, instagramAccounts, brandShortName, brandSubtitle } =
    useAppWorkspace()
  const brandLine = `${brandShortName} · ${brandSubtitle}`
  const [targetAccountId, setTargetAccountId] = useState(
    instagramAccounts[0].id,
  )
  const [postBriefing, setPostBriefing] = useState(
    readInitialPostBriefingFromStorage,
  )
  const [url, setUrl] = useState('https://instagram.com/p/ABC123ficticio')
  const [referenceVideoUrl, setReferenceVideoUrl] = useState('')
  const [productId, setProductId] = useState(products[0].id)
  const [contentType, setContentType] = useState<'Post' | 'Carrossel'>(
    'Carrossel',
  )
  const [seoCaption, setSeoCaption] = useState('')
  const [seoPrimaryKeyword, setSeoPrimaryKeyword] = useState('')
  const [seoSecondaryTerms, setSeoSecondaryTerms] = useState('')
  const [seoCta, setSeoCta] = useState('')
  const [canvaLink, setCanvaLink] = useState('')
  const [postGeneratedContent, setPostGeneratedContent] = useState('')
  const [studioExtraNotes, setStudioExtraNotes] = useState('')
  const [studioFeedback, setStudioFeedback] = useState('')
  const [step, setStep] = useState<1 | 2>(1)

  useEffect(() => {
    const fromRouter = (location.state as CreateLocationState | null)
      ?.createPrefill
    const fromStorage = readPrefillPayload()
    const prefill: CreatePagePrefill | null = fromRouter ?? fromStorage
    if (!prefill) return

    if (instagramAccounts.some((a) => a.id === prefill.accountId)) {
      setTargetAccountId(prefill.accountId)
    }
    if (prefill.productId && products.some((p) => p.id === prefill.productId)) {
      setProductId(prefill.productId)
    }
    setStep(1)
    navigate('.', { replace: true, state: {} })
    const clearTimer = window.setTimeout(() => clearPrefillPayload(), 450)
    return () => window.clearTimeout(clearTimer)
  }, [location.state, instagramAccounts, products, navigate])

  const matchedRef = referencePosts.find(
    (r) => r.instagramUrl === url.trim(),
  )
  const matchedVideoRef = referencePosts.find(
    (r) => r.instagramUrl === referenceVideoUrl.trim(),
  )
  const targetAccount = instagramAccounts.find(
    (a) => a.id === targetAccountId,
  )

  const referenceSummaryParts: string[] = []
  if (matchedRef) referenceSummaryParts.push(`post “${matchedRef.title}”`)
  else if (url.trim()) referenceSummaryParts.push('link de post (livre)')
  if (matchedVideoRef)
    referenceSummaryParts.push(`vídeo “${matchedVideoRef.title}”`)
  else if (referenceVideoUrl.trim())
    referenceSummaryParts.push('link de vídeo (livre)')

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Novo conteúdo
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
          Escolha a conta, descreva o que você quer no post e, se quiser, envie
          links opcionais de post ou vídeo/Reels para inspiração. Depois defina
          produto e formato. A análise de concorrentes está em Concorrência no
          menu.
        </p>
      </header>

      <div className="flex gap-2 text-[13px] font-medium text-ink-muted">
        <span
          className={
            step === 1
              ? 'text-brand'
              : ''
          }
        >
          1 · Conta e links
        </span>
        <span aria-hidden>—</span>
        <span className={step === 2 ? 'text-brand' : ''}>
          2 · Formato, gerador SEO e Canva
        </span>
      </div>

      {step === 1 && (
        <section className="rounded-2xl border border-black/[0.06] bg-white p-8 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <div className="border-b border-black/[0.06] pb-8">
            <label
              htmlFor="target-account"
              className="text-sm font-medium text-ink"
            >
              Conta de destino
            </label>
            <p className="mt-1 text-[13px] text-ink-muted">
              O tom e o público do rascunho seguirão esta linha do ecossistema{' '}
              {brandLine}.
            </p>
            <select
              id="target-account"
              value={targetAccountId}
              onChange={(e) => setTargetAccountId(e.target.value)}
              className="mt-3 w-full rounded-xl border border-black/[0.1] bg-[#fafafa] px-4 py-3 text-[15px] text-ink outline-none ring-brand focus:border-brand focus:ring-2 focus:ring-brand/20"
            >
              {instagramAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.displayName} (@{a.handle})
                </option>
              ))}
            </select>
            {targetAccount && (
              <a
                href={targetAccount.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-[13px] font-medium text-brand hover:underline"
              >
                Abrir perfil no Instagram
              </a>
            )}

            <label
              htmlFor="post-briefing"
              className="mt-8 block text-sm font-medium text-ink"
            >
              O que você quer neste post?
            </label>
            <p className="mt-1 text-[13px] text-ink-muted">
              Descreva o tema, tom, CTA ou ideias. Isso orienta a criação do
              conteúdo para a conta selecionada.
            </p>
            <textarea
              id="post-briefing"
              value={postBriefing}
              onChange={(e) => setPostBriefing(e.target.value)}
              rows={5}
              className="mt-3 w-full resize-y rounded-xl border border-black/[0.1] bg-[#fafafa] px-4 py-3 text-[15px] leading-relaxed text-ink outline-none ring-brand placeholder:text-ink-subtle focus:border-brand focus:ring-2 focus:ring-brand/20"
              placeholder="Ex.: Carrossel sobre erros comuns na prova de R1, linguagem leve, CTA para o grupo do Telegram…"
            />
          </div>

          <div className="border-t border-black/[0.06] pt-8">
            <h2 className="text-sm font-semibold text-ink">
              Links de inspiração (opcional)
            </h2>
            <p className="mt-1 text-[13px] text-ink-muted">
              Cole qualquer link público do Instagram; o de vídeo vale para
              Reels ou vídeo no feed. Para métricas de concorrentes por produto,
              use a página Concorrência.
            </p>

            <label
              htmlFor="ig-url"
              className="mt-6 block text-sm font-medium text-ink"
            >
              Link de post ou carrossel
            </label>
          <input
            id="ig-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-2 w-full rounded-xl border border-black/[0.1] bg-[#fafafa] px-4 py-3 text-[15px] text-ink outline-none ring-brand transition-shadow focus:border-brand focus:ring-2 focus:ring-brand/20"
            placeholder="https://instagram.com/p/..."
          />
            <p className="mt-2 text-[13px] text-ink-muted">
              O link é guardado no fluxo; não há pré-visualização do post aqui.
            </p>

            <label
              htmlFor="ig-video-url"
              className="mt-8 block text-sm font-medium text-ink"
            >
              Link de vídeo ou Reels
            </label>
            <input
              id="ig-video-url"
              type="url"
              value={referenceVideoUrl}
              onChange={(e) => setReferenceVideoUrl(e.target.value)}
              className="mt-2 w-full rounded-xl border border-black/[0.1] bg-[#fafafa] px-4 py-3 text-[15px] text-ink outline-none ring-brand transition-shadow focus:border-brand focus:ring-2 focus:ring-brand/20"
              placeholder="https://www.instagram.com/reel/… ou /p/… (vídeo)"
            />
            <p className="mt-2 text-[13px] text-ink-muted">
              Opcional. Sem pré-visualização — só o endereço segue no fluxo.
            </p>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-full bg-brand px-6 py-2.5 text-[15px] font-medium text-white transition hover:bg-brand-hover active:scale-[0.98]"
            >
              Continuar
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-6 rounded-2xl border border-black/[0.06] bg-white p-8 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <div className="rounded-xl border border-black/[0.06] bg-[#fafafa] px-4 py-3 text-[14px] text-ink-muted">
            <span className="font-medium text-ink">Conta de destino:</span>{' '}
            {targetAccount ? (
              <>
                {targetAccount.displayName}{' '}
                <span className="text-ink-muted">
                  (@{targetAccount.handle})
                </span>
              </>
            ) : (
              '—'
            )}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-ink">Produto</p>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="mt-2 w-full rounded-xl border border-black/[0.1] bg-[#fafafa] px-4 py-3 text-[15px] text-ink outline-none ring-brand focus:border-brand focus:ring-2 focus:ring-brand/20"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-sm font-medium text-ink">Tipo de peça</p>
              <div className="mt-2 flex gap-2">
                {(['Post', 'Carrossel'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setContentType(t)}
                    className={[
                      'flex-1 rounded-xl border px-4 py-3 text-[15px] font-medium transition',
                      contentType === t
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-black/[0.08] bg-[#fafafa] text-ink hover:border-black/[0.12]',
                    ].join(' ')}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <label
              htmlFor="post-generated-content"
              className="text-sm font-semibold text-ink"
            >
              Conteúdo gerado do post
            </label>
            <p className="mt-1 text-[13px] text-ink-muted">
              Cole aqui o texto final do post (carrossel, legenda bruta do
              assistente ou exportação). A legenda SEO abaixo pode ser criada
              automaticamente com base neste conteúdo.
            </p>
            <textarea
              id="post-generated-content"
              value={postGeneratedContent}
              onChange={(e) => setPostGeneratedContent(e.target.value)}
              rows={8}
              className="mt-3 w-full resize-y rounded-xl border border-black/[0.1] bg-[#fafafa] px-4 py-3 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-subtle focus:border-brand focus:ring-2 focus:ring-brand/20"
              placeholder="Cole o conteúdo gerado do post (títulos dos slides, parágrafos, bullets…)"
            />
            <p className="mt-3 text-[12px] text-ink-muted">
              A geração da legenda com SEO fica no bloco{' '}
              <strong className="text-ink">
                Studio — {brandLine}
              </strong>
              , logo abaixo.
            </p>
          </div>

          <div className="rounded-2xl border-2 border-brand/30 bg-gradient-to-b from-brand/[0.08] to-white p-6 shadow-[0_4px_24px_rgba(226,38,60,0.12)]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">
              Studio — {brandLine}
            </p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-ink">
              Gerar legenda com SEO
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
              O Studio monta a legenda pronta para publicação: estrutura com
              gancho, corpo, CTA, assinatura e hashtags. Usa o{' '}
              <strong className="font-medium text-ink">
                conteúdo gerado
              </strong>{' '}
              (caixa acima) ou o briefing do passo 1; se você preencher a
              palavra-chave nos campos SEO mais abaixo, ela entra na abertura e
              nas tags.
            </p>
            <label
              htmlFor="studio-extra-notes"
              className="mt-4 block text-[13px] font-medium text-ink-muted"
            >
              Orientações extras para o Studio (opcional)
              <textarea
                id="studio-extra-notes"
                value={studioExtraNotes}
                onChange={(e) => setStudioExtraNotes(e.target.value)}
                rows={2}
                className="mt-1.5 w-full resize-y rounded-xl border border-brand/20 bg-white px-4 py-2.5 text-[15px] leading-relaxed text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                placeholder="Ex.: tom mais formal; evitar emojis; incluir menção a edital 2026…"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setStudioFeedback('')
                let base =
                  postGeneratedContent.trim() || postBriefing.trim()
                if (studioExtraNotes.trim()) {
                  base = base
                    ? `${base}\n\n— Orientações do Studio: ${studioExtraNotes.trim()}`
                    : `— Orientações: ${studioExtraNotes.trim()}`
                }
                const handle =
                  targetAccount?.handle ?? instagramAccounts[0]?.handle ?? 'conta'
                const productName =
                  products.find((p) => p.id === productId)?.name ??
                  brandShortName

                if (base.trim()) {
                  setSeoCaption(
                    generateSeoCaptionFromPostContent({
                      postBody: base,
                      primaryKeyword: seoPrimaryKeyword,
                      secondaryTerms: seoSecondaryTerms,
                      cta: seoCta,
                      productName,
                      handle,
                      contentType,
                    }),
                  )
                  setStudioFeedback(
                    'Legenda gerada pelo Studio. Revise na caixa “Legenda (editável)”.',
                  )
                  return
                }

                if (seoPrimaryKeyword.trim()) {
                  const text = generateSeoCaption({
                    primaryKeyword: seoPrimaryKeyword,
                    secondaryTerms: seoSecondaryTerms,
                    cta: seoCta,
                    briefing: postBriefing,
                    contentType,
                    productName,
                    handle,
                  })
                  if (text) {
                    setSeoCaption(text)
                    setStudioFeedback(
                      'Legenda gerada a partir da palavra-chave (sem texto longo de post).',
                    )
                  }
                  return
                }

                setStudioFeedback(
                  'Preencha o conteúdo gerado (acima) ou o briefing no passo 1, ou informe a palavra-chave principal no bloco SEO abaixo.',
                )
              }}
              className="mt-5 w-full rounded-xl bg-brand py-3.5 text-[15px] font-semibold text-white shadow-sm hover:bg-brand-hover active:scale-[0.99] sm:w-auto sm:px-8"
            >
              Gerar legenda no Studio (SEO)
            </button>
            {studioFeedback ? (
              <p
                className={`mt-3 text-[13px] ${
                  studioFeedback.startsWith('Preencha')
                    ? 'text-amber-800'
                    : 'text-ink'
                }`}
              >
                {studioFeedback}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="canva-link"
              className="text-sm font-medium text-ink"
            >
              Link do design no Canva
            </label>
            <p className="mt-1 text-[13px] text-ink-muted">
              Cole o link do modelo pré-pronto ou do arquivo compartilhado no
              Canva.
            </p>
            <input
              id="canva-link"
              type="url"
              value={canvaLink}
              onChange={(e) => setCanvaLink(e.target.value)}
              className="mt-2 w-full rounded-xl border border-black/[0.1] bg-[#fafafa] px-4 py-3 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              placeholder="https://www.canva.com/design/…"
            />
          </div>

          <div className="rounded-2xl border border-black/[0.06] bg-[#fafafa] p-6">
            <h3 className="text-sm font-semibold text-ink">
              Gerador de legenda com SEO
            </h3>
            <p className="mt-1 text-[13px] text-ink-muted">
              Palavra-chave e termos refinam a legenda automática (acima) e o
              botão manual abaixo. Se vazios, a linha de abertura e hashtags vêm
              do próprio texto do post.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-[13px] font-medium text-ink-muted">
                Palavra-chave principal *
                <input
                  type="text"
                  value={seoPrimaryKeyword}
                  onChange={(e) => setSeoPrimaryKeyword(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-black/[0.1] bg-white px-4 py-2.5 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  placeholder="Ex.: prova de residência médica"
                />
              </label>
              <label className="block text-[13px] font-medium text-ink-muted">
                Termos secundários (opcional)
                <input
                  type="text"
                  value={seoSecondaryTerms}
                  onChange={(e) => setSeoSecondaryTerms(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-black/[0.1] bg-white px-4 py-2.5 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  placeholder="Separados por vírgula: R1, estudo, plantão"
                />
              </label>
            </div>
            <label className="mt-4 block text-[13px] font-medium text-ink-muted">
              CTA desejado (opcional)
              <input
                type="text"
                value={seoCta}
                onChange={(e) => setSeoCta(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-black/[0.1] bg-white px-4 py-2.5 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                placeholder="Ex.: Link na bio para lista de espera"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                const handle =
                  targetAccount?.handle ?? instagramAccounts[0]?.handle ?? 'conta'
                const productName =
                  products.find((p) => p.id === productId)?.name ??
                  brandShortName
                const text = generateSeoCaption({
                  primaryKeyword: seoPrimaryKeyword,
                  secondaryTerms: seoSecondaryTerms,
                  cta: seoCta,
                  briefing: postBriefing,
                  contentType,
                  productName,
                  handle,
                })
                if (text) setSeoCaption(text)
              }}
              className="mt-4 rounded-full bg-brand px-5 py-2.5 text-[14px] font-medium text-white hover:bg-brand-hover active:scale-[0.98]"
            >
              Gerar legenda com SEO
            </button>
            {!seoPrimaryKeyword.trim() ? (
              <p className="mt-2 text-[12px] text-ink-subtle">
                * Preencha a palavra-chave principal para gerar.
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="seo-caption"
              className="text-sm font-medium text-ink"
            >
              Legenda (editável)
            </label>
            <p className="mt-1 text-[13px] text-ink-muted">
              Resultado do gerador ou texto colado manualmente.
            </p>
            <textarea
              id="seo-caption"
              value={seoCaption}
              onChange={(e) => setSeoCaption(e.target.value)}
              rows={8}
              className="mt-2 w-full resize-y rounded-xl border border-black/[0.1] bg-[#fafafa] px-4 py-3 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-subtle focus:border-brand focus:ring-2 focus:ring-brand/20"
              placeholder="Gere acima ou escreva aqui…"
            />
          </div>

          <div className="space-y-3 rounded-xl bg-[#f5f5f7] p-5 text-[14px] text-ink-muted">
            <p>
              <strong className="font-medium text-ink">Resumo:</strong>{' '}
              {contentType} para{' '}
              <span className="text-ink">
                {products.find((p) => p.id === productId)?.name}
              </span>
              {targetAccount && (
                <>
                  , canal{' '}
                  <span className="text-ink">@{targetAccount.handle}</span>
                </>
              )}
              .
            </p>
            {postBriefing.trim() ? (
              <p>
                <strong className="font-medium text-ink">
                  Seu pedido:
                </strong>{' '}
                <span className="whitespace-pre-wrap text-ink/90">
                  {postBriefing.trim().length > 320
                    ? `${postBriefing.trim().slice(0, 320)}…`
                    : postBriefing.trim()}
                </span>
              </p>
            ) : (
              <p className="text-[13px] italic text-ink-subtle">
                Nenhum texto de solicitação — você pode voltar e preencher.
              </p>
            )}
            <p>
              <strong className="font-medium text-ink">
                Links de inspiração:
              </strong>{' '}
              {referenceSummaryParts.length > 0
                ? referenceSummaryParts.join(' · ')
                : 'nenhum link informado.'}
            </p>
            {canvaLink.trim() ? (
              <p>
                <strong className="font-medium text-ink">Canva:</strong>{' '}
                <span className="break-all text-ink/90">{canvaLink}</span>
              </p>
            ) : null}
            {seoCaption.trim() ? (
              <p>
                <strong className="font-medium text-ink">
                  Legenda SEO:
                </strong>{' '}
                <span className="whitespace-pre-wrap text-ink/90">
                  {seoCaption.trim().length > 200
                    ? `${seoCaption.trim().slice(0, 200)}…`
                    : seoCaption.trim()}
                </span>
              </p>
            ) : (
              <p className="text-[13px] italic text-ink-subtle">
                Legenda SEO vazia — preencha acima se quiser enviar ao fluxo.
              </p>
            )}
          </div>

          <div className="flex flex-wrap justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-full border border-black/[0.12] bg-white px-5 py-2.5 text-[15px] font-medium text-ink hover:bg-black/[0.03]"
            >
              Voltar
            </button>
            <button
              type="button"
              className="rounded-full bg-brand px-6 py-2.5 text-[15px] font-medium text-white hover:bg-brand-hover active:scale-[0.98]"
            >
              Abrir editor (protótipo)
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
