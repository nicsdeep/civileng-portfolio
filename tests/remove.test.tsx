// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

// Records go to a fake history instead of Supabase.
const history = vi.hoisted(() => ({ calls: [] as Record<string, unknown>[], fail: null as string | null }))
vi.mock('../src/features/import/history', async (original) => {
  const real = await original<typeof import('../src/features/import/history')>()
  return {
    ...real,
    recordUpload: async (input: Record<string, unknown>) => {
      if (history.fail) throw new real.HistoryError(history.fail)
      history.calls.push(input)
      return { id: 'upload-1', claimToken: 'token-1' }
    },
  }
})
const { CreatePage } = await import('../src/pages/CreatePage')
import { ConfirmButton } from '../src/components/ConfirmButton'
import { loadDraft, saveDraft } from '../src/features/import/draft'
import { exampleCv } from '../src/content/example'

const RESUME = `Jane Doe
Civil Engineer
+254 711 222 333 | jane@example.com

EXPERIENCE
Site Engineer | Acme Ltd
2020 - 2022
• Supervised a bridge deck pour`

const renderCreate = () => render(<MemoryRouter><CreatePage /></MemoryRouter>)

const agree = () => fireEvent.click(screen.getByRole('checkbox', { name: /I agree/ }))

async function pasteResume() {
  agree()
  fireEvent.change(screen.getByLabelText(/paste the text/i), { target: { value: RESUME } })
  fireEvent.click(screen.getByRole('button', { name: 'Build my portfolio' }))
  await screen.findByText(/Here is what we/)
}

window.scrollTo = () => {} // not implemented in jsdom
beforeEach(() => {
  localStorage.clear()
  history.calls = []
  history.fail = null
})
afterEach(cleanup)

describe('removing a résumé on the Create page', () => {
  it('keeps the résumé until it is removed, then deletes it from the browser', async () => {
    renderCreate()
    await pasteResume()
    expect(screen.getByText('Jane Doe')).toBeTruthy()
    expect(loadDraft()?.cv.name).toBe('Jane Doe')

    fireEvent.click(screen.getByRole('button', { name: 'Remove résumé' }))
    // Asks first; nothing is removed yet.
    expect(loadDraft()).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Remove résumé' }))

    expect(loadDraft()).toBeNull()
    expect(screen.getByRole('status').textContent).toMatch(/Résumé removed from this browser. A record of the upload is kept/)
    expect((screen.getByLabelText(/paste the text/i) as HTMLTextAreaElement).value).toBe('')
  })

  it('"Use a different file" starts again without keeping the old résumé', async () => {
    renderCreate()
    await pasteResume()
    fireEvent.click(screen.getByRole('button', { name: 'Use a different file' }))
    expect(loadDraft()).toBeNull()
    expect(screen.getByRole('button', { name: 'Choose résumé' })).toBeTruthy()
  })

  it('shows a résumé in progress on a later visit, with Continue and Remove', () => {
    saveDraft(exampleCv, 'cv.pdf')
    renderCreate()
    expect(screen.getByText('Résumé in progress')).toBeTruthy()
    expect(screen.getByText(exampleCv.name)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(loadDraft()).toBeNull()
    expect(screen.queryByText('Résumé in progress')).toBeNull()
  })

  it('clears pasted text', () => {
    renderCreate()
    fireEvent.change(screen.getByLabelText(/paste the text/i), { target: { value: 'some text' } })
    fireEvent.click(screen.getByRole('button', { name: 'Clear text' }))
    expect((screen.getByLabelText(/paste the text/i) as HTMLTextAreaElement).value).toBe('')
    expect(screen.queryByRole('button', { name: 'Clear text' })).toBeNull()
  })
})

describe('keeping uploads on record', () => {
  it('needs agreement before anything is read', () => {
    renderCreate()
    expect((screen.getByRole('button', { name: 'Choose résumé' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText(/paste the text/i), { target: { value: RESUME } })
    expect((screen.getByRole('button', { name: 'Build my portfolio' }) as HTMLButtonElement).disabled).toBe(true)
    agree()
    expect((screen.getByRole('button', { name: 'Choose résumé' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('records the upload, phone number included, and links the draft to it', async () => {
    renderCreate()
    await pasteResume()
    expect(history.calls).toHaveLength(1)
    const call = history.calls[0] as { result: { phone: string; cv: { name: string; phone: string } }; text: string; consentAt: Date; signedIn: boolean }
    expect(call.result.phone).toBe('+254 711 222 333')
    expect(call.result.cv.phone).toBe('') // never on the public portfolio
    expect(call.text).toContain('Site Engineer')
    expect(call.consentAt).toBeInstanceOf(Date)
    expect(call.signedIn).toBe(false)
    expect(loadDraft()).toMatchObject({ uploadId: 'upload-1', claimToken: 'token-1' })
  })

  it('does not go on if the record cannot be saved, and says why', async () => {
    history.fail = 'Too many uploads from this network. Please try again in an hour.'
    renderCreate()
    agree()
    fireEvent.change(screen.getByLabelText(/paste the text/i), { target: { value: RESUME } })
    fireEvent.click(screen.getByRole('button', { name: 'Build my portfolio' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/Too many uploads/)
    expect(screen.queryByText(/Here is what we/)).toBeNull()
    expect(loadDraft()).toBeNull()
  })
})

describe('ConfirmButton', () => {
  it('asks before acting and can be cancelled', () => {
    let done = 0
    render(<ConfirmButton question="Sure?" confirmLabel="Yes" onConfirm={() => done++}>Delete</ConfirmButton>)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(done).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.keyDown(screen.getByRole('button', { name: 'Yes' }), { key: 'Escape' })
    expect(screen.queryByRole('button', { name: 'Yes' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(done).toBe(1)
  })
})
