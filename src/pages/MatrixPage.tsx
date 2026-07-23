import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import LogoutButton from '../components/LogoutButton'
import MatrixGrid from '../components/MatrixGrid'
import { useMatrixData } from '../hooks/useMatrixData'
import { logicalToday, parseDate, viewLabel } from '../lib/date'

// 매트릭스 화면 (태스크 11: 읽기 전용 렌더)
// 주 이동/토글/CRUD는 태스크 12~ 에서 붙인다.
export default function MatrixPage() {
  const [anchor] = useState<Date>(() => new Date())
  const { loading, error, settings, categories, cellMap, range } = useMatrixData(
    'week',
    anchor,
  )

  const today = useMemo(
    () => logicalToday(new Date(), settings.day_rollover_hour),
    [settings.day_rollover_hour],
  )
  const dates = useMemo(() => {
    // range 는 문자열이므로 화면 렌더용 Date 배열은 여기서 재구성
    const out: Date[] = []
    let cur = parseDate(range.start)
    const end = parseDate(range.end)
    while (cur.getTime() <= end.getTime()) {
      out.push(cur)
      cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1)
    }
    return out
  }, [range.start, range.end])

  return (
    <div className="min-h-full bg-white">
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-semibold text-slate-800">주간 플래너</h1>
          <span className="text-sm text-slate-500">{viewLabel('week', anchor)}</span>
        </div>
        <nav className="flex items-center gap-4 text-sm text-slate-500">
          <Link className="hover:text-slate-800" to="/notes">
            낙서장
          </Link>
          <LogoutButton />
        </nav>
      </header>

      <main className="px-6 py-6">
        {loading && <p className="text-sm text-slate-400">불러오는 중…</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}
        {!loading && !error && categories.length === 0 && (
          <p className="text-sm text-slate-400">
            카테고리가 없습니다. (추가 기능은 곧 구현됩니다.)
          </p>
        )}
        {!loading && !error && categories.length > 0 && (
          <MatrixGrid
            categories={categories}
            dates={dates}
            cellMap={cellMap}
            today={today}
          />
        )}
      </main>
    </div>
  )
}
