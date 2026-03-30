import { useCallback, useMemo, useState } from 'react'
import { useAppWorkspace } from '../context/AppWorkspaceContext'
import {
  SCHEDULE_EMPTY_ENTRY,
  scheduleCellKey,
  type ScheduleDayEntry,
  type ScheduleEntryStatus,
} from '../data/mock'

const STATUS_OPTIONS: ScheduleEntryStatus[] = [
  'Rascunho',
  'Em revisão',
  'Agendado',
  'Publicado',
  'Cancelado',
]

const WEEKDAY_HEADERS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d)
  x.setHours(12, 0, 0, 0)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  return x
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** Data local YYYY-MM-DD (evita deslocamento UTC). */
function toLocalISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Semanas do mês: cada linha = uma semana (7 colunas); fora do mês = null.
 */
function monthWeekRows(year: number, monthIndex: number): (string | null)[][] {
  const firstOfMonth = new Date(year, monthIndex, 1, 12, 0, 0, 0)
  const lastOfMonth = new Date(year, monthIndex + 1, 0, 12, 0, 0, 0)
  let monday = startOfWeekMonday(firstOfMonth)
  const rows: (string | null)[][] = []

  for (;;) {
    const row: (string | null)[] = []
    for (let i = 0; i < 7; i++) {
      const cellDate = addDays(monday, i)
      const inMonth =
        cellDate.getMonth() === monthIndex && cellDate.getFullYear() === year
      row.push(inMonth ? toLocalISODate(cellDate) : null)
    }
    rows.push(row)
    monday = addDays(monday, 7)
    if (monday > lastOfMonth) break
  }
  return rows
}

function formatMonthTitle(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })
}

