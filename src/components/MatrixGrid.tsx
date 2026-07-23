import { useState } from 'react'
import type { Category, Item } from '../api/types'
import { cellItems, cellKey, type CellMap } from '../lib/cellMap'
import { formatDate } from '../lib/date'
import { accentHex } from '../lib/colors'

// 주간 매트릭스 격자 (태스크 11 렌더 + 13 추가 + 30 상세 패널 연동)
// 카테고리(행) × 날짜(열). 빈 셀 클릭 → 인라인 입력으로 항목 추가.
// 기존 항목 클릭 → 상세 패널 열기(onOpenItem). 체크박스 → 완료 토글.

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']

interface Props {
  categories: Category[]
  dates: Date[]
  cellMap: CellMap
  /** 'YYYY-MM-DD' — 오늘로 강조할 열 */
  today: string
  /** 항목 추가: (카테고리, 날짜, 내용) */
  onAddItem: (categoryId: string, date: string, content: string) => Promise<void>
  /** 항목 클릭 → 상세 패널 열기 */
  onOpenItem: (item: Item) => void
  /** 완료 토글: (id, done) */
  onToggleDone: (id: string, done: boolean) => Promise<void>
  /** 항목별 서브태스크 진행률 (완료/전체). 없으면 미표시 (태스크 32) */
  subtaskProgress?: Map<string, { done: number; total: number }>
}

export default function MatrixGrid({
  categories,
  dates,
  cellMap,
  today,
  onAddItem,
  onOpenItem,
  onToggleDone,
  subtaskProgress,
}: Props) {
  // 현재 입력 중인 셀 키와 입력값
  const [activeCell, setActiveCell] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  function openInput(key: string) {
    setActiveCell(key)
    setDraft('')
  }
  function closeInput() {
    setActiveCell(null)
    setDraft('')
  }

  async function submit(categoryId: string, date: string, keepOpen: boolean) {
    const content = draft.trim()
    if (!content) {
      closeInput()
      return
    }
    setSaving(true)
    try {
      await onAddItem(categoryId, date, content)
      // Enter 는 연속 입력을 위해 열어둔 채 값만 비우고,
      // 바깥 클릭(blur) 등은 입력을 닫아 기본 상태로 돌아간다.
      if (keepOpen) setDraft('')
      else closeInput()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <table className="w-full min-w-[760px] table-fixed border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-28 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left font-medium text-slate-400">
              카테고리
            </th>
            {dates.map((d, i) => {
              const key = formatDate(d)
              const isToday = key === today
              return (
                <th
                  key={key}
                  className={`border-b border-l border-slate-200 px-2 py-2 text-center font-medium ${
                    isToday ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400'
                  }`}
                >
                  <div className="text-xs">{WEEKDAYS[i]}</div>
                  <div className="text-slate-700">{d.getDate()}</div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <tr key={cat.id}>
              <th className="sticky left-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left align-top font-medium text-slate-700">
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  {cat.name}
                </span>
              </th>
              {dates.map((d) => {
                const dateKey = formatDate(d)
                const key = cellKey(cat.id, dateKey)
                const isToday = dateKey === today
                const items = cellItems(cellMap, cat.id, dateKey)
                const isActive = activeCell === key
                return (
                  <td
                    key={dateKey}
                    onClick={() => {
                      if (!isActive) openInput(key)
                    }}
                    className={`group cursor-text border-b border-l border-slate-200 px-2 py-1.5 align-top ${
                      isToday ? 'bg-indigo-50/40' : ''
                    }`}
                  >
                    <ul className="space-y-1">
                      {items.map((it) => {
                        const prog = subtaskProgress?.get(it.id)
                        return (
                          <li
                            key={it.id}
                            className="flex items-start gap-1.5 rounded px-1 py-0.5 text-xs leading-snug hover:bg-slate-100"
                          >
                            <input
                              type="checkbox"
                              checked={it.done}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation()
                                void onToggleDone(it.id, !it.done)
                              }}
                              className="mt-[3px] size-3 shrink-0 cursor-pointer accent-indigo-600"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onOpenItem(it)
                              }}
                              style={
                                !it.done && accentHex(it.accent)
                                  ? { color: accentHex(it.accent) }
                                  : undefined
                              }
                              className={`min-w-0 flex-1 break-words text-left ${
                                it.done
                                  ? 'text-slate-400 line-through'
                                  : 'text-slate-700'
                              }`}
                            >
                              {it.start_time && (
                                <span className="mr-1 text-[10px] font-medium text-indigo-500">
                                  {it.start_time.slice(0, 5)}
                                </span>
                              )}
                              {it.content}
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

                    {isActive ? (
                      <input
                        autoFocus
                        value={draft}
                        disabled={saving}
                        onChange={(e) => setDraft(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void submit(cat.id, dateKey, true)
                          else if (e.key === 'Escape') closeInput()
                        }}
                        onBlur={() => void submit(cat.id, dateKey, false)}
                        placeholder="입력 후 Enter"
                        className="mt-1 w-full rounded border border-indigo-300 px-1 py-0.5 text-xs outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    ) : (
                      <div className="mt-0.5 text-xs text-slate-300 opacity-0 group-hover:opacity-100">
                        + 추가
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
