export type ProductMetric = {
  id: string
  name: string
  slug: string
  postsThisMonth: number
  carouselsThisMonth: number
  avgEngagementPct: number
  reach30d: number
  topFormat: 'Reels' | 'Carrossel' | 'Estático'
  /** Prompt base sugerido para geração de conteúdo (protótipo). */
  defaultPrompt?: string
  /** Contas Instagram (ids em `medcofInstagramAccounts`) vinculadas ao produto. */
  linkedInstagramAccountIds: string[]
}

export type ScheduleEntryStatus =
  | 'Rascunho'
  | 'Em revisão'
  | 'Agendado'
  | 'Publicado'
  | 'Cancelado'

export type ScheduleDayEntry = {
  time: string
  theme: string
  content: string
  format: string
  caption: string
  status: ScheduleEntryStatus
}

export const SCHEDULE_EMPTY_ENTRY: ScheduleDayEntry = {
  time: '09:00',
  theme: '',
  content: '',
  format: 'Carrossel',
  caption: '',
  status: 'Rascunho',
}

/**
 * Chave única para o cronograma: conta Instagram (id) + data (YYYY-MM-DD).
 */
export function scheduleCellKey(scheduleAccountId: string, dateISO: string) {
  return `${scheduleAccountId}::${dateISO}`
}

export type ReferencePost = {
  id: string
  productId: string
  instagramUrl: string
  title: string
  captionSnippet: string
  likes: number
  comments: number
  savedAt: string
  format: 'Carrossel' | 'Reels' | 'Estático'
  slides?: number
}

/** Concorrente mapeado a um produto MedCof (métricas fictícias — protótipo). */
export type CompetitorProfile = {
  id: string
  productId: string
  handle: string
  displayName: string
  profileUrl: string
  followers: number
  /** Média de curtidas por publicação (janela recente simulada). */
  avgLikesPerPost: number
  /** Taxa de engajamento estimada (%). */
  engagementRatePct: number
  /** Total de publicações no perfil (estimativa). */
  publishedPostsCount: number
  /** O que funciona no perfil deles — frases para você copiar e adaptar. */
  insightsToBorrow: string[]
}

export type DraftContent = {
  id: string
  productId: string
  title: string
  type: 'Post' | 'Carrossel'
  basedOnUrl?: string
  status: 'Rascunho' | 'Em revisão' | 'Aprovado'
  updatedAt: string
}

/** Contas Instagram oficiais MedCof para direcionar criação de conteúdo. */
export type MedCofInstagramAccount = {
  id: string
  handle: string
  profileUrl: string
  displayName: string
  /** Seguidores fictícios (protótipo). */
  followers: number
}

function medCofFollowerCount(accountId: string): number {
  let n = 0
  for (let i = 0; i < accountId.length; i++) {
    n = (n + accountId.charCodeAt(i) * (i + 19)) % 999_983
  }
  return 22_000 + (n % 410_000)
}

