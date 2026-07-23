// DB 행 타입 (태스크 9)
// schema.sql 의 테이블과 1:1 대응. 나중에 `supabase gen types typescript` 로
// 자동 생성 타입으로 교체할 수 있으나, 지금은 수동 정의로 충분하다.

export interface Category {
  id: string
  owner_id: string
  name: string
  color: string
  sort_order: number
  created_at: string
}

export interface Item {
  id: string
  owner_id: string
  category_id: string
  date: string // 'YYYY-MM-DD'
  content: string
  sort_order: number
  done: boolean
  /** 선택적 시작 시각 'HH:MM'(또는 'HH:MM:SS'). 정렬/표시용, null 허용 (v2 요구사항 12) */
  start_time: string | null
  /** 참가자 이름 태그(자유 텍스트). 계정/공유 아님 (v2 요구사항 13) */
  participants: string[]
  created_at: string
  updated_at: string
}

export interface Note {
  id: string
  owner_id: string
  title: string
  body: string
  updated_at: string
}

export interface UserSettings {
  owner_id: string
  day_rollover_hour: number // 0~23
  default_view: 'week' | 'month'
  updated_at: string
}

/** user_settings 행이 아직 없을 때 사용할 기본값 */
export const DEFAULT_SETTINGS: Pick<
  UserSettings,
  'day_rollover_hour' | 'default_view'
> = {
  day_rollover_hour: 0,
  default_view: 'week',
}
