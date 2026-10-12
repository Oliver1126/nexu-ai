'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/db-client'
import { ArrowLeft, Printer, Copy, Check, Download } from 'lucide-react'

type Job = {
    id: string
    title: string
    company: string | null
    location: string | null
    salary_range: string | null
    hiring_manager_name: string | null
}

type Candidate = {
    id: string
    name: string
    email: string | null
    current_role: string | null
    current_company: string | null
    years_experience: number | null
    skills: string[]
    score: number
    grade: string
    status: string
    score_reasoning: string | null
    confidence: string | null
    enrichment_data: Record<string, unknown> | null
}

const gradeCls: Record<string, string> = {
    A: 'bg-green-500/20 text-green-400 border-green-500/30',
    B: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    C: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    D: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

export default function ShortlistPage() {
    const params = useParams()
    const jobId = params.id as string
    const [job, setJob] = useState<Job | null>(null)
    const [candidates, setCandidates] = useState<Candidate[]>([])
    const [loading, setLoading] = useState(true)
    const [topN, setTopN] = useState<number | 'all'>(5)
    const [copied, setCopied] = useState(false)

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
            .select('id, name, email, current_role, current_company, years_experience, skills, score, grade, status, score_reasoning, confidence, enrichment_data')
            .eq('job_id', jobId)
            .order('score', { ascending: false })
        setCandidates((candData as Candidate[]) || [])
        setLoading(false)
    }, [jobId])

    useEffect(() => { fetchData() }, [fetchData])

    const shown = useMemo(
        () => (topN === 'all' ? candidates : candidates.slice(0, topN)),
        [candidates, topN]
    )

    const copyAsText = async () => {
        if (!job) return
        const lines = [
            `Shortlist — ${job.title}${job.company ? ` @ ${job.company}` : ''}`,
            `${shown.length} candidate${shown.length === 1 ? '' : 's'}`,
            '',
        ]
        shown.forEach((c, i) => {
            lines.push(`${i + 1}. ${c.name} — Score ${c.score} (Grade ${c.grade})`)
            if (c.current_role || c.current_company) lines.push(`   ${[c.current_role, c.current_company].filter(Boolean).join(' @ ')}`)
            if (c.email) lines.push(`   ${c.email}`)
            if (c.score_reasoning) lines.push(`   Why: ${c.score_reasoning}`)
            lines.push('')
        })
        await navigator.clipboard.writeText(lines.join('\n'))
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    // Matches the file-naming convention from RESULTS-DELIVERY-GUIDE.md:
    // [JobTitle]_Shortlist_[Date].csv — not a generic "shortlist.csv"
    const exportCSV = () => {
        if (!job) return
        const headers = ['Rank', 'Name', 'Email', 'Current Role', 'Current Company', 'Years Experience', 'Score', 'Grade', 'Confidence', 'Status', 'Skills', 'Reasoning']
        const rows = shown.map((c, i) => [
            i + 1,
            c.name,
            c.email || '',
            c.current_role || '',
            c.current_company || '',
            c.years_experience ?? '',
            c.score,
            c.grade,
            c.confidence || '',
            c.status,
            (c.skills || []).join('; '),
            (c.score_reasoning || '').replace(/"/g, '""'),
        ])
        const csv = [headers, ...rows]
            .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
            .join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const safeTitle = job.title.replace(/[^a-z0-9]+/gi, '_')
        a.download = `${safeTitle}_Shortlist_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    if (loading) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">Loading shortlist…</div>
    }

    if (!job) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-center px-6">
                <p className="text-slate-300">Job not found.</p>
                <Link href="/dashboard/recruit" className="text-cyan-400 text-sm hover:underline">← Back to Recruitment</Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white print:bg-white print:text-black">
            <style>{`
                @media print {
                    aside { display: none !important; }
                    .no-print { display: none !important; }
                    body, .print-surface { background: white !important; }
                }
            `}</style>

            {/* Controls — hidden when printing */}
            <div className="no-print border-b border-white/10 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
                    <Link href={`/dashboard/recruit/jobs/${jobId}`} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors">
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to job
                    </Link>
                    <div className="flex items-center gap-3">
                        <label className="text-xs text-slate-400">Show</label>
                        <select
                            value={topN}
                            onChange={e => setTopN(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                            className="bg-slate-800 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                        >
                            <option value={3}>Top 3</option>
                            <option value={5}>Top 5</option>
                            <option value={10}>Top 10</option>
                            <option value="all">All ({candidates.length})</option>
                        </select>
                        <button onClick={copyAsText} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border bg-slate-900/50 border-white/10 text-slate-300 hover:text-white transition-all">
                            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied' : 'Copy as text'}
                        </button>
                        <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border bg-slate-900/50 border-white/10 text-slate-300 hover:text-white transition-all">
                            <Download className="w-3.5 h-3.5" /> Export CSV
                        </button>
                        <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25 transition-all">
                            <Printer className="w-3.5 h-3.5" /> Print / Save as PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* The shortlist itself — this is what prints */}
            <div className="print-surface max-w-3xl mx-auto px-6 py-10 print:py-6">
                <div className="mb-8 print:mb-6">
                    <p className="text-xs text-cyan-400 print:text-slate-500 uppercase tracking-wider mb-1">Shortlist</p>
                    <h1 className="text-2xl font-bold text-white print:text-black">{job.title}</h1>
                    <p className="text-sm text-slate-400 print:text-slate-600 mt-1">
                        {[job.company, job.location].filter(Boolean).join(' · ')}
                    </p>
                    <p className="text-xs text-slate-500 print:text-slate-500 mt-3">
                        {shown.length} of {candidates.length} candidate{candidates.length === 1 ? '' : 's'}, ranked by Nexu AI fit score
                        {job.hiring_manager_name ? ` — prepared for ${job.hiring_manager_name}` : ''}
                    </p>
                </div>

                {shown.length === 0 ? (
                    <p className="text-slate-400 print:text-slate-600 text-sm">No candidates scored for this role yet.</p>
                ) : (
                    <div className="space-y-4 print:space-y-6">
                        {shown.map((c, i) => (
                            <div key={c.id} className="border border-white/10 print:border-slate-300 rounded-xl print:rounded-none p-5 print:p-0 print:pb-5 print:border-b print:border-t-0 print:border-x-0">
                                <div className="flex items-start justify-between gap-4 mb-2">
                                    <div>
                                        <p className="text-sm text-slate-500 print:text-slate-500">#{i + 1}</p>
                                        <h2 className="text-lg font-semibold text-white print:text-black">{c.name}</h2>
                                        <p className="text-sm text-slate-400 print:text-slate-600">
                                            {[c.current_role, c.current_company].filter(Boolean).join(' @ ') || '—'}
                                            {c.years_experience != null ? ` · ${c.years_experience} yrs experience` : ''}
                                        </p>
                                        {c.email && <p className="text-xs text-slate-500 print:text-slate-500 mt-0.5">{c.email}</p>}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`font-bold text-lg ${c.score >= 80 ? 'text-green-400 print:text-black' : c.score >= 60 ? 'text-cyan-400 print:text-black' : 'text-slate-400 print:text-black'}`}>{c.score}</span>
                                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold border print:border-slate-400 print:bg-white print:text-black ${gradeCls[c.grade] || gradeCls.D}`}>{c.grade}</span>
                                    </div>
                                </div>
                                {c.confidence === 'low' && (
                                    <p className="text-xs text-amber-400 print:text-slate-700 mb-2">⚠ Low confidence — worth a manual look</p>
                                )}
                                {c.score_reasoning && (
                                    <p className="text-sm text-slate-300 print:text-slate-800 leading-relaxed">{c.score_reasoning}</p>
                                )}
                                {(c.skills || []).length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-3 print:mt-2">
                                        {c.skills.slice(0, 8).map(s => (
                                            <span key={s} className="px-2 py-0.5 bg-slate-800 print:bg-transparent print:border print:border-slate-300 border border-white/5 rounded text-xs text-slate-300 print:text-slate-700">{s}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <p className="mt-10 text-xs text-slate-600 print:text-slate-400">Generated by Nexu AI — NodalNexus</p>
            </div>
        </div>
    )
}
