import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react'
import type { Note, NoteFolder } from '../api/types'
import type { FolderGroup, NoteGroups } from '../lib/noteGroups'

// 낙서장 목록 — 접히는 폴더 그룹 (backlog 9.4, C안).
// 묶는 규칙은 lib/noteGroups.ts, 여기는 표시와 조작만 담당한다.
//
// 조작은 전부 ⋯ 메뉴로 모았다. 예전엔 폴더 삭제 ×·고정 핀이 마우스를 올려야
// 보여서 폰에서는 아예 쓸 수 없었다. ⋯ 는 항상 보이되 옅게 둔다.
// 드래그 이동은 데스크톱 보조 수단이고, 같은 일을 메뉴로도 할 수 있다.

const NOTE_DRAG_TYPE = 'application/x-weekgrid-note'

interface Props {
  groups: NoteGroups
  /** 검색 중이면 결과 목록(그룹 대신 평평하게 표시), 아니면 null */
  searchResults: Note[] | null
  /** 보관함 포함 전체 폴더 — 이동 메뉴·폴더 이름 표시용 */
  folders: NoteFolder[]
  selectedId: string | null
  expanded: ReadonlySet<string>
  onToggleFolder: (folderId: string) => void
  onSelect: (noteId: string) => void
  onTogglePin: (note: Note) => void
  onMove: (note: Note, folderId: string | null) => void
  onNewInFolder: (folderId: string) => void
  onRenameFolder: (folder: NoteFolder, name: string) => void
  onDeleteFolder: (folder: NoteFolder) => void
  creatingFolder: boolean
  onCreateFolder: (name: string) => void
  onCancelCreateFolder: () => void
  /** 드래그로 폴더 이동 허용 (데스크톱만) */
  dnd: boolean
}

export default function NoteTree(props: Props) {
  const { groups, searchResults, folders } = props
  const nameOf = (id: string | null) =>
    id ? (folders.find((f) => f.id === id)?.name ?? null) : null

  if (searchResults) {
    if (searchResults.length === 0)
      return <p className="text-sm text-slate-400">검색 결과가 없습니다.</p>
    return (
      <ul className="space-y-0.5">
        {searchResults.map((n) => (
          <NoteRow
            key={n.id}
            note={n}
            folderLabel={nameOf(n.folder_id)}
            {...props}
          />
        ))}
      </ul>
    )
  }

  const empty =
    groups.pinned.length === 0 &&
    groups.loose.length === 0 &&
    groups.folders.every((g) => g.notes.length === 0) &&
    (groups.archive?.notes.length ?? 0) === 0

  return (
    <div className="space-y-1">
      {groups.pinned.length > 0 && (
        <ul className="space-y-0.5 border-b border-slate-100 pb-1">
          {groups.pinned.map((n) => (
            // 바로가기 — 폴더 안 메모라면 어느 폴더인지 같이 보여준다
            <NoteRow
              key={`pin-${n.id}`}
              note={n}
              folderLabel={nameOf(n.folder_id)}
              {...props}
            />
          ))}
        </ul>
      )}

      {props.creatingFolder && (
        <NameInput
          initial=""
          placeholder="새 폴더 이름"
          onSubmit={props.onCreateFolder}
          onCancel={props.onCancelCreateFolder}
        />
      )}

      {groups.folders.map((g) => (
        <FolderSection key={g.folder.id} group={g} {...props} />
      ))}

      {groups.loose.length > 0 && (
        <ul className="space-y-0.5">
          {groups.loose.map((n) => (
            <NoteRow key={n.id} note={n} folderLabel={null} {...props} />
          ))}
        </ul>
      )}

      {groups.archive && <FolderSection group={groups.archive} {...props} />}

      {empty && !props.creatingFolder && (
        <p className="px-1 text-sm text-slate-400">메모가 없습니다.</p>
      )}
    </div>
  )
}

