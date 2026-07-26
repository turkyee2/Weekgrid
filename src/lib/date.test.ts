import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  buildDateRange,
  dDayLabel,
  formatDate,
  logicalToday,
  monthLabel,
  parseDate,
  startOfWeek,
  weekLabel,
} from './date'

describe('formatDate / parseDate', () => {
  it('로컬 기준으로 포맷하며 하루 밀림이 없다', () => {
    // 2026-07-20 을 만들어 다시 포맷했을 때 그대로여야 한다 (UTC 파싱 밀림 방지)
    expect(formatDate(new Date(2026, 6, 20))).toBe('2026-07-20')
    expect(formatDate(parseDate('2026-07-20'))).toBe('2026-07-20')
  })

  it('한 자리 월/일은 0으로 패딩한다', () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('addDays', () => {
  it('월 경계를 넘는다', () => {
    expect(formatDate(addDays(new Date(2026, 0, 31), 1))).toBe('2026-02-01')
  })
  it('음수로 이전 날짜', () => {
    expect(formatDate(addDays(new Date(2026, 0, 1), -1))).toBe('2025-12-31')
  })
})

describe('addMonths', () => {
  it('대상 달에 일자가 없으면 말일로 맞춘다 (윤년)', () => {
    // 2024-01-31 + 1개월 → 2024-02-29 (2024는 윤년)
    expect(formatDate(addMonths(new Date(2024, 0, 31), 1))).toBe('2024-02-29')
  })
  it('평년에는 2/28로 맞춘다', () => {
    expect(formatDate(addMonths(new Date(2023, 0, 31), 1))).toBe('2023-02-28')
  })
  it('연도를 넘는다', () => {
    expect(formatDate(addMonths(new Date(2026, 11, 15), 1))).toBe('2027-01-15')
  })
})

describe('startOfWeek (월요일 시작)', () => {
  it('월요일은 그대로', () => {
    // 2024-01-01 은 월요일
    expect(formatDate(startOfWeek(new Date(2024, 0, 1)))).toBe('2024-01-01')
  })
  it('일요일은 그 주 월요일로 되돌린다', () => {
    // 2024-01-07 은 일요일 → 월요일은 2024-01-01
    expect(formatDate(startOfWeek(new Date(2024, 0, 7)))).toBe('2024-01-01')
  })
})

describe('buildDateRange - week', () => {
  it('월요일 시작 7일이며 기준일을 포함한다', () => {
    const r = buildDateRange('week', new Date(2024, 0, 3)) // 수요일
    expect(r.dates).toHaveLength(7)
    expect(r.start.getDay()).toBe(1) // 월요일
    expect(formatDate(r.start)).toBe('2024-01-01')
    expect(formatDate(r.end)).toBe('2024-01-07')
  })
})

describe('buildDateRange - month (달력 그리드)', () => {
  it('월요일 시작, 7의 배수, 이웃 달 포함', () => {
    const r = buildDateRange('month', new Date(2024, 0, 15)) // 2024-01
    expect(formatDate(r.monthStart!)).toBe('2024-01-01')
    expect(formatDate(r.monthEnd!)).toBe('2024-01-31')
    expect(r.dates.length % 7).toBe(0)
    expect(r.start.getDay()).toBe(1) // 월요일 시작
    expect(r.end.getDay()).toBe(0) // 일요일 끝
    // 그리드는 달 전체를 덮어야 한다
    expect(r.start.getTime()).toBeLessThanOrEqual(r.monthStart!.getTime())
    expect(r.end.getTime()).toBeGreaterThanOrEqual(r.monthEnd!.getTime())
    // 2024-01: 1일이 월요일, 31일이 수요일 → 01-01 ~ 02-04, 35일
    expect(formatDate(r.start)).toBe('2024-01-01')
    expect(formatDate(r.end)).toBe('2024-02-04')
    expect(r.dates).toHaveLength(35)
  })
})

describe('logicalToday (하루 경계 시각)', () => {
  it('경계 시각 이전이면 전날로 판정', () => {
    // 07-22 02:00, 경계 4시 → 아직 어제(07-21)
    expect(logicalToday(new Date(2026, 6, 22, 2, 0), 4)).toBe('2026-07-21')
  })
  it('경계 시각 이후면 오늘', () => {
    // 07-22 05:00, 경계 4시 → 오늘(07-22)
    expect(logicalToday(new Date(2026, 6, 22, 5, 0), 4)).toBe('2026-07-22')
  })
  it('경계 0시면 벽시계 날짜와 동일', () => {
    expect(logicalToday(new Date(2026, 6, 22, 2, 0), 0)).toBe('2026-07-22')
  })
})

describe('라벨', () => {
  it('weekLabel: 그 주 월요일 기준 N월 M주차', () => {
    expect(weekLabel(new Date(2024, 0, 3))).toBe('1월 1주차') // 월요일 01-01
    expect(weekLabel(new Date(2024, 0, 15))).toBe('1월 3주차') // 월요일 01-15
  })
  it('monthLabel', () => {
    expect(monthLabel(new Date(2026, 6, 22))).toBe('2026년 7월')
  })
})

describe('dDayLabel', () => {
  it('기준일이 오늘이면 D-day', () => {
    expect(dDayLabel('2026-07-27', '2026-07-27')).toBe('D-day')
  })
  it('기준일이 미래면 D-N', () => {
    expect(dDayLabel('2026-07-30', '2026-07-27')).toBe('D-3')
  })
  it('기준일이 과거면 D+N', () => {
    expect(dDayLabel('2026-07-24', '2026-07-27')).toBe('D+3')
  })
})
