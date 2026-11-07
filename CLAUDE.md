# Weekgrid

## 프로젝트 배경
카테고리(행) × 날짜(열) 매트릭스 기반 개인 플래너. v1(핵심 매트릭스)과
v2(항목 상세·서브태스크·시간/참가자·연결메모) 완료, Vercel 배포 완료
(https://weekgrid.vercel.app).
기존 스펙은 `.kiro/specs/weekly-planner/` 에 있음 — 작업 전 필요한 문서를 먼저 참고.
`.kiro/`는 **별도 비공개 git 저장소**(본 저장소는 `.gitignore`로 무시). 문서를
고치면 `.kiro/` 안에서도 따로 커밋한다. 없으면
`git clone https://github.com/turkyee2/Weekgrid-docs.git .kiro`.

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
3. D-Day 기능 — **완료(2026-08-06)**: `items.show_dday bool` 컬럼(셀 배지,
   1차 2026-07-27)에 이어 헤더 아래 상시 배너(`DdayBanner.tsx`) 추가 —
   D-day 지정 항목을 카드로 나열(완료 여부·D+N 지난 D-day 모두 포함,
   `listDdayItems()`가 `done`으로 거르지 않음), 클릭 시 그 주로 이동+상세
   패널 오픈. **배너 노출은 별도 컬럼**
   `items.dday_pinned bool default false`로 관리 — `show_dday`(셀 배지)와
   분리. 켜고 끄는 UI는 두 번 갈아엎었음: 1차 "선택 해제" 일방향 버튼(못
   되돌림) → 2차 체크박스 관리 모달(완료된 항목은 목록에서 빠져 선택 불가,
   목록 자체도 계속 쌓임) → **최종**: 모달을 없애고 `ItemDetailPanel.tsx`의
   "D-day로 표시" 토글 아래에 "상단 배너에 고정" 토글을 바로 배치 —
   완료 여부와 무관하게 항목 상세에서 언제든 켜고 끌 수 있다. **⚠️
   schema.sql 대시보드 재실행 필요**(`dday_pinned`). (`backlog.md` 7-B)
4. backlog 추천 배치(검색 → 완료 필터 → 드래그 재정렬 → PWA) — 낙서장
   검색/정렬/고정(6번 항목 참고)은 완료. **완료 숨기기는 시도 후 보류
   (2026-08-06)**: 체크박스 토글로 한 번 구현했다가 되돌림 — 완료 항목은
   이미 취소선+회색으로 구분되고, 매트릭스는 셀 하나에 항목이 쌓이는 구조가
   아니라 "긴 목록에서 완료를 치운다"는 원래 취지가 잘 안 맞는다고 판단
   (`backlog.md` 7-A). 항목 전체 검색, 드래그 재정렬, PWA는 아직 미착수.
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
   - 폴더 + 보관함 — **완료(2026-08-06)**: `note_folders` 테이블(트리 대응
     스키마, 지금은 평평하게만 사용) + `notes.folder_id`(소유자 검증 복합
     FK). 보관함은 `is_archive=true`인 특수 폴더(자동 생성, 사용자당 1개) —
     "전체" 필터가 보관함만 제외. 폴더 칩 목록 + 편집기 상단 폴더 이동
     select. 폴더 이름 변경은 아직 없음(후속 과제). **⚠️ schema.sql
     대시보드 재실행 필요.** **버그 수정 2건(2026-08-06)**: 메모 목록 조회를
     보관함 준비와 `Promise.all`로 묶어놔서 폴더 쪽이 실패하면 메모 전체가
     안 보이던 버그, "전체" 필터가 보관함 id 미로드 시 `null`끼리 비교돼
     메모가 걸러지던 버그 — 둘 다 표시 로직 문제였고 데이터 손실은 아니었음.
     (`backlog.md` 2.4)
7. 지난 미완료 항목 처리 — **완료(2026-08-06)**: `MatrixPage.tsx` 헤더에
   "지난 미완료 N건" 배지(`OverdueBadge.tsx`), 클릭 시 목록 → 항목 클릭 시
   그 주로 이동 + 상세 패널 오픈. 데이터는 안 건드리고 표시만(자동 이동
   없음). `ItemDetailPanel.tsx`에 날짜 직접 편집(`<input type="date">`)
   추가 — "선택적으로 옮기기"의 실제 경로, 이전엔 날짜를 바꿀 방법 자체가
   없었음. 스키마 변경 없음. (`backlog.md` 1.2)
