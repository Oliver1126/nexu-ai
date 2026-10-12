// ──────────────────────────────────────────────────────────────
// Demo seed data — used when NEXT_PUBLIC_DEMO_MODE=true so the app
// renders a realistic interface with NO backend. Safe to keep in the
// repo: none of this is real candidate/client data.
//
// Trimmed from the shared NodalNexus app's lib/demo-data.ts down to
// just the jobs/candidates this standalone product actually uses.
// ──────────────────────────────────────────────────────────────

// recent-but-varied timestamps so "x ago" labels look alive
const ago = (hours: number) => new Date(Date.now() - hours * 3600_000).toISOString()

export const DEMO_JOBS = [
    {
        id: 'job-1', title: 'Senior Software Engineer', company: 'Acme Recruitment (client)', status: 'open',
        location: 'Sydney, AU (Hybrid)', remote_ok: false, salary_range: 'A$140k–170k', positions_total: 3, positions_filled: 1,
        experience_min: 5, experience_max: 10, created_at: ago(30 * 24),
        description: 'Build and own backend services for a high-volume payments platform. Work across API design, data modelling, and reliability. Small team, high autonomy, ships weekly.',
        skills_required: ['Node.js', 'TypeScript', 'PostgreSQL', 'AWS'],
        must_haves: ['5+ years backend', 'Strong SQL / data modelling', 'Production cloud experience'],
        nice_to_haves: ['Payments / fintech background', 'Kubernetes', 'Team lead experience'],
        hiring_manager_name: 'Jane Dela Cruz', hiring_manager_email: 'jane@acmerecruit.com.au',
    },
    {
        id: 'job-2', title: 'Registered Nurse (ICU)', company: 'Summit Recruiting (client)', status: 'open',
        location: 'Melbourne, AU', remote_ok: false, salary_range: 'A$95k–110k', positions_total: 5, positions_filled: 2,
        experience_min: 3, experience_max: 15, created_at: ago(18 * 24),
        description: 'ICU nursing roles for a major metro hospital network. Full-time, rotating shifts. AHPRA registration required.',
        skills_required: ['Critical Care', 'Triage', 'Patient Records'],
        must_haves: ['AHPRA registration', '3+ years acute/ICU care', 'Australian work rights'],
        nice_to_haves: ['Paediatric ICU', 'Postgrad critical care cert'],
        hiring_manager_name: 'Hannah Lee', hiring_manager_email: 'hannah@summitrec.com',
    },
    {
        id: 'job-3', title: 'Sales Development Rep', company: 'Vertex Property (client)', status: 'open',
        location: 'Remote', remote_ok: true, salary_range: 'US$55k–70k + comm', positions_total: 4, positions_filled: 3,
        experience_min: 1, experience_max: 5, created_at: ago(12 * 24),
        description: 'Outbound SDR for a proptech sales team. Book qualified meetings via email, calls, and LinkedIn. Clear path to AE in 12 months.',
        skills_required: ['Outbound', 'Salesforce', 'Cold Calling'],
        must_haves: ['1+ year outbound sales', 'Strong written English', 'Comfortable on the phone'],
        nice_to_haves: ['Real estate / proptech', 'HubSpot', 'Quota attainment record'],
        hiring_manager_name: 'Raj Patel', hiring_manager_email: 'raj@vertexproperty.com',
    },
    {
        id: 'job-4', title: 'Warehouse Supervisor', company: 'Summit Recruiting (client)', status: 'closed',
        location: 'Brisbane, AU', remote_ok: false, salary_range: 'A$80k–90k', positions_total: 1, positions_filled: 1,
        experience_min: 4, experience_max: 12, created_at: ago(60 * 24),
        description: 'Lead a 15-person warehouse team across two shifts. Own safety, throughput, and rostering. Role now filled.',
        skills_required: ['Warehouse Ops', 'Team Lead', 'Safety'],
        must_haves: ['4+ years logistics', 'People management', 'Forklift licence'],
        nice_to_haves: ['WMS experience', 'Lean / continuous improvement'],
        hiring_manager_name: 'Hannah Lee', hiring_manager_email: 'hannah@summitrec.com',
    },
]

