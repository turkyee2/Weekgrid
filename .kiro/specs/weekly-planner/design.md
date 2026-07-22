# 설계 (Design)

## 1. 아키텍처 개요

서버 코드 없이 프론트엔드(React) + BaaS(Supabase)만으로 구성한다.

```
[브라우저: React + Vite + Tailwind]
        │  supabase-js (anon key)
        ▼
[Supabase]
  ├─ Auth (이메일/구글)
  └─ PostgreSQL + RLS (categories, items, notes)
        │
[Vercel] ← 정적 빌드 결과물 호스팅
```

### 도구 역할 (처음 쓰는 도구 한 줄 설명)
- **Vite**: React 개발 서버 + 프로덕션 번들러. 빠른 로컬 개발과 빌드를 담당한다.
- **Tailwind CSS**: 클래스 이름으로 스타일을 붙이는 CSS 프레임워크. 별도 CSS 파일을 거의 쓰지 않는다.
- **Supabase**: PostgreSQL DB + 인증 + 자동 생성 REST/SDK를 제공하는 BaaS. 우리 백엔드 역할을 대신한다.
- **supabase-js**: 브라우저에서 Supabase에 접근하는 클라이언트 라이브러리. anon key로 초기화한다.
- **Vercel**: Vite 빌드 결과물을 배포·호스팅하는 플랫폼.

### 보안 모델 (핵심)
- 브라우저에는 **anon key만** 노출된다. anon key로는 아무 데이터나 못 읽는다 — 실제 데이터 격리는 **RLS**가 강제한다.
- 모든 테이블에 `owner_id = auth.uid()` 조건 정책을 걸어, 로그인한 사용자는 자기 행만 접근한다.
- `service_role` key는 클라이언트/저장소 어디에도 두지 않는다.

---

## 2. 데이터 모델

### 2.1 초안 검토 및 개선안

초안은 거의 그대로 사용해도 좋다. 다음 개선만 반영한다.

| 항목 | 초안 | 개선안 | 이유 |
|---|---|---|---|
| `items.date` 타입 | (미지정) | `date` (시각 없음) | 셀의 축은 "날짜"이므로 timestamp 불필요. 타임존 버그 방지. |
| `sort_order` 범위 | 전역? | 셀 단위 `(category_id, date)` 안에서의 순서 | 셀 안에서만 정렬하면 됨. 다른 셀과 비교할 필요 없음. |
| 카테고리 삭제 | (미지정) | `items.category_id` FK에 `ON DELETE CASCADE` | 요구사항 5-2/5-4: 카테고리 삭제 시 항목 함께 삭제(+경고). |
| `owner_id` | 있음 | `auth.users(id)` 참조 + `ON DELETE CASCADE` + `default auth.uid()` | 계정 삭제 시 정리, insert 시 자동 채움 → 실수 방지. |
| `categories` 갱신시각 | 없음 | (선택) 유지 안 함 | 지금 필요 없음. 과도한 추상화 회피. |
| `notes` 구조 | title+body 리스트 | 그대로(여러 메모 허용) | "낙서장 페이지"에 여러 메모 나열 가능. |

> 참고: 별도 `weeks`/`dates` 테이블은 만들지 않는다. 날짜는 `items.date` 하나로 충분하며,
> 주/월 범위는 클라이언트에서 계산한다(3장 참고). 지금 필요 없는 확장 포인트는 만들지 않는다.

### 2.2 최종 스키마