function FolderSection({
  group,
  ...props
}: Props & { group: FolderGroup }) {
  const { folder, notes } = group
  const open = props.expanded.has(folder.id)
  const [renaming, setRenaming] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const archive = folder.is_archive

  const dropHandlers = props.dnd
    ? {
        onDragOver: (e: DragEvent) => {
          if (!e.dataTransfer.types.includes(NOTE_DRAG_TYPE)) return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          setDragOver(true)
        },
        onDragLeave: () => setDragOver(false),
        onDrop: (e: DragEvent) => {
          setDragOver(false)
          const id = e.dataTransfer.getData(NOTE_DRAG_TYPE)
          const n = allNotes(props.groups).find((x) => x.id === id)
          if (n && n.folder_id !== folder.id) {
            e.preventDefault()
            props.onMove(n, folder.id)
          }
        },
      }
    : {}

  return (
    <div>
      {renaming ? (
        <NameInput
          initial={folder.name}
          placeholder="폴더 이름"
          onSubmit={(name) => {
            setRenaming(false)
            if (name !== folder.name) props.onRenameFolder(folder, name)
          }}
          onCancel={() => setRenaming(false)}
        />
      ) : (
        <div
          {...dropHandlers}
          className={`group flex items-center rounded-md ${
            dragOver ? 'bg-indigo-50 ring-1 ring-indigo-300' : 'hover:bg-slate-50'
          }`}
        >
          <button
            type="button"
            onClick={() => props.onToggleFolder(folder.id)}
            aria-expanded={open}
            className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1.5 text-left text-sm text-slate-600"
          >
            <span className="w-3 shrink-0 text-xs text-slate-400">
              {open ? '▾' : '▸'}
            </span>
            <span className="shrink-0">{archive ? '🗄' : '📁'}</span>
            <span className="truncate font-medium">
              {archive ? '보관함' : folder.name}
            </span>
            <span className="shrink-0 text-xs text-slate-400">
              {notes.length}
            </span>
          </button>
          <RowMenu label={`${archive ? '보관함' : folder.name} 메뉴`}>
            {(close) => (
              <>
                <MenuItem
                  onClick={() => {
                    close()
                    props.onNewInFolder(folder.id)
                  }}
                >
                  이 폴더에 새 메모
                </MenuItem>
                {!archive && (
                  <>
                    <MenuItem
                      onClick={() => {
                        close()
                        setRenaming(true)
                      }}
                    >
                      이름 변경
                    </MenuItem>
                    <MenuItem
                      danger
                      onClick={() => {
                        close()
                        props.onDeleteFolder(folder)
                      }}
                    >
                      폴더 삭제
                    </MenuItem>
                  </>
                )}
              </>
            )}
          </RowMenu>
        </div>
      )}

      {open && (
        <ul className="ml-4 space-y-0.5 border-l border-slate-100 pl-1">
          {notes.length === 0 ? (
            <li className="px-3 py-1.5 text-xs text-slate-400">비어 있음</li>
          ) : (
            notes.map((n) => (
              <NoteRow key={n.id} note={n} folderLabel={null} {...props} />
            ))
          )}
        </ul>
      )}
    </div>
  )
}

