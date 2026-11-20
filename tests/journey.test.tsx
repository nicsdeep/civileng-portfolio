// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, configure } from '@testing-library/react'

// Slow or busy machines (CI, full parallel runs) need more than the 1 s default to settle.
configure({ asyncUtilTimeout: 4000 })
import { RouterProvider, createMemoryRouter, useLocation } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { exampleCv } from '../src/content/example'
import type { Cv } from '../src/content/types'

/*
 * The whole user journey (docs/PRD.md § Journey) with a fake account and a
 * fake database: upload → live portfolio, edit → back to portfolio, and the
 * owner's update tools.
 */

const db = vi.hoisted(() => ({
  user: null as null | { id: string },
  row: null as null | { user_id: string; slug: string | null; published: boolean; content: unknown; updated_at: string },
  taken: new Set<string>(),
  saves: [] as { slug: string | null; published: boolean; cv: Cv }[],
  deleted: 0,
  recordFails: null as string | null,
  records: 0,
  moved: {} as Record<string, string>,
}))

vi.mock('../src/features/auth/AuthProvider', () => ({ useAuth: () => ({ user: db.user, loading: false }) }))
vi.mock('../src/features/import/history', async (original) => {
  const real = await original<typeof import('../src/features/import/history')>()
  return {
    ...real,
    recordUpload: async () => {
      if (db.recordFails) throw new real.HistoryError(db.recordFails)
      db.records++
      return { id: 'upload-1', claimToken: db.user ? null : 'token-1' }
    },
  }
})
vi.mock('../src/features/portfolio/api', async (original) => {
  const real = await original<typeof import('../src/features/portfolio/api')>()
  const { normalizeCv } = await import('../src/content/normalize')
  return {
    ...real,
    fetchMyPortfolio: async () => db.row,
    fetchPortfolioBySlug: async (slug: string) =>
      db.row && db.row.slug === slug ? { cv: normalizeCv(db.row.content), basePath: `/p/${slug}`, updatedAt: '', published: db.row.published } : null,
    saveMyPortfolio: async (userId: string, cv: Cv, slug: string | null, published: boolean) => {
      if (slug && db.taken.has(slug)) throw new real.SaveError('taken', 'That address is already taken.')
      db.saves.push({ slug, published, cv })
      db.row = { user_id: userId, slug, published, content: cv, updated_at: '' }
      return db.row
    },
    fetchMovedSlug: async (slug: string) => db.moved[slug] ?? null,
    deleteMyPortfolio: async () => {
      db.deleted++
      db.row = null
    },
  }
})
window.scrollTo = () => {} // not implemented in jsdom

const { CreatePage } = await import('../src/pages/CreatePage')
const { EditorPage } = await import('../src/pages/EditorPage')
const { FinishPage } = await import('../src/pages/FinishPage')
const { PortfolioLayout } = await import('../src/app/PortfolioLayout')
const { OverviewPage } = await import('../src/pages/portfolio/OverviewPage')
const { loadDraft, saveDraft } = await import('../src/features/import/draft')
const { keepMedia, slugCandidates } = await import('../src/features/portfolio/publish')

function Where() {
  const location = useLocation()
  return <p data-testid="where">{location.pathname + location.search}</p>
}

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const page = (el: ReactNode) => <>{el}<Where /></>
  // The same kind of router as the app (needed for scroll restoration).
  const router = createMemoryRouter(
    [
      { path: '/create', element: page(<CreatePage />) },
      { path: '/editor', element: page(<EditorPage />) },
      { path: '/finish', element: page(<FinishPage />) },
      { path: '/p/:slug', element: <><PortfolioLayout /><Where /></>, children: [{ index: true, element: <OverviewPage /> }] },
      { path: '*', element: <Where /> },
    ],
    { initialEntries: [path] },
  )
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}
const where = () => screen.getByTestId('where').textContent

const RESUME = `Jane Doe
Civil Engineer
+254 711 222 333 | jane@example.com

EXPERIENCE
Site Engineer | Acme Ltd
2020 - 2022
• Supervised a bridge deck pour`

async function pasteResume() {
  fireEvent.change(screen.getByLabelText(/paste the text/i), { target: { value: RESUME } })
  fireEvent.click(screen.getByRole('button', { name: 'Build my portfolio' }))
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  Object.assign(db, { user: null, row: null, taken: new Set(), saves: [], deleted: 0, recordFails: null, records: 0, moved: {} })
})
afterEach(cleanup)

