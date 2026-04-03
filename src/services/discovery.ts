import { api as _api, getAccessToken } from '../lib/api'

export type TikTokTrendItem = {
  id: string
  /** Posição no ranking (1 = topo). */
  rank: number
  /** Título ou descrição curta exibida no TikTok / hashtag. */
  title: string
  /** Hashtag principal, sem #. */
  hashtag?: string
  /** Volume relativo ou views estimadas (texto livre do crawler). */
  volumeLabel?: string
  /** ISO 8601 — quando o crawler coletou o item. */
  fetchedAt: string
}

export type NewsCategory =
  | 'education'
  | 'government'
  | 'journal'
  | 'guidelines'
  | 'research'
  | 'global'

export type NewsLanguage = 'pt' | 'en'

export type MedicalNewsItem = {
  id: string
  title: string
  summary: string
  source: string
  url: string
  category: NewsCategory
  language: NewsLanguage
  /** ISO 8601 da publicação original. */
  publishedAt: string
}

export type MedicalNewsResponse = {
  data: MedicalNewsItem[]
  total: number
  page: number
  totalPages: number
}

export type FetchNewsParams = {
  page?: number
  limit?: number
  category?: NewsCategory
  language?: NewsLanguage
  source?: string
  dateFrom?: string
}

/** Conta Instagram usada para montar o briefing de “Gerar post”. */
export type DiscoveryAccountBrief = {
  id: string
  displayName: string
  handle: string
}

export type ProductLinkBrief = {
  id: string
  linkedInstagramAccountIds: string[]
}

const mockTikTokTrends: TikTokTrendItem[] = [
  {
    id: 'tt-1',
    rank: 1,
    title: 'Rotina de skincare com dermatologista',
    hashtag: 'skincaremedico',
    volumeLabel: 'Alto engajamento — BR',
    fetchedAt: new Date().toISOString(),
  },
  {
    id: 'tt-2',
    rank: 2,
    title: 'Mitos sobre vacina em 30 segundos',
    hashtag: 'vacinasalvavidas',
    volumeLabel: 'Em alta',
    fetchedAt: new Date().toISOString(),
  },
  {
    id: 'tt-3',
    rank: 3,
    title: 'Explicando pressão arterial no dia a dia',
    hashtag: 'hipertensao',
    fetchedAt: new Date().toISOString(),
  },
  {
    id: 'tt-4',
    rank: 4,
    title: 'POV: você no plantão',
    hashtag: 'medstudent',
    volumeLabel: 'Crescendo',
    fetchedAt: new Date().toISOString(),
  },
  {
    id: 'tt-5',
    rank: 5,
    title: 'Resposta rápida: quando ir ao PS?',
    hashtag: 'sintomas',
    fetchedAt: new Date().toISOString(),
  },
  {
    id: 'tt-6',
    rank: 6,
    title: 'Rotina de sono para plantonistas',
    hashtag: 'sono',
    volumeLabel: 'Subindo',
    fetchedAt: new Date().toISOString(),
  },
  {
    id: 'tt-7',
    rank: 7,
    title: 'Explicando antibiótico em 45 segundos',
    hashtag: 'antibioticos',
    fetchedAt: new Date().toISOString(),
  },
  {
    id: 'tt-8',
    rank: 8,
    title: 'Mitos sobre jejum intermitente',
    hashtag: 'nutricao',
    fetchedAt: new Date().toISOString(),
  },
  {
    id: 'tt-9',
    rank: 9,
    title: 'Como ler um exame de sangue (série)',
    hashtag: 'exames',
    volumeLabel: 'Estável',
    fetchedAt: new Date().toISOString(),
  },
  {
    id: 'tt-10',
    rank: 10,
    title: 'Dia na vida: clínica geral',
    hashtag: 'clinicamedica',
    fetchedAt: new Date().toISOString(),
  },
]

