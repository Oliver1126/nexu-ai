'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/db-client'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, Building2, Calendar, Briefcase, Brain, GraduationCap, Award, MapPin } from 'lucide-react'

type Candidate = {
    id: string
    name: string
    email: string | null
    phone: string | null
    current_role: string | null
    current_company: string | null
    years_experience: number | null
    skills: string[]
    education: string | null
    certifications: string[]
    cv_text: string | null
    career_summary: string | null
    score: number
    grade: string
    score_reasoning: string | null
    confidence: string | null
    enrichment_data: Record<string, unknown> | null
    status: string
    source: string | null
    job_id: string | null
    created_at: string
    updated_at: string | null
    archived_at: string | null
}

type Job = {
    id: string
    title: string
    company: string | null
    location: string | null
}

function getGradeStyle(grade: string): { color: string; bg: string } {
    const styles: Record<string, { color: string; bg: string }> = {
        A: { color: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30' },
        B: { color: 'text-cyan-400', bg: 'bg-cyan-500/15 border-cyan-500/30' },
        C: { color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30' },
        D: { color: 'text-slate-400', bg: 'bg-slate-500/15 border-slate-500/30' },
    }
    return styles[grade] || styles.D
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        new: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
        shortlisted: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        interviewing: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        offered: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        placed: 'bg-green-500/20 text-green-400 border-green-500/30',
        rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
        withdrawn: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    }
    return (
        <span className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize border ${colors[status] || colors.new}`}>
            {status.replace(/_/g, ' ')}
        </span>
    )
}

function InfoCard({ icon: Icon, label, value, link }: { icon: typeof Mail; label: string; value: string; link?: string }) {
    const content = (
        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all">
            <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-slate-500" />
                <p className="text-xs text-slate-500">{label}</p>
            </div>
            <p className={`text-sm font-medium ${link ? 'text-cyan-400' : 'text-white'}`}>{value}</p>
        </div>
    )
    if (link) return <a href={link} target="_blank" rel="noopener noreferrer">{content}</a>
    return content
}

export default function CandidateDetailPage() {
    const params = useParams()
    const router = useRouter()
    const candidateId = params.id as string

    const [candidate, setCandidate] = useState<Candidate | null>(null)
    const [matchedJob, setMatchedJob] = useState<Job | null>(null)
    const [loading, setLoading] = useState(true)
    const [updatingStatus, setUpdatingStatus] = useState(false)

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const fetchCandidate = useCallback(async () => {
        const { data } = await supabase.from('candidates').select('*').eq('id', candidateId).single()
        if (data) {
            // Spread into a new object — the demo store mutates and returns the
            // same reference in place, so setCandidate(data) can otherwise be a
            // no-op (React bails out on an unchanged reference) until a full reload.
            setCandidate({ ...data })
            if (data.job_id) {
                const { data: jobData } = await supabase.from('jobs').select('id, title, company, location').eq('id', data.job_id).single()
                if (jobData) setMatchedJob(jobData)
            }
        }
        setLoading(false)
    }, [candidateId])

    useEffect(() => { fetchCandidate() }, [fetchCandidate])

    const updateStatus = async (newStatus: string) => {
        setUpdatingStatus(true)
        await supabase.from('candidates').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', candidateId)
        await fetchCandidate()
        setUpdatingStatus(false)
    }

    // Same UI-level hide as the main candidates list — doesn't delete data,
    // just stops this candidate showing up in the default dashboard view.
    const toggleHidden = async () => {
        await supabase.from('candidates').update({ archived_at: candidate?.archived_at ? null : new Date().toISOString() }).eq('id', candidateId)
        await fetchCandidate()
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
            </div>
        )
    }

    if (!candidate) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-slate-400 text-sm mb-4">Candidate not found</p>
                    <button onClick={() => router.push('/dashboard/recruit')} className="text-cyan-400 text-sm hover:text-cyan-300">← Back to Recruitment</button>
                </div>
            </div>
        )
    }

    const gradeStyle = getGradeStyle(candidate.grade)
    const enrichment = candidate.enrichment_data as Record<string, string> | null

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <div className="border-b border-white/10 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard/recruit" className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                            <ArrowLeft className="w-4 h-4 text-slate-400" />
                        </Link>
                        <div>
                            <h1 className="font-semibold text-white text-sm">{candidate.name}</h1>
                            <p className="text-xs text-slate-400">{candidate.current_role || 'No role'} {candidate.current_company ? `@ ${candidate.current_company}` : ''}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {candidate.archived_at && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-800 text-slate-400 border-white/10">Hidden</span>
                        )}
                        <StatusBadge status={candidate.status} />
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${gradeStyle.bg}`}>
                            <span className={`text-lg font-bold ${gradeStyle.color}`}>{candidate.grade}</span>
                        </div>
                        <button
                            onClick={toggleHidden}
                            title="Hide from the dashboard — doesn't delete their data"
                            className="px-3 py-2 text-xs rounded-lg border bg-slate-800 text-slate-400 border-white/10 hover:text-white transition-colors"
                        >
                            {candidate.archived_at ? 'Restore' : 'Hide'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-8">
                {/* Score Hero */}
                <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Candidate Score</p>
                            <div className="flex items-baseline gap-3">
                                <span className={`text-5xl font-bold ${gradeStyle.color}`}>{candidate.score}</span>
                                <span className="text-slate-500 text-lg">/100</span>
                            </div>
                            {matchedJob && (
                                <p className="text-sm text-slate-400 mt-2">
                                    Matched to: <span className="text-cyan-400 font-medium">{matchedJob.title}</span>
                                    {matchedJob.company && <span className="text-slate-500"> @ {matchedJob.company}</span>}
                                </p>
                            )}
                        </div>
                        <div className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center ${gradeStyle.bg}`}>
                            <span className={`text-4xl font-bold ${gradeStyle.color}`}>{candidate.grade}</span>
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="w-full bg-slate-800 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full transition-all duration-500 ${candidate.score >= 80 ? 'bg-green-400' : candidate.score >= 60 ? 'bg-cyan-400' : candidate.score >= 40 ? 'bg-yellow-400' : 'bg-slate-500'}`}
                                style={{ width: `${candidate.score}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Contact Info Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <InfoCard icon={Mail} label="Email" value={candidate.email || 'Not provided'} link={candidate.email ? `mailto:${candidate.email}` : undefined} />
                    <InfoCard icon={Phone} label="Phone" value={candidate.phone || 'Not provided'} />
                    <InfoCard icon={Building2} label="Company" value={candidate.current_company || 'Not provided'} />
                    <InfoCard icon={Calendar} label="Experience" value={candidate.years_experience ? `${candidate.years_experience} years` : 'Not provided'} />
                </div>

                {/* Two Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Left Column */}
                    <div className="space-y-6">
                        {/* Career Summary */}
                        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Briefcase className="w-4 h-4 text-slate-500" />
                                <p className="text-xs text-slate-500 uppercase tracking-wider">Career Summary</p>
                            </div>
                            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                                {candidate.career_summary || 'No summary generated yet.'}
                            </p>
                        </div>

                        {/* Skills */}
                        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Award className="w-4 h-4 text-slate-500" />
                                <p className="text-xs text-slate-500 uppercase tracking-wider">Skills</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(candidate.skills || []).length > 0 ? (
                                    (candidate.skills || []).map(skill => (
                                        <span key={skill} className="px-3 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-xs text-white font-medium">{skill}</span>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-500">No skills extracted yet.</p>
                                )}
                            </div>
                        </div>

                        {/* Education */}
                        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <GraduationCap className="w-4 h-4 text-slate-500" />
                                <p className="text-xs text-slate-500 uppercase tracking-wider">Education</p>
                            </div>
                            <p className="text-sm text-slate-300">{candidate.education || 'Not provided'}</p>
                            {(candidate.certifications || []).length > 0 && (
                                <div className="mt-3 pt-3 border-t border-white/5">
                                    <p className="text-xs text-slate-500 mb-2">Certifications</p>
                                    <div className="flex flex-wrap gap-2">
                                        {(candidate.certifications || []).map(cert => (
                                            <span key={cert} className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-400">{cert}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        {/* AI Score Reasoning */}
                        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Brain className="w-4 h-4 text-cyan-400" />
                                    <p className="text-xs text-cyan-400 uppercase tracking-wider">Nexu AI Reasoning</p>
                                </div>
                                {candidate.confidence === 'low' && (
                                    <span className="text-xs text-amber-400">⚠ Low confidence — double-check</span>
                                )}
                            </div>
                            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                                {candidate.score_reasoning || 'Nexu hasn’t scored this candidate yet. Run the Nexu AI analyzer on their resume to generate a fit score and reasoning.'}
                            </p>
                        </div>

                        {/* Enrichment Data */}
                        {enrichment && Object.keys(enrichment).length > 0 && (
                            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-5">
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Enrichment Data</p>
                                <div className="space-y-2">
                                    {Object.entries(enrichment).map(([key, value]) => (
                                        <div key={key} className="flex items-start gap-2">
                                            <span className="text-xs text-slate-500 min-w-[100px] capitalize">{key.replace(/_/g, ' ')}:</span>
                                            <span className="text-xs text-slate-300">{String(value)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* CV Preview */}
                        {candidate.cv_text && (
                            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-5">
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">CV Preview</p>
                                <div className="bg-slate-800/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                                    <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap font-mono">{candidate.cv_text}</p>
                                </div>
                            </div>
                        )}

                        {/* Source & Meta */}
                        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <MapPin className="w-4 h-4 text-slate-500" />
                                <p className="text-xs text-slate-500 uppercase tracking-wider">Source & Metadata</p>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-sm text-slate-300">Source: <span className="text-white capitalize">{candidate.source || 'Unknown'}</span></p>
                                <p className="text-sm text-slate-300">Created: {new Date(candidate.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                {candidate.updated_at && (
                                    <p className="text-sm text-slate-300">Updated: {new Date(candidate.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status Actions */}
                <div className="bg-slate-900/50 border border-white/10 rounded-xl p-5">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Update Candidate Status</p>
                    <div className="flex flex-wrap gap-2">
                        {['new', 'shortlisted', 'interviewing', 'offered', 'placed', 'rejected', 'withdrawn'].map((s) => (
                            <button
                                key={s}
                                onClick={() => updateStatus(s)}
                                disabled={updatingStatus || candidate.status === s}
                                className={`px-4 py-2 rounded-lg text-xs font-medium border transition-all capitalize ${candidate.status === s
                                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 cursor-default'
                                    : 'bg-slate-800 text-slate-400 border-white/10 hover:text-white hover:border-white/20 disabled:opacity-50'
                                    }`}
                            >
                                {candidate.status === s && '● '}{s.replace(/_/g, ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Metadata Footer */}
                <div className="mt-6 flex items-center gap-6 text-xs text-slate-600">
                    <p>Candidate ID: <code className="text-slate-500">{candidate.id}</code></p>
                </div>
            </div>
        </div>
    )
}
