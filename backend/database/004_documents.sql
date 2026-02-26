-- Module 2: Documents table for tracking uploaded files
-- Run this in Supabase SQL Editor

create table public.documents (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    filename text not null,
    storage_path text not null,
    mime_type text not null,
    file_size bigint not null,
    status text not null default 'pending'
        check (status in ('pending', 'processing', 'completed', 'failed')),
    error_message text,
    chunk_count integer default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_documents_user_id on public.documents(user_id);

alter table public.documents enable row level security;

create policy "Users can view their own documents"
    on public.documents for select using (auth.uid() = user_id);
create policy "Users can create their own documents"
    on public.documents for insert with check (auth.uid() = user_id);
create policy "Users can update their own documents"
    on public.documents for update
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own documents"
    on public.documents for delete using (auth.uid() = user_id);

-- Reuse the update_updated_at_column function from 001_threads.sql
create trigger update_documents_updated_at
    before update on public.documents
    for each row execute function public.update_updated_at_column();
