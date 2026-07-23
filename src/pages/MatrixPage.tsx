import { Link } from 'react-router-dom'
import LogoutButton from '../components/LogoutButton'

// 매트릭스 화면 (골격) — 주간 매트릭스/월간 달력은 태스크 10~19에서 구현
export default function MatrixPage() {
  return (
    <div className="min-h-full bg-white">
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-800">주간 플래너</h1>
        <nav className="flex items-center gap-4 text-sm text-slate-500">
          <Link className="hover:text-slate-800" to="/notes">
            낙서장
          </Link>
          <LogoutButton />
        </nav>
      </header>
      <main className="px-6 py-8">
        <p className="text-sm text-slate-400">매트릭스 (구현 예정)</p>
      </main>
    </div>
  )
}
