import { NextRequest, NextResponse } from 'next/server'
import { scoreResume, ScoringError, type RecruitJob } from '@/lib/recruit-scoring'
import { extractResumeText, ExtractError } from '@/lib/resume-extract'

// ──────────────────────────────────────────────────────────────
// Batch CV screening — accepts a job + a stack of resume files
// (.pdf/.docx/.txt) as multipart form data, extracts text from
// each, scores each against the job with Claude, and returns one
// result per file. This is the "stack of CVs" flow the MVP promises;
// /api/recruit/score only ever handled one pasted resume at a time.
//
// Runs sequentially (not Promise.all) to stay under Anthropic rate
// limits on a batch of resumes — fine for MVP volumes (a few dozen).
// ──────────────────────────────────────────────────────────────

export const maxDuration = 300 // allow up to 5 min for larger batches

type BatchItem =
    | { fileName: string; ok: true; resumeText: string; result: Awaited<ReturnType<typeof scoreResume>> }
    | { fileName: string; ok: false; error: string }

export async function POST(req: NextRequest) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
        return NextResponse.json(
            { error: 'ANTHROPIC_API_KEY is not set. Add a valid key to .env.local and restart the dev server.' },
            { status: 500 },
        )
    }

    let form: FormData
    try {
        form = await req.formData()
    } catch {
        return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 })
    }

    let job: RecruitJob = {}
    const jobRaw = form.get('job')
    if (typeof jobRaw === 'string') {
        try { job = JSON.parse(jobRaw) } catch { /* ignore, score with no job context */ }
    }

    const files = form.getAll('files').filter((f): f is File => f instanceof File)
    if (files.length === 0) {
        return NextResponse.json({ error: 'No files uploaded.' }, { status: 400 })
    }
    if (files.length > 50) {
        return NextResponse.json({ error: 'Please upload 50 resumes or fewer at a time.' }, { status: 400 })
    }

    const results: BatchItem[] = []

    for (const file of files) {
        try {
            const resumeText = await extractResumeText(file)
            if (resumeText.length < 30) {
                results.push({ fileName: file.name, ok: false, error: 'Could not read enough text from this file (it may be a scanned/image PDF).' })
                continue
            }
            const result = await scoreResume(resumeText, job, apiKey)
            results.push({ fileName: file.name, ok: true, resumeText, result })
        } catch (err) {
            const message =
                err instanceof ExtractError ? err.message :
                    err instanceof ScoringError ? err.message :
                        'Unexpected error processing this file.'
            console.error('[recruit/score-batch]', file.name, err)
            results.push({ fileName: file.name, ok: false, error: message })
        }
    }

    return NextResponse.json({ results })
}
