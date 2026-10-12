import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json()

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
        }

        // Check if admin credentials are configured
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!serviceKey) {
            return NextResponse.json(
                { error: 'Admin API not configured. Please add SUPABASE_SERVICE_ROLE_KEY to Vercel environment variables.' },
                { status: 500 }
            )
        }

        const supabaseAdmin = getSupabaseAdmin()

        // First, check if user already exists and delete them
        // (handles the case of unconfirmed users from previous attempts)
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = existingUsers?.users?.find((u: { email?: string }) => u.email === email)

        if (existingUser) {
            // Delete the old unconfirmed user so we can recreate with auto-confirm
            await supabaseAdmin.auth.admin.deleteUser(existingUser.id)
        }

        // Create the user with auto-confirm using the Admin API
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // This auto-confirms the email!
            user_metadata: { role: 'admin' },
        })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            message: 'Account created and confirmed! You can now sign in.',
            userId: data.user.id,
        })

    } catch (err: unknown) {
        console.error('Signup error:', err)
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        return NextResponse.json(
            { error: `Signup failed: ${errorMessage}` },
            { status: 500 }
        )
    }
}
