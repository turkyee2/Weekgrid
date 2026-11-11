// 날짜 유틸 (태스크 8, design.md 3.2 · 3.3 · 3.8)
//
// 타임존 원칙: 날짜는 항상 로컬 기준 'YYYY-MM-DD' 문자열로 다룬다.
//   new Date('2026-07-20')는 UTC로 해석돼 하루 밀릴 수 있으므로 절대 쓰지 않는다.
//   문자열↔Date 변환은 아래 formatDate / parseDate 만 사용한다.

/**
 * 주 시작 요일 (JS getDay() 기준: 0 = 일요일, 1 = 월요일).
 * 사용자 설정 `user_settings.week_start` 로 고른다. 기본은 월요일.
 */
export type WeekStart = 0 | 1
export const DEFAULT_WEEK_START: WeekStart = 1

/** getDay() 순서(일~토)의 요일 이름 */
const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'] as const

/** 그 날짜의 요일 한 글자 ('월', '화', …) */
export function weekdayName(d: Date): string {
  return WEEKDAY_NAMES[d.getDay()]
}

/** 주 시작 요일부터 7개의 요일 헤더 (월요일 시작: 월~일, 일요일 시작: 일~토) */
export function weekdayHeaders(weekStart: WeekStart = DEFAULT_WEEK_START): string[] {
  return Array.from({ length: 7 }, (_, i) => WEEKDAY_NAMES[(weekStart + i) % 7])
}

/** 알 수 없는 값(스키마 재실행 전 undefined 등)을 안전한 주 시작 요일로 */
export function normalizeWeekStart(v: unknown): WeekStart {
  return v === 0 ? 0 : 1
}

export type ViewMode = 'week' | 'month'

export interface DateRange {
  /** 화면에 그릴 첫 날짜(주 시작 요일) */
  start: Date
  /** 화면에 그릴 마지막 날짜(주 시작 요일 + 6일) */
  end: Date
  /** start~end 를 하루 단위로 펼친 배열 */
  dates: Date[]
  /** month 모드에서만: 해당 달 1일 (이웃 달 구분용) */
  monthStart?: Date
  /** month 모드에서만: 해당 달 말일 */
  monthEnd?: Date
}

/** Date → 'YYYY-MM-DD' (로컬 기준) */
export function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 'YYYY-MM-DD' → Date (로컬 자정). UTC 파싱으로 인한 하루 밀림을 피한다. */
export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** n일 이동한 새 Date (음수 가능). 날짜 성분으로 만들어 DST 영향 없음. */
export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

/** n개월 이동. 대상 달에 그 일자가 없으면 말일로 맞춘다(1/31 +1개월 → 2/28). */
export function addMonths(d: Date, n: number): Date {
  const first = new Date(d.getFullYear(), d.getMonth() + n, 1)
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  first.setDate(Math.min(d.getDate(), lastDay))
  return first
}

/** d가 속한 주의 시작일(주 시작 요일)을 반환 */
export function startOfWeek(d: Date, weekStart: WeekStart = DEFAULT_WEEK_START): Date {
  const diff = (d.getDay() - weekStart + 7) % 7
  return addDays(d, -diff)
}

/** start~end(둘 다 포함)를 하루 단위 Date 배열로 */
function eachDay(start: Date, end: Date): Date[] {
  const out: Date[] = []
  let cur = start
  while (cur.getTime() <= end.getTime()) {
    out.push(cur)
    cur = addDays(cur, 1)
  }
  return out
}

/**
 * 뷰 모드 + 기준일 → 화면에 그릴 날짜 범위.
 * - week: 그 주 시작 요일부터 7일
 * - month: 그 달을 덮는 달력 그리드(주 시작 요일부터, 이웃 달 며칠 포함, 항상 7의 배수 35/42일)
 */
export function buildDateRange(
  mode: ViewMode,
  anchor: Date,
  weekStart: WeekStart = DEFAULT_WEEK_START,
): DateRange {
  if (mode === 'week') {
    const start = startOfWeek(anchor, weekStart)
    const end = addDays(start, 6)
    return { start, end, dates: eachDay(start, end) }
  }
  // month
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
  const start = startOfWeek(monthStart, weekStart)
  const end = addDays(startOfWeek(monthEnd, weekStart), 6)
  return { start, end, dates: eachDay(start, end), monthStart, monthEnd }
}

/**
 * 논리적 오늘 (하루 경계 시각 반영, design 3.2 / 백준식).
 * 경계 시각 H 이전이면 전날로 판정한다.
 * @param now 현재 시각
 * @param rolloverHour 0~23
 * @returns 'YYYY-MM-DD'
 */
export function logicalToday(now: Date, rolloverHour: number): string {
  const shifted = new Date(now.getTime() - rolloverHour * 3600_000)
  return formatDate(shifted)
}

/** 'N월 M주차' — 그 주의 시작일이 그 달의 몇 번째 주인지로 정의 */
export function weekLabel(anchor: Date, weekStart: WeekStart = DEFAULT_WEEK_START): string {
  const first = startOfWeek(anchor, weekStart)
  const month = first.getMonth() + 1
  const weekOfMonth = Math.ceil(first.getDate() / 7)
  return `${month}월 ${weekOfMonth}주차`
}

/** 'N년 M월' */
export function monthLabel(anchor: Date): string {
  return `${anchor.getFullYear()}년 ${anchor.getMonth() + 1}월`
}

/** 뷰 모드에 맞는 상단 라벨 */
export function viewLabel(
  mode: ViewMode,
  anchor: Date,
  weekStart: WeekStart = DEFAULT_WEEK_START,
): string {
  return mode === 'week' ? weekLabel(anchor, weekStart) : monthLabel(anchor)
}

/** 'YYYY-MM-DD' 기준일까지 남은/지난 일수 배지. target === today → 'D-day' */
export function dDayLabel(target: string, today: string): string {
  const days = Math.round(
    (parseDate(target).getTime() - parseDate(today).getTime()) / 86_400_000,
  )
  if (days === 0) return 'D-day'
  return days > 0 ? `D-${days}` : `D+${-days}`
}
