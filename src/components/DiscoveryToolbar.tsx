type DiscoveryToolbarProps = {
  profileLabel: string
  profileHint: string
  accountSelectId: string
  accountValue: string
  onAccountChange: (accountId: string) => void
  accountOptions: { id: string; label: string }[]
  rangeLabel: string
  page: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
  disabledPrev: boolean
  disabledNext: boolean
}

/**
 * Barra comum: perfil de destino + paginação.
 */
export function DiscoveryToolbar({
  profileLabel,
  profileHint,
  accountSelectId,
  accountValue,
  onAccountChange,
  accountOptions,
  rangeLabel,
  page,
  totalPages,
  onPrev,
  onNext,
  disabledPrev,
  disabledNext,
}: DiscoveryToolbarProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-white/90 p-4 shadow-[0_2px_12px_rgba(28,29,32,0.06)] sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0 flex-1 sm:max-w-md">
        <label
          htmlFor={accountSelectId}
          className="text-sm font-medium text-ink"
        >
          {profileLabel}
        </label>
        <p className="mt-0.5 text-[13px] text-ink-muted">{profileHint}</p>
        <select
          id={accountSelectId}
          value={accountValue}
          onChange={(e) => onAccountChange(e.target.value)}
          className="mt-2 w-full rounded-xl border border-ink/10 bg-[#fafafa] px-4 py-2.5 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        >
          {accountOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col items-stretch gap-2 sm:items-end">
        <p className="text-[13px] text-ink-muted">{rangeLabel}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={disabledPrev}
            className="rounded-xl border border-ink/10 bg-white px-4 py-2 text-[14px] font-medium text-ink transition hover:bg-ink/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="min-w-[5rem] text-center text-[13px] text-ink-muted">
            Página {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={onNext}
            disabled={disabledNext}
            className="rounded-xl border border-ink/10 bg-white px-4 py-2 text-[14px] font-medium text-ink transition hover:bg-ink/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  )
}
