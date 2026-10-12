'use client'

import { useRouter } from 'next/navigation'
import { LogOut, Sparkles } from 'lucide-react'

// Minimal dashboard shell — just branding + sign out. The shared NodalNexus
// app's dashboard layout also drove a multi-feature sidebar and a
// "recruit-only mode" toggle; neither applies here since this whole app
// only ever shows the recruit feature.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()

    const signOut = async () => {
        await fetch('/api/auth/session', { method: 'DELETE' })
        router.push('/auth/login')
        router.refresh()
    }

    return (
        <div className="min-h-screen bg-slate-950">
            <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-cyan-400" />
                        </div>
                        <span className="text-sm font-semibold text-white">Nexu AI</span>
                    </div>
                    <button
                        onClick={signOut}
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                    >
                        <LogOut className="w-3.5 h-3.5" /> Sign out
                    </button>
                </div>
            </header>
            {children}
        </div>
    )
}
