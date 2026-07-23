// 카테고리 색 프리셋 (design.md 8.2 — 8색)
// 항목 앞 색 점(dot)/좌측 색 바에만 쓰고, 셀 배경 전체는 칠하지 않는다.
// HEX 값은 Tailwind 500 계열과 맞췄다. categories.color 컬럼에 이 값이 저장된다.

export interface CategoryColor {
  /** 사람이 읽는 이름 */
  name: string
  /** DB에 저장되는 HEX 값 */
  hex: string
}

export const CATEGORY_COLORS: CategoryColor[] = [
  { name: '슬레이트', hex: '#64748b' }, // slate-500
  { name: '레드', hex: '#ef4444' }, // red-500
  { name: '앰버', hex: '#f59e0b' }, // amber-500
  { name: '그린', hex: '#22c55e' }, // green-500
  { name: '틸', hex: '#14b8a6' }, // teal-500
  { name: '블루', hex: '#3b82f6' }, // blue-500
  { name: '바이올렛', hex: '#8b5cf6' }, // violet-500
  { name: '핑크', hex: '#ec4899' }, // pink-500
]

/** 새 카테고리 기본 색 (design 스키마 default '#94a3b8'과 동일 계열) */
export const DEFAULT_CATEGORY_COLOR = CATEGORY_COLORS[0].hex

/** 프리셋에 없는 색이 들어와도 안전하게 표시하기 위한 헥스 목록 */
export const CATEGORY_COLOR_HEXES = CATEGORY_COLORS.map((c) => c.hex)

// ── 항목 중요도(accent) 색 — 텍스트 색으로만 표현 (피드백 #3) ──
// items.accent 에 key('red'|'amber'|'blue')를 저장. null 이면 기본색.
export interface AccentColor {
  key: string
  label: string
  hex: string
}

export const ACCENT_COLORS: AccentColor[] = [
  { key: 'red', label: '빨강', hex: '#dc2626' }, // red-600 (중요)
  { key: 'amber', label: '앰버', hex: '#d97706' }, // amber-600 (주의)
  { key: 'blue', label: '파랑', hex: '#2563eb' }, // blue-600 (정보)
]

/** accent key → 텍스트 색 HEX (없거나 미지정이면 undefined) */
export function accentHex(accent: string | null | undefined): string | undefined {
  if (!accent) return undefined
  return ACCENT_COLORS.find((a) => a.key === accent)?.hex
}
