import { supabase } from '../lib/supabase'
import { DEFAULT_SETTINGS, type EditableSettings } from './types'

// 사용자 설정 API (태스크 9)
// user_settings 는 사용자당 1행(owner_id PK). 행이 없을 수 있으므로 get 은 기본값으로 대체한다.

/** 설정 조회 (행이 없으면 기본값 반환) */
export async function getSettings(): Promise<EditableSettings> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('day_rollover_hour, default_view, month_category_filter')
    .maybeSingle()
  if (error) throw error
  if (!data) return DEFAULT_SETTINGS
  return {
    ...data,
    // 컬럼이 아직 없거나 null 인 경우(스키마 재실행 전)에도 배열로 정규화
    month_category_filter: data.month_category_filter ?? [],
  }
}

/**
 * 설정 저장(upsert). owner_id 는 default auth.uid() 로 채워지므로,
 * 최초 저장 시에도 owner_id 없이 upsert 가능하다.
 * patch 에 담긴 컬럼만 갱신되고 나머지는 그대로 유지된다.
 */
export async function upsertSettings(
  patch: Partial<EditableSettings>,
): Promise<void> {
  const { error } = await supabase
    .from('user_settings')
    .upsert(
      { ...patch, updated_at: new Date().toISOString() },
      { onConflict: 'owner_id' },
    )
  if (error) throw error
}
