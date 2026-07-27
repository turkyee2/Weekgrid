# 구현 태스크 (Tasks)

> **진행 현황 (2026-07-24 기준)**
> - v1 (태스크 1~24): **완료**
> - v2 확장 (태스크 26~37): **완료** — 항목 상세 패널, 서브태스크, 시간·참가자, 연결 메모, 설정 탭, 피드백
> - 태스크 25 (Vercel 배포): **완료** — https://weekgrid.vercel.app
> - 태스크 O (미래): 미구현 — 좁은 AI, 페이지네이션, E2E 암호화, 앱/위젯
> - 진행 중 피드백(중요도 강조·공휴일·메모 서식 등)은 별도 반복으로 반영 예정
> - **버그 수정 (2026-07-27)**: 엔터로 항목 저장 후 셀 입력 UI가 조작 불가능하게
>   남는 문제 — `MatrixGrid.tsx`에서 저장 중 `disabled`가 포커스를 강제로 뺏던
>   것이 원인. `disabled` 제거 + `submit()` 재진입 가드로 수정. (`CLAUDE.md`
>   다음 우선순위 1번)
> - **기술부채 정리 (2026-07-27)**: `schema.sql` v3 마이그레이션 — categories/items에
>   `(id, owner_id)` unique + items.category_id·subtasks.item_id를 복합 FK로
>   교체(소유자 불일치 차단), items/notes에 `updated_at` 자동 갱신 트리거 추가하고
>   클라이언트의 수동 타임스탬프 세팅 제거. **⚠️ Supabase 대시보드에서 이
>   마이그레이션 블록을 아직 실행 안 했다면 재실행 필요** (`CLAUDE.md` 다음
>   우선순위 2번).
> - **버그 수정 (2026-07-27, v3 재실행 안전성)**: 위 v3 블록이 사실은 재실행
>   불가였음 — `categories_id_owner_key`/`items_id_owner_key` unique 제약을
>   drop하려 할 때 이미 생성된 복합 FK가 그걸 참조하고 있어 두 번째 실행부터
>   "other objects depend on it" 에러 발생. 의존 FK를 먼저 drop한 뒤 unique
>   제약을 재생성하도록 순서 변경.
> - **D-Day 기능 (2026-07-27)**: `items.show_dday bool` 컬럼 추가(항목이 놓인
>   셀의 `date`를 D-day 기준일로 재사용). `ItemDetailPanel`에 토글, `MatrixGrid`
>   셀에 `D-N`/`D-day`/`D+N` 배지(`lib/date.ts`의 `dDayLabel`). **⚠️ `schema.sql`
>   재실행 필요**(v3 마이그레이션과 함께). (`CLAUDE.md` 다음 우선순위 3번)
> - **피드백 조회 기능 (2026-07-27)**: `feedback` select 정책에 관리자 예외 추가
>   (`current_setting('app.admin_uid', true)`, public 레포라 리터럴 UID 대신
>   DB 커스텀 설정 사용), `api/feedback.ts`에 `listFeedback()`, 설정 탭에
>   `FeedbackList` 컴포넌트(로그인 UID가 `VITE_ADMIN_UID`와 일치할 때만 노출).
>   **⚠️ 실제 UID 값 미설정**(`app.admin_uid` DB 설정 + `.env`/Vercel
>   `VITE_ADMIN_UID`) — 설정 전엔 목록이 조용히 숨겨짐. (`CLAUDE.md` 다음
>   우선순위 5번, `backlog.md` 1.2)
>
> 아래 체크박스는 최초 계획 시점의 원본이며, 실제 완료 여부는 위 요약과 git 커밋 이력을 기준으로 한다.

각 태스크는 **작은 커밋 하나** 단위로 끝나도록 쪼갰다. 순서대로 진행하며, 각 태스크 끝에
괄호로 관련 요구사항을 표시했다. 상태관리 라이브러리는 도입하지 않고 React 기본 상태만 쓴다.

> 진행 방식: 한 태스크를 끝내면 동작 확인 → 커밋 → 다음 태스크. 승인 후 하나씩 진행한다.

---

## A. 프로젝트 셋업

- [ ] **1. Vite + React 프로젝트 생성**
  - `npm create vite@latest . -- --template react-ts` (또는 js), 실행 확인.
  - _커밋: "chore: Vite + React 초기화"_

