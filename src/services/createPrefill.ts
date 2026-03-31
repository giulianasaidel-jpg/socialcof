/**
 * Estado para pré-preencher /criar (Trends, Notícias médicas).
 * Usa sessionStorage como backup ao state do router (Strict Mode em dev).
 */

export type CreatePagePrefill = {
  accountId: string
  postBriefing: string
  productId?: string
}

const STORAGE_KEY = 'socialcof-create-prefill'

/**
 * Grava o payload antes de navegar para /criar.
 */
export function setCreatePrefill(prefill: CreatePagePrefill): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(prefill))
  } catch {
    /* ignore */
  }
}

/**
 * Lê o payload sem remover (para fallback após remount).
 */
export function readPrefillPayload(): CreatePagePrefill | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CreatePagePrefill
    if (
      !parsed ||
      typeof parsed.accountId !== 'string' ||
      typeof parsed.postBriefing !== 'string'
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

/**
 * Lê só o texto do briefing (para estado inicial em /criar).
 */
export function readInitialPostBriefingFromStorage(): string {
  const p = readPrefillPayload()
  return p?.postBriefing ?? ''
}

/**
 * Remove o payload do armazenamento local.
 */
export function clearPrefillPayload(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
