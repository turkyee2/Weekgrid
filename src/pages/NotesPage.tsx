import { Link } from 'react-router-dom'

// 낙서장 화면 (골격) — CRUD는 태스크 21에서 구현
export default function NotesPage() {
  return (
    <div className="min-h-full bg-white">
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-800">낙서장</h1>
        <nav className="flex gap-4 text-sm text-slate-500">
          <Link className="hover:text-slate-800" to="/">
            매트릭스
          </Link>
        </nav>
      </header>
      <main className="px-6 py-8">
        <p className="text-sm text-slate-400">낙서장 (구현 예정)</p>
      </main>
    </div>
  )
}
