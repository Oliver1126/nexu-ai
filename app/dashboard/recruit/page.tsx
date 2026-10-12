'use client'

import { useEffect, useState, useCallback, useMemo, Suspense } from 'react'
import { createClient } from '@/lib/db-client'
import { Search, Filter, ChevronDown, X, RefreshCw, Plus, Upload, Download, Sparkles, Users, Briefcase, Trophy, Clock } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import CandidateCSVUpload, { type ParsedCandidate } from '@/components/CandidateCSVUpload'
import ResumeAnalyzer, { type AnalyzedCandidate } from '@/components/ResumeAnalyzer'
import BulkResumeAnalyzer from '@/components/BulkResumeAnalyzer'

type Candidate = {
    id: string
    name: string
    email: string | null
    phone: string | null
    current_role: string | null
    current_company: string | null
    years_experience: number | null
    skills: string[]
    score: number
    grade: string
    status: string
    source: string | null
    career_summary: string | null
    score_reasoning: string | null
    cv_text: string | null
    job_id: string | null
    created_at: string
    archived_at: string | null
}

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
        rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
        withdrawn: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
        open: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
        filled: 'bg-green-500/20 text-green-400 border-green-500/30',
        closed: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
        on_hold: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    }
    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize border ${colors[status] || colors.new}`}>
            {status.replace(/_/g, ' ')}
        </span>
    )
}

const inputCls = 'w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
            {children}
        </div>
    )
}

const emptyJobForm = { title: '', company: '', location: '', salary_range: '', status: 'open', positions_total: '1', experience_min: '', experience_max: '', description: '', skills_required: '', must_haves: '', nice_to_haves: '', hiring_manager_name: '', hiring_manager_email: '' }

const CANDIDATE_STATUSES = ['all', 'new', 'shortlisted', 'interviewing', 'offered', 'placed', 'rejected']
const GRADE_OPTIONS = ['all', 'A', 'B', 'C', 'D']

export default function RecruitmentPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
            <RecruitmentPageInner />
        </Suspense>
    )
}

function RecruitmentPageInner() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'candidates' | 'jobs'>('candidates')
    const [candidates, setCandidates] = useState<Candidate[]>([])
    const [jobs, setJobs] = useState<Job[]>([])
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [filterGrade, setFilterGrade] = useState('all')
    const [filterJob, setFilterJob] = useState('all')
    const [showFilters, setShowFilters] = useState(false)
    const [showHidden, setShowHidden] = useState(false)
    const [showNewJob, setShowNewJob] = useState(false)
    const [showBulkUpload, setShowBulkUpload] = useState(false)
    const [showAnalyzer, setShowAnalyzer] = useState(false)
    const [showBulkAnalyzer, setShowBulkAnalyzer] = useState(false)
    const [jobForm, setJobForm] = useState(emptyJobForm)
    const [savingJob, setSavingJob] = useState(false)
    const [editingJobId, setEditingJobId] = useState<string | null>(null)

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // RLS on jobs/candidates requires client_id = auth.uid() on every insert —
    // without it, inserts silently fail once demo mode is off (demo client
    // stubs this to a fixed 'demo-user' id, so it's harmless there too).
    const getUserId = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        return user?.id
    }, [supabase])

    const fetchData = useCallback(async () => {
        const [candidatesRes, jobsRes] = await Promise.all([
            supabase
                .from('candidates')
                .select('id, name, email, phone, current_role, current_company, years_experience, skills, score, grade, status, source, career_summary, score_reasoning, cv_text, job_id, created_at, archived_at')
                .order('created_at', { ascending: false })
                .limit(300),
            supabase
                .from('jobs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100),
        ])

        if (candidatesRes.data) setCandidates(candidatesRes.data)
        if (jobsRes.data) setJobs(jobsRes.data)
        setLastRefresh(new Date())
    }, [])

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 30000)
        return () => clearInterval(interval)
    }, [fetchData])

    // Lets the job detail page link here as `?edit=<jobId>` to jump straight
    // into the edit modal, since the modal itself only lives on this page.
    useEffect(() => {
        const editId = searchParams.get('edit')
        if (!editId || jobs.length === 0) return
        const job = jobs.find(j => j.id === editId)
        if (job) {
            setActiveTab('jobs')
            startEditJob(job)
        }
        router.replace('/dashboard/recruit', { scroll: false })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jobs, searchParams])

    const updateCandidateStatus = async (candidateId: string, newStatus: string) => {
        await supabase.from('candidates').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', candidateId)
        await fetchData()
    }

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id); else next.add(id)
            return next
        })
    }

    const toggleSelectAll = () => {
        setSelectedIds(prev =>
            prev.size === filteredCandidates.length ? new Set() : new Set(filteredCandidates.map(c => c.id))
        )
    }

    const bulkUpdateStatus = async (newStatus: string) => {
        if (selectedIds.size === 0) return
        await supabase.from('candidates').update({ status: newStatus, updated_at: new Date().toISOString() }).in('id', Array.from(selectedIds))
        setSelectedIds(new Set())
        await fetchData()
    }

    // "Hide" is a UI-level soft-delete — the candidate's data (including CV
    // text) stays in the database untouched, it just stops showing up in the
    // default view. Not a real deletion/retention policy — see
    // Nexu AI/MVP-FEATURE-GAP-ANALYSIS.md for that separate, still-open question.
    const hideCandidate = async (candidateId: string) => {
        await supabase.from('candidates').update({ archived_at: new Date().toISOString() }).eq('id', candidateId)
        await fetchData()
    }

    const restoreCandidate = async (candidateId: string) => {
        await supabase.from('candidates').update({ archived_at: null }).eq('id', candidateId)
        await fetchData()
    }

    const bulkHide = async () => {
        if (selectedIds.size === 0) return
        await supabase.from('candidates').update({ archived_at: new Date().toISOString() }).in('id', Array.from(selectedIds))
        setSelectedIds(new Set())
        await fetchData()
    }

    const closeJobModal = () => {
        setShowNewJob(false)
        setEditingJobId(null)
        setJobForm(emptyJobForm)
    }

    const startEditJob = (job: Job) => {
        setJobForm({
            title: job.title,
            company: job.company || '',
            location: job.location || '',
            salary_range: job.salary_range || '',
            status: job.status,
            positions_total: String(job.positions_total ?? 1),
            experience_min: job.experience_min != null ? String(job.experience_min) : '',
            experience_max: job.experience_max != null ? String(job.experience_max) : '',
            description: job.description || '',
            skills_required: (job.skills_required || []).join(', '),
            must_haves: (job.must_haves || []).join(', '),
            nice_to_haves: (job.nice_to_haves || []).join(', '),
            hiring_manager_name: job.hiring_manager_name || '',
            hiring_manager_email: job.hiring_manager_email || '',
        })
        setEditingJobId(job.id)
        setShowNewJob(true)
    }

    const handleSaveJob = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!jobForm.title.trim()) return
        setSavingJob(true)
        const toArr = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean)
        const payload = {
            title: jobForm.title.trim(),
            company: jobForm.company.trim() || null,
            location: jobForm.location.trim() || null,
            salary_range: jobForm.salary_range.trim() || null,
            status: jobForm.status,
            positions_total: parseInt(jobForm.positions_total) || 1,
            experience_min: jobForm.experience_min ? parseInt(jobForm.experience_min) : null,
            experience_max: jobForm.experience_max ? parseInt(jobForm.experience_max) : null,
            remote_ok: /remote/i.test(jobForm.location),
            description: jobForm.description.trim() || null,
            skills_required: toArr(jobForm.skills_required),
            must_haves: toArr(jobForm.must_haves),
            nice_to_haves: toArr(jobForm.nice_to_haves),
            hiring_manager_name: jobForm.hiring_manager_name.trim() || null,
            hiring_manager_email: jobForm.hiring_manager_email.trim() || null,
        }
        if (editingJobId) {
            await supabase.from('jobs').update(payload).eq('id', editingJobId)
        } else {
            await supabase.from('jobs').insert({ ...payload, positions_filled: 0, client_id: await getUserId() })
        }
        await fetchData()
        setActiveTab('jobs')
        setJobForm(emptyJobForm)
        setEditingJobId(null)
        setShowNewJob(false)
        setSavingJob(false)
    }

    const handleBulkImport = async (rows: ParsedCandidate[], jId: string | null) => {
        const clientId = await getUserId()
        const toInsert = rows.map(r => ({
            name: r.name,
            email: r.email || null,
            phone: r.phone || null,
            current_role: r.current_role || null,
            current_company: r.current_company || null,
            years_experience: r.years_experience ?? null,
            skills: r.skills,
            score: r.score ?? 0,
            grade: r.grade || 'D',
            status: r.status || 'new',
            source: r.source || 'CSV Import',
            career_summary: r.career_summary || null,
            job_id: jId,
            client_id: clientId,
        }))
        await supabase.from('candidates').insert(toInsert)
        await fetchData()
        setActiveTab('candidates')
        return toInsert.length
    }

    // Same person, same job, uploaded/scored twice — the classic accidental
    // re-upload. Matches by email (case-insensitive) since that's the one
    // reliably-unique field Nexu AI extracts from a resume.
    const findDuplicate = (email: string | null, jobId: string | null) => {
        if (!email) return undefined
        const key = email.trim().toLowerCase()
        return candidates.find(c => c.job_id === jobId && c.email?.trim().toLowerCase() === key)
    }

    const handleSaveAnalyzed = async (candidate: AnalyzedCandidate) => {
        const dup = findDuplicate(candidate.email, candidate.job_id)
        if (dup && !window.confirm(
            `${candidate.name} (${candidate.email}) already exists for this job as "${dup.name}" with a score of ${dup.score}.\n\nSave as a new duplicate entry anyway?`
        )) {
            return
        }
        await supabase.from('candidates').insert({ ...candidate, client_id: await getUserId() })
        await fetchData()
        setActiveTab('candidates')
    }

    const handleSaveBatch = async (batch: AnalyzedCandidate[]) => {
        if (batch.length === 0) return
        const fresh: AnalyzedCandidate[] = []
        for (const c of batch) {
            const dup = findDuplicate(c.email, c.job_id)
            if (!dup) fresh.push(c)
        }
        if (fresh.length > 0) {
            const clientId = await getUserId()
            await supabase.from('candidates').insert(fresh.map(c => ({ ...c, client_id: clientId })))
        }
        await fetchData()
        setActiveTab('candidates')
        return fresh.length
    }

    const hiddenCount = useMemo(() => candidates.filter(c => c.archived_at).length, [candidates])

    const filteredCandidates = useMemo(() => {
        let result = showHidden ? candidates.filter(c => c.archived_at) : candidates.filter(c => !c.archived_at)
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            result = result.filter(c =>
                c.name.toLowerCase().includes(q) ||
                (c.email?.toLowerCase().includes(q)) ||
                (c.current_role?.toLowerCase().includes(q)) ||
                (c.current_company?.toLowerCase().includes(q)) ||
                (c.skills || []).some(s => s.toLowerCase().includes(q)) ||
                (c.career_summary?.toLowerCase().includes(q)) ||
                (c.cv_text?.toLowerCase().includes(q))
            )
        }
        if (filterStatus !== 'all') result = result.filter(c => c.status === filterStatus)
        if (filterGrade !== 'all') result = result.filter(c => c.grade === filterGrade)
        if (filterJob !== 'all') result = result.filter(c => c.job_id === filterJob)
        return result
    }, [candidates, searchQuery, filterStatus, filterGrade, filterJob, showHidden])

    const getJobTitle = (jobId: string | null) => {
        if (!jobId) return '—'
        const job = jobs.find(j => j.id === jobId)
        return job ? `${job.title}${job.company ? ` @ ${job.company}` : ''}` : '—'
    }

    // Exports whatever is currently filtered/searched — same pattern as the
    // Leads page's CSV export, plus reasoning since that's specific to recruiting.
    const exportCandidatesCSV = () => {
        const headers = ['Name', 'Email', 'Phone', 'Current Role', 'Current Company', 'Years Experience', 'Skills', 'Score', 'Grade', 'Status', 'Source', 'Job Match', 'Reasoning', 'Date']
        const rows = filteredCandidates.map(c => [
            c.name,
            c.email || '',
            c.phone || '',
            c.current_role || '',
            c.current_company || '',
            c.years_experience ?? '',
            (c.skills || []).join('; '),
            c.score,
            c.grade,
            c.status,
            c.source || '',
            getJobTitle(c.job_id),
            (c.score_reasoning || ''),
            new Date(c.created_at).toLocaleDateString(),
        ])
        const csv = [headers, ...rows]
            .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
            .join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `nodalnexus-candidates-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    // Stats
    const totalCandidates = candidates.length
    const aGrade = candidates.filter(c => c.grade === 'A').length
    const interviews = candidates.filter(c => c.status === 'interviewing').length
    const placed = candidates.filter(c => c.status === 'placed').length
    const openJobs = jobs.filter(j => j.status === 'open').length
    const activeFilters = (filterStatus !== 'all' ? 1 : 0) + (filterGrade !== 'all' ? 1 : 0) + (filterJob !== 'all' ? 1 : 0) + (searchQuery ? 1 : 0)

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <div className="border-b border-white/10 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                            <Users className="w-4 h-4 text-violet-400" />
                        </div>
                        <div>
                            <h1 className="font-semibold text-white text-sm">Recruitment Module</h1>
                            <p className="text-xs text-slate-400">Candidates · Jobs · Placements</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={fetchData} className="text-xs text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                            <RefreshCw className="w-3.5 h-3.5" />
                            {lastRefresh.toLocaleTimeString()}
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                            <span className="text-xs text-slate-400">LIVE</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Stats Row */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                    {[
                        { label: 'Total Candidates', value: totalCandidates, icon: Users, color: 'text-white' },
                        { label: 'A-Grade', value: aGrade, icon: Trophy, color: 'text-green-400' },
                        { label: 'Interviewing', value: interviews, icon: Clock, color: 'text-yellow-400' },
                        { label: 'Placed', value: placed, icon: Trophy, color: 'text-emerald-400' },
                        { label: 'Open Jobs', value: openJobs, icon: Briefcase, color: 'text-cyan-400' },
                    ].map((stat) => (
                        <div key={stat.label} className="bg-slate-900/50 border border-white/10 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-1">
                                <stat.icon className="w-3.5 h-3.5 text-slate-500" />
                                <p className="text-xs text-slate-400">{stat.label}</p>
                            </div>
                            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center gap-1 mb-6 bg-slate-900/50 border border-white/10 rounded-xl p-1 w-fit">
                    {(['candidates', 'jobs'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === tab
                                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            {tab === 'candidates' ? `Candidates (${candidates.length})` : `Jobs (${jobs.length})`}
                        </button>
                    ))}
                </div>

                {/* CANDIDATES TAB */}
                {activeTab === 'candidates' && (
                    <>
                        {/* Search + Filter Bar */}
                        <div className="mb-4 flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search name, email, role, company, skill, or anywhere in the resume..."
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border transition-all ${activeFilters > 0
                                    ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                                    : 'bg-slate-900/50 border-white/10 text-slate-400 hover:text-white'
                                    }`}
                            >
                                <Filter className="w-4 h-4" />
                                Filters
                                {activeFilters > 0 && (
                                    <span className="w-5 h-5 rounded-full bg-cyan-500 text-white text-xs flex items-center justify-center font-bold">{activeFilters}</span>
                                )}
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                            </button>
                            <button
                                onClick={exportCandidatesCSV}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border bg-slate-900/50 border-white/10 text-slate-400 hover:text-white transition-all whitespace-nowrap"
                                title="Export the candidates currently shown (respects search/filters) as CSV"
                            >
                                <Download className="w-4 h-4" /> Export CSV
                            </button>
                            <button
                                onClick={() => setShowBulkUpload(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border bg-slate-900/50 border-white/10 text-slate-400 hover:text-white transition-all whitespace-nowrap"
                                title="Import a CSV of candidates that already have scores/grades"
                            >
                                <Upload className="w-4 h-4" /> Import Scored CSV
                            </button>
                            <button
                                onClick={() => setShowAnalyzer(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border bg-slate-900/50 border-white/10 text-slate-400 hover:text-white transition-all whitespace-nowrap"
                                title="Paste one resume's text to score it"
                            >
                                <Sparkles className="w-4 h-4" /> Analyze One (Paste Text)
                            </button>
                            <button
                                onClick={() => setShowBulkAnalyzer(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border bg-cyan-500/15 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25 transition-all whitespace-nowrap"
                            >
                                <Sparkles className="w-4 h-4" /> Bulk Screen CVs
                            </button>
                        </div>

                        {/* Filter Dropdowns */}
                        {showFilters && (
                            <div className="mb-4 p-4 bg-slate-900/50 border border-white/10 rounded-xl flex flex-wrap gap-4 items-center">
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1.5">Status</label>
                                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 capitalize">
                                        {CANDIDATE_STATUSES.map(s => (<option key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1.5">Grade</label>
                                    <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50">
                                        {GRADE_OPTIONS.map(g => (<option key={g} value={g}>{g === 'all' ? 'All Grades' : `Grade ${g}`}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1.5">Job</label>
                                    <select value={filterJob} onChange={e => setFilterJob(e.target.value)} className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50">
                                        <option value="all">All Jobs</option>
                                        {jobs.filter(j => j.status === 'open').map(j => (<option key={j.id} value={j.id}>{j.title} @ {j.company || 'N/A'}</option>))}
                                    </select>
                                </div>
                                {activeFilters > 0 && (
                                    <button onClick={() => { setFilterStatus('all'); setFilterGrade('all'); setFilterJob('all'); setSearchQuery('') }} className="text-xs text-red-400 hover:text-red-300 transition-colors mt-5">Clear all</button>
                                )}
                                <p className="text-xs text-slate-500 mt-5 ml-auto">Showing {filteredCandidates.length} of {candidates.length}</p>
                            </div>
                        )}

                        {/* Candidates Table */}
                        <div className="bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4">
                                {selectedIds.size > 0 ? (
                                    <>
                                        <span className="text-sm text-cyan-400 font-medium">{selectedIds.size} selected</span>
                                        <div className="flex items-center gap-2 ml-auto">
                                            {showHidden ? (
                                                <button onClick={async () => { for (const id of selectedIds) await restoreCandidate(id); setSelectedIds(new Set()) }} className="px-3 py-1.5 text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition-colors">Restore Selected</button>
                                            ) : (
                                                <>
                                                    <button onClick={() => bulkUpdateStatus('shortlisted')} className="px-3 py-1.5 text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors">Shortlist Selected</button>
                                                    <button onClick={() => bulkUpdateStatus('interviewing')} className="px-3 py-1.5 text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg hover:bg-yellow-500/30 transition-colors">Interview Selected</button>
                                                    <button onClick={() => bulkUpdateStatus('rejected')} className="px-3 py-1.5 text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors">Reject Selected</button>
                                                    <button onClick={bulkHide} className="px-3 py-1.5 text-xs bg-slate-700/50 text-slate-300 border border-white/10 rounded-lg hover:bg-slate-700 transition-colors">Hide Selected</button>
                                                </>
                                            )}
                                            <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">Clear</button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <h2 className="text-sm font-semibold text-white">{showHidden ? 'Hidden Candidates' : activeFilters > 0 ? 'Filtered Candidates' : 'All Candidates'}</h2>
                                        <span className="text-xs text-slate-400">{filteredCandidates.length} candidates · auto-refreshes every 30s</span>
                                        <button onClick={() => setShowHidden(h => !h)} className={`ml-4 px-3 py-1.5 text-xs rounded-lg border transition-colors ${showHidden ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' : 'bg-slate-800 text-slate-400 border-white/10 hover:text-white'}`}>
                                            {showHidden ? '← Back to Candidates' : `Show Hidden${hiddenCount > 0 ? ` (${hiddenCount})` : ''}`}
                                        </button>
                                    </>
                                )}
                            </div>

                            {filteredCandidates.length === 0 ? (
                                <div className="px-6 py-16 text-center">
                                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                                        <span className="text-2xl">{showHidden ? '👀' : searchQuery || activeFilters > 0 ? '🔍' : '📭'}</span>
                                    </div>
                                    <p className="text-slate-400 text-sm">
                                        {showHidden
                                            ? 'No hidden candidates.'
                                            : searchQuery || activeFilters > 0
                                            ? 'No candidates match your filters.'
                                            : 'No candidates yet — they will appear when CVs are processed.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-white/5">
                                                <th className="px-6 py-3 w-10">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.size > 0 && selectedIds.size === filteredCandidates.length}
                                                        onChange={toggleSelectAll}
                                                        className="w-4 h-4 rounded border-white/20 bg-slate-800 accent-cyan-500 cursor-pointer"
                                                        aria-label="Select all candidates"
                                                    />
                                                </th>
                                                {['Candidate', 'Role / Company', 'Skills', 'Grade', 'Score', 'Job Match', 'Status', 'Actions'].map(col => (
                                                    <th key={col} className="text-left text-xs font-medium text-slate-400 px-6 py-3">{col}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredCandidates.map((c) => {
                                                const isExpanded = expandedId === c.id
                                                return (
                                                    <tr key={c.id} className={selectedIds.has(c.id) ? 'bg-cyan-500/5' : ''}>
                                                        <td className="px-6 py-4">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedIds.has(c.id)}
                                                                onChange={() => toggleSelect(c.id)}
                                                                className="w-4 h-4 rounded border-white/20 bg-slate-800 accent-cyan-500 cursor-pointer"
                                                                aria-label={`Select ${c.name}`}
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <Link href={`/dashboard/recruit/${c.id}`} className="text-sm font-medium text-white hover:text-cyan-400 transition-colors">
                                                                {c.name}
                                                            </Link>
                                                            <p className="text-xs text-slate-400">{c.email || 'No email'}</p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className="text-sm text-slate-300">{c.current_role || '—'}</p>
                                                            <p className="text-xs text-slate-500">{c.current_company || ''}</p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                                {(c.skills || []).slice(0, 3).map(skill => (
                                                                    <span key={skill} className="px-2 py-0.5 bg-slate-800 border border-white/5 rounded text-xs text-slate-300">{skill}</span>
                                                                ))}
                                                                {(c.skills || []).length > 3 && (
                                                                    <span className="px-2 py-0.5 text-xs text-slate-500">+{(c.skills || []).length - 3}</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4"><GradeBadge grade={c.grade} /></td>
                                                        <td className="px-6 py-4">
                                                            <span className={`font-bold text-sm ${c.score >= 80 ? 'text-green-400' : c.score >= 60 ? 'text-cyan-400' : c.score >= 40 ? 'text-yellow-400' : 'text-slate-400'}`}>
                                                                {c.score}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-xs text-slate-400 max-w-[140px] truncate">{getJobTitle(c.job_id)}</td>
                                                        <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-1">
                                                                {c.status === 'new' && (
                                                                    <button onClick={() => updateCandidateStatus(c.id, 'shortlisted')} className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-md hover:bg-blue-500/30 transition-colors">Shortlist</button>
                                                                )}
                                                                {(c.status === 'shortlisted') && (
                                                                    <button onClick={() => updateCandidateStatus(c.id, 'interviewing')} className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-md hover:bg-yellow-500/30 transition-colors">Interview</button>
                                                                )}
                                                                {c.status === 'interviewing' && (
                                                                    <button onClick={() => updateCandidateStatus(c.id, 'offered')} className="px-2 py-1 text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-md hover:bg-amber-500/30 transition-colors">Offer</button>
                                                                )}
                                                                {c.status === 'offered' && (
                                                                    <button onClick={() => updateCandidateStatus(c.id, 'placed')} className="px-2 py-1 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-md hover:bg-green-500/30 transition-colors">Place</button>
                                                                )}
                                                                {!['placed', 'rejected', 'withdrawn'].includes(c.status) && (
                                                                    <button onClick={() => updateCandidateStatus(c.id, 'rejected')} className="px-2 py-1 text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded-md hover:bg-red-500/30 transition-colors">✕</button>
                                                                )}
                                                                {showHidden ? (
                                                                    <button onClick={() => restoreCandidate(c.id)} className="px-2 py-1 text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-md hover:bg-cyan-500/30 transition-colors">Restore</button>
                                                                ) : (
                                                                    <button onClick={() => hideCandidate(c.id)} title="Hide from the dashboard — doesn't delete their data" className="px-2 py-1 text-xs bg-slate-700/50 text-slate-400 border border-white/10 rounded-md hover:bg-slate-700 hover:text-white transition-colors">Hide</button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* JOBS TAB */}
                {activeTab === 'jobs' && (
                    <div className="bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-white">Jobs</h2>
                            <div className="flex items-center gap-4">
                                <span className="text-xs text-slate-400">{jobs.length} total · {openJobs} open</span>
                                <button onClick={() => { setJobForm(emptyJobForm); setEditingJobId(null); setShowNewJob(true) }} className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-medium hover:bg-cyan-500/25 transition-colors">
                                    <Plus className="w-3.5 h-3.5" /> New Job
                                </button>
                            </div>
                        </div>

                        {jobs.length === 0 ? (
                            <div className="px-6 py-16 text-center">
                                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">📋</span>
                                </div>
                                <p className="text-slate-400 text-sm">No jobs yet — they will appear when job briefs are processed.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/5">
                                            {['Title', 'Company', 'Location', 'Salary', 'Positions', 'Candidates', 'Status', 'Created', ''].map(col => (
                                                <th key={col} className="text-left text-xs font-medium text-slate-400 px-6 py-3">{col}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {jobs.map((job) => {
                                            const matchingCandidates = candidates.filter(c => c.job_id === job.id)
                                            return (
                                                <tr key={job.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <Link href={`/dashboard/recruit/jobs/${job.id}`} className="text-sm font-medium text-white hover:text-cyan-400 transition-colors">
                                                            {job.title}
                                                        </Link>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-300">{job.company || '—'}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-300">{job.location || '—'}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-300">{job.salary_range || '—'}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm text-slate-300">{job.positions_filled}/{job.positions_total}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-sm font-medium ${matchingCandidates.length > 0 ? 'text-cyan-400' : 'text-slate-500'}`}>
                                                            {matchingCandidates.length}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4"><StatusBadge status={job.status} /></td>
                                                    <td className="px-6 py-4 text-xs text-slate-400">
                                                        {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </td>
                                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                                        <button onClick={() => startEditJob(job)} className="text-xs text-slate-400 hover:text-white transition-colors mr-3">
                                                            Edit
                                                        </button>
                                                        <Link href={`/dashboard/recruit/jobs/${job.id}`} className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                                                            View →
                                                        </Link>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* New/Edit Job Modal */}
            {showNewJob && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={closeJobModal}>
                    <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-slate-900 z-10">
                            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Briefcase className="w-4 h-4 text-cyan-400" /> {editingJobId ? 'Edit Job' : 'New Job'}</h3>
                            <button onClick={closeJobModal} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                        </div>
                        <form onSubmit={handleSaveJob} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="Job Title *"><input required value={jobForm.title} onChange={e => setJobForm({ ...jobForm, title: e.target.value })} className={inputCls} placeholder="Senior Software Engineer" /></Field>
                                <Field label="Company"><input value={jobForm.company} onChange={e => setJobForm({ ...jobForm, company: e.target.value })} className={inputCls} placeholder="Acme Recruitment" /></Field>
                                <Field label="Location"><input value={jobForm.location} onChange={e => setJobForm({ ...jobForm, location: e.target.value })} className={inputCls} placeholder="Sydney, AU (or Remote)" /></Field>
                                <Field label="Salary Range"><input value={jobForm.salary_range} onChange={e => setJobForm({ ...jobForm, salary_range: e.target.value })} className={inputCls} placeholder="A$140k–170k" /></Field>
                                <Field label="Status">
                                    <select value={jobForm.status} onChange={e => setJobForm({ ...jobForm, status: e.target.value })} className={inputCls}>
                                        {['open', 'on_hold', 'filled', 'closed'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                                    </select>
                                </Field>
                                <Field label="Positions"><input type="number" min="1" value={jobForm.positions_total} onChange={e => setJobForm({ ...jobForm, positions_total: e.target.value })} className={inputCls} /></Field>
                                <Field label="Min Experience (yrs)"><input type="number" min="0" value={jobForm.experience_min} onChange={e => setJobForm({ ...jobForm, experience_min: e.target.value })} className={inputCls} placeholder="5" /></Field>
                                <Field label="Max Experience (yrs)"><input type="number" min="0" value={jobForm.experience_max} onChange={e => setJobForm({ ...jobForm, experience_max: e.target.value })} className={inputCls} placeholder="10" /></Field>
                            </div>
                            <Field label="Job Description"><textarea value={jobForm.description} onChange={e => setJobForm({ ...jobForm, description: e.target.value })} rows={3} className={inputCls} placeholder="What the role involves, team, autonomy..." /></Field>
                            <Field label="Required Skills (comma-separated)"><input value={jobForm.skills_required} onChange={e => setJobForm({ ...jobForm, skills_required: e.target.value })} className={inputCls} placeholder="Node.js, PostgreSQL, AWS" /></Field>
                            <Field label="Must-Haves (comma-separated)"><input value={jobForm.must_haves} onChange={e => setJobForm({ ...jobForm, must_haves: e.target.value })} className={inputCls} placeholder="5+ years backend, Strong SQL" /></Field>
                            <Field label="Nice-to-Haves (comma-separated)"><input value={jobForm.nice_to_haves} onChange={e => setJobForm({ ...jobForm, nice_to_haves: e.target.value })} className={inputCls} placeholder="Fintech background, Kubernetes" /></Field>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="Hiring Manager"><input value={jobForm.hiring_manager_name} onChange={e => setJobForm({ ...jobForm, hiring_manager_name: e.target.value })} className={inputCls} placeholder="Jane Dela Cruz" /></Field>
                                <Field label="Hiring Manager Email"><input type="email" value={jobForm.hiring_manager_email} onChange={e => setJobForm({ ...jobForm, hiring_manager_email: e.target.value })} className={inputCls} placeholder="jane@acme.com" /></Field>
                            </div>
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button type="button" onClick={closeJobModal} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
                                <button type="submit" disabled={savingJob || !jobForm.title.trim()} className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors">
                                    {savingJob ? (editingJobId ? 'Saving…' : 'Creating…') : (editingJobId ? 'Save Changes' : 'Create Job')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk Upload Candidates Modal (demo) */}
            {showBulkUpload && (
                <CandidateCSVUpload
                    jobs={jobs}
                    onClose={() => setShowBulkUpload(false)}
                    onImport={handleBulkImport}
                />
            )}

            {/* AI Resume Analyzer Modal (real Claude, one resume) */}
            {showAnalyzer && (
                <ResumeAnalyzer
                    jobs={jobs}
                    onClose={() => setShowAnalyzer(false)}
                    onSave={handleSaveAnalyzed}
                />
            )}

            {/* Bulk CV Screening Modal (real Claude, a stack of PDF/DOCX/TXT resumes) */}
            {showBulkAnalyzer && (
                <BulkResumeAnalyzer
                    jobs={jobs}
                    onClose={() => setShowBulkAnalyzer(false)}
                    onSaveAll={handleSaveBatch}
                />
            )}
        </div>
    )
}
