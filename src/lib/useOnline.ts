import { useEffect, useState } from 'react'

// 온라인/오프라인 상태 (backlog 8.5 PWA).
//
// 앱 셸이 캐시돼 있으면 오프라인에서도 화면은 정상적으로 뜨는데, 그때 데이터
// 조회 실패를 평소와 같은 "데이터를 불러오지 못했습니다"로 보여주면 앱이
// 고장난 것처럼 읽힌다. 원인이 네트워크임을 구분해 안내하기 위한 훅.
//
// navigator.onLine 은 "랜/와이파이에 붙어 있는가"만 알려주므로 참인데도 실제
// 통신이 안 될 수 있다. 그래서 이 값은 오프라인일 때 문구를 바꾸는 용도로만
// 쓰고, 조회 성공 여부 판단에는 쓰지 않는다.

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return online
}
