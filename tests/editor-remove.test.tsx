// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { exampleCv } from '../src/content/example'
import { loadDraft, saveDraft } from '../src/features/import/draft'

// A signed-in user with a saved, published portfolio; no real database.
const api = vi.hoisted(() => ({
  row: null as null | Record<string, unknown>,
  deleted: 0,
}))
vi.mock('../src/features/auth/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'user-1' }, loading: false }) }))
vi.mock('../src/features/portfolio/api', async (original) => ({
  ...(await original<typeof import('../src/features/portfolio/api')>()),
  fetchMyPortfolio: async () => api.row,
  deleteMyPortfolio: async () => {
    api.deleted++
  },
}))

window.scrollTo = () => {} // not implemented in jsdom
const { EditorPage } = await import('../src/pages/EditorPage')

function renderEditor() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/editor']}>
        <EditorPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
const nameField = () => screen.findByLabelText('Full name') as Promise<HTMLInputElement>

beforeEach(() => {
  localStorage.clear()
  api.row = { user_id: 'user-1', slug: 'saved-person', published: true, content: { ...exampleCv, name: 'Saved Person' }, updated_at: '' }
  api.deleted = 0
})
afterEach(cleanup)

describe('editor: removing and clearing', () => {
  it('removes an uploaded résumé, falls back to the saved portfolio, and can undo', async () => {
    saveDraft({ ...exampleCv, name: 'From Résumé' }, 'cv.pdf')
    renderEditor()
    expect((await nameField()).value).toBe('From Résumé')

    fireEvent.click(screen.getByRole('button', { name: 'Remove résumé' }))
    expect((await nameField()).value).toBe('Saved Person')
    expect(loadDraft()).toBeNull()
    expect(screen.getByText(/Résumé removed/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect((await nameField()).value).toBe('From Résumé')
    expect(loadDraft()?.cv.name).toBe('From Résumé')
  })

  it('clears all fields and can undo', async () => {
    renderEditor()
    expect((await nameField()).value).toBe('Saved Person')
    fireEvent.click(screen.getByRole('button', { name: 'Clear all fields' }))
    expect((await nameField()).value).toBe('')
    expect(screen.getByText(/Nothing changes on your public page until you press Save/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect((await nameField()).value).toBe('Saved Person')
  })

  it('deletes the saved portfolio only after confirming', async () => {
    renderEditor()
    await nameField()
    fireEvent.click(screen.getByRole('button', { name: 'Delete portfolio' }))
    expect(screen.getByText(/saved-person/)).toBeTruthy()
    expect(api.deleted).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'Delete for good' }))
    await waitFor(() => expect(api.deleted).toBe(1))
    expect(await screen.findByText(/Your portfolio was deleted/)).toBeTruthy()
    expect((await nameField()).value).toBe('')
    expect(screen.queryByRole('button', { name: 'Delete portfolio' })).toBeNull()
  })

  it('offers no delete button before anything is saved', async () => {
    api.row = null
    renderEditor()
    await nameField()
    expect(screen.queryByRole('button', { name: 'Delete portfolio' })).toBeNull()
  })
})
