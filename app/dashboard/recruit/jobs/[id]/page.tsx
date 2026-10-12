'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/db-client'
import {
    ArrowLeft, Briefcase, MapPin, DollarSign, Users, CheckCircle2,
    Sparkles, Wrench, UserCheck, Globe, Clock, FileOutput, Link2, Copy, Check,
} from 'lucide-react'
import BulkResumeAnalyzer from '@/components/BulkResumeAnalyzer'
import type { AnalyzedCandidate } from '@/components/ResumeAnalyzer'

type Job = {
    id: string
    title: string
    company: string | null
    status: string
    location: string | null
    salary_range: string | null
    positions_total: number
    positions_filled: number
    experience_min: number | null
    experience_max: number | null
    remote_ok: boolean | null
    description: string | null
    skills_required: string[] | null
    must_haves: string[] | null
    nice_to_haves: string[] | null
    hiring_manager_name: string | null
    hiring_manager_email: string | null
    created_at: string
}

type Candidate = {
    id: string
    name: string
    email: string | null
    current_role: string | null
    current_company: string | null
    score: number
    grade: string
    status: string
}

function GradeBadge({ grade }: { grade: string }) {
    const styles: Record<string, string> = {
        A: 'bg-green-500/20 text-green-400 border-green-500/30',
        B: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
        C: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        D: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    }
    return (
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold border ${styles[grade] || styles.D}`}>
            {grade}
        </span>
    )
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        new: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
        shortlisted: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        interviewing: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        offered: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        placed: 'bg-green-500/20 text-green-400 border-green-500/30',
        hired: 'bg-green-500/20 text-green-400 border-green-500/30',
        rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
        open: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
        filled: 'bg-green-500/20 text-green-400 border-green-500/30',
        closed: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
        on_hold: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    }
    return (
        <span className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize border ${colors[status] || colors.new}`}>
            {status.replace(/_/g, ' ')}
        </span>
    )
}

