-- Module 2: Remove OpenAI Responses API column from threads table
-- Run this in Supabase SQL Editor

ALTER TABLE public.threads DROP COLUMN IF EXISTS openai_response_id;
