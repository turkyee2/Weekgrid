import { useEffect, useState } from 'react'
import {
  createSubtask,
  listSubtasksByItem,
  removeSubtask,
  updateSubtask,
} from '../api/subtasks'
import type { Subtask } from '../api/types'

// 서브태스크 체크리스트 (태스크 31, 요구사항 11)
// 항목 상세 패널 안에서 세부 단계를 추가/토글/삭제한다.
// 변경은 낙관적으로 로컬 반영하고, 진행률을 부모에 알려 매트릭스 배지와 동기화한다.

interface Props {
  itemId: string
  /** 진행률 변화를 부모에 통지 (매트릭스 배지 동기화용, 선택) */
  onProgressChange?: (itemId: string, done: number, total: number) => void
}

export default function SubtaskList({ itemId, onProgressChange }: Props) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    listSubtasksByItem(itemId)
      .then((data) => alive && setSubtasks(data))
      .catch(
        (e) => alive && setError(e instanceof Error ? e.message : '불러오기 실패'),
      )
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [itemId])

  // subtasks 변경 시 진행률 통지
  useEffect(() => {
    const done = subtasks.filter((s) => s.done).length
    onProgressChange?.(itemId, done, subtasks.length)
  }, [subtasks, itemId, onProgressChange])

  async function handleAdd() {
    const content = draft.trim()
    if (!content) return
    setError('')
    const sort_order = subtasks.length
      ? Math.max(...subtasks.map((s) => s.sort_order)) + 1
      : 0
    try {
      const created = await createSubtask({ item_id: itemId, content, sort_order })
      setSubtasks((prev) => [...prev, created])
      setDraft('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '추가 실패')
    }
  }

  async function handleToggle(st: Subtask) {
    const next = !st.done
    setSubtasks((prev) =>
      prev.map((s) => (s.id === st.id ? { ...s, done: next } : s)),
    )
    try {
      await updateSubtask(st.id, { done: next })
    } catch {
      setSubtasks((prev) =>
        prev.map((s) => (s.id === st.id ? { ...s, done: st.done } : s)),
      )
      setError('변경 실패')
    }
  }

  // 앱에서 유일하게 확인 없이 즉시 지워지던 곳이라 한 단계를 넣는다 (backlog 8.1).
  // 다만 "일부만" 원칙에 따라 아직 진행 중인(미완료) 줄에서만 묻는다 — 완료 표시한
  // 줄을 정리하는 건 되돌릴 내용이 사실상 없는 청소 동작이라 그대로 지운다.
  async function handleRemove(st: Subtask) {
    if (!st.done && !window.confirm(`"${st.content}" 을(를) 삭제할까요?`)) return
    setSubtasks((prev) => prev.filter((s) => s.id !== st.id))
    try {
      await removeSubtask(st.id)
    } catch {
      setSubtasks((prev) =>
        [...prev, st].sort((a, b) => a.sort_order - b.sort_order),
      )
      setError('삭제 실패')
    }
  }

  const doneCount = subtasks.filter((s) => s.done).length

  return (
    <div className="border-t border-slate-100 pt-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">세부 체크리스트</span>
        {subtasks.length > 0 && (
          <span className="text-xs text-slate-400">
            {doneCount}/{subtasks.length}
          </span>
        )}
      </div>

      {loading ? (
        <p className="mt-2 text-xs text-slate-400">불러오는 중…</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {subtasks.map((st) => (
            <li key={st.id} className="group flex items-center gap-2">
              <input
                type="checkbox"
                checked={st.done}
                onChange={() => void handleToggle(st)}
                className="size-3.5 shrink-0 cursor-pointer accent-indigo-600"
              />
              <span
                className={`flex-1 text-sm ${
                  st.done ? 'text-slate-400 line-through' : 'text-slate-700'
                }`}
              >
                {st.content}
              </span>
              <button
                type="button"
                onClick={() => void handleRemove(st)}
                className="text-xs text-slate-300 opacity-0 hover:text-red-500 group-hover:opacity-100"
                aria-label="삭제"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void handleAdd()
            }
          }}
          placeholder="세부 항목 추가 + Enter"
          className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={!draft.trim()}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          추가
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  )
}
