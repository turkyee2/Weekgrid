// 주/월 이동 헤더 (태스크 12 · design 3.7)
// 라벨 + 이전/다음/오늘 이동. 주간/월간 토글은 태스크 19에서 추가.

interface Props {
  label: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}

export default function ViewHeader({ label, onPrev, onNext, onToday }: Props) {
  return (
    <div className="flex items-center gap-2">
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
    </div>
  )
}
