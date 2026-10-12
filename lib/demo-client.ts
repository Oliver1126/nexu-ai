// ──────────────────────────────────────────────────────────────
// Demo Supabase client — a tiny mock of the supabase-js query
// builder that resolves against in-memory seed data (demo-data.ts).
// Only implements the chain methods the dashboard actually uses:
//   .from().select().order().limit().eq().in().gte().single()
//   .update()/.insert()/.delete() all actually mutate DEMO_DATA in place
//   and persist to localStorage (see demo-data.ts), so they survive a
//   page reload on the same browser — still not shared across devices/
//   browsers, since there's no real backend behind this.
// Awaiting any chain returns { data, error } just like supabase-js.
// ──────────────────────────────────────────────────────────────
import { DEMO_DATA, persistDemoData } from './demo-data'

type Row = Record<string, unknown>
type Result = { data: unknown; error: { message: string; code?: string } | null }

class DemoQuery implements PromiseLike<Result> {
    private table: string
    // Shallow copy of the array, but the row OBJECTS inside are the same
    // references as DEMO_DATA[table] — mutating a row here mutates the
    // "real" seed data too, which is what makes update()/delete() work.
    private rows: Row[]
    private orderCol: string | null = null
    private orderAsc = true
    private limitN: number | null = null
    private singleMode = false
    private isSelect = true
    private insertRows: Row[] | null = null
    private updateFields: Row | null = null
    private isDelete = false

    constructor(table: string) {
        this.table = table
        this.rows = [...(DEMO_DATA[table] ?? [])]
    }

    select(_cols?: string) { this.isSelect = true; return this }
    update(v?: Row) { this.isSelect = false; this.updateFields = v ?? {}; return this }
    // insert actually persists into the in-memory seed for the session
    insert(rows?: Row | Row[]) {
        this.isSelect = false
        this.insertRows = rows == null ? [] : (Array.isArray(rows) ? rows : [rows])
        return this
    }
    delete() { this.isSelect = false; this.isDelete = true; return this }

    eq(col: string, val: unknown) { this.rows = this.rows.filter(r => r[col] === val); return this }
    in(col: string, vals: unknown[]) { const set = new Set(vals); this.rows = this.rows.filter(r => set.has(r[col])); return this }
    gte(col: string, val: unknown) { this.rows = this.rows.filter(r => String(r[col]) >= String(val)); return this }
    order(col: string, opts?: { ascending?: boolean }) {
        this.orderCol = col
        this.orderAsc = opts?.ascending ?? true
        return this
    }
    limit(n: number) { this.limitN = n; return this }
    single() { this.singleMode = true; return this }

    private resolve(): Result {
        // insert: push rows into the in-memory seed (persists for the session)
        if (this.insertRows) {
            const target = DEMO_DATA[this.table] ?? (DEMO_DATA[this.table] = [])
            const inserted = this.insertRows.map(r => ({
                id: (r.id as string) ?? `demo-${Math.random().toString(36).slice(2, 9)}`,
                created_at: (r.created_at as string) ?? new Date().toISOString(),
                ...r,
            }))
            target.unshift(...inserted)
            persistDemoData()
            return { data: this.singleMode ? inserted[0] : inserted, error: null }
        }

        // update: mutate the matching rows in place (they're shared references
        // with DEMO_DATA[table], so this persists for the session)
        if (this.updateFields) {
            this.rows.forEach(row => Object.assign(row, this.updateFields))
            persistDemoData()
            return { data: this.singleMode ? (this.rows[0] ?? null) : [...this.rows], error: null }
        }

        // delete: remove matching rows from the real backing array
        if (this.isDelete) {
            const toRemove = new Set(this.rows)
            const target = DEMO_DATA[this.table]
            if (target) {
                const kept = target.filter(r => !toRemove.has(r))
                target.length = 0
                target.push(...kept)
            }
            persistDemoData()
            return { data: null, error: null }
        }

        if (!this.isSelect) return { data: null, error: null }

        let rows = this.rows
        if (this.orderCol) {
            const col = this.orderCol
            rows = [...rows].sort((a, b) => {
                const av = a[col] as string | number, bv = b[col] as string | number
                if (av < bv) return this.orderAsc ? -1 : 1
                if (av > bv) return this.orderAsc ? 1 : -1
                return 0
            })
        }
        if (this.limitN != null) rows = rows.slice(0, this.limitN)
        if (this.singleMode) {
            return rows[0]
                ? { data: rows[0], error: null }
                : { data: null, error: { message: 'No rows found', code: 'PGRST116' } }
        }
        return { data: rows, error: null }
    }

    // make the builder awaitable
    then<TResult1 = Result, TResult2 = never>(
        onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2> {
        return Promise.resolve(this.resolve()).then(onfulfilled, onrejected)
    }
}

class DemoClient {
    from(table: string) { return new DemoQuery(table) }
    auth = {
        getUser: async () => ({ data: { user: { id: 'demo-user', email: 'demo@nodalnexus.dev' } }, error: null }),
        signInWithPassword: async () => ({ data: { session: null, user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signOut: async () => ({ error: null }),
    }
}

export function createDemoClient() {
    return new DemoClient()
}
