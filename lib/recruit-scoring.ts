// ──────────────────────────────────────────────────────────────
// Shared Claude scoring logic for the recruit module — one resume
// against one job, returning structured score/grade/reasoning.
// Used by both the single-resume route (/api/recruit/score) and
// the batch route (/api/recruit/score-batch) so the prompt and
// schema only live in one place.
// ──────────────────────────────────────────────────────────────

export type RecruitJob = {
    title?: string
    company?: string | null
    description?: string | null
    skills_required?: string[] | null
    must_haves?: string[] | null
    nice_to_haves?: string[] | null
    experience_min?: number | null
    experience_max?: number | null
}

export type ScoreResult = {
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

export const RESULT_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        name: { type: 'string', description: 'Candidate full name as found in the resume (or "Unknown")' },
        email: { type: 'string', description: 'Candidate email address as found in the resume, or "" if not present' },
        current_role: { type: 'string', description: 'Most recent role/title, or "" if unclear' },
        current_company: { type: 'string', description: 'Most recent company, or "" if unclear' },
        score: { type: 'integer', description: 'Fit score 0–100 for THIS job' },
        grade: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
        recommendation: { type: 'string', enum: ['strong_fit', 'possible_fit', 'weak_fit'] },
        confidence: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
            description: 'How clear-cut this judgment is. "low" means borderline/ambiguous — a human should double-check — even if the score itself is high or low.',
        },
        summary: { type: 'string', description: 'One-paragraph career summary of the candidate' },
        reasoning: { type: 'string', description: 'Why this grade, judged against the job requirements' },
        years_experience: { type: 'integer', description: 'Best estimate of total years of relevant experience' },
        extracted_skills: { type: 'array', items: { type: 'string' } },
        matched_must_haves: { type: 'array', items: { type: 'string' } },
        missing_must_haves: { type: 'array', items: { type: 'string' } },
    },
    required: [
        'name', 'email', 'current_role', 'current_company',
        'score', 'grade', 'recommendation', 'confidence', 'summary', 'reasoning',
        'years_experience', 'extracted_skills', 'matched_must_haves', 'missing_must_haves',
    ],
}

export function buildJobBrief(job: RecruitJob): string {
    const lines = [
        `Title: ${job.title || '(untitled)'}`,
        job.company ? `Company: ${job.company}` : '',
        job.experience_min != null ? `Experience required: ${job.experience_min}${job.experience_max ? `–${job.experience_max}` : '+'} years` : '',
        job.description ? `Description: ${job.description}` : '',
        job.skills_required?.length ? `Required skills: ${job.skills_required.join(', ')}` : '',
        job.must_haves?.length ? `Must-haves:\n- ${job.must_haves.join('\n- ')}` : '',
        job.nice_to_haves?.length ? `Nice-to-haves:\n- ${job.nice_to_haves.join('\n- ')}` : '',
    ]
    return lines.filter(Boolean).join('\n')
}

export class ScoringError extends Error {
    status: number
    constructor(message: string, status: number) {
        super(message)
        this.status = status
    }
}

/** Scores one resume's plain text against one job. Throws ScoringError on failure. */
export async function scoreResume(resumeText: string, job: RecruitJob, apiKey: string): Promise<ScoreResult> {
    const system = [
        'You are an expert technical recruiter. You score a candidate\'s resume against a specific job.',
        'Judge fit strictly against the job\'s requirements — reward matched must-haves and required skills, penalize gaps.',
        'Scoring guide (0–100): 80–100 = A (strong), 60–79 = B (good), 40–59 = C (partial), 0–39 = D (weak).',
        'Grade and recommendation must be consistent with the score. Be specific and honest in the reasoning; cite concrete evidence from the resume.',
        'Also rate your confidence: "low" for genuinely borderline or ambiguous cases (vague resume, missing evidence either way) where a human should double-check regardless of the score — not just for mid-range scores. Use "high" only when the evidence is clear-cut.',
    ].join(' ')

    const userContent = `JOB:\n${buildJobBrief(job)}\n\n---\n\nCANDIDATE RESUME:\n${resumeText}\n\nScore this candidate for the job above.`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            model: 'claude-opus-4-8',
            max_tokens: 4000,
            thinking: { type: 'adaptive' },
            output_config: { format: { type: 'json_schema', schema: RESULT_SCHEMA } },
            system,
            messages: [{ role: 'user', content: userContent }],
        }),
    })

    if (!res.ok) {
        const errText = await res.text()
        console.error('[recruit-scoring] Anthropic error:', res.status, errText)
        const hint = res.status === 401
            ? 'Your ANTHROPIC_API_KEY is invalid or revoked — rotate it at console.anthropic.com and update .env.local.'
            : `Anthropic API error (${res.status}).`
        throw new ScoringError(hint, 502)
    }

    const data = await res.json()

    if (data.stop_reason === 'refusal') {
        throw new ScoringError('The model declined to score this input.', 422)
    }

    const textBlock = (data.content || []).find((b: { type: string }) => b.type === 'text')
    if (!textBlock?.text) {
        throw new ScoringError('No analysis returned by the model.', 502)
    }

    try {
        return JSON.parse(textBlock.text) as ScoreResult
    } catch {
        console.error('[recruit-scoring] JSON parse failed:', textBlock.text?.slice(0, 300))
        throw new ScoringError('Could not parse the model response.', 502)
    }
}
