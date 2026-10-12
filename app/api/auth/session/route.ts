import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const { access_token, refresh_token } = await req.json()

        if (!access_token) {
            return NextResponse.json({ error: 'No access token' }, { status: 400 })
        }

        const response = NextResponse.json({ success: true })

        // Set the access token as an HTTP-only cookie
        response.cookies.set('sb-access-token', access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
        })

        if (refresh_token) {
            response.cookies.set('sb-refresh-token', refresh_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 30, // 30 days
            })
        }

        return response
    } catch {
        return NextResponse.json({ error: 'Failed to set session' }, { status: 500 })
    }
}

export async function DELETE() {
    const response = NextResponse.json({ success: true })
    response.cookies.delete('sb-access-token')
    response.cookies.delete('sb-refresh-token')
    return response
}
