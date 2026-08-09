import { useState } from 'react'
import type { Category, Item } from '../api/types'
import { cellItems, type CellMap } from '../lib/cellMap'
import { dDayLabel, formatDate } from '../lib/date'
import { accentHex } from '../lib/colors'
import { isHoliday } from '../lib/holidays'

// 모바일 주간 뷰 (backlog 8.1) — 격자 대신 "각 셀을 전체 폭 블록으로 펼친 세로 목록".
//
// 왜 격자를 안 쓰나: 390px 화면에서는 열이 몇 개든 칸당 65~90px가 상한이라
// 항목 텍스트가 무조건 여러 줄로 접힌다. 축을 뒤집어도(가로=카테고리) 열 개수만
// 줄 뿐 칸 폭은 그대로여서 읽기 문제가 안 풀렸다(실기기 확인 후 교체).
//
// 데이터 모델은 그대로다 — 여전히 (카테고리, 날짜) 셀이고, 화면에 늘어놓는
// 방식만 다르다. 날짜가 구분 헤더, 그 아래 항목이 있는 카테고리만 나열한다.
// 빈 카테고리를 다 보여주면 7일 × 카테고리 수만큼 빈 줄이 생겨 못 쓴다.

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']

interface Props {
  categories: Category[]
  dates: Date[]
  cellMap: CellMap
  /** 'YYYY-MM-DD' — 오늘로 강조할 날짜 */
  today: string
  onAddItem: (categoryId: string, date: string, content: string) => Promise<void>
  onOpenItem: (item: Item) => void
  onToggleDone: (id: string, done: boolean) => Promise<void>
  subtaskProgress?: Map<string, { done: number; total: number }>
}

export default function WeekAgenda({
  categories,
  dates,
  cellMap,
  today,
  onAddItem,
  onOpenItem,
  onToggleDone,
  subtaskProgress,
}: Props) {
  // 입력창이 열려 있는 날짜('YYYY-MM-DD'). 한 번에 하나만 연다.
  const [addingDate, setAddingDate] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  // 추가할 카테고리. 직전에 고른 값을 기억해 연속 입력에서 매번 다시 고르지 않게 한다.
  const [addCatId, setAddCatId] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const activeCatId = addCatId || categories[0]?.id || ''

  function openAdd(dateKey: string) {
    setAddingDate(dateKey)
    setDraft('')
  }
  function closeAdd() {
    setAddingDate(null)
    setDraft('')
  }

  async function submit(dateKey: string) {
    if (saving) return
    const content = draft.trim()
    if (!content || !activeCatId) {
      closeAdd()
      return
    }
    setSaving(true)
    try {
      await onAddItem(activeCatId, dateKey, content)
      // 격자와 같은 규칙 — Enter 는 연속 입력을 위해 열어둔 채 값만 비운다.
      setDraft('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {dates.map((d, i) => {
        const dateKey = formatDate(d)
        const isToday = dateKey === today
        const holiday = isHoliday(dateKey) || d.getDay() === 0
        // 항목이 있는 카테고리만 (빈 칸까지 다 그리면 화면이 빈 줄로 뒤덮인다)
        const groups = categories
          .map((cat) => ({ cat, items: cellItems(cellMap, cat.id, dateKey) }))
          .filter((g) => g.items.length > 0)

        return (
          <section
            key={dateKey}
            className={`rounded-md border ${
              isToday ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200'
            }`}
          >
            {/* 날짜 헤더 */}
            <div
              className={`flex items-center gap-2 border-b px-3 py-2 text-sm font-medium ${
                isToday
                  ? 'border-indigo-100 text-indigo-700'
                  : 'border-slate-100 text-slate-600'
              }`}
            >
              <span className={holiday && !isToday ? 'text-red-500' : undefined}>
                {d.getMonth() + 1}월 {d.getDate()}일 ({WEEKDAYS[i]})
              </span>
              {isToday && (
                <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  오늘
                </span>
              )}
            </div>

            <div className="px-3 py-2">
              {groups.length === 0 && addingDate !== dateKey && (
                <p className="py-1 text-xs text-slate-300">비어 있음</p>
              )}

              {groups.map(({ cat, items }) => (
                <div key={cat.id} className="mb-2 last:mb-0">
                  <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-400">
                    <span
                      className="inline-block size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name}
                  </div>
                  <ul className="space-y-1 pl-3.5">
                    {items.map((it) => {
                      const prog = subtaskProgress?.get(it.id)
                      return (
                        <li key={it.id} className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={it.done}
                            onChange={() => void onToggleDone(it.id, !it.done)}
                            className="mt-[3px] size-4 shrink-0 cursor-pointer accent-indigo-600"
                          />
                          <button
                            type="button"
                            onClick={() => onOpenItem(it)}
                            style={
                              !it.done && accentHex(it.accent)
                                ? { color: accentHex(it.accent) }
                                : undefined
                            }
                            className={`min-w-0 flex-1 break-words text-left text-sm leading-snug ${
                              it.done
                                ? 'text-slate-400 line-through'
                                : 'text-slate-700'
                            }`}
                          >
                            {it.start_time && (
                              <span className="mr-1 text-xs font-medium text-indigo-500">
                                {it.start_time.slice(0, 5)}
                              </span>
                            )}
                            {it.content}
                            {it.show_dday && (
                              <span className="ml-1 rounded bg-rose-50 px-1 text-[10px] font-medium text-rose-500">
                                {dDayLabel(it.date, today)}
                              </span>
                            )}
                            {prog && prog.total > 0 && (
                              <span className="ml-1 rounded bg-slate-100 px-1 text-[10px] text-slate-500">
                                {prog.done}/{prog.total}
                              </span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}

              {/* 추가 — 격자에선 셀을 탭하면 그 셀의 카테고리가 정해지지만,
                  여기선 날짜만 정해지므로 카테고리를 함께 골라야 한다. */}
              {addingDate === dateKey ? (
                <div className="mt-2 space-y-1.5">
                  <select
                    value={activeCatId}
                    onChange={(e) => setAddCatId(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs text-slate-600 outline-none focus:border-indigo-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void submit(dateKey)
                      else if (e.key === 'Escape') closeAdd()
                    }}
                    placeholder="입력 후 Enter"
                    className="w-full rounded border border-indigo-300 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                  <div className="flex justify-end">
                    {/* 폰에서는 바깥을 탭해도 blur 처리가 들쭉날쭉하고, 키보드가
                        올라온 상태라 닫을 길이 필요하다(격자는 blur 로 닫힌다) */}
                    <button
                      type="button"
                      onClick={closeAdd}
                      className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openAdd(dateKey)}
                  disabled={categories.length === 0}
                  className="mt-1 w-full rounded border border-dashed border-slate-200 py-1.5 text-xs text-slate-400 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50"
                >
                  ＋ 항목 추가
                </button>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
