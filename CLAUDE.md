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
3. D-Day 기능 — **1차 완료(2026-07-27)**: `items.show_dday bool` 컬럼,
   상세 패널 토글, 매트릭스 셀 안 작은 배지. **⚠️ 방향 재논의 중
   (2026-08-06)**: 원하던 건 메인 화면에서 눈에 띄게 크게 보이는 형태 —
   지금은 셀 안에 묻혀 있어 부족. 배너/위젯 형태 재설계 필요
   (`backlog.md` 7-B 참고, 결정 전).
4. **보류(사용자 지정)**: backlog 우선순위(검색 → 완료 필터 → 드래그 재정렬 →
   PWA) — 통째로 미룸. 각 항목 상세 설계는 아직 없음(한 줄 아이디어 수준).
5. ~~피드백 확인 방법~~ — **완료(2026-07-27)**: `feedback` select 정책이
   `is_admin()`(신규 `app_settings` 테이블 조회)으로 관리자 예외 허용, 설정
   탭에 `FeedbackList` 조건부 뷰 추가(`VITE_ADMIN_UID`와 로그인 UID 일치 시만
   노출). 초기 구현은 `current_setting('app.admin_uid', true)` 세션 GUC였으나,
   Supavisor 커넥션 풀러가 기존 커넥션을 재사용해 새 GUC 기본값이 반영 안 되는
   문제(계속 NULL)로 실제 관리자 조회가 0건으로 나오는 버그 발견 → `app_settings`
   테이블 + `security definer` 함수로 교체, 매 쿼리마다 실제로 읽으므로 풀링과
   무관하게 동작. **⚠️ `schema.sql` 재실행 필요** + 기존에 `alter database`로
   설정했다면 무의미하니 아래로 대체:
   `insert into app_settings (key, value) values ('admin_uid', '<내 UID>') on conflict (key) do update set value = excluded.value;`
   (`backlog.md` 1.4)
6. 낙서장 정비 (`backlog.md` 2.4)
   - ~~목록 미리보기 숨기기~~ — **완료(2026-07-27, 메모별 선택형)**: 전체
     제거가 아니라 `notes.hide_preview bool` 컬럼으로 메모별 토글, 숨기면
     본문 대신 "🔒 비공개" 표시(UI만 가림). **⚠️ schema.sql 재실행 필요.**
   - ~~되돌리기(항목 연결 메모 우선)~~ — **완료(2026-07-27)**: `ItemNote.tsx`에
     직전 자동저장 값 1단계 스냅샷 + 되돌리기 버튼.
   - 자동저장(`NotesPage.tsx`) — **완료(2026-08-06)**: `ItemNote.tsx`와 같은
     600ms debounce 패턴 적용, 메모 전환 시 대기 중이던 저장은 취소 대신 즉시
     flush. 수동 "저장" 버튼은 제거(Ctrl/Cmd+S는 유지). **결정 2건**
     (`backlog.md` 2.4 참고): (1) 되돌리기 버튼은 제거 — 저장 완료마다
     `selected` 참조가 바뀌어 상태가 즉시 리셋되는 버그가 있었고, 브라우저
     네이티브 Ctrl+Z가 겹치는 영역을 이미 충분히 커버해 고칠 값어치가 낮다고
     판단. (2) 저장 버튼 제거 후 편집기 하단에 "삭제" 버튼만 남은 레이아웃은
     당장은 그대로 두기로 함.
   - 검색·정렬·고정(1단계) — **완료(2026-08-06)**: 제목·본문 키워드 검색(클라
     이언트 필터), 최근 수정순/제목순 정렬 토글, `notes.pinned bool` 컬럼으로
     고정(항상 최상단). **⚠️ schema.sql 재실행 필요.** 브라우저 인증 흐름 때문에
     실제 클릭 테스트는 못 함 — 화면에서 확인 필요.
   - 다음: 폴더(`note_folders`, `parent_id`는 미리 만들되 지금은 평평하게만
     사용) — 보관(archive) 기능과 같이 설계할지 결정 필요(`backlog.md` 2.4)
