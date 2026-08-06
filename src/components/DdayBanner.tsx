import type { Category, Item } from '../api/types'
import { dDayLabel } from '../lib/date'

// D-day 배너 (backlog 7-B) — 헤더 바로 아래 상시 표시.
// items 는 배너에 고정(dday_pinned)된 항목만 — 고정은 항목 상세 패널에서
// "D-day로 표시" 토글 바로 아래의 별도 스위치로 켜고 끈다(완료 여부와
// 무관하게 항상 토글 가능). 매트릭스 셀 안의 기존 작은 배지는 그대로
// 유지하고, 이 배너는 그중 사용자가 고른 것만 모아 보여주는 요약이다.

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
