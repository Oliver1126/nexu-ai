'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle } from 'lucide-react'

export type ParsedCandidate = {
    name: string
    email?: string
    phone?: string
    current_role?: string
    current_company?: string
    years_experience?: number | null
    skills: string[]
    score?: number
    grade?: string
    status?: string
    source?: string
    career_summary?: string
}

type JobOption = { id: string; title: string; company?: string | null }

type Props = {
    jobs: JobOption[]
    onClose: () => void
    onImport: (candidates: ParsedCandidate[], jobId: string | null) => Promise<number>
}

const norm = (h: string) => h.trim().toLowerCase().replace(/"/g, '').replace(/[\s_-]+/g, '')

export default function CandidateCSVUpload({ jobs, onClose, onImport }: Props) {
    const [isDragging, setIsDragging] = useState(false)
    const [parsed, setParsed] = useState<ParsedCandidate[]>([])
    const [errors, setErrors] = useState<string[]>([])
    const [importing, setImporting] = useState(false)
    const [result, setResult] = useState<{ count: number } | null>(null)
    const [jobId, setJobId] = useState<string>(jobs[0]?.id ?? '')
    const fileRef = useRef<HTMLInputElement>(null)

    const parseCSV = useCallback((text: string) => {
        const lines = text.trim().split('\n')
        if (lines.length < 2) {
            setErrors(['CSV must have a header row and at least one data row.'])
            return
        }
        const headers = lines[0].split(',').map(norm)
        const idx = (names: string[]) => headers.findIndex(h => names.includes(h))
        const nameIdx = idx(['name', 'fullname', 'candidatename', 'first', 'firstname'])
        const emailIdx = idx(['email', 'emailaddress', 'mail'])
        const phoneIdx = idx(['phone', 'mobile', 'cell', 'tel', 'phonenumber'])
        const roleIdx = idx(['currentrole', 'role', 'title', 'position', 'jobtitle'])
        const companyIdx = idx(['currentcompany', 'company', 'employer', 'organization'])
        const expIdx = idx(['yearsexperience', 'experience', 'yoe', 'years'])
        const skillsIdx = idx(['skills', 'skill', 'tech', 'technologies'])
        const scoreIdx = idx(['score'])
        const gradeIdx = idx(['grade'])
        const statusIdx = idx(['status'])
        const sourceIdx = idx(['source'])
        const summaryIdx = idx(['careersummary', 'summary', 'bio', 'notes', 'about'])

        if (nameIdx === -1) {
            setErrors([
                `Could not find a "name" column. Your headers: [${lines[0].split(',').map(h => h.trim()).join(', ')}]`,
                'Required: a "name" column.',
                'Optional: email, phone, current_role, current_company, years_experience, skills, score, grade, status, source, career_summary',
                'Tip: put multiple skills in one cell separated by semicolons, e.g. "Node.js; PostgreSQL; AWS"',
            ])
            return
        }

        const rows: ParsedCandidate[] = []
        const errs: string[] = []
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim()
            if (!line) continue
            // quoted-CSV split
            const values: string[] = []
            let cur = '', inQ = false
            for (const ch of line) {
                if (ch === '"') inQ = !inQ
                else if (ch === ',' && !inQ) { values.push(cur.trim()); cur = '' }
                else cur += ch
            }
            values.push(cur.trim())
            const cell = (n: number) => (n >= 0 ? values[n]?.replace(/"/g, '').trim() : undefined)

            const name = cell(nameIdx)
            if (!name) { errs.push(`Row ${i + 1}: missing name, skipped.`); continue }

            const skillsRaw = cell(skillsIdx)
            const expRaw = cell(expIdx)
            const scoreRaw = cell(scoreIdx)
            const gradeRaw = (cell(gradeIdx) || '').toUpperCase()

            rows.push({
                name,
                email: cell(emailIdx),
                phone: cell(phoneIdx),
                current_role: cell(roleIdx),
                current_company: cell(companyIdx),
                years_experience: expRaw ? parseInt(expRaw) || null : null,
                skills: skillsRaw ? skillsRaw.split(/[;|]/).map(s => s.trim()).filter(Boolean) : [],
                score: scoreRaw ? Math.min(100, Math.max(0, parseInt(scoreRaw) || 0)) : undefined,
                grade: ['A', 'B', 'C', 'D'].includes(gradeRaw) ? gradeRaw : undefined,
                status: cell(statusIdx),
                source: cell(sourceIdx),
                career_summary: cell(summaryIdx),
            })
        }
        setErrors(errs)
        setParsed(rows)
    }, [])

    const handleFile = useCallback((file: File) => {
        if (!file.name.endsWith('.csv')) { setErrors(['Please upload a .csv file.']); return }
        const reader = new FileReader()
        reader.onload = (e) => parseCSV(e.target?.result as string)
        reader.readAsText(file)
    }, [parseCSV])

    const doImport = async () => {
        setImporting(true)
        try {
            const count = await onImport(parsed, jobId || null)
            setResult({ count })
        } catch {
            setErrors(['Import failed.'])
        } finally {
            setImporting(false)
        }
    }

    const selectedJob = jobs.find(j => j.id === jobId)

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[88vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                            <FileSpreadsheet className="w-4 h-4 text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-white">Bulk Upload Candidates</h2>
                            <p className="text-xs text-slate-400">Import a CSV of candidates for a job</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"><X className="w-4 h-4 text-slate-400" /></button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(88vh-130px)]">
                    {result ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-green-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">{result.count} candidates imported!</h3>
                            <p className="text-sm text-slate-400 mb-6">
                                {selectedJob ? `Attached to "${selectedJob.title}". ` : ''}Unscored candidates will be graded when the AI scoring workflow runs.
                            </p>
                            <button onClick={onClose} className="px-6 py-2.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-sm font-medium hover:bg-cyan-500/30 transition-all">Done</button>
                        </div>
                    ) : (
                        <>
                            {/* Job selector */}
                            <div className="mb-4">
                                <label className="block text-xs text-slate-400 mb-1.5">Attach candidates to job</label>
                                <select value={jobId} onChange={e => setJobId(e.target.value)} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50">
                                    <option value="">— No specific job —</option>
                                    {jobs.map(j => <option key={j.id} value={j.id}>{j.title}{j.company ? ` @ ${j.company}` : ''}</option>)}
                                </select>
                            </div>

                            {parsed.length === 0 ? (
                                <>
                                    <div
                                        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                                        onClick={() => fileRef.current?.click()}
                                        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${isDragging ? 'border-cyan-400 bg-cyan-500/10' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}`}
                                    >
                                        <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-cyan-400' : 'text-slate-500'}`} />
                                        <p className="text-sm text-white mb-1">{isDragging ? 'Drop CSV here' : 'Click to upload or drag & drop'}</p>
                                        <p className="text-xs text-slate-500">CSV files only (.csv)</p>
                                        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                                    </div>
                                    <div className="mt-4 bg-slate-800/50 rounded-lg p-4">
                                        <p className="text-xs text-slate-400 mb-2 font-medium">Expected CSV columns:</p>
                                        <code className="text-xs text-cyan-400 block bg-slate-900 rounded p-2 overflow-x-auto">name,email,phone,current_role,current_company,years_experience,skills,score,grade,status,source,career_summary</code>
                                        <p className="text-xs text-slate-500 mt-2">Only <span className="text-white">name</span> is required. Put multiple skills in one cell with semicolons: <span className="text-white">&quot;Node.js; PostgreSQL; AWS&quot;</span></p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-sm text-white"><span className="text-cyan-400 font-semibold">{parsed.length}</span> candidates ready{selectedJob ? ` for ${selectedJob.title}` : ''}</p>
                                        <button onClick={() => { setParsed([]); setErrors([]) }} className="text-xs text-slate-400 hover:text-white transition-colors">Upload different file</button>
                                    </div>
                                    <div className="border border-white/10 rounded-lg overflow-hidden mb-4">
                                        <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
                                            <table className="w-full text-xs">
                                                <thead className="bg-slate-800 sticky top-0">
                                                    <tr>
                                                        {['#', 'Name', 'Role', 'Company', 'Skills', 'Score'].map(c => <th key={c} className="text-left px-3 py-2 text-slate-400 font-medium">{c}</th>)}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {parsed.slice(0, 50).map((c, i) => (
                                                        <tr key={i} className="hover:bg-white/5">
                                                            <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                                                            <td className="px-3 py-2 text-white">{c.name}</td>
                                                            <td className="px-3 py-2 text-slate-300">{c.current_role || '—'}</td>
                                                            <td className="px-3 py-2 text-slate-400">{c.current_company || '—'}</td>
                                                            <td className="px-3 py-2 text-slate-400">{c.skills.slice(0, 3).join(', ') || '—'}</td>
                                                            <td className="px-3 py-2 text-slate-400">{c.score ?? '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {parsed.length > 50 && <div className="px-3 py-2 bg-slate-800/50 text-xs text-slate-500">Showing first 50 of {parsed.length}</div>}
                                    </div>
                                    <button onClick={doImport} disabled={importing} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl text-sm font-medium hover:bg-cyan-500/30 transition-all disabled:opacity-50">
                                        {importing ? <><span className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" /> Importing…</> : <><Upload className="w-4 h-4" /> Import {parsed.length} candidates</>}
                                    </button>
                                </>
                            )}

                            {errors.length > 0 && (
                                <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-1"><AlertCircle className="w-3.5 h-3.5 text-red-400" /><p className="text-xs font-medium text-red-400">Issues found</p></div>
                                    {errors.map((e, i) => <p key={i} className="text-xs text-red-300/80 ml-5">{e}</p>)}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
