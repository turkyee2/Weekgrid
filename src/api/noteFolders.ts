import { supabase } from '../lib/supabase'
import type { NoteFolder } from './types'

// 낙서장 폴더 API (backlog 2.4)
// 지금은 평평한 목록만 지원 — parent_id는 항상 null로만 다룬다.

/** 폴더 목록 (보관함 포함, sort_order 오름차순) */
export async function listNoteFolders(): Promise<NoteFolder[]> {
  const { data, error } = await supabase
    .from('note_folders')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** 새 폴더 생성 */
export async function createNoteFolder(name: string): Promise<NoteFolder> {
  const { data, error } = await supabase
    .from('note_folders')
    .insert({ name })
    .select('*')
    .single()
  if (error) throw error
  return data
}

/** 폴더 이름 변경 (backlog 9.4) */
export async function renameNoteFolder(
  id: string,
  name: string,
): Promise<NoteFolder> {
  const { data, error } = await supabase
    .from('note_folders')
    .update({ name })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

/** 폴더 삭제. 소속 메모는 지우지 않고 folder_id만 해제한다. */
export async function removeNoteFolder(id: string): Promise<void> {
  const { error: unlinkError } = await supabase
    .from('notes')
    .update({ folder_id: null })
    .eq('folder_id', id)
  if (unlinkError) throw unlinkError
  const { error } = await supabase.from('note_folders').delete().eq('id', id)
  if (error) throw error
}

/** 사용자의 보관함 폴더를 반환, 없으면 생성(지연 생성) */
export async function ensureArchiveFolder(): Promise<NoteFolder> {
  const { data: existing, error: selErr } = await supabase
    .from('note_folders')
    .select('*')
    .eq('is_archive', true)
    .maybeSingle()
  if (selErr) throw selErr
  if (existing) return existing
  const { data, error } = await supabase
    .from('note_folders')
    .insert({ name: '보관함', is_archive: true })
    .select('*')
    .single()
  if (error) throw error
  return data
}
