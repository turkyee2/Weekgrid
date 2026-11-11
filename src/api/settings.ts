import { supabase } from '../lib/supabase'
import { normalizeWeekStart } from '../lib/date'
import { DEFAULT_SETTINGS, type EditableSettings } from './types'

// 사용자 설정 API (태스크 9)
// user_settings 는 사용자당 1행(owner_id PK). 행이 없을 수 있으므로 get 은 기본값으로 대체한다.

/** 설정 조회 (행이 없으면 기본값 반환) */
export async function getSettings(): Promise<EditableSettings> {
  // select('*'): 컬럼을 하나씩 나열하면 schema.sql 재실행 전(새 컬럼이 아직 없을 때)
  // 조회 자체가 실패해 다른 설정까지 전부 기본값으로 돌아간다. 전체를 받고
  // 없는 값은 아래 정규화에서 기본값으로 채운다.
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .maybeSingle()
  if (error) throw error
  return normalizeSettings(data)
}

/** DB 행(또는 null) → 앱 설정. 없거나 비정상인 필드는 기본값으로 */
export function normalizeSettings(
  row: Partial<Record<keyof EditableSettings, unknown>> | null,
): EditableSettings {
  if (!row) return DEFAULT_SETTINGS
  const rollover = row.day_rollover_hour
  return {
    day_rollover_hour:
      typeof rollover === 'number' && rollover >= 0 && rollover <= 23
        ? rollover
        : DEFAULT_SETTINGS.day_rollover_hour,
    default_view: row.default_view === 'month' ? 'month' : 'week',
    // 컬럼이 아직 없거나 null 인 경우(스키마 재실행 전)에도 배열로 정규화
    month_category_filter: Array.isArray(row.month_category_filter)
      ? (row.month_category_filter as string[])
      : [],
    week_start: normalizeWeekStart(row.week_start),
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
