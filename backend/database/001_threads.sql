-- Module 1: Threads table for conversation management
-- Run this in Supabase SQL Editor

create extension if not exists "uuid-ossp";

create table public.threads (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    openai_response_id text,  -- last response ID in chain (null until first message)
    title text not null default 'New Chat',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_threads_user_id on public.threads(user_id);

alter table public.threads enable row level security;

create policy "Users can view their own threads"
    on public.threads for select using (auth.uid() = user_id);
create policy "Users can create their own threads"
    on public.threads for insert with check (auth.uid() = user_id);
create policy "Users can update their own threads"
    on public.threads for update
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own threads"
    on public.threads for delete using (auth.uid() = user_id);

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger update_threads_updated_at
    before update on public.threads
    for each row execute function public.update_updated_at_column();