const medCofInstagramAccountsBase = [
  {
    id: 'mc-grupomedcof',
    handle: 'grupomedcof',
    displayName: 'Grupo MedCof',
    profileUrl: 'https://www.instagram.com/grupomedcof/',
  },
  {
    id: 'mc-papodecirurgiao',
    handle: 'papodecirurgiao',
    displayName: 'Papo de Cirurgião',
    profileUrl: 'https://www.instagram.com/papodecirurgiao/',
  },
  {
    id: 'mc-medcof-oftalmo',
    handle: 'medcof.oftalmo',
    displayName: 'MedCof Oftalmologia',
    profileUrl: 'https://www.instagram.com/medcof.oftalmo/',
  },
  {
    id: 'mc-papodepediatria',
    handle: 'papodepediatria',
    displayName: 'Papo de Pediatria',
    profileUrl: 'https://www.instagram.com/papodepediatria/',
  },
  {
    id: 'mc-medcof-anest',
    handle: 'medcof.anest',
    displayName: 'MedCof Anestesiologia',
    profileUrl: 'https://www.instagram.com/medcof.anest/',
  },
  {
    id: 'mc-medcof-ortopedia',
    handle: 'medcof.ortopedia',
    displayName: 'MedCof Ortopedia',
    profileUrl: 'https://www.instagram.com/medcof.ortopedia/',
  },
  {
    id: 'mc-medcof-endocrino',
    handle: 'medcof.endocrino',
    displayName: 'MedCof Endocrino',
    profileUrl: 'https://www.instagram.com/medcof.endocrino/',
  },
  {
    id: 'mc-medcof-revalida',
    handle: 'medcof.revalida',
    displayName: 'MedCof Revalida',
    profileUrl: 'https://www.instagram.com/medcof.revalida/',
  },
  {
    id: 'mc-medcof-ps',
    handle: 'medcof.ps',
    displayName: 'MedCof PS',
    profileUrl: 'https://www.instagram.com/medcof.ps/',
  },
  {
    id: 'mc-concursus',
    handle: 'concursus.medcof',
    displayName: 'Concursus MedCof',
    profileUrl: 'https://www.instagram.com/concursus.medcof/',
  },
  {
    id: 'mc-medcofgo',
    handle: 'medcofgo',
    displayName: 'MedCof GO',
    profileUrl: 'https://www.instagram.com/medcofgo/',
  },
  {
    id: 'mc-medcof-cardio',
    handle: 'medcof.cardiologia',
    displayName: 'MedCof Cardiologia',
    profileUrl: 'https://www.instagram.com/medcof.cardiologia/',
  },
  {
    id: 'mc-medcof-temi',
    handle: 'medcof.temi',
    displayName: 'MedCof TEMI',
    profileUrl: 'https://www.instagram.com/medcof.temi/',
  },
  {
    id: 'mc-medcof-clinica',
    handle: 'medcof.clinica',
    displayName: 'MedCof Clínica Médica',
    profileUrl: 'https://www.instagram.com/medcof.clinica/',
  },
  {
    id: 'mc-medcof-usa',
    handle: 'medcof.usa',
    displayName: 'MedCof USA',
    profileUrl: 'https://www.instagram.com/medcof.usa/',
  },
] as const

export const medcofInstagramAccounts: MedCofInstagramAccount[] =
  medCofInstagramAccountsBase.map((a) => ({
    ...a,
    followers: medCofFollowerCount(a.id),
  }))

const diretoriaMedicaInstagramAccountsBase = [
  {
    id: 'dm-nicole',
    handle: 'nicole',
    displayName: 'Instagram Nicole',
    profileUrl: 'https://www.instagram.com/nicole/',
  },
  {
    id: 'dm-darizon',
    handle: 'darizon',
    displayName: 'Instagram Darizon',
    profileUrl: 'https://www.instagram.com/darizon/',
  },
  {
    id: 'dm-felipe',
    handle: 'felipe',
    displayName: 'Instagram Felipe',
    profileUrl: 'https://www.instagram.com/felipe/',
  },
  {
    id: 'dm-augusto',
    handle: 'augusto',
    displayName: 'Instagram Augusto',
    profileUrl: 'https://www.instagram.com/augusto/',
  },
] as const

/** Contas Instagram do modo Social Cof — médicos (protótipo). */
export const diretoriaMedicaInstagramAccounts: MedCofInstagramAccount[] =
  diretoriaMedicaInstagramAccountsBase.map((a) => ({
    ...a,
    followers: medCofFollowerCount(a.id),
  }))

/** Produtos do modo Social Cof — médicos (um por conta). */
export const diretoriaMedicaProducts: ProductMetric[] = [
  {
    id: 'dm-p-nicole',
    name: 'Instagram Nicole',
    slug: 'instagram-nicole',
    postsThisMonth: 10,
    carouselsThisMonth: 4,
    avgEngagementPct: 5.0,
    reach30d: 48_000,
    topFormat: 'Reels',
    defaultPrompt:
      'Conteúdo para Instagram Nicole: alinhado à diretoria médica, tom institucional e claro.',
    linkedInstagramAccountIds: ['dm-nicole'],
  },
  {
    id: 'dm-p-darizon',
    name: 'Instagram Darizon',
    slug: 'instagram-darizon',
    postsThisMonth: 8,
    carouselsThisMonth: 5,
    avgEngagementPct: 4.6,
    reach30d: 41_000,
    topFormat: 'Carrossel',
    defaultPrompt:
      'Conteúdo para Instagram Darizon: foco em educação em saúde e voz da diretoria.',
    linkedInstagramAccountIds: ['dm-darizon'],
  },
  {
    id: 'dm-p-felipe',
    name: 'Instagram Felipe',
    slug: 'instagram-felipe',
    postsThisMonth: 12,
    carouselsThisMonth: 3,
    avgEngagementPct: 5.4,
    reach30d: 55_000,
    topFormat: 'Reels',
    defaultPrompt:
      'Conteúdo para Instagram Felipe: próximo e técnico, com CTA para canais oficiais.',
    linkedInstagramAccountIds: ['dm-felipe'],
  },
  {
    id: 'dm-p-augusto',
    name: 'Instagram Augusto',
    slug: 'instagram-augusto',
    postsThisMonth: 9,
    carouselsThisMonth: 6,
    avgEngagementPct: 4.9,
    reach30d: 39_000,
    topFormat: 'Carrossel',
    defaultPrompt:
      'Conteúdo para Instagram Augusto: autoridade clínica e transparência nas mensagens.',
    linkedInstagramAccountIds: ['dm-augusto'],
  },
]

