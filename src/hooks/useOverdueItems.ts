import { useCallback, useEffect, useState } from 'react'
import { listOverdueItems } from '../api/items'
import type { Item } from '../api/types'

/**
 * 오늘(logicalToday) 이전 날짜인데 완료되지 않은 항목 (헤더 배지, backlog 1.2)
 * 표시 전용 — 매트릭스의 현재 조회 범위(week/month)와 무관하게 전체 기간을 조회한다.
 */
export function useOverdueItems(today: string) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    setLoading(true)
    listOverdueItems(today)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [today])

  useEffect(() => {
    void reload()
  }, [reload])

  return { items, loading, reload }
}