```
categories
  id          uuid  PK  default gen_random_uuid()
  owner_id    uuid  NOT NULL  default auth.uid()  → auth.users(id) ON DELETE CASCADE
  name        text  NOT NULL
  color       text  NOT NULL  default '#94a3b8'
  sort_order  int   NOT NULL  default 0
  created_at  timestamptz NOT NULL default now()

items
  id           uuid PK default gen_random_uuid()
  owner_id     uuid NOT NULL default auth.uid() → auth.users(id) ON DELETE CASCADE
  category_id  uuid NOT NULL → categories(id) ON DELETE CASCADE
  date         date NOT NULL                 -- 셀의 날짜 축 (YYYY-MM-DD)
  content      text NOT NULL default ''
  sort_order   int  NOT NULL default 0       -- 같은 (category_id, date) 안에서의 순서
  done         bool NOT NULL default false
  created_at   timestamptz NOT NULL default now()
  updated_at   timestamptz NOT NULL default now()

notes
  id          uuid PK default gen_random_uuid()
  owner_id    uuid NOT NULL default auth.uid() → auth.users(id) ON DELETE CASCADE
  title       text NOT NULL default ''
  body        text NOT NULL default ''
  updated_at  timestamptz NOT NULL default now()

user_settings                              -- 사용자당 1행 (owner_id가 PK)
  owner_id          uuid PK → auth.users(id) ON DELETE CASCADE  default auth.uid()
  day_rollover_hour int  NOT NULL default 0   -- 하루 경계 시각 0~23 (백준식)
  default_view      text NOT NULL default 'week'  -- 'week' | 'month' (진입 시 기본 뷰)
  updated_at        timestamptz NOT NULL default now()
```

**인덱스 (조회 성능):**
- `items (owner_id, date)` — 주/월 범위 조회의 핵심 인덱스.
- `categories (owner_id, sort_order)` — 행 순서대로 조회.

### 2.3 DDL + RLS (Supabase SQL Editor에서 실행)

각 테이블은 **생성 직후 RLS 활성화 + 4개 정책(select/insert/update/delete)**을 함께 만든다.

```sql
-- ── categories ──────────────────────────────────────────────
create table categories (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid()
             references auth.users(id) on delete cascade,
  name       text not null,
  color      text not null default '#94a3b8',
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);
create index categories_owner_sort_idx on categories (owner_id, sort_order);

alter table categories enable row level security;

create policy "categories: 본인 select" on categories
  for select using (auth.uid() = owner_id);
create policy "categories: 본인 insert" on categories
  for insert with check (auth.uid() = owner_id);
create policy "categories: 본인 update" on categories
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "categories: 본인 delete" on categories
  for delete using (auth.uid() = owner_id);

-- ── items ───────────────────────────────────────────────────
create table items (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid()
              references auth.users(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  date        date not null,
  content     text not null default '',
  sort_order  int  not null default 0,
  done        bool not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index items_owner_date_idx on items (owner_id, date);

alter table items enable row level security;

create policy "items: 본인 select" on items
  for select using (auth.uid() = owner_id);
create policy "items: 본인 insert" on items
  for insert with check (auth.uid() = owner_id);
create policy "items: 본인 update" on items
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "items: 본인 delete" on items
  for delete using (auth.uid() = owner_id);

-- ── notes ───────────────────────────────────────────────────
create table notes (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid()
             references auth.users(id) on delete cascade,
  title      text not null default '',
  body       text not null default '',
  updated_at timestamptz not null default now()
);

alter table notes enable row level security;

create policy "notes: 본인 select" on notes
  for select using (auth.uid() = owner_id);
create policy "notes: 본인 insert" on notes
  for insert with check (auth.uid() = owner_id);
create policy "notes: 본인 update" on notes
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "notes: 본인 delete" on notes
  for delete using (auth.uid() = owner_id);

-- ── user_settings (사용자당 1행) ─────────────────────────────
create table user_settings (
  owner_id          uuid primary key default auth.uid()
                    references auth.users(id) on delete cascade,
  day_rollover_hour int  not null default 0
                    check (day_rollover_hour between 0 and 23),
  default_view      text not null default 'week'
                    check (default_view in ('week','month')),
  updated_at        timestamptz not null default now()
);

alter table user_settings enable row level security;

create policy "user_settings: 본인 select" on user_settings
  for select using (auth.uid() = owner_id);
create policy "user_settings: 본인 insert" on user_settings
  for insert with check (auth.uid() = owner_id);
create policy "user_settings: 본인 update" on user_settings
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "user_settings: 본인 delete" on user_settings
  for delete using (auth.uid() = owner_id);
```

