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
-- 셀 정렬(시각 오름차순, NULL 마지막)을 돕는 인덱스
create index if not exists items_owner_date_time_idx
  on items (owner_id, date, start_time);
