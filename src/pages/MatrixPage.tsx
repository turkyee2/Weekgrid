import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createItem, removeItem, updateItem } from '../api/items'
import { ensureDefaultCategory } from '../api/categories'
import type { Item } from '../api/types'
import LogoutButton from '../components/LogoutButton'
import MatrixGrid from '../components/MatrixGrid'
import ItemDetailPanel from '../components/ItemDetailPanel'
import SubtaskList from '../components/SubtaskList'
import ItemNote from '../components/ItemNote'
import MonthCalendar from '../components/MonthCalendar'
import ViewHeader from '../components/ViewHeader'
import CategoryFilter from '../components/CategoryFilter'
import OverdueBadge from '../components/OverdueBadge'
import SettingsModal from '../components/SettingsModal'
import Toast from '../components/Toast'
import GridSkeleton from '../components/GridSkeleton'
import { useMatrixData } from '../hooks/useMatrixData'
import { useOverdueItems } from '../hooks/useOverdueItems'
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
  const [showSettings, setShowSettings] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  // 월간 뷰 카테고리 필터 (빈 배열 = 전체). 표시 전용, 데이터 변경 없음.
  const [monthCatFilter, setMonthCatFilter] = useState<string[]>([])
  // 상세 패널에 열려 있는 항목 id (태스크 30)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  const {
    loading,
    error,
    settings,
    categories,
    items,
    cellMap,
    subtaskProgress,
    upsertItemLocal,
    removeItemLocal,
    setSettingsLocal,
    setItemProgressLocal,
    reload,
  } = useMatrixData(viewMode, anchor)

  // 사용자가 토글하기 전까지는 설정의 기본 뷰(default_view)를 따른다
  const userToggled = useRef(false)
  useEffect(() => {
    if (!userToggled.current) setViewMode(settings.default_view)
  }, [settings.default_view])

  // 신규 사용자: 카테고리가 하나도 없으면 기본 "할일" 시드 (태스크 26, 요구사항 15-2)
  const seededRef = useRef(false)
  useEffect(() => {
    if (seededRef.current) return
    seededRef.current = true
    ensureDefaultCategory()
      .then((created) => {
        if (created) reload()
      })
      .catch(() => {
        /* 시드 실패는 치명적이지 않음 — 빈 상태 안내로 대체 */
      })
  }, [reload])

  const today = useMemo(
    () => logicalToday(new Date(), settings.day_rollover_hour),
    [settings.day_rollover_hour],
  )

  // 지난 미완료 항목 (헤더 배지, backlog 1.2) — 표시 전용, 현재 조회 범위와 무관
  const overdue = useOverdueItems(today)

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

  // 지난 미완료 배지 목록에서 항목 클릭 → 그 항목이 있는 주로 이동 + 상세 패널 오픈
  // (날짜를 옮기고 싶으면 상세 패널에서 직접 바꾼다, backlog 1.2)
  const handleJumpToItem = useCallback((it: Item) => {
    userToggled.current = true
    setAnchor(parseDate(it.date))
    setViewMode('week')
    setSelectedItemId(it.id)
  }, [])

  const handleAddItem = useCallback(
    async (categoryId: string, date: string, content: string) => {
      const existing = cellItems(cellMap, categoryId, date)
      const sort_order = existing.length
        ? Math.max(...existing.map((i) => i.sort_order)) + 1
        : 0
      try {
        const created = await createItem({
          category_id: categoryId,
          date,
          content,
          sort_order,
        })
        upsertItemLocal(created)
      } catch {
        setToast('항목 추가에 실패했습니다.')
      }
    },
    [cellMap, upsertItemLocal],
  )

  // 항목 부분 수정(낙관적 + 롤백 + 토스트). 상세 패널과 완료 토글이 공유. (태스크 30)
  const patchItem = useCallback(
    async (id: string, patch: Partial<Item>) => {
      const prev = items.find((i) => i.id === id)
      if (!prev) return
      upsertItemLocal({ ...prev, ...patch, updated_at: new Date().toISOString() })
      try {
        await updateItem(id, patch)
        // done/date 변경은 지난 미완료 배지에 영향을 줄 수 있음
        if (patch.done !== undefined || patch.date !== undefined) overdue.reload()
      } catch {
        upsertItemLocal(prev)
        setToast('변경에 실패했습니다.')
      }
    },
    [items, upsertItemLocal, overdue],
  )

  const handleToggleDone = useCallback(
    (id: string, done: boolean) => patchItem(id, { done }),
    [patchItem],
  )

  const handleRemoveItem = useCallback(
    async (id: string) => {
      const prev = items.find((i) => i.id === id)
      removeItemLocal(id)
      try {
        await removeItem(id)
        overdue.reload()
      } catch {
        if (prev) upsertItemLocal(prev)
        setToast('삭제에 실패했습니다.')
      }
    },
    [items, removeItemLocal, upsertItemLocal, overdue],
  )

  return (
    <div className="min-h-full bg-white">
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-slate-800">주간 플래너</h1>
          <OverdueBadge
            items={overdue.items}
            categories={categories}
            onJump={handleJumpToItem}
          />
        </div>
        <nav className="flex items-center gap-4 text-sm text-slate-500">
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="hover:text-slate-800"
          >
            설정
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

        {loading && <GridSkeleton rows={viewMode === 'week' ? 4 : 6} cols={7} />}
        {error && (
          <div className="flex items-center gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            <span>{error}</span>
            <button
              type="button"
              onClick={reload}
              className="rounded border border-red-300 px-2 py-1 text-xs font-medium hover:bg-red-100"
            >
              다시 시도
            </button>
          </div>
        )}
        {!loading && !error && categories.length === 0 && (
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="rounded-md border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
          >
            + 설정에서 카테고리를 추가해 시작하세요
          </button>
        )}
        {!loading && !error && categories.length > 0 && viewMode === 'week' && (
          <MatrixGrid
            categories={categories}
            dates={dateRange.dates}
            cellMap={cellMap}
            today={today}
            onAddItem={handleAddItem}
            onOpenItem={(it) => setSelectedItemId(it.id)}
            onToggleDone={handleToggleDone}
            subtaskProgress={subtaskProgress}
          />
        )}
        {!loading && !error && categories.length > 0 && viewMode === 'month' && (
          <>
            <div className="mb-3 flex justify-end">
              <CategoryFilter
                categories={categories}
                selected={monthCatFilter}
                onChange={setMonthCatFilter}
              />
            </div>
            <MonthCalendar
              categories={
                monthCatFilter.length === 0
                  ? categories
                  : categories.filter((c) => monthCatFilter.includes(c.id))
              }
              dates={dateRange.dates}
              cellMap={cellMap}
              monthStart={dateRange.monthStart!}
              monthEnd={dateRange.monthEnd!}
              today={today}
              onSelectDate={handleSelectDate}
            />
          </>
        )}
      </main>

      {showSettings && (
        <SettingsModal
          settings={settings}
          categories={categories}
          onClose={() => setShowSettings(false)}
          onSaved={(patch) => {
            userToggled.current = false // 저장한 기본 뷰를 다시 따르도록
            setSettingsLocal(patch)
          }}
          onCategoriesChanged={reload}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      {(() => {
        const selected = selectedItemId
          ? items.find((i) => i.id === selectedItemId)
          : null
        if (!selected) return null
        const catName =
          categories.find((c) => c.id === selected.category_id)?.name ?? ''
        return (
          <ItemDetailPanel
            item={selected}
            categoryName={catName}
            onClose={() => setSelectedItemId(null)}
            onPatch={patchItem}
            onRemove={handleRemoveItem}
          >
            <SubtaskList
              itemId={selected.id}
              onProgressChange={setItemProgressLocal}
            />
            <ItemNote itemId={selected.id} />
          </ItemDetailPanel>
        )
      })()}
    </div>
  )
}