> `owner_id`가 `default auth.uid()`이므로 클라이언트는 insert 시 `owner_id`를 보내지 않아도 된다.
> 명시적으로 보내더라도 `with check`가 남의 id로의 삽입을 막는다.
> `user_settings`는 최초 진입 시 행이 없을 수 있으므로, 클라이언트는 조회 결과가 없으면
> 기본값(rollover=0, view='week')을 사용하고, 사용자가 처음 저장할 때 `upsert`로 1행을 만든다.

---

## 3. 매트릭스 / 달력 데이터 흐름 (핵심)

이 프로젝트에서 가장 까다로운 부분. 핵심 통찰은 다음과 같다.

> **어떤 뷰든 결국 하나의 날짜 범위 `[start, end]`에 대한 항목 집합일 뿐이다.**
> **조회·인덱싱 계층은 완전히 공유하고, 표현 계층만 두 갈래로 나뉜다:**
> - **주간 뷰** = 카테고리(행) × 7일(열) **매트릭스** (상세)
> - **월간 뷰** = 주(월~일)를 세로로 쌓은 **평범한 달력 그리드** (개요)

즉 데이터는 하나의 파이프라인(`범위 계산 → fetch → buildCellMap`)으로 모으고,
그 결과를 주간이면 `MatrixGrid`, 월간이면 `MonthCalendar`가 서로 다르게 그린다.
월간을 위해 매트릭스를 가로로 늘리지 않는다.

### 3.1 상태 (React 기본 상태만 사용)

```
viewMode   : 'week' | 'month'      // 주간(매트릭스) / 월간(달력)
anchorDate : Date                  // 기준일 (이 날이 속한 주/월을 표시)
categories : Category[]            // sort_order 순
items      : Item[]                // 현재 범위의 항목들 (원본 배열)
settings   : { dayRolloverHour, defaultView }   // user_settings 1행 (없으면 기본값)
loading, error
```

`viewMode`, `anchorDate`, `settings`가 "입력"이고 나머지(범위·셀맵·논리적 오늘)는 파생된다.

### 3.2 논리적 오늘 (`logicalToday`) — 하루 경계 시각

"오늘"은 벽시계 날짜가 아니라 사용자가 정한 하루 경계 시각(H)으로 판정한다(요구사항 9, 백준식).

```
logicalToday(now, H):                 // H = settings.dayRolloverHour (0~23)
  shifted = now - H시간               // 경계 시각 이전이면 전날로 당겨짐
  return formatDate(shifted)          // 'YYYY-MM-DD' (로컬 기준)

예) H=4 일 때
  07-22 02:00 → 02:00 - 4h = 07-21 22:00 → "07-21" (아직 어제)
  07-22 05:00 → 05:00 - 4h = 07-22 01:00 → "07-22" (오늘)
```

이 값은 **저장된 항목 날짜를 바꾸지 않고**, 다음에만 쓰인다:
(a) 앱 진입 시 `anchorDate` 초기값, (b) "오늘" 칸 하이라이트, (c) 항목 추가 시 기본 날짜.

### 3.3 범위 계산 (`buildDateRange`)

상수 하나로 주 시작 요일을 고정한다: `const WEEK_START = 1; // 1 = 월요일`

