import { useState } from 'react'
import { upsertSettings } from '../api/settings'
import type { Category, UserSettings } from '../api/types'
import type { ViewMode } from '../lib/date'
import { exportItemsCsv } from '../lib/exportItems'
import CategoryManager from './CategoryManager'
import FeedbackForm from './FeedbackForm'
import { useEscapeKey } from '../lib/useEscapeKey'

// 환경설정 모달 (태스크 20·26·36·37) — 탭 구조: 일반 / 카테고리 / 데이터 / 피드백
// 주의: CategoryManager·FeedbackForm 이 자체 <form> 을 가지므로 이 모달은 <div> 로 감싼다.

type Settings = Pick<UserSettings, 'day_rollover_hour' | 'default_view'>
type Tab = 'general' | 'categories' | 'data' | 'feedback'

const TABS: { id: Tab; label: string }[] = [
  { id: 'general', label: '일반' },
  { id: 'categories', label: '카테고리' },
  { id: 'data', label: '데이터' },
  { id: 'feedback', label: '피드백' },
]

interface Props {
  settings: Settings
  categories: Category[]
  onClose: () => void
  onSaved: (patch: Settings) => void
  onCategoriesChanged: () => void
}

export default function SettingsModal({
  settings,
  categories,
  onClose,
  onSaved,
  onCategoriesChanged,
}: Props) {
  const [tab, setTab] = useState<Tab>('general')
  const [rollover, setRollover] = useState<number>(settings.day_rollover_hour)
  const [defaultView, setDefaultView] = useState<ViewMode>(settings.default_view)
  useEscapeKey(onClose)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  async function handleSave() {
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

  async function handleExport() {
    setExporting(true)
    setError('')
    try {
      await exportItemsCsv()
    } catch (err) {
      setError(err instanceof Error ? err.message : '내보내기에 실패했습니다.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/30 px-6 py-8"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-md border border-slate-200 bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 + 탭 */}
        <div className="border-b border-slate-200 px-5 pt-4">
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
          <nav className="mt-3 flex gap-1 text-sm">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-t px-3 py-1.5 ${
                  tab === t.id
                    ? 'border-b-2 border-indigo-600 font-medium text-indigo-700'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === 'general' && (
            <>
              <label className="block text-sm font-medium text-slate-700">
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
                이 시각 이전은 아직 전날로 봅니다. 예: 04:00 이면 새벽 3시는 전날
                일정으로 표시됩니다.
              </p>

              <fieldset className="mt-5">
                <legend className="text-sm font-medium text-slate-700">
                  기본 뷰
                </legend>
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
                type="button"
                onClick={() => void handleSave()}
                disabled={busy}
                className="mt-6 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {busy ? '저장 중…' : '설정 저장'}
              </button>
            </>
          )}

          {tab === 'categories' && (
            <>
              <p className="mb-2 text-xs text-slate-400">
                매트릭스의 행이 됩니다. 초기 세팅 후 가끔만 조정하세요.
              </p>
              <CategoryManager
                categories={categories}
                onChanged={onCategoriesChanged}
              />
            </>
          )}

          {tab === 'data' && (
            <div>
              <p className="text-sm font-medium text-slate-700">CSV 내보내기</p>
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="mt-2 w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {exporting ? '내보내는 중…' : 'CSV 내보내기'}
              </button>
              <p className="mt-1.5 text-xs text-slate-400">
                전체 항목을 엑셀에서 열 수 있는 CSV(UTF-8) 파일로 저장합니다.
              </p>
            </div>
          )}

          {tab === 'feedback' && <FeedbackForm />}

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </div>
      </div>
    </div>
  )
}
