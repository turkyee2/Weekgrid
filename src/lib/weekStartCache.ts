import { DEFAULT_WEEK_START, normalizeWeekStart, type WeekStart } from './date'

// 주 시작 요일의 기기 캐시 (backlog 7-A).
// 진짜 값은 user_settings.week_start(DB)다. 여기 두는 건 "설정을 불러오기 전
// 첫 화면"을 맞추기 위한 사본일 뿐 — 조회가 끝나면 DB 값으로 덮어쓴다.

const KEY = 'weekgrid.weekStart'

export function readCachedWeekStart(): WeekStart {
  try {
    const v = localStorage.getItem(KEY)
    return v === null ? DEFAULT_WEEK_START : normalizeWeekStart(Number(v))
  } catch {
    return DEFAULT_WEEK_START
  }
}

export function writeCachedWeekStart(ws: WeekStart): void {
  try {
    localStorage.setItem(KEY, String(ws))
  } catch {
    /* 캐시 실패는 무시 — 다음 로딩 때 한 번 더 조회할 뿐 */
  }
}
