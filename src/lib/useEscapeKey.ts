import { useEffect } from 'react'

// ESC 키로 패널/모달 닫기 (피드백)
// 마운트되어 있는 동안 document 레벨에서 Escape 를 감지해 onEscape 를 호출한다.
export function useEscapeKey(onEscape: () => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // 한글 조합 중의 Esc는 조합 취소용이므로 무시한다
      if (e.key === 'Escape' && !e.isComposing) onEscape()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onEscape])
}
