# 이어가기 (Handoff) — 다음 작업 재개용

이 프로젝트를 나중에 다시 이어갈 때 빠르게 복귀하기 위한 문서. (2026-08-06 마무리 시점,
v3.6.1)

---

## 1. 지금 어디까지 됐나

- **v1 (핵심 매트릭스 플래너)**: 완료.
- **v2 (종합 다이어리 확장)**: 완료.
- **배포**: 완료 — https://weekgrid.vercel.app (Vercel 정적 배포 + GitHub 연동).
- **2026-08-06 세션 (v3.2.0 → v3.6.1)**: 낙서장 자동저장 정리(되돌리기 버튼 제거),
  공휴일 대체공휴일 데이터 누락 수정, 낙서장 검색·정렬·고정, 지난 미완료 항목 처리
  (헤더 배지 + 항목 날짜 직접 편집 — 이전엔 날짜를 바꿀 방법 자체가 없었음), 낙서장
  폴더+보관함(`note_folders`, is_archive 특수 폴더), D-day 상단 배너(`items.dday_pinned`
  로 셀 배지와 분리 — 관리 UI는 두 번 갈아엎어서 최종적으로 항목 상세 패널의 토글로
  정착, 완료 여부와 무관하게 배너에 계속 뜸). 도중에 발견해 고친 실제 버그 2건(낙서장
  "메모가 없습니다" 오표시, 완료 항목 D-day 미노출) — 전부 표시 로직 문제였고 데이터
  손실은 없었음.

- **2026-08-09 세션 (v3.7.0)**: 사용자 피드백 묶음을 `backlog.md` **8장**으로 정리하고
  그중 실사용 UX 4건 처리 — 낙서장 커서 튐 버그 수정(자동저장이 편집 중 본문을
  되감던 진짜 버그), 메모 본문 칸 확장, 공용 `Toggle` 컴포넌트(켬/끔 구분 강화),
  삭제 확인 정비(서브태스크에 확인 추가 + 항목 삭제는 내용 있을 때만),
  월간 카테고리 필터 기억(`user_settings.month_category_filter`).
  **다음 차례는 `backlog.md` 8.1의 모바일 최적화 + 화면 밀도**(낙서장 좌측 목록,
  D-day 배너가 한 줄 차지) → 그다음 PWA(4.0.0 후보).

상세 진행은 `tasks.md` 상단 요약, `backlog.md`의 각 항목 "완료"/"결정" 표시, `git log` 참고.

## 2. ⚠️ 재개 전 확인할 미완 조치

- **⚠️ 스키마 재실행 필요 (2026-08-09, 미적용)**: `user_settings.month_category_filter`
  컬럼이 `schema.sql` 끝에 추가됐고 **아직 대시보드에서 실행 안 됨**. 실행 전까지는
  월간 뷰 카테고리 필터가 저장되지 않는다(조회 시 `?? []`로 정규화해 두어 화면이
  깨지지는 않고, 새로고침하면 "전체"로 돌아갈 뿐).
  - 그 이전(2026-08-06 세션)까지의 스키마는 재실행 완료 상태 — `notes.pinned`,
    `note_folders`+`notes.folder_id`, `items.dday_pinned` 등 반영됨.
  - 미적용 시 일반적인 증상: "저장/변경했는데 토스트로 실패 메시지"(컬럼/테이블
    없음 에러) 또는 조회 자체가 조용히 비어 보이는 것.
- **로컬 커밋 push 여부 확인**: Vercel은 GitHub push 시 자동 배포됨.
  ```bash
  git fetch origin && git status -sb   # ahead 표시가 있으면 git push 필요
  git push
  ```
- **git 커밋 규칙(2026-08-06부터)**: 이 저장소 커밋엔 `Co-Authored-By` 트레일러를
  넣지 않는다(사용자 요청, 기여자 목록에서 제외). 커밋 메시지 본문도 "~라는 피드백으로",
  "~하기로 결정함" 같은 대화 서술체 대신 담백한 사실 진술로 쓴다.

## 3. 로컬에서 다시 시작하는 법

