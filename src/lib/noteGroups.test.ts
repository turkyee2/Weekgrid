import { describe, expect, it } from 'vitest'
import type { Note, NoteFolder } from '../api/types'
import { groupNotes, searchNotes } from './noteGroups'

function note(id: string, over: Partial<Note> = {}): Note {
  return {
    id,
    owner_id: 'u',
    item_id: null,
    title: id,
    body: '',
    hide_preview: false,
    pinned: false,
    folder_id: null,
    updated_at: '2026-11-01T00:00:00Z',
    ...over,
  } as Note
}

function folder(id: string, over: Partial<NoteFolder> = {}): NoteFolder {
  return {
    id,
    owner_id: 'u',
    name: id,
    sort_order: 0,
    is_archive: false,
    parent_id: null,
    created_at: '2026-11-01T00:00:00Z',
    ...over,
  }
}

const work = folder('work')
const archive = folder('arch', { is_archive: true })
const ids = (ns: Note[]) => ns.map((n) => n.id)

describe('groupNotes', () => {
  it('폴더·폴더 없음·보관함으로 나눈다', () => {
    const g = groupNotes(
      [
        note('a', { folder_id: 'work' }),
        note('b'),
        note('c', { folder_id: 'arch' }),
      ],
      [work, archive],
      'title',
    )
    expect(ids(g.folders[0].notes)).toEqual(['a'])
    expect(ids(g.loose)).toEqual(['b'])
    expect(ids(g.archive!.notes)).toEqual(['c'])
    expect(g.pinned).toEqual([])
  })

  it('폴더 안 고정 메모는 고정 영역과 폴더 양쪽에 보인다 (바로가기)', () => {
    const g = groupNotes(
      [note('a', { folder_id: 'work', pinned: true })],
      [work],
      'title',
    )
    expect(ids(g.pinned)).toEqual(['a'])
    expect(ids(g.folders[0].notes)).toEqual(['a'])
  })

  it('폴더 없는 고정 메모는 고정 영역에만 둔다', () => {
    const g = groupNotes([note('a', { pinned: true })], [work], 'title')
    expect(ids(g.pinned)).toEqual(['a'])
    expect(g.loose).toEqual([])
  })

  it('보관함 메모는 고정돼 있어도 고정 영역에 올리지 않는다', () => {
    const g = groupNotes(
      [note('a', { folder_id: 'arch', pinned: true })],
      [archive],
      'title',
    )
    expect(g.pinned).toEqual([])
    expect(ids(g.archive!.notes)).toEqual(['a'])
  })

  it('폴더를 못 불러왔거나 끊긴 연결이면 폴더 없음으로 취급한다', () => {
    const g = groupNotes(
      [note('a', { folder_id: 'work' }), note('b', { folder_id: 'gone' })],
      [],
      'title',
    )
    expect(ids(g.loose)).toEqual(['a', 'b'])
    expect(g.archive).toBeNull()
  })

  it('폴더 안에서 고정 메모가 위, 나머지는 정렬 기준대로', () => {
    const g = groupNotes(
      [
        note('b', { folder_id: 'work', updated_at: '2026-11-03T00:00:00Z' }),
        note('a', { folder_id: 'work', updated_at: '2026-11-02T00:00:00Z' }),
        note('z', {
          folder_id: 'work',
          pinned: true,
          updated_at: '2026-11-01T00:00:00Z',
        }),
      ],
      [work],
      'recent',
    )
    expect(ids(g.folders[0].notes)).toEqual(['z', 'b', 'a'])
  })

  it('빈 폴더도 그룹으로 남는다', () => {
    const g = groupNotes([], [work], 'title')
    expect(g.folders).toHaveLength(1)
    expect(g.folders[0].notes).toEqual([])
  })
})

describe('searchNotes', () => {
  it('보관함 포함 전체에서 제목·본문을 찾는다', () => {
    const r = searchNotes(
      [
        note('a', { title: '와인 목록' }),
        note('b', { body: '레드 와인', folder_id: 'arch' }),
        note('c', { title: '장보기' }),
      ],
      '와인',
      'title',
    )
    expect(ids(r).sort()).toEqual(['a', 'b'])
  })

  it('빈 검색어면 빈 결과', () => {
    expect(searchNotes([note('a')], '  ', 'title')).toEqual([])
  })
})
