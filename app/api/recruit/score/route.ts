import { NextRequest, NextResponse } from 'next/server'
import { scoreResume, ScoringError, type RecruitJob } from '@/lib/recruit-scoring'

// ──────────────────────────────────────────────────────────────
// AI Resume Analyzer — scores a resume against a job description
// using Claude (Anthropic Messages API). Returns structured JSON:
// score, grade, reasoning, extracted skills, must-have coverage.
//
// Real AI even in demo mode (this runs server-side and calls Claude).
// Requires a valid ANTHROPIC_API_KEY in the environment.
// ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
        return NextResponse.json(
            { error: 'ANTHROPIC_API_KEY is not set. Add a valid key to .env.local and restart the dev server.' },
            { status: 500 },
        )
    }

    let body: { resumeText?: string; job?: RecruitJob }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const resumeText = (body.resumeText || '').trim()
    const job = body.job || {}
    if (resumeText.length < 30) {
        return NextResponse.json({ error: 'Please paste the full resume text (at least a few lines).' }, { status: 400 })
    }

    try {
        const result = await scoreResume(resumeText, job, apiKey)
        return NextResponse.json({ result })
    } catch (err) {
        if (err instanceof ScoringError) {
            return NextResponse.json({ error: err.message }, { status: err.status })
        }
        console.error('[recruit/score] request failed:', err)
        return NextResponse.json({ error: 'Could not reach the Anthropic API. Check your connection.' }, { status: 502 })
    }
}
