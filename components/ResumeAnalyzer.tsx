'use client'

import { useState } from 'react'
import { Sparkles, X, CheckCircle2, AlertCircle, Loader2, Save } from 'lucide-react'
import NexuMascot from './NexuMascot'

type JobOption = {
    id: string
    title: string
    company?: string | null
    description?: string | null
    skills_required?: string[] | null
    must_haves?: string[] | null
    nice_to_haves?: string[] | null
    experience_min?: number | null
    experience_max?: number | null
}

type AnalysisResult = {
    name: string
    email: string
    current_role: string
    current_company: string
    score: number
    grade: string
    recommendation: 'strong_fit' | 'possible_fit' | 'weak_fit'
    confidence: 'high' | 'medium' | 'low'
    summary: string
    reasoning: string
    years_experience: number
    extracted_skills: string[]
    matched_must_haves: string[]
    missing_must_haves: string[]
}

export type AnalyzedCandidate = {
    name: string
    email: string | null
    current_role: string | null
    current_company: string | null
    years_experience: number | null
    skills: string[]
    score: number
    grade: string
    status: string
    source: string
    career_summary: string
    score_reasoning: string
    confidence: string
    cv_text: string
    enrichment_data: Record<string, unknown>
    job_id: string | null
}

type Props = {
    jobs: JobOption[]
    onClose: () => void
    onSave: (candidate: AnalyzedCandidate) => Promise<void>
}

const RECO_LABEL: Record<string, { label: string; cls: string }> = {
    strong_fit: { label: 'Strong fit', cls: 'bg-green-500/15 text-green-400 border-green-500/30' },
    possible_fit: { label: 'Possible fit', cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
    weak_fit: { label: 'Weak fit', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
}

const CONFIDENCE_LABEL: Record<string, { label: string; cls: string }> = {
    high: { label: 'High confidence', cls: 'text-slate-500' },
    medium: { label: 'Medium confidence', cls: 'text-slate-500' },
    low: { label: '⚠ Low confidence — double-check', cls: 'text-amber-400' },
}

export default function ResumeAnalyzer({ jobs, onClose, onSave }: Props) {
    const [jobId, setJobId] = useState(jobs[0]?.id ?? '')
    const [resumeText, setResumeText] = useState('')
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [result, setResult] = useState<AnalysisResult | null>(null)

    const selectedJob = jobs.find(j => j.id === jobId)

    const analyze = async () => {
        setError(''); setResult(null); setLoading(true)
        try {
            const res = await fetch('/api/recruit/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resumeText, job: selectedJob || {} }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Analysis failed.'); return }
            setResult(data.result as AnalysisResult)
        } catch {
            setError('Network error — could not reach the server.')
        } finally {
            setLoading(false)
        }
    }

    const save = async () => {
        if (!result) return
        setSaving(true)
        await onSave({
            name: result.name || 'Unknown',
            email: result.email || null,
            current_role: result.current_role || null,
            current_company: result.current_company || null,
            years_experience: result.years_experience ?? null,
            skills: result.extracted_skills || [],
            score: result.score,
            grade: result.grade,
            status: 'new',
            source: 'Nexu AI',
            career_summary: result.summary,
            score_reasoning: result.reasoning,
            confidence: result.confidence,
            cv_text: resumeText,
            enrichment_data: {
                recommendation: RECO_LABEL[result.recommendation]?.label || result.recommendation,
                matched_must_haves: (result.matched_must_haves || []).join(', ') || '—',
                missing_must_haves: (result.missing_must_haves || []).join(', ') || 'none',
            },
            job_id: jobId || null,
        })
        setSaving(false)
        onClose()
    }

    const gradeCls: Record<string, string> = {
        A: 'bg-green-500/20 text-green-400 border-green-500/30',
        B: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
        C: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        D: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <NexuMascot size={38} processing={loading} />
                        <div>
                            <h2 className="text-sm font-semibold text-white">Nexu AI</h2>
                            <p className="text-xs text-slate-400">Your NodalNexus assistant scores a resume against the job</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"><X className="w-4 h-4 text-slate-400" /></button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4">
                    {/* Inputs */}
                    <div>
                        <label className="block text-xs text-slate-400 mb-1.5">Score against job</label>
                        <select value={jobId} onChange={e => setJobId(e.target.value)} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50">
                            <option value="">— No specific job (general screen) —</option>
                            {jobs.map(j => <option key={j.id} value={j.id}>{j.title}{j.company ? ` @ ${j.company}` : ''}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1.5">Paste resume text</label>
                        <textarea
                            value={resumeText}
                            onChange={e => setResumeText(e.target.value)}
                            rows={6}
                            placeholder="Paste the candidate's full resume / CV here…"
                            className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 font-mono"
                        />
                    </div>
                    <button
                        onClick={analyze}
                        disabled={loading || resumeText.trim().length < 30}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
                    >
                        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Nexu is analyzing…</> : <><Sparkles className="w-4 h-4" /> Analyze with Nexu</>}
                    </button>

                    {loading && (
                        <div className="flex flex-col items-center justify-center py-6 gap-3">
                            <NexuMascot size={96} processing />
                            <p className="text-sm text-cyan-400 animate-pulse">Nexu is reading the resume…</p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-red-300">{error}</p>
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div className="border border-white/10 rounded-xl overflow-hidden">
                            <div className="bg-slate-800/50 px-5 py-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-white">{result.name}</p>
                                    <p className="text-xs text-slate-400">{[result.current_role, result.current_company].filter(Boolean).join(' · ') || '—'}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${RECO_LABEL[result.recommendation]?.cls || ''}`}>{RECO_LABEL[result.recommendation]?.label || result.recommendation}</span>
                                    <span className={`font-bold text-sm ${result.score >= 80 ? 'text-green-400' : result.score >= 60 ? 'text-cyan-400' : result.score >= 40 ? 'text-yellow-400' : 'text-slate-400'}`}>{result.score}</span>
                                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold border ${gradeCls[result.grade] || gradeCls.D}`}>{result.grade}</span>
                                </div>
                            </div>
                            <div className="p-5 space-y-4">
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <p className="text-xs text-cyan-400 uppercase tracking-wider">Nexu&apos;s Reasoning {selectedJob ? `(vs ${selectedJob.title})` : ''}</p>
                                        {result.confidence && (
                                            <span className={`text-xs ${CONFIDENCE_LABEL[result.confidence]?.cls}`}>{CONFIDENCE_LABEL[result.confidence]?.label}</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{result.reasoning}</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-green-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Matched</p>
                                        {result.matched_must_haves?.length ? (
                                            <ul className="space-y-1">{result.matched_must_haves.map(m => <li key={m} className="text-xs text-slate-300">• {m}</li>)}</ul>
                                        ) : <p className="text-xs text-slate-500">None</p>}
                                    </div>
                                    <div>
                                        <p className="text-xs text-red-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Gaps</p>
                                        {result.missing_must_haves?.length ? (
                                            <ul className="space-y-1">{result.missing_must_haves.map(m => <li key={m} className="text-xs text-slate-300">• {m}</li>)}</ul>
                                        ) : <p className="text-xs text-slate-500">None</p>}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">Extracted skills</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(result.extracted_skills || []).map(s => <span key={s} className="px-2 py-0.5 bg-slate-800 border border-white/5 rounded text-xs text-slate-300">{s}</span>)}
                                    </div>
                                </div>
                                <button
                                    onClick={save}
                                    disabled={saving}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-lg text-sm font-medium hover:bg-violet-500/30 transition-colors disabled:opacity-50"
                                >
                                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save as candidate{selectedJob ? ` for ${selectedJob.title}` : ''}</>}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
