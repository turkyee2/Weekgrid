import { useState } from 'react'
import { createFeedback } from '../api/feedback'

// 경량 피드백 폼 (태스크 37, 요구사항 17-2)
// 전면 고객센터가 아니라 의견/문의를 남기는 최소 폼. 저장은 feedback 테이블.

export default function FeedbackForm() {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = message.trim()
    if (!text) return
    setBusy(true)
    setError('')
    try {
      await createFeedback(text)
      setMessage('')
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '전송에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <p className="text-sm font-medium text-slate-700">의견 / 문의</p>
      <p className="mt-0.5 text-xs text-slate-400">
        개선 아이디어나 불편한 점을 남겨주세요.
      </p>
      <textarea
        value={message}
        onChange={(e) => {
          setMessage(e.target.value)
          setDone(false)
        }}
        rows={5}
        placeholder="자유롭게 적어주세요…"
        className="mt-2 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
      <button
        type="submit"
        disabled={busy || !message.trim()}
        className="mt-2 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        {busy ? '전송 중…' : '보내기'}
      </button>
      {done && <p className="mt-2 text-sm text-slate-600">보내주셔서 감사합니다.</p>}
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </form>
  )
}
