-- ============================================================
-- Organizér — Supabase schema (v1)
-- ============================================================
-- Spustit v Supabase SQL Editoru po vytvoření projektu.
-- Tvar dat odpovídá state v src/App.jsx (loadInitialState + reducer).
--
-- Konvence:
--  * Každá tabulka má user_id (auth.uid()) + RLS.
--  * Primary key = id (text), generovaný v klientovi přes uid() — kompatibilní
--    s existujícími lokálními daty (žádný remap při migraci z localStorage).
--  * updated_at slouží pro last-write-wins při real-time sync.
--  * camelCase z JS se mapuje na snake_case ve sloupcích.
-- ============================================================

-- Pomocná funkce: trigger pro updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ============================================================
-- categories (kanban sloupce úkolů)
-- ============================================================
create table if not exists public.categories (
  id          text not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  color       text not null,
  position    int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists categories_user_idx on public.categories(user_id);
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

-- ============================================================
-- tasks
-- shape: { id, title, categoryId, scheduledDate, time, notification, completed }
-- ============================================================
create table if not exists public.tasks (
  id              text not null,
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  category_id     text not null,
  scheduled_date  date,
  time            time,
  notification    text,                   -- '15min' | '1h' | '1d' | null
  completed       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, category_id)
    references public.categories(user_id, id) on delete cascade
);
create index if not exists tasks_user_idx     on public.tasks(user_id);
create index if not exists tasks_due_idx      on public.tasks(user_id, scheduled_date) where scheduled_date is not null;
create index if not exists tasks_notif_idx    on public.tasks(user_id, scheduled_date, time) where notification is not null and completed = false;
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- ============================================================
-- events
-- shape: { id, type, date, endDate, time, endTime, person, location, customLabel, notification }
--   type: 'appointment' | 'birthday' | 'other'
-- ============================================================
create table if not exists public.events (
  id            text not null,
  user_id       uuid not null references auth.users(id) on delete cascade,
  type          text not null check (type in ('appointment','birthday','other')),
  date          date not null,
  end_date      date,
  time          time,
  end_time      time,
  person        text not null,
  location      text,
  custom_label  text,
  notification  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists events_user_idx  on public.events(user_id);
create index if not exists events_date_idx  on public.events(user_id, date);
create index if not exists events_notif_idx on public.events(user_id, date, time) where notification is not null;
create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

-- ============================================================
-- event_subtypes (custom labely pro 'Ostatní', např. 'Klíště')
-- ============================================================
create table if not exists public.event_subtypes (
  user_id     uuid not null references auth.users(id) on delete cascade,
  label       text not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, label)
);

-- ============================================================
-- notes_day (poznámka per kalendářní den; state.notes[YYYY-MM-DD])
-- ============================================================
create table if not exists public.notes_day (
  user_id     uuid not null references auth.users(id) on delete cascade,
  day         date not null,
  text        text not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, day)
);
create trigger notes_day_updated_at before update on public.notes_day
  for each row execute function public.set_updated_at();

-- ============================================================
-- mini_notes (Poznámky view — masonry lístečky)
-- shape: { id, title, body, pinned, createdAt }
-- ============================================================
create table if not exists public.mini_notes (
  id          text not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text,
  body        text not null default '',
  pinned      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists mini_notes_user_idx on public.mini_notes(user_id, pinned desc, created_at desc);
create trigger mini_notes_updated_at before update on public.mini_notes
  for each row execute function public.set_updated_at();

-- ============================================================
-- people (jmeniny + narozeniny)
-- shape: { id, name, surname, nameDay (MM-DD), birthday (YYYY-MM-DD) }
-- ============================================================
create table if not exists public.people (
  id          text not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  surname     text,
  name_day    text,                   -- 'MM-DD' jako text (ne datum — rok není určen)
  birthday    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, id),
  constraint name_day_format check (name_day is null or name_day ~ '^[0-1][0-9]-[0-3][0-9]$')
);
create index if not exists people_user_idx on public.people(user_id);
create trigger people_updated_at before update on public.people
  for each row execute function public.set_updated_at();

