import type { Note, NoteFolder } from '../api/types'

// 낙서장 목록 묶기 (backlog 9.4, C안 — 접히는 폴더 그룹).
//
// 순서: 📌 고정 → 📁 사용자 폴더 → 폴더 없는 메모 → 🗄 보관함.
//
// 고정 메모는 "바로가기"처럼 동작한다 — 맨 위 고정 영역에 보이면서 원래 폴더
// 안에도 그대로 남는다(같은 메모를 두 자리에서 가리킬 뿐 복사가 아님). 단 폴더
// 없는 메모는 원래 자리가 최상위라 고정 영역과 겹치므로 고정 영역에만 둔다.
// 보관함 메모는 고정돼 있어도 고정 영역에 올리지 않는다(보관 = 치워둔 것).
//
// 폴더 정보를 못 불러왔거나(folders 비어 있음) 폴더가 지워져 연결이 끊긴
// 메모는 "폴더 없음"으로 취급한다 — 어느 경우든 메모가 목록에서 사라지면 안 된다.

export type SortMode = 'recent' | 'title'

export interface FolderGroup {
  folder: NoteFolder
  notes: Note[]
}

export interface NoteGroups {
  pinned: Note[]
  folders: FolderGroup[]
  loose: Note[]
  archive: FolderGroup | null
}

export function sortNotes(notes: Note[], mode: SortMode): Note[] {
  return [...notes].sort((a, b) =>
    mode === 'title'
      ? a.title.localeCompare(b.title)
      : b.updated_at.localeCompare(a.updated_at),
  )
}

export function groupNotes(
  notes: Note[],
  folders: NoteFolder[],
  mode: SortMode,
): NoteGroups {
  const archiveFolder = folders.find((f) => f.is_archive) ?? null
  const custom = folders.filter((f) => !f.is_archive)
  const known = new Set(folders.map((f) => f.id))

  const byFolder = new Map<string, Note[]>()
  const loose: Note[] = []
  const pinned: Note[] = []

  for (const n of notes) {
    const fid = n.folder_id && known.has(n.folder_id) ? n.folder_id : null
    const archived = archiveFolder !== null && fid === archiveFolder.id
    if (n.pinned && !archived) pinned.push(n)
    if (fid === null) {
      if (!n.pinned) loose.push(n)
    } else {
      const list = byFolder.get(fid) ?? []
      list.push(n)
      byFolder.set(fid, list)
    }
  }

  const group = (f: NoteFolder): FolderGroup => ({
    folder: f,
    // 폴더 안에서도 고정 메모가 위로
    notes: sortNotes(byFolder.get(f.id) ?? [], mode).sort(
      (a, b) => Number(b.pinned) - Number(a.pinned),
    ),
  })

  return {
    pinned: sortNotes(pinned, mode),
    folders: custom.map(group),
    loose: sortNotes(loose, mode),
    archive: archiveFolder ? group(archiveFolder) : null,
  }
}

/** 검색: 제목·본문 부분 일치. 보관함 포함 전체에서 찾고, 고정 메모가 위로. */
export function searchNotes(
  notes: Note[],
  query: string,
  mode: SortMode,
): Note[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const hit = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q),
  )
  return sortNotes(hit, mode).sort(
    (a, b) => Number(b.pinned) - Number(a.pinned),
  )
}
