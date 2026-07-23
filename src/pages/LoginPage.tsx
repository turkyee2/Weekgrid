import { useState } from 'react'
import { supabase } from '../lib/supabase'

// 로그인/회원가입 화면 (태스크 6)
// - 로그인: signInWithPassword
// - 회원가입: signUp (Supabase에서 'Confirm email'을 끄면 가입 즉시 로그인됨)
// - 구글 OAuth (Provider 설정 시)

type Mode = 'signin' | 'signup'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [info, setInfo] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErrorMsg('')
    setInfo('')

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) setErrorMsg(error.message)
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })
      if (error) {
        setErrorMsg(error.message)
      } else if (!data.session) {
        // 세션이 없으면 이메일 인증이 켜져 있는 상태
        setInfo('가입 완료. 이메일 인증이 필요하면 메일의 링크를 확인하세요.')
      }
      // 세션이 있으면 onAuthStateChange가 자동으로 매트릭스로 보낸다.
    }
    setBusy(false)
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
          {mode === 'signin'
            ? '로그인하고 여러 기기에서 같은 일정을 관리하세요'
            : '이메일과 비밀번호로 가입하세요'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
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
              minLength={6}
              autoComplete={
                mode === 'signin' ? 'current-password' : 'new-password'
              }
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
            {busy
              ? '처리 중…'
              : mode === 'signin'
                ? '로그인'
                : '회원가입'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setErrorMsg('')
            setInfo('')
          }}
          className="mt-3 w-full text-center text-sm text-indigo-600 hover:text-indigo-500"
        >
          {mode === 'signin'
            ? '계정이 없나요? 회원가입'
            : '이미 계정이 있나요? 로그인'}
        </button>

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

        {info && <p className="mt-3 text-sm text-slate-600">{info}</p>}
        {errorMsg && <p className="mt-3 text-sm text-red-500">{errorMsg}</p>}
      </div>
    </div>
  )
}
