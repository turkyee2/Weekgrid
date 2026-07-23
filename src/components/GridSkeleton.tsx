// 격자 로딩 스켈레톤 (태스크 24, design 8.5)
// 전체 스피너 대신 격자 모양의 회색 블록으로 레이아웃 흔들림을 줄인다.

interface Props {
  /** 행(카테고리) 수 */
  rows?: number
  /** 열(날짜) 수 */
  cols?: number
}

export default function GridSkeleton({ rows = 4, cols = 7 }: Props) {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-md border border-slate-200"
    >
      {/* 헤더 행 */}
      <div
        className="grid border-b border-slate-200 bg-slate-50"
        style={{ gridTemplateColumns: `7rem repeat(${cols}, 1fr)` }}
      >
        <div className="px-3 py-2">
          <div className="h-3 w-12 animate-pulse rounded bg-slate-200" />
        </div>
        {Array.from({ length: cols }, (_, i) => (
          <div key={i} className="border-l border-slate-200 px-2 py-2">
            <div className="mx-auto h-3 w-6 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>

      {/* 본문 행 */}
      {Array.from({ length: rows }, (_, r) => (
        <div
          key={r}
          className="grid border-b border-slate-200 last:border-b-0"
          style={{ gridTemplateColumns: `7rem repeat(${cols}, 1fr)` }}
        >
          <div className="bg-slate-50 px-3 py-3">
            <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
          </div>
          {Array.from({ length: cols }, (_, c) => (
            <div key={c} className="border-l border-slate-200 px-2 py-3">
              <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
