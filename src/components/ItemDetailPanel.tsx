import { useEffect, useState } from 'react'
import type { Item } from '../api/types'
import { ACCENT_COLORS } from '../lib/colors'
import { useEscapeKey } from '../lib/useEscapeKey'
import Toggle from './Toggle'

// 항목 상세 패널 (태스크 30, 요구사항 10·12·13)
// 우측 드로어. 내용·완료·시작 시각·참가자 태그를 편집한다(낙관적 반영은 부모가 담당).
// 서브태스크(31)·연결 메모(34)는 이후 태스크에서 이 패널에 확장한다.

interface Props {
  item: Item
  categoryName: string
  onClose: () => void
  /** 낙관적 부분 수정 (부모에서 롤백/토스트 처리) */
  onPatch: (id: string, patch: Partial<Item>) => Promise<void>
  onRemove: (id: string) => Promise<void>
  /** 이 항목에 딸린 서브태스크 개수 (삭제 확인 문구·조건에 사용, backlog 8.1) */
  subtaskCount?: number
  /** 이 항목의 연결 메모에 내용이 있는지 (삭제 확인 문구·조건에 사용) */
  hasNote?: boolean
  /** 서브태스크 영역 등 추가 컨텐츠 슬롯 (태스크 31에서 사용) */
  children?: React.ReactNode
}

