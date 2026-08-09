import {
  defineConfig,
  minimal2023Preset,
} from '@vite-pwa/assets-generator/config'

// PWA 아이콘 생성 설정 (backlog 8.5).
//
// 재생성: npx pwa-assets-generator
// 결과물(public/*.png, favicon.ico)은 커밋해 둔다 — 평소 빌드에는 필요 없고
// 로고가 바뀔 때만 다시 돌리면 된다.
//
// @vite-pwa/assets-generator 는 vite-plugin-pwa 의 optional peer 라 따로
// 설치하지 않아도 함께 들어온다. 이 패키지가 끌고 오는 sharp 는 구버전에
// libvips CVE 가 있어 package.json 의 overrides 로 ^0.35.3 을 강제한다.
//
// 기본 프리셋은 배경을 투명하게 두는데, maskable·apple 아이콘은 OS 가 모양을
// 잘라내며 합성하므로 투명하면 런처/iOS 에서 검게 깔릴 수 있다. 매니페스트의
// background_color 와 같은 흰색을 깔아준다.
const white = '#ffffff'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: {
      ...minimal2023Preset.maskable,
      resizeOptions: {
        ...minimal2023Preset.maskable.resizeOptions,
        background: white,
      },
    },
    apple: {
      ...minimal2023Preset.apple,
      resizeOptions: {
        ...minimal2023Preset.apple.resizeOptions,
        background: white,
      },
    },
  },
  images: ['public/favicon.svg'],
})
