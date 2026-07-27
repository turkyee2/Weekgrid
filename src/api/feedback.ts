import { supabase } from '../lib/supabase'
import type { Feedback } from './types'

// 경량 피드백 API (태스크 37, 요구사항 17-2)
// 사용자가 남긴 문의/의견을 feedback 테이블에 저장한다.
// 조회는 본인 것만(RLS) 기본이며, 관리자 UID(app.admin_uid, backlog 1.2)는 전체를 볼 수 있다.

/** 피드백 저장 */
export async function createFeedback(message: string): Promise<void> {
  const { error } = await supabase.from('feedback').insert({ message })
  if (error) throw error
}

/** 피드백 전체 목록(최신순). RLS상 관리자가 아니면 본인 것만 반환된다. */
export async function listFeedback(): Promise<Feedback[]> {
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
