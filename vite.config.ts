import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA (backlog 8.5) — 설치형 + 앱 셸 오프라인.
    //
    // 오프라인 범위는 "앱 셸까지"로 정했다(backlog 8.1). 데이터는 전부
    // Supabase에 있어 오프라인이면 조회가 안 되지만, 셸이 캐시돼 있으면
    // 브라우저의 "연결 없음" 화면 대신 앱이 정상적으로 뜨고 데이터 영역만
    // 안내 문구로 대체된다. 마지막 조회 데이터까지 캐시하는 건 후속 과제.
    //
    // Supabase 요청은 교차 출처라 아래 precache/navigateFallback 규칙에
    // 애초에 걸리지 않는다 — 런타임 캐시를 따로 두지 않는 한 항상 네트워크로
    // 나가므로, 오래된 데이터가 최신인 척 보일 위험이 없다.
    VitePWA({
      registerType: 'autoUpdate',
      // apple-touch-icon 등 매니페스트에 안 들어가는 것도 같이 캐시
      includeAssets: [
        'favicon.svg',
        'favicon.ico',
        'apple-touch-icon-180x180.png',
      ],
      manifest: {
        name: '주간 플래너',
        short_name: 'Weekgrid',
        description: '카테고리 × 날짜 매트릭스 기반 개인 플래너',
        lang: 'ko',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#4f46e5', // indigo-600 — 앱 강조색과 동일
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // SPA 라우팅(/notes 등)을 오프라인에서도 열 수 있게 한다
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
