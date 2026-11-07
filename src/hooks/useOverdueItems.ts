import { useCallback, useEffect, useState } from 'react'
import { listOverdueItems } from '../api/items'
import type { Item } from '../api/types'
import { withRetry } from '../lib/retry'
import { useRefetchOnResume } from '../lib/useRefetchOnResume'

/**
 * 오늘(logicalToday) 이전 날짜인데 완료되지 않은 항목 (헤더 배지, backlog 1.2)
 * 표시 전용 — 매트릭스의 현재 조회 범위(week/month)와 무관하게 전체 기간을 조회한다.
 */
export function useOverdueItems(today: string) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    setLoading(true)
    // 일시적 실패는 자동 재시도, 끝내 실패하면 직전 목록을 유지한다 — 빈 배열로
    // 바꾸면 배너/배지가 "항목 없음"처럼 조용히 사라진다 (backlog 9.8)
    withRetry(() => listOverdueItems(today))
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [today])

  useEffect(() => {
    void reload()
  }, [reload])

  useRefetchOnResume(reload)

  return { items, loading, reload }
}