```
buildDateRange(viewMode, anchorDate) -> { start, end, dates[], monthStart?, monthEnd? }

week 모드 (매트릭스):
  start = anchorDate가 속한 주의 시작일(월요일)
  end   = start + 6일
  dates = [start ... end]                       // 7개 (매트릭스 열)

month 모드 (달력 그리드):
  monthStart = anchorDate가 속한 달의 1일
  monthEnd   = 그 달의 말일
  start = monthStart가 속한 주의 월요일          // 앞쪽 이웃 달 며칠 포함
  end   = monthEnd가 속한 주의 일요일            // 뒤쪽 이웃 달 며칠 포함
  dates = [start ... end]                        // 항상 7의 배수 (35 또는 42개)
  → 렌더 시 7개씩 끊어 주(행) 단위로 배치.
    monthStart~monthEnd 밖의 날짜는 "이웃 달"로 흐리게 표시(요구사항 6-6).
```

> 월간에서 fetch 범위는 `monthStart~monthEnd`가 아니라 **화면에 보이는 `start~end`(그리드 전체)**
> 이다. 달력 앞뒤에 걸친 이웃 달 날짜 칸의 항목도 함께 보여야 하기 때문이다.

> **타임존 주의:** 날짜는 문자열 `'YYYY-MM-DD'`로만 다룬다.
> `new Date('2026-07-20')`는 UTC로 해석되어 하루 밀릴 수 있으므로,
> DB의 `date`와 비교/키 생성에는 항상 로컬 기준 `formatDate(d) -> 'YYYY-MM-DD'`
> (연/월/일을 직접 조합) 결과를 사용한다. WSL/Vercel 서버 타임존과 무관하게 동작해야 한다.

### 3.4 조회 (fetch)

`anchorDate`, `viewMode`, 또는 `settings`가 바뀔 때마다:

```
1) { start, end, dates, monthStart, monthEnd } = buildDateRange(viewMode, anchorDate)
2) categories: select * from categories
                order by sort_order  (owner_id는 RLS가 자동 필터)
3) items:      select * from items
                where date >= start and date <= end   // RLS로 owner 자동 필터
```

- `owner_id = ...` 조건을 클라이언트에서 붙일 필요가 없다. RLS가 이미 본인 행만 반환한다.
- 주간은 7일, 월간은 최대 42일치 항목을 한 번에 받는다. 개인용 규모에서 페이지네이션 불필요.
- `settings`는 앱 진입 시 한 번 조회하고, 변경 시에만 다시 반영한다(범위 재조회 트리거는 아님).

### 3.5 셀 인덱싱 (`buildCellMap`)

가져온 `items` 배열을 셀 단위로 묶어 O(1) 조회용 맵을 만든다. 이 맵은 주간·월간 **양쪽이 공유**한다.

```
key(categoryId, dateStr) = `${categoryId}|${dateStr}`

buildCellMap(items):
  map = new Map()
  for it in items:
    k = key(it.category_id, it.date)
    map.get(k) ?? map.set(k, [])  // 배열 확보
    map.get(k).push(it)
  // 셀 안 정렬: sort_order asc, 동률이면 created_at asc
  for arr in map.values():
    arr.sort((a,b) => a.sort_order - b.sort_order
                      || a.created_at.localeCompare(b.created_at))
  return map
```

### 3.6 렌더링 — 두 갈래

같은 `cellMap`을 입력받아 뷰에 따라 다른 컴포넌트가 그린다.

**(A) 주간 = `MatrixGrid` (카테고리 × 7일 매트릭스)**
```
<table>  (또는 CSS grid)
  헤더행: [카테고리] + dates(7개).map(d => 날짜/요일 헤더)   // logicalToday 열 하이라이트
  categories.map(cat =>
    <tr>
      <th>{cat.name}</th>
      dates.map(d =>
        <Cell items={cellMap.get(key(cat.id, format(d))) ?? []}
              onAddItem / onEditItem />        // 빈 셀도 클릭 가능
      )
    </tr>
  )
```
- 7열 고정이라 가로 스크롤이 거의 필요 없다. 첫 열(카테고리명)은 `sticky left-0`.

