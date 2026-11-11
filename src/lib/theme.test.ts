// ?raw: 파일 내용을 문자열로 (Vite 기능 — 번들 밖 스크립트를 그대로 실행해 보기 위함)
import code from '../../public/theme-init.js?raw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  __resetThemeStoreForTest,
  applyTheme,
  normalizeThemePref,
  readThemePref,
  resolveTheme,
  setThemePref,
  THEME_STORAGE_KEY,
  writeThemePref,
} from './theme'

// vitest 환경은 node 라 DOM 이 없다 — 필요한 최소 부분만 가짜로 만든다.
function fakeStorage(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init))
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    _map: m,
  }
}
function fakeRoot() {
  const set = new Set<string>()
  return {
    classList: {
      add: (c: string) => void set.add(c),
      remove: (c: string) => void set.delete(c),
      toggle: (c: string, on?: boolean) => {
        const want = on ?? !set.has(c)
        if (want) set.add(c)
        else set.delete(c)
        return want
      },
      contains: (c: string) => set.has(c),
    },
  }
}
function fakeMatchMedia(dark: boolean) {
  return () => ({ matches: dark, addEventListener() {}, removeEventListener() {} })
}

describe('theme — 순수 함수', () => {
  it('normalizeThemePref: 모르는 값은 system', () => {
    expect(normalizeThemePref('dark')).toBe('dark')
    expect(normalizeThemePref('light')).toBe('light')
    expect(normalizeThemePref('system')).toBe('system')
    expect(normalizeThemePref(null)).toBe('system')
    expect(normalizeThemePref('DARK')).toBe('system')
  })
  it('resolveTheme: system 은 OS 를 따르고, 명시값은 OS 와 무관', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('light', true)).toBe('light')
  })
  it('applyTheme: dark 클래스를 붙이고 뗀다', () => {
    const root = fakeRoot()
    applyTheme('dark', root as unknown as HTMLElement)
    expect(root.classList.contains('dark')).toBe(true)
    applyTheme('light', root as unknown as HTMLElement)
    expect(root.classList.contains('dark')).toBe(false)
  })
})

describe('theme — 저장소', () => {
  let storage: ReturnType<typeof fakeStorage>
  let root: ReturnType<typeof fakeRoot>
  beforeEach(() => {
    storage = fakeStorage()
    root = fakeRoot()
    vi.stubGlobal('localStorage', storage)
    vi.stubGlobal('document', { documentElement: root })
    vi.stubGlobal('window', { matchMedia: fakeMatchMedia(false) })
    __resetThemeStoreForTest()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('저장값이 없으면 system', () => {
    expect(readThemePref()).toBe('system')
  })
  it('write → read 왕복, system 은 키를 지운다', () => {
    writeThemePref('dark')
    expect(storage._map.get(THEME_STORAGE_KEY)).toBe('dark')
    expect(readThemePref()).toBe('dark')
    writeThemePref('system')
    expect(storage._map.has(THEME_STORAGE_KEY)).toBe(false)
  })
  it('localStorage 접근이 막혀도 예외 없이 system', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
    })
    expect(readThemePref()).toBe('system')
    expect(() => writeThemePref('dark')).not.toThrow()
  })
  it('setThemePref: 저장 + 즉시 <html> 반영', () => {
    setThemePref('dark')
    expect(root.classList.contains('dark')).toBe(true)
    expect(storage._map.get(THEME_STORAGE_KEY)).toBe('dark')
    setThemePref('light')
    expect(root.classList.contains('dark')).toBe(false)
  })
  it('setThemePref(system): OS 가 다크면 다크', () => {
    vi.stubGlobal('window', { matchMedia: fakeMatchMedia(true) })
    setThemePref('system')
    expect(root.classList.contains('dark')).toBe(true)
  })
})

// public/theme-init.js 는 번들 밖 일반 스크립트라 키·규칙이 theme.ts 와 어긋나기 쉽다.
// 실제 파일을 실행해 resolveTheme 와 같은 결과를 내는지 모든 조합으로 확인한다.
describe('public/theme-init.js 와 theme.ts 일치', () => {
  // 스크립트가 참조하는 전역(localStorage·window·document)만 인자로 넘겨 실행한다.
  const runInNewContext = (src: string, g: Record<string, unknown>) =>
    new Function('localStorage', 'window', 'document', src)(
      g.localStorage,
      g.window,
      g.document,
    )
  const prefs: (string | null)[] = ['dark', 'light', 'system', null, 'garbage']
  for (const stored of prefs) {
    for (const osDark of [true, false]) {
      it(`저장값=${stored}, OS 다크=${osDark}`, () => {
        const root = fakeRoot()
        runInNewContext(code, {
          localStorage: fakeStorage(stored === null ? {} : { [THEME_STORAGE_KEY]: stored }),
          window: { matchMedia: fakeMatchMedia(osDark) },
          document: { documentElement: root },
        })
        const expected = resolveTheme(normalizeThemePref(stored), osDark)
        expect(root.classList.contains('dark')).toBe(expected === 'dark')
      })
    }
  }
  it('저장소가 막혀도 스크립트가 예외를 던지지 않는다', () => {
    expect(() =>
      runInNewContext(code, {
        localStorage: {
          getItem: () => {
            throw new Error('blocked')
          },
        },
        window: { matchMedia: fakeMatchMedia(true) },
        document: { documentElement: fakeRoot() },
      }),
    ).not.toThrow()
  })
})
