import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readCachedWeekStart, writeCachedWeekStart } from './weekStartCache'

describe('weekStartCache', () => {
  let m: Map<string, string>
  beforeEach(() => {
    m = new Map()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
      setItem: (k: string, v: string) => void m.set(k, v),
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('캐시가 없으면 월요일(1)', () => {
    expect(readCachedWeekStart()).toBe(1)
  })
  it('일요일(0) 왕복', () => {
    writeCachedWeekStart(0)
    expect(readCachedWeekStart()).toBe(0)
    writeCachedWeekStart(1)
    expect(readCachedWeekStart()).toBe(1)
  })
  it('깨진 값은 월요일', () => {
    m.set('weekgrid.weekStart', 'abc')
    expect(readCachedWeekStart()).toBe(1)
  })
  it('저장소 접근 불가여도 예외 없음', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('x')
      },
      setItem: () => {
        throw new Error('x')
      },
    })
    expect(readCachedWeekStart()).toBe(1)
    expect(() => writeCachedWeekStart(0)).not.toThrow()
  })
})
