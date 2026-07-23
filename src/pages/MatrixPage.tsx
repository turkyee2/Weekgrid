import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { createItem, removeItem, updateItem } from '../api/items'
import LogoutButton from '../components/LogoutButton'
import MatrixGrid from '../components/MatrixGrid'
import ViewHeader from '../components/ViewHeader'
import { useMatrixData } from '../hooks/useMatrixData'
import { cellItems } from '../lib/cellMap'
import { addDays, logicalToday, parseDate, viewLabel } from '../lib/date'

// 매트릭스 화면 (태스크 13: 항목 추가 추가)
export default function MatrixPage() {
  const [anchor, setAnchor] = useState<Date>(() => new Date())
  const {
    loading,
    error,
    settings,
    categories,
    items,
    cellMap,
    range,
    upsertItemLocal,
    removeItemLocal,
  } = useMatrixData('week', anchor)

  const today = useMemo(
    () => logicalToday(new Date(), settings.day_rollover_hour),
    [settings.day_rollover_hour],
  )

  const goPrev = useCallback(() => setAnchor((a) => addDays(a, -7)), [])
  const goNext = useCallback(() => setAnchor((a) => addDays(a, 7)), [])
  const goToday = useCallback(
    () => setAnchor(parseDate(logicalToday(new Date(), settings.day_rollover_hour))),
    [settings.day_rollover_hour],
  )

  const dates = useMemo(() => {
    const out: Date[] = []
    let cur = parseDate(range.start)
    const end = parseDate(range.end)
    while (cur.getTime() <= end.getTime()) {
      out.push(cur)
      cur = addDays(cur, 1)
    }
    return out
  }, [range.start, range.end])

  const handleAddItem = useCallback(
    async (categoryId: string, date: string, content: string) => {
      const existing = cellItems(cellMap, categoryId, date)
      const sort_order = existing.length
        ? Math.max(...existing.map((i) => i.sort_order)) + 1
        : 0
      const created = await createItem({
        category_id: categoryId,
        date,
        content,
        sort_order,
      })
      upsertItemLocal(created)
    },
    [cellMap, upsertItemLocal],
  )

  const handleUpdateItem = useCallback(
    async (id: string, content: string) => {
      await updateItem(id, { content })
      const existing = items.find((i) => i.id === id)
      if (existing) {
        upsertItemLocal({
          ...existing,
          content,
          updated_at: new Date().toISOString(),
        })
      }
    },
    [items, upsertItemLocal],
  )

  const handleRemoveItem = useCallback(
    async (id: string) => {
      await removeItem(id)
      removeItemLocal(id)
    },
    [removeItemLocal],
  )

  const handleToggleDone = useCallback(
    async (id: string, done: boolean) => {
      await updateItem(id, { done })
      const existing = items.find((i) => i.id === id)
      if (existing) {
        upsertItemLocal({
          ...existing,
          done,
          updated_at: new Date().toISOString(),
        })
      }
    },
    [items, upsertItemLocal],
  )

  return (
    <div className="min-h-full bg-white">
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-800">주간 플래너</h1>
        <nav className="flex items-center gap-4 text-sm text-slate-500">
          <Link className="hover:text-slate-800" to="/notes">
            낙서장
          </Link>
          <LogoutButton />
        </nav>
      </header>

      <main className="px-6 py-6">
        <div className="mb-4">
          <ViewHeader
            label={viewLabel('week', anchor)}
            onPrev={goPrev}
            onNext={goNext}
            onToday={goToday}
          />
        </div>

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
            onAddItem={handleAddItem}
            onUpdateItem={handleUpdateItem}
            onRemoveItem={handleRemoveItem}
            onToggleDone={handleToggleDone}
          />
        )}
      </main>
    </div>
  )
}
