import { useState } from 'react'
import {
  createCategory,
  removeCategory,
  reorderCategories,
  updateCategory,
} from '../api/categories'
import type { Category } from '../api/types'
import { CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR } from '../lib/colors'

// 카테고리 관리 섹션 (태스크 16 추가/삭제 + 17 순서변경)
// 태스크 26: 상시 모달에서 → 환경설정(SettingsModal) 안 섹션으로 이동.
// 자체 모달 크롬 없이 부모(설정 모달) 안에 인라인으로 렌더된다.

interface Props {
  categories: Category[]
  /** 변경 후 매트릭스 데이터 재조회 트리거 */
  onChanged: () => void
}

export default function CategoryManager({ categories, onChanged }: Props) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_CATEGORY_COLOR)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setBusy(true)
    setError('')
    try {
      const sort_order = categories.length
        ? Math.max(...categories.map((c) => c.sort_order)) + 1
        : 0
      await createCategory({ name: trimmed, color, sort_order })
      setName('')
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : '추가에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(cat: Category) {
    const ok = window.confirm(
      `"${cat.name}" 카테고리를 삭제하면 그 안의 모든 항목도 함께 삭제됩니다.\n계속할까요?`,
    )
    if (!ok) return
    setBusy(true)
    setError('')
    try {
      await removeCategory(cat.id)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function handleMove(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= categories.length) return
    // 배열 스왑 후 sort_order 를 0..n 으로 재부여
    const next = categories.slice()
    ;[next[index], next[target]] = [next[target], next[index]]
    setBusy(true)
    setError('')
    try {
      await reorderCategories(next.map((c, i) => ({ id: c.id, sort_order: i })))
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : '순서 변경에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id)
    setEditingName(cat.name)
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingName('')
  }

  async function commitEdit(cat: Category) {
    if (editingId !== cat.id) return // 이미 커밋/취소됨 (blur+submit 중복 방지)
    const trimmed = editingName.trim()
    if (!trimmed || trimmed === cat.name) {
      cancelEdit()
      return
    }
    setBusy(true)
    setError('')
    try {
      await updateCategory(cat.id, { name: trimmed })
      cancelEdit()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : '이름 변경에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {/* 목록 */}
      <ul className="mt-1 space-y-1">
          {categories.length === 0 && (
            <li className="text-sm text-slate-400">카테고리가 없습니다.</li>
          )}
          {categories.map((cat, index) => (
            <li
              key={cat.id}
              className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-slate-50"
            >
              {editingId === cat.id ? (
                <form
                  className="flex flex-1 items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void commitEdit(cat)
                  }}
                >
                  <span
                    className="inline-block size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') cancelEdit()
                    }}
                    onBlur={() => void commitEdit(cat)}
                    disabled={busy}
                    className="min-w-0 flex-1 rounded border border-indigo-300 px-1.5 py-0.5 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => startEdit(cat)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm text-slate-700"
                  title="클릭해서 이름 수정"
                >
                  <span
                    className="inline-block size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="truncate">{cat.name}</span>
                </button>
              )}
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy || index === 0}
                  onClick={() => void handleMove(index, -1)}
                  aria-label="위로"
                  className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={busy || index === categories.length - 1}
                  onClick={() => void handleMove(index, 1)}
                  aria-label="아래로"
                  className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleDelete(cat)}
                  className="text-xs text-red-500 hover:text-red-400 disabled:opacity-50"
                >
                  삭제
                </button>
              </span>
            </li>
          ))}
        </ul>

        {/* 추가 폼 */}
        <form onSubmit={handleAdd} className="mt-4 border-t border-slate-100 pt-4">
          <label className="block text-sm font-medium text-slate-700">
            새 카테고리
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 마감, 일정, 공부"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                aria-label={c.name}
                onClick={() => setColor(c.hex)}
                className={`size-6 rounded-full ${
                  color === c.hex
                    ? 'ring-2 ring-slate-800 ring-offset-2'
                    : ''
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="mt-4 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            추가
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
    </div>
  )
}
