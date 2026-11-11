import { describe, expect, it, vi } from 'vitest'

// supabase 클라이언트는 환경변수가 필요하므로 모듈째 가짜로 바꾼다.
vi.mock('../lib/supabase', () => ({ supabase: {} }))

import { normalizeSettings } from './settings'
import { DEFAULT_SETTINGS } from './types'

describe('normalizeSettings', () => {
  it('행이 없으면 기본값(월요일 시작)', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(DEFAULT_SETTINGS.week_start).toBe(1)
  })

  it('week_start 컬럼이 아직 없는 행(스키마 재실행 전)도 다른 설정을 살린다', () => {
    const s = normalizeSettings({
      day_rollover_hour: 4,
      default_view: 'month',
      month_category_filter: ['a'],
    })
    expect(s).toEqual({
      day_rollover_hour: 4,
      default_view: 'month',
      month_category_filter: ['a'],
      week_start: 1,
    })
  })

  it('일요일 시작(0)을 그대로 읽는다', () => {
    expect(normalizeSettings({ week_start: 0 }).week_start).toBe(0)
    expect(normalizeSettings({ week_start: 1 }).week_start).toBe(1)
  })

  it('비정상 값은 기본값으로', () => {
    const s = normalizeSettings({
      day_rollover_hour: 99,
      default_view: 'year',
      month_category_filter: null,
      week_start: 5,
    })
    expect(s).toEqual(DEFAULT_SETTINGS)
  })

  it('행 메타데이터(owner_id 등)는 결과에 섞이지 않는다', () => {
    const row = { owner_id: 'x', updated_at: 'y', day_rollover_hour: 0 } as Record<
      string,
      unknown
    >
    expect(Object.keys(normalizeSettings(row))).toEqual([
      'day_rollover_hour',
      'default_view',
      'month_category_filter',
      'week_start',
    ])
  })
})