describe('upload → live portfolio', () => {
  it('a new visitor uploads, then is asked for an account once', async () => {
    renderAt('/create')
    await pasteResume()
    await waitFor(() => expect(where()).toBe('/sign-in?next=/finish'))
    expect(db.records).toBe(1)
    expect(loadDraft()?.cv.name).toBe('Jane Doe')
    expect(db.saves).toHaveLength(0)
  })

  it('after signing in, /finish publishes and opens the live portfolio', async () => {
    db.user = { id: 'u1' }
    saveDraft({ ...exampleCv, name: 'Jane Doe' }, 'cv.pdf')
    renderAt('/finish')
    await waitFor(() => expect(where()).toBe('/p/jane-doe?status=new'))
    expect(db.saves[0]).toMatchObject({ slug: 'jane-doe', published: true })
    expect(loadDraft()).toBeNull()
    expect(await screen.findByText('✓ Your portfolio is live!')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Share link' })).toBeTruthy()
  })

  it('a signed-in visitor goes from upload straight to the live portfolio, with a free address', async () => {
    db.user = { id: 'u1' }
    db.taken = new Set(['jane-doe'])
    renderAt('/create')
    await pasteResume()
    await waitFor(() => expect(where()).toBe('/p/jane-doe-2?status=new'))
    expect(db.saves.at(-1)).toMatchObject({ slug: 'jane-doe-2', published: true })
  })

  it('an owner uploads a new résumé: same address, pictures kept, Undo offered', async () => {
    db.user = { id: 'u1' }
    const old = { ...exampleCv, name: 'Jane Doe', photo: 'https://img.example/me.jpg', experience: [{ ...exampleCv.experience[0], org: 'Acme Ltd', logo: 'https://img.example/acme.png' }] }
    db.row = { user_id: 'u1', slug: 'jane', published: true, content: old, updated_at: '' }
    renderAt('/create')
    expect(await screen.findByText(/Upload your new/)).toBeTruthy()
    await pasteResume()
    await waitFor(() => expect(where()).toBe('/p/jane?status=updated'))
    const saved = db.saves.at(-1)!
    expect(saved.slug).toBe('jane')
    expect(saved.cv.photo).toBe('https://img.example/me.jpg')
    expect(saved.cv.experience[0]).toMatchObject({ org: 'Acme Ltd', logo: 'https://img.example/acme.png' })
    expect(await screen.findByText('✓ Your portfolio is updated.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(db.saves.at(-1)!.cv.experience[0].role).toBe(old.experience[0].role))
    await waitFor(() => expect(where()).toBe('/p/jane?status=saved'))
  })

  it('builds a portfolio from a LinkedIn link alone', async () => {
    db.user = { id: 'u1' }
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ kind: 'page', finalUrl: 'https://www.linkedin.com/in/sam-example', title: 'Sam Example - Acme | LinkedIn', description: 'Bridge engineer · Experience: Acme · Location: Nairobi', image: 'https://media.licdn.com/p.jpg', siteName: 'linkedin.com', logo: '' }) })))
    renderAt('/create')
    fireEvent.change(await screen.findByLabelText(/Add your LinkedIn/), { target: { value: 'linkedin.com/in/sam-example' } })
    fireEvent.click(screen.getByRole('button', { name: 'Build from LinkedIn only' }))
    await waitFor(() => expect(where()).toBe('/p/sam-example?status=new'))
    expect(db.saves.at(-1)!.cv).toMatchObject({ name: 'Sam Example', photo: 'https://media.licdn.com/p.jpg', location: 'Nairobi' })
    vi.unstubAllGlobals()
  })

  it('a résumé plus a LinkedIn link: the résumé wins, LinkedIn fills the photo', async () => {
    db.user = { id: 'u1' }
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ kind: 'page', finalUrl: 'https://www.linkedin.com/in/jane', title: 'Someone Else - Other Co | LinkedIn', description: 'Different headline · Location: Mombasa', image: 'https://media.licdn.com/j.jpg', siteName: 'linkedin.com', logo: '' }) })))
    renderAt('/create')
    fireEvent.change(await screen.findByLabelText(/Add your LinkedIn/), { target: { value: 'https://www.linkedin.com/in/jane' } })
    await pasteResume()
    await waitFor(() => expect(where()).toBe('/p/jane-doe?status=new'))
    const cv = db.saves.at(-1)!.cv
    expect(cv.name).toBe('Jane Doe')
    expect(cv.headline).toBe('Civil Engineer')
    expect(cv.photo).toBe('https://media.licdn.com/j.jpg')
    expect(cv.links[0].label).toBe('LinkedIn')
    vi.unstubAllGlobals()
  })

  it('stops with a clear message if the upload cannot be recorded', async () => {
    db.recordFails = 'Too many uploads from this network. Please try again in an hour.'
    renderAt('/create')
    await pasteResume()
    expect((await screen.findByRole('alert')).textContent).toMatch(/Too many uploads/)
    expect(where()).toBe('/create')
    expect(loadDraft()).toBeNull()
  })

  it('shows the Privacy Policy line next to both ways of uploading, with no extra boxes to tick', () => {
    renderAt('/create')
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.getAllByText(/By uploading, you agree to our/)).toHaveLength(2)
  })

  it('a résumé left half-way can be published or removed', async () => {
    saveDraft(exampleCv, 'cv.pdf')
    renderAt('/create')
    expect(screen.getByText('Almost done')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(loadDraft()).toBeNull()
    expect(screen.getByRole('status').textContent).toMatch(/Résumé removed from this browser/)
  })
})

