# Module 2: BYO Retrieval + Memory — Design Document

**Date:** 2026-02-25
**Status:** Approved

## Overview

Module 2 transitions from OpenAI's managed Responses API to the standard Chat Completions API, enabling any OpenAI-compatible provider (OpenRouter, Ollama, LM Studio, vLLM). It also adds the document ingestion pipeline: upload → chunk → embed → pgvector, with tool-based retrieval during chat.

## Key Decisions

1. **Option A: Replace** — Remove Responses API entirely, rebuild on Chat Completions
2. **Thin wrapper** — OpenAI SDK with configurable `base_url`, no provider abstraction layer
3. **Env-var config** — All provider/model settings via environment variables, no UI
4. **Load-and-send history** — Full message history loaded from Supabase per request
5. **Tool calling for retrieval** — LLM decides when to search via `search_documents` tool
6. **Backend-mediated upload** — Files go through backend to Supabase Storage
7. **Separate embedding config** — LLM and embedding providers can differ
8. **Separate /documents route** — Ingestion UI on its own page with sidebar navigation

---

## Section 1: LLM Provider Migration

### Config Changes (`config.py`)

Replace OpenAI-specific settings with generic LLM settings:

| Old | New | Default |
|-----|-----|---------|
| `openai_api_key` | `llm_api_key` | (required) |
| `openai_model` | `llm_model` | `anthropic/claude-sonnet-4` |
| (none) | `llm_base_url` | `https://openrouter.ai/api/v1` |
| (none) | `llm_system_prompt` | Sensible RAG assistant default |
| `openai_vector_store_id` | (removed) | — |

### Service Changes (`openai_service.py` → `llm_service.py`)

- `AsyncOpenAI(base_url=settings.llm_base_url, api_key=settings.llm_api_key)`
- Wrapped with `wrap_openai` for LangSmith tracing (still works — wraps the SDK client)
- New signature: `stream_chat_response(messages: list[dict], user_id: str)`
- Uses `client.chat.completions.create(model=..., messages=..., stream=True, tools=...)`
- Yields: `("text_delta", token)`, `("tool_call", tool_call_data)`, `("done", None)`, `("error", msg)`
- No more `response_id` — completion just signals done

### Chat Router Changes (`chat.py`)

- Before calling LLM: query `messages` table for thread, format as Chat Completions messages array
- Prepend system prompt from `settings.llm_system_prompt`
- Include tool definitions (search_documents) in the request
- Handle tool call responses: execute search, send results back to LLM, continue streaming
- Remove all `openai_response_id` / `previous_response_id` logic
- `done` SSE event sends only `thread_id`

### Frontend Impact

Minimal. The `onDone` callback stops receiving `response_id` (already unused client-side for anything meaningful).

---

## Section 2: Database Schema

### Migration: `003_drop_openai_response_id.sql`

```sql
ALTER TABLE public.threads DROP COLUMN openai_response_id;
```

### New Table: `004_documents.sql`

```sql
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

-- RLS policies: users only see their own documents
-- Trigger: auto-update updated_at (reuse existing function)
```

### New Table: `005_chunks.sql`

```sql
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
create index idx_chunks_embedding on public.chunks
    using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table public.chunks enable row level security;

-- RLS policies: users only see their own chunks
```

### Supabase Storage

- Create `documents` bucket
- File path: `{user_id}/{document_id}/{filename}`

---

## Section 3: Ingestion Pipeline

### Upload Flow

1. **Frontend** — File picker / drag-and-drop → `POST /api/documents/upload` (multipart)
2. **Backend** — Validate type/size → store in Supabase Storage → create `documents` row (`status: 'pending'`)
3. **Background task** (`asyncio.create_task`):
   - Status → `'processing'`
   - Download file from storage
   - Extract text (plain text for Module 2; PDF/DOCX/HTML added in Module 5)
   - Chunk text (fixed-size with overlap)
   - Generate embeddings (batch call to embedding endpoint)
   - Insert chunks with embeddings into `chunks` table
   - Update document: `status: 'completed'`, `chunk_count: N`
   - On error: `status: 'failed'`, `error_message: "..."`
4. **Realtime** — Supabase Realtime pushes `documents` table changes to frontend

