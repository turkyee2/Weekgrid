import type { Item } from '../api/types'

// 셀 인덱싱 (태스크 10, design.md 3.5)
// items 배열을 (카테고리, 날짜) 셀 단위로 묶어 O(1) 조회용 맵을 만든다.
// 주간 매트릭스와 월간 달력이 이 맵을 공유한다.

export type CellMap = Map<string, Item[]>

/** 셀 키: `${category_id}|${date}` */
export function cellKey(categoryId: string, date: string): string {
  return `${categoryId}|${date}`
}

/** items → 셀 맵. 셀 안은 sort_order → created_at 순으로 정렬. */
export function buildCellMap(items: Item[]): CellMap {
  const map: CellMap = new Map()
  for (const it of items) {
    const k = cellKey(it.category_id, it.date)
    const arr = map.get(k)
    if (arr) arr.push(it)
    else map.set(k, [it])
  }
  for (const arr of map.values()) {
    arr.sort(
      (a, b) =>
        a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at),
    )
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