```bash
git clone https://github.com/turkyee2/Weekgrid.git
cd Weekgrid
npm install
cp .env.example .env      # 이후 Supabase 값 채우기 (VITE_SUPABASE_URL / ANON_KEY)
# Supabase SQL Editor 에 supabase/schema.sql 전체 실행 (idempotent, 재실행 안전)
npm run dev
```

명령: `npm run dev` / `npm run build` / `npm run test` / `npm run lint`
현재 상태(2026-08-06): 빌드·린트 0경고/0에러, 테스트 31개 통과. 빌드 번들이 500KB
경고 임계값을 막 넘기 시작함(정보성 경고, 에러 아님) — `backlog.md` 7-E 참고.

## 4. 문서 지도 (.kiro/specs/weekly-planner/)

- `requirements.md` — 요구사항 1~9(v1) + 10~17(v2)
- `design.md` — 아키텍처·데이터모델·UI 가이드 + v2 확장 설계
- `tasks.md` — 태스크 목록 + 상단에 진행 현황
- `backlog.md` — **다음에 볼 것**: 논의 중 결정, 낙서장 로드맵, 향후 업데이트 후보(7장 A~E)

> **2026-08-09 기준 우선순위는 `backlog.md` 8장이 최신이다.** 아래 5장은 그 이전
> (7장 기준) 요약이므로, 충돌하면 8장을 따른다.

## 5. 다음에 이어가기 좋은 지점 (backlog 7장 요약, 2026-08-06 기준)

- **완료됨(더 이상 후보 아님)**: 낙서장 검색/정렬/고정, 낙서장 폴더+보관함, 지난
  미완료 항목 처리, D-day 배너.
- **시도했다가 보류**: 완료 숨기기/필터 — 이 앱 구조(매트릭스, 셀 하나에 항목이
  안 쌓임)엔 안 맞는다고 판단해 되돌림. 재검토 근거 없으면 다시 안 해도 됨.
- **바로 할 만한 것**: 항목 전체 검색(낙서장 검색은 있음, 매트릭스 항목 검색은 없음),
  드래그 재정렬, 다크 모드, 주 시작 요일 설정, PWA.
- **결정 필요한 것**: 시간 입력 단위 1분 vs 5분(1.1), 회원가입·계정 보안 점검(1.3),
  메모 리치 텍스트 TipTap vs 마크다운(3.1), 낙서장 폴더 이름 변경 UI(후속),
  오래된 메모 보관 UX(2.4).
- 그 외: 반복 항목, 주간 대시보드, 아젠다 뷰, 실시간 동기화, 좁은 AI(Edge Function),
  구글 캘린더 오버레이.

## 6. 아키텍처 한 줄 요약

React(Vite)+Tailwind 정적 SPA가 브라우저에서 실행되고, supabase-js(anon key)로 Supabase
(PostgreSQL+Auth+RLS)에 직접 요청. 서버 코드 없음. Vercel이 `dist/` 정적 호스팅.
데이터 격리는 전적으로 RLS(`owner_id = auth.uid()`) 담당.

## 7. 저장소 밖 자원 / 시크릿 위치 (값이 아닌 "어디서 가져오는지"만 기록)

GitHub에 없는 것 = `.env`, `node_modules/`, `dist/` 뿐. 앞의 둘/셋은 재생성 가능하고,
`.env`와 각종 시크릿은 아래 위치에서 복구/관리한다. **값 자체는 이 문서에 절대 적지 않는다.**

### `.env` 복구 (로컬 유실 시)
- `cp .env.example .env` 후, Supabase 대시보드 → **Project Settings → API** 에서 복사:
  - `VITE_SUPABASE_URL` ← "Project URL"
  - `VITE_SUPABASE_ANON_KEY` ← "Project API keys > anon public"
- 이 두 값은 공개 전제(브라우저 노출)라 치명적 비밀은 아님. 보안은 RLS가 담당.
- 편의상 개인 비밀번호 관리자에 백업해두면 좋음(선택).