**(B) 월간 = `MonthCalendar` (평범한 달력 그리드)**
```
요일 헤더: 월 화 수 목 금 토 일
weeks = chunk(dates, 7)                        // 5~6개의 주(행)
weeks.map(week =>
  <tr>  // 한 주 = 한 행
    week.map(d =>
      <DayCell date={d}
               inMonth={monthStart <= d <= monthEnd}   // 밖이면 흐리게 (6-6)
               isToday={format(d) === logicalToday}
               items={그 날짜의 모든 항목}                // 카테고리 무관, 아래 참고
               onClick={() => 해당 주의 주간 뷰로 드릴다운 (6-5)} />
    )
  </tr>
)
```
- **날짜별 항목 모으기:** `cellMap`은 (카테고리|날짜) 키다. 월간 칸은 카테고리를 가로지르므로
  `dayItems(dateStr) = categories.flatMap(c => cellMap.get(key(c.id, dateStr)) ?? [])`로 그날 전체를 모은다.
  (원한다면 `items`에서 `date`별로 한 번 더 묶은 `dayMap`을 만들어도 된다.)
- 각 항목은 소속 카테고리 색 점/막대로 표시하고, 칸이 넘치면 상위 N개만 보이고 `+M`으로 축약(6-4).
- 날짜(또는 주) 클릭 → `viewMode='week'`, `anchorDate=그 날짜`로 전환해 매트릭스로 드릴다운.

### 3.7 주/월 이동

```
이전/다음 (week):  anchorDate = addDays(anchorDate, ±7)
이전/다음 (month): anchorDate = addMonths(anchorDate, ±1)
"오늘로":           anchorDate = parseDate(logicalToday)   // 하루 경계 시각 반영
```
`anchorDate`가 바뀌면 3.4 fetch가 다시 돌아 새 범위 데이터를 그린다.

### 3.8 상단 라벨

```
week 모드:  weekLabel(rangeStart)          // rangeStart = 그 주의 월요일
  month     = rangeStart.getMonth() + 1
  weekOfMon = Math.ceil(rangeStart.getDate() / 7)
  => `${month}월 ${weekOfMon}주차`
month 모드: `${year}년 ${month}월`          // monthStart 기준
```
> "주차" 정의는 관용적으로 흔들리므로 **"그 주 월요일이 그 달의 몇 번째 주에 속하는가"**로
> 고정한다(단순·예측 가능). 필요하면 이후 조정.

### 3.9 항목 추가 시 `sort_order` 결정

```
새 항목의 sort_order = 해당 셀 현재 항목들의 max(sort_order) + 1  (없으면 0)
기본 date = logicalToday (또는 사용자가 클릭한 셀/날짜)
```
셀 안에서만 유효하면 되므로 전역 정합성은 신경 쓰지 않는다.
(항목 간 드래그 재정렬은 이번 범위 밖 — 요구사항에서 제외.)

### 3.10 낙관적 업데이트 정책

개인용·단일 세션 전제이므로 단순하게 간다.
- 추가/수정/삭제: Supabase 호출 후 성공 응답으로 로컬 `items` 상태를 갱신(재fetch 없이 로컬 반영).
- 실패 시: 에러 토스트 표시 + 로컬 상태 롤백(또는 해당 범위 재fetch).

---

## 4. 화면 / 라우팅 구조

```
/login            로그인 (미인증 시 강제 이동)
/                 매트릭스 (주간/월간 토글, 주 이동, 항목 CRUD, 카테고리 관리 진입)
/notes            낙서장 목록/편집
```
- 라우팅은 `react-router-dom` 최소 구성.
- 인증 가드: 세션 없으면 `/login`으로. `supabase.auth.onAuthStateChange`로 세션 반영.

