import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createItem, removeItem, updateItem } from '../api/items'
import CategoryManager from '../components/CategoryManager'
import LogoutButton from '../components/LogoutButton'
import MatrixGrid from '../components/MatrixGrid'
import MonthCalendar from '../components/MonthCalendar'
import ViewHeader from '../components/ViewHeader'
import { useMatrixData } from '../hooks/useMatrixData'
import { cellItems } from '../lib/cellMap'
import {
  addDays,
  addMonths,
  buildDateRange,
  logicalToday,
  parseDate,
  viewLabel,
  type ViewMode,
} from '../lib/date'

// 매트릭스 화면 (태스크 19: 주간/월간 토글 + 드릴다운)
export default function MatrixPage() {
  const [anchor, setAnchor] = useState<Date>(() => new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [showCategories, setShowCategories] = useState(false)

  const {
    loading,
    error,
    settings,
    categories,
    items,
    cellMap,
    upsertItemLocal,
    removeItemLocal,
    reload,
  } = useMatrixData(viewMode, anchor)

  // 사용자가 토글하기 전까지는 설정의 기본 뷰(default_view)를 따른다
  const userToggled = useRef(false)
  useEffect(() => {
    if (!userToggled.current) setViewMode(settings.default_view)
  }, [settings.default_view])

  const today = useMemo(
    () => logicalToday(new Date(), settings.day_rollover_hour),
    [settings.day_rollover_hour],
  )

  // 렌더용 날짜 범위 (주간 7일 / 월간 6주 그리드 + monthStart/monthEnd)
  const anchorKey = logicalToday(anchor, 0) // 안정적인 의존성 키
  const dateRange = useMemo(
    () => buildDateRange(viewMode, anchor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [viewMode, anchorKey],
  )

  const goPrev = useCallback(
    () =>
      setAnchor((a) => (viewMode === 'week' ? addDays(a, -7) : addMonths(a, -1))),
    [viewMode],
  )
  const goNext = useCallback(
    () =>
      setAnchor((a) => (viewMode === 'week' ? addDays(a, 7) : addMonths(a, 1))),
    [viewMode],
  )
  const goToday = useCallback(
    () => setAnchor(parseDate(logicalToday(new Date(), settings.day_rollover_hour))),
    [settings.day_rollover_hour],
  )
  const setView = useCallback((m: ViewMode) => {
    userToggled.current = true
    setViewMode(m)
  }, [])

  // 월간 달력에서 날짜 클릭 → 그 주의 주간 뷰로 드릴다운
  const handleSelectDate = useCallback((d: Date) => {
    userToggled.current = true
    setAnchor(d)
    setViewMode('week')
  }, [])

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
          <button
            type="button"
            onClick={() => setShowCategories(true)}
            className="hover:text-slate-800"
          >
            카테고리
          </button>
          <Link className="hover:text-slate-800" to="/notes">
            낙서장
          </Link>
          <LogoutButton />
        </nav>
      </header>

      <main className="px-6 py-6">
        <div className="mb-4">
          <ViewHeader
            label={viewLabel(viewMode, anchor)}
            viewMode={viewMode}
            onPrev={goPrev}
            onNext={goNext}
            onToday={goToday}
            onSetView={setView}
          />
        </div>

        {loading && <p className="text-sm text-slate-400">불러오는 중…</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}
        {!loading && !error && categories.length === 0 && (
          <button
            type="button"
            onClick={() => setShowCategories(true)}
            className="rounded-md border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
          >
            + 카테고리를 추가해 시작하세요
          </button>
        )}
        {!loading && !error && categories.length > 0 && viewMode === 'week' && (
          <MatrixGrid
            categories={categories}
            dates={dateRange.dates}
            cellMap={cellMap}
            today={today}
            onAddItem={handleAddItem}
            onUpdateItem={handleUpdateItem}
            onRemoveItem={handleRemoveItem}
            onToggleDone={handleToggleDone}
          />
        )}
        {!loading && !error && categories.length > 0 && viewMode === 'month' && (
          <MonthCalendar
            categories={categories}
            dates={dateRange.dates}
            cellMap={cellMap}
            monthStart={dateRange.monthStart!}
            monthEnd={dateRange.monthEnd!}
            today={today}
            onSelectDate={handleSelectDate}
          />
        )}
      </main>

      {showCategories && (
        <CategoryManager
          categories={categories}
          onClose={() => setShowCategories(false)}
          onChanged={reload}
        />
      )}
    </div>
  )
}
