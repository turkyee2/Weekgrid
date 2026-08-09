import { useEffect, useState } from 'react'

// 화면 폭에 따라 레이아웃 자체를 바꿔야 할 때 쓰는 훅 (backlog 8.1 모바일 최적화).
//
// 색·여백·줄바꿈처럼 CSS로 되는 건 Tailwind 브레이크포인트(md: 등)로 처리하고,
// 이 훅은 "DOM 구조가 달라지는" 경우에만 쓴다 — 예: 매트릭스 축 전치는 표의
// 행/열을 뒤집는 것이라 CSS만으로는 불가능하다.

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mql = window.matchMedia(query)
    // 훅 사용처가 바뀌거나 마운트 사이에 폭이 변했을 수 있으므로 한 번 동기화
    setMatches(mql.matches)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Tailwind 의 md 브레이크포인트(768px)와 같은 기준 */
export const MD_UP = '(min-width: 768px)'