/** Usuário com acesso ao portal limitado a contas Instagram específicas (protótipo). */
export type AdminPortalUser = {
  id: string
  email: string
  /** Identificadores de `medcofInstagramAccounts` que este usuário pode usar. */
  allowedInstagramAccountIds: string[]
}

export const adminPortalUsersSeed: AdminPortalUser[] = [
  {
    id: 'admin-u-1',
    email: 'coordenacao@medcof.com.br',
    allowedInstagramAccountIds: ['mc-grupomedcof', 'mc-concursus'],
  },
  {
    id: 'admin-u-2',
    email: 'social@exemplo.com',
    allowedInstagramAccountIds: [
      'mc-medcof-oftalmo',
      'mc-medcofgo',
      'mc-papodecirurgiao',
    ],
  },
]

export const products: ProductMetric[] = [
  {
    id: 'p1',
    name: 'Intensivo R1 MedCof',
    slug: 'intensivo-r1',
    postsThisMonth: 12,
    carouselsThisMonth: 5,
    avgEngagementPct: 4.2,
    reach30d: 128_400,
    topFormat: 'Carrossel',
    defaultPrompt:
      'Redator MedCof: tom acolhedor e técnico, público médico. Inclua CTA claro (lista de espera ou lead). Defina 3 hashtags de nicho e 1 frase de autoridade. Evite promessas absolutas.',
    linkedInstagramAccountIds: [
      'mc-grupomedcof',
      'mc-papodecirurgiao',
      'mc-medcof-ps',
      'mc-medcofgo',
      'mc-medcof-clinica',
    ],
  },
  {
    id: 'p2',
    name: 'Mentorias & acompanhamento',
    slug: 'mentorias',
    postsThisMonth: 18,
    carouselsThisMonth: 3,
    avgEngagementPct: 6.8,
    reach30d: 89_200,
    topFormat: 'Reels',
    defaultPrompt:
      'Foco em jornada do aluno, prova social (depoimentos genéricos) e próximo passo (DM ou link na bio). Linguagem próxima, sem gírias excessivas.',
    linkedInstagramAccountIds: [
      'mc-grupomedcof',
      'mc-papodecirurgiao',
      'mc-papodepediatria',
      'mc-medcof-ps',
    ],
  },
  {
    id: 'p3',
    name: 'Banco de questões Premium',
    slug: 'banco-questoes',
    postsThisMonth: 9,
    carouselsThisMonth: 7,
    avgEngagementPct: 3.1,
    reach30d: 210_000,
    topFormat: 'Carrossel',
    defaultPrompt:
      'Destaque uma questão-tipo, explique o raciocínio em bullets e convide a testar a plataforma. SEO: inclua termos da especialidade e “prova de residência”.',
    linkedInstagramAccountIds: [
      'mc-concursus',
      'mc-grupomedcof',
      'mc-papodecirurgiao',
    ],
  },
  {
    id: 'p4',
    name: 'Preparatório Revalida',
    slug: 'revalida',
    postsThisMonth: 14,
    carouselsThisMonth: 6,
    avgEngagementPct: 5.1,
    reach30d: 156_000,
    topFormat: 'Carrossel',
    defaultPrompt:
      'Público revalidação: clareza burocrática + motivação. Sempre avisar para checar editais oficiais. CTA: material gratuito ou consultoria.',
    linkedInstagramAccountIds: ['mc-medcof-revalida', 'mc-medcof-usa'],
  },
  {
    id: 'p5',
    name: 'Concursus MedCof',
    slug: 'concursus',
    postsThisMonth: 22,
    carouselsThisMonth: 4,
    avgEngagementPct: 4.7,
    reach30d: 98_000,
    topFormat: 'Reels',
    defaultPrompt:
      'Foco em concursos médicos: cronograma, bancas e erros comuns. Tom direto. Inclua palavras-chave do cargo/região quando fizer sentido.',
    linkedInstagramAccountIds: ['mc-concursus', 'mc-grupomedcof'],
  },
  {
    id: 'p6',
    name: 'Trilhas por especialidade (Oftalmo, GO, etc.)',
    slug: 'trilhas-especialidade',
    postsThisMonth: 11,
    carouselsThisMonth: 8,
    avgEngagementPct: 5.5,
    reach30d: 142_000,
    topFormat: 'Carrossel',
    defaultPrompt:
      'Conteúdo segmentado por especialidade: glossário rápido, algoritmo visual ou “pegadinha de prova”. Manter voz MedCof consistente com o guia anexado.',
    linkedInstagramAccountIds: [
      'mc-medcof-oftalmo',
      'mc-papodepediatria',
      'mc-medcof-anest',
      'mc-medcof-ortopedia',
      'mc-medcof-endocrino',
      'mc-medcof-cardio',
      'mc-medcof-temi',
      'mc-medcof-clinica',
      'mc-medcofgo',
    ],
  },
]

