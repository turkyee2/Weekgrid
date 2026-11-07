// 조회 자동 재시도 (backlog 9.8).
//
// 폰에서 앱이 백그라운드에서 돌아온 직후엔 네트워크가 아직 안 붙었거나 로그인
// 토큰을 갱신하는 중이라 첫 조회가 실패하기 쉽다. 예전엔 한 번 실패하면 곧바로
// "다시 시도" 버튼만 띄웠는데, 대부분 1~2초 뒤 다시 보내면 성공하는 일시적
// 실패라 사용자가 매번 직접 눌러야 했다. 읽기 전용 조회에만 쓴다(쓰기는 중복
// 반영 위험이 있어 재시도하지 않는다).

export const DEFAULT_RETRY_DELAYS = [1000, 2000, 4000]

export interface RetryOptions {
  /** 각 재시도 전 대기(ms). 길이 = 최대 재시도 횟수 */
  delays?: number[]
  /** false를 돌려주면 즉시 포기 (기본: 오프라인이면 포기 — 기다려도 소용없다) */
  shouldRetry?: (error: unknown) => boolean
  /** 테스트용 대기 함수 */
  sleep?: (ms: number) => Promise<void>
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

// onLine 이 명시적으로 false 일 때만 포기 (값이 없는 환경 — Node 등 — 은 재시도)
const defaultShouldRetry = () =>
  typeof navigator === 'undefined' || navigator.onLine !== false

export async function withRetry<T>(
  fn: () => Promise<T>,
  {
    delays = DEFAULT_RETRY_DELAYS,
    shouldRetry = defaultShouldRetry,
    sleep = defaultSleep,
  }: RetryOptions = {},
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn()
    } catch (e) {
      if (attempt >= delays.length || !shouldRetry(e)) throw e
      await sleep(delays[attempt])
    }
  }
}

/** 화면에 보여줄 오류 문구. 네트워크 실패는 브라우저마다 원문이 제각각
 * ("Failed to fetch", "Load failed" 등)이라 한 문구로 모은다. */
export function loadErrorMessage(e: unknown): string {
  if (e instanceof TypeError) return '서버에 연결하지 못했습니다.'
  if (e instanceof Error && e.message) return e.message
  return '데이터를 불러오지 못했습니다.'
}
