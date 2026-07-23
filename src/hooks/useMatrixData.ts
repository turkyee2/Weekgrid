import { useCallback, useEffect, useMemo, useState } from 'react'
import { listCategories } from '../api/categories'
import { listItemsByRange } from '../api/items'
import { getSettings } from '../api/settings'
import type { Category, Item, UserSettings } from '../api/types'
import { DEFAULT_SETTINGS } from '../api/types'
import { buildCellMap, type CellMap } from '../lib/cellMap'
import { buildDateRange, formatDate, type ViewMode } from '../lib/date'

type Settings = Pick<UserSettings, 'day_rollover_hour' | 'default_view'>

export interface MatrixData {
  loading: boolean
  error: string | null
  settings: Settings
  categories: Category[]
  items: Item[]
  cellMap: CellMap
  /** 현재 조회한 날짜 범위(문자열) */
  range: { start: string; end: string }
  /** 범위 데이터 수동 재조회 */
  reload: () => void
  /** 설정을 로컬 상태에 즉시 반영 (저장 성공 후) */
  setSettingsLocal: (patch: Partial<Settings>) => void
  /** 로컬 상태에 항목 추가/갱신 (낙관적) */
  upsertItemLocal: (item: Item) => void
  /** 로컬 상태에서 항목 제거 (낙관적) */
  removeItemLocal: (id: string) => void
}

/**
 * 매트릭스/달력용 데이터 로딩 훅 (태스크 10, design.md 3.4)
 * - settings 는 최초 1회 조회
 * - viewMode / anchorDate 가 바뀌면 해당 범위의 categories + items 재조회
 * - items 로 셀 맵(cellMap) 파생
 */
export function useMatrixData(mode: ViewMode, anchor: Date): MatrixData {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 범위는 (mode, anchor의 날짜)에만 의존 → Date 객체 identity 변화로 인한 재조회 방지
  const anchorKey = formatDate(anchor)
  const range = useMemo(
    () => buildDateRange(mode, anchor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, anchorKey],
  )
  const startKey = formatDate(range.start)
  const endKey = formatDate(range.end)

  // settings 최초 1회
  useEffect(() => {
    let alive = true
    getSettings()
      .then((s) => alive && setSettings(s))
      .catch(() => {
        /* 설정 조회 실패는 치명적이지 않음 → 기본값 유지 */
      })
    return () => {
      alive = false
    }
  }, [])

  const loadRange = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [cats, its] = await Promise.all([
        listCategories(),
        listItemsByRange(startKey, endKey),
      ])
      setCategories(cats)
      setItems(its)
    } catch (e) {
      setError(e instanceof Error ? e.message : '데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [startKey, endKey])

  useEffect(() => {
    void loadRange()
  }, [loadRange])

  const cellMap = useMemo(() => buildCellMap(items), [items])

  // 낙관적 로컬 반영 (태스크 13~15) — 전체 재조회 없이 즉시 화면 갱신
  const upsertItemLocal = useCallback((item: Item) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id)
      if (idx === -1) return [...prev, item]
      const next = prev.slice()
      next[idx] = item
      return next
    })
  }, [])

  const removeItemLocal = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  // 설정 로컬 반영 (태스크 20) — upsert 성공 후 재조회 없이 즉시 적용
  const setSettingsLocal = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  return {
    loading,
    error,
    settings,
    categories,
    items,
    cellMap,
    range: { start: startKey, end: endKey },
    reload: () => void loadRange(),
    setSettingsLocal,
    upsertItemLocal,
    removeItemLocal,
  }
}
