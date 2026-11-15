// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash, webcrypto } from 'node:crypto'

// Captures what would be sent to Supabase.
const sent = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[], files: [] as { path: string; options: unknown }[], rpc: [] as unknown[] }))
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from: () => ({ insert: async (row: Record<string, unknown>) => (sent.rows.push(row), { error: null }) }),
    storage: { from: () => ({ upload: async (path: string, _file: unknown, options: unknown) => (sent.files.push({ path, options }), { error: null }) }) },
    rpc: async (...args: unknown[]) => (sent.rpc.push(args), { data: true, error: null }),
  },
}))
if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, 'crypto', { value: webcrypto })

const { recordUpload, claimUpload } = await import('../src/features/import/history')
const { parseResume } = await import('../src/features/import/parse')

const TEXT = 'Jane Doe\n+1 555 010 0199 | jane@example.com | Edmund, Ontario\n\nEXPERIENCE\nEngineer | Acme\n2020 - 2022'

beforeEach(() => {
  sent.rows = []
  sent.files = []
  sent.rpc = []
})

describe('recordUpload', () => {
  it('saves the details and the file in a matching slot', async () => {
    const file = new File(['%PDF-1.4 test'], 'My CV.PDF', { type: '' })
    const result = parseResume(TEXT)
    const { id, claimToken } = await recordUpload({ result, text: TEXT, file, consentAt: new Date(), signedIn: false })

    const row = sent.rows[0]
    expect(row).toMatchObject({
      id,
      source: 'file',
      file_name: 'My CV.PDF',
      file_type: 'application/pdf',
      file_path: `uploads/${id}.pdf`,
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+1 555 010 0199',
      location: 'Edmund, Ontario',
      raw_text: TEXT,
    })
    expect(row.file_path).toMatch(/^uploads\/[0-9a-f-]{36}\.(pdf|docx|txt)$/) // same rule as the database
    expect((row.parsed as { phone: string }).phone).toBe('+1 555 010 0199')
    // Only a hash of the claim token is sent; the token stays in this browser.
    expect(row.claim_token_hash).toBe(createHash('sha256').update(claimToken!).digest('hex'))
    expect(JSON.stringify(row)).not.toContain(claimToken!)
    expect(sent.files).toEqual([{ path: `uploads/${id}.pdf`, options: { contentType: 'application/pdf', upsert: false } }])
  })

  it('pasted text has no file, and signed-in users need no claim token', async () => {
    const { claimToken } = await recordUpload({ result: parseResume(TEXT), text: TEXT, consentAt: new Date(), signedIn: true })
    expect(sent.rows[0]).toMatchObject({ source: 'paste', file_path: null, file_name: null, claim_token_hash: null })
    expect(claimToken).toBeNull()
    expect(sent.files).toEqual([])
  })

  it('claims an upload through the database function', async () => {
    expect(await claimUpload('id-1', 'token-1')).toBe(true)
    expect(sent.rpc).toEqual([['pf_claim_resume_upload', { upload_id: 'id-1', claim_token: 'token-1' }]])
  })
})
