import { useEffect, useRef, useState } from 'react'
import type { Category, Item } from '../api/types'

// 지난 미완료 항목 배지 (backlog 1.2)
// 데이터를 옮기지 않고 표시만 한다 — 목록의 항목을 클릭하면 매트릭스에서
// 해당 항목으로 이동(주/날짜 전환 + 상세 패널 오픈)하며, 실제로 날짜를
// 옮기고 싶으면 상세 패널에서 직접 바꾼다(ItemDetailPanel).

interface Props {
  items: Item[]
  categories: Category[]
  onJump: (item: Item) => void
}

export default function OverdueBadge({ items, categories, onJump }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  if (items.length === 0) return null

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-100"
      >
        지난 미완료 {items.length}건
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-1 w-72 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
          <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
            {items.map((it) => {
              const catName =
                categories.find((c) => c.id === it.category_id)?.name ?? ''
              return (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onJump(it)
                      setOpen(false)
                    }}
                    className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <span className="shrink-0 text-xs text-slate-400">
                      {it.date.slice(5)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {it.content.trim() || '(제목 없음)'}
                    </span>
                    <span className="shrink-0 truncate text-xs text-slate-400">
                      {catName}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
