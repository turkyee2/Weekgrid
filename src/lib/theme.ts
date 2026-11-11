import { useEffect, useSyncExternalStore } from 'react'

// 다크 모드 (backlog 7-A).
//
// 설정은 기기별(localStorage)로 둔다 — user_settings 에 두지 않는 이유: 테마는
// "이 기기의 화면" 취향이라 폰은 다크·PC는 라이트처럼 기기마다 다른 게 자연스럽고,
// 로그인 전(로그인 화면)에도 적용돼야 하기 때문.
//
// 색 전환 방식: 컴포넌트마다 dark: 클래스를 붙이는 대신, <html class="dark"> 일 때
// index.css 에서 slate/indigo/red/rose/white 팔레트 변수를 다크용 값으로 바꿔 끼운다.
// 앱이 쓰는 색 계열이 이 다섯 개뿐이라 가능하다. 새 색 계열을 쓰면 index.css 에도
// 다크 값을 추가해야 한다.
//
// 첫 페인트 전 적용은 public/theme-init.js 가 맡는다(키·판정 규칙이 같아야 함).

export type ThemePref = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'weekgrid.theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

export const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'system', label: '시스템' },
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
]

/** 저장값 정규화 — 모르는 값은 'system' */
export function normalizeThemePref(v: unknown): ThemePref {
  return v === 'light' || v === 'dark' ? v : 'system'
}

/** 선호값 + 시스템 다크 여부 → 실제로 그릴 테마 */
export function resolveTheme(pref: ThemePref, systemDark: boolean): ResolvedTheme {
  if (pref === 'system') return systemDark ? 'dark' : 'light'
  return pref
}

export function readThemePref(): ThemePref {
  try {
    return normalizeThemePref(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return 'system'
  }
}

export function writeThemePref(pref: ThemePref): void {
  try {
    if (pref === 'system') localStorage.removeItem(THEME_STORAGE_KEY)
    else localStorage.setItem(THEME_STORAGE_KEY, pref)
  } catch {
    /* 저장 실패해도 이번 세션 화면에는 적용된다 */
  }
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.(DARK_QUERY).matches
}

/** <html> 에 테마 반영 */
export function applyTheme(theme: ResolvedTheme, root: HTMLElement = document.documentElement): void {
  root.classList.toggle('dark', theme === 'dark')
}

// ── 앱 전역 상태 (모듈 단위 저장소) ─────────────────────────────
// 설정 모달(값 변경)과 App(적용·OS 변경 감지)이 같은 값을 봐야 하므로
// 컴포넌트 state 대신 작은 외부 저장소 + useSyncExternalStore 로 공유한다.
let current: ThemePref | null = null
const listeners = new Set<() => void>()

function getPref(): ThemePref {
  if (current === null) current = readThemePref()
  return current
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** 테마 선호값 변경 — 저장 + 즉시 적용 + 구독자 알림 */
export function setThemePref(p: ThemePref): void {
  current = p
  writeThemePref(p)
  applyTheme(resolveTheme(p, systemPrefersDark()))
  listeners.forEach((fn) => fn())
}

/** 현재 테마 선호값 (설정 화면용) */
export function useThemePref(): ThemePref {
  return useSyncExternalStore(subscribe, getPref, () => 'system')
}

/**
 * 앱 최상단(App)에서 한 번 호출 — 현재 선호값을 적용하고,
 * 'system' 일 때는 OS 다크 모드 전환을 따라간다.
 */
export function useApplyTheme(): void {
  const pref = useThemePref()
  useEffect(() => {
    applyTheme(resolveTheme(pref, systemPrefersDark()))
    if (pref !== 'system' || !window.matchMedia) return
    const mq = window.matchMedia(DARK_QUERY)
    const onChange = () => applyTheme(resolveTheme('system', mq.matches))
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [pref])
}

/** 테스트 전용: 모듈 상태 초기화 */
export function __resetThemeStoreForTest(): void {
  current = null
  listeners.clear()
}
