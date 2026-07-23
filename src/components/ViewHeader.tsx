import type { ViewMode } from '../lib/date'

// 주/월 이동 + 뷰 토글 헤더 (태스크 12 + 태스크 19)

interface Props {
  label: string
  viewMode: ViewMode
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onSetView: (mode: ViewMode) => void
}

export default function ViewHeader({
  label,
  viewMode,
  onPrev,
  onNext,
  onToday,
  onSetView,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
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

      <span className="text-base font-medium text-slate-800">{label}</span>

      {/* 주간/월간 토글 */}
      <div className="ml-auto flex items-center rounded-md border border-slate-200 p-0.5 text-sm">
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
