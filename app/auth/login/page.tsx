'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Zap, Eye, EyeOff, ArrowRight, UserPlus } from 'lucide-react'

function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectTo = searchParams.get('redirectTo') || '/dashboard'

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [isSignUp, setIsSignUp] = useState(false)

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('YOUR_PROJECT_ID')) {
            setError('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your Vercel environment variables.')
            setLoading(false)
            return
        }

        try {
            const { createClient } = await import('@supabase/supabase-js')
            const supabase = createClient(supabaseUrl, supabaseKey)

            if (isSignUp) {
                // SERVER-SIDE SIGNUP — uses Admin API to auto-confirm
                const res = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                })
                const data = await res.json()

                if (!res.ok) {
                    setError(data.error || 'Signup failed')
                } else {
                    // Account created and confirmed — now auto sign in
                    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
                    if (signInError) {
                        setSuccess('Account created! Click "Already have an account? Sign in" and sign in.')
                        setIsSignUp(false)
                    } else {
                        // Sync session to cookie for middleware
                        await fetch('/api/auth/session', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                access_token: signInData.session?.access_token,
                                refresh_token: signInData.session?.refresh_token,
                            }),
                        })
                        setSuccess('Account created! Redirecting to dashboard...')
                        setTimeout(() => {
                            router.push(redirectTo)
                            router.refresh()
                        }, 1000)
                    }
                }
            } else {
                // SIGN IN MODE
                const { data: signInData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
                if (authError) {
                    if (authError.message.includes('Invalid login')) {
                        setError('Invalid email or password. If you haven\'t created an account yet, click "Create Account" below.')
                    } else if (authError.message.includes('Email not confirmed')) {
                        setError('Please confirm your email address first.')
                    } else {
                        setError(authError.message)
                    }
                } else {
                    // Sync session to cookie for middleware
                    await fetch('/api/auth/session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            access_token: signInData.session?.access_token,
                            refresh_token: signInData.session?.refresh_token,
                        }),
                    })
                    router.push(redirectTo)
                    router.refresh()
                }
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : ''
            if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
                setError('Cannot connect to Supabase. Your Supabase project may be paused — go to supabase.com/dashboard and click "Restore".')
            } else {
                setError('Connection failed. Please check your internet and try again.')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
                        <Zap className="w-7 h-7 text-cyan-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">NodalNexus</h1>
                    <p className="text-slate-400 text-sm mt-1">Admin Console</p>
                </div>

                {/* Card */}
                <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-7 backdrop-blur-sm">
                    <h2 className="text-lg font-semibold text-white mb-6">
                        {isSignUp ? 'Create Account' : 'Sign in'}
                    </h2>

                    <form onSubmit={handleAuth} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="oliver@nodalnexus.com"
                                required
                                className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Success */}
                        {success && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                                <p className="text-emerald-400 text-sm">{success}</p>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading || !email || !password}
                            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20 mt-2"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    {isSignUp ? 'Creating account...' : 'Signing in...'}
                                </span>
                            ) : isSignUp ? (
                                <>Create Account <UserPlus className="w-4 h-4" /></>
                            ) : (
                                <>Sign in <ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </form>

                    {/* Toggle Sign In / Sign Up */}
                    <div className="mt-5 pt-5 border-t border-white/5 text-center">
                        <button
                            onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccess('') }}
                            className="text-sm text-slate-400 hover:text-cyan-400 transition-colors"
                        >
                            {isSignUp ? 'Already have an account? Sign in' : 'Don\'t have an account? Create one'}
                        </button>
                    </div>
                </div>

                <p className="text-center text-xs text-slate-600 mt-6">
                    NodalNexus Admin Console — restricted access
                </p>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
            <LoginForm />
        </Suspense>
    )
}

