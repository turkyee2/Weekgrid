import { useEffect, useRef, useState } from 'react'
import { createNoteForItem, getNoteByItem, updateNote } from '../api/notes'
import type { Note } from '../api/types'

// 항목 연결 메모 인라인 에디터 (태스크 34·35, 요구사항 14)
// - 지연 생성: "메모 작성"을 눌러야 메모 행이 만들어진다(빈 메모 양산 방지).
// - 자동 저장: 입력이 멈추면(디바운스) body 를 저장하고 updated_at 을 갱신한다.
// - 체크리스트 삽입: 커서 위치에 '- [ ] ' 를 넣는 경량 동작(태스크 35).
// - 되돌리기: 자동저장이라 실수로 지운 내용도 바로 저장돼버리는 문제(backlog 2.4)
//   대응 — 새 편집이 시작될 때마다 "그 직전까지 저장돼 있던 값"을 1단계만
//   기억해두고, 되돌리기를 누르면 그 값으로 복원 후 즉시 저장한다.

interface Props {
  itemId: string
}

export default function ItemNote({ itemId }: Props) {
  const [note, setNote] = useState<Note | null>(null)
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  )
  const [undoBody, setUndoBody] = useState<string | null>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setUndoBody(null)
    getNoteByItem(itemId)
      .then((n) => {
        if (!alive) return
        setNote(n)
        setBody(n?.body ?? '')
      })
      .catch(() => {
        /* 조회 실패 시 작성 버튼만 노출 */
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [itemId])

  async function handleCreate() {
    setCreating(true)
    try {
      const created = await createNoteForItem(itemId)
      setNote(created)
      setBody('')
      setUndoBody(null)
      setTimeout(() => taRef.current?.focus(), 0)
    } catch {
      setStatus('error')
    } finally {
      setCreating(false)
    }
  }

  async function persist(text: string, current: Note) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setStatus('saving')
    try {
      const updated = await updateNote(current.id, { body: text })
      setNote(updated)
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }

  function scheduleSave(nextBody: string, current: Note) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setUndoBody(current.body)
    setStatus('saving')
    saveTimer.current = setTimeout(() => {
      void persist(nextBody, current)
    }, 600)
  }

  function onBodyChange(next: string) {
    setBody(next)
    if (note) scheduleSave(next, note)
  }

  // Ctrl/Cmd+S: 디바운스 대기 없이 즉시 저장 (피드백 #6 기본 단축키)
  async function flushSave() {
    if (!note) return
    await persist(body, note)
  }

  // 되돌리기: 직전 저장값으로 복원 후 즉시 저장(1단계 스냅샷이라 한 번 쓰면 사라짐)
  async function handleUndo() {
    if (undoBody === null || !note) return
    const prev = undoBody
    setBody(prev)
    setUndoBody(null)
    await persist(prev, note)
  }

  // 커서 위치에 체크리스트 한 줄 삽입 (태스크 35)
  function insertChecklist() {
    const ta = taRef.current
    if (!ta || !note) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    // 줄 시작이 아니면 개행을 먼저 넣어 새 줄에서 시작
    const before = body.slice(0, start)
    const needsNewline = before.length > 0 && !before.endsWith('\n')
    const snippet = `${needsNewline ? '\n' : ''}- [ ] `
    const next = before + snippet + body.slice(end)
    onBodyChange(next)
    const caret = start + snippet.length
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(caret, caret)
    }, 0)
  }

  if (loading) {
    return (
      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-400">메모 불러오는 중…</p>
      </div>
    )
  }

  return (
    <div className="border-t border-slate-100 pt-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">메모</span>
        {note && (
          <div className="flex items-center gap-2">
            {undoBody !== null && (
              <button
                type="button"
                onClick={() => void handleUndo()}
                className="rounded border border-slate-200 px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-50"
              >
                되돌리기
              </button>
            )}
            <span className="text-xs text-slate-400">
              {status === 'saving'
                ? '저장 중…'
                : status === 'saved'
                  ? '저장됨'
                  : status === 'error'
                    ? '저장 실패'
                    : ''}
            </span>
          </div>
        )}
      </div>

      {!note ? (
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={creating}
          className="mt-2 w-full rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50"
        >
          + 이 항목에 메모 작성
        </button>
      ) : (
        <div className="mt-2">
          <div className="mb-1 flex justify-end">
            <button
              type="button"
              onClick={insertChecklist}
              className="rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-50"
            >
              ☑ 체크리스트 삽입
            </button>
          </div>
          <textarea
            ref={taRef}
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
                e.preventDefault()
                void flushSave()
              }
            }}
            rows={8}
            placeholder="자세한 내용을 자유롭게 적어두세요…"
            className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      )}
    </div>
  )
}
