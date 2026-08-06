import { supabase } from '../lib/supabase'
import type { Note } from './types'

// 낙서장 API (태스크 21)
// owner_id 는 DB default auth.uid() 로 채워지고 RLS 가 본인 행만 다루도록 강제한다.

/** 최근 수정순 메모 목록 (독립 메모만 — 항목 연결 메모는 제외, 요구사항 14-3) */
export async function listNotes(): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .is('item_id', null)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** 특정 항목에 연결된 메모 조회 (없으면 null, 요구사항 14-1) */
export async function getNoteByItem(itemId: string): Promise<Note | null> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('item_id', itemId)
    .maybeSingle()
  if (error) throw error
  return data ?? null
}

/** 항목 연결 메모를 지연 생성 (사용자가 작성 시작할 때만 호출, 요구사항 14-2) */
export async function createNoteForItem(itemId: string): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .insert({ item_id: itemId, title: '', body: '' })
    .select('*')
    .single()
  if (error) throw error
  return data
}

/** 새 메모 생성 */
export async function createNote(input: {
  title: string
  body: string
}): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .insert(input)
    .select('*')
    .single()
  if (error) throw error
  return data
}

/** 제목/본문 수정. updated_at 은 DB 트리거가 갱신. */
export async function updateNote(
  id: string,
  patch: Partial<Pick<Note, 'title' | 'body' | 'hide_preview' | 'pinned'>>,
): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

/** 메모 삭제 */
export async function removeNote(id: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', id)
  if (error) throw error
}
