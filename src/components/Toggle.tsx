// 켬/끔 토글 스위치 (backlog 8.1 — "토글 UI가 켜짐/꺼짐 구분이 약하다" 피드백)
//
// 상태 구분은 통상적인 스위치 관습 그대로 두 가지로 한다:
//   1) 손잡이 위치 — 꺼짐=왼쪽, 켜짐=오른쪽
//   2) 트랙 색 + 꺼짐 상태의 또렷한 테두리(회색 배경만으로는 약해서)
//
// 손잡이는 absolute + translate 픽셀 계산 대신 flex 정렬로 옮긴다.
// (이전 구현은 absolute 인데 left 를 안 줘서 정적 위치 — 버튼의 기본
//  text-align:center — 에서 시작했고, 거기에 translate-x 가 더해지는 바람에
//  꺼짐이 오른쪽에 놓이고 켜짐은 트랙 밖으로 나갔다.)
// 트랙 안쪽 여백은 p-0.5(2px), 손잡이는 트랙 안쪽 높이에 딱 맞춘다.

interface Props {
  checked: boolean
  onChange: (next: boolean) => void
  /** 스크린리더용 이름. 보통 옆의 라벨 텍스트를 그대로 넘긴다 */
  label: string
  size?: 'sm' | 'md'
  /** 켜졌을 때 트랙 색 (Tailwind 클래스). 기본 남색 */
  onColor?: string
}

export default function Toggle({
  checked,
  onChange,
  label,
  size = 'md',
  onColor = 'bg-indigo-600',
}: Props) {
  const md = size === 'md'
  // 트랙 높이 - 여백(2px×2) - 테두리(1px×2) = 손잡이 지름
  // md: 24 - 4 - 2 = 18 / sm: 20 - 4 - 2 = 14
  const track = md ? 'h-6 w-11' : 'h-5 w-9'
  const knob = md ? 'size-[18px]' : 'size-3.5'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`flex shrink-0 items-center rounded-full border p-0.5 transition-colors ${track} ${
        checked
          ? `justify-end border-transparent ${onColor}`
          : 'justify-start border-slate-400 bg-slate-100'
      }`}
    >
      <span
        className={`rounded-full bg-white ${knob} ${
          checked ? 'shadow-sm' : 'border border-slate-400'
        }`}
      />
    </button>
  )
}