const mockMedicalNews: MedicalNewsItem[] = [
  {
    id: 'nw-1',
    title: 'Novas diretrizes sobre prevenção cardiovascular são publicadas',
    summary:
      'Sociedades médicas divulgam atualização com foco em fatores de risco modificáveis e rastreamento.',
    source: 'SBC',
    url: 'https://www.cfm.org.br/',
    category: 'guidelines',
    language: 'pt',
    publishedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'nw-2',
    title: 'Estudo discute adesão ao tratamento em condições crônicas',
    summary:
      'Revisão sistemática reforça papel da educação em saúde e do acompanhamento multiprofissional.',
    source: 'SciELO',
    url: 'https://www.scielo.br/',
    category: 'research',
    language: 'pt',
    publishedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'nw-3',
    title: 'Alerta sanitário: orientações para temporada de viagens',
    summary:
      'Órgãos de saúde recomendam calendário vacinal atualizado e cuidados com hidratação.',
    source: 'Ministério da Saúde',
    url: 'https://www.gov.br/saude/pt-br',
    category: 'government',
    language: 'pt',
    publishedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'nw-4',
    title: 'Physical activity and glycaemic control: updated meta-analysis',
    summary:
      'Meta-analysis reinforces moderate-intensity exercise benefits with individualised medical follow-up.',
    source: 'NEJM',
    url: 'https://www.nejm.org/',
    category: 'journal',
    language: 'en',
    publishedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'nw-5',
    title: 'Novas recomendações para rastreamento de certos cânceres',
    summary:
      'Documento técnico atualiza faixas etárias e critérios — sujeito a protocolos locais.',
    source: 'Gov.br Saúde',
    url: 'https://www.gov.br/saude/pt-br',
    category: 'government',
    language: 'pt',
    publishedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'nw-6',
    title: 'Telemedicina: estudo analisa satisfação de pacientes crônicos',
    summary:
      'Resultados mistos apontam necessidade de combinar canais digitais e presenciais.',
    source: 'SciELO',
    url: 'https://www.scielo.br/',
    category: 'research',
    language: 'pt',
    publishedAt: new Date(Date.now() - 86400000 * 6).toISOString(),
  },
  {
    id: 'nw-7',
    title: 'WHO global report on infectious disease preparedness',
    summary:
      'Report highlights surveillance gaps and recommends multilateral response frameworks.',
    source: 'WHO',
    url: 'https://www.who.int/',
    category: 'global',
    language: 'en',
    publishedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: 'nw-8',
    title: 'Diretriz discute manejo de dor em contexto ambulatorial',
    summary:
      'Texto enfatiza avaliação multidimensional e cautela com opioides.',
    source: 'CFM',
    url: 'https://www.cfm.org.br/',
    category: 'guidelines',
    language: 'pt',
    publishedAt: new Date(Date.now() - 86400000 * 8).toISOString(),
  },
  {
    id: 'nw-9',
    title: 'EBSERH lança edital para residência médica 2027',
    summary:
      'Rede federal divulga vagas e calendário para processo seletivo de residência médica.',
    source: 'EBSERH',
    url: 'https://www.gov.br/ebserh/',
    category: 'education',
    language: 'pt',
    publishedAt: new Date(Date.now() - 86400000 * 9).toISOString(),
  },
  {
    id: 'nw-10',
    title: 'ANVISA atualiza bula de anticoagulantes orais diretos',
    summary:
      'Agência publica novas orientações sobre interações medicamentosas e populações especiais.',
    source: 'ANVISA',
    url: 'https://www.gov.br/anvisa/',
    category: 'government',
    language: 'pt',
    publishedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
]

function apiBaseUrl(): string {
  const viteApi = import.meta.env.VITE_API_BASE
  if (typeof viteApi === 'string' && viteApi) return viteApi.replace(/\/$/, '')
  const crawler = import.meta.env.VITE_CRAWLER_API_BASE
  if (typeof crawler === 'string' && crawler) return crawler.replace(/\/$/, '')
  return ''
}

function discoveryHeaders(): Record<string, string> {
  const { getAccessToken } = _api
  const token = getAccessToken()
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

/**
 * Busca trends do TikTok coletadas pelo crawler (GET JSON).
 * Sem URL configurada ou em falha de rede, retorna dados de demonstração.
 */
export async function fetchTikTokTrends(): Promise<TikTokTrendItem[]> {
  const base = apiBaseUrl()
  if (!base) return structuredClone(mockTikTokTrends)

  try {
    const res = await fetch(`${base}/tiktok/trends`, { headers: discoveryHeaders() })
    if (!res.ok) return structuredClone(mockTikTokTrends)
    const data = (await res.json()) as unknown
    if (!Array.isArray(data)) return structuredClone(mockTikTokTrends)
    return data as TikTokTrendItem[]
  } catch {
    return structuredClone(mockTikTokTrends)
  }
}

/**
 * Busca notícias médicas paginadas do crawler (GET /medical-news).
 * Sem URL configurada ou em falha, retorna dados de demonstração.
 */
export async function fetchMedicalNews(
  params: FetchNewsParams = {},
): Promise<MedicalNewsResponse> {
  const mockFallback: MedicalNewsResponse = {
    data: structuredClone(mockMedicalNews),
    total: mockMedicalNews.length,
    page: 1,
    totalPages: 1,
  }

  const base = apiBaseUrl()
  if (!base) return mockFallback

  try {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    if (params.category) query.set('category', params.category)
    if (params.language) query.set('language', params.language)
    if (params.source) query.set('source', params.source)
    if (params.dateFrom) query.set('dateFrom', params.dateFrom)

    const qs = query.toString()
    const url = `${base}/medical-news${qs ? `?${qs}` : ''}`
    const res = await fetch(url, { headers: discoveryHeaders() })
    if (!res.ok) return mockFallback
    return (await res.json()) as MedicalNewsResponse
  } catch {
    return mockFallback
  }
}

/**
 * Retorna a lista de fontes disponíveis no banco (GET /medical-news/sources).
 */
export async function fetchMedicalNewsSources(): Promise<string[]> {
  const base = apiBaseUrl()
  if (!base) return []

  try {
    const res = await fetch(`${base}/medical-news/sources`, {
      headers: discoveryHeaders(),
    })
    if (!res.ok) return []
    return (await res.json()) as string[]
  } catch {
    return []
  }
}

/**
 * Dispara coleta manual de notícias em background (POST /medical-news/refresh).
 */
export async function triggerMedicalNewsRefresh(): Promise<void> {
  const base = apiBaseUrl()
  if (!base) return

  await fetch(`${base}/medical-news/refresh`, {
    method: 'POST',
    headers: discoveryHeaders(),
  })
}

/**
 * Retorna a URL do endpoint SSE com token de autenticação na query string.
 * Retorna string vazia quando não há URL de API configurada (modo demo).
 */
export function buildMedicalNewsSseUrl(): string {
  const base = apiBaseUrl()
  if (!base) return ''
  const token = getAccessToken()
  return `${base}/medical-news/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`
}

/**
 * Conecta ao SSE de novas notícias (GET /medical-news/stream).
 * Retorna uma função para fechar a conexão.
 */
export function connectMedicalNewsStream(
  onNews: (item: MedicalNewsItem) => void,
): () => void {
  const base = apiBaseUrl()
  if (!base) return () => {}

  const token = getAccessToken()
  const url = `${base}/medical-news/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`
  const source = new EventSource(url)

  source.onmessage = (event) => {
    try {
      onNews(JSON.parse(event.data as string) as MedicalNewsItem)
    } catch {
      // ignore malformed events
    }
  }

  return () => source.close()
}

/**
 * Monta o briefing para “Novo conteúdo” a partir de um trend do TikTok.
 */
export function buildBriefingFromTrend(
  trend: TikTokTrendItem,
  account: DiscoveryAccountBrief,
): string {
  const lines = [
    '[Trend TikTok — referência para o post]',
    `Tema em alta: ${trend.title}`,
    trend.hashtag ? `Hashtag em alta: #${trend.hashtag}` : '',
    trend.volumeLabel ? `Contexto (crawler): ${trend.volumeLabel}` : '',
    `Coletado em: ${new Date(trend.fetchedAt).toLocaleString('pt-BR')}`,
    '',
    `[Perfil de destino] ${account.displayName} (@${account.handle})`,
    '',
    'Pedido: gere ideias de Reels ou carrossel educativo em saúde alinhadas a este tema e ao tom desta conta. Evite promessas de cura; mantenha linguagem responsável e, se aplicável, lembre de buscar avaliação presencial.',
  ]
  return lines.filter(Boolean).join('\n')
}

/**
 * Monta o briefing a partir de uma notícia médica.
 */
export function buildBriefingFromNews(
  news: MedicalNewsItem,
  account: DiscoveryAccountBrief,
): string {
  return [
    '[Notícia médica — referência para o post]',
    `Manchete: ${news.title}`,
    `Resumo: ${news.summary}`,
    `Fonte: ${news.source}`,
    `Link: ${news.url}`,
    `Publicado em: ${new Date(news.publishedAt).toLocaleDateString('pt-BR')}`,
    '',
    `[Perfil de destino] ${account.displayName} (@${account.handle})`,
    '',
    'Pedido: gere um post (feed ou carrossel) que comente a notícia com linguagem acessível. Não faça diagnóstico nem substitua consulta; incentive busca por profissional quando necessário.',
  ].join('\n')
}

/**
 * Resolve o produto MedCof vinculado à conta, se existir.
 */
export function productIdForAccount(
  products: ProductLinkBrief[],
  accountId: string,
): string | undefined {
  return products.find((p) => p.linkedInstagramAccountIds.includes(accountId))
    ?.id
}
