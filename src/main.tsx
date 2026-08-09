import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

// 서비스 워커 등록 (backlog 8.5). immediate: 새 버전을 감지하면 묻지 않고
// 곧바로 받아 적용한다 — 혼자 쓰는 개인 도구라 "새 버전 있음" 안내를 거칠
// 이유가 적고, 배포했는데 폰에서만 옛날 화면이 남는 일을 막는다.
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
