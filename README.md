# Weekgrid — 주간 매트릭스 플래너

카테고리(행) × 날짜(열) **2차원 격자**로 일정을 관리하는 웹 플래너.
일반 캘린더의 "날짜 = 칸 하나"가 아니라, 엑셀 주간계획표 · 불렛저널에 가까운 매트릭스가 핵심 정체성이다.
캘린더 + 할일 + 플래너 + 다이어리를 한 화면 위계로 묶는 것을 지향한다.

배포: https://weekgrid.vercel.app

---

## 핵심 특징

- **주간 매트릭스**: 카테고리(행) × 그 주 7일(열) 격자. 셀마다 항목을 세로로 나열.
- **월간 개요 뷰**: 같은 데이터를 평범한 달력 그리드로 전환. 날짜 클릭 시 그 주의 주간 뷰로 드릴다운.
- **항목 상세 패널**: 항목 클릭 시 우측 드로어에서 완료·시작 시각·참가자 태그·세부 체크리스트·연결 메모를 한곳에서 편집.
- **하루 경계 시각(백준식 rollover)**: "오늘"이 넘어가는 시각을 사용자가 설정(예: 새벽 4시). 늦게 활동하는 패턴 지원.
- **연결 메모 / 낙서장**: 항목에 1:1로 묶이는 메모와, 독립적인 자유 메모(낙서장)를 구분.
- **CSV 내보내기**: 전체 항목을 UTF-8(BOM) CSV로 내려받아 엑셀에서 열람.
- **다기기 동기화**: 로그인 기반으로 여러 기기에서 같은 데이터 접근. 사용자 설정도 DB에 저장.

## 기술 스택

| 영역 | 사용 기술 |
|---|---|
| 프론트엔드 | React 19 + TypeScript |
| 빌드/개발 | Vite 8 |
| 스타일 | Tailwind CSS 4 (`@tailwindcss/vite`) |
| 라우팅 | react-router-dom 7 |
| 백엔드(BaaS) | Supabase (PostgreSQL + Auth + 자동 REST API) |
| 인증 | Supabase Auth (이메일/비밀번호, 구글 OAuth) |
| 보안 | PostgreSQL Row Level Security (RLS) — 사용자당 데이터 격리 |
| 테스트 | Vitest |
| 린트 | oxlint |
| 호스팅 | Vercel (정적 배포) |

> 서버 코드는 없다. 빌드 결과물(`dist/`)은 정적 파일이며 브라우저에서 실행되고, 데이터는 브라우저가
> Supabase로 직접 요청한다. 데이터 보안은 전적으로 RLS가 담당한다.

## 아키텍처 개요

```
[브라우저: React + Vite + Tailwind]
        │  supabase-js (anon key)
        ▼
[Supabase]  Auth + PostgreSQL(RLS) + 자동 REST API
        ▲
[Vercel]  dist/ 정적 파일 호스팅 (CDN)
```

- 모든 테이블에 `owner_id = auth.uid()` 기반 RLS 정책(select/insert/update/delete)이 걸려 있어
  로그인한 사용자는 자기 데이터만 접근한다.
- 브라우저에는 anon key만 노출된다(공개 전제). `service_role` key는 어디에도 두지 않는다.

## 데이터 모델 (요약)

| 테이블 | 역할 | 주요 컬럼 |
|---|---|---|
| `categories` | 매트릭스의 행 | name, color, sort_order |
| `items` | (카테고리, 날짜) 셀 안의 항목 | date, content, done, start_time, participants[] |
| `subtasks` | 항목에 종속된 세부 체크리스트 | item_id, content, done, sort_order |
| `notes` | 메모 (item_id null=낙서장, 값=연결 메모) | item_id, title, body |
| `user_settings` | 사용자당 1행 | day_rollover_hour, default_view |
| `feedback` | 경량 피드백/문의 | message |

전체 DDL + RLS 정책은 [`supabase/schema.sql`](supabase/schema.sql) 참고 (재실행 안전, idempotent).


## 사용법 개요

1. **회원가입/로그인** — 이메일+비밀번호 또는 구글.
2. **카테고리 설정** — 상단 "설정 → 카테고리"에서 행(카테고리)을 추가/삭제/순서변경. 신규 사용자는 기본 "할일" 카테고리가 자동 생성된다.
3. **항목 추가** — 셀을 클릭해 인라인 입력 후 Enter.
4. **항목 상세** — 항목을 클릭하면 우측 패널에서 완료·시작 시각·참가자·세부 체크리스트·메모 편집.
5. **주간/월간 전환** — 헤더 토글. 월간에서는 카테고리 필터로 특정 행만 볼 수 있고, 날짜 클릭 시 주간으로 드릴다운.
6. **하루 경계 시각** — 설정에서 "오늘"이 넘어가는 시각을 조정.
7. **낙서장** — 상단 "낙서장"에서 항목과 무관한 자유 메모.
8. **내보내기/피드백** — 설정의 데이터 탭에서 CSV 내보내기, 피드백 탭에서 의견 제출.

## 배포 (Vercel)

1. GitHub 리포를 Vercel에 Import (Vite 자동 감지).
2. 환경변수 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 등록 후 Deploy.
3. Supabase > Authentication > URL Configuration 의 Site URL / Redirect URLs 에 배포 도메인 추가.
4. (구글 로그인 시) Google OAuth 클라이언트의 Authorized redirect URI에 `https://<project-ref>.supabase.co/auth/v1/callback` 등록.

SPA 라우팅 폴백은 [`vercel.json`](vercel.json)의 rewrite로 처리된다(하위 경로 새로고침 시 404 방지).

## 프로젝트 구조

```
src/
├─ api/          Supabase 접근 래퍼 (categories, items, subtasks, notes, settings, feedback)
├─ components/   UI 컴포넌트 (MatrixGrid, MonthCalendar, ItemDetailPanel, SettingsModal 등)
├─ hooks/        useMatrixData (데이터 로딩/셀맵/진행률)
├─ lib/          순수 로직 (date, cellMap, csv, colors, supabase 클라이언트) + 단위 테스트
├─ pages/        LoginPage, MatrixPage, NotesPage
└─ App.tsx       라우팅 + 인증 가드
supabase/schema.sql   전체 DB 스키마 + RLS
```

## 로드맵 (향후, 미구현)

- Edge Function 기반 좁은 AI(자연어 항목 추가, 주간 회고 요약)
- 대량 데이터 페이지네이션, PWA / 앱 · 위젯


## 개발 / 크레딧

- **개발 보조**: [Kiro](https://kiro.dev) CLI (AI 에이전트) — 스펙 작성부터 구현·리팩터·문서화까지 페어 프로그래밍.
- **백엔드(BaaS)**: [Supabase](https://supabase.com) — PostgreSQL + Auth + 자동 REST API + RLS.
- **호스팅**: [Vercel](https://vercel.com) — `dist/` 정적 배포(CDN) + GitHub 연동 자동 배포.
