import { useEffect, useState } from 'react'

// 설치 권장 배너 (backlog 8.6 PWA 후속).
//
// 크롬 계열은 설치 가능해지면 `beforeinstallprompt` 를 쏘는데, 기본 UI 는
// 주소창 구석 아이콘이라 잘 안 보인다. 그 이벤트를 가로채 두었다가 우리 배너를
// 띄우고, 사용자가 "설치"를 누른 순간에 실제 설치 창을 연다.
// (`prompt()` 는 사용자 제스처 안에서만 호출할 수 있어서 이벤트를 보관해야 한다.)
//
// 나가지 않도록 지키는 선:
// - 이미 설치돼 실행 중이면(standalone) 아예 안 띄운다.
// - "나중에" 를 누르면 SNOOZE_DAYS 동안 안 띄운다.
// - 이벤트가 안 오는 브라우저(iOS 사파리 등)에서는 아무것도 안 띄운다.
//   설치 방법을 글로 안내하는 건 묻지도 않은 사용자에게 잔소리가 되므로 하지 않는다.

const SNOOZE_KEY = 'weekgrid:install-snoozed-at'
const SNOOZE_DAYS = 14

// beforeinstallprompt 는 표준 lib.dom 에 아직 없다
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function snoozed(): boolean {
  const at = localStorage.getItem(SNOOZE_KEY)
  if (!at) return false
  const days = (Date.now() - Number(at)) / 86_400_000
  return Number.isFinite(days) && days < SNOOZE_DAYS
}

function installed(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS 사파리 전용 플래그
    (navigator as { standalone?: boolean }).standalone === true
  )
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (installed() || snoozed()) return

    function onPrompt(e: Event) {
      // 기본 UI 를 막고 이벤트를 보관 — 우리 배너의 "설치" 버튼에서 쓴다
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    function onInstalled() {
      setDeferred(null)
      localStorage.removeItem(SNOOZE_KEY)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!deferred) return null

  async function handleInstall() {
    if (!deferred) return
    // 한 번 쓴 이벤트는 재사용할 수 없으므로 먼저 치운다
    const e = deferred
    setDeferred(null)
    await e.prompt()
    const { outcome } = await e.userChoice
    // 설치 창에서 거절했다면 곧바로 다시 권하지 않는다
    if (outcome === 'dismissed') {
      localStorage.setItem(SNOOZE_KEY, String(Date.now()))
    }
  }

  function handleLater() {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()))
    setDeferred(null)
  }

  return (
    // 상세 패널(z-50)보다 아래. 모바일에서 엄지가 닿는 화면 아래쪽에 둔다.
    <div className="fixed inset-x-0 bottom-0 z-40 p-3">
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-lg">
        <img
          src="/pwa-192x192.png"
          alt=""
          className="size-9 shrink-0 rounded-lg"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800">앱으로 설치하기</p>
          <p className="text-xs text-slate-500">
            홈 화면에서 바로 열고, 오프라인에서도 켜집니다.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handleLater}
            className="rounded-md px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            나중에
          </button>
          <button
            type="button"
            onClick={() => void handleInstall()}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
          >
            설치
          </button>
        </div>
      </div>
    </div>
  )
}
