import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createNote, listNotes, removeNote, updateNote } from '../api/notes'
import {
  createNoteFolder,
  ensureArchiveFolder,
  listNoteFolders,
  removeNoteFolder,
} from '../api/noteFolders'
import type { Note, NoteFolder } from '../api/types'
import LogoutButton from '../components/LogoutButton'

function PinIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function LockIcon({
  locked,
  className,
}: {
  locked: boolean
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      {locked ? (
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      ) : (
        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
      )}
    </svg>
  )
}

// 낙서장 화면 (태스크 21: 목록 + 생성/편집/삭제, backlog 2장 1단계: 검색/정렬/고정)
// 좌측 목록에서 메모를 고르면 우측 편집기에서 제목/본문을 수정한다.
// 검색·정렬은 클라이언트에서만 처리(서버 변경 없음), 고정은 notes.pinned
// 컬럼 — 검색/정렬 결과와 무관하게 고정된 메모가 항상 목록 최상단.
// 진입 시 첫 메모를 자동 선택하지 않는다(프라이버시) — 목록만 보이고
// 클릭해야 내용이 열린다.
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
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState<'recent' | 'title'>('recent')
  const [folders, setFolders] = useState<NoteFolder[]>([])
  // null = 전체(보관함 제외). 그 외엔 폴더 id(보관함 포함)로 필터
  const [folderFilter, setFolderFilter] = useState<string | null>(null)

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

  const archiveFolder = useMemo(
    () => folders.find((f) => f.is_archive) ?? null,
    [folders],
  )
  const customFolders = useMemo(
    () => folders.filter((f) => !f.is_archive),
    [folders],
  )

  // 폴더 필터(전체=보관함 제외) → 검색(제목·본문) → 고정 메모 우선 → 선택한 정렬 기준
  const visibleNotes = useMemo(() => {
    const byFolder =
      folderFilter === null
        ? notes.filter((n) => n.folder_id !== archiveFolder?.id)
        : notes.filter((n) => n.folder_id === folderFilter)
    const q = search.trim().toLowerCase()
    const filtered = q
      ? byFolder.filter(
          (n) =>
            n.title.toLowerCase().includes(q) ||
            n.body.toLowerCase().includes(q),
        )
      : byFolder
    return [...filtered].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return sortMode === 'title'
        ? a.title.localeCompare(b.title)
        : b.updated_at.localeCompare(a.updated_at)
    })
  }, [notes, search, sortMode, folderFilter, archiveFolder])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [notesData] = await Promise.all([listNotes(), ensureArchiveFolder()])
        if (!alive) return
        setNotes(notesData)
        const foldersData = await listNoteFolders()
        if (!alive) return
        setFolders(foldersData)
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : '불러오지 못했습니다.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
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
      const created = await createNote({
        title: '',
        body: '',
        folder_id: folderFilter,
      })
      upsertLocal(created)
      setSelectedId(created.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : '생성에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateFolder() {
    const name = window.prompt('폴더 이름을 입력하세요')?.trim()
    if (!name) return
    setError('')
    try {
      const created = await createNoteFolder(name)
      setFolders((prev) => [...prev, created])
    } catch (e) {
      setError(e instanceof Error ? e.message : '폴더 생성에 실패했습니다.')
    }
  }

  async function handleDeleteFolder(f: NoteFolder) {
    const ok = window.confirm(
      `"${f.name}" 폴더를 삭제할까요? 안의 메모는 삭제되지 않고 폴더 밖으로 나갑니다.`,
    )
    if (!ok) return
    setError('')
    try {
      await removeNoteFolder(f.id)
      setFolders((prev) => prev.filter((x) => x.id !== f.id))
      setNotes((prev) =>
        prev.map((n) => (n.folder_id === f.id ? { ...n, folder_id: null } : n)),
      )
      if (folderFilter === f.id) setFolderFilter(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '폴더 삭제에 실패했습니다.')
    }
  }

  async function handleMoveFolder(n: Note, folderId: string | null) {
    setError('')
    try {
      const updated = await updateNote(n.id, { folder_id: folderId })
      upsertLocal(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : '폴더 이동에 실패했습니다.')
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

  async function handleTogglePin(n: Note) {
    setError('')
    try {
      const updated = await updateNote(n.id, { pinned: !n.pinned })
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

          <div className="mb-2 flex flex-wrap items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setFolderFilter(null)}
              className={`rounded px-1.5 py-0.5 ${
                folderFilter === null
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              전체
            </button>
            {customFolders.map((f) => (
              <span key={f.id} className="group inline-flex items-center">
                <button
                  type="button"
                  onClick={() => setFolderFilter(f.id)}
                  className={`rounded px-1.5 py-0.5 ${
                    folderFilter === f.id
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {f.name}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteFolder(f)}
                  title="폴더 삭제"
                  className="hidden px-0.5 text-slate-300 hover:text-slate-600 group-hover:inline"
                >
                  ×
                </button>
              </span>
            ))}
            {archiveFolder && (
              <button
                type="button"
                onClick={() => setFolderFilter(archiveFolder.id)}
                className={`rounded px-1.5 py-0.5 ${
                  folderFilter === archiveFolder.id
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                보관함
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleCreateFolder()}
              className="rounded px-1.5 py-0.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            >
              + 폴더
            </button>
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="검색…"
            className="mb-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <div className="mb-2 flex items-center gap-1 text-xs text-slate-400">
            <span>정렬</span>
            <button
              type="button"
              onClick={() => setSortMode('recent')}
              className={`rounded px-1.5 py-0.5 ${
                sortMode === 'recent'
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'hover:bg-slate-50'
              }`}
            >
              최근 수정순
            </button>
            <button
              type="button"
              onClick={() => setSortMode('title')}
              className={`rounded px-1.5 py-0.5 ${
                sortMode === 'title'
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'hover:bg-slate-50'
              }`}
            >
              제목순
            </button>
          </div>

          {loading && <p className="text-sm text-slate-400">불러오는 중…</p>}
          {!loading && visibleNotes.length === 0 && (
            <p className="text-sm text-slate-400">
              {search
                ? '검색 결과가 없습니다.'
                : folderFilter !== null
                  ? '이 폴더에 메모가 없습니다.'
                  : '메모가 없습니다.'}
            </p>
          )}
          <ul className="space-y-1">
            {visibleNotes.map((n) => (
              <li key={n.id} className="group flex items-center gap-1">
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
                  onClick={() => void handleTogglePin(n)}
                  title={n.pinned ? '고정 해제' : '목록 상단 고정'}
                  className={`shrink-0 rounded p-1 ${
                    n.pinned
                      ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                      : 'text-slate-300 opacity-0 hover:bg-slate-100 hover:text-slate-500 group-hover:opacity-100'
                  }`}
                >
                  <PinIcon className="size-3.5" />
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleTogglePreview(selected)}
                    title={
                      selected.hide_preview
                        ? '목록 미리보기 다시 보이기'
                        : '목록 미리보기 숨기기'
                    }
                    className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${
                      selected.hide_preview
                        ? 'text-slate-600'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <LockIcon locked={selected.hide_preview} className="size-3.5" />
                    비공개
                  </button>
                  <select
                    value={selected.folder_id ?? ''}
                    onChange={(e) =>
                      void handleMoveFolder(selected, e.target.value || null)
                    }
                    className="rounded border border-slate-200 bg-transparent px-1 py-0.5 text-xs text-slate-500 outline-none focus:border-indigo-500"
                  >
                    <option value="">폴더 없음</option>
                    {customFolders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                    {archiveFolder && (
                      <option value={archiveFolder.id}>보관함</option>
                    )}
                  </select>
                </div>
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
