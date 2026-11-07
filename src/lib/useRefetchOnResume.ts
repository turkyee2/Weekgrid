import { useEffect, useRef } from 'react'

// 화면 복귀·재연결 시 다시 불러오기 (backlog 9.8).
//
// PWA/모바일에선 앱을 닫지 않고 백그라운드에 두는 일이 많아서, 다시 열었을 때
// 예전 데이터나(다른 기기에서 고친 내용 미반영) 직전에 실패한 빈 화면이 그대로
// 남아 있었다. 탭이 다시 보이거나(`visibilitychange`) 네트워크가 돌아오면
// (`online`) onResume 을 부른다. 잠깐 다른 앱을 보고 오는 정도로 매번 조회가
// 나가지 않게 minGapMs 안의 반복 호출은 건너뛴다(단 재연결은 항상 실행 — 실패
// 상태를 복구하는 게 목적이라).

export function useRefetchOnResume(onResume: () => void, minGapMs = 30_000) {
  const cb = useRef(onResume)
  useEffect(() => {
    cb.current = onResume
  }, [onResume])

  useEffect(() => {
    let last = Date.now()
    const run = (force: boolean) => {
      const now = Date.now()
      if (!force && now - last < minGapMs) return
      last = now
      cb.current()
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') run(false)
    }
    const onOnline = () => run(true)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [minGapMs])
}
