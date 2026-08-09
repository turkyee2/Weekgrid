import { useState } from 'react'
import type { Category, Item } from '../api/types'
import { cellItems, cellKey, type CellMap } from '../lib/cellMap'
import { dDayLabel, formatDate } from '../lib/date'
import { accentHex } from '../lib/colors'
import { isHoliday } from '../lib/holidays'

// 주간 매트릭스 격자 (태스크 11 렌더 + 13 추가 + 30 상세 패널 연동)
// 카테고리(행) × 날짜(열). 빈 셀 클릭 → 인라인 입력으로 항목 추가.
// 기존 항목 클릭 → 상세 패널 열기(onOpenItem). 체크박스 → 완료 토글.
//
// transposed(모바일, backlog 8.1): 가로=카테고리, 세로=날짜로 축을 뒤집는다.
// 좁은 화면에서는 열이 적은 쪽을 가로로 두는 게 낫다 — 날짜는 항상 7개지만
// 카테고리는 보통 4~6개이고, 세로 스크롤로 날짜를 훑는 방향이 폰에서 자연스럽다.
// 셀 내용은 (카테고리, 날짜)에만 의존하므로 바깥/안쪽 루프만 뒤집으면 되고,
// 컴포넌트를 둘로 나눌 필요가 없다.

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
  /** true면 가로=카테고리 / 세로=날짜로 축을 뒤집는다 (모바일) */
  transposed?: boolean
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
  transposed = false,
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
    // 저장 중 재진입 방지(중복 저장 + 이미 처리 중인 blur 재호출 무시)
    if (saving) return
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

  // 날짜 머리칸 (일반 모드에선 표 상단, 전치 모드에선 각 행 왼쪽)
  function dateHead(d: Date, i: number) {
    const key = formatDate(d)
    const isToday = key === today
    const holiday = isHoliday(key) || d.getDay() === 0
    return (
      <>
        <div className="text-xs">{WEEKDAYS[i]}</div>
        <div className={holiday && !isToday ? 'text-red-500' : 'text-slate-700'}>
          {d.getDate()}
        </div>
      </>
    )
  }

  // 카테고리 머리칸 (일반 모드에선 각 행 왼쪽, 전치 모드에선 표 상단)
  function categoryHead(cat: Category) {
    return (
      <span className="flex items-center justify-center gap-1.5">
        <span
          className="inline-block size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: cat.color }}
        />
        <span className="truncate">{cat.name}</span>
      </span>
    )
  }

  // 한 칸의 내용 — 축과 무관하게 (카테고리, 날짜)로만 결정된다
  function cellContent(cat: Category, dateKey: string) {
    const key = cellKey(cat.id, dateKey)
    const items = cellItems(cellMap, cat.id, dateKey)
    const isActive = activeCell === key
    return (
      <>
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
                    it.done ? 'text-slate-400 line-through' : 'text-slate-700'
                  }`}
                >
                  {it.start_time && (
                    <span className="mr-1 text-[10px] font-medium text-indigo-500">
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

        {isActive ? (
          <input
            autoFocus
            value={draft}
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
      </>
    )
  }

  // 전치 모드에선 카테고리 수만큼 가로 폭을 확보한다(칸당 약 76px).
  // 카테고리가 많아지면 가로 스크롤로 자연히 넘어간다.
  const minWidth = transposed ? 56 + categories.length * 76 : 760

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <table
        className="w-full table-fixed border-collapse text-sm"
        style={{ minWidth }}
      >
        <thead>
          <tr>
            <th
              className={`sticky left-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left font-medium text-slate-400 ${
                transposed ? 'w-14' : 'w-28'
              }`}
            >
              {transposed ? '날짜' : '카테고리'}
            </th>
            {transposed
              ? categories.map((cat) => (
                  <th
                    key={cat.id}
                    className="border-b border-l border-slate-200 px-2 py-2 text-center font-medium text-slate-700"
                  >
                    {categoryHead(cat)}
                  </th>
                ))
              : dates.map((d, i) => {
                  const key = formatDate(d)
                  return (
                    <th
                      key={key}
                      className={`border-b border-l border-slate-200 px-2 py-2 text-center font-medium ${
                        key === today
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {dateHead(d, i)}
                    </th>
                  )
                })}
          </tr>
        </thead>
        <tbody>
          {transposed
            ? dates.map((d, i) => {
                const dateKey = formatDate(d)
                const isToday = dateKey === today
                return (
                  <tr key={dateKey}>
                    <th
                      className={`sticky left-0 z-10 border-b border-slate-200 px-2 py-2 text-center align-top font-medium ${
                        isToday
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-slate-50 text-slate-400'
                      }`}
                    >
                      {dateHead(d, i)}
                    </th>
                    {categories.map((cat) => (
                      <td
                        key={cat.id}
                        onClick={() => {
                          const key = cellKey(cat.id, dateKey)
                          if (activeCell !== key) openInput(key)
                        }}
                        className={`group cursor-text border-b border-l border-slate-200 px-2 py-1.5 align-top ${
                          isToday ? 'bg-indigo-50/40' : ''
                        }`}
                      >
                        {cellContent(cat, dateKey)}
                      </td>
                    ))}
                  </tr>
                )
              })
            : categories.map((cat) => (
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
                    const isToday = dateKey === today
                    return (
                      <td
                        key={dateKey}
                        onClick={() => {
                          const key = cellKey(cat.id, dateKey)
                          if (activeCell !== key) openInput(key)
                        }}
                        className={`group cursor-text border-b border-l border-slate-200 px-2 py-1.5 align-top ${
                          isToday ? 'bg-indigo-50/40' : ''
                        }`}
                      >
                        {cellContent(cat, dateKey)}
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