-- ============================================================
-- anniversaries (výročí — zapamatovaný okamžik po skončené události)
-- shape: { id, title, originalDate, meta, message, sourceType, sourceEventId, savedAt }
-- ============================================================
create table if not exists public.anniversaries (
  id              text not null,
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  original_date   date not null,
  meta            text,
  message         text,
  source_type     text not null,     -- 'appointment' | 'other' (nikdy birthday)
  source_event_id text,
  saved_at        timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists anniversaries_user_idx on public.anniversaries(user_id, original_date);
create trigger anniversaries_updated_at before update on public.anniversaries
  for each row execute function public.set_updated_at();

-- ============================================================
-- asked_event_ids (eventy, na které už AnniversaryPrompt zobrazil otázku)
-- Lokálně to je array; v cloudu raději set řádků kvůli optimistic update.
-- ============================================================
create table if not exists public.asked_events (
  user_id   uuid not null references auth.users(id) on delete cascade,
  event_id  text not null,
  asked_at  timestamptz not null default now(),
  primary key (user_id, event_id)
);

-- ============================================================
-- feature_marks (state.featureMarks — key/value)
-- např. anniversariesEnabledAt: timestamp
-- ============================================================
create table if not exists public.feature_marks (
  user_id   uuid not null references auth.users(id) on delete cascade,
  key       text not null,
  value     jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
create trigger feature_marks_updated_at before update on public.feature_marks
  for each row execute function public.set_updated_at();

-- ============================================================
-- push_subscriptions (per zařízení; jeden user může mít víc)
-- ============================================================
create table if not exists public.push_subscriptions (
  id           uuid not null default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  endpoint     text not null,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (id),
  unique (user_id, endpoint)
);
create index if not exists push_sub_user_idx on public.push_subscriptions(user_id);

-- ============================================================
-- RLS — Row Level Security
-- ============================================================
alter table public.categories         enable row level security;
alter table public.tasks              enable row level security;
alter table public.events             enable row level security;
alter table public.event_subtypes     enable row level security;
alter table public.notes_day          enable row level security;
alter table public.mini_notes         enable row level security;
alter table public.people             enable row level security;
alter table public.anniversaries      enable row level security;
alter table public.asked_events       enable row level security;
alter table public.feature_marks      enable row level security;
alter table public.push_subscriptions enable row level security;

-- Generická policy: vlastník čte i zapisuje jen svoje řádky.
-- (žádná "ALL"/anon policy — globální CLAUDE.md pravidlo)
do $$
declare
  t text;
  tables text[] := array[
    'categories','tasks','events','event_subtypes','notes_day',
    'mini_notes','people','anniversaries','asked_events',
    'feature_marks','push_subscriptions'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format('drop policy if exists %I_insert on public.%I', t, t);
    execute format('drop policy if exists %I_update on public.%I', t, t);
    execute format('drop policy if exists %I_delete on public.%I', t, t);

    execute format(
      'create policy %I_select on public.%I for select using (auth.uid() = user_id)',
      t, t);
    execute format(
      'create policy %I_insert on public.%I for insert with check (auth.uid() = user_id)',
      t, t);
    execute format(
      'create policy %I_update on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t, t);
    execute format(
      'create policy %I_delete on public.%I for delete using (auth.uid() = user_id)',
      t, t);
  end loop;
end $$;

-- ============================================================
-- Real-time publication (postgres_changes přes supabase-js)
-- ============================================================
-- Supabase má default publication 'supabase_realtime'. Přidáme tabulky.
do $$
declare
  t text;
  tables text[] := array[
    'categories','tasks','events','event_subtypes','notes_day',
    'mini_notes','people','anniversaries','asked_events','feature_marks'
  ];
begin
  foreach t in array tables loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then
      null;
    end;
  end loop;
end $$;
