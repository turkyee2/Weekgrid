import { supabase } from '../lib/supabase'
import { DEFAULT_SETTINGS, type UserSettings } from './types'

// 사용자 설정 API (태스크 9)
// user_settings 는 사용자당 1행(owner_id PK). 행이 없을 수 있으므로 get 은 기본값으로 대체한다.

/** 설정 조회 (행이 없으면 기본값 반환) */
export async function getSettings(): Promise<
  Pick<UserSettings, 'day_rollover_hour' | 'default_view'>
> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('day_rollover_hour, default_view')
    .maybeSingle()
  if (error) throw error
  return data ?? DEFAULT_SETTINGS
}

/**
 * 설정 저장(upsert). owner_id 는 default auth.uid() 로 채워지므로,
 * 최초 저장 시에도 owner_id 없이 upsert 가능하다.
 */
export async function upsertSettings(
  patch: Partial<Pick<UserSettings, 'day_rollover_hour' | 'default_view'>>,
): Promise<void> {
  const { error } = await supabase
    .from('user_settings')
    .upsert(
      { ...patch, updated_at: new Date().toISOString() },
      { onConflict: 'owner_id' },
    )
  if (error) throw error
}
