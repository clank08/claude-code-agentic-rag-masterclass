# Settings Dialog — Design Doc

## Goal

Add a settings dialog accessible from the sidebar footer that lets users configure their LLM provider and model. Settings persist per-user in Supabase and override server defaults.

## Data Model

New `user_settings` table — one row per user, upsert on save:

```sql
create table public.user_settings (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null unique references auth.users(id) on delete cascade,
    llm_base_url text,        -- null = use server default
    llm_model text,           -- null = use server default
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
```

- `null` values mean "use the server default from env vars"
- RLS: users can only read/write their own row

## Backend

**New router:** `backend/app/routers/settings.py`

- `GET /api/settings` — returns user's settings (or empty defaults if none saved)
- `PUT /api/settings` — upserts `llm_base_url` and `llm_model`
- `GET /api/settings/defaults` — returns server default model and base_url (for placeholder text)

**Chat integration:** Chat router loads user settings before calling `llm_service`. If user has custom model/base_url, those override env var defaults for that request. If null, server defaults apply.

## Frontend

**Trigger:** Gear icon button in sidebar footer, next to user email and logout button.

**Dialog contents:**

1. **Provider dropdown** — presets:
   - OpenRouter (`https://openrouter.ai/api/v1`) — default
   - OpenAI (`https://api.openai.com/v1`)
   - Custom — reveals a text input for any base URL

2. **Model dropdown** — changes based on selected provider:
   - **OpenRouter:** `anthropic/claude-sonnet-4`, `openai/gpt-4.1`, `google/gemini-2.5-flash`, etc.
   - **OpenAI:** `gpt-4.1`, `gpt-4.1-mini`, `o4-mini`, etc.
   - **Custom provider:** free-text only
   - Each dropdown includes a "Custom" option revealing a text input

3. **Save button** — calls `PUT /api/settings`
4. **Reset to defaults** — clears overrides (sets both to null)

**State management:** No global context needed. Dialog fetches settings on open, saves on submit. Backend resolves settings server-side so the chat hook is unchanged.
