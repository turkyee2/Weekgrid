import { supabase } from '../lib/supabase'
import type { Subtask } from './types'

// 서브태스크 API (태스크 29, 요구사항 11)
// 항목(item)에 종속된 세부 체크리스트. owner_id 는 DB default auth.uid(), RLS 로 격리.

/** 특정 항목의 서브태스크 목록 (정렬 순서대로) */
export async function listSubtasksByItem(itemId: string): Promise<Subtask[]> {
  const { data, error } = await supabase
    .from('subtasks')
    .select('*')
    .eq('item_id', itemId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** 여러 항목의 서브태스크를 한 번에 조회 (매트릭스 진행률 배지용) */
export async function listSubtasksByItems(
  itemIds: string[],
): Promise<Subtask[]> {
  if (itemIds.length === 0) return []
  const { data, error } = await supabase
    .from('subtasks')
    .select('*')
    .in('item_id', itemIds)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** 서브태스크 추가 */
export async function createSubtask(input: {
  item_id: string
  content: string
  sort_order: number
}): Promise<Subtask> {
  const { data, error } = await supabase
    .from('subtasks')
    .insert(input)
    .select('*')
    .single()
  if (error) throw error
  return data
}

/** 서브태스크 수정 (내용/완료/순서) */
export async function updateSubtask(
  id: string,
  patch: Partial<Pick<Subtask, 'content' | 'done' | 'sort_order'>>,
): Promise<void> {
  const { error } = await supabase.from('subtasks').update(patch).eq('id', id)
  if (error) throw error
}

/** 서브태스크 삭제 */
export async function removeSubtask(id: string): Promise<void> {
  const { error } = await supabase.from('subtasks').delete().eq('id', id)
  if (error) throw error
}

/** 순서 재작성: (id, sort_order) 목록을 순차 업데이트 (개인용 규모) */
export async function reorderSubtasks(
  order: { id: string; sort_order: number }[],
): Promise<void> {
  for (const { id, sort_order } of order) {
    const { error } = await supabase
      .from('subtasks')
      .update({ sort_order })
      .eq('id', id)
    if (error) throw error
  }
}
