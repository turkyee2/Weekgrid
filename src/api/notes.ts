import { supabase } from '../lib/supabase'
import type { Note } from './types'

// 낙서장 API (태스크 21)
// owner_id 는 DB default auth.uid() 로 채워지고 RLS 가 본인 행만 다루도록 강제한다.

/** 최근 수정순 메모 목록 */
export async function listNotes(): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** 새 메모 생성 */
export async function createNote(input: {
  title: string
  body: string
}): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .insert({ ...input, updated_at: new Date().toISOString() })
    .select('*')
    .single()
  if (error) throw error
  return data
}

/** 제목/본문 수정 (updated_at 갱신) */
export async function updateNote(
  id: string,
  patch: Partial<Pick<Note, 'title' | 'body'>>,
): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .update({ ...patch, updated_at: new Date().toISOString() })
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
