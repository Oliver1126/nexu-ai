// ──────────────────────────────────────────────────────────────
// Drop-in replacement for `createClient` from '@supabase/supabase-js'.
// When NEXT_PUBLIC_DEMO_MODE=true, returns an in-memory demo client
// (seed data, no backend) so the dashboard renders for screenshots /
// demos without a live Supabase project. Otherwise, the real client.
// ──────────────────────────────────────────────────────────────
import { createClient as createRealClient } from '@supabase/supabase-js'
import { createDemoClient } from './demo-client'

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

export function createClient(url?: string, key?: string) {
    if (DEMO_MODE) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return createDemoClient() as any
    }
    return createRealClient(url as string, key as string)
}