- [ ] **2. Tailwind CSS 설정**
  - Tailwind 설치 + `tailwind.config`/`index.css`에 지시어 추가, 샘플 클래스로 적용 확인.
  - design.md 8.2 디자인 토큰(중립색·포인트색·폰트·반경)을 `tailwind.config` theme에 반영, 카테고리 프리셋 8색 상수 정의.
  - _커밋: "chore: Tailwind 설정 + 디자인 토큰"_ (design 8)

- [ ] **3. 라우팅 뼈대**
  - `react-router-dom` 설치, `/login` `/` `/notes` 빈 페이지 연결.
  - _커밋: "feat: 라우팅 뼈대"_ (요구사항 2·7)

- [ ] **4. 환경변수 / Supabase 클라이언트**
  - `.env`에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 추가, `.env`를 `.gitignore`에 포함.
  - `src/lib/supabase.ts`에서 anon key로 `createClient`.
  - `.env.example`(값 없이 키 이름만) 커밋.
  - _커밋: "chore: Supabase 클라이언트 + 환경변수"_ (비기능 2·3)

## B. 데이터베이스 (Supabase SQL Editor)

- [ ] **5. 스키마 + RLS 적용**
  - design.md 2.3의 DDL 실행: `categories`/`items`/`notes`/`user_settings` 생성 + **RLS 활성화 + 정책 4종씩** + 인덱스.
  - Supabase 대시보드에서 각 테이블 RLS "Enabled" 및 정책 존재 확인.
  - SQL을 `supabase/schema.sql`로 저장(버전 관리).
  - _커밋: "feat(db): 스키마 + RLS 정책"_ (비기능 1)

## C. 인증

- [ ] **6. 로그인 화면 (이메일 + 구글)**
  - `/login`에서 이메일 매직링크/비밀번호 + 구글 OAuth 버튼.
  - _커밋: "feat: 로그인 화면"_ (요구사항 1-1·1-2)

- [ ] **7. 세션 유지 + 인증 가드**
  - `AuthGate`: `getSession` + `onAuthStateChange`, 미인증 시 `/login` 리다이렉트, 재방문 시 세션 복원.
  - 상단에 로그아웃 버튼.
  - _커밋: "feat: 세션 가드 + 로그아웃"_ (요구사항 1-3·1-4·1-5)

## D. 매트릭스 — 조회/렌더 (핵심)

- [ ] **8. 날짜 유틸**
  - `formatDate(d)->'YYYY-MM-DD'`(로컬 기준), `buildDateRange(mode, anchor)`(주간 7일 / 월간은 6주 그리드 범위), `addDays`, `addMonths`, `weekLabel`, `logicalToday(now, H)`(하루 경계 시각 반영).
  - 간단 단위 테스트(월 경계, 타임존 밀림 없음, rollover H=4일 때 새벽 판정) 포함.
  - _커밋: "feat: 날짜 유틸 + 테스트"_ (design 3.2·3.3·3.8)

- [ ] **9. API 레이어**
  - `api/categories.ts`(list/create/remove/reorder), `api/items.ts`(listByRange/create/update/remove), `api/settings.ts`(get/upsert).
  - _커밋: "feat: categories/items/settings API 래퍼"_

- [ ] **10. 매트릭스 조회 훅**
  - 진입 시 `settings` 1회 조회(없으면 기본값), `viewMode`+`anchorDate` 변경 시 categories + items(범위) fetch, `buildCellMap`으로 셀 맵 생성, loading/error 상태.
  - `logicalToday`로 초기 `anchorDate` 설정.
  - _커밋: "feat: 매트릭스 데이터 로딩"_ (design 3.2·3.4·3.5)

- [ ] **11. MatrixGrid 렌더 (읽기 전용)**
  - 카테고리 행 × 날짜 열 격자, 셀별 항목 나열, `logicalToday` 열 하이라이트, 빈 셀 클릭 영역.
  - 첫 열 `sticky`.
  - _커밋: "feat: 매트릭스 격자 렌더"_ (요구사항 2, design 3.6-A)

- [ ] **12. 주 이동 헤더**
  - 라벨("N월 M주차"), 이전/다음/이번주 버튼 → `anchorDate` 갱신 후 재조회.
  - _커밋: "feat: 주 이동 헤더"_ (요구사항 4)

## E. 항목 CRUD

- [ ] **13. 항목 추가**
  - 빈 셀/추가 버튼 클릭 → 입력 UI → `sort_order = maxInCell+1`로 insert → 로컬 반영(낙관적).
  - _커밋: "feat: 항목 추가"_ (요구사항 3-1·3-2, design 3.8·3.9)

