import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import MatrixPage from './pages/MatrixPage'
import NotesPage from './pages/NotesPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<MatrixPage />} />
      <Route path="/notes" element={<NotesPage />} />
      {/* 정의되지 않은 경로는 매트릭스로 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
