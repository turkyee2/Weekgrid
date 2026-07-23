import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { createNote, listNotes, removeNote, updateNote } from '../api/notes'
import type { Note } from '../api/types'
import LogoutButton from '../components/LogoutButton'

// 낙서장 화면 (태스크 21: 목록 + 생성/편집/삭제)
// 좌측 목록에서 메모를 고르면 우측 편집기에서 제목/본문을 수정한다.
export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // 편집 중인 값 (선택된 메모의 사본)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  const selected = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId],
  )
  const dirty = selected
    ? title !== selected.title || body !== selected.body
    : false

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
  }, [selected])

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

  async function handleSave() {
    if (!selected || !dirty) return
    setBusy(true)
    setError('')
    try {
      const updated = await updateNote(selected.id, { title, body })
      upsertLocal(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setBusy(false)
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
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(n.id)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                    n.id === selectedId
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="block truncate font-medium">
                    {n.title.trim() || '제목 없음'}
                  </span>
                  <span className="block truncate text-xs text-slate-400">
                    {n.body.trim() || '내용 없음'}
                  </span>
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
                  if (dirty && !busy) void handleSave()
                }
              }}
            >
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="자유롭게 적어두세요…"
                rows={16}
                className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={busy || !dirty}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {dirty ? '저장' : '저장됨'}
                </button>
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