### 컴포넌트 트리 (얕게 유지)
```
App
├─ AuthGate                 // 세션 확인, 미인증 시 Login
├─ MatrixPage               // settings + 범위 데이터 로딩(3.4), viewMode에 따라 아래 분기
│  ├─ ViewHeader            // 라벨(3.8), 이전/다음/오늘, 주간·월간 토글, 설정 진입
│  ├─ MatrixGrid            // [주간] categories × 7일 매트릭스 (3.6-A)
│  │  └─ Cell               // 셀별 항목 목록 + 추가 트리거
│  ├─ MonthCalendar         // [월간] 주=행 달력 그리드 (3.6-B)
│  │  └─ DayCell            // 날짜 칸: 카테고리색 요약 + "+N", 클릭 시 주간 드릴다운
│  ├─ ItemEditor            // 항목 추가/편집/삭제 (모달 또는 인라인)
│  ├─ CategoryManager       // 추가/삭제/순서변경
│  ├─ SettingsModal         // 하루 경계 시각(0~23) 등 user_settings 편집 (요구사항 9)
│  └─ ExportButton          // CSV 내보내기
└─ NotesPage
   ├─ NoteList
   └─ NoteEditor
```

주간·월간은 `MatrixPage`가 로딩한 동일한 `categories`/`items`/`cellMap`을 공유하고,
`viewMode`에 따라 `MatrixGrid` 또는 `MonthCalendar` 하나만 렌더한다.

### 데이터 접근 레이어 (`src/api/`)
컴포넌트에서 supabase를 직접 부르지 않고 얇은 함수로 감싼다(테스트/변경 용이, 과도한 추상화는 지양).
```
lib/supabase.ts          // createClient(anon)
api/categories.ts        // list / create / remove / reorder
api/items.ts             // listByRange(start,end) / create / update / remove
api/notes.ts             // list / create / update / remove
api/settings.ts          // get() (없으면 기본값) / upsert(patch)
```

---

## 5. CSV 내보내기 설계

- 클라이언트에서 `items`(+`categories`로 이름 조인) 전체를 조회해 CSV 문자열 생성.
- 열: `category, date, content, done` (+ 필요 시 `sort_order`).
- 한글 깨짐 방지: 문자열 앞에 **BOM(`\uFEFF`)**을 붙이고 `Blob([...], {type:'text/csv;charset=utf-8'})` → `URL.createObjectURL` → `<a download>`.
- 필드 이스케이프: 값에 `,` `"` 개행이 있으면 `"`로 감싸고 내부 `"`는 `""`로 치환.
- (선택) 낙서장은 별도 CSV로 분리 내보내기.

---

## 6. 에러 / 예외 처리

- **인증 만료**: 401/세션 만료 감지 시 `/login`으로 유도.
- **네트워크 실패**: 조회 실패 시 재시도 버튼이 있는 에러 상태, 변경 실패 시 롤백 + 토스트.
- **빈 상태**: 카테고리 0개(요구사항 2-5) → 카테고리 추가 유도. 항목 0개 셀 → 빈 클릭 영역.
- **삭제 확인**: 카테고리 삭제(항목 cascade)는 반드시 확인 다이얼로그(요구사항 5-4).

---

## 7. 환경변수 / 배포

