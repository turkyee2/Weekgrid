// 날짜 유틸 (태스크 8, design.md 3.2 · 3.3 · 3.8)
//
// 타임존 원칙: 날짜는 항상 로컬 기준 'YYYY-MM-DD' 문자열로 다룬다.
//   new Date('2026-07-20')는 UTC로 해석돼 하루 밀릴 수 있으므로 절대 쓰지 않는다.
//   문자열↔Date 변환은 아래 formatDate / parseDate 만 사용한다.

/** 주 시작 요일: 1 = 월요일 (JS getDay(): 0=일 … 6=토) */
export const WEEK_START = 1

export type ViewMode = 'week' | 'month'

export interface DateRange {
  /** 화면에 그릴 첫 날짜(월요일) */
  start: Date
  /** 화면에 그릴 마지막 날짜(일요일) */
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

/** d가 속한 주의 시작일(월요일)을 반환 */
export function startOfWeek(d: Date): Date {
  const diff = (d.getDay() - WEEK_START + 7) % 7
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
 * - week: 그 주 월요일~일요일 (7일)
 * - month: 그 달을 덮는 달력 그리드(월요일 시작, 이웃 달 며칠 포함, 항상 7의 배수 35/42일)
 */
export function buildDateRange(mode: ViewMode, anchor: Date): DateRange {
  if (mode === 'week') {
    const start = startOfWeek(anchor)
    const end = addDays(start, 6)
    return { start, end, dates: eachDay(start, end) }
  }
  // month
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
  const start = startOfWeek(monthStart)
  const end = addDays(startOfWeek(monthEnd), 6)
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

/** 'N월 M주차' — 그 주 월요일이 그 달의 몇 번째 주인지로 정의 */
export function weekLabel(anchor: Date): string {
  const monday = startOfWeek(anchor)
  const month = monday.getMonth() + 1
  const weekOfMonth = Math.ceil(monday.getDate() / 7)
  return `${month}월 ${weekOfMonth}주차`
}

/** 'N년 M월' */
export function monthLabel(anchor: Date): string {
  return `${anchor.getFullYear()}년 ${anchor.getMonth() + 1}월`
}

/** 뷰 모드에 맞는 상단 라벨 */
export function viewLabel(mode: ViewMode, anchor: Date): string {
  return mode === 'week' ? weekLabel(anchor) : monthLabel(anchor)
}

/** 'YYYY-MM-DD' 기준일까지 남은/지난 일수 배지. target === today → 'D-day' */
export function dDayLabel(target: string, today: string): string {
  const days = Math.round(
    (parseDate(target).getTime() - parseDate(today).getTime()) / 86_400_000,
  )
  if (days === 0) return 'D-day'
  return days > 0 ? `D-${days}` : `D+${-days}`
}
