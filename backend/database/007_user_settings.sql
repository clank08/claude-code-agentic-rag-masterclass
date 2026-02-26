-- Settings Dialog: User settings table for per-user LLM configuration
-- Run this in Supabase SQL Editor

create table public.user_settings (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null unique references auth.users(id) on delete cascade,
    llm_base_url text,
    llm_model text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_user_settings_user_id on public.user_settings(user_id);

alter table public.user_settings enable row level security;

create policy "Users can view their own settings"
    on public.user_settings for select using (auth.uid() = user_id);
create policy "Users can create their own settings"
    on public.user_settings for insert with check (auth.uid() = user_id);
create policy "Users can update their own settings"
    on public.user_settings for update
    using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Service role needs to read user settings for chat requests
create policy "Service role can read all settings"
    on public.user_settings for select using (true);

create trigger update_user_settings_updated_at
    before update on public.user_settings
    for each row execute function public.update_updated_at_column();
