import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { scoreResume, ScoringError, type RecruitJob } from '@/lib/recruit-scoring'
import { extractResumeText, ExtractError } from '@/lib/resume-extract'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ──────────────────────────────────────────────────────────────
// Public candidate application endpoint — not fully hardened for
// high public traffic yet. Job IDs are real UUIDs (unguessable) once
// Supabase is live, so links are safe to share; still missing:
//   - no malware/virus scanning on uploaded files
//   - no CAPTCHA (honeypot + rate limit only, same as the contact form)
// ──────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5MB

// Same rate-limit pattern as app/api/contact/route.ts
const RATE_LIMIT_MAX = 5
const upstashConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
const redisRateLimiter = upstashConfigured
    ? new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(RATE_LIMIT_MAX, '10 m'),
        analytics: true,
        prefix: 'nn:apply',
    })
    : null
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
async function isRateLimited(ip: string): Promise<boolean> {
    if (redisRateLimiter) {
        // Fail OPEN — an Upstash/network hiccup must not crash real candidate
        // applications. Confirmed in production 2026-07-26: this call was
        // throwing uncaught, taking down the whole endpoint with a raw 500.
        try {
            const { success } = await redisRateLimiter.limit(ip)
            return !success
        } catch (err) {
            console.error('[apply] rate limiter failed, failing open:', err)
            return false
        }
    }
    const now = Date.now()
    const entry = rateLimitMap.get(ip)
    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 })
        return false
    }
    entry.count++
    return entry.count > RATE_LIMIT_MAX
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
    const { jobId } = await params
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
        return NextResponse.json({ error: 'Server is not configured to accept applications right now.' }, { status: 500 })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (await isRateLimited(ip)) {
        return NextResponse.json({ error: 'Too many applications from this connection. Please try again later.' }, { status: 429 })
    }

    let form: FormData
    try {
        form = await req.formData()
    } catch {
        return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 })
    }

    // Honeypot — bots fill hidden fields. Pretend success, do nothing.
    if (form.get('company_website')) {
        return NextResponse.json({ success: true })
    }

    const name = (form.get('name') as string || '').trim()
    const email = (form.get('email') as string || '').trim()
    const phone = (form.get('phone') as string || '').trim()
    const file = form.get('resume')

    if (!name || name.length < 2) return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 })
    if (!email || !email.includes('@')) return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 })
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: 'Please attach your resume.' }, { status: 400 })
    if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: 'Resume file is too large (5MB max).' }, { status: 400 })

    const supabase = getSupabaseAdmin()
    const { data: job, error: jobError } = await supabase.from('jobs').select('*').eq('id', jobId).single()
    if (jobError || !job) {
        return NextResponse.json({ error: 'This job posting could not be found.' }, { status: 404 })
    }
    if (job.status !== 'open') {
        return NextResponse.json({ error: 'This position is no longer accepting applications.' }, { status: 410 })
    }

    let resumeText: string
    try {
        resumeText = await extractResumeText(file)
    } catch (err) {
        const message = err instanceof ExtractError ? err.message : 'Could not read this file.'
        return NextResponse.json({ error: message }, { status: 400 })
    }
    if (resumeText.length < 30) {
        return NextResponse.json({ error: 'Could not read enough text from that file — try a different format.' }, { status: 400 })
    }

    try {
        const result = await scoreResume(resumeText, job as RecruitJob, apiKey)
        await supabase.from('candidates').insert({
            name: result.name || name,
            email: result.email || email,
            phone: phone || null,
            current_role: result.current_role || null,
            current_company: result.current_company || null,
            years_experience: result.years_experience ?? null,
            skills: result.extracted_skills || [],
            score: result.score,
            grade: result.grade,
            status: 'new',
            source: 'Public Application',
            career_summary: result.summary,
            score_reasoning: result.reasoning,
            confidence: result.confidence,
            cv_text: resumeText,
            enrichment_data: {
                recommendation: result.recommendation,
                matched_must_haves: (result.matched_must_haves || []).join(', ') || '—',
                missing_must_haves: (result.missing_must_haves || []).join(', ') || 'none',
            },
            job_id: jobId,
            client_id: job.client_id,
        })
        // Candidates never see their own score/reasoning — that's for the recruiter only.
        return NextResponse.json({ success: true })
    } catch (err) {
        if (err instanceof ScoringError) {
            console.error('[apply] scoring failed:', err.message)
        } else {
            console.error('[apply] unexpected error:', err)
        }
        // Even if AI scoring fails, save the application unscored rather than losing it.
        await supabase.from('candidates').insert({
            name, email, phone: phone || null, skills: [], score: 0, grade: 'D',
            status: 'new', source: 'Public Application (unscored — scoring failed)',
            cv_text: resumeText, job_id: jobId, client_id: job.client_id,
        })
        return NextResponse.json({ success: true })
    }
}