- [ ] **14. 항목 편집/삭제**
  - 항목 클릭 → 편집/삭제 UI, update 시 `updated_at` 갱신, 삭제 시 로컬 제거.
  - _커밋: "feat: 항목 편집/삭제"_ (요구사항 3-3·3-4·3-5)

- [ ] **15. 완료 토글**
  - `done` 토글 + 완료 항목 시각 구분.
  - _커밋: "feat: 항목 완료 토글"_ (요구사항 3-7)

## F. 카테고리 관리

- [ ] **16. 카테고리 추가/삭제**
  - 이름+색상 추가, 삭제 시 **확인 다이얼로그(항목 cascade 경고)**.
  - _커밋: "feat: 카테고리 추가/삭제"_ (요구사항 5-1·5-2·5-4)

- [ ] **17. 카테고리 순서변경**
  - 위/아래 이동 또는 드래그로 `sort_order` 재작성 후 저장, 매트릭스 반영.
  - _커밋: "feat: 카테고리 순서변경"_ (요구사항 5-3)

## G. 월간 달력 & 뷰 토글

- [ ] **18. MonthCalendar (평범한 달력 그리드)**
  - `buildDateRange('month')`의 6주 그리드를 7개씩 끊어 주=행으로 렌더, 이웃 달 날짜 흐리게, `logicalToday` 칸 강조.
  - `DayCell`: 그날 항목을 카테고리 색으로 요약 + `+N` 축약.
  - _커밋: "feat: 월간 달력 뷰"_ (요구사항 6-3·6-4·6-6, design 3.6-B)

- [ ] **19. 주간/월간 토글 + 드릴다운**
  - 헤더 토글로 `viewMode` 전환(매트릭스 ↔ 달력), 달력에서 날짜/주 클릭 시 해당 주의 주간 매트릭스로 이동.
  - 라벨을 뷰에 맞게("N월 M주차" / "N년 M월") 전환.
  - _커밋: "feat: 주간/월간 토글 + 드릴다운"_ (요구사항 6-1·6-2·6-5·6-7)

## H. 사용자 설정

- [ ] **20. 하루 경계 시각 설정**
  - `SettingsModal`에서 하루 경계 시각(0~23) 편집 → `api/settings.upsert` 저장 → `logicalToday`/기본 날짜/오늘 강조에 즉시 반영.
  - 기본 뷰(week/month)도 함께 설정(선택).
  - _커밋: "feat: 하루 경계 시각 설정"_ (요구사항 9)

## I. 낙서장

- [ ] **21. 낙서장 CRUD**
  - `/notes`에서 메모 목록/생성/편집/삭제, `updated_at` 갱신.
  - _커밋: "feat: 낙서장"_ (요구사항 7)

## J. 내보내기 & 마무리

- [ ] **22. CSV 내보내기**
  - 전체 items(+카테고리명) 조회 → BOM 포함 UTF-8 CSV → 다운로드, 필드 이스케이프.
  - _커밋: "feat: CSV 내보내기"_ (요구사항 8)

- [ ] **23. 빈 상태 / 에러 처리 다듬기**
  - 카테고리 0개 안내, 조회 실패 재시도, 변경 실패 롤백/토스트.
  - _커밋: "polish: 빈 상태 + 에러 처리"_ (요구사항 2-5, design 6)

- [ ] **24. UI 다듬기 (design 8)**
  - 여백·정보 위계·색 절제 점검, 오늘 열/칸 강조, 항목 색 점, hover/포커스 상태, 로딩 스켈레톤 적용.
  - 주간 매트릭스와 월간 달력 시각 일관성 확인.
  - _커밋: "polish: UI 다듬기"_ (요구사항 비기능 9, design 8)

- [ ] **25. Vercel 배포**
  - Vercel 프로젝트 연결 + 환경변수 등록, 구글 OAuth 리다이렉트 URL에 배포 도메인 추가, 배포 확인.
  - _커밋: "chore: Vercel 배포 설정"_ (design 7)

---

### 진행 순서 요약
셋업(A) → DB(B) → 인증(C) → 매트릭스 조회/렌더(D) → 항목 CRUD(E) →
카테고리(F) → 월간 달력·토글(G) → 설정(H) → 낙서장(I) → 내보내기/다듬기/배포(J)

