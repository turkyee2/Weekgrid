import type { ViewMode } from '../lib/date'

// 주/월 이동 + 뷰 토글 헤더 (태스크 12 + 태스크 19)
//
// D-day 배너는 원래 이 줄 위에 가로 한 줄을 통째로 차지하고 있었는데,
// 화면을 너무 먹는다는 피드백으로 이 줄의 남는 공간에 인라인으로 넣었다
// (backlog 8.1). "상시 보인다"는 원래 의도는 그대로 지키면서 줄 하나를 아낀다.
// 좁아지면 flex-wrap 으로 자기 줄에 내려가고, 그 안에서 가로 스크롤된다.

interface Props {
  label: string
  viewMode: ViewMode
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onSetView: (mode: ViewMode) => void
  /** 날짜 라벨과 뷰 토글 사이에 들어가는 슬롯 (D-day 배너) */
  children?: React.ReactNode
}

export default function ViewHeader({
  label,
  viewMode,
  onPrev,
  onNext,
  onToday,
  onSetView,
  children,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex items-center rounded-md border border-slate-200">
        <button
          type="button"
          onClick={onPrev}
          aria-label="이전"
          className="px-2 py-1 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={onToday}
          className="border-x border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-800"
        >
          오늘
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label="다음"
          className="px-2 py-1 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
        >
          ›
        </button>
      </div>

      <span className="shrink-0 text-base font-medium text-slate-800">
        {label}
      </span>

      {/* D-day 배너 슬롯.
          넓은 화면: 이 줄의 남는 공간에 인라인(줄 하나를 아낀다).
          좁은 화면: basis-full 로 자기 줄을 통째로 쓴다. 인라인으로 두면 날짜
          라벨·뷰 토글과 남는 폭을 나눠 가져 글자를 읽을 수 없다(실기기 확인).
          order-last 를 같이 주는 이유 — 이게 없으면 배너가 먼저 줄을 차지해
          뷰 토글이 세 번째 줄로 밀려난다. */}
      {children && (
        <div className="order-last min-w-0 basis-full md:order-none md:flex-1 md:basis-auto">
          {children}
        </div>
      )}

      {/* 주간/월간 토글 */}
      <div className="ml-auto flex shrink-0 items-center rounded-md border border-slate-200 p-0.5 text-sm">
        {(['week', 'month'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onSetView(m)}
            className={`rounded px-3 py-1 ${
              viewMode === m
                ? 'bg-indigo-600 text-white'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {m === 'week' ? '주간' : '월간'}
          </button>
        ))}
      </div>
    </div>
  )
}
