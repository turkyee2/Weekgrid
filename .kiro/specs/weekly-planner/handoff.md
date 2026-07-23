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

## 7. 주의사항 / 함정

- **스키마 변경 시**: 항상 `supabase/schema.sql`에 idempotent 구문(`add column if not exists`,
  `create table if not exists`, `drop policy if exists` 후 create)으로 추가하고 대시보드에서 재실행.
  코드가 새 컬럼/테이블을 조회하는데 DB 미적용이면 "데이터를 불러오지 못했습니다" 에러 발생.
- **환경변수**: Vercel에도 `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` 등록돼 있어야 하며,
  변경 시 Redeploy 해야 반영(빌드 시 번들에 구워짐).
- **공휴일 데이터**: `src/lib/holidays.ts`는 2024~2027만 음력·대체공휴일 정확. 이후 연도 보정 필요.
- **비밀키**: `.env`는 gitignore로 커밋 안 됨. `service_role` key는 절대 프론트/저장소에 두지 말 것
  (현재 anon key만 사용).
