import { useState } from 'react'
import type { Category } from '../api/types'
import { cellItems, cellKey, type CellMap } from '../lib/cellMap'
import { formatDate } from '../lib/date'

// 주간 매트릭스 격자 (태스크 11 렌더 + 태스크 13 항목 추가)
// 카테고리(행) × 날짜(열). 셀 클릭 → 인라인 입력으로 항목 추가.

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']

interface Props {
  categories: Category[]
  dates: Date[]
  cellMap: CellMap
  /** 'YYYY-MM-DD' — 오늘로 강조할 열 */
  today: string
  /** 항목 추가: (카테고리, 날짜, 내용) */
  onAddItem: (categoryId: string, date: string, content: string) => Promise<void>
  /** 항목 내용 수정: (id, 내용) */
  onUpdateItem: (id: string, content: string) => Promise<void>
  /** 항목 삭제: (id) */
  onRemoveItem: (id: string) => Promise<void>
  /** 완료 토글: (id, done) */
  onToggleDone: (id: string, done: boolean) => Promise<void>
}

export default function MatrixGrid({
  categories,
  dates,
  cellMap,
  today,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onToggleDone,
}: Props) {
  // 현재 입력 중인 셀 키와 입력값
  const [activeCell, setActiveCell] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  // 현재 편집 중인 항목
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  function startEdit(id: string, content: string) {
    setActiveCell(null)
    setEditingId(id)
    setEditDraft(content)
  }
  function cancelEdit() {
    setEditingId(null)
    setEditDraft('')
  }
  async function saveEdit(id: string) {
    const content = editDraft.trim()
    if (!content) {
      cancelEdit()
      return
    }
    setEditSaving(true)
    try {
      await onUpdateItem(id, content)
      cancelEdit()
    } finally {
      setEditSaving(false)
    }
  }
  async function removeEditing(id: string) {
    setEditSaving(true)
    try {
      await onRemoveItem(id)
      cancelEdit()
    } finally {
      setEditSaving(false)
    }
  }

  function openInput(key: string) {
    setActiveCell(key)
    setDraft('')
  }
  function closeInput() {
    setActiveCell(null)
    setDraft('')
  }

  async function submit(categoryId: string, date: string) {
    const content = draft.trim()
    if (!content) {
      closeInput()
      return
    }
    setSaving(true)
    try {
      await onAddItem(categoryId, date, content)
      // 연속 입력을 위해 입력창은 유지하고 값만 비운다
      setDraft('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <table className="w-full border-collapse text-sm">
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
                    className={`group min-w-24 cursor-text border-b border-l border-slate-200 px-2 py-1.5 align-top ${
                      isToday ? 'bg-indigo-50/40' : ''
                    }`}
                  >
                    <ul className="space-y-1">
                      {items.map((it) =>
                        editingId === it.id ? (
                          <li key={it.id} onClick={(e) => e.stopPropagation()}>
                            <input
                              autoFocus
                              value={editDraft}
                              disabled={editSaving}
                              onChange={(e) => setEditDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') void saveEdit(it.id)
                                else if (e.key === 'Escape') cancelEdit()
                              }}
                              className="w-full rounded border border-indigo-300 px-1 py-0.5 text-xs outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                            <div className="mt-0.5 flex gap-2 text-[11px]">
                              <button
                                type="button"
                                disabled={editSaving}
                                onClick={() => void saveEdit(it.id)}
                                className="text-indigo-600 hover:text-indigo-500"
                              >
                                저장
                              </button>
                              <button
                                type="button"
                                disabled={editSaving}
                                onClick={() => void removeEditing(it.id)}
                                className="text-red-500 hover:text-red-400"
                              >
                                삭제
                              </button>
                              <button
                                type="button"
                                disabled={editSaving}
                                onClick={cancelEdit}
                                className="text-slate-400 hover:text-slate-600"
                              >
                                취소
                              </button>
                            </div>
                          </li>
                        ) : (
                          <li
                            key={it.id}
                            className={`flex items-start gap-1.5 rounded px-1 py-0.5 text-xs leading-snug hover:bg-slate-100`}
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
                            <span
                              onClick={(e) => {
                                e.stopPropagation()
                                startEdit(it.id, it.content)
                              }}
                              className={`min-w-0 flex-1 cursor-pointer ${
                                it.done
                                  ? 'text-slate-400 line-through'
                                  : 'text-slate-700'
                              }`}
                            >
                              {it.content}
                            </span>
                          </li>
                        ),
                      )}
                    </ul>

                    {isActive ? (
                      <input
                        autoFocus
                        value={draft}
                        disabled={saving}
                        onChange={(e) => setDraft(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void submit(cat.id, dateKey)
                          else if (e.key === 'Escape') closeInput()
                        }}
                        onBlur={() => void submit(cat.id, dateKey)}
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
