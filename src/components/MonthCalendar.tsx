import { useMemo } from 'react'
import type { Category } from '../api/types'
import { dayItems, type CellMap } from '../lib/cellMap'
import { formatDate } from '../lib/date'

// 월간 달력 그리드 (태스크 18 · design 3.6-B)
// 주(월~일) = 한 행. 날짜 칸에 그날 항목을 카테고리 색으로 요약(+N 축약).
// 이웃 달 날짜는 흐리게, 논리적 오늘 강조. 날짜 클릭 → onSelectDate(드릴다운은 태스크 19).

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']
const MAX_VISIBLE = 3 // 칸에 보여줄 최대 항목 수

interface Props {
  categories: Category[]
  dates: Date[] // 6주 그리드 (7의 배수)
  cellMap: CellMap
  monthStart: Date
  monthEnd: Date
  today: string
  onSelectDate: (date: Date) => void
}

export default function MonthCalendar({
  categories,
  dates,
  cellMap,
  monthStart,
  monthEnd,
  today,
  onSelectDate,
}: Props) {
  const categoryIds = useMemo(() => categories.map((c) => c.id), [categories])
  const colorById = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of categories) m.set(c.id, c.color)
    return m
  }, [categories])

  // 7개씩 끊어 주 단위 행으로
  const weeks: Date[][] = []
  for (let i = 0; i < dates.length; i += 7) weeks.push(dates.slice(i, i + 7))

  const monthStartMs = monthStart.getTime()
  const monthEndMs = monthEnd.getTime()

  return (
    <div className="overflow-hidden rounded-md border border-slate-200">
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-2 py-1.5 text-center text-xs text-slate-400">
            {w}
          </div>
        ))}
      </div>

      {/* 주 행 */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((d) => {
            const key = formatDate(d)
            const inMonth = d.getTime() >= monthStartMs && d.getTime() <= monthEndMs
            const isToday = key === today
            const items = dayItems(cellMap, categoryIds, key)
            const visible = items.slice(0, MAX_VISIBLE)
            const overflow = items.length - visible.length
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectDate(d)}
                className={`flex h-24 flex-col border-b border-l border-slate-200 p-1 text-left align-top first:border-l-0 hover:bg-slate-50 ${
                  inMonth ? 'bg-white' : 'bg-slate-50/50'
                }`}
              >
                <span
                  className={`mb-0.5 inline-flex size-5 items-center justify-center rounded-full text-xs ${
                    isToday
                      ? 'bg-indigo-600 font-medium text-white'
                      : inMonth
                        ? 'text-slate-700'
                        : 'text-slate-300'
                  }`}
                >
                  {d.getDate()}
                </span>
                <ul className="min-h-0 flex-1 space-y-0.5 overflow-hidden">
                  {visible.map((it) => (
                    <li
                      key={it.id}
                      className="flex items-center gap-1 text-[11px] leading-tight text-slate-600"
                    >
                      <span
                        className="inline-block size-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: colorById.get(it.category_id) }}
                      />
                      <span
                        className={`truncate ${it.done ? 'text-slate-400 line-through' : ''}`}
                      >
                        {it.content}
                      </span>
                    </li>
                  ))}
                  {overflow > 0 && (
                    <li className="text-[11px] text-slate-400">+{overflow}</li>
                  )}
                </ul>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
