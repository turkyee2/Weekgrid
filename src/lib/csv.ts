// CSV 내보내기 유틸 (태스크 22, 요구사항 8)
// - UTF-8 BOM 포함 → 엑셀에서 한글 깨짐 방지
// - RFC 4180 방식 이스케이프: 쉼표/따옴표/개행 포함 필드는 따옴표로 감싸고 내부 " 는 "" 로

/** 한 필드를 CSV 규칙에 맞게 이스케이프 */
export function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/** 2차원 문자열 배열 → CSV 문자열 (CRLF 구분) */
export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvField).join(',')).join('\r\n')
}

/**
 * CSV 문자열을 BOM 포함 UTF-8 파일로 다운로드시킨다.
 * 브라우저 환경 전용(클라이언트 내보내기, 요구사항 8-4).
 */
export function downloadCsv(filename: string, csv: string): void {
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