function NoteRow({
  note: n,
  folderLabel,
  selectedId,
  folders,
  onSelect,
  onTogglePin,
  onMove,
  dnd,
}: Props & { note: Note; folderLabel: string | null }) {
  const selected = n.id === selectedId
  const archive = folders.find((f) => f.is_archive) ?? null
  const custom = folders.filter((f) => !f.is_archive)
  const label =
    folderLabel && archive && n.folder_id === archive.id ? '보관함' : folderLabel

  return (
    <li
      className="group flex items-center"
      draggable={dnd}
      onDragStart={
        dnd
          ? (e) => {
              e.dataTransfer.setData(NOTE_DRAG_TYPE, n.id)
              e.dataTransfer.effectAllowed = 'move'
            }
          : undefined
      }
    >
      <button
        type="button"
        onClick={() => onSelect(n.id)}
        className={`min-w-0 flex-1 rounded-md px-3 py-1.5 text-left text-sm ${
          selected
            ? 'bg-indigo-50 text-indigo-700'
            : 'text-slate-700 hover:bg-slate-50'
        }`}
      >
        <span className="flex items-center gap-1">
          {n.pinned && (
            <span className="shrink-0 text-[10px]" aria-label="고정됨">
              📌
            </span>
          )}
          <span
            className={`truncate font-medium ${
              n.title.trim() ? '' : 'text-slate-400'
            }`}
          >
            {n.title.trim() || '제목 없음'}
          </span>
          {label && (
            <span className="ml-auto shrink-0 rounded bg-slate-100 px-1 text-[10px] text-slate-500">
              {label}
            </span>
          )}
        </span>
        <span className="block truncate text-xs text-slate-400">
          {n.hide_preview ? '🔒 비공개' : n.body.trim() || '내용 없음'}
        </span>
      </button>
      <RowMenu label="메모 메뉴">
        {(close) => (
          <>
            <MenuItem
              onClick={() => {
                close()
                onTogglePin(n)
              }}
            >
              {n.pinned ? '고정 해제' : '맨 위에 고정'}
            </MenuItem>
            <div className="mt-1 border-t border-slate-100 px-3 pb-0.5 pt-1.5 text-[11px] text-slate-400">
              폴더 이동
            </div>
            {[
              { id: null as string | null, name: '폴더 없음' },
              ...custom.map((f) => ({ id: f.id as string | null, name: f.name })),
              ...(archive ? [{ id: archive.id as string | null, name: '보관함' }] : []),
            ].map((dest) => {
              const here = (n.folder_id ?? null) === dest.id
              return (
                <MenuItem
                  key={dest.id ?? 'none'}
                  disabled={here}
                  onClick={() => {
                    close()
                    onMove(n, dest.id)
                  }}
                >
                  {here ? `✓ ${dest.name}` : dest.name}
                </MenuItem>
              )
            })}
          </>
        )}
      </RowMenu>
    </li>
  )
}

function allNotes(g: NoteGroups): Note[] {
  return [
    ...g.pinned,
    ...g.loose,
    ...g.folders.flatMap((f) => f.notes),
    ...(g.archive?.notes ?? []),
  ]
}

/** 폴더 생성·이름 변경용 인라인 입력. Enter 저장, Esc·빈 값 blur 는 취소. */
function NameInput({
  initial,
  placeholder,
  onSubmit,
  onCancel,
}: {
  initial: string
  placeholder: string
  onSubmit: (name: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(initial)
  const done = useRef(false)
  const finish = (save: boolean) => {
    if (done.current) return
    done.current = true
    const name = value.trim()
    if (save && name) onSubmit(name)
    else onCancel()
  }
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onFocus={(e) => e.currentTarget.select()}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing) return
        if (e.key === 'Enter') {
          e.preventDefault()
          finish(true)
        } else if (e.key === 'Escape') {
          // 페이지의 "Esc = 메모 닫기"까지 번지지 않게
          e.stopPropagation()
          finish(false)
        }
      }}
      onBlur={() => finish(true)}
      placeholder={placeholder}
      maxLength={50}
      className="w-full rounded-md border border-indigo-300 px-2 py-1.5 text-sm outline-none ring-2 ring-indigo-100"
    />
  )
}

/** ⋯ 버튼 + 드롭다운. 바깥 클릭·Esc 로 닫힌다. */
function RowMenu({
  label,
  children,
}: {
  label: string
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    // 캡처 단계에서 먼저 받아 Esc 가 "메모 닫기"로 번지지 않게 막는다
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`rounded px-1.5 py-1 text-sm leading-none hover:bg-slate-100 hover:text-slate-700 ${
          open ? 'text-slate-700' : 'text-slate-300 group-hover:text-slate-500'
        }`}
      >
        ⋯
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 max-h-72 w-44 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

function MenuItem({
  children,
  onClick,
  danger,
  disabled,
}: {
  children: ReactNode
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={`block w-full truncate px-3 py-1.5 text-left text-sm disabled:cursor-default disabled:text-slate-400 disabled:hover:bg-transparent ${
        danger ? 'text-red-500 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  )
}
