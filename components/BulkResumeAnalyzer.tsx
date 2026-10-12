'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, CheckCircle2, AlertCircle, Loader2, FileText, ChevronDown, Save } from 'lucide-react'
import NexuMascot from './NexuMascot'
import type { AnalyzedCandidate } from './ResumeAnalyzer'

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

type ScoreResult = {
    name: string
    email: string
    current_role: string
    current_company: string
    score: number
    grade: 'A' | 'B' | 'C' | 'D'
    recommendation: 'strong_fit' | 'possible_fit' | 'weak_fit'
    confidence: 'high' | 'medium' | 'low'
    summary: string
    reasoning: string
    years_experience: number
    extracted_skills: string[]
    matched_must_haves: string[]
    missing_must_haves: string[]
}

type BatchItem =
    | { fileName: string; ok: true; resumeText: string; result: ScoreResult }
    | { fileName: string; ok: false; error: string }

type Props = {
    jobs: JobOption[]
    onClose: () => void
    // Returns the number actually inserted — may be less than candidates.length
    // if the caller skips duplicates. The modal's confirmation reflects this
    // return value, not just how many were sent.
    onSaveAll: (candidates: AnalyzedCandidate[]) => Promise<number | void>
}

const RECO_LABEL: Record<string, { label: string; cls: string }> = {
    strong_fit: { label: 'Strong fit', cls: 'bg-green-500/15 text-green-400 border-green-500/30' },
    possible_fit: { label: 'Possible fit', cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
    weak_fit: { label: 'Weak fit', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
}

const gradeCls: Record<string, string> = {
    A: 'bg-green-500/20 text-green-400 border-green-500/30',
    B: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    C: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    D: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

const ACCEPTED = ['.pdf', '.docx', '.txt']

export default function BulkResumeAnalyzer({ jobs, onClose, onSaveAll }: Props) {
    const [jobId, setJobId] = useState(jobs[0]?.id ?? '')
    const [files, setFiles] = useState<File[]>([])
    const [isDragging, setIsDragging] = useState(false)
    const [analyzing, setAnalyzing] = useState(false)
    const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
    const [items, setItems] = useState<BatchItem[] | null>(null)
    const [expanded, setExpanded] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [savedCount, setSavedCount] = useState(0)
    const [error, setError] = useState('')
    const fileRef = useRef<HTMLInputElement>(null)

    const selectedJob = jobs.find(j => j.id === jobId)

    const addFiles = useCallback((incoming: FileList | File[]) => {
        const valid: File[] = []
        const rejected: string[] = []
        Array.from(incoming).forEach(f => {
            const ok = ACCEPTED.some(ext => f.name.toLowerCase().endsWith(ext))
            if (ok) valid.push(f); else rejected.push(f.name)
        })
        if (rejected.length) setError(`Skipped unsupported file(s): ${rejected.join(', ')} — only .pdf, .docx, .txt are supported.`)
        else setError('')
        setFiles(prev => [...prev, ...valid])
    }, [])

    const removeFile = (name: string) => setFiles(prev => prev.filter(f => f.name !== name))

    const analyze = async () => {
        if (files.length === 0) return
        setAnalyzing(true)
        setError('')
        setItems(null)
        // Client can't see server-side per-file progress on a single request,
        // so show an indeterminate-but-informative counter based on elapsed batches.
        setProgress({ done: 0, total: files.length })
        try {
            const form = new FormData()
            form.set('job', JSON.stringify(selectedJob || {}))
            files.forEach(f => form.append('files', f))
            const res = await fetch('/api/recruit/score-batch', { method: 'POST', body: form })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Batch analysis failed.'); return }
            setItems(data.results as BatchItem[])
        } catch {
            setError('Network error — could not reach the server.')
        } finally {
            setAnalyzing(false)
            setProgress(null)
        }
    }

    const successCount = items?.filter(i => i.ok).length ?? 0

    const saveAll = async () => {
        if (!items) return
        const toSave: AnalyzedCandidate[] = items
            .filter((i): i is Extract<BatchItem, { ok: true }> => i.ok)
            .map(i => ({
                name: i.result.name || 'Unknown',
                email: i.result.email || null,
                current_role: i.result.current_role || null,
                current_company: i.result.current_company || null,
                years_experience: i.result.years_experience ?? null,
                skills: i.result.extracted_skills || [],
                score: i.result.score,
                grade: i.result.grade,
                status: 'new',
                source: 'Nexu AI (bulk)',
                career_summary: i.result.summary,
                score_reasoning: i.result.reasoning,
                confidence: i.result.confidence,
                cv_text: i.resumeText,
                enrichment_data: {
                    recommendation: RECO_LABEL[i.result.recommendation]?.label || i.result.recommendation,
                    matched_must_haves: (i.result.matched_must_haves || []).join(', ') || '—',
                    missing_must_haves: (i.result.missing_must_haves || []).join(', ') || 'none',
                },
                job_id: jobId || null,
            }))
        setSaving(true)
        const result = await onSaveAll(toSave)
        setSavedCount(typeof result === 'number' ? result : toSave.length)
        setSaving(false)
        setSaved(true)
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <NexuMascot size={38} processing={analyzing} />
                        <div>
                            <h2 className="text-sm font-semibold text-white">Bulk CV Screening</h2>
                            <p className="text-xs text-slate-400">Upload a stack of resumes — Nexu scores and ranks every one</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"><X className="w-4 h-4 text-slate-400" /></button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4">
                    {saved ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-8 h-8 text-green-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">{savedCount} new candidate{savedCount === 1 ? '' : 's'} saved</h3>
                            <p className="text-sm text-slate-400 mb-6">
                                {savedCount < successCount ? `${successCount - savedCount} of the ${successCount} scored were already in this job (duplicates, skipped). ` : ''}
                                {selectedJob ? `Ranked against "${selectedJob.title}." ` : ''}Check the candidates list or the job page to see them ranked by score.
                            </p>
                            <button onClick={onClose} className="px-6 py-2.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-sm font-medium hover:bg-cyan-500/30 transition-all">Done</button>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1.5">Score against job</label>
                                <select value={jobId} onChange={e => setJobId(e.target.value)} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50">
                                    <option value="">— No specific job (general screen) —</option>
                                    {jobs.map(j => <option key={j.id} value={j.id}>{j.title}{j.company ? ` @ ${j.company}` : ''}</option>)}
                                </select>
                            </div>

                            {!items && (
                                <>
                                    <div
                                        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={e => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files) }}
                                        onClick={() => fileRef.current?.click()}
                                        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${isDragging ? 'border-cyan-400 bg-cyan-500/10' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}`}
                                    >
                                        <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-cyan-400' : 'text-slate-500'}`} />
                                        <p className="text-sm text-white mb-1">{isDragging ? 'Drop resumes here' : 'Click to upload or drag & drop — select multiple files'}</p>
                                        <p className="text-xs text-slate-500">.pdf, .docx, or .txt — up to 50 at once</p>
                                        <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.txt" className="hidden" onChange={e => { if (e.target.files) addFiles(e.target.files) }} />
                                    </div>

                                    {files.length > 0 && (
                                        <div className="border border-white/10 rounded-lg overflow-hidden">
                                            <div className="px-3 py-2 bg-slate-800/50 text-xs text-slate-400 flex items-center justify-between">
                                                <span>{files.length} resume{files.length === 1 ? '' : 's'} ready</span>
                                                <button onClick={() => setFiles([])} className="text-slate-500 hover:text-white transition-colors">Clear all</button>
                                            </div>
                                            <div className="max-h-[180px] overflow-y-auto divide-y divide-white/5">
                                                {files.map(f => (
                                                    <div key={f.name} className="px-3 py-2 flex items-center justify-between text-xs">
                                                        <span className="flex items-center gap-2 text-slate-300 truncate"><FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />{f.name}</span>
                                                        <button onClick={() => removeFile(f.name)} className="text-slate-500 hover:text-red-400 transition-colors shrink-0 ml-2"><X className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={analyze}
                                        disabled={analyzing || files.length === 0}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
                                    >
                                        {analyzing
                                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Scoring {progress?.total ?? files.length} resume{(progress?.total ?? files.length) === 1 ? '' : 's'} — this can take a minute…</>
                                            : <>Screen {files.length || ''} Resume{files.length === 1 ? '' : 's'}</>}
                                    </button>
                                </>
                            )}

                            {analyzing && (
                                <div className="flex flex-col items-center justify-center py-6 gap-3">
                                    <NexuMascot size={96} processing />
                                    <p className="text-sm text-cyan-400 animate-pulse">Nexu is reading {files.length} resume{files.length === 1 ? '' : 's'}…</p>
                                </div>
                            )}

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                                    <p className="text-xs text-red-300">{error}</p>
                                </div>
                            )}

                            {items && (
                                <>
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-white">
                                            <span className="text-cyan-400 font-semibold">{successCount}</span> of {items.length} scored successfully
                                            {selectedJob ? ` for ${selectedJob.title}` : ''}
                                        </p>
                                        <button onClick={() => { setItems(null); setFiles([]) }} className="text-xs text-slate-400 hover:text-white transition-colors">Upload different files</button>
                                    </div>

                                    <div className="border border-white/10 rounded-lg overflow-hidden divide-y divide-white/5">
                                        {[...items].sort((a, b) => (b.ok ? b.result.score : -1) - (a.ok ? a.result.score : -1)).map(item => {
                                            const isOpen = expanded === item.fileName
                                            if (!item.ok) {
                                                return (
                                                    <div key={item.fileName} className="px-4 py-3 flex items-start gap-2 bg-red-500/5">
                                                        <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                                                        <div className="min-w-0">
                                                            <p className="text-xs text-white truncate">{item.fileName}</p>
                                                            <p className="text-xs text-red-300/80">{item.error}</p>
                                                        </div>
                                                    </div>
                                                )
                                            }
                                            const r = item.result
                                            return (
                                                <div key={item.fileName}>
                                                    <button onClick={() => setExpanded(isOpen ? null : item.fileName)} className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-white/5 transition-colors text-left">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm text-white truncate flex items-center gap-1.5">
                                                                {r.name}
                                                                {r.confidence === 'low' && (
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Low confidence — double-check" />
                                                                )}
                                                            </p>
                                                            <p className="text-xs text-slate-400 truncate">{[r.current_role, r.current_company].filter(Boolean).join(' · ') || item.fileName}</p>
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${RECO_LABEL[r.recommendation]?.cls || ''}`}>{RECO_LABEL[r.recommendation]?.label}</span>
                                                        <span className={`font-bold text-sm shrink-0 ${r.score >= 80 ? 'text-green-400' : r.score >= 60 ? 'text-cyan-400' : r.score >= 40 ? 'text-yellow-400' : 'text-slate-400'}`}>{r.score}</span>
                                                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold border shrink-0 ${gradeCls[r.grade] || gradeCls.D}`}>{r.grade}</span>
                                                        <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    {isOpen && (
                                                        <div className="px-4 pb-4 space-y-3 bg-slate-800/30">
                                                            {r.confidence === 'low' && (
                                                                <p className="text-xs text-amber-400 flex items-center gap-1.5">⚠ Low confidence — this one is borderline, worth a manual look before deciding.</p>
                                                            )}
                                                            <p className="text-xs text-slate-300 leading-relaxed">{r.reasoning}</p>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div>
                                                                    <p className="text-xs text-green-400 uppercase tracking-wider mb-1">Matched</p>
                                                                    {r.matched_must_haves?.length ? <ul>{r.matched_must_haves.map(m => <li key={m} className="text-xs text-slate-400">• {m}</li>)}</ul> : <p className="text-xs text-slate-500">None</p>}
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-red-400 uppercase tracking-wider mb-1">Gaps</p>
                                                                    {r.missing_must_haves?.length ? <ul>{r.missing_must_haves.map(m => <li key={m} className="text-xs text-slate-400">• {m}</li>)}</ul> : <p className="text-xs text-slate-500">None</p>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {successCount > 0 && (
                                        <button
                                            onClick={saveAll}
                                            disabled={saving}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-lg text-sm font-medium hover:bg-violet-500/30 transition-colors disabled:opacity-50"
                                        >
                                            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save all {successCount} to candidates{selectedJob ? ` for ${selectedJob.title}` : ''}</>}
                                        </button>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
