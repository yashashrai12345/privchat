import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL || ''
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawKey &&
  !rawUrl.includes('your-supabase-project-url') &&
  !rawKey.includes('your-supabase-anon-key') &&
  (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))
)

const safeUrl = isSupabaseConfigured ? rawUrl : 'https://placeholder-project.supabase.co'
const safeKey = isSupabaseConfigured ? rawKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder'

if (!isSupabaseConfigured) {
  console.warn(
    'PrivChat: Supabase is not configured yet. ' +
    'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local and run supabase-setup.sql in your Supabase SQL editor.'
  )
}

export const supabase = createClient(safeUrl, safeKey)

