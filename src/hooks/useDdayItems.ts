import { useCallback, useEffect, useState } from 'react'
import { listDdayItems } from '../api/items'
import type { Item } from '../api/types'

/**
 * D-day로 지정되고 아직 완료되지 않은 항목 (헤더 배너, backlog 7-B)
 * 표시 전용 — 매트릭스의 현재 조회 범위(week/month)와 무관하게 전체 기간을 조회한다.
 */
export function useDdayItems() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    setLoading(true)
    listDdayItems()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { items, loading, reload }
}
