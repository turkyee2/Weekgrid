import { useState } from 'react'
import { upsertSettings } from '../api/settings'
import type { UserSettings } from '../api/types'
import type { ViewMode } from '../lib/date'

// 사용자 설정 모달 (태스크 20: 하루 경계 시각 + 기본 뷰)
// design 3.2 / 요구사항 9 — 하루 경계 시각(0~23) 이전이면 전날로 판정.

type Settings = Pick<UserSettings, 'day_rollover_hour' | 'default_view'>

interface Props {
  settings: Settings
  onClose: () => void
  /** 저장 성공 시 로컬 상태 즉시 반영 */
  onSaved: (patch: Settings) => void
}

export default function SettingsModal({ settings, onClose, onSaved }: Props) {
  const [rollover, setRollover] = useState<number>(settings.day_rollover_hour)
  const [defaultView, setDefaultView] = useState<ViewMode>(settings.default_view)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const patch: Settings = {
      day_rollover_hour: rollover,
      default_view: defaultView,
    }
    try {
      await upsertSettings(patch)
      onSaved(patch)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/30 px-6"
      onClick={onClose}
    >
      <form
        onSubmit={handleSave}
        className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">설정</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-400 hover:text-slate-700"
          >
            닫기
          </button>
        </div>

        {/* 하루 경계 시각 */}
        <label className="mt-5 block text-sm font-medium text-slate-700">
          하루 경계 시각
          <select
            value={rollover}
            onChange={(e) => setRollover(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </label>
        <p className="mt-1.5 text-xs text-slate-400">
          이 시각 이전은 아직 전날로 봅니다. 예: 04:00 이면 새벽 3시는 전날 일정으로
          표시됩니다.
        </p>

        {/* 기본 뷰 */}
        <fieldset className="mt-5">
          <legend className="text-sm font-medium text-slate-700">기본 뷰</legend>
          <div className="mt-2 flex items-center rounded-md border border-slate-200 p-0.5 text-sm">
            {(['week', 'month'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setDefaultView(m)}
                className={`flex-1 rounded px-3 py-1 ${
                  defaultView === m
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {m === 'week' ? '주간' : '월간'}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {busy ? '저장 중…' : '저장'}
        </button>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </form>
    </div>
  )
}
