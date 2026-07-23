import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/useAuth'
import LoginPage from './pages/LoginPage'
import MatrixPage from './pages/MatrixPage'
import NotesPage from './pages/NotesPage'

function App() {
  const { session, loading } = useAuth()

  // 세션 확인 중에는 잠깐 대기 (로그인 화면이 깜빡이는 것 방지)
  if (loading) {
    return (
      <div className="grid min-h-full place-items-center bg-white text-sm text-slate-400">
        불러오는 중…
      </div>
    )
  }

  // 미인증: 로그인 화면만 접근 가능, 나머지는 /login 으로
  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  // 인증됨: 앱 화면. /login 으로 오면 매트릭스로 되돌림
  return (
    <Routes>
      <Route path="/" element={<MatrixPage />} />
      <Route path="/notes" element={<NotesPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
