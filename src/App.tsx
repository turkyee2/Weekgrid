import { CATEGORY_COLORS } from './lib/colors'

function App() {
  return (
    <div className="min-h-full bg-white text-slate-800">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-lg font-semibold text-slate-800">주간 플래너</h1>
        <p className="mt-2 text-sm text-slate-400">
          Tailwind 설정 확인용 화면입니다. (라우팅은 다음 단계에서 붙입니다.)
        </p>

        <button
          type="button"
          className="mt-6 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          포인트 컬러 버튼
        </button>

        <div className="mt-8">
          <p className="text-sm text-slate-400">카테고리 색 프리셋</p>
          <ul className="mt-3 flex flex-wrap gap-3">
            {CATEGORY_COLORS.map((c) => (
              <li key={c.hex} className="flex items-center gap-2 text-sm">
                <span
                  className="inline-block size-3 rounded-full"
                  style={{ backgroundColor: c.hex }}
                />
                {c.name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default App
