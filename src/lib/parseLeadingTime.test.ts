import { describe, expect, it } from 'vitest'
import { parseLeadingTime } from './parseLeadingTime'

describe('parseLeadingTime', () => {
  it('맨 앞 HH:MM 을 시각으로 떼어낸다', () => {
    expect(parseLeadingTime('20:00 저녁약속')).toEqual({
      content: '저녁약속',
      start_time: '20:00',
    })
  })

  it('한 자리 시는 두 자리로 맞춘다', () => {
    expect(parseLeadingTime('9:30 회의')).toEqual({
      content: '회의',
      start_time: '09:30',
    })
  })

  it('경계값 00:00, 23:59 를 인식한다', () => {
    expect(parseLeadingTime('00:00 자정').start_time).toBe('00:00')
    expect(parseLeadingTime('23:59 마감').start_time).toBe('23:59')
  })

  it('앞뒤 공백·내용 안의 공백은 정리하되 내용은 보존한다', () => {
    expect(parseLeadingTime('  14:00   팀  회의 ')).toEqual({
      content: '팀  회의',
      start_time: '14:00',
    })
  })

  it.each([
    '24:00 늦은 약속',
    '25:00 이상한 시각',
    '12:60 분 초과',
    '9:5 분 한 자리',
    '8시 약속',
    '20:00저녁약속', // 공백 없음
    '약속 20:00', // 맨 앞이 아님
    '120:00 세 자리',
  ])('형식이 안 맞으면 원문 그대로: %s', (input) => {
    expect(parseLeadingTime(input)).toEqual({
      content: input.trim(),
      start_time: null,
    })
  })

  it('시각만 있고 내용이 없으면 인식하지 않는다', () => {
    expect(parseLeadingTime('20:00')).toEqual({
      content: '20:00',
      start_time: null,
    })
    expect(parseLeadingTime('20:00   ')).toEqual({
      content: '20:00',
      start_time: null,
    })
  })
})
