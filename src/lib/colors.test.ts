import { describe, expect, it } from 'vitest'
import { accentHex, ACCENT_COLORS } from './colors'

describe('accentHex', () => {
  it('키를 CSS 변수로 돌려준다(다크 모드에서 밝은 색으로 바뀜)', () => {
    for (const a of ACCENT_COLORS) expect(accentHex(a.key)).toBe(`var(--accent-${a.key})`)
  })
  it('없거나 모르는 키는 undefined', () => {
    expect(accentHex(null)).toBeUndefined()
    expect(accentHex(undefined)).toBeUndefined()
    expect(accentHex('purple')).toBeUndefined()
  })
})
