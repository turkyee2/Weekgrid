import { supabase } from '../lib/supabase'
import { DEFAULT_CATEGORY_COLOR } from '../lib/colors'
import type { Category } from './types'

// 카테고리 API (태스크 9)
// owner_id 는 DB에서 default auth.uid() 로 채워지므로 insert 시 보내지 않는다.
// RLS 가 본인 행만 반환/변경하도록 강제하므로 owner_id 필터를 클라이언트에서 붙이지 않는다.

/** 정렬 순서대로 카테고리 목록 */
export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

/**
 * 신규 사용자를 위해 기본 카테고리("할일")를 보장한다 (태스크 26, 요구사항 15-2).
 * 이미 카테고리가 하나라도 있으면 아무것도 하지 않는다.
 * @returns 새로 생성했으면 true
 */
export async function ensureDefaultCategory(): Promise<boolean> {
  const existing = await listCategories()
  if (existing.length > 0) return false
  await createCategory({ name: '할일', color: DEFAULT_CATEGORY_COLOR, sort_order: 0 })
  return true
}

/** 새 카테고리 추가 */
export async function createCategory(input: {
  name: string
  color: string
  sort_order: number
}): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert(input)
    .select('*')
    .single()
  if (error) throw error
  return data
}

/** 카테고리 삭제 (items 는 FK ON DELETE CASCADE 로 함께 삭제됨) */
export async function removeCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}

/** 이름/색상 수정 */
export async function updateCategory(
  id: string,
  patch: Partial<Pick<Category, 'name' | 'color'>>,
): Promise<void> {
  const { error } = await supabase.from('categories').update(patch).eq('id', id)
  if (error) throw error
}

/**
 * 순서 변경: (id, sort_order) 목록을 받아 각 행의 sort_order 를 갱신.
 * 개인용 규모라 순차 업데이트로 충분하다.
 */
export async function reorderCategories(
  order: { id: string; sort_order: number }[],
): Promise<void> {
  for (const { id, sort_order } of order) {
    const { error } = await supabase
      .from('categories')
      .update({ sort_order })
      .eq('id', id)
    if (error) throw error
  }
}
