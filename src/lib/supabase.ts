import { createClient } from '@supabase/supabase-js'

// Supabase 클라이언트 (브라우저용). anon key만 사용하며, 데이터 격리는 DB의 RLS가 담당한다.
// 값은 .env 의 VITE_ 환경변수에서 읽는다(빌드 시 번들에 주입됨).

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // 값이 없으면 조기에 명확히 실패시켜 원인 파악을 쉽게 한다.
  throw new Error(
    'Supabase 환경변수가 없습니다. .env 파일에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 를 설정하세요. (.env.example 참고)',
  )
}

export const supabase = createClient(url, anonKey)
