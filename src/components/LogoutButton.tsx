import { supabase } from '../lib/supabase'

// 로그아웃 버튼 (태스크 7)
// signOut() 후 onAuthStateChange가 세션을 null로 만들면 App의 가드가 /login 으로 보낸다.
export default function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => void supabase.auth.signOut()}
      className="text-sm text-slate-500 hover:text-slate-800"
    >
      로그아웃
    </button>
  )
}
