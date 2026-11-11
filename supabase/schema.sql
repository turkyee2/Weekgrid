-- ============================================================
-- 주간 플래너 스키마 + RLS
-- 적용 방법: Supabase 대시보드 > SQL Editor 에 이 파일 전체를 붙여넣고 실행(Run).
-- 원칙: 모든 테이블에 owner_id(auth.users 참조)를 두고 RLS를 활성화한다.
--       사용자는 자신의 owner_id 행만 select/insert/update/delete 할 수 있다.
-- owner_id 는 default auth.uid() 이므로 클라이언트는 insert 시 owner_id 를 보내지 않아도 된다.
-- ============================================================

-- ── categories : 매트릭스의 행(카테고리) ─────────────────────
create table if not exists categories (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid()
             references auth.users(id) on delete cascade,
  name       text not null,
  color      text not null default '#94a3b8',
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists categories_owner_sort_idx
  on categories (owner_id, sort_order);

alter table categories enable row level security;

drop policy if exists "categories: 본인 select" on categories;
drop policy if exists "categories: 본인 insert" on categories;
drop policy if exists "categories: 본인 update" on categories;
drop policy if exists "categories: 본인 delete" on categories;
create policy "categories: 본인 select" on categories
  for select using (auth.uid() = owner_id);
create policy "categories: 본인 insert" on categories
  for insert with check (auth.uid() = owner_id);
create policy "categories: 본인 update" on categories
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "categories: 본인 delete" on categories
  for delete using (auth.uid() = owner_id);

-- ── items : (카테고리, 날짜) 셀 안의 항목 ────────────────────
create table if not exists items (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid()
              references auth.users(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  date        date not null,                 -- 셀의 날짜 축 (YYYY-MM-DD)
  content     text not null default '',
  sort_order  int  not null default 0,       -- 같은 (category_id, date) 안에서의 순서
  done        bool not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists items_owner_date_idx
  on items (owner_id, date);

alter table items enable row level security;

drop policy if exists "items: 본인 select" on items;
drop policy if exists "items: 본인 insert" on items;
drop policy if exists "items: 본인 update" on items;
drop policy if exists "items: 본인 delete" on items;
create policy "items: 본인 select" on items
  for select using (auth.uid() = owner_id);
create policy "items: 본인 insert" on items
  for insert with check (auth.uid() = owner_id);
create policy "items: 본인 update" on items
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "items: 본인 delete" on items
  for delete using (auth.uid() = owner_id);

-- ── notes : 낙서장(자유 형식 메모) ───────────────────────────
create table if not exists notes (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid()
             references auth.users(id) on delete cascade,
  title      text not null default '',
  body       text not null default '',
  updated_at timestamptz not null default now()
);

alter table notes enable row level security;

drop policy if exists "notes: 본인 select" on notes;
drop policy if exists "notes: 본인 insert" on notes;
drop policy if exists "notes: 본인 update" on notes;
drop policy if exists "notes: 본인 delete" on notes;
create policy "notes: 본인 select" on notes
  for select using (auth.uid() = owner_id);
create policy "notes: 본인 insert" on notes
  for insert with check (auth.uid() = owner_id);
create policy "notes: 본인 update" on notes
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "notes: 본인 delete" on notes
  for delete using (auth.uid() = owner_id);

-- ── user_settings : 사용자당 1행(하루 경계 시각 등) ──────────
create table if not exists user_settings (
  owner_id          uuid primary key default auth.uid()
                    references auth.users(id) on delete cascade,
  day_rollover_hour int  not null default 0
                    check (day_rollover_hour between 0 and 23),  -- 하루 경계 시각(백준식)
  default_view      text not null default 'week'
                    check (default_view in ('week','month')),
  updated_at        timestamptz not null default now()
);

alter table user_settings enable row level security;

drop policy if exists "user_settings: 본인 select" on user_settings;
drop policy if exists "user_settings: 본인 insert" on user_settings;
drop policy if exists "user_settings: 본인 update" on user_settings;
drop policy if exists "user_settings: 본인 delete" on user_settings;
create policy "user_settings: 본인 select" on user_settings
  for select using (auth.uid() = owner_id);
create policy "user_settings: 본인 insert" on user_settings
  for insert with check (auth.uid() = owner_id);
create policy "user_settings: 본인 update" on user_settings
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "user_settings: 본인 delete" on user_settings
  for delete using (auth.uid() = owner_id);


-- ============================================================
-- v2 마이그레이션 (재실행 안전). 위 v1 스키마 이후에 이어서 실행한다.
-- ============================================================

-- ── items 확장: 시작 시각 + 참가자 태그 (요구사항 12·13) ─────
alter table items add column if not exists start_time time;
alter table items add column if not exists participants text[] not null default '{}';
-- 중요도 강조 색 key ('red'|'amber'|'blue') 또는 null (피드백 #3)
alter table items add column if not exists accent text;
-- 셀 정렬(시각 오름차순, NULL 마지막)을 돕는 인덱스
create index if not exists items_owner_date_time_idx
  on items (owner_id, date, start_time);
-- D-day 표시 여부. true면 매트릭스에서 이 항목의 date를 기준일로 D-N 배지를 보여준다.
alter table items add column if not exists show_dday bool not null default false;

-- ── subtasks : 항목에 종속된 세부 체크리스트 (요구사항 11) ────
create table if not exists subtasks (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid()
             references auth.users(id) on delete cascade,
  item_id    uuid not null references items(id) on delete cascade,
  content    text not null default '',
  done       bool not null default false,
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists subtasks_owner_item_sort_idx
  on subtasks (owner_id, item_id, sort_order);

alter table subtasks enable row level security;

drop policy if exists "subtasks: 본인 select" on subtasks;
drop policy if exists "subtasks: 본인 insert" on subtasks;
drop policy if exists "subtasks: 본인 update" on subtasks;
drop policy if exists "subtasks: 본인 delete" on subtasks;
create policy "subtasks: 본인 select" on subtasks
  for select using (auth.uid() = owner_id);
create policy "subtasks: 본인 insert" on subtasks
  for insert with check (auth.uid() = owner_id);
create policy "subtasks: 본인 update" on subtasks
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "subtasks: 본인 delete" on subtasks
  for delete using (auth.uid() = owner_id);

-- ── notes 확장: 항목 연결(1:1) (요구사항 14) ─────────────────
alter table notes add column if not exists item_id uuid
  references items(id) on delete cascade;
-- 항목당 연결 메모는 최대 1개(1:1). 독립 메모(item_id null)는 제한 없음.
create unique index if not exists notes_item_unique
  on notes(item_id) where item_id is not null;

-- ── feedback : 경량 피드백/문의 (요구사항 17-2) ──────────────
create table if not exists feedback (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid()
             references auth.users(id) on delete cascade,
  message    text not null,
  created_at timestamptz not null default now()
);

alter table feedback enable row level security;

-- ── 관리자 UID 저장소 (app.admin_uid GUC 대체) ───────────────────
-- 처음엔 `alter database postgres set app.admin_uid = ...` 세션 GUC로 구현했으나,
-- PostgREST가 Supavisor 커넥션 풀러를 거쳐 접속하기 때문에 풀이 재사용하는 기존
-- 커넥션에는 새 GUC 기본값이 반영되지 않아 계속 NULL로 보이는 문제가 있었다
-- (재연결 전까지 무기한 재현됨). 세션 상태 대신 실제 테이블을 읽도록 변경 —
-- 매 쿼리마다 조회하므로 풀링 여부와 무관하게 항상 최신 값을 본다.
create table if not exists app_settings (
  key   text primary key,
  value text
);
alter table app_settings enable row level security;
-- app_settings는 API로 직접 노출하지 않음(정책 없음 = 기본 전체 차단).
-- is_admin()이 security definer로 RLS를 우회해 읽는다.

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid()::text = (select value from app_settings where key = 'admin_uid');
$$;

-- 관리자 UID 값 설정(한 번만, Supabase SQL Editor에서 직접 — 값은
-- handoff.md 시크릿 표 참고, public 레포라 리터럴 커밋 안 함):
--   insert into app_settings (key, value) values ('admin_uid', '<내 UID>')
--   on conflict (key) do update set value = excluded.value;

drop policy if exists "feedback: 본인 select" on feedback;
drop policy if exists "feedback: 본인 또는 관리자 select" on feedback;
drop policy if exists "feedback: 본인 insert" on feedback;
-- 본인 것 또는 관리자(is_admin()) 조회 가능.
create policy "feedback: 본인 또는 관리자 select" on feedback
  for select using (
    auth.uid() = owner_id
    or is_admin()
  );
create policy "feedback: 본인 insert" on feedback
  for insert with check (auth.uid() = owner_id);


-- ============================================================
-- v3 마이그레이션 (재실행 안전). 기술부채 정리 — 소유자 FK 검증 + updated_at 트리거.
-- ⚠️ 복합 FK를 추가하기 전에 기존 데이터가 이미 정합성을 만족해야 한다
--    (items.owner_id가 참조하는 categories 행의 owner_id와 항상 같아야 함).
--    개인용 단일 사용자 데이터라면 보통 문제없지만, ALTER 가 실패하면
--    불일치 행을 먼저 정리해야 한다는 신호다.
-- ============================================================

-- ── 의존하는 복합 FK를 먼저 정리 ──────────────────────────────
-- 재실행 시 아래 unique 제약을 drop하려면 이걸 참조하는 FK가 먼저 없어야 한다
-- (이 순서가 아니면 "other objects depend on it" 에러로 재실행이 막힌다).
alter table items drop constraint if exists items_category_id_fkey;
alter table items drop constraint if exists items_category_id_owner_fkey;
alter table subtasks drop constraint if exists subtasks_item_id_fkey;
alter table subtasks drop constraint if exists subtasks_item_id_owner_fkey;

-- ── (id, owner_id) 복합 unique — 아래 복합 FK가 참조할 대상 ──────
alter table categories drop constraint if exists categories_id_owner_key;
alter table categories add constraint categories_id_owner_key unique (id, owner_id);

alter table items drop constraint if exists items_id_owner_key;
alter table items add constraint items_id_owner_key unique (id, owner_id);

-- ── items.category_id / subtasks.item_id: 소유자까지 검증하는 복합 FK 재생성 ──
alter table items add constraint items_category_id_owner_fkey
  foreign key (category_id, owner_id) references categories(id, owner_id)
  on delete cascade;

alter table subtasks add constraint subtasks_item_id_owner_fkey
  foreign key (item_id, owner_id) references items(id, owner_id)
  on delete cascade;

-- ── updated_at 자동 갱신 트리거 (items, notes) ───────────────────
-- 지금까지는 클라이언트가 매 update마다 updated_at 값을 직접 보냈다.
-- 이제 DB가 갱신을 책임지므로 클라이언트는 더 이상 이 값을 보내지 않아도 된다
-- (보내더라도 트리거가 now()로 덮어쓴다).
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists items_set_updated_at on items;
create trigger items_set_updated_at
  before update on items
  for each row execute function set_updated_at();

drop trigger if exists notes_set_updated_at on notes;
create trigger notes_set_updated_at
  before update on notes
  for each row execute function set_updated_at();


-- ============================================================
-- 낙서장 미리보기 비공개 (재실행 안전, backlog 2.4)
-- ============================================================

-- 메모별로 목록 미리보기(본문 스니펫)를 숨길지 선택. 숨기면 목록에 자물쇠
-- 표시만 하고 본문은 노출하지 않는다. (참고: 지금은 UI 표시만 가리는 것이고
-- 서버측 암호화는 아니다 — PIN 기반 암호화는 향후 후보, backlog 2.4 참고.)
alter table notes add column if not exists hide_preview bool not null default false;


-- ============================================================
-- 낙서장 1단계: 검색·정렬·고정 (재실행 안전, backlog 2장)
-- ============================================================

-- 자주 보는 메모를 목록 상단에 고정. 검색/정렬은 클라이언트에서 처리한다.
alter table notes add column if not exists pinned bool not null default false;


-- ============================================================
-- 낙서장 폴더 + 보관함 (재실행 안전, backlog 2.4)
-- ============================================================

-- 지금은 평평한 목록만 쓰지만, 나중에 트리로 확장할 여지를 남기기 위해
-- parent_id를 처음부터 넣어둔다(지금 UI는 항상 null로만 씀).
create table if not exists note_folders (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid()
             references auth.users(id) on delete cascade,
  name       text not null,
  sort_order int  not null default 0,
  is_archive bool not null default false,
  parent_id  uuid null references note_folders(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists note_folders_owner_sort_idx
  on note_folders (owner_id, sort_order);
-- 사용자당 보관함 폴더는 최대 1개
create unique index if not exists note_folders_one_archive_per_owner
  on note_folders (owner_id) where is_archive;

alter table note_folders enable row level security;

drop policy if exists "note_folders: 본인 select" on note_folders;
drop policy if exists "note_folders: 본인 insert" on note_folders;
drop policy if exists "note_folders: 본인 update" on note_folders;
drop policy if exists "note_folders: 본인 delete" on note_folders;
create policy "note_folders: 본인 select" on note_folders
  for select using (auth.uid() = owner_id);
create policy "note_folders: 본인 insert" on note_folders
  for insert with check (auth.uid() = owner_id);
create policy "note_folders: 본인 update" on note_folders
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "note_folders: 본인 delete" on note_folders
  for delete using (auth.uid() = owner_id);

-- notes.folder_id: 처음부터 소유자까지 검증하는 복합 FK로 생성한다
-- (items.category_id 때 단일 FK로 만들었다가 나중에 복합 FK로 바꾸느라 겪은
--  재실행 문제를 반복하지 않기 위해 — CLAUDE.md 기술부채 참고).
-- 폴더 삭제는 소속 메모를 지우지 않고 해제만 해야 하므로 ON DELETE 액션을
-- 걸지 않는다(애플리케이션이 삭제 전에 notes.folder_id를 먼저 null로 갱신).
alter table notes add column if not exists folder_id uuid null;

-- 재실행 시 복합 FK가 아래 unique 제약에 의존하므로, unique를 다시 만들려면
-- FK를 먼저 drop해야 한다("other objects depend on it" 에러 방지).
alter table notes drop constraint if exists notes_folder_id_owner_fkey;
alter table note_folders drop constraint if exists note_folders_id_owner_key;
alter table note_folders add constraint note_folders_id_owner_key unique (id, owner_id);
alter table notes add constraint notes_folder_id_owner_fkey
  foreign key (folder_id, owner_id) references note_folders(id, owner_id);


-- ============================================================
-- D-day 배너 고정 (재실행 안전, backlog 7-B)
-- ============================================================

-- show_dday(매트릭스 셀 배지 표시 여부)와 분리 — 이 값이 true인 항목만
-- 헤더 아래 상단 배너에 상시 노출된다. 기본은 꺼짐: D-day로 표시한다고
-- 자동으로 배너에 뜨지 않고, 사용자가 D-day 관리 화면에서 직접 골라야 뜬다.
-- 언제든 관리 화면에서 다시 켜고 끌 수 있다(되돌리기 없이 즉시 토글).
alter table items add column if not exists dday_pinned bool not null default false;


-- ============================================================
-- 월간 뷰 카테고리 필터 기억 (재실행 안전, backlog 8.2)
-- ============================================================

-- 월간 뷰에서 고른 카테고리 필터를 사용자별로 저장한다. 빈 배열 = 전체 표시
-- (CategoryFilter 의 "빈 배열 = 전체" 규약을 그대로 옮겨온 것).
-- localStorage 가 아니라 여기에 두는 이유: 기기(폰/PC)를 옮겨도 같은 필터가
-- 유지되게 하기 위함.
alter table user_settings
  add column if not exists month_category_filter text[] not null default '{}';


-- ============================================================
-- 항목 장소 (재실행 안전, backlog 9.5)
-- ============================================================

-- 항목 상세의 "장소" 한 줄. 참가자처럼 자유 텍스트이며 지도/주소 검증은 없다.
-- 비어 있으면 null (빈 문자열로 저장하지 않는다 — 클라이언트에서 trim 후 null 처리).
alter table items add column if not exists location text;


-- ============================================================
-- 주 시작 요일 (재실행 안전, backlog 7-A)
-- ============================================================

-- 0 = 일요일, 1 = 월요일(기본). JS Date.getDay() 값을 그대로 쓴다.
-- 기기를 옮겨도 같은 달력이 보여야 하므로 localStorage 가 아니라 여기에 둔다
-- (다크 모드는 기기별 취향이라 localStorage — lib/theme.ts 참고).
alter table user_settings
  add column if not exists week_start smallint not null default 1;
alter table user_settings drop constraint if exists user_settings_week_start_check;
alter table user_settings
  add constraint user_settings_week_start_check check (week_start in (0, 1));
