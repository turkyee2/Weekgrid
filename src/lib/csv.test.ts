import { describe, expect, it } from 'vitest'
import { escapeCsvField, toCsv } from './csv'

describe('escapeCsvField', () => {
  it('일반 문자열은 그대로 둔다', () => {
    expect(escapeCsvField('안녕')).toBe('안녕')
  })

  it('쉼표가 있으면 따옴표로 감싼다', () => {
    expect(escapeCsvField('a,b')).toBe('"a,b"')
  })

  it('큰따옴표는 두 개로 이스케이프하고 감싼다', () => {
    expect(escapeCsvField('그가 "말했다"')).toBe('"그가 ""말했다"""')
  })

  it('개행이 있으면 따옴표로 감싼다', () => {
    expect(escapeCsvField('첫줄\n둘째줄')).toBe('"첫줄\n둘째줄"')
    expect(escapeCsvField('a\r\nb')).toBe('"a\r\nb"')
  })

  it('빈 문자열은 그대로 둔다', () => {
    expect(escapeCsvField('')).toBe('')
  })
})

describe('toCsv', () => {
  it('행을 CRLF로, 필드를 쉼표로 연결한다', () => {
    const csv = toCsv([
      ['카테고리', '날짜', '내용', '완료'],
      ['공부', '2026-07-23', '알고리즘, 그래프', '완료'],
    ])
    expect(csv).toBe(
      '카테고리,날짜,내용,완료\r\n공부,2026-07-23,"알고리즘, 그래프",완료',
    )
  })
})
