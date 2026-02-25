-- Module 1: Messages table for persisting chat history
-- Run this in Supabase SQL Editor

create table public.messages (
    id uuid primary key default uuid_generate_v4(),
    thread_id uuid not null references public.threads(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check (role in ('user', 'assistant')),
    content text not null,
    created_at timestamptz not null default now()
);

create index idx_messages_thread_id on public.messages(thread_id);
create index idx_messages_user_id on public.messages(user_id);

alter table public.messages enable row level security;

create policy "Users can view their own messages"
    on public.messages for select using (auth.uid() = user_id);
create policy "Users can create their own messages"
    on public.messages for insert with check (auth.uid() = user_id);
create policy "Users can delete their own messages"
    on public.messages for delete using (auth.uid() = user_id);
