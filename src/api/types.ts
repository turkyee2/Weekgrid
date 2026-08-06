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
  /** 중요도 강조 색 key ('red'|'amber'|'blue') 또는 null=기본 (피드백 #3) */
  accent: string | null
  /** D-day 표시 여부. true면 매트릭스에서 이 항목의 date를 기준일로 D-N 배지 표시 */
  show_dday: boolean
  created_at: string
  updated_at: string
}

/** 항목에 종속된 세부 체크리스트 한 줄 (v2 요구사항 11) */
export interface Subtask {
  id: string
  owner_id: string
  item_id: string
  content: string
  done: boolean
  sort_order: number
  created_at: string
}

export interface Note {
  id: string
  owner_id: string
  /** 연결된 항목 id. null이면 독립(낙서장) 메모 (v2 요구사항 14) */
  item_id: string | null
  title: string
  body: string
  /** true면 목록 미리보기에 본문 대신 자물쇠 표시(UI 상 가리기, 암호화 아님) */
  hide_preview: boolean
  /** true면 목록 상단에 고정 */
  pinned: boolean
  updated_at: string
}

export interface Feedback {
  id: string
  owner_id: string
  message: string
  created_at: string
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
