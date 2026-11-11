import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/useAuth'
import { useApplyTheme } from './lib/theme'
import InstallPrompt from './components/InstallPrompt'
import LoginPage from './pages/LoginPage'
import MatrixPage from './pages/MatrixPage'
import NotesPage from './pages/NotesPage'

function App() {
  const { session, loading } = useAuth()
  // 다크 모드 적용 + 'system' 일 때 OS 전환 추적 (로그인 화면 포함 전 화면)
  useApplyTheme()

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
  // 설치 배너는 로그인 후에만 — 처음 들어와 로그인도 안 한 사람에게 설치부터
  // 권하는 건 이르다.
  return (
    <>
      <Routes>
        <Route path="/" element={<MatrixPage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <InstallPrompt />
    </>
  )
}

export default App
