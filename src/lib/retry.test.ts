import { describe, expect, it, vi } from 'vitest'
import { loadErrorMessage, withRetry } from './retry'

const noSleep = () => Promise.resolve()

describe('withRetry', () => {
  it('성공하면 한 번만 호출한다', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    await expect(withRetry(fn, { sleep: noSleep })).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('일시적 실패 뒤 성공하면 결과를 돌려준다', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue('ok')
    await expect(withRetry(fn, { sleep: noSleep })).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('재시도를 다 쓰면 마지막 오류를 던진다', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('boom'))
    await expect(
      withRetry(fn, { delays: [1, 1], sleep: noSleep }),
    ).rejects.toThrow('boom')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('지정한 간격만큼 기다린다', async () => {
    const waits: number[] = []
    const fn = vi.fn().mockRejectedValue(new Error('x'))
    await withRetry(fn, {
      delays: [10, 20],
      sleep: async (ms) => {
        waits.push(ms)
      },
    }).catch(() => {})
    expect(waits).toEqual([10, 20])
  })

  it('shouldRetry가 false면 즉시 포기한다', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('x'))
    await expect(
      withRetry(fn, { sleep: noSleep, shouldRetry: () => false }),
    ).rejects.toThrow('x')
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('loadErrorMessage', () => {
  it('네트워크 실패(TypeError)는 한 문구로 모은다', () => {
    expect(loadErrorMessage(new TypeError('Load failed'))).toBe(
      '서버에 연결하지 못했습니다.',
    )
  })
  it('그 외엔 원문을 쓴다', () => {
    expect(loadErrorMessage(new Error('JWT expired'))).toBe('JWT expired')
  })
  it('알 수 없는 값이면 기본 문구', () => {
    expect(loadErrorMessage('?')).toBe('데이터를 불러오지 못했습니다.')
  })
})