/** Publicações fictícias por conta (visão geral / Instagram). */
export type DashboardPost = {
  id: string
  accountId: string
  title: string
  postedAt: string
  format: 'Reels' | 'Carrossel' | 'Estático'
  likes: number
  comments: number
  saves: number
  reposts: number
  forwards: number
}

function dashboardPostSeed(accountId: string, index: number): number {
  let seed = index * 31
  for (let i = 0; i < accountId.length; i++) {
    seed += accountId.charCodeAt(i) * (i + 13)
  }
  return Math.abs(seed) % 100000
}

function buildDashboardPostsForAccounts(
  accounts: MedCofInstagramAccount[],
): DashboardPost[] {
  const formats: Array<'Reels' | 'Carrossel' | 'Estático'> = [
    'Reels',
    'Carrossel',
    'Estático',
  ]
  const titles = [
    'Checklist antes do plantão',
    '5 erros comuns na prova de R1',
    'Resumo da semana na residência',
    'Perguntas frequentes — bate-papo com especialista',
    'Carrossel: protocolo em 7 slides',
    'Reels: um minuto sobre o tema da semana',
    'Depoimento de aprovado',
    'Live gravada — principais cortes',
    'Comparativo entre condutas A e B',
    'Maratona de revisão — aviso',
  ]

  return accounts.flatMap((acc, accountIndex) => {
    const count = 6 + (accountIndex % 4)
    return Array.from({ length: count }, (_, i) => {
      const s = dashboardPostSeed(acc.id, i)
      const month = 1 + ((s + i * 5) % 3)
      const day = 1 + ((s + i * 3) % 27)
      const postedAt = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const base = 400 + (s % 8000)
      return {
        id: `${acc.id}-dp-${i}`,
        accountId: acc.id,
        title: titles[(s + i) % titles.length],
        postedAt,
        format: formats[s % 3],
        likes: base * 3 + (s % 500),
        comments: 12 + (s % 220),
        saves: 30 + (s % 400),
        reposts: s % 45,
        forwards: (s * 7) % 80,
      }
    })
  })
}

export const dashboardPosts = buildDashboardPostsForAccounts(
  medcofInstagramAccounts,
)

export const dashboardPostsDiretoriaMedica = buildDashboardPostsForAccounts(
  diretoriaMedicaInstagramAccounts,
)

