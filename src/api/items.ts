import { supabase } from '../lib/supabase'
import type { Item } from './types'

// 항목 API (태스크 9)
// date 는 'YYYY-MM-DD' 문자열. 조회는 화면에 보이는 날짜 범위 [start, end] 로 한정한다.

/** start~end(둘 다 포함) 범위의 항목 조회 */
export async function listItemsByRange(
  start: string,
  end: string,
): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .gte('date', start)
    .lte('date', end)
    .order('start_time', { ascending: true, nullsFirst: false })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** beforeDate 이전 날짜의 미완료 항목 (헤더 배지, backlog 1.2). 날짜 오름차순. */
export async function listOverdueItems(beforeDate: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .lt('date', beforeDate)
    .eq('done', false)
    .order('date', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** D-day로 지정된 항목 (헤더 배너, backlog 7-B). 완료 여부와 무관 — 완료된
 * 항목도 배너에 고정(dday_pinned)했다면 계속 보여야 하므로 done으로 거르지
 * 않는다. 날짜 오름차순. */
export async function listDdayItems(): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('show_dday', true)
    .order('date', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** 사용자의 전체 항목 조회 (CSV 내보내기용, 태스크 22). 날짜 오름차순. */
export async function listAllItems(): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: false })
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** 특정 셀에 항목 추가 */
export async function createItem(input: {
  category_id: string
  date: string
  content: string
  sort_order: number
  start_time?: string | null
  participants?: string[]
}): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .insert(input)
    .select('*')
    .single()
  if (error) throw error
  return data
}

/** 항목 수정 (content/done/sort_order/date 등). updated_at 은 DB 트리거가 갱신. */
export async function updateItem(
  id: string,
  patch: Partial<
    Pick<
      Item,
      | 'content'
      | 'done'
      | 'sort_order'
      | 'date'
      | 'category_id'
      | 'start_time'
      | 'participants'
      | 'accent'
      | 'show_dday'
      | 'dday_pinned'
    >
  >,
): Promise<void> {
  const { error } = await supabase.from('items').update(patch).eq('id', id)
  if (error) throw error
}

/** 항목 삭제 */
export async function removeItem(id: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) throw error
}