function formatWeekdayLong(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function dayNumFromIso(iso: string): number {
  return Number(iso.slice(8, 10))
}

type DayEditorProps = {
  entry: ScheduleDayEntry
  onPatch: (partial: Partial<ScheduleDayEntry>) => void
}

/**
 * Formulário completo de um dia (reutilizado no painel de edição).
 */
function DayEditor({ entry, onPatch }: DayEditorProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-[13px] font-medium text-[#6e6e73]">
          Horário
          <input
            type="time"
            value={entry.time}
            onChange={(ev) => onPatch({ time: ev.target.value })}
            className="mt-1.5 w-full rounded-xl border border-black/[0.1] bg-[#fafafa] px-3 py-2 text-[15px] text-[#1d1d1f] outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20"
          />
        </label>
        <label className="block text-[13px] font-medium text-[#6e6e73]">
          Formato do post
          <select
            value={entry.format}
            onChange={(ev) => onPatch({ format: ev.target.value })}
            className="mt-1.5 w-full rounded-xl border border-black/[0.1] bg-[#fafafa] px-3 py-2 text-[15px] text-[#1d1d1f] outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20"
          >
            {['Carrossel', 'Reels', 'Estático', 'Stories', 'Live'].map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[13px] font-medium text-[#6e6e73]">
          Status
          <select
            value={entry.status}
            onChange={(ev) =>
              onPatch({ status: ev.target.value as ScheduleEntryStatus })
            }
            className="mt-1.5 w-full rounded-xl border border-black/[0.1] bg-[#fafafa] px-3 py-2 text-[15px] text-[#1d1d1f] outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20"
          >
            {STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-[13px] font-medium text-[#6e6e73]">
        Tema
        <input
          type="text"
          value={entry.theme}
          onChange={(ev) => onPatch({ theme: ev.target.value })}
          className="mt-1.5 w-full rounded-xl border border-black/[0.1] bg-[#fafafa] px-3 py-2 text-[15px] text-[#1d1d1f] outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20"
          placeholder="Ex.: Dica de estudo — cardiologia"
        />
      </label>
      <label className="block text-[13px] font-medium text-[#6e6e73]">
        Conteúdo
        <textarea
          value={entry.content}
          onChange={(ev) => onPatch({ content: ev.target.value })}
          rows={3}
          className="mt-1.5 w-full resize-y rounded-xl border border-black/[0.1] bg-[#fafafa] px-3 py-2 text-[15px] leading-relaxed text-[#1d1d1f] outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20"
          placeholder="Resumo do que será publicado…"
        />
      </label>
      <label className="block text-[13px] font-medium text-[#6e6e73]">
        Legenda
        <textarea
          value={entry.caption}
          onChange={(ev) => onPatch({ caption: ev.target.value })}
          rows={3}
          className="mt-1.5 w-full resize-y rounded-xl border border-black/[0.1] bg-[#fafafa] px-3 py-2 text-[15px] leading-relaxed text-[#1d1d1f] outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20"
          placeholder="Texto previsto para a publicação"
        />
      </label>
    </div>
  )
}

/**
 * Agenda mensal: cada linha é uma semana; edição ao selecionar um dia.
 */
export function SchedulePage() {
  const { instagramAccounts, brandShortName, brandSubtitle } =
    useAppWorkspace()
  const brandLine = `${brandShortName} · ${brandSubtitle}`
  const now = new Date()
  const [scheduleAccountId, setScheduleAccountId] = useState(
    instagramAccounts[0]?.id ?? '',
  )
  const [year, setYear] = useState(now.getFullYear())
  const [monthIndex, setMonthIndex] = useState(now.getMonth())
  const [schedule, setSchedule] = useState<Record<string, ScheduleDayEntry>>(
    {},
  )
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const monthRows = useMemo(
    () => monthWeekRows(year, monthIndex),
    [year, monthIndex],
  )

  const getEntry = useCallback(
    (accountId: string, date: string): ScheduleDayEntry => {
      const key = scheduleCellKey(accountId, date)
      return { ...SCHEDULE_EMPTY_ENTRY, ...schedule[key] }
    },
    [schedule],
  )

  const patchDay = useCallback(
    (accountId: string, date: string, partial: Partial<ScheduleDayEntry>) => {
      const key = scheduleCellKey(accountId, date)
      setSchedule((s) => {
        const prev = { ...SCHEDULE_EMPTY_ENTRY, ...s[key] }
        return { ...s, [key]: { ...prev, ...partial } }
      })
    },
    [],
  )

  const selectedScheduleAccount = instagramAccounts.find(
    (a) => a.id === scheduleAccountId,
  )

  const goPrevMonth = () => {
    setMonthIndex((m) => {
      if (m === 0) {
        setYear((y) => y - 1)
        return 11
      }
      return m - 1
    })
    setSelectedDate(null)
  }

  const goNextMonth = () => {
    setMonthIndex((m) => {
      if (m === 11) {
        setYear((y) => y + 1)
        return 0
      }
      return m + 1
    })
    setSelectedDate(null)
  }

  const selectedEntry =
    selectedDate && scheduleAccountId
      ? getEntry(scheduleAccountId, selectedDate)
      : null

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f]">
          Agenda
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[#6e6e73]">
          Visão mensal por conta Instagram ({brandLine}): cada linha é uma
          semana. Clique em um dia para editar horário, tema, conteúdo, formato,
          legenda e status.
        </p>
      </header>

      <section className="flex flex-col gap-4 rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-[240px] max-w-md flex-1">
          <label
            htmlFor="sched-ig-account"
            className="text-sm font-medium text-[#1d1d1f]"
          >
            Conta Instagram
          </label>
          <select
            id="sched-ig-account"
            value={scheduleAccountId}
            onChange={(e) => {
              setScheduleAccountId(e.target.value)
              setSelectedDate(null)
            }}
            className="mt-2 w-full rounded-xl border border-black/[0.1] bg-[#fafafa] px-4 py-3 text-[15px] text-[#1d1d1f] outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20"
          >
            {instagramAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.displayName} (@{a.handle})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={goPrevMonth}
            className="rounded-full border border-black/[0.12] bg-white px-4 py-2 text-[14px] font-medium text-[#1d1d1f] hover:bg-black/[0.03]"
          >
            Mês anterior
          </button>
          <span className="min-w-[160px] text-center text-[15px] font-semibold capitalize text-[#1d1d1f]">
            {formatMonthTitle(year, monthIndex)}
          </span>
          <button
            type="button"
            onClick={goNextMonth}
            className="rounded-full border border-black/[0.12] bg-white px-4 py-2 text-[14px] font-medium text-[#1d1d1f] hover:bg-black/[0.03]"
          >
            Próximo mês
          </button>
        </div>
      </section>

      {selectedScheduleAccount && (
        <p className="text-[14px] text-[#6e6e73]">
          Cronograma de{' '}
          <strong className="text-[#1d1d1f]">
            @{selectedScheduleAccount.handle}
          </strong>{' '}
          ({selectedScheduleAccount.displayName})
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-black/[0.06] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-black/[0.06] bg-[#fafafa]">
              <th className="w-10 px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-[#6e6e73]">
                #
              </th>
              {WEEKDAY_HEADERS.map((h) => (
                <th
                  key={h}
                  className="px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-[#6e6e73]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthRows.map((week, wi) => (
              <tr
                key={wi}
                className="border-b border-black/[0.06] last:border-0 align-top"
              >
                <td className="border-r border-black/[0.04] px-2 py-2 text-center text-[12px] font-medium text-[#86868b]">
                  S{wi + 1}
                </td>
                {week.map((dateISO, di) => {
                  if (!dateISO) {
                    return (
                      <td
                        key={`e-${wi}-${di}`}
                        className="min-h-[100px] border-l border-black/[0.04] bg-[#fafafa]/80 p-1"
                      />
                    )
                  }
                  const e = getEntry(scheduleAccountId, dateISO)
                  const isSel = selectedDate === dateISO
                  const hasContent =
                    e.theme.trim() ||
                    e.content.trim() ||
                    e.caption.trim() ||
                    e.status !== 'Rascunho'
                  return (
                    <td
                      key={dateISO}
                      className={[
                        'min-h-[100px] max-w-[140px] border-l border-black/[0.04] p-1 align-top',
                        isSel ? 'bg-[#0071e3]/8' : '',
                      ].join(' ')}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedDate(dateISO)}
                        className={[
                          'flex w-full flex-col rounded-xl p-2 text-left transition',
                          isSel
                            ? 'ring-2 ring-[#0071e3]'
                            : 'hover:bg-black/[0.03]',
                        ].join(' ')}
                      >
                        <span className="text-[15px] font-semibold tabular-nums text-[#1d1d1f]">
                          {dayNumFromIso(dateISO)}
                        </span>
                        {hasContent ? (
                          <>
                            <span className="mt-1 line-clamp-2 text-[11px] text-[#6e6e73]">
                              {e.time} · {e.format}
                            </span>
                            <span className="line-clamp-2 text-[11px] font-medium text-[#1d1d1f]">
                              {e.theme || 'Sem tema'}
                            </span>
                            <span
                              className={[
                                'mt-1 inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-medium',
                                e.status === 'Publicado'
                                  ? 'bg-emerald-500/15 text-emerald-800'
                                  : e.status === 'Agendado'
                                    ? 'bg-[#0071e3]/15 text-[#0071e3]'
                                    : 'bg-[#f5f5f7] text-[#6e6e73]',
                              ].join(' ')}
                            >
                              {e.status}
                            </span>
                          </>
                        ) : (
                          <span className="mt-1 text-[11px] text-[#86868b]">
                            Clique para planejar
                          </span>
                        )}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedDate && selectedEntry && scheduleAccountId ? (
        <section className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold capitalize text-[#1d1d1f]">
              Editar dia — {formatWeekdayLong(selectedDate)}
            </h2>
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="text-[13px] font-medium text-[#0071e3] hover:underline"
            >
              Fechar
            </button>
          </div>
          <DayEditor
            entry={selectedEntry}
            onPatch={(partial) =>
              patchDay(scheduleAccountId, selectedDate, partial)
            }
          />
        </section>
      ) : (
        <p className="text-[14px] text-[#6e6e73]">
          Selecione um dia no calendário para editar o cronograma.
        </p>
      )}
    </div>
  )
}