// Each candidate is linked to a job (job_id) and "scored" against that job's
// requirements — score_reasoning shows the AI's grade rationale, cv_text is the
// parsed CV. This is what the recruit detail page renders.
export const DEMO_CANDIDATES = [
    {
        id: 'cand-1', name: 'Alex Romero', email: 'alex.romero@email.com', phone: '+61 400 111 222',
        current_role: 'Backend Engineer', current_company: 'FinTechCo', years_experience: 6,
        skills: ['Node.js', 'PostgreSQL', 'AWS', 'TypeScript'], score: 88, grade: 'A', status: 'shortlisted', source: 'LinkedIn',
        career_summary: '6 years backend, strong on distributed systems and payments. Led a team of 3 at a fintech scale-up.',
        education: 'BSc Computer Science, University of Sydney',
        certifications: ['AWS Solutions Architect – Associate'],
        score_reasoning: 'Strong match for Senior Software Engineer. Hits all must-haves: 6 yrs backend (req 5+), production AWS, deep PostgreSQL. Direct payments/fintech background is a listed nice-to-have. Minor gap: no Kubernetes. Graded A.',
        cv_text: 'ALEX ROMERO — Backend Engineer\n\nFinTechCo (2021–present) — Senior Backend Engineer\n• Owned the payments ledger service (Node.js, PostgreSQL) processing ~2M txns/day\n• Cut p99 API latency 40% via query + index redesign\n• Led a team of 3 engineers\n\nPayLoop (2018–2021) — Backend Engineer\n• Built reconciliation pipelines on AWS (Lambda, SQS)\n\nSkills: Node.js, TypeScript, PostgreSQL, AWS, REST',
        enrichment_data: { linkedin: 'linkedin.com/in/alexromero', location: 'Sydney, AU', notice_period: '4 weeks' },
        job_id: 'job-1', created_at: ago(4), updated_at: ago(3),
    },
    {
        id: 'cand-2', name: 'Mei Lin', email: 'mei.lin@email.com', phone: '+61 400 333 444',
        current_role: 'Full-stack Developer', current_company: 'ShopStack', years_experience: 4,
        skills: ['React', 'Node.js', 'GraphQL'], score: 76, grade: 'B', status: 'new', source: 'Seek',
        career_summary: '4 years full-stack, product-focused, shipped 2 major features end to end.',
        education: 'BInfoTech, RMIT University',
        certifications: [],
        score_reasoning: 'Good match. Meets Node.js requirement and ships product well, but 4 yrs is just under the 5+ must-have and SQL/data-modelling depth is unproven. Strong B — worth an early screen.',
        cv_text: 'MEI LIN — Full-stack Developer\n\nShopStack (2022–present)\n• Shipped checkout revamp (React) lifting conversion 12%\n• Built GraphQL gateway for the mobile app\n\nWebForge (2020–2022) — Junior Developer\n\nSkills: React, Node.js, GraphQL, TypeScript',
        enrichment_data: { linkedin: 'linkedin.com/in/meilin', location: 'Melbourne, AU', notice_period: '2 weeks' },
        job_id: 'job-1', created_at: ago(9), updated_at: null,
    },
    {
        id: 'cand-3', name: 'Daniel Cruz', email: 'daniel.cruz@email.com', phone: '+61 400 555 666',
        current_role: 'Staff Engineer', current_company: 'CloudNine', years_experience: 9,
        skills: ['Go', 'Kubernetes', 'AWS', 'Terraform'], score: 92, grade: 'A', status: 'interview', source: 'Referral',
        career_summary: 'Senior IC, infra and platform. Strong system design. Mentors juniors.',
        education: 'BEng Software Engineering, UNSW',
        certifications: ['CKA (Certified Kubernetes Administrator)', 'AWS Solutions Architect – Professional'],
        score_reasoning: 'Top candidate. Exceeds experience (9 yrs), covers AWS + Kubernetes (nice-to-have), strong system design. Primary stack is Go not Node.js, but transfer risk is low at this level. Graded A, fast-track to interview.',
        cv_text: 'DANIEL CRUZ — Staff Engineer\n\nCloudNine (2019–present)\n• Designed multi-region platform on Kubernetes + Terraform\n• Reduced infra spend 28% via autoscaling redesign\n• Tech lead across 4 teams\n\nByteWorks (2015–2019) — Senior Engineer\n\nSkills: Go, Kubernetes, AWS, Terraform, PostgreSQL',
        enrichment_data: { linkedin: 'linkedin.com/in/danielcruz', location: 'Sydney, AU', notice_period: '6 weeks' },
        job_id: 'job-1', created_at: ago(14), updated_at: ago(10),
    },
    {
        id: 'cand-4', name: 'Grace Tan', email: 'grace.tan@email.com', phone: '+61 400 777 888',
        current_role: 'ICU Nurse', current_company: 'St. Vincent Hospital', years_experience: 7,
        skills: ['Critical Care', 'Triage', 'Patient Records'], score: 84, grade: 'A', status: 'shortlisted', source: 'Indeed',
        career_summary: '7 years ICU experience, AHPRA registered, excellent references.',
        education: 'Bachelor of Nursing, Monash University',
        certifications: ['AHPRA Registration', 'Postgrad Cert in Critical Care'],
        score_reasoning: 'Strong match for ICU RN. Meets all must-haves: AHPRA registered, 7 yrs acute care, AU work rights. Holds the nice-to-have postgrad critical care cert. Graded A.',
        cv_text: 'GRACE TAN — Registered Nurse (ICU)\n\nSt. Vincent Hospital (2018–present)\n• ICU nursing across cardiac and trauma units\n• Precepts new graduate nurses\n\nEducation: Bachelor of Nursing, Monash\nRegistration: AHPRA (current)',
        enrichment_data: { location: 'Melbourne, AU', notice_period: '4 weeks', references: 'Available' },
        job_id: 'job-2', created_at: ago(20), updated_at: ago(15),
    },
    {
        id: 'cand-5', name: 'Jacob Mwangi', email: 'jacob.m@email.com', phone: '+61 400 999 000',
        current_role: 'Graduate Nurse', current_company: 'Royal Melbourne', years_experience: 2,
        skills: ['General Ward', 'Patient Care'], score: 58, grade: 'C', status: 'new', source: 'Seek',
        career_summary: '2 years post-grad, eager, would need ICU upskilling.',
        education: 'Bachelor of Nursing, Deakin University',
        certifications: ['AHPRA Registration'],
        score_reasoning: 'Partial match. AHPRA registered and AU work rights met, but only 2 yrs general-ward experience vs the 3+ acute/ICU must-have. No critical-care background. Graded C — keep on file for general roles.',
        cv_text: 'JACOB MWANGI — Graduate Nurse\n\nRoyal Melbourne (2024–present)\n• General medical ward, rotating shifts\n\nEducation: Bachelor of Nursing, Deakin\nRegistration: AHPRA (current)',
        enrichment_data: { location: 'Melbourne, AU', notice_period: '2 weeks' },
        job_id: 'job-2', created_at: ago(26), updated_at: null,
    },
    {
        id: 'cand-6', name: 'Olivia Park', email: 'olivia.park@email.com', phone: '+1 415 222 1111',
        current_role: 'SDR', current_company: 'GrowthLabs', years_experience: 3,
        skills: ['Outbound', 'Salesforce', 'Cold Calling'], score: 81, grade: 'A', status: 'interview', source: 'LinkedIn',
        career_summary: '3 years SDR, 120% of quota last year, strong written outreach.',
        education: 'BA Communications, UC Berkeley',
        certifications: [],
        score_reasoning: 'Strong SDR match. Exceeds the 1+ yr requirement, documented quota over-attainment, strong written English. Salesforce covered. Graded A.',
        cv_text: 'OLIVIA PARK — Sales Development Rep\n\nGrowthLabs (2022–present)\n• 120% of meetings-booked quota FY24\n• Built outbound sequences across email + LinkedIn\n\nSkills: Outbound, Salesforce, Cold Calling',
        enrichment_data: { linkedin: 'linkedin.com/in/oliviapark', location: 'Remote (US)', notice_period: '2 weeks' },
        job_id: 'job-3', created_at: ago(30), updated_at: ago(22),
    },
    {
        id: 'cand-7', name: 'Sam Idris', email: 'sam.idris@email.com', phone: '+1 415 333 2222',
        current_role: 'BDR', current_company: 'PipelinePro', years_experience: 2,
        skills: ['Prospecting', 'HubSpot'], score: 64, grade: 'B', status: 'new', source: 'Referral',
        career_summary: '2 years BDR, solid activity metrics, ramping fast.',
        education: 'BBA Marketing, Arizona State University',
        certifications: ['HubSpot Sales Software'],
        score_reasoning: 'Solid match. Meets experience and phone-comfort. Uses HubSpot (nice-to-have) but not Salesforce (required) — short ramp expected. Graded B.',
        cv_text: 'SAM IDRIS — Business Development Rep\n\nPipelinePro (2023–present)\n• 80+ outbound activities/day, top-quartile reply rate\n\nSkills: Prospecting, HubSpot, Email outreach',
        enrichment_data: { linkedin: 'linkedin.com/in/samidris', location: 'Remote (US)', notice_period: 'Immediate' },
        job_id: 'job-3', created_at: ago(33), updated_at: null,
    },
    {
        id: 'cand-8', name: 'Nadia Haddad', email: 'nadia.h@email.com', phone: '+61 400 444 555',
        current_role: 'Logistics Lead', current_company: 'MoveFast', years_experience: 8,
        skills: ['Warehouse Ops', 'Team Lead', 'Safety'], score: 79, grade: 'B', status: 'hired', source: 'Seek',
        career_summary: '8 years warehouse and logistics, led 15-person team.',
        education: 'Diploma of Logistics, TAFE QLD',
        certifications: ['Forklift Licence', 'Cert IV WHS'],
        score_reasoning: 'Strong match — hired. Exceeds experience, holds forklift licence and WHS cert (must-haves), proven people management. Graded B, placed.',
        cv_text: 'NADIA HADDAD — Logistics Lead\n\nMoveFast (2017–present)\n• Led 15-person warehouse team across 2 shifts\n• Improved pick accuracy to 99.4%\n\nLicences: Forklift, Cert IV WHS',
        enrichment_data: { location: 'Brisbane, AU' },
        job_id: 'job-4', created_at: ago(58 * 24), updated_at: ago(40 * 24),
    },
    {
        id: 'cand-9', name: 'Liam O’Brien', email: 'liam.obrien@email.com', phone: '+61 400 121 343',
        current_role: 'Software Engineer', current_company: 'DataHive', years_experience: 5,
        skills: ['Node.js', 'TypeScript', 'PostgreSQL', 'Docker'], score: 83, grade: 'A', status: 'new', source: 'LinkedIn',
        career_summary: '5 years backend, strong PostgreSQL, some payments exposure.',
        education: 'BSc Computer Science, University of Melbourne',
        certifications: ['AWS Developer – Associate'],
        score_reasoning: 'Good match for Senior SWE. Exactly meets the 5-yr must-have, strong PostgreSQL, AWS via cert. No team-lead experience yet (nice-to-have). Graded A.',
        cv_text: 'LIAM O’BRIEN — Software Engineer\n\nDataHive (2020–present)\n• Backend services in Node.js + PostgreSQL\n• Containerised the platform with Docker\n\nSkills: Node.js, TypeScript, PostgreSQL, Docker, AWS',
        enrichment_data: { linkedin: 'linkedin.com/in/liamobrien', location: 'Melbourne, AU', notice_period: '4 weeks' },
        job_id: 'job-1', created_at: ago(2), updated_at: null,
    },
    {
        id: 'cand-10', name: 'Priscilla Adeyemi', email: 'p.adeyemi@email.com', phone: '+61 400 565 787',
        current_role: 'Critical Care Nurse', current_company: 'Alfred Health', years_experience: 11,
        skills: ['Critical Care', 'ICU', 'Mentoring', 'Triage'], score: 90, grade: 'A', status: 'shortlisted', source: 'Referral',
        career_summary: '11 years ICU, charge nurse experience, AHPRA registered.',
        education: 'Master of Nursing (Critical Care), University of Melbourne',
        certifications: ['AHPRA Registration', 'ALS Certification'],
        score_reasoning: 'Excellent match. Far exceeds experience (11 yrs ICU), AHPRA registered, holds postgrad critical-care qualification (nice-to-have) plus charge-nurse leadership. Graded A.',
        cv_text: 'PRISCILLA ADEYEMI — Critical Care Nurse\n\nAlfred Health (2016–present)\n• Charge nurse, 18-bed ICU\n• Mentors graduate and new ICU staff\n\nEducation: MNurs (Critical Care)\nRegistration: AHPRA (current)',
        enrichment_data: { location: 'Melbourne, AU', notice_period: '6 weeks', references: 'Available' },
        job_id: 'job-2', created_at: ago(12), updated_at: ago(8),
    },
    {
        id: 'cand-11', name: 'Marco Bianchi', email: 'marco.b@email.com', phone: '+1 415 777 8989',
        current_role: 'Account Executive (Junior)', current_company: 'CloseRate', years_experience: 4,
        skills: ['Outbound', 'Salesforce', 'Discovery Calls'], score: 72, grade: 'B', status: 'new', source: 'Seek',
        career_summary: '4 years sales, moving from closing back toward pipeline gen.',
        education: 'BA Business, San Diego State',
        certifications: [],
        score_reasoning: 'Good match. Salesforce and outbound covered, strong phone skills. Slightly senior for an SDR seat (closing background) — flight-risk to AE. Graded B.',
        cv_text: 'MARCO BIANCHI — Account Executive (Junior)\n\nCloseRate (2021–present)\n• Carried a closing quota, 90% attainment\n• Ran full-cycle discovery to close\n\nSkills: Outbound, Salesforce, Discovery',
        enrichment_data: { linkedin: 'linkedin.com/in/marcobianchi', location: 'Remote (US)', notice_period: '2 weeks' },
        job_id: 'job-3', created_at: ago(6), updated_at: null,
    },
    {
        id: 'cand-12', name: 'Hannah Wright', email: 'hannah.w@email.com', phone: '+61 400 232 454',
        current_role: 'Junior Developer', current_company: 'BrightApps', years_experience: 2,
        skills: ['JavaScript', 'React'], score: 41, grade: 'C', status: 'new', source: 'Seek',
        career_summary: '2 years front-end focused, limited backend exposure.',
        education: 'Coding bootcamp + self-taught',
        certifications: [],
        score_reasoning: 'Weak match for Senior SWE. Only 2 yrs and front-end leaning; misses the 5-yr must-have and backend/SQL depth. Graded C — not a fit for this role.',
        cv_text: 'HANNAH WRIGHT — Junior Developer\n\nBrightApps (2024–present)\n• Front-end features in React\n\nSkills: JavaScript, React',
        enrichment_data: { location: 'Sydney, AU', notice_period: 'Immediate' },
        job_id: 'job-1', created_at: ago(1), updated_at: null,
    },
]

const SEED_DATA: Record<string, Record<string, unknown>[]> = {
    jobs: DEMO_JOBS,
    candidates: DEMO_CANDIDATES,
}

// ──────────────────────────────────────────────────────────────
// Demo data otherwise lives only in this module's memory, which resets
// every time the browser tab does a full reload. This persists to
// localStorage so it survives reloads on the same browser. Still
// browser-local only — not shared across devices/browsers.
// ──────────────────────────────────────────────────────────────
const STORAGE_KEY = 'nexu-demo-data-v1'

function loadPersisted(): Record<string, Record<string, unknown>[]> | null {
    if (typeof window === 'undefined') return null
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object') return null
        return { ...SEED_DATA, ...parsed }
    } catch {
        return null // corrupted storage — fall back to seed
    }
}

export const DEMO_DATA: Record<string, Record<string, unknown>[]> = loadPersisted() ?? SEED_DATA

export function persistDemoData() {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_DATA))
    } catch {
        // storage full or unavailable (e.g. private browsing) — non-fatal
    }
}

export function resetDemoData() {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(STORAGE_KEY)
    window.location.reload()
}