export const competitors: CompetitorProfile[] = [
  {
    id: 'c-p1-1',
    productId: 'p1',
    handle: 'residenciafocus',
    displayName: 'Residência Focus',
    profileUrl: 'https://www.instagram.com/residenciafocus/',
    followers: 186_000,
    avgLikesPerPost: 4_200,
    engagementRatePct: 3.8,
    publishedPostsCount: 612,
    insightsToBorrow: [
      'Carrossel em formato lista: um take por slide + número visível no canto.',
      'Gancho “pegadinha de prova” no primeiro slide antes de explicar a conduta.',
      'CTA recorrente: lista de espera ou link do grupo no fim da legenda.',
      'Cadência alta: combinar 1 Reel curto (dúvida) com carrosséis de revisão.',
    ],
  },
  {
    id: 'c-p1-2',
    productId: 'p1',
    handle: 'medprep.r1',
    displayName: 'MedPrep R1',
    profileUrl: 'https://www.instagram.com/medprep.r1/',
    followers: 94_500,
    avgLikesPerPost: 2_850,
    engagementRatePct: 4.6,
    publishedPostsCount: 384,
    insightsToBorrow: [
      'Série fixa às segundas: “cronograma da semana” em carrossel.',
      'Reels mostrando resolução comentada, como se fosse plantão.',
      'Pergunta aberta na legenda para puxar comentário com dúvida clínica.',
    ],
  },
  {
    id: 'c-p1-3',
    productId: 'p1',
    handle: 'provaemdia',
    displayName: 'Prova em Dia',
    profileUrl: 'https://www.instagram.com/provaemdia/',
    followers: 52_300,
    avgLikesPerPost: 1_920,
    engagementRatePct: 5.1,
    publishedPostsCount: 267,
    insightsToBorrow: [
      'Par estático + carrossel “antes/depois” da rotina de estudo.',
      'Conteúdo pensado para salvar: checklist copiável na legenda.',
      'Menos volume em Reels; foco em compartilhamento entre colegas.',
    ],
  },
  {
    id: 'c-p2-1',
    productId: 'p2',
    handle: 'mentoriamedbr',
    displayName: 'Mentoria Med BR',
    profileUrl: 'https://www.instagram.com/mentoriamedbr/',
    followers: 71_200,
    avgLikesPerPost: 5_100,
    engagementRatePct: 6.2,
    publishedPostsCount: 428,
    insightsToBorrow: [
      'Reels com rosto: bastidores da mentoria e micro-depoimentos.',
      'Carrossel com framework nomeado (ex.: “plano 90 dias”).',
      'Cortes de live virando Reels com legenda com CTA para DM.',
    ],
  },
  {
    id: 'c-p2-2',
    productId: 'p2',
    handle: 'jornada.residencia',
    displayName: 'Jornada Residência',
    profileUrl: 'https://www.instagram.com/jornada.residencia/',
    followers: 128_000,
    avgLikesPerPost: 3_400,
    engagementRatePct: 4.9,
    publishedPostsCount: 891,
    insightsToBorrow: [
      'Alta frequência de Reels com humor leve e tema do dia.',
      'Reservar carrossel só para datas de edital e contagem regressiva.',
      'Stories reforçando o mesmo tema do Reel do dia para fechar o loop.',
    ],
  },
  {
    id: 'c-p2-3',
    productId: 'p2',
    handle: 'acompanha.r1',
    displayName: 'Acompanha R1',
    profileUrl: 'https://www.instagram.com/acompanha.r1/',
    followers: 33_400,
    avgLikesPerPost: 2_400,
    engagementRatePct: 6.9,
    publishedPostsCount: 156,
    insightsToBorrow: [
      'Threads curtas na legenda + carrossel “plano da semana”.',
      'Reels de check-in de estudo (mesa, timer, meta do dia).',
      'CTA para comunidade paga com benefício explícito na bio.',
    ],
  },
  {
    id: 'c-p3-1',
    productId: 'p3',
    handle: 'qbankmedico',
    displayName: 'QBank Médico',
    profileUrl: 'https://www.instagram.com/qbankmedico/',
    followers: 245_000,
    avgLikesPerPost: 6_800,
    engagementRatePct: 3.2,
    publishedPostsCount: 1_240,
    insightsToBorrow: [
      'Carrossel: enunciado no 1º slide, comentário do gabarito no último.',
      'Série “errei essa” em Reels com erro comum e raciocínio rápido.',
      'Legenda longa com palavras-chave de especialidade para busca.',
    ],
  },
  {
    id: 'c-p3-2',
    productId: 'p3',
    handle: 'flashclinica',
    displayName: 'Flash Clínica',
    profileUrl: 'https://www.instagram.com/flashclinica/',
    followers: 61_000,
    avgLikesPerPost: 2_100,
    engagementRatePct: 4.4,
    publishedPostsCount: 702,
    insightsToBorrow: [
      'Micro-carrosséis (4–5 slides) com uma ideia só por post.',
      'Card estático com pergunta objetiva e resposta no primeiro comentário.',
      'Resumo copiável na legenda para aumentar saves.',
    ],
  },
  {
    id: 'c-p3-3',
    productId: 'p3',
    handle: 'provascomentadas',
    displayName: 'Provas Comentadas',
    profileUrl: 'https://www.instagram.com/provascomentadas/',
    followers: 112_000,
    avgLikesPerPost: 3_600,
    engagementRatePct: 3.9,
    publishedPostsCount: 533,
    insightsToBorrow: [
      'Cortar aulas longas em Reels com gancho da questão polêmica.',
      'Carrossel “gabarito extra” além do que apareceu na prova.',
      'Parcerias com creators médicos para ampliar alcance.',
    ],
  },
  {
    id: 'c-p4-1',
    productId: 'p4',
    handle: 'revalidabrasil',
    displayName: 'Revalida Brasil',
    profileUrl: 'https://www.instagram.com/revalidabrasil/',
    followers: 198_000,
    avgLikesPerPost: 7_200,
    engagementRatePct: 4.1,
    publishedPostsCount: 956,
    insightsToBorrow: [
      'Carrosséis “documentos e prazos” com checklist visual.',
      'Reels com especialista explicando um passo do processo.',
      'Postar no mesmo dia em que sai notícia de edital para surfar busca.',
    ],
  },
  {
    id: 'c-p4-2',
    productId: 'p4',
    handle: 'med.revalida',
    displayName: 'Med Revalida',
    profileUrl: 'https://www.instagram.com/med.revalida/',
    followers: 44_800,
    avgLikesPerPost: 3_050,
    engagementRatePct: 5.8,
    publishedPostsCount: 312,
    insightsToBorrow: [
      'Repost de alunos (com autorização) como prova social.',
      'Carrossel comparando provas ou regras por estado.',
      'Enquetes e caixinha para manter conversa na comunidade.',
    ],
  },
  {
    id: 'c-p4-3',
    productId: 'p4',
    handle: 'revalida.usa',
    displayName: 'Revalida USA',
    profileUrl: 'https://www.instagram.com/revalida.usa/',
    followers: 67_500,
    avgLikesPerPost: 4_800,
    engagementRatePct: 5.4,
    publishedPostsCount: 244,
    insightsToBorrow: [
      'Tabela Brasil vs EUA (passos, custos, prazos) em carrossel.',
      'Reels “um dia no processo” com rotina de quem está aplicando.',
      'PDF/guia na bio + post que promete o download na legenda.',
    ],
  },
  {
    id: 'c-p5-1',
    productId: 'p5',
    handle: 'concursomedico',
    displayName: 'Concurso Médico',
    profileUrl: 'https://www.instagram.com/concursomedico/',
    followers: 312_000,
    avgLikesPerPost: 5_500,
    engagementRatePct: 2.9,
    publishedPostsCount: 2_180,
    insightsToBorrow: [
      'Post rápido no formato “vaga + salário + inscrições abertas”.',
      'Reels tour por cidade/hospital quando há processo local.',
      'Fixar padrão visual para avisos de edital (sempre o mesmo layout).',
    ],
  },
  {
    id: 'c-p5-2',
    productId: 'p5',
    handle: 'vagasmed',
    displayName: 'Vagas Med',
    profileUrl: 'https://www.instagram.com/vagasmed/',
    followers: 89_000,
    avgLikesPerPost: 4_100,
    engagementRatePct: 5.3,
    publishedPostsCount: 624,
    insightsToBorrow: [
      'Carrossel com requisitos resumidos da banca (bullet por slide).',
      'Série Reels “erro que reprova” ligada a regra do edital.',
      'Alerta com data no título do post para quem salva e volta.',
    ],
  },
  {
    id: 'c-p5-3',
    productId: 'p5',
    handle: 'medicina.concurso',
    displayName: 'Medicina Concurso',
    profileUrl: 'https://www.instagram.com/medicina.concurso/',
    followers: 156_000,
    avgLikesPerPost: 2_950,
    engagementRatePct: 3.6,
    publishedPostsCount: 1_450,
    insightsToBorrow: [
      'Meme + tabela salarial no mesmo dia para viralizar e informar.',
      'Reels “véspera de prova” com checklist mental.',
      'Abrir comentários em posts de resultado e nomeação.',
    ],
  },
  {
    id: 'c-p6-1',
    productId: 'p6',
    handle: 'oftalmoprep',
    displayName: 'Oftalmo Prep',
    profileUrl: 'https://www.instagram.com/oftalmoprep/',
    followers: 38_600,
    avgLikesPerPost: 2_640,
    engagementRatePct: 5.9,
    publishedPostsCount: 298,
    insightsToBorrow: [
      'Imagem clínica forte no feed + carrossel explicando o protocolo.',
      'Reels simulando lap ou dica de prova oral em 30s.',
      'Responder comentários técnicos para virar referência do nicho.',
    ],
  },
  {
    id: 'c-p6-2',
    productId: 'p6',
    handle: 'go.residencia',
    displayName: 'GO Residência',
    profileUrl: 'https://www.instagram.com/go.residencia/',
    followers: 55_200,
    avgLikesPerPost: 3_180,
    engagementRatePct: 4.7,
    publishedPostsCount: 412,
    insightsToBorrow: [
      'Alternar carrossel teórico com Reels de caso clínico.',
      'Série fixa “checklist de plantão” em 1 slide por item.',
      'Hashtags e menções só do nicho (GO/TEMGO) para evitar diluição.',
    ],
  },
  {
    id: 'c-p6-3',
    productId: 'p6',
    handle: 'cardioboard.med',
    displayName: 'Cardio Board',
    profileUrl: 'https://www.instagram.com/cardioboard.med/',
    followers: 72_900,
    avgLikesPerPost: 3_900,
    engagementRatePct: 4.2,
    publishedPostsCount: 367,
    insightsToBorrow: [
      'Slides densos estilo board: ECG + drogas na mesma sequência.',
      'Reels com mnemônico falado + texto grande na tela.',
      'Legenda longa tipo “apostila” para maximizar saves.',
    ],
  },
]

