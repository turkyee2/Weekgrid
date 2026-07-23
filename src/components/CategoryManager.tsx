import { useState } from 'react'
import { createCategory, removeCategory } from '../api/categories'
import type { Category } from '../api/types'
import { CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR } from '../lib/colors'

// 카테고리 관리 모달 (태스크 16: 추가/삭제 + cascade 경고)
// 순서변경은 태스크 17에서 추가.

interface Props {
  categories: Category[]
  onClose: () => void
  /** 변경 후 매트릭스 데이터 재조회 트리거 */
  onChanged: () => void
}

export default function CategoryManager({
  categories,
  onClose,
  onChanged,
}: Props) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_CATEGORY_COLOR)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

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

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/30 px-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">
            카테고리 관리
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-400 hover:text-slate-700"
          >
            닫기
          </button>
        </div>

        {/* 목록 */}
        <ul className="mt-4 space-y-1">
          {categories.length === 0 && (
            <li className="text-sm text-slate-400">카테고리가 없습니다.</li>
          )}
          {categories.map((cat) => (
            <li
              key={cat.id}
              className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-slate-50"
            >
              <span className="flex items-center gap-2 text-sm text-slate-700">
                <span
                  className="inline-block size-3 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                {cat.name}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleDelete(cat)}
                className="text-xs text-red-500 hover:text-red-400 disabled:opacity-50"
              >
                삭제
              </button>
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
    </div>
  )
}
