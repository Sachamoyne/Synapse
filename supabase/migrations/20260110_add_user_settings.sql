create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_new_per_day integer not null default 20,
  default_reviews_per_day integer not null default 9999,
  default_display_order text not null default 'mixed' check (default_display_order in ('mixed', 'oldFirst', 'newFirst')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_settings_user_id on user_settings(user_id);

alter table user_settings enable row level security;

create policy user_settings_select_own on user_settings
  for select using (auth.uid() = user_id);

create policy user_settings_insert_own on user_settings
  for insert with check (auth.uid() = user_id);

create policy user_settings_update_own on user_settings
  for update using (auth.uid() = user_id);

create policy user_settings_delete_own on user_settings
  for delete using (auth.uid() = user_id);

create or replace function update_user_settings_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger user_settings_updated_at
  before update on user_settings
  for each row
  execute function update_user_settings_updated_at();
