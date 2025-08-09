-- Empire MVP: Schema, enums, RLS, indexes, and views
-- Run in Supabase SQL editor or as a migration.
-- Note: Adjust NOT NULL constraints to your desired strictness.

-- Enums
create type status_long_term as enum ('planned','active','completed');
create type status_cycle as enum ('planned','active','completed');
create type goal_type as enum ('progressive','habitual');
create type goal_status as enum ('active','completed','archived');
create type habit_period as enum ('day','week');
create type task_status as enum ('todo','in_progress','done','skipped');
create type mission_type as enum ('highlight','habit','extra');

-- Tables
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text,
  long_term_months int,
  cycle_length_days int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  parent_id uuid references categories(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists long_terms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  start_date date,
  end_date date,
  status status_long_term not null default 'planned',
  created_at timestamptz default now()
);

create table if not exists cycles (
  id uuid primary key default gen_random_uuid(),
  long_term_id uuid not null references long_terms(id) on delete cascade,
  seq int not null,
  start_date date,
  end_date date,
  status status_cycle not null default 'planned',
  created_at timestamptz default now()
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  title text not null,
  description text,
  type goal_type not null,
  importance int check (importance between 1 and 5),
  effort_estimate_hours numeric,
  status goal_status not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals(id) on delete cascade,
  cycle_id uuid references cycles(id) on delete set null,
  title text not null,
  target_date date,
  order_index int,
  is_completed boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists habit_plans (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid unique not null references goals(id) on delete cascade,
  times_per_period int not null check (times_per_period between 1 and 14),
  period habit_period not null,
  preferred_days int[],
  created_at timestamptz default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references goals(id) on delete set null,
  milestone_id uuid references milestones(id) on delete set null,
  cycle_id uuid references cycles(id) on delete set null,
  parent_task_id uuid references tasks(id) on delete set null,
  title text not null,
  due_date date,
  estimated_hours numeric,
  status task_status not null default 'todo',
  is_generated boolean default false,
  importance int check (importance between 1 and 5),
  created_at timestamptz default now(),
  completed_at timestamptz
);

create table if not exists missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_id uuid references cycles(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,
  habit_plan_id uuid references habit_plans(id) on delete set null,
  mission_date date not null,
  type mission_type not null,
  is_highlight boolean default false,
  points int default 0,
  is_completed boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id uuid references missions(id) on delete set null,
  points int not null,
  reason text,
  occurred_at timestamptz default now()
);

-- Views
create or replace view user_points as
select user_id, coalesce(sum(points),0)::int as total_points
from points_ledger
group by user_id;

create or replace view empire_levels as
select
  up.user_id,
  up.total_points,
  greatest(1, floor(coalesce(up.total_points,0) / 100.0)::int + 1) as level
from user_points up;

-- Indexes
create index if not exists idx_categories_user on categories(user_id);
create index if not exists idx_goals_user on goals(user_id);
create index if not exists idx_tasks_user on tasks(user_id);
create index if not exists idx_missions_user_date on missions(user_id, mission_date);
create index if not exists idx_points_ledger_user on points_ledger(user_id);

-- Unique partial index: one highlight mission per user per day
drop index if exists uniq_highlight_per_user_per_day;
create unique index uniq_highlight_per_user_per_day
on missions(user_id, mission_date)
where type = 'highlight';

-- RLS
alter table profiles enable row level security;
alter table categories enable row level security;
alter table long_terms enable row level security;
alter table cycles enable row level security;
alter table goals enable row level security;
alter table milestones enable row level security;
alter table habit_plans enable row level security;
alter table tasks enable row level security;
alter table missions enable row level security;
alter table points_ledger enable row level security;

-- Policies: owner-only
create policy "profiles owner" on profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "categories owner" on categories for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "long_terms owner" on long_terms for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- cycles belong through long_terms; allow via join
create policy "cycles via long_terms" on cycles for all using (
  exists (select 1 from long_terms lt where lt.id = cycles.long_term_id and lt.user_id = auth.uid())
) with check (
  exists (select 1 from long_terms lt where lt.id = cycles.long_term_id and lt.user_id = auth.uid())
);
create policy "goals owner" on goals for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "milestones via goals" on milestones for all using (
  exists (select 1 from goals g where g.id = milestones.goal_id and g.user_id = auth.uid())
) with check (
  exists (select 1 from goals g where g.id = milestones.goal_id and g.user_id = auth.uid())
);
create policy "habit_plans via goals" on habit_plans for all using (
  exists (select 1 from goals g where g.id = habit_plans.goal_id and g.user_id = auth.uid())
) with check (
  exists (select 1 from goals g where g.id = habit_plans.goal_id and g.user_id = auth.uid())
);
create policy "tasks owner" on tasks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "missions owner" on missions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "points_ledger owner" on points_ledger for all using (user_id = auth.uid()) with check (user_id = auth.uid());