describe('owner tools and editing', () => {
  beforeEach(() => {
    db.user = { id: 'u1' }
    db.row = { user_id: 'u1', slug: 'jane', published: true, content: { ...exampleCv, name: 'Jane Doe' }, updated_at: '' }
  })

  it('the owner sees how to update their portfolio; visitors do not', async () => {
    renderAt('/p/jane')
    expect(await screen.findByText(/This is your portfolio/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Edit details' }).getAttribute('href')).toBe('/editor')
    expect(screen.getByRole('link', { name: 'Upload new résumé' }).getAttribute('href')).toBe('/create')
    cleanup()
    db.user = null
    renderAt('/p/jane')
    expect(await screen.findByText('Jane')).toBeTruthy()
    expect(screen.queryByText(/This is your portfolio/)).toBeNull()
  })

  it('an address made from the name follows a new name; old links are sent on', async () => {
    db.row!.slug = 'jane-doe'
    renderAt('/editor')
    fireEvent.change(await screen.findByLabelText('Full name'), { target: { value: 'Jane Wanjiru' } })
    expect(screen.getByText(/it becomes/).textContent).toMatch('/p/jane-wanjiru')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(where()).toBe('/p/jane-wanjiru?status=saved'))
    cleanup()
    db.user = null
    db.moved['jane-doe'] = 'jane-wanjiru'
    renderAt('/p/jane-doe')
    await waitFor(() => expect(where()).toBe('/p/jane-wanjiru'))
    expect(await screen.findByText('Wanjiru')).toBeTruthy()
  })

  it('an address the owner typed stays when the name changes', async () => {
    db.row!.slug = 'jane-builds'
    renderAt('/editor')
    fireEvent.change(await screen.findByLabelText('Full name'), { target: { value: 'Jane Wanjiru' } })
    expect(screen.queryByText(/it becomes/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(where()).toBe('/p/jane-builds?status=saved'))
  })

  it('saving in the editor goes straight back to the portfolio with a success message', async () => {
    renderAt('/editor')
    const name = (await screen.findByLabelText('Full name')) as HTMLInputElement
    fireEvent.change(name, { target: { value: 'Jane A. Doe' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(where()).toBe('/p/jane?status=saved'))
    expect(db.saves.at(-1)!.cv.name).toBe('Jane A. Doe')
    expect(await screen.findByText('✓ Changes saved.')).toBeTruthy()
  })

  it('opens the editor on the tab asked for', async () => {
    renderAt('/editor?tab=projects')
    expect((await screen.findByRole('tab', { name: /Projects/ })).getAttribute('aria-selected')).toBe('true')
  })

  it('clear all can be undone; delete asks first, then returns to Create', async () => {
    renderAt('/editor')
    expect(((await screen.findByLabelText('Full name')) as HTMLInputElement).value).toBe('Jane Doe')
    fireEvent.click(screen.getByRole('button', { name: 'Clear all fields' }))
    expect((screen.getByLabelText('Full name') as HTMLInputElement).value).toBe('')
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect((screen.getByLabelText('Full name') as HTMLInputElement).value).toBe('Jane Doe')
    fireEvent.click(screen.getByRole('button', { name: 'Delete portfolio' }))
    expect(db.deleted).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'Delete for good' }))
    // The Create page says so (and may already have tidied ?deleted=1 out of the address).
    expect(await screen.findByText('Your portfolio was deleted. Its address is free again.')).toBeTruthy()
    expect(where()).toMatch(/^\/create/)
    expect(db.deleted).toBe(1)
    expect(screen.getByText(/Your portfolio was deleted/)).toBeTruthy()
  })

  it('with nothing saved, the editor sends people to the quickest start; scratch is still possible', async () => {
    db.row = null
    renderAt('/editor')
    await waitFor(() => expect(where()).toBe('/create'))
    cleanup()
    renderAt('/editor?start=blank')
    fireEvent.change(await screen.findByLabelText('Full name'), { target: { value: 'Sam Example' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save & publish' }))
    await waitFor(() => expect(where()).toBe('/p/sam-example?status=new'))
  })
})

describe('publishing helpers', () => {
  it('suggests addresses from the name', () => {
    expect(slugCandidates('Jane Doe').slice(0, 3)).toEqual(['jane-doe', 'jane-doe-2', 'jane-doe-3'])
    expect(slugCandidates('Al')[0]).toBe('al-portfolio')
    expect(slugCandidates('')[0]).toBe('portfolio')
  })

  it('keeps pictures and links when a new résumé replaces the old one', () => {
    const previous = { ...exampleCv, photo: 'https://x.example/p.jpg', links: [{ label: 'Site', url: 'https://jane.example' }] }
    previous.projects = [{ ...exampleCv.projects[0], image: 'https://x.example/shot.png' }]
    const next = { ...exampleCv, photo: '', links: [] }
    next.projects = [{ ...exampleCv.projects[0], image: '', links: [] }]
    const merged = keepMedia(previous, next)
    expect(merged.photo).toBe('https://x.example/p.jpg')
    expect(merged.links).toEqual([{ label: 'Site', url: 'https://jane.example' }])
    expect(merged.projects[0].image).toBe('https://x.example/shot.png')
  })
})
