import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Simplified from the shared NodalNexus app's middleware — that version also
// had a "recruit-only mode" toggle to show just this feature inside a bigger
// dashboard. Here, this whole app already IS the recruit feature, so that
// logic is gone; this only gates /dashboard behind a real login.
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    if (!pathname.startsWith('/dashboard')) {
        return NextResponse.next()
    }

    // Demo mode: skip auth so the dashboard is viewable for demos/screenshots
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
        return NextResponse.next()
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        // If env vars not set, allow access (dev mode)
        return NextResponse.next()
    }

    const accessToken = request.cookies.get('sb-access-token')?.value
        || request.cookies.get(`sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`)?.value

    if (!accessToken) {
        const loginUrl = new URL('/auth/login', request.url)
        loginUrl.searchParams.set('redirectTo', pathname)
        return NextResponse.redirect(loginUrl)
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey)
        const { data: { user }, error } = await supabase.auth.getUser(accessToken)
        if (error || !user) {
            const loginUrl = new URL('/auth/login', request.url)
            loginUrl.searchParams.set('redirectTo', pathname)
            return NextResponse.redirect(loginUrl)
        }
    } catch (err) {
        // A thrown exception here means the network call itself failed, not that
        // the session is invalid — fail OPEN rather than bouncing a legitimate
        // user to /auth/login because Supabase had a transient hiccup. RLS
        // policies still gate the actual data on every real query.
        console.error('[middleware] Auth check failed (network/infra error), failing open:', err)
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/dashboard/:path*'],
}
