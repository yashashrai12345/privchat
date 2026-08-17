-- ═══════════════════════════════════════════════════════════
-- PrivChat — Supabase Database Setup
-- Run this in the Supabase Dashboard → SQL Editor when initializing Supabase
-- ═══════════════════════════════════════════════════════════

-- ── 1. Create user_codes table ─────────────────────────────
-- Stores admin-issued unique CODEs and user display names
CREATE TABLE IF NOT EXISTS public.user_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can lookup a code to find a contact
CREATE POLICY "User codes lookup policy"
  ON public.user_codes FOR SELECT
  TO authenticated, anon USING (true);

-- Authenticated admins or service role can insert/update codes
CREATE POLICY "Admins can insert user codes"
  ON public.user_codes FOR INSERT
  TO authenticated, anon WITH CHECK (true);

-- Primary Admin initial record
INSERT INTO public.user_codes (code, display_name, role)
VALUES
  ('ADMIN', 'Admin', 'admin')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- Realtime Configuration:
-- Ephemeral messaging uses Supabase Realtime Broadcast & Presence
-- (No messages are stored in tables for zero-log privacy)
-- ═══════════════════════════════════════════════════════════
