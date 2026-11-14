// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { CreatePage } from '../src/pages/CreatePage'
import { ConfirmButton } from '../src/components/ConfirmButton'
import { loadDraft, saveDraft } from '../src/features/import/draft'
import { exampleCv } from '../src/content/example'

const RESUME = `Jane Doe
Civil Engineer

EXPERIENCE
Site Engineer | Acme Ltd
2020 - 2022
• Supervised a bridge deck pour`

const renderCreate = () => render(<MemoryRouter><CreatePage /></MemoryRouter>)

function pasteResume() {
  fireEvent.change(screen.getByLabelText(/paste the text/i), { target: { value: RESUME } })
  fireEvent.click(screen.getByRole('button', { name: 'Build my portfolio' }))
}

window.scrollTo = () => {} // not implemented in jsdom
beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('removing a résumé on the Create page', () => {
  it('keeps the résumé until it is removed, then deletes it from the browser', () => {
    renderCreate()
    pasteResume()
    expect(screen.getByText('Jane Doe')).toBeTruthy()
    expect(loadDraft()?.cv.name).toBe('Jane Doe')

    fireEvent.click(screen.getByRole('button', { name: 'Remove résumé' }))
    // Asks first; nothing is removed yet.
    expect(loadDraft()).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Remove résumé' }))

    expect(loadDraft()).toBeNull()
    expect(screen.getByRole('status').textContent).toMatch(/Résumé removed/)
    expect((screen.getByLabelText(/paste the text/i) as HTMLTextAreaElement).value).toBe('')
  })

  it('"Use a different file" starts again without keeping the old résumé', () => {
    renderCreate()
    pasteResume()
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
