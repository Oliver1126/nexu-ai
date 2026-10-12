'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/db-client'
import { Briefcase, MapPin, DollarSign, Upload, FileText, X, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'

type Job = {
    id: string
    title: string
    company: string | null
    status: string
    location: string | null
    salary_range: string | null
    remote_ok: boolean | null
    description: string | null
    skills_required: string[] | null
    must_haves: string[] | null
    nice_to_haves: string[] | null
}

export default function ApplyPage() {
    const params = useParams()
    const jobId = params.jobId as string
    const [job, setJob] = useState<Job | null>(null)
    const [loading, setLoading] = useState(true)

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState('')
    const fileRef = useRef<HTMLInputElement>(null)

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const fetchJob = useCallback(async () => {
        const { data } = await supabase.from('jobs').select('*').eq('id', jobId).single()
        setJob(data as Job | null)
        setLoading(false)
    }, [jobId])

    useEffect(() => { fetchJob() }, [fetchJob])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) { setError('Please attach your resume.'); return }
        setSubmitting(true)
        setError('')
        try {
            const form = new FormData()
            form.set('name', name)
            form.set('email', email)
            form.set('phone', phone)
            form.set('resume', file)
            const res = await fetch(`/api/apply/${jobId}`, { method: 'POST', body: form })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Something went wrong. Please try again.'); return }
            setSubmitted(true)
        } catch {
            setError('Network error — please check your connection and try again.')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">Loading…</div>
    }

    if (!job) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-center px-6">
                <p className="text-slate-300">This job posting could not be found.</p>
            </div>
        )
    }

    if (job.status !== 'open') {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center px-6 gap-2">
                <p className="text-white text-lg font-medium">{job.title}</p>
                <p className="text-slate-400 text-sm">This position is no longer accepting applications.</p>
            </div>
        )
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center px-6">
                <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
                <h1 className="text-xl font-semibold text-white mb-2">Application received</h1>
                <p className="text-sm text-slate-400 max-w-sm">
                    Thanks for applying to {job.title}{job.company ? ` at ${job.company}` : ''}. The hiring team will reach out if there's a fit.
                </p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="max-w-xl mx-auto px-6 py-12">
                {/* Job header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                            <Briefcase className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-white">{job.title}</h1>
                            <p className="text-sm text-slate-400">{job.company || '—'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                        {job.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {job.location}{job.remote_ok ? ' · Remote OK' : ''}</span>}
                        {job.salary_range && <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> {job.salary_range}</span>}
                    </div>
                    {job.description && <p className="text-sm text-slate-300 leading-relaxed">{job.description}</p>}
                    {(job.must_haves?.length ?? 0) > 0 && (
                        <div className="mt-4">
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">What you'll need</p>
                            <ul className="space-y-1">
                                {job.must_haves!.map(m => <li key={m} className="text-sm text-slate-300">• {m}</li>)}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Application form */}
                <form onSubmit={handleSubmit} className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 space-y-4">
                    <h2 className="text-sm font-semibold text-white">Apply for this role</h2>

                    {/* Honeypot — hidden from real users, bots often fill every field */}
                    <input type="text" name="company_website" tabIndex={-1} autoComplete="off"
                        className="absolute -left-[9999px] w-px h-px opacity-0" aria-hidden="true" />

                    <div>
                        <label className="block text-xs text-slate-400 mb-1.5">Full name</label>
                        <input required value={name} onChange={e => setName(e.target.value)}
                            className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50" />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1.5">Email</label>
                        <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                            className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50" />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1.5">Phone (optional)</label>
                        <input value={phone} onChange={e => setPhone(e.target.value)}
                            className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50" />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1.5">Resume</label>
                        {file ? (
                            <div className="flex items-center justify-between bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5">
                                <span className="flex items-center gap-2 text-sm text-slate-300 truncate"><FileText className="w-4 h-4 text-slate-500 shrink-0" />{file.name}</span>
                                <button type="button" onClick={() => setFile(null)} className="text-slate-500 hover:text-red-400 transition-colors shrink-0"><X className="w-4 h-4" /></button>
                            </div>
                        ) : (
                            <div
                                onClick={() => fileRef.current?.click()}
                                className="border-2 border-dashed border-white/10 hover:border-white/20 rounded-lg py-6 text-center cursor-pointer transition-colors"
                            >
                                <Upload className="w-6 h-6 mx-auto mb-2 text-slate-500" />
                                <p className="text-sm text-slate-300">Click to upload your resume</p>
                                <p className="text-xs text-slate-500 mt-1">.pdf, .docx, or .txt — max 5MB</p>
                                <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden"
                                    onChange={e => setFile(e.target.files?.[0] || null)} />
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-red-300">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
                    >
                        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : 'Submit Application'}
                    </button>
                </form>

                <p className="text-center text-xs text-slate-600 mt-6">Powered by Nexu AI — NodalNexus</p>
            </div>
        </div>
    )
}
