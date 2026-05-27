-- ============================================================
-- Organizér — Notifications schema (přidat ke schema.sql)
-- ============================================================
-- Tabulka pro tracking poslaných notifikací (anti-duplicate)
-- a tabulka uživatelských nastavení (tichý čas, vypínač).
-- ============================================================

-- Trigger funkce (znovu, pro jistotu — create or replace je idempotentní).
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ============================================================
-- sent_notifications
-- Zaznamenává, kterou notifikaci jsme už odeslali, abychom ji
-- neposlali dvakrát. Primary key zajistí idempotenci.
-- ============================================================
create table if not exists public.sent_notifications (
  user_id      uuid not null references auth.users(id) on delete cascade,
  target_kind  text not null,    -- 'task' | 'event' | 'nameday' | 'birthday'
  target_id    text not null,    -- task.id / event.id / 'YYYY-MM-DD-name' pro nameday/birthday
  notif_kind   text not null,    -- '15min' | '1h' | '1d' | 'morning' | 'evening' | 'sameday'
  sent_at      timestamptz not null default now(),
  primary key (user_id, target_kind, target_id, notif_kind)
);

alter table public.sent_notifications enable row level security;
create policy sent_notifications_select on public.sent_notifications for select using (auth.uid() = user_id);
create policy sent_notifications_insert on public.sent_notifications for insert with check (auth.uid() = user_id);
create policy sent_notifications_delete on public.sent_notifications for delete using (auth.uid() = user_id);

-- ============================================================
-- notification_settings (per uživatel)
-- ============================================================
create table if not exists public.notification_settings (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  enabled        boolean not null default true,
  quiet_start    time default '22:00',
  quiet_end      time default '07:00',
  appointments   boolean not null default true,
  birthdays      boolean not null default true,
  namedays       boolean not null default true,
  tasks          boolean not null default true,
  others         boolean not null default true,
  updated_at     timestamptz not null default now()
);

alter table public.notification_settings enable row level security;
create policy notif_settings_select on public.notification_settings for select using (auth.uid() = user_id);
create policy notif_settings_insert on public.notification_settings for insert with check (auth.uid() = user_id);
create policy notif_settings_update on public.notification_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- updated_at trigger
create trigger notif_settings_updated_at before update on public.notification_settings
  for each row execute function public.set_updated_at();
