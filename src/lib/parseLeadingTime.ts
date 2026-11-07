// 입력 맨 앞 시각 자동 인식 (backlog 9.3).
//
// "20:00 저녁약속" → { start_time: '20:00', content: '저녁약속' }.
// 셀/주간 목록의 빠른 입력은 한 줄 텍스트뿐이라, 시각을 넣으려면 항목을 만든 뒤
// 상세 패널을 열어 드롭다운으로 다시 골라야 했다. 맨 앞에 쓴 시각을 그대로 받는다.
//
// 규칙(1차): 맨 앞 H:MM 또는 HH:MM + 공백 + 내용. 시 0–23, 분 00–59.
// 형식이 안 맞거나(25:00, 8시, 9:5) 시각 뒤 내용이 비면 인식하지 않고 원문 그대로 둔다
// — "잘못 인식해서 글자가 사라지는" 쪽이 "인식 안 해서 그대로 남는" 쪽보다 나쁘다.

const LEADING_TIME = /^([01]?\d|2[0-3]):([0-5]\d)\s+(\S[\s\S]*)$/

export interface ParsedEntry {
  content: string
  /** 'HH:MM' 또는 null(인식 안 함) */
  start_time: string | null
}

export function parseLeadingTime(input: string): ParsedEntry {
  const text = input.trim()
  const m = LEADING_TIME.exec(text)
  if (!m) return { content: text, start_time: null }
  const [, h, mm, rest] = m
  return { content: rest.trim(), start_time: `${h.padStart(2, '0')}:${mm}` }
}
