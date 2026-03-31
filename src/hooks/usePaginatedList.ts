import { useEffect, useMemo, useState } from 'react'

type PaginatedListResult<T> = {
  page: number
  setPage: (p: number | ((prev: number) => number)) => void
  pageItems: T[]
  totalPages: number
  pageSize: number
  totalItems: number
  rangeLabel: string
}

/**
 * Fatia uma lista para exibição paginada e mantém a página dentro dos limites.
 */
export function usePaginatedList<T>(
  items: T[],
  pageSize: number,
): PaginatedListResult<T> {
  const [page, setPage] = useState(1)
  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1)

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, page, pageSize])

  const rangeLabel = useMemo(() => {
    if (totalItems === 0) return 'Nenhum item'
    const from = (page - 1) * pageSize + 1
    const to = Math.min(page * pageSize, totalItems)
    return `${from}–${to} de ${totalItems}`
  }, [page, pageSize, totalItems])

  return {
    page,
    setPage,
    pageItems,
    totalPages,
    pageSize,
    totalItems,
    rangeLabel,
  }
}
