'use client'

import CloudApp from '@/components/CloudApp'
import LocalApp from '@/components/LocalApp'
import { isCloudConfigured } from '@/lib/supabase'

// With Supabase keys configured the app runs as the shared, invite-only family network.
// Without them it falls back to the single-device version (localStorage).
export default function Home() {
  return isCloudConfigured ? <CloudApp /> : <LocalApp />
}
