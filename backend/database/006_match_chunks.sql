-- Module 2: Vector similarity search function for retrieval
-- Run this in Supabase SQL Editor

create or replace function match_chunks(
    query_embedding vector(1536),
    match_count int default 5,
    filter_user_id uuid default null,
    min_similarity float default 0.7
)
returns table (
    id uuid,
    document_id uuid,
    content text,
    chunk_index int,
    metadata jsonb,
    similarity float
)
language plpgsql
as $$
begin
    return query
    select
        c.id,
        c.document_id,
        c.content,
        c.chunk_index,
        c.metadata,
        1 - (c.embedding <=> query_embedding) as similarity
    from chunks c
    where c.user_id = filter_user_id
        and 1 - (c.embedding <=> query_embedding) >= min_similarity
    order by c.embedding <=> query_embedding
    limit match_count;
end;
$$;
