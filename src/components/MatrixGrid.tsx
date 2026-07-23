import type { Category } from '../api/types'
import { cellItems, type CellMap } from '../lib/cellMap'
import { formatDate } from '../lib/date'

// 주간 매트릭스 격자 (읽기 전용, 태스크 11 · design 3.6-A)
// 카테고리(행) × 날짜(열). 셀에 항목을 세로로 나열. logicalToday 열 강조.

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']

interface Props {
  categories: Category[]
  dates: Date[]
  cellMap: CellMap
  /** 'YYYY-MM-DD' — 오늘로 강조할 열 */
  today: string
}

export default function MatrixGrid({ categories, dates, cellMap, today }: Props) {
  return (
    <div className="overflow-x-auto">
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
                const key = formatDate(d)
                const isToday = key === today
                const items = cellItems(cellMap, cat.id, key)
                return (
                  <td
                    key={key}
                    className={`border-b border-l border-slate-200 px-2 py-1.5 align-top ${
                      isToday ? 'bg-indigo-50/40' : ''
                    }`}
                  >
                    <ul className="space-y-1">
                      {items.map((it) => (
                        <li
                          key={it.id}
                          className={`rounded px-1 py-0.5 text-xs leading-snug ${
                            it.done
                              ? 'text-slate-400 line-through'
                              : 'text-slate-700'
                          }`}
                        >
                          {it.content}
                        </li>
                      ))}
                    </ul>
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
