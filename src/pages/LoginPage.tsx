import { useState } from 'react'
import { supabase } from '../lib/supabase'

// 로그인 화면 (태스크 6)
// - 이메일: 매직 링크(비밀번호 없이 이메일로 로그인 링크 전송)
// - 구글: OAuth (Supabase에 Google provider 설정이 되어 있어야 실제 동작)
// 세션 유지/리다이렉트/로그아웃은 태스크 7(인증 가드)에서 처리한다.

type Status = 'idle' | 'sending' | 'sent' | 'error'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('sending')
    setErrorMsg('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
    } else {
      setStatus('sent')
    }
  }

  async function handleGoogleLogin() {
    setErrorMsg('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
    }
    // 성공 시 구글 로그인 페이지로 리다이렉트되므로 이후 처리는 없음
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

        {status === 'sent' ? (
          <div className="mt-6 rounded-md bg-slate-50 p-4 text-center text-sm text-slate-600">
            <p className="font-medium text-slate-800">이메일을 확인하세요</p>
            <p className="mt-1">
              <span className="font-medium">{email}</span> 로 로그인 링크를
              보냈습니다. 링크를 클릭하면 로그인됩니다.
            </p>
            <button
              type="button"
              className="mt-3 text-sm text-indigo-600 hover:text-indigo-500"
              onClick={() => setStatus('idle')}
            >
              다른 이메일로 다시 시도
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleEmailLogin} className="mt-6 space-y-3">
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
              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {status === 'sending' ? '전송 중…' : '로그인 링크 받기'}
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

            {status === 'error' && (
              <p className="mt-3 text-sm text-red-500">{errorMsg}</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