`.env` (루트, `.gitignore`에 포함):
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...   # 브라우저 노출 전제. RLS가 보안을 담당.
```
- Vercel 프로젝트 환경변수에 동일 값 등록.
- 구글 로그인: Supabase Auth의 Google provider 설정 + 리다이렉트 URL(로컬/Vercel 도메인) 등록 필요.

---

## 8. UI / 비주얼 디자인 가이드

목표: **주간 매트릭스가 주인공**인, 여백이 넉넉하고 정보 위계가 분명한 깔끔한 화면.
장식보다 가독성. 모든 스타일은 Tailwind 유틸리티로 구현하고, 색/간격은 아래 토큰을 따른다.

### 8.1 원칙
- **한 화면 = 한 목적**: 상단 헤더(주 이동·토글·설정) + 본문 격자. 크롬(테두리·그림자)은 최소화.
- **위계**: 카테고리명·요일 헤더는 약하게(회색), 항목 텍스트는 진하게. 색은 카테고리 구분에만 절제해서 사용.
- **일관된 간격 스케일**: 4px 배수(`p-1 p-2 p-3 p-4`). 셀 내부 패딩·항목 간격을 통일.
- **경계선은 얇고 연하게**: 격자선은 `border-slate-200`. 굵은 테두리·강한 그림자 지양.

### 8.2 디자인 토큰
```
폰트     : 시스템 폰트 스택 (Pretendard 있으면 우선). 본문 14px, 헤더 라벨 13px, 주 제목 18px semibold
중립색   : bg-white / 표면 bg-slate-50 / 경계 slate-200 / 본문 slate-800 / 보조 slate-400
포인트   : 오늘 열·버튼 강조 1색만 (예: indigo-600). 남발 금지
카테고리 : color 필드(HEX). 기본 팔레트 8색 프리셋 제공(슬레이트/레드/앰버/그린/틸/블루/바이올렛/핑크)
           → 항목 앞 색 점(dot) 또는 좌측 얇은 색 바(border-l-2)로만 표현. 배경 전체를 칠하지 않는다
반경     : rounded-md (카드·버튼), 셀은 각지게
상태색   : done → 취소선 + slate-400, 에러 → red-500 텍스트/토스트
```

### 8.3 주간 매트릭스 레이아웃
- 좌측 첫 열(카테고리명) `sticky left-0`, 배경 `bg-slate-50`로 본문과 구분.
- 요일 헤더 행 `sticky top-0`. 오늘 열은 헤더+열 배경을 아주 옅은 포인트색(`bg-indigo-50`)으로.
- 셀: 세로로 항목 나열, 항목은 한 줄(줄넘침 시 말줄임 `truncate`), 앞에 카테고리 색 점.
- 빈 셀: 평소엔 비어 있고 hover 시 옅은 배경 + `＋` 아이콘 노출(클릭 유도).
- 항목 hover 시 살짝 배경 변화로 클릭 가능함을 암시.

### 8.4 월간 달력 레이아웃
- 7열 균등 그리드, 한 주 = 한 행. 요일 헤더는 회색.
- 이웃 달 날짜 칸은 `text-slate-300`으로 흐리게, 오늘 칸은 날짜 숫자에 포인트색 원형 배경.
- 날짜 칸 내부: 상단에 날짜 숫자, 아래 항목 2~3개를 카테고리색 점+짧은 텍스트로, 초과분은 `+N`.
- 칸 전체가 클릭 타깃(주간 드릴다운). hover 시 옅은 배경.

### 8.5 상호작용 / 피드백
- 항목 추가·편집은 가벼운 모달 또는 인라인 입력. 저장은 낙관적 반영(3.10) → 즉각적인 느낌.
- 로딩: 전체 스피너 대신 격자 스켈레톤(회색 블록)으로 레이아웃 흔들림 방지.
- 삭제·파괴적 동작은 확인 다이얼로그. 실패 시 우하단 토스트.
- 버튼/입력은 키보드 포커스 링 유지(접근성), 클릭 영역 최소 32px.

### 8.6 반응형
- 데스크톱 우선(엑셀 대체가 목적). 태블릿까지 매트릭스 7열 유지.
- 좁은 화면에서 주간 매트릭스가 넘치면 본문만 가로 스크롤(첫 열 고정 유지). 헤더는 접힘 없이 유지.

> 컴포넌트 UI 라이브러리는 지금 도입하지 않는다(과도한 의존 회피). 필요해지면 headless 수준(예: Radix)만 검토.

---

## 9. 향후 확장 여지 (지금 구현하지 않음)

- 팀/공유: `owner_id`를 소유자로 두고, 별도 멤버십/공유 테이블을 추가하면 RLS 정책 확장으로 대응 가능. 현재 구조를 바꾸지 않아도 된다.
- Realtime, 오프라인, 항목 드래그 재정렬(fractional index)은 필요 시 추가.