export default function ItemDetailPanel({
  item,
  categoryName,
  onClose,
  onPatch,
  onRemove,
  subtaskCount = 0,
  hasNote = false,
  children,
}: Props) {
  const [content, setContent] = useState(item.content)
  const [participantDraft, setParticipantDraft] = useState('')
  const [location, setLocation] = useState(item.location ?? '')
  const participants = item.participants ?? []

  useEscapeKey(onClose)

  // 다른 항목으로 전환되면 로컬 내용 동기화
  useEffect(() => {
    setContent(item.content)
  }, [item.id, item.content])
  useEffect(() => {
    setLocation(item.location ?? '')
  }, [item.id, item.location])

  // 장소: 입력을 마치면(blur/Enter) 저장, 비우면 null (backlog 9.5)
  function commitLocation() {
    const next = location.trim()
    if (next === (item.location ?? '')) {
      setLocation(next)
      return
    }
    void onPatch(item.id, { location: next || null })
  }

  function commitContent() {
    const next = content.trim()
    if (next && next !== item.content) void onPatch(item.id, { content: next })
    else if (!next) setContent(item.content) // 빈 내용은 되돌림
  }

  function addParticipant() {
    const tag = participantDraft.trim()
    if (!tag || participants.includes(tag)) {
      setParticipantDraft('')
      return
    }
    void onPatch(item.id, { participants: [...participants, tag] })
    setParticipantDraft('')
  }

  function removeParticipant(tag: string) {
    void onPatch(item.id, {
      participants: participants.filter((p) => p !== tag),
    })
  }

  // 삭제 확인은 "딸린 내용이 실제로 있을 때만" 뜬다 (backlog 8.1).
  // 한 줄만 적어둔 빈 항목을 지우는 데까지 확인창을 띄우면 방해만 되고,
  // 정작 매번 뜨는 확인창은 습관적으로 넘기게 되어 경고 효과가 사라진다.
  // 반대로 서브태스크·메모가 딸린 항목은 함께 사라지는 게 무엇인지 명시한다.
  async function handleDelete() {
    const attached: string[] = []
    if (subtaskCount > 0) attached.push(`세부 체크리스트 ${subtaskCount}개`)
    if (hasNote) attached.push('메모')
    if (item.participants?.length) attached.push('참가자')
    if (item.start_time) attached.push('시작 시각')
    if (item.location) attached.push('장소')

    if (attached.length > 0) {
      const ok = window.confirm(
        `"${item.content}" 을(를) 삭제할까요?\n${attached.join(' · ')}도 함께 삭제됩니다.`,
      )
      if (!ok) return
    }
    await onRemove(item.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/20" />
      <aside
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <span>{categoryName}</span>
            <span>·</span>
            <input
              type="date"
              value={item.date}
              onChange={(e) => {
                if (e.target.value) void onPatch(item.id, { date: e.target.value })
              }}
              className="rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-slate-500 outline-none hover:border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-400 hover:text-slate-700"
          >
            닫기
          </button>
        </div>

        <div className="flex-1 space-y-5 px-5 py-4">
          {/* 내용 + 완료 */}
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={item.done}
              onChange={(e) => void onPatch(item.id, { done: e.target.checked })}
              className="mt-1.5 size-4 shrink-0 cursor-pointer accent-indigo-600"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={commitContent}
              rows={2}
              className={`w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 ${
                item.done ? 'text-slate-400 line-through' : 'text-slate-800'
              }`}
            />
          </div>

          {/* 시작 시각 — 시/분 드롭다운(끝에서 멈춤, 스크롤 없이 선택) */}
          <div className="text-sm font-medium text-slate-700">
            시작 시각
            <div className="mt-1 flex items-center gap-2">
              {(() => {
                const hh = item.start_time ? item.start_time.slice(0, 2) : ''
                const mm = item.start_time ? item.start_time.slice(3, 5) : ''
                const setTime = (h: string, m: string) => {
                  if (!h && !m) {
                    void onPatch(item.id, { start_time: null })
                    return
                  }
                  const H = (h || '00').padStart(2, '0')
                  const M = (m || '00').padStart(2, '0')
                  void onPatch(item.id, { start_time: `${H}:${M}` })
                }
                return (
                  <>
                    <select
                      value={hh}
                      onChange={(e) => setTime(e.target.value, mm)}
                      className="rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="">시</option>
                      {Array.from({ length: 24 }, (_, h) => {
                        const v = String(h).padStart(2, '0')
                        return (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        )
                      })}
                    </select>
                    <span className="text-slate-400">:</span>
                    <select
                      value={mm}
                      onChange={(e) => setTime(hh, e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="">분</option>
                      {Array.from({ length: 60 }, (_, i) => {
                        const v = String(i).padStart(2, '0')
                        return (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        )
                      })}
                    </select>
                    {item.start_time && (
                      <button
                        type="button"
                        onClick={() => void onPatch(item.id, { start_time: null })}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        지우기
                      </button>
                    )}
                  </>
                )
              })()}
            </div>
          </div>

          {/* 장소 — 언제(시작 시각) → 어디서 → 누구와(참가자) 순서 (backlog 9.5) */}
          <label className="block text-sm font-medium text-slate-700">
            장소
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onBlur={commitLocation}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  e.currentTarget.blur()
                }
              }}
              placeholder="예: 강남역 2번 출구"
              maxLength={200}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          {/* 참가자 태그 */}
          <div className="text-sm font-medium text-slate-700">
            참가자
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {participants.map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                >
                  {p}
                  <button
                    type="button"
                    onClick={() => removeParticipant(p)}
                    className="text-slate-400 hover:text-slate-700"
                    aria-label={`${p} 제거`}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                value={participantDraft}
                onChange={(e) => setParticipantDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addParticipant()
                  }
                }}
                onBlur={addParticipant}
                placeholder="이름/조직 + Enter"
                className="min-w-32 flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* 중요도 색 */}
          <div className="text-sm font-medium text-slate-700">
            중요도 색
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => void onPatch(item.id, { accent: null })}
                className={`size-6 rounded-full border border-slate-300 bg-white text-[10px] text-slate-400 ${
                  !item.accent ? 'ring-2 ring-slate-800 ring-offset-1' : ''
                }`}
                aria-label="기본"
                title="기본"
              >
                −
              </button>
              {ACCENT_COLORS.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => void onPatch(item.id, { accent: a.key })}
                  className={`size-6 rounded-full ${
                    item.accent === a.key ? 'ring-2 ring-slate-800 ring-offset-1' : ''
                  }`}
                  style={{ backgroundColor: a.hex }}
                  aria-label={a.label}
                  title={a.label}
                />
              ))}
            </div>
          </div>

          {/* D-day 표시 */}
          <div>
            <div className="flex items-center justify-between text-sm font-medium text-slate-700">
              <span>D-day로 표시</span>
              <Toggle
                checked={item.show_dday}
                onChange={(next) => void onPatch(item.id, { show_dday: next })}
                label="D-day로 표시"
              />
            </div>
            {item.show_dday && (
              <div className="mt-2 flex items-center justify-between pl-3 text-xs text-slate-500">
                <span>상단 배너에 고정</span>
                <Toggle
                  checked={item.dday_pinned}
                  onChange={(next) =>
                    void onPatch(item.id, { dday_pinned: next })
                  }
                  label="상단 배너에 고정"
                  size="sm"
                  onColor="bg-rose-500"
                />
              </div>
            )}
          </div>

          {/* 서브태스크·메모 등 확장 슬롯 */}
          {children}
        </div>

        {/* 하단 액션 */}
        <div className="border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="rounded-md px-3 py-1.5 text-sm text-red-500 hover:bg-red-50"
          >
            항목 삭제
          </button>
        </div>
      </aside>
    </div>
  )
}
