import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

// 현재 로그인 세션을 추적하는 훅 (태스크 7)
// - 최초 마운트 시 getSession()으로 기존 세션 복원(새로고침/재방문에도 로그인 유지)
// - onAuthStateChange로 로그인/로그아웃/토큰갱신을 실시간 반영
// loading 동안에는 화면 깜빡임(로그인 화면이 잠깐 보이는 것)을 막기 위해 대기시킨다.

export interface AuthState {
  session: Session | null
  loading: boolean
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return { session, loading }
}