export default function JobDetailPage() {
    const params = useParams()
    const jobId = params.id as string
    const [job, setJob] = useState<Job | null>(null)
    const [candidates, setCandidates] = useState<Candidate[]>([])
    const [loading, setLoading] = useState(true)
    const [showBulkAnalyzer, setShowBulkAnalyzer] = useState(false)
    const [linkCopied, setLinkCopied] = useState(false)

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const fetchData = useCallback(async () => {
        setLoading(true)
        const { data: jobData } = await supabase.from('jobs').select('*').eq('id', jobId).single()
        setJob(jobData as Job | null)
        const { data: candData } = await supabase
            .from('candidates')
            .select('id, name, email, current_role, current_company, score, grade, status')
            .eq('job_id', jobId)
            .order('score', { ascending: false })
        setCandidates((candData as Candidate[]) || [])
        setLoading(false)
    }, [jobId])

    useEffect(() => { fetchData() }, [fetchData])

    if (loading) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">Loading job…</div>
    }

    if (!job) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-center px-6">
                <p className="text-slate-300">Job not found.</p>
                <Link href="/dashboard/recruit" className="text-cyan-400 text-sm hover:underline">← Back to Recruitment</Link>
            </div>
        )
    }

    const expLabel = job.experience_min != null
        ? `${job.experience_min}${job.experience_max ? `–${job.experience_max}` : '+'} years`
        : '—'

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <div className="border-b border-white/10 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-6 py-4">
                    <Link href="/dashboard/recruit" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors mb-3">
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Recruitment
                    </Link>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                                <Briefcase className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold text-white">{job.title}</h1>
                                <p className="text-sm text-slate-400">{job.company || '—'}</p>
                            </div>
                        </div>
                        <StatusBadge status={job.status} />
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
                {/* Meta row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { icon: MapPin, label: 'Location', value: job.remote_ok ? `${job.location || 'Remote'} · Remote OK` : (job.location || '—') },
                        { icon: DollarSign, label: 'Salary', value: job.salary_range || '—' },
                        { icon: Clock, label: 'Experience', value: expLabel },
                        { icon: Users, label: 'Positions', value: `${job.positions_filled}/${job.positions_total} filled` },
                    ].map((m) => (
                        <div key={m.label} className="bg-slate-900/50 border border-white/10 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <m.icon className="w-3.5 h-3.5 text-slate-500" />
                                <p className="text-xs text-slate-400">{m.label}</p>
                            </div>
                            <p className="text-sm text-white font-medium">{m.value}</p>
                        </div>
                    ))}
                </div>

                {/* Description */}
                <div className="bg-slate-900/50 border border-white/10 rounded-xl p-5">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Job Description</p>
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {job.description || 'No description provided.'}
                    </p>
                </div>

                {/* Requirements */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                            <p className="text-xs text-green-400 uppercase tracking-wider">Must-Haves</p>
                        </div>
                        <ul className="space-y-2">
                            {(job.must_haves || []).length > 0
                                ? (job.must_haves || []).map((m) => (
                                    <li key={m} className="text-sm text-slate-300 flex items-start gap-2">
                                        <span className="text-green-400 mt-0.5">•</span>{m}
                                    </li>
                                ))
                                : <li className="text-sm text-slate-500">None specified.</li>}
                        </ul>
                    </div>
                    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-4 h-4 text-cyan-400" />
                            <p className="text-xs text-cyan-400 uppercase tracking-wider">Nice-to-Haves</p>
                        </div>
                        <ul className="space-y-2">
                            {(job.nice_to_haves || []).length > 0
                                ? (job.nice_to_haves || []).map((m) => (
                                    <li key={m} className="text-sm text-slate-300 flex items-start gap-2">
                                        <span className="text-cyan-400 mt-0.5">•</span>{m}
                                    </li>
                                ))
                                : <li className="text-sm text-slate-500">None specified.</li>}
                        </ul>
                    </div>
                </div>

                {/* Skills + hiring manager */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Wrench className="w-4 h-4 text-slate-500" />
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Required Skills</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(job.skills_required || []).length > 0
                                ? (job.skills_required || []).map((s) => (
                                    <span key={s} className="px-3 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-xs text-white font-medium">{s}</span>
                                ))
                                : <p className="text-sm text-slate-500">None specified.</p>}
                        </div>
                    </div>
                    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <UserCheck className="w-4 h-4 text-slate-500" />
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Hiring Manager</p>
                        </div>
                        <p className="text-sm text-white">{job.hiring_manager_name || '—'}</p>
                        {job.hiring_manager_email && <p className="text-xs text-slate-400 mt-1">{job.hiring_manager_email}</p>}
                        {job.remote_ok && (
                            <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Open to remote candidates</p>
                        )}
                    </div>
                </div>

                {/* Public apply link — SKETCH: see note below before sharing outside a demo */}
                {job.status === 'open' && (
                    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-5 mb-6">
                        <div className="flex items-center gap-2 mb-3">
                            <Link2 className="w-4 h-4 text-cyan-400" />
                            <p className="text-xs text-cyan-400 uppercase tracking-wider">Public Apply Link</p>
                        </div>
                        <p className="text-sm text-slate-400 mb-3">
                            Share this so candidates can apply directly — each application is automatically scored by Nexu AI and shows up below, ranked.
                        </p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-slate-300 truncate">
                                {typeof window !== 'undefined' ? `${window.location.origin}/apply/${job.id}` : `/apply/${job.id}`}
                            </code>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/apply/${job.id}`)
                                    setLinkCopied(true)
                                    setTimeout(() => setLinkCopied(false), 2000)
                                }}
                                className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs border bg-cyan-500/15 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25 transition-all shrink-0"
                            >
                                {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {linkCopied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                        <p className="text-xs text-amber-400/80 mt-3">
                            ⚠ Not fully hardened yet — no CAPTCHA (honeypot + rate-limit only) and no
                            virus/malware scanning on uploaded files. Job links themselves are safe to
                            share: real job IDs are random, unguessable UUIDs (not sequential).
                        </p>
                    </div>
                )}

                {/* Candidates scored against this job */}
                <div className="bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-sm font-semibold text-white">Candidates scored for this role</h2>
                            <span className="text-xs text-slate-400">{candidates.length} candidate{candidates.length === 1 ? '' : 's'} · ranked by AI score</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {candidates.length > 0 && (
                                <Link
                                    href={`/dashboard/recruit/jobs/${jobId}/shortlist`}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm border bg-slate-900/50 border-white/10 text-slate-300 hover:text-white transition-all whitespace-nowrap"
                                >
                                    <FileOutput className="w-4 h-4" /> Export Shortlist
                                </Link>
                            )}
                            <button
                                onClick={() => setShowBulkAnalyzer(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm border bg-cyan-500/15 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25 transition-all whitespace-nowrap"
                            >
                                <Sparkles className="w-4 h-4" /> Bulk Screen CVs for This Role
                            </button>
                        </div>
                    </div>
                    {candidates.length === 0 ? (
                        <div className="px-6 py-12 text-center text-sm text-slate-400">No candidates matched to this job yet.</div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5">
                                    {['Rank', 'Candidate', 'Role / Company', 'Grade', 'Score', 'Status'].map(col => (
                                        <th key={col} className="text-left text-xs font-medium text-slate-400 px-6 py-3">{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {candidates.map((c, i) => (
                                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 text-sm text-slate-500 font-mono">#{i + 1}</td>
                                        <td className="px-6 py-4">
                                            <Link href={`/dashboard/recruit/${c.id}`} className="text-sm font-medium text-white hover:text-cyan-400 transition-colors">
                                                {c.name}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-300">{c.current_role || '—'}</p>
                                            <p className="text-xs text-slate-500">{c.current_company || ''}</p>
                                        </td>
                                        <td className="px-6 py-4"><GradeBadge grade={c.grade} /></td>
                                        <td className="px-6 py-4">
                                            <span className={`font-bold text-sm ${c.score >= 80 ? 'text-green-400' : c.score >= 60 ? 'text-cyan-400' : c.score >= 40 ? 'text-yellow-400' : 'text-slate-400'}`}>
                                                {c.score}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {showBulkAnalyzer && (
                <BulkResumeAnalyzer
                    jobs={[job]}
                    onClose={() => setShowBulkAnalyzer(false)}
                    onSaveAll={async (batch: AnalyzedCandidate[]) => {
                        if (batch.length === 0) return 0
                        const fresh: AnalyzedCandidate[] = []
                        for (const c of batch) {
                            const key = c.email?.trim().toLowerCase()
                            const dup = key && candidates.find(existing => existing.email?.trim().toLowerCase() === key)
                            if (!dup) fresh.push(c)
                        }
                        if (fresh.length > 0) {
                            const { data: { user } } = await supabase.auth.getUser()
                            await supabase.from('candidates').insert(fresh.map(c => ({ ...c, client_id: user?.id })))
                        }
                        await fetchData()
                        return fresh.length
                    }}
                />
            )}
        </div>
    )
}