### 외부 대시보드에만 존재하는 것 (저장소/`.env`/프론트 금지)
| 시크릿/설정 | 위치 | 비고 |
|---|---|---|
| Supabase `service_role` key | Supabase → Settings → API | **절대 프론트/저장소 금지.** 현재 미사용(향후 Edge Function 때만 서버측) |
| Supabase DB 비밀번호 | Supabase → Settings → Database | 대시보드에서만 |
| Vercel 환경변수 | Vercel → Project → Settings → Environment Variables | `VITE_SUPABASE_URL`/`ANON_KEY`/`VITE_ADMIN_UID` 등록됨(피드백 조회, backlog 1.2). 변경 시 Redeploy 필요 |
| `app_settings` 테이블의 `admin_uid` 값 | Supabase SQL Editor에서 1회 실행: `insert into app_settings (key, value) values ('admin_uid', '<내 UID>') on conflict (key) do update set value = excluded.value;` | 관리자 UID를 `feedback` RLS 정책의 `is_admin()` 함수가 읽음(schema.sql엔 리터럴 없음, public 레포라 커밋 안 함). `VITE_ADMIN_UID`(위 Vercel 행)와 같은 값이어야 함. 예전엔 `app.admin_uid` DB 커스텀 설정(세션 GUC)이었으나 Supavisor 풀링 문제로 테이블 방식으로 교체(2026-07-27) |
| GitHub PAT(push 토큰) | 발급자 로컬/비밀번호 관리자 | 비밀번호처럼 취급. 유출 시 GitHub에서 revoke 후 재발급. 권한 최소(Weekgrid Contents R/W) |
| Google OAuth client secret | Supabase Auth provider 설정 + Google Cloud Console | 구글 로그인 쓸 때만. 대시보드에서만 |

### 연결된 외부 프로젝트 (참고)
- GitHub 리포: `https://github.com/turkyee2/Weekgrid`
- 배포: `https://weekgrid.vercel.app` (Vercel, GitHub 연동 자동 배포)
- Supabase 프로젝트: 대시보드에서 이 앱의 프로젝트 선택 (URL은 `.env`의 `VITE_SUPABASE_URL`)

---

## 8. 주의사항 / 함정

- **스키마 변경 시**: 항상 `supabase/schema.sql`에 idempotent 구문(`add column if not exists`,
  `create table if not exists`, `drop policy if exists` 후 create)으로 추가하고 대시보드에서 재실행.
  코드가 새 컬럼/테이블을 조회하는데 DB 미적용이면 "데이터를 불러오지 못했습니다" 에러 발생.
- **환경변수**: Vercel에도 `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` 등록돼 있어야 하며,
  변경 시 Redeploy 해야 반영(빌드 시 번들에 구워짐).
- **공휴일 데이터**: `src/lib/holidays.ts`는 2024~2027만 음력·대체공휴일 정확. 이후 연도 보정 필요.
- **새 FK 만들 때**: `notes.folder_id` → `note_folders(id, owner_id)`처럼 소유자까지 검증하는
  복합 FK를 쓸 거면 처음부터 그렇게 만들 것 — `items.category_id`를 단일 FK로 만들었다가
  나중에 복합으로 바꾸느라 재실행 순서 문제를 겪은 적 있음(v3 마이그레이션 참고).
- **null/undefined 비교 함정 (2026-08-06)**: "A가 B와 같지 않으면 필터링"류 로직에서 A나 B가
  아직 로드 전이라 `undefined`/`null`일 수 있으면, 둘 다 비어 있을 때 `null !== null → false`가
  되어 정상 데이터까지 조용히 걸러지는 사고가 남. 이번에 `NotesPage.tsx`의 "보관함 아닌
  메모만 보이기" 필터에서 실제로 겪음 — 비교 대상이 존재할 때만 필터를 적용하고, 없으면
  아무것도 거르지 않는 형태로 방어할 것.
- **비밀키**: `.env`는 gitignore로 커밋 안 됨. `service_role` key는 절대 프론트/저장소에 두지 말 것
  (현재 anon key만 사용).
