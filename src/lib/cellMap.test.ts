import { describe, expect, it } from 'vitest'
import { buildCellMap, cellItems, cellKey, dayItems } from './cellMap'
import type { Item } from '../api/types'

function item(partial: Partial<Item>): Item {
  return {
    id: 'x',
    owner_id: 'o',
    category_id: 'c1',
    date: '2026-07-20',
    content: '',
    sort_order: 0,
    done: false,
    start_time: null,
    participants: [],
    accent: null,
    show_dday: false,
    created_at: '2026-07-20T00:00:00Z',
    updated_at: '2026-07-20T00:00:00Z',
    ...partial,
  }
}

describe('buildCellMap', () => {
  it('같은 (카테고리, 날짜)끼리 묶는다', () => {
    const map = buildCellMap([
      item({ id: 'a', category_id: 'c1', date: '2026-07-20' }),
      item({ id: 'b', category_id: 'c1', date: '2026-07-20' }),
      item({ id: 'c', category_id: 'c2', date: '2026-07-20' }),
    ])
    expect(cellItems(map, 'c1', '2026-07-20').map((i) => i.id)).toEqual(['a', 'b'])
    expect(cellItems(map, 'c2', '2026-07-20').map((i) => i.id)).toEqual(['c'])
  })

  it('셀 안은 sort_order → created_at 순', () => {
    const map = buildCellMap([
      item({ id: 'late', sort_order: 1 }),
      item({ id: 'early', sort_order: 0 }),
      item({ id: 'tie1', sort_order: 0, created_at: '2026-07-20T09:00:00Z' }),
    ])
    // sort_order 0 두 개(early created_at 자정, tie1 09:00) → early, tie1, 그다음 late
    expect(cellItems(map, 'c1', '2026-07-20').map((i) => i.id)).toEqual([
      'early',
      'tie1',
      'late',
    ])
  })

  it('없는 셀은 빈 배열', () => {
    const map = buildCellMap([])
    expect(cellItems(map, 'c1', '2026-07-20')).toEqual([])
  })

  it('시간 있는 항목이 시각 오름차순으로 먼저, 시간 없는 항목은 뒤(sort_order)', () => {
    const map = buildCellMap([
      item({ id: 'noon', start_time: '12:00', sort_order: 5 }),
      item({ id: 'notime', start_time: null, sort_order: 0 }),
      item({ id: 'morning', start_time: '09:30', sort_order: 9 }),
    ])
    expect(cellItems(map, 'c1', '2026-07-20').map((i) => i.id)).toEqual([
      'morning',
      'noon',
      'notime',
    ])
  })

  it('cellKey 형식', () => {
    expect(cellKey('c1', '2026-07-20')).toBe('c1|2026-07-20')
  })
})

describe('dayItems', () => {
  it('한 날짜의 모든 카테고리 항목을 카테고리 순서대로 모은다', () => {
    const map = buildCellMap([
      item({ id: 'a', category_id: 'c2', date: '2026-07-20' }),
      item({ id: 'b', category_id: 'c1', date: '2026-07-20' }),
    ])
    // categoryIds 순서 [c1, c2] → b, a
    expect(dayItems(map, ['c1', 'c2'], '2026-07-20').map((i) => i.id)).toEqual([
      'b',
      'a',
    ])
  })
})
