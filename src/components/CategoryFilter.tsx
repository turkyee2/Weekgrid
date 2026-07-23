import { useEffect, useRef, useState } from 'react'
import type { Category } from '../api/types'

// 월간 뷰 카테고리 필터 (태스크 27, 요구사항 16)
// selected 가 빈 배열이면 "전체 표시"로 간주한다(표시 전용, 데이터 변경 없음).

interface Props {
  categories: Category[]
  /** 선택된 카테고리 id 목록. 비어 있으면 전체 */
  selected: string[]
  onChange: (next: string[]) => void
}

export default function CategoryFilter({
  categories,
  selected,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const allSelected = selected.length === 0
  const label = allSelected
    ? '전체 카테고리'
    : `${selected.length}개 카테고리`

  function toggle(id: string) {
    // selected 는 "표시할 것"의 명시적 목록. 빈 배열=전체이므로,
    // 전체 상태에서 하나를 끄면 나머지 전부를 선택 목록으로 확정한다.
    if (allSelected) {
      onChange(categories.filter((c) => c.id !== id).map((c) => c.id))
      return
    }
    const next = selected.includes(id)
      ? selected.filter((s) => s !== id)
      : [...selected, id]
    // 전부 선택되면 "전체"(빈 배열)로 정규화
    onChange(next.length === categories.length ? [] : next)
  }

  const isChecked = (id: string) => allSelected || selected.includes(id)

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-800"
      >
        {label}
        <span className="text-xs text-slate-400">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 w-52 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
          <button
            type="button"
            onClick={() => onChange([])}
            className="mb-1 w-full rounded px-2 py-1 text-left text-xs text-indigo-600 hover:bg-slate-50"
          >
            전체 표시
          </button>
          <ul className="max-h-64 space-y-0.5 overflow-y-auto">
            {categories.map((c) => (
              <li key={c.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={isChecked(c.id)}
                    onChange={() => toggle(c.id)}
                    className="size-3.5 accent-indigo-600"
                  />
                  <span
                    className="inline-block size-2.5 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="truncate">{c.name}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