/**
 * Concorrentes das linhas de produto vinculadas à conta Instagram selecionada (sem duplicar perfil).
 */
export function competitorsForMedCofAccount(
  instagramAccountId: string,
  productList: ProductMetric[],
): CompetitorProfile[] {
  const productIds = new Set(
    productList
      .filter((p) => p.linkedInstagramAccountIds.includes(instagramAccountId))
      .map((p) => p.id),
  )
  const seen = new Set<string>()
  const out: CompetitorProfile[] = []
  for (const c of competitors) {
    if (!productIds.has(c.productId)) continue
    if (seen.has(c.id)) continue
    seen.add(c.id)
    out.push(c)
  }
  return out
}

export const referencePosts: ReferencePost[] = [
  {
    id: 'r1',
    productId: 'p1',
    instagramUrl: 'https://instagram.com/p/ABC123ficticio',
    title: 'Rotina AM em 5 passos',
    captionSnippet: 'Comece o dia com hidratação leve e FPS…',
    likes: 3420,
    comments: 128,
    savedAt: '2026-03-12',
    format: 'Carrossel',
    slides: 7,
  },
  {
    id: 'r2',
    productId: 'p2',
    instagramUrl: 'https://instagram.com/reel/XYZ789demo',
    title: 'Do grão à xícara — tour rápido',
    captionSnippet: 'Hoje visitamos nossa torrefação parceira…',
    likes: 8900,
    comments: 412,
    savedAt: '2026-03-08',
    format: 'Reels',
  },
  {
    id: 'r3',
    productId: 'p1',
    instagramUrl: 'https://instagram.com/p/DEF456demo',
    title: 'Ingredientes que amamos',
    captionSnippet: 'Niacinamida, ácido hialurônico e…',
    likes: 2100,
    comments: 56,
    savedAt: '2026-02-28',
    format: 'Estático',
  },
  {
    id: 'r4',
    productId: 'p3',
    instagramUrl: 'https://instagram.com/p/GHI012demo',
    title: 'Desafio 7 dias — resultados',
    captionSnippet: 'Milhares de pessoas já começaram…',
    likes: 5600,
    comments: 301,
    savedAt: '2026-03-18',
    format: 'Carrossel',
    slides: 10,
  },
]

