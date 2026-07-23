import { listCategories } from '../api/categories'
import { listAllItems } from '../api/items'
import { downloadCsv, toCsv } from './csv'
import { formatDate } from './date'

// 전체 항목을 CSV로 내보내기 (태스크 22, 요구사항 8)
// 카테고리 이름 · 날짜 · 내용 · 완료 열을 포함한다. 클라이언트에서만 수행.

const HEADER = ['카테고리', '날짜', '내용', '완료']

/** 항목 전체를 조회해 BOM 포함 UTF-8 CSV 파일로 다운로드한다. */
export async function exportItemsCsv(): Promise<void> {
  const [categories, items] = await Promise.all([
    listCategories(),
    listAllItems(),
  ])
  const nameById = new Map(categories.map((c) => [c.id, c.name]))

  const rows: string[][] = [HEADER]
  for (const it of items) {
    rows.push([
      nameById.get(it.category_id) ?? '(삭제된 카테고리)',
      it.date,
      it.content,
      it.done ? '완료' : '',
    ])
  }

  const filename = `weekly-planner-${formatDate(new Date())}.csv`
  downloadCsv(filename, toCsv(rows))
}
