import type { Item } from '../api/types'

// 셀 인덱싱 (태스크 10, design.md 3.5)
// items 배열을 (카테고리, 날짜) 셀 단위로 묶어 O(1) 조회용 맵을 만든다.
// 주간 매트릭스와 월간 달력이 이 맵을 공유한다.

export type CellMap = Map<string, Item[]>

/** 셀 키: `${category_id}|${date}` */
export function cellKey(categoryId: string, date: string): string {
  return `${categoryId}|${date}`
}

/**
 * 셀 내 항목 정렬 비교자 (v2 요구사항 12, design v2-2):
 * 시간이 있는 항목을 시각 오름차순으로 먼저(NULL은 마지막), 그다음 sort_order, created_at.
 * 주간 셀과 월간 요약이 동일 규칙을 공유한다.
 */
export function compareItems(a: Item, b: Item): number {
  if (a.start_time && b.start_time) {
    const t = a.start_time.localeCompare(b.start_time)
    if (t !== 0) return t
  } else if (a.start_time) {
    return -1 // 시간 있는 쪽이 먼저
  } else if (b.start_time) {
    return 1
  }
  return (
    a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)
  )
}

/** items → 셀 맵. 셀 안은 compareItems 규칙으로 정렬. */
export function buildCellMap(items: Item[]): CellMap {
  const map: CellMap = new Map()
  for (const it of items) {
    const k = cellKey(it.category_id, it.date)
    const arr = map.get(k)
    if (arr) arr.push(it)
    else map.set(k, [it])
  }
  for (const arr of map.values()) {
    arr.sort(compareItems)
  }
  return map
}

/** 특정 셀의 항목 목록 (없으면 빈 배열) */
export function cellItems(
  map: CellMap,
  categoryId: string,
  date: string,
): Item[] {
  return map.get(cellKey(categoryId, date)) ?? []
}

/**
 * 특정 날짜의 모든 항목(카테고리 무관) — 월간 달력의 날짜 칸용.
 * 카테고리 순서를 유지하기 위해 categories 순서대로 모은다.
 */
export function dayItems(
  map: CellMap,
  categoryIds: string[],
  date: string,
): Item[] {
  return categoryIds.flatMap((cid) => map.get(cellKey(cid, date)) ?? [])
}
