import { useEffect } from 'react'

// 간단 토스트 (태스크 23) — 화면 하단 중앙에 잠깐 떴다가 자동으로 사라진다.
// 상태관리 라이브러리 없이 부모의 상태로 표시/숨김을 제어한다.

interface Props {
  message: string
  /** 자동 닫힘까지의 시간(ms) */
  duration?: number
  onDismiss: () => void
}

export default function Toast({ message, duration = 3000, onDismiss }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration)
    return () => clearTimeout(t)
  }, [message, duration, onDismiss])

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md bg-slate-800 px-4 py-2 text-sm text-white shadow-lg"
    >
      {message}
    </div>
  )
}
