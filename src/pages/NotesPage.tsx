import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createNote, listNotes, removeNote, updateNote } from '../api/notes'
import {
  createNoteFolder,
  ensureArchiveFolder,
  listNoteFolders,
  removeNoteFolder,
  renameNoteFolder,
} from '../api/noteFolders'
import type { Note, NoteFolder } from '../api/types'
import LogoutButton from '../components/LogoutButton'
import NoteTree from '../components/NoteTree'
import { groupNotes, searchNotes } from '../lib/noteGroups'
import { MD_UP, useMediaQuery } from '../lib/useMediaQuery'
import { useOnline } from '../lib/useOnline'
import { useEscapeKey } from '../lib/useEscapeKey'
import { loadErrorMessage, withRetry } from '../lib/retry'

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
// 목록은 접히는 폴더 그룹(backlog 9.4) — 묶는 규칙은 lib/noteGroups.ts, 표시는
// components/NoteTree.tsx. 고정(notes.pinned) 메모는 바로가기처럼 맨 위와 원래
// 폴더 양쪽에 보인다. 검색·정렬은 클라이언트에서만 처리(서버 변경 없음).
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
  // 펼쳐진 폴더 id — 기기별로 기억 (backlog 9.4)
  const [expanded, setExpanded] = useState<Set<string>>(loadExpanded)
  const [creatingFolder, setCreatingFolder] = useState(false)
  // 좁은 화면에선 목록과 편집기를 나란히 두지 않고 한 번에 하나만 보여준다
  // (예전엔 세로로 쌓여서, 메모를 고른 뒤 목록 전체를 지나 스크롤해야 편집기가
  //  나왔다 — backlog 8.1)
  const isWide = useMediaQuery(MD_UP)
  const online = useOnline()

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

  // 목록 묶기: 고정(바로가기) → 폴더 → 폴더 없음 → 보관함. 검색 중엔 평평한 결과.
  const groups = useMemo(
    () => groupNotes(notes, folders, sortMode),
    [notes, folders, sortMode],
  )
  const searchResults = useMemo(
    () => (search.trim() ? searchNotes(notes, search, sortMode) : null),
    [notes, search, sortMode],
  )

  useEffect(() => {
    saveExpanded(expanded)
  }, [expanded])

  const setFolderOpen = useCallback((id: string, open: boolean) => {
    setExpanded((prev) => {
      if (prev.has(id) === open) return prev
      const next = new Set(prev)
      if (open) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  useEffect(() => {
    let alive = true
    // 메모 목록은 폴더 기능과 별개로 로드한다 — 폴더 쪽이 실패해도
    // (예: schema.sql 재실행 전이라 note_folders 테이블이 없는 경우)
    // 메모 목록 자체는 항상 보여야 한다.
    // 일시적 실패는 자동 재시도 (backlog 9.8)
    withRetry(listNotes)
      .then((data) => {
        if (alive) setNotes(data)
      })
      .catch((e) => {
        if (alive) setError(loadErrorMessage(e))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    ;(async () => {
      try {
        await ensureArchiveFolder()
        const foldersData = await listNoteFolders()
        if (alive) setFolders(foldersData)
      } catch {
        // 폴더 기능 준비 전(예: schema.sql 미실행)이어도 낙서장 자체는 계속 써야 하므로 무시
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // 선택이 바뀌면 편집 필드를 해당 메모 값으로 리셋.
  // 의존성이 `selected`(notes에서 파생) 하나뿐이면 자동저장이 끝날 때마다
  // upsertLocal → notes 새 배열 → selected 새 참조가 되어 effect가 다시 돌고,
  // 저장 중에 이어서 친 입력이 서버 응답값으로 되감기며 캐럿이 맨 끝으로 튄다.
  // 그래서 "실제로 selectedId가 바뀐 경우"에만 리셋한다.
  const loadedIdRef = useRef<string | null>(null)
  useEffect(() => {
    // 선택은 됐는데 목록에 아직 없으면(로딩 중) 다음 렌더를 기다린다
    if (selectedId !== null && !selected) return
    if (loadedIdRef.current === selectedId) return
    loadedIdRef.current = selectedId
    setTitle(selected?.title ?? '')
    setBody(selected?.body ?? '')
    setStatus('idle')
  }, [selected, selectedId])

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

  // 열린 메모 닫기 (backlog 9.2). 대기 중인 자동저장은 selectedId가 바뀔 때
  // 위 effect 정리 함수가 flush 하므로 여기선 선택만 푼다.
  const closeNote = useCallback(() => setSelectedId(null), [])
  useEscapeKey(closeNote)

  function upsertLocal(note: Note) {
    setNotes((prev) => {
      const idx = prev.findIndex((n) => n.id === note.id)
      const next = idx === -1 ? [note, ...prev] : prev.map((n) => (n.id === note.id ? note : n))
      // 최근 수정순 유지
      return next.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    })
  }

  async function handleNew(folderId: string | null = null) {
    setBusy(true)
    setError('')
    try {
      const created = await createNote({
        title: '',
        body: '',
        folder_id: folderId,
      })
      upsertLocal(created)
      if (folderId) setFolderOpen(folderId, true)
      setSelectedId(created.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : '생성에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateFolder(name: string) {
    setCreatingFolder(false)
    setError('')
    try {
      const created = await createNoteFolder(name)
      setFolders((prev) => [...prev, created])
      setFolderOpen(created.id, true)
    } catch (e) {
      setError(e instanceof Error ? e.message : '폴더 생성에 실패했습니다.')
    }
  }

  async function handleRenameFolder(f: NoteFolder, name: string) {
    setError('')
    const prevName = f.name
    // 낙관적 반영 + 실패 시 되돌림
    setFolders((prev) => prev.map((x) => (x.id === f.id ? { ...x, name } : x)))
    try {
      await renameNoteFolder(f.id, name)
    } catch (e) {
      setFolders((prev) =>
        prev.map((x) => (x.id === f.id ? { ...x, name: prevName } : x)),
      )
      setError(e instanceof Error ? e.message : '이름 변경에 실패했습니다.')
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
      setFolderOpen(f.id, false)
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
        // 다음 메모를 자동으로 열지 않는다 — 낙서장은 "기본은 비어 있음" (backlog 9.2)
        setSelectedId(null)
        return prev.filter((n) => n.id !== selected.id)
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-full bg-white">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 md:px-6 md:py-4">
        <h1 className="text-base font-semibold text-slate-800 md:text-lg">
          낙서장
        </h1>
        <nav className="flex items-center gap-4 text-sm text-slate-500">
          <Link className="hover:text-slate-800" to="/">
            매트릭스
          </Link>
          <LogoutButton />
        </nav>
      </header>

      <main className="grid grid-cols-1 gap-6 px-4 py-4 md:grid-cols-[16rem_1fr] md:px-6 md:py-6">
        {/* 목록 — 좁은 화면에서 메모를 열면 편집기에 자리를 내준다 */}
        <aside className={!isWide && selected ? 'hidden' : undefined}>
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={() => void handleNew()}
              disabled={busy}
              className="flex-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              + 새 메모
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setCreatingFolder(true)
              }}
              className="shrink-0 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              + 폴더
            </button>
          </div>

          {/* 검색 + 정렬 한 줄. 정렬은 두 값뿐이라 누를 때마다 바뀌는 버튼 하나 */}
          <div className="mb-2 flex items-center gap-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="검색…"
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            <button
              type="button"
              onClick={() =>
                setSortMode((m) => (m === 'recent' ? 'title' : 'recent'))
              }
              title={
                sortMode === 'recent'
                  ? '최근 수정순 — 눌러서 제목순으로'
                  : '제목순 — 눌러서 최근 수정순으로'
              }
              className="shrink-0 rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            >
              {sortMode === 'recent' ? '최근순' : '제목순'}
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-slate-400">불러오는 중…</p>
          ) : (
            <NoteTree
              groups={groups}
              searchResults={searchResults}
              folders={folders}
              selectedId={selectedId}
              expanded={expanded}
              onToggleFolder={(id) => setFolderOpen(id, !expanded.has(id))}
              onSelect={(id) => {
                // 검색 결과에서 고르면 검색을 지운 뒤에도 보이게 그 폴더를 펼친다
                const fid = notes.find((x) => x.id === id)?.folder_id
                if (searchResults && fid) setFolderOpen(fid, true)
                setSelectedId(id)
              }}
              onTogglePin={(n) => void handleTogglePin(n)}
              onMove={(n, fid) => void handleMoveFolder(n, fid)}
              onNewInFolder={(fid) => void handleNew(fid)}
              onRenameFolder={(f, name) => void handleRenameFolder(f, name)}
              onDeleteFolder={(f) => void handleDeleteFolder(f)}
              creatingFolder={creatingFolder}
              onCreateFolder={(name) => void handleCreateFolder(name)}
              onCancelCreateFolder={() => setCreatingFolder(false)}
              dnd={isWide}
            />
          )}
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
              {/* 좁은 화면에선 목록이 가려져 있으므로 돌아갈 길을 만들어준다 */}
              {!isWide && (
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="-ml-1 flex items-center gap-1 rounded px-1 py-0.5 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                >
                  ‹ 목록
                </button>
              )}
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
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    {status === 'saving'
                      ? '저장 중…'
                      : status === 'saved'
                        ? '저장됨'
                        : status === 'error'
                          ? '저장 실패'
                          : ''}
                  </span>
                  {/* 좁은 화면은 위 '‹ 목록'이 같은 역할 (backlog 9.2) */}
                  {isWide && (
                    <button
                      type="button"
                      onClick={closeNote}
                      title="메모 닫기 (Esc)"
                      aria-label="메모 닫기"
                      className="rounded px-1.5 text-lg leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              <input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="제목"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              {/* 화면 높이에 맞춰 아래로 넓게(헤더·툴바·제목·삭제줄 약 18rem 제외).
                  rows 는 calc 가 안 먹는 환경용 최소 보장값. */}
              <textarea
                value={body}
                onChange={(e) => handleBodyChange(e.target.value)}
                placeholder="자유롭게 적어두세요…"
                rows={16}
                className="min-h-[calc(100vh-18rem)] w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
            // 좁은 화면에선 목록이 바로 위에 그대로 떠 있으므로 안내가 군더더기다
            !loading &&
            isWide && (
              <p className="text-sm text-slate-400">
                왼쪽에서 메모를 고르거나 새로 만들어 보세요.
              </p>
            )
          )}
          {error && (
            <p
              className={`mt-3 text-sm ${online ? 'text-red-500' : 'text-slate-500'}`}
            >
              {online
                ? error
                : '오프라인입니다. 연결되면 메모를 다시 불러옵니다.'}
            </p>
          )}
        </section>
      </main>
    </div>
  )
}

// 펼친 폴더 기억 — 기기별 편의 기능이라 localStorage. 막혀 있거나(사생활 보호
// 모드 등) 값이 깨져도 "전부 접힘"으로 정상 동작한다.
const EXPANDED_KEY = 'weekgrid.notes.expandedFolders'

function loadExpanded(): Set<string> {
  try {
    const raw = localStorage.getItem(EXPANDED_KEY)
    const arr: unknown = raw ? JSON.parse(raw) : []
    return new Set(
      Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [],
    )
  } catch {
    return new Set()
  }
}

function saveExpanded(ids: ReadonlySet<string>) {
  try {
    localStorage.setItem(EXPANDED_KEY, JSON.stringify([...ids]))
  } catch {
    /* 저장 실패는 무시 — 다음 방문 때 접힌 상태로 시작할 뿐 */
  }
}
