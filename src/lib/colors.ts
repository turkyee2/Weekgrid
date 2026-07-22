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
