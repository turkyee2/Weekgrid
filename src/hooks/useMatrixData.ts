import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { listCategories } from '../api/categories'
import { listItemsByRange } from '../api/items'
import { listSubtasksByItems } from '../api/subtasks'
import { getSettings } from '../api/settings'
import type { Category, EditableSettings, Item } from '../api/types'
import { DEFAULT_SETTINGS } from '../api/types'
import { buildCellMap, type CellMap } from '../lib/cellMap'
import { buildDateRange, formatDate, type ViewMode } from '../lib/date'
import { readCachedWeekStart, writeCachedWeekStart } from '../lib/weekStartCache'
import { loadErrorMessage, withRetry } from '../lib/retry'
import { useRefetchOnResume } from '../lib/useRefetchOnResume'

type Settings = EditableSettings

/** 항목별 서브태스크 진행률 (완료/전체) */
export type SubtaskProgress = Map<string, { done: number; total: number }>

export interface MatrixData {
  loading: boolean
  error: string | null
  settings: Settings
  /**
   * settings 조회가 끝났는지(성공·실패 무관). 저장된 설정을 화면 상태로
   * 한 번만 반영해야 하는 쪽(월간 카테고리 필터 등)에서 "기본값을 진짜 값으로
   * 착각하고 덮어쓰는" 것을 막는 데 쓴다.
   */
  settingsLoaded: boolean
  categories: Category[]
  items: Item[]
  cellMap: CellMap
  /** 항목별 서브태스크 진행률 (셀 배지용, 태스크 32) */
  subtaskProgress: SubtaskProgress
  /** 현재 조회한 날짜 범위(문자열) */
  range: { start: string; end: string }
  /** 범위 데이터 수동 재조회 */
  reload: () => void
  /** 설정을 로컬 상태에 즉시 반영 (저장 성공 후) */
  setSettingsLocal: (patch: Partial<Settings>) => void
  /** 특정 항목의 진행률을 로컬 반영 (상세 패널에서 서브태스크 변경 시) */
  setItemProgressLocal: (itemId: string, done: number, total: number) => void
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
  // 주 시작 요일은 조회 범위를 바꾸므로, 마지막으로 본 값을 기기에 캐시해 초기값으로
  // 쓴다 — 안 그러면 일요일 시작 사용자는 매번 월요일 주를 먼저 불러왔다가 다시 조회한다.
  const [settings, setSettings] = useState<Settings>(() => ({
    ...DEFAULT_SETTINGS,
    week_start: readCachedWeekStart(),
  }))
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [subtaskProgress, setSubtaskProgress] = useState<SubtaskProgress>(
    new Map(),
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 범위는 (mode, anchor의 날짜)에만 의존 → Date 객체 identity 변화로 인한 재조회 방지
  const anchorKey = formatDate(anchor)
  const weekStart = settings.week_start
  const range = useMemo(
    () => buildDateRange(mode, anchor, weekStart),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, anchorKey, weekStart],
  )
  const startKey = formatDate(range.start)
  const endKey = formatDate(range.end)

  // settings 최초 1회
  useEffect(() => {
    let alive = true
    getSettings()
      .then((s) => {
        if (!alive) return
        setSettings(s)
        writeCachedWeekStart(s.week_start)
      })
      .catch(() => {
        /* 설정 조회 실패는 치명적이지 않음 → 기본값 유지 */
      })
      .finally(() => alive && setSettingsLoaded(true))
    return () => {
      alive = false
    }
  }, [])

  // 가장 최근 요청만 화면에 반영한다 — 주를 빠르게 넘기거나 재시도가 겹칠 때
  // 늦게 도착한 이전 범위 응답이 현재 화면을 덮어쓰지 않게.
  const requestId = useRef(0)
  // 화면에 이미 데이터가 떠 있는지(조용한 재조회 판단용)
  const hasData = useRef(false)

  /**
   * silent=true: 이미 화면에 데이터가 있을 때의 백그라운드 재조회(화면 복귀 등).
   * 스켈레톤으로 바꾸지 않고, 실패해도 기존 화면을 유지한 채 조용히 넘어간다.
   */
  const loadRange = useCallback(
    async (silent = false) => {
      const id = ++requestId.current
      const quiet = silent && hasData.current
      if (!quiet) {
        setLoading(true)
        setError(null)
      }
      try {
        // 일시적 실패(앱 복귀 직후 네트워크·토큰 갱신 등)는 자동 재시도 (backlog 9.8)
        const [cats, its] = await withRetry(() =>
          Promise.all([listCategories(), listItemsByRange(startKey, endKey)]),
        )
        if (id !== requestId.current) return
        setCategories(cats)
        setItems(its)
        hasData.current = true
        setError(null)
        // 보이는 항목들의 서브태스크 진행률을 일괄 조회 (태스크 32)
        // 부차 데이터이므로 실패해도 매트릭스 자체는 표시한다.
        try {
          const subs = await listSubtasksByItems(its.map((i) => i.id))
          if (id !== requestId.current) return
          const progress: SubtaskProgress = new Map()
          for (const s of subs) {
            const p = progress.get(s.item_id) ?? { done: 0, total: 0 }
            p.total += 1
            if (s.done) p.done += 1
            progress.set(s.item_id, p)
          }
          setSubtaskProgress(progress)
        } catch {
          if (id === requestId.current) setSubtaskProgress(new Map())
        }
      } catch (e) {
        if (id !== requestId.current || quiet) return
        hasData.current = false
        setError(loadErrorMessage(e))
      } finally {
        if (id === requestId.current) setLoading(false)
      }
    },
    [startKey, endKey],
  )

  useEffect(() => {
    void loadRange()
  }, [loadRange])

  // 앱으로 돌아오거나 재연결되면 다시 불러온다 (backlog 9.8)
  useRefetchOnResume(() => void loadRange(true))

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
    if (patch.week_start !== undefined) writeCachedWeekStart(patch.week_start)
  }, [])

  // 진행률 로컬 반영 (태스크 32) — 상세 패널에서 서브태스크 변경 시 즉시 배지 갱신
  const setItemProgressLocal = useCallback(
    (itemId: string, done: number, total: number) => {
      setSubtaskProgress((prev) => {
        const next = new Map(prev)
        if (total === 0) next.delete(itemId)
        else next.set(itemId, { done, total })
        return next
      })
    },
    [],
  )

  return {
    loading,
    error,
    settings,
    settingsLoaded,
    categories,
    items,
    cellMap,
    subtaskProgress,
    range: { start: startKey, end: endKey },
    reload: () => void loadRange(),
    setSettingsLocal,
    setItemProgressLocal,
    upsertItemLocal,
    removeItemLocal,
  }
}
