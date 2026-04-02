import { api as _api } from '../lib/api'

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

export type MedicalNewsItem = {
  id: string
  title: string
  summary: string
  source: string
  url: string
  /** ISO 8601 da publicação original. */
  publishedAt: string
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
    source: 'Simulação — crawler',
    url: 'https://www.cfm.org.br/',
    publishedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'nw-2',
    title: 'Estudo discute adesão ao tratamento em condições crônicas',
    summary:
      'Revisão sistemática reforça papel da educação em saúde e do acompanhamento multiprofissional.',
    source: 'Simulação — crawler',
    url: 'https://www.scielo.br/',
    publishedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'nw-3',
    title: 'Alerta sanitário: orientações para temporada de viagens',
    summary:
      'Órgãos de saúde recomendam calendário vacinal atualizado e cuidados com hidratação.',
    source: 'Simulação — crawler',
    url: 'https://www.gov.br/saude/pt-br',
    publishedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'nw-4',
    title: 'Pesquisa destaca impacto da atividade física no controle glicêmico',
    summary:
      'Metanálise reforça benefícios moderados com acompanhamento médico individualizado.',
    source: 'Simulação — crawler',
    url: 'https://www.cfm.org.br/',
    publishedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'nw-5',
    title: 'Novas recomendações para rastreamento de certos cânceres',
    summary:
      'Documento técnico atualiza faixas etárias e critérios — sujeito a protocolos locais.',
    source: 'Simulação — crawler',
    url: 'https://www.gov.br/saude/pt-br',
    publishedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'nw-6',
    title: 'Telemedicina: estudo analisa satisfação de pacientes crônicos',
    summary:
      'Resultados mistos apontam necessidade de combinar canais digitais e presenciais.',
    source: 'Simulação — crawler',
    url: 'https://www.scielo.br/',
    publishedAt: new Date(Date.now() - 86400000 * 6).toISOString(),
  },
  {
    id: 'nw-7',
    title: 'Campanha reforça importância da vacinação em gestantes',
    summary:
      'Material educativo destaca calendário e esclarece dúvidas frequentes.',
    source: 'Simulação — crawler',
    url: 'https://www.gov.br/saude/pt-br',
    publishedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: 'nw-8',
    title: 'Diretriz discute manejo de dor em contexto ambulatorial',
    summary:
      'Texto enfatiza avaliação multidimensional e cautela com opioides.',
    source: 'Simulação — crawler',
    url: 'https://www.cfm.org.br/',
    publishedAt: new Date(Date.now() - 86400000 * 8).toISOString(),
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
 * Busca últimas notícias médicas indexadas pelo crawler (GET JSON).
 * Sem URL configurada ou em falha, retorna dados de demonstração.
 */
export async function fetchMedicalNews(): Promise<MedicalNewsItem[]> {
  const base = apiBaseUrl()
  if (!base) return structuredClone(mockMedicalNews)

  try {
    const res = await fetch(`${base}/medical-news`, { headers: discoveryHeaders() })
    if (!res.ok) return structuredClone(mockMedicalNews)
    const data = (await res.json()) as unknown
    if (!Array.isArray(data)) return structuredClone(mockMedicalNews)
    return data as MedicalNewsItem[]
  } catch {
    return structuredClone(mockMedicalNews)
  }
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
