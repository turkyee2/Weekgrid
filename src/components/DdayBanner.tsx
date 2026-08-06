import type { Category, Item } from '../api/types'
import { dDayLabel } from '../lib/date'

// D-day 배너 (backlog 7-B) — 헤더 바로 아래 상시 표시.
// D-day로 지정되고 아직 완료되지 않은 항목을 날짜순 카드로 나열한다.
// 매트릭스 셀 안의 기존 작은 배지는 그대로 유지하고, 이 배너는 요약용이다.

interface Props {
  items: Item[]
  categories: Category[]
  today: string
  onJump: (item: Item) => void
}

export default function DdayBanner({ items, categories, today, onJump }: Props) {
  if (items.length === 0) return null

  return (
    <div className="mb-4 flex items-center gap-2 overflow-x-auto rounded-md border border-rose-100 bg-rose-50/50 px-3 py-2">
      <span className="shrink-0 text-xs font-medium text-rose-500">D-day</span>
      <ul className="flex items-center gap-2">
        {items.map((it) => {
          const cat = categories.find((c) => c.id === it.category_id)
          return (
            <li key={it.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onJump(it)}
                className="flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-rose-50"
                title={it.content}
              >
                <span className="font-semibold text-rose-600">
                  {dDayLabel(it.date, today)}
                </span>
                {cat && (
                  <span
                    className="inline-block size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                )}
                <span className="max-w-40 truncate">
                  {it.content.trim() || '(제목 없음)'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
