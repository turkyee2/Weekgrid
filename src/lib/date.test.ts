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
  normalizeWeekStart,
  startOfWeek,
  viewLabel,
  weekdayHeaders,
  weekdayName,
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

// ── 주 시작 요일 설정 (backlog 7-A) ─────────────────────────────
// 2024-01: 1일 월요일, 6일 토요일, 7일 일요일, 31일 수요일.
describe('startOfWeek (일요일 시작)', () => {
  it('일요일은 그대로', () => {
    expect(formatDate(startOfWeek(new Date(2024, 0, 7), 0))).toBe('2024-01-07')
  })
  it('토요일은 그 주 일요일로 되돌린다 (6일 전)', () => {
    expect(formatDate(startOfWeek(new Date(2024, 0, 6), 0))).toBe('2023-12-31')
  })
  it('월요일은 전날 일요일로', () => {
    expect(formatDate(startOfWeek(new Date(2024, 0, 1), 0))).toBe('2023-12-31')
  })
  it('기본값(인자 생략)은 월요일 시작을 유지한다', () => {
    expect(formatDate(startOfWeek(new Date(2024, 0, 7)))).toBe(
      formatDate(startOfWeek(new Date(2024, 0, 7), 1)),
    )
  })
  it('어느 요일이든 결과는 항상 일요일이고 기준일과 0~6일 차이', () => {
    for (let i = 0; i < 14; i++) {
      const d = new Date(2024, 0, 1 + i)
      const s = startOfWeek(d, 0)
      expect(s.getDay()).toBe(0)
      const diff = Math.round((d.getTime() - s.getTime()) / 86_400_000)
      expect(diff).toBeGreaterThanOrEqual(0)
      expect(diff).toBeLessThanOrEqual(6)
    }
  })
})

describe('buildDateRange - 일요일 시작', () => {
  it('week: 일요일~토요일 7일이며 기준일을 포함한다', () => {
    const r = buildDateRange('week', new Date(2024, 0, 3), 0) // 수요일
    expect(r.dates).toHaveLength(7)
    expect(formatDate(r.start)).toBe('2023-12-31')
    expect(formatDate(r.end)).toBe('2024-01-06')
    expect(r.start.getDay()).toBe(0)
    expect(r.end.getDay()).toBe(6)
    expect(r.dates.map(formatDate)).toContain('2024-01-03')
  })
  it('week: 기준일이 일요일이면 그 일요일부터 시작', () => {
    const r = buildDateRange('week', new Date(2024, 0, 7), 0)
    expect(formatDate(r.start)).toBe('2024-01-07')
  })
  it('month: 일요일 시작·토요일 끝, 달 전체를 덮는다', () => {
    const r = buildDateRange('month', new Date(2024, 0, 15), 0)
    expect(r.start.getDay()).toBe(0)
    expect(r.end.getDay()).toBe(6)
    expect(r.dates.length % 7).toBe(0)
    // 2024-01: 12-31(일) ~ 02-03(토), 35일
    expect(formatDate(r.start)).toBe('2023-12-31')
    expect(formatDate(r.end)).toBe('2024-02-03')
    expect(r.dates).toHaveLength(35)
  })
  it('month: 1일이 일요일인 달은 이전 달 날짜 없이 시작', () => {
    // 2024-09-01 은 일요일
    const r = buildDateRange('month', new Date(2024, 8, 10), 0)
    expect(formatDate(r.start)).toBe('2024-09-01')
    // 월요일 시작이면 같은 달이 8월 26일부터 시작
    expect(formatDate(buildDateRange('month', new Date(2024, 8, 10), 1).start)).toBe(
      '2024-08-26',
    )
  })
  it('month: 두 설정 모두 날짜 연속(하루 간격, 중복 없음)', () => {
    for (const ws of [0, 1] as const) {
      for (let m = 0; m < 12; m++) {
        const r = buildDateRange('month', new Date(2026, m, 15), ws)
        for (let i = 1; i < r.dates.length; i++) {
          expect(formatDate(addDays(r.dates[i - 1], 1))).toBe(formatDate(r.dates[i]))
        }
        expect(r.dates.length === 35 || r.dates.length === 42 || r.dates.length === 28).toBe(true)
      }
    }
  })
})

describe('요일 이름', () => {
  it('weekdayHeaders: 월요일 시작은 월~일, 일요일 시작은 일~토', () => {
    expect(weekdayHeaders(1)).toEqual(['월', '화', '수', '목', '금', '토', '일'])
    expect(weekdayHeaders(0)).toEqual(['일', '월', '화', '수', '목', '금', '토'])
    expect(weekdayHeaders()).toEqual(weekdayHeaders(1))
  })
  it('weekdayName: 날짜의 실제 요일', () => {
    expect(weekdayName(new Date(2024, 0, 1))).toBe('월')
    expect(weekdayName(new Date(2024, 0, 7))).toBe('일')
  })
  it('헤더 순서와 buildDateRange 날짜의 요일이 항상 일치', () => {
    for (const ws of [0, 1] as const) {
      const r = buildDateRange('week', new Date(2026, 10, 12), ws)
      expect(r.dates.map(weekdayName)).toEqual(weekdayHeaders(ws))
      const m = buildDateRange('month', new Date(2026, 10, 12), ws)
      expect(m.dates.slice(0, 7).map(weekdayName)).toEqual(weekdayHeaders(ws))
    }
  })
})

describe('주 시작 요일 라벨·정규화', () => {
  it('weekLabel: 일요일 시작이면 그 주 일요일 기준', () => {
    // 2024-01-03(수) → 일요일 시작 주는 2023-12-31 시작 → 12월 5주차
    expect(weekLabel(new Date(2024, 0, 3), 0)).toBe('12월 5주차')
    expect(viewLabel('week', new Date(2024, 0, 3), 0)).toBe('12월 5주차')
    // 월요일 시작은 기존과 동일
    expect(viewLabel('week', new Date(2024, 0, 3))).toBe('1월 1주차')
  })
  it('normalizeWeekStart: 0만 일요일, 그 외(undefined·null·이상값)는 월요일', () => {
    expect(normalizeWeekStart(0)).toBe(0)
    expect(normalizeWeekStart(1)).toBe(1)
    expect(normalizeWeekStart(undefined)).toBe(1)
    expect(normalizeWeekStart(null)).toBe(1)
    expect(normalizeWeekStart(3)).toBe(1)
    expect(normalizeWeekStart('0')).toBe(1)
  })
})
