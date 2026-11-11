// 다크 모드 깜빡임 방지 (backlog 7-A). React 가 뜨기 전에 <html> 에 .dark 를 붙인다.
// 모듈 스크립트는 지연 실행이라 그 전에 흰 화면이 한 번 칠해지므로, 일반 스크립트로
// <head> 에서 동기 실행한다. 인라인 대신 파일로 둔 이유: CSP(script-src 'self')와 충돌 없게.
// 키·판정 규칙은 src/lib/theme.ts 와 같아야 한다.
;(function () {
  try {
    var p = localStorage.getItem('weekgrid.theme')
    var dark =
      p === 'dark' ||
      (p !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    if (dark) document.documentElement.classList.add('dark')
  } catch {
    /* 저장소 접근 불가(사생활 보호 모드 등) → 라이트로 둔다 */
  }
})()