가장 까다로운 D(8~12)를 인증 직후 우선 완성해 프로젝트 정체성(주간 매트릭스)을 먼저 세운다.
월간 달력(G)은 매트릭스가 자리 잡은 뒤 별도 표현 계층으로 얹는다.
UI 토큰은 셋업(2번)에서 심고, 마지막 다듬기(24번)에서 전체 일관성을 맞춘다.


---

# 확장 태스크 (v2)

v1(1~24) 구현 완료, 25(배포)는 보류 중. 아래는 "종합 다이어리" 확장 작업이다.
설계 원칙과 매핑은 requirements v2 / design v2 참고. 위험 낮은 순으로 단계화했다.

## K. 정보구조 정리 (스키마 무변경, 즉효)

- [ ] **26. 카테고리를 설정으로 이동 + 기본 시드**
  - 상단 nav "카테고리" 제거 → SettingsModal 안 "카테고리" 섹션으로 이동.
  - 진입 시 카테고리 0개면 `ensureDefaultCategory()`로 "할일" 자동 생성.
  - _커밋: "feat: 카테고리 관리 설정으로 이동 + 기본 카테고리"_ (요구사항 15)

- [ ] **27. 월간 뷰 카테고리 필터**
  - 월간 헤더에 카테고리 다중 선택 필터, 선택된 카테고리만 요약 표시(표시 전용).
  - _커밋: "feat: 월간 카테고리 필터"_ (요구사항 16)

## L. 항목 승격 (핵심 리팩터)

- [ ] **28. items 스키마 확장 + 정렬**
  - `start_time time null`, `participants text[]` 추가(마이그레이션, 재실행 안전).
  - 조회/셀맵 정렬을 `start_time nulls last, sort_order, created_at`로 통일.
  - _커밋: "feat(db): items 시간·참가자 + 정렬 규칙"_ (요구사항 12·13, design v2-1·v2-2)

- [ ] **29. subtasks 테이블 + API**
  - `subtasks` 생성 + RLS 4종 + 인덱스, `api/subtasks.ts`(listByItem/create/update/remove/reorder).
  - _커밋: "feat(db): subtasks 스키마 + API"_ (요구사항 11)

- [ ] **30. 항목 상세 패널(골격)**
  - 항목 클릭 → 드로어/시트. 내용·완료·시작 시각·참가자 태그 편집(낙관적+롤백).
  - _커밋: "feat: 항목 상세 패널"_ (요구사항 10·12·13)

- [ ] **31. 서브태스크 체크리스트 UI**
  - 상세 안 서브태스크 추가/토글/삭제 + 상위 항목 진행률(2/5) 배지.
  - _커밋: "feat: 서브태스크 체크리스트"_ (요구사항 11)

- [ ] **32. 셀/월간 시간·참가자 표시**
  - 셀에 시각(있으면)·진행률 배지, 월간 요약 정렬 일치, 참가자 칩(상세 우선).
  - _커밋: "feat: 시간/참가자/진행률 표시"_ (요구사항 12·13)

## M. 메모 연동

- [ ] **33. notes 연결(item_id) + 낙서장 필터**
  - `notes.item_id` 추가 + 1:1 unique, `listNotes`는 독립 메모만, 지연 생성 함수.
  - _커밋: "feat(db): notes 항목 연결 + 지연 생성"_ (요구사항 14)

- [ ] **34. 상세 내 연결 메모 인라인 에디터**
  - 상세에서 "메모 작성"→생성, 이후 인라인 편집(updated_at 갱신).
  - _커밋: "feat: 항목 연결 메모"_ (요구사항 14)

- [ ] **35. 메모 체크리스트 삽입(경량)**
  - 에디터에서 커서 위치에 `- [ ] ` 삽입하는 액션.
  - _커밋: "feat: 메모 체크리스트 삽입"_ (요구사항 14-4)

## N. 부가

- [ ] **36. 환경설정 통합/확장**
  - SettingsModal 섹션화(일반/카테고리/데이터/피드백), (선택) 테마.
  - _커밋: "feat: 환경설정 통합"_ (요구사항 17-1)

- [ ] **37. 경량 피드백 폼**
  - `feedback` 테이블+RLS, `api/feedback.ts`, 설정 내 문의 폼.
  - _커밋: "feat: 피드백 폼"_ (요구사항 17-2)

## O. 미래 (지금 구현하지 않음)
- Edge Function 기반 좁은 AI: 자연어 항목 추가 / 주간 회고 요약. (백엔드 도입 명분 생기는 시점)
- 대량 데이터 페이지네이션, E2E 암호화, 앱/위젯(PWA→Capacitor→네이티브 순).
