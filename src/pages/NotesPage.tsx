import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createNote, listNotes, removeNote, updateNote } from '../api/notes'
import type { Note } from '../api/types'
import LogoutButton from '../components/LogoutButton'

// 낙서장 화면 (태스크 21: 목록 + 생성/편집/삭제)
// 좌측 목록에서 메모를 고르면 우측 편집기에서 제목/본문을 수정한다.
// 자동저장: ItemNote.tsx 와 같은 debounce(600ms) 패턴(backlog 2.4).
// 노트 전환 시 대기 중인 저장은 취소하지 않고 즉시 flush 한다(공유 타이머라
// 그냥 취소하면 방금 떠난 메모의 마지막 입력이 유실된다). 되돌리기 버튼은
// 넣었다가 제거함 — 저장 완료마다 `selected` 참조가 바뀌어 상태가 뜨자마자
// 초기화되는 버그가 있었고, 브라우저 네이티브 Ctrl+Z가 겹치는 영역을 이미
// 커버해 버그를 고칠 값어치가 낮다고 판단(backlog 2.4).
export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // 편집 중인 값 (선택된 메모의 사본)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  )
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<{ note: Note; title: string; body: string } | null>(
    null,
  )

  const selected = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId],
  )

  useEffect(() => {
    let alive = true
    listNotes()
      .then((data) => {
        if (!alive) return
        setNotes(data)
        if (data.length > 0) setSelectedId(data[0].id)
      })
      .catch((e) =>
        alive && setError(e instanceof Error ? e.message : '불러오지 못했습니다.'),
      )
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  // 선택이 바뀌면 편집 필드를 해당 메모 값으로 리셋
  useEffect(() => {
    setTitle(selected?.title ?? '')
    setBody(selected?.body ?? '')
    setStatus('idle')
  }, [selected])

  // 선택(selectedId)이 바뀌기 직전, 대기 중인 자동저장이 있으면 즉시 flush.
  // 타이머가 하나뿐이라 취소만 하면 방금 떠난 메모의 마지막 입력이 사라진다.
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      const p = pending.current
      pending.current = null
      if (p) void persist(p.note, p.title, p.body)
    }
  }, [selectedId])

  function upsertLocal(note: Note) {
    setNotes((prev) => {
      const idx = prev.findIndex((n) => n.id === note.id)
      const next = idx === -1 ? [note, ...prev] : prev.map((n) => (n.id === note.id ? note : n))
      // 최근 수정순 유지
      return next.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    })
  }

  async function handleNew() {
    setBusy(true)
    setError('')
    try {
      const created = await createNote({ title: '', body: '' })
      upsertLocal(created)
      setSelectedId(created.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : '생성에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function persist(note: Note, t: string, b: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setStatus('saving')
    try {
      const updated = await updateNote(note.id, { title: t, body: b })
      upsertLocal(updated)
      setStatus('saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했습니다.')
      setStatus('error')
    }
  }

  function scheduleSave(note: Note, nextTitle: string, nextBody: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    pending.current = { note, title: nextTitle, body: nextBody }
    setStatus('saving')
    saveTimer.current = setTimeout(() => {
      pending.current = null
      void persist(note, nextTitle, nextBody)
    }, 600)
  }

  function handleTitleChange(next: string) {
    setTitle(next)
    if (selected) scheduleSave(selected, next, body)
  }

  function handleBodyChange(next: string) {
    setBody(next)
    if (selected) scheduleSave(selected, title, next)
  }

  // Ctrl/Cmd+S: 디바운스 대기 없이 즉시 저장
  async function flushSave() {
    if (!selected) return
    pending.current = null
    await persist(selected, title, body)
  }

  async function handleTogglePreview(n: Note) {
    setError('')
    try {
      const updated = await updateNote(n.id, { hide_preview: !n.hide_preview })
      upsertLocal(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : '변경에 실패했습니다.')
    }
  }

  async function handleDelete() {
    if (!selected) return
    const ok = window.confirm('이 메모를 삭제할까요?')
    if (!ok) return
    setBusy(true)
    setError('')
    try {
      await removeNote(selected.id)
      setNotes((prev) => {
        const next = prev.filter((n) => n.id !== selected.id)
        setSelectedId(next[0]?.id ?? null)
        return next
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-full bg-white">
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-800">낙서장</h1>
        <nav className="flex items-center gap-4 text-sm text-slate-500">
          <Link className="hover:text-slate-800" to="/">
            매트릭스
          </Link>
          <LogoutButton />
        </nav>
      </header>

      <main className="grid grid-cols-1 gap-6 px-6 py-6 md:grid-cols-[16rem_1fr]">
        {/* 목록 */}
        <aside>
          <button
            type="button"
            onClick={handleNew}
            disabled={busy}
            className="mb-3 w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            + 새 메모
          </button>

          {loading && <p className="text-sm text-slate-400">불러오는 중…</p>}
          {!loading && notes.length === 0 && (
            <p className="text-sm text-slate-400">메모가 없습니다.</p>
          )}
          <ul className="space-y-1">
            {notes.map((n) => (
              <li key={n.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedId(n.id)}
                  className={`min-w-0 flex-1 rounded-md px-3 py-2 text-left text-sm ${
                    n.id === selectedId
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`block truncate ${
                      n.title.trim()
                        ? 'font-medium'
                        : 'font-medium text-slate-400'
                    }`}
                  >
                    {n.title.trim() || '제목 없음'}
                  </span>
                  <span className="block truncate text-xs text-slate-400">
                    {n.hide_preview ? '🔒 비공개' : n.body.trim() || '내용 없음'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleTogglePreview(n)}
                  title={n.hide_preview ? '미리보기 다시 보이기' : '목록 미리보기 숨기기'}
                  className="shrink-0 rounded p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-600"
                >
                  {n.hide_preview ? '🔒' : '🔓'}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* 편집기 */}
        <section>
          {selected ? (
            <div
              className="space-y-3"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
                  e.preventDefault()
                  void flushSave()
                }
              }}
            >
              <div className="flex items-center justify-end">
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
              <input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="제목"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <textarea
                value={body}
                onChange={(e) => handleBodyChange(e.target.value)}
                placeholder="자유롭게 적어두세요…"
                rows={16}
                className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={busy}
                  className="rounded-md px-4 py-2 text-sm text-red-500 hover:bg-red-50 disabled:opacity-50"
                >
                  삭제
                </button>
              </div>
            </div>
          ) : (
            !loading && (
              <p className="text-sm text-slate-400">
                왼쪽에서 메모를 고르거나 새로 만들어 보세요.
              </p>
            )
          )}
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </section>
      </main>
    </div>
  )
}