### New Backend Services

- **`services/embedding_service.py`** — Generate embeddings via OpenAI-compatible API
- **`services/ingestion_service.py`** — Chunking + processing pipeline
- **`services/retrieval_service.py`** — Vector search (cosine similarity)

### New Router

- **`routers/documents.py`** — `POST /upload`, `GET /`, `DELETE /{id}`

### Chunking Config

| Env Var | Default | Purpose |
|---------|---------|---------|
| `CHUNK_SIZE` | 1000 | Characters per chunk |
| `CHUNK_OVERLAP` | 200 | Overlap between chunks |

---

## Section 4: Retrieval via Tool Calling

### Tool Definition

```python
tools = [{
    "type": "function",
    "function": {
        "name": "search_documents",
        "description": "Search uploaded documents for relevant information",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query to find relevant document chunks"
                }
            },
            "required": ["query"]
        }
    }
}]
```

### Execution Flow

1. Send messages + tools to LLM
2. If LLM returns a tool call → execute `search_documents`:
   - Embed the query using embedding service
   - Query pgvector: `SELECT content, 1 - (embedding <=> query_embedding) as score FROM chunks WHERE user_id = ... ORDER BY embedding <=> query_embedding LIMIT k`
   - Filter by score threshold
   - Return matched chunks as tool result
3. Send tool result back to LLM
4. LLM generates final response incorporating retrieved context

### Retrieval Config

| Env Var | Default | Purpose |
|---------|---------|---------|
| `RETRIEVAL_TOP_K` | 5 | Max chunks returned |
| `RETRIEVAL_SCORE_THRESHOLD` | 0.7 | Min similarity score |

---

## Section 5: Frontend — Ingestion UI

### New Route

- `/documents` — ProtectedRoute, separate page

### Navigation

- Sidebar gets icons/links for Chat and Documents

### Documents Page Components

- **FileUploadZone** — Drag-and-drop + click to browse, shows upload progress
- **DocumentList** — Table showing: filename, status badge, chunk count, upload date, delete button
- **Realtime subscription** — Subscribe to `documents` table changes for live status updates

### Chat Page Updates

- Remove `response_id` from SSE `onDone` handling (no longer sent by backend)

---

## Section 6: Environment Variables Summary

```env
# LLM Provider (replaces OPENAI_*)
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=sk-or-...
LLM_MODEL=anthropic/claude-sonnet-4
LLM_SYSTEM_PROMPT="You are a helpful assistant..."

# Embedding
EMBEDDING_BASE_URL=https://api.openai.com/v1
EMBEDDING_API_KEY=sk-...
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536

# Ingestion
CHUNK_SIZE=1000
CHUNK_OVERLAP=200

# Retrieval
RETRIEVAL_TOP_K=5
RETRIEVAL_SCORE_THRESHOLD=0.7
```

---

## Files Changed / Created

### Modified
- `backend/app/config.py` — New LLM + embedding + ingestion settings
- `backend/app/routers/chat.py` — Load history, tool calling loop, remove response_id
- `backend/app/main.py` — Register documents router
- `backend/app/models/schemas.py` — New document/upload schemas
- `backend/requirements.txt` — Add any new deps (if needed)
- `backend/.env.example` — New env vars
- `frontend/src/router.tsx` — Add /documents route
- `frontend/src/components/layout/app-sidebar.tsx` — Add nav links
- `frontend/src/hooks/use-chat.ts` — Minor: remove response_id from onDone
- `frontend/src/lib/sse.ts` — No changes needed
- `frontend/.env.example` — No changes needed

### Renamed
- `backend/app/services/openai_service.py` → `backend/app/services/llm_service.py`

### Created
- `backend/app/services/embedding_service.py`
- `backend/app/services/ingestion_service.py`
- `backend/app/services/retrieval_service.py`
- `backend/app/routers/documents.py`
- `backend/database/003_drop_openai_response_id.sql`
- `backend/database/004_documents.sql`
- `backend/database/005_chunks.sql`
- `frontend/src/pages/documents.tsx`
- `frontend/src/hooks/use-documents.ts`
- `frontend/src/components/documents/file-upload-zone.tsx`
- `frontend/src/components/documents/document-list.tsx`
