import { useState } from 'react'
import { supabase } from '../lib/supabase'

// 로그인 화면 (태스크 6, 비밀번호 방식으로 변경)
// - 이메일 + 비밀번호 (signInWithPassword) — 이메일 인증 없이 즉시 로그인
// - 구글 OAuth (Supabase에 Google provider 설정 시 동작)
// 계정 생성/비밀번호 설정은 Supabase 대시보드(Authentication > Users)에서 한다.

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErrorMsg('')
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) setErrorMsg(error.message)
    setBusy(false)
    // 성공 시 onAuthStateChange가 세션을 채우고 App 가드가 매트릭스로 보낸다.
  }

  async function handleGoogleLogin() {
    setErrorMsg('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setErrorMsg(error.message)
  }

  return (
    <div className="grid min-h-full place-items-center bg-slate-50 px-6">
      <div className="w-full max-w-sm rounded-md border border-slate-200 bg-white p-8">
        <h1 className="text-center text-lg font-semibold text-slate-800">
          주간 플래너
        </h1>
        <p className="mt-1 text-center text-sm text-slate-400">
          로그인하고 여러 기기에서 같은 일정을 관리하세요
        </p>

        <form onSubmit={handleLogin} className="mt-6 space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            이메일
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            비밀번호
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {busy ? '로그인 중…' : '로그인'}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          또는
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Google로 계속하기
        </button>

        {errorMsg && <p className="mt-3 text-sm text-red-500">{errorMsg}</p>}
      </div>
    </div>
  )
}
