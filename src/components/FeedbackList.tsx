import { useEffect, useState } from 'react'
import { listFeedback } from '../api/feedback'
import { supabase } from '../lib/supabase'
import type { Feedback } from '../api/types'

// 관리자 전용 피드백 조회 (backlog 1.2 방안 b)
// 로그인 계정 UID가 VITE_ADMIN_UID와 일치할 때만 목록을 렌더링한다.
// 실제 접근 제어는 DB RLS(app.admin_uid)가 담당하므로, 이 컴포넌트는 UI 노출 여부만 결정한다.

export default function FeedbackList() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [items, setItems] = useState<Feedback[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const adminUid = import.meta.env.VITE_ADMIN_UID
    if (!adminUid) return
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id !== adminUid) return
      setIsAdmin(true)
      listFeedback()
        .then(setItems)
        .catch((err) =>
          setError(err instanceof Error ? err.message : '불러오기에 실패했습니다.'),
        )
    })
  }, [])

  if (!isAdmin) return null

  return (
    <div className="mt-6 border-t border-slate-200 pt-4">
      <p className="text-sm font-medium text-slate-700">
        받은 피드백 ({items.length})
      </p>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      <ul className="mt-2 space-y-2">
        {items.map((f) => (
          <li
            key={f.id}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
          >
            <p className="whitespace-pre-wrap">{f.message}</p>
            <p className="mt-1 text-xs text-slate-400">
              {new Date(f.created_at).toLocaleString('ko-KR')}
            </p>
          </li>
        ))}
        {items.length === 0 && !error && (
          <p className="text-xs text-slate-400">아직 받은 피드백이 없습니다.</p>
        )}
      </ul>
    </div>
  )
}