export type InstagramConnectionStatus =
  | 'conectado'
  | 'atencao'
  | 'erro'
  | 'desconectado'

export type InstagramAccount = {
  id: string
  productId: string
  username: string
  displayName: string
  followers: number
  status: InstagramConnectionStatus
  lastSyncAt: string
  tokenExpiresAt: string
  scopes: string[]
  ingestEnabled: boolean
}

export type InstagramSyncLog = {
  id: string
  accountId: string
  at: string
  level: 'ok' | 'aviso' | 'erro'
  message: string
}

export const instagramAccounts: InstagramAccount[] = [
  {
    id: 'ig1',
    productId: 'p1',
    username: 'aurora.skincare',
    displayName: 'Aurora Skincare',
    followers: 84_200,
    status: 'conectado',
    lastSyncAt: '2026-03-30T14:22:00',
    tokenExpiresAt: '2026-04-28',
    scopes: ['instagram_basic', 'instagram_manage_insights'],
    ingestEnabled: true,
  },
  {
    id: 'ig2',
    productId: 'p2',
    username: 'origenes.cafe',
    displayName: 'Café Orígenes',
    followers: 52_100,
    status: 'atencao',
    lastSyncAt: '2026-03-29T09:10:00',
    tokenExpiresAt: '2026-04-02',
    scopes: ['instagram_basic', 'instagram_manage_insights'],
    ingestEnabled: true,
  },
  {
    id: 'ig3',
    productId: 'p3',
    username: 'fitpulse.app',
    displayName: 'FitPulse',
    followers: 201_000,
    status: 'conectado',
    lastSyncAt: '2026-03-30T11:45:00',
    tokenExpiresAt: '2026-05-15',
    scopes: ['instagram_basic', 'instagram_manage_insights'],
    ingestEnabled: true,
  },
  {
    id: 'ig4',
    productId: 'p1',
    username: 'aurora.lab.br',
    displayName: 'Aurora Lab',
    followers: 12_400,
    status: 'erro',
    lastSyncAt: '2026-03-27T16:00:00',
    tokenExpiresAt: '2026-03-20',
    scopes: ['instagram_basic'],
    ingestEnabled: false,
  },
]

