import { createClient } from '@supabase/supabase-js'
import { createDemoClient } from './demo-client'

// When DEMO_MODE is on, this returns the in-memory demo client (seed data,
// no backend) so the app renders without a real Supabase project.
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

/**
 * Server-only admin client — uses the service_role key, bypasses RLS.
 * Only call this inside API route handlers, NEVER in browser code.
 * Used by the public /apply flow to insert a candidate on the applicant's
 * behalf (applicants aren't logged-in Supabase users).
 */
export function getSupabaseAdmin() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (DEMO_MODE) return createDemoClient() as any
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    )
}
