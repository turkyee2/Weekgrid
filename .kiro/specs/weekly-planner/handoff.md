# 이어가기 (Handoff) — 다음 작업 재개용

이 프로젝트를 나중에 다시 이어갈 때 빠르게 복귀하기 위한 문서. (2026-07-24 마무리 시점)

---

## 1. 지금 어디까지 됐나

- **v1 (핵심 매트릭스 플래너)**: 완료 — 인증, 주간 매트릭스, 항목 CRUD, 카테고리, 월간/토글,
  하루 경계 시각, 낙서장, CSV 내보내기, 에러/빈상태, UI 다듬기.
- **v2 (종합 다이어리 확장)**: 완료 — 항목 상세 패널, 서브태스크 체크리스트+진행률,
  시작 시각+참가자 태그, 항목 연결 메모(지연 생성)+체크리스트 삽입, 설정 탭 구조, 경량 피드백.
- **배포**: 완료 — https://weekgrid.vercel.app (Vercel 정적 배포 + GitHub 연동).
- **추가 피드백 반영**: 입력 바깥클릭 닫기, 셀 너비 고정, 중요도 색(accent), 공휴일 빨간색,
  메모 저장 단축키(Ctrl/Cmd+S), 시간 1분 단위, 패널 ESC 닫기.

상세 진행은 `tasks.md` 상단 요약과 `git log` 참고.

## 2. ⚠️ 재개 전 확인할 미완 조치

- **[중요] `items.accent` 마이그레이션 적용 여부 확인**: 중요도 색 기능은 이 컬럼이 있어야 저장됨.
  Supabase SQL Editor에서 실행(또는 `supabase/schema.sql` 전체 재실행):
  ```sql
  alter table items add column if not exists accent text;
  ```
- **[중요] v3 마이그레이션(기술부채 정리) 적용 여부 확인 (2026-07-27 추가)**:
  `schema.sql`의 "v3 마이그레이션" 블록 — 소유자 검증 복합 FK + `updated_at`
  자동 갱신 트리거. 코드(클라이언트)는 이미 이 트리거를 전제로 수동 타임스탬프
  세팅을 제거했으므로, **이 블록을 대시보드에서 실행하지 않으면 `updated_at`이
  더 이상 갱신되지 않는다**(트리거도 없고 클라이언트도 안 보냄). 전체 재실행이
  가장 안전.
- **로컬 커밋 push 여부 확인**: Vercel은 GitHub push 시 자동 배포됨. 마지막 작업 커밋들이
  `origin/main`에 올라가 배포에 반영됐는지 확인:
  ```bash
  git fetch origin && git status -sb   # ahead 표시가 있으면 git push 필요
  git push
  ```

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
현재 상태: 빌드·린트 0경고/0에러, 테스트 28개 통과.

## 4. 문서 지도 (.kiro/specs/weekly-planner/)

- `requirements.md` — 요구사항 1~9(v1) + 10~17(v2)
- `design.md` — 아키텍처·데이터모델·UI 가이드 + v2 확장 설계
- `tasks.md` — 태스크 목록 + 상단에 진행 현황
- `backlog.md` — **다음에 볼 것**: 논의 중 결정, 낙서장 로드맵, 향후 업데이트 후보(7장 A~E)

## 5. 다음에 이어가기 좋은 지점 (backlog 7장 요약)

추천 다음 배치: **① 전체 검색 → ② 완료 숨기기/필터 → ③ 드래그 재정렬 → ④ PWA.**
그 외 후보: 반복 항목, 마감일/D-day, 주간 대시보드, 아젠다 뷰, 리치 텍스트(TipTap),
실시간 동기화, 좁은 AI(Edge Function), 구글 캘린더 오버레이.

미해결 결정: **시간 입력 단위 1분 vs 5분** (현재 1분).

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
| Vercel 환경변수 | Vercel → Project → Settings → Environment Variables | `VITE_SUPABASE_URL`/`ANON_KEY` 등록됨. 변경 시 Redeploy 필요 |
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
- **비밀키**: `.env`는 gitignore로 커밋 안 됨. `service_role` key는 절대 프론트/저장소에 두지 말 것
  (현재 anon key만 사용).
