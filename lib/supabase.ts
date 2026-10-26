import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const isCloudConfigured = Boolean(url && key)
const client: SupabaseClient | null = isCloudConfigured ? createClient(url!, key!) : null

export function getClient(): SupabaseClient {
  if (!client) throw new Error('Supabase is not configured (see SETUP.md)')
  return client
}
