-- Module 2: Chunks table with pgvector embeddings
-- Run this in Supabase SQL Editor

-- Enable pgvector extension (Supabase has it pre-installed)
create extension if not exists vector;

create table public.chunks (
    id uuid primary key default uuid_generate_v4(),
    document_id uuid not null references public.documents(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    content text not null,
    chunk_index integer not null,
    embedding vector(1536),
    metadata jsonb default '{}',
    created_at timestamptz not null default now()
);

create index idx_chunks_document_id on public.chunks(document_id);
create index idx_chunks_user_id on public.chunks(user_id);

-- IVFFlat index for approximate nearest neighbor search
-- Note: This index needs data to work well. With <1000 rows, exact search is fine.
-- The index will be used automatically by Postgres when querying with <=> operator.
-- lists=100 is a good starting point; tune based on data size.
create index idx_chunks_embedding on public.chunks
    using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table public.chunks enable row level security;

create policy "Users can view their own chunks"
    on public.chunks for select using (auth.uid() = user_id);
create policy "Users can create their own chunks"
    on public.chunks for insert with check (auth.uid() = user_id);
create policy "Users can delete their own chunks"
    on public.chunks for delete using (auth.uid() = user_id);
