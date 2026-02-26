# Progress

Track your progress through the masterclass. Update this file as you complete modules - Claude Code reads this to understand where you are in the project.

## Convention
- `[ ]` = Not started
- `[-]` = In progress
- `[x]` = Completed

## Modules

### Module 1: App Shell + Observability
- [x] Task 1: Project Scaffolding (backend + frontend + env vars)
- [x] Task 2: Database Schema (threads table with RLS — SQL ready, run in Supabase)
- [x] Task 3: Backend Core (config, supabase client, auth middleware, schemas)
- [x] Task 4: LangSmith + OpenAI Integration (wrap_openai, streaming via Responses API)
- [x] Task 5: Backend API Endpoints (threads CRUD, chat SSE, health, CORS)
- [x] Task 6: Frontend Auth (supabase client, auth context, login/signup, router)
- [x] Task 7: Frontend Chat UI (API helpers, SSE, hooks, sidebar, chat components)
- [x] Task 8: Integration Testing & Cleanup

### Module 2: BYO Retrieval + Memory
- [x] Task 1: Update config for generic LLM providers
- [x] Task 2: Rewrite LLM service (Responses API → Chat Completions)
- [x] Task 3: Update chat router with history loading and tool call loop
- [x] Task 4: Update frontend SSE handler
- [x] Task 5: Database migration — drop openai_response_id
- [ ] Task 6: End-to-end chat validation (manual)
- [x] Task 7: Documents table
- [x] Task 8: Chunks table with pgvector
- [ ] Task 9: Supabase Storage bucket setup (manual)
- [x] Task 10: Embedding service
- [x] Task 11: Ingestion service (chunk + embed pipeline)
- [x] Task 12: Retrieval service (vector similarity search)
- [x] Task 13: Documents router (upload, list, delete)
- [x] Task 14: Frontend navigation (Chat ↔ Documents)
- [x] Task 15: Documents page with upload, list, realtime status
- [ ] Task 16: End-to-end ingestion + retrieval validation (manual)
