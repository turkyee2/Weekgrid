# Weekgrid

## 프로젝트 배경
카테고리(행) × 날짜(열) 매트릭스 기반 개인 플래너. v1(핵심 매트릭스)과
v2(항목 상세·서브태스크·시간/참가자·연결메모) 완료, Vercel 배포 완료
(https://weekgrid.vercel.app).
기존 스펙은 `.kiro/specs/weekly-planner/` 에 있음 — 작업 전 필요한 문서를 먼저 참고.

## 문서 지도 (`.kiro/specs/weekly-planner/`)
- `requirements.md` — 요구사항 1~9(v1) + 10~17(v2)
- `design.md` — 아키텍처·데이터모델·UI 가이드
- `tasks.md` — 태스크 목록 + 상단에 진행 현황
- `backlog.md` — 논의 중 결정, 로드맵, 향후 업데이트 후보
- `handoff.md` — 재개용 요약 + 외부 자원/시크릿 위치(값은 적지 않음)

## 스택
React + Vite + Tailwind + Supabase(BaaS: PostgreSQL + Auth + RLS, 서버 코드 없음).
상태관리 라이브러리 미도입(React 기본 상태만 사용). 데이터 격리는 전적으로
RLS(`owner_id = auth.uid()`)가 담당.

## 명령어
`npm run dev` / `npm run build` / `npm run test` / `npm run lint`
정상 상태 기준: 빌드·린트 0경고/0에러, 테스트 전부 통과.

## 진행 방식
- 대화형으로 진행, 큰 변경은 작은 커밋 단위로 쪼갠다.
- 스키마 변경 시 `supabase/schema.sql`에 idempotent 구문(`add column if not exists`,
  `create table if not exists` 등)으로 추가 후 대시보드에서 재실행.
- 기능이 완료·배포될 때마다, 관련 문서(`handoff.md`, `backlog.md`, `tasks.md`)의
  미완료 표시를 같은 턴에 갱신한다. "코드는 끝, 문서는 나중"을 허용하지 않는다.
- 중요한 설계 결정은 ADR로 `backlog.md` 또는 `docs/adr/`에 남긴다.

## 알려진 기술부채 (우선 처리)
- `items`/`notes`의 `updated_at` 컬럼에 자동 갱신 트리거 없음 — 현재 각 API
  함수(`api/items.ts`, `api/notes.ts`)에서 매 update마다 클라이언트 시각을
  직접 넣는 방식이라, 향후 새 쓰기 경로가 이를 빼먹으면 값이 정체된다.
  (참고: `subtasks`/`categories`는 `updated_at` 컬럼 자체가 없음 — 트리거보다
  먼저 컬럼 추가 여부를 결정해야 함.)
- `items.category_id` FK가 소유자(`owner_id`) 조합을 검증하지 않음
  (`categories`에 `(id, owner_id)` unique + `items`에 복합 FK 필요).
- `subtasks.item_id`도 동일한 소유자 검증 구멍이 있을 가능성 → 함께 점검.

## 다음 우선순위
1. ~~엔터키 입력 UI 버그 수정~~ — **완료(2026-07-27)**: `MatrixGrid.tsx`,
   `disabled` 제거 + `submit()` 재진입 가드.
2. ~~기술부채 두 가지~~ — **완료(2026-07-27)**: `schema.sql` v3 마이그레이션
   (FK 소유자 검증 + `updated_at` 트리거) 작성 및 대시보드 실행 확인 완료.
3. ~~D-Day 기능~~ — **완료(2026-07-27)**: `items.show_dday bool` 컬럼,
   상세 패널 토글, 매트릭스 배지.
4. **보류(사용자 지정)**: backlog 우선순위(검색 → 완료 필터 → 드래그 재정렬 →
   PWA) — 통째로 미룸. 각 항목 상세 설계는 아직 없음(한 줄 아이디어 수준).
5. ~~피드백 확인 방법~~ — **완료(2026-07-27, 코드 기준)**: `feedback` select
   정책이 `current_setting('app.admin_uid', true)`로 관리자 예외 허용, 설정
   탭에 `FeedbackList` 조건부 뷰 추가(`VITE_ADMIN_UID`와 로그인 UID 일치 시만
   노출). **⚠️ 실제 UID 값 미설정 상태** — `handoff.md` 2장의 두 단계(DB
   `app.admin_uid` 설정 + `.env`/Vercel `VITE_ADMIN_UID`) 완료해야 동작.
   (`backlog.md` 1.2)
6. 낙서장 정비 — 목록 미리보기 숨기기 → 되돌리기(항목 연결 메모 우선) →
   자동저장 → 폴더(`note_folders`, `parent_id`는 미리 만들되 지금은 평평하게만
   사용) (`backlog.md` 2.4)