export const instagramSyncLogs: InstagramSyncLog[] = [
  {
    id: 'sl1',
    accountId: 'ig1',
    at: '2026-03-30T14:22:00',
    level: 'ok',
    message: 'Métricas e painel de concorrentes atualizados.',
  },
  {
    id: 'sl2',
    accountId: 'ig2',
    at: '2026-03-29T09:10:00',
    level: 'aviso',
    message: 'Token expira em 4 dias — reautenticação sugerida.',
  },
  {
    id: 'sl3',
    accountId: 'ig4',
    at: '2026-03-27T16:00:00',
    level: 'erro',
    message: 'Falha OAuth: consentimento revogado pelo usuário.',
  },
  {
    id: 'sl4',
    accountId: 'ig3',
    at: '2026-03-30T11:45:00',
    level: 'ok',
    message: 'Sincronização completa (posts + insights).',
  },
]

export const drafts: DraftContent[] = [
  {
    id: 'd1',
    productId: 'p1',
    title: 'Lançamento sérum noturno',
    type: 'Carrossel',
    basedOnUrl: 'https://instagram.com/p/ABC123ficticio',
    status: 'Em revisão',
    updatedAt: '2026-03-29',
  },
  {
    id: 'd2',
    productId: 'p2',
    title: 'Receita cold brew em casa',
    type: 'Post',
    status: 'Rascunho',
    updatedAt: '2026-03-28',
  },
  {
    id: 'd3',
    productId: 'p3',
    title: 'Depoimento + CTA trial',
    type: 'Carrossel',
    basedOnUrl: 'https://instagram.com/p/GHI012demo',
    status: 'Aprovado',
    updatedAt: '2026-03-27',
  },
]
