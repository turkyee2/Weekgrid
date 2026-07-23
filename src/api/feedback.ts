import { supabase } from '../lib/supabase'

// 경량 피드백 API (태스크 37, 요구사항 17-2)
// 사용자가 남긴 문의/의견을 feedback 테이블에 저장한다(운영자는 대시보드에서 확인).

/** 피드백 저장 */
export async function createFeedback(message: string): Promise<void> {
  const { error } = await supabase.from('feedback').insert({ message })
  if (error) throw error
}
