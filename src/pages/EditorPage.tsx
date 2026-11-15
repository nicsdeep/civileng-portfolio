import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../features/auth/AuthProvider'
import { deleteMyPortfolio, saveMyPortfolio, slugProblem, type PortfolioRow } from '../features/portfolio/api'
import { useMyPortfolio } from '../features/portfolio/hooks'
import { saveWithFreeSlug } from '../features/portfolio/publish'
import { ConfirmButton } from '../components/ConfirmButton'
import { slugify } from '../features/import/parse'
import { usePageTitle } from '../lib/usePageTitle'
import { emptyCv } from '../content/cv'
import { normalizeCv } from '../content/normalize'
import type { Link as CvLink } from '../content/types'
import { BackLink, StatusMessage } from '../components/ui'
import { AddProjectFromLink, ImageInput, type ProjectDraft } from '../features/links/LinkFields'
import { autoLabel, cleanUrl } from '../features/links/preview'
import {
  PROFILE_FIELDS,
  SECTIONS,
  blankItem,
  fromForm,
  toForm,
  type CvForm,
  type FieldDef,
  type FormItem,
  type FormValue,
  type ListSection,
} from '../features/editor/form'

export function EditorPage() {
  usePageTitle('Edit portfolio')
  const { user } = useAuth()
  const userId = user!.id
  const mine = useMyPortfolio()
  const [params] = useSearchParams()

  if (mine.isPending) return <div className="container-page py-16 text-center text-muted" role="status">Loading your portfolio…</div>
  if (mine.isError) {
    return (
      <div className="container-page py-10">
        <StatusMessage title="Could not load your portfolio." tone="error" action={<button className="btn-secondary" onClick={() => mine.refetch()}>Try again</button>}>
          Check your connection. If this keeps happening, the database update for the portfolio may not have run yet.
        </StatusMessage>
      </div>
    )
  }
  // Nothing saved yet: the quickest start is a résumé, unless they chose to start from scratch.
  if (!mine.data && params.get('start') !== 'blank') return <Navigate to="/create" replace />
  return <Editor key={userId} userId={userId} row={mine.data ?? null} />
}

const TABS = ['profile', ...SECTIONS.map((s) => s.key)] as const
type Tab = (typeof TABS)[number]

function Editor({ userId, row }: { userId: string; row: PortfolioRow | null }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const saved = row ? normalizeCv(row.content) : emptyCv
  const [form, setForm] = useState<CvForm>(() => toForm(saved))
  const [slug, setSlug] = useState(row?.slug ?? '')
  const [published, setPublished] = useState(row?.published ?? true)
  const snapshot = (cv: unknown, s: string | null, p: boolean) => JSON.stringify([cv, s || null, p])
  const savedSnapshot = row ? snapshot(saved, row.slug, row.published) : ''
  const initialTab = params.get('tab') as Tab | null
  const [tab, setTab] = useState<Tab>(initialTab && TABS.includes(initialTab) ? initialTab : 'profile')
  const [problem, setProblem] = useState<string | null>(null)
  // Last "Clear all fields" that can still be undone.
  const [undo, setUndo] = useState<CvForm | null>(null)

  const current = useMemo(() => fromForm(form), [form])
  const dirty = snapshot(current, slug, published) !== savedSnapshot

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const save = useMutation({
    mutationFn: async () => {
      const address = slug.trim()
      // First save from scratch: pick a free address from the name.
      return address ? saveMyPortfolio(userId, current, address, published) : saveWithFreeSlug(userId, current, published)
    },
    onSuccess: async (saved) => {
      queryClient.setQueryData(['my-portfolio', userId], saved)
      await queryClient.invalidateQueries({ queryKey: ['portfolio', saved.slug] })
      // Straight back to the portfolio, with a success message there.
      navigate(`/p/${saved.slug}?status=${row ? 'saved' : 'new'}`)
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    setProblem(null)
    if (!current.name) {
      setTab('profile')
      return setProblem('Add your full name first.')
    }
    const address = slug.trim()
    if (address) {
      const issue = slugProblem(address)
      if (issue) return setProblem(`Address: ${issue}`)
    }
    save.mutate()
  }

  function clearAll() {
    setUndo(form)
    setForm(toForm(emptyCv))
  }

  const remove = useMutation({
    mutationFn: () => deleteMyPortfolio(userId),
    onSuccess: () => {
      queryClient.setQueryData(['my-portfolio', userId], null)
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      navigate('/create?deleted=1', { replace: true })
    },
  })

  const setProfile = (key: string, value: FormValue) => setForm((f) => ({ ...f, profile: { ...f.profile, [key]: value } }))
  const setList = (key: ListSection, items: FormItem[]) => setForm((f) => ({ ...f, lists: { ...f.lists, [key]: items } }))

  const tabs: { key: Tab; label: string }[] = [{ key: 'profile', label: 'Profile' }, ...SECTIONS.map((s) => ({ key: s.key, label: s.label }))]
  const section = SECTIONS.find((s) => s.key === tab)
  const isEmpty = !current.name && current.experience.length === 0 && current.education.length === 0

  return (
    <form onSubmit={onSubmit} className="container-page max-w-5xl py-8">
      <BackLink fallback={row?.slug ? `/p/${row.slug}` : '/create'} label={row?.slug ? 'Back to my portfolio' : 'Back'} />
      <h1 className="display mt-2 text-5xl">{row ? 'Edit' : 'Build'} <em className="text-brand-italic">portfolio.</em></h1>
      {!row && (
        <p className="mt-2 text-sm text-muted">
          Fill in what you like, then press Save to publish. Have a résumé? <Link to="/create" className="link font-semibold">Upload it instead</Link>.
        </p>
      )}

      {undo && (
        <div role="status" className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm">
          <p className="flex-1">All fields cleared. Nothing changes on your page until you press Save.</p>
          <button type="button" className="btn-secondary h-9 py-0" onClick={() => { setForm(undo); setUndo(null) }}>Undo</button>
          <button type="button" className="btn-quiet" aria-label="Dismiss" onClick={() => setUndo(null)}>✕</button>
        </div>
      )}

      {/* Save bar: always in reach, never covered. */}
      <div className="sticky top-16 z-10 -mx-4 mt-4 border-y border-line bg-bg/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <div className="flex items-center gap-3">
          <span className="min-w-0 flex-1 truncate text-sm text-muted" role="status">
            {save.isPending ? 'Saving…' : dirty ? 'Unsaved changes' : 'No changes yet'}
          </span>
          {row?.slug && !dirty && <Link to={`/p/${row.slug}`} className="btn-quiet">View</Link>}
          <button type="submit" className="btn-primary" disabled={save.isPending || (!dirty && Boolean(row))}>
            {save.isPending ? 'Saving…' : row ? 'Save' : 'Save & publish'}
          </button>
        </div>
        {problem && <p role="alert" className="mt-2 text-sm text-danger">{problem}</p>}
        {save.isError && <p role="alert" className="mt-2 text-sm text-danger">Could not save: {(save.error as Error).message}</p>}
      </div>

      <div className="mt-6 flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Sections">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${tab === t.key ? 'bg-accent-soft font-semibold text-accent' : 'text-muted hover:text-ink'}`}
          >
            {t.label}
            {t.key !== 'profile' && <span className="ml-1 text-xs opacity-70">{form.lists[t.key].length}</span>}
          </button>
        ))}
      </div>

      <div className="mt-4" role="tabpanel">
        {tab === 'profile' ? (
          <div className="panel grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            {PROFILE_FIELDS.map((f) => (
              <FieldInput key={f.key} id={`profile-${f.key}`} field={f} value={form.profile[f.key]} onChange={(v) => setProfile(f.key, v)} />
            ))}
          </div>
        ) : (
          section && <ListEditor section={section} items={form.lists[section.key]} onChange={(items) => setList(section.key, items)} />
        )}
      </div>

      <section aria-labelledby="settings" className="panel mt-8 grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <h2 id="settings" className="label sm:col-span-2">Address & visibility</h2>
        <div>
          <label htmlFor="slug" className="mb-1 block text-sm font-medium">Your address</label>
          <div className="flex items-center rounded-xl border border-line bg-surface focus-within:border-accent">
            <span className="shrink-0 pl-3 text-sm text-muted">…/p/</span>
            <input
              id="slug"
              className="w-full min-w-0 rounded-xl bg-transparent px-1 py-2 text-base outline-none sm:text-sm"
              placeholder={slugify(current.name) || 'your-name'}
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 40))}
              autoCapitalize="off"
              spellCheck={false}
            />
          </div>
          <p className="mt-1 text-xs text-muted">{slug ? 'Changing it breaks links you already shared.' : 'Left empty, it is made from your name.'}</p>
        </div>
        <div>
          <span className="mb-1 block text-sm font-medium">Who can see it</span>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            Visible to everyone
          </label>
          <p className="mt-1 text-xs text-muted">Untick to hide it while you work on it.</p>
        </div>
      </section>

      <section aria-labelledby="start-over" className="mt-10 border-t border-line pt-6">
        <h2 id="start-over" className="label">Start over</h2>
        <div className="mt-2 grid gap-4 sm:grid-cols-3">
          <div>
            <Link to="/create" className="btn-secondary">Upload a new résumé</Link>
            <p className="mt-1 text-xs text-muted">Updates your portfolio in one go and keeps your pictures and links.</p>
          </div>
          <div>
            <button type="button" className="btn-secondary" onClick={clearAll} disabled={isEmpty}>Clear all fields</button>
            <p className="mt-1 text-xs text-muted">Empties the editor. You can undo it.</p>
          </div>
          {row && (
            <div>
              <ConfirmButton
                className="btn border border-danger/40 bg-surface text-danger hover:bg-danger/10"
                question={<>Delete your portfolio{row.slug ? <> and take <strong>/p/{row.slug}</strong> offline</> : ''}? This cannot be undone.</>}
                confirmLabel="Delete for good"
                onConfirm={() => remove.mutate()}
                disabled={remove.isPending}
              >
                {remove.isPending ? 'Deleting…' : 'Delete portfolio'}
              </ConfirmButton>
              <p className="mt-1 text-xs text-muted">Removes it from the site.</p>
              {remove.isError && <p role="alert" className="mt-1 text-sm text-danger">Could not delete: {(remove.error as Error).message}</p>}
            </div>
          )}
        </div>
      </section>
    </form>
  )
}

function ListEditor({ section, items, onChange }: { section: (typeof SECTIONS)[number]; items: FormItem[]; onChange: (items: FormItem[]) => void }) {
  const [open, setOpen] = useState<string | null>(null)

  function move(index: number, by: number) {
    const next = [...items]
    const [item] = next.splice(index, 1)
    next.splice(index + by, 0, item)
    onChange(next)
  }

  function add() {
    const item = blankItem(section)
    onChange([...items, item])
    setOpen(item._key)
  }

  function addFromLink(project: ProjectDraft) {
    const item = blankItem(section)
    Object.assign(item, project, { featured: items.filter((i) => i.featured === true).length < 3 })
    onChange([item, ...items])
    setOpen(item._key)
  }

  return (
    <div className="space-y-3">
      {section.key === 'projects' && <AddProjectFromLink onAdd={addFromLink} />}
      {items.length === 0 && <p className="text-sm text-muted">Nothing here yet.</p>}
      {items.map((item, index) => {
        const expanded = open === item._key
        return (
          <div key={item._key} className="panel">
            <div className="flex items-center gap-2 p-3 pl-4">
              <button type="button" className="flex-1 text-left font-medium" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : item._key)}>
                <span aria-hidden="true" className="mr-2 inline-block w-3 text-muted">{expanded ? '▾' : '▸'}</span>
                {section.title(item)}
              </button>
              <button type="button" className="btn-quiet" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>↑</button>
              <button type="button" className="btn-quiet" aria-label="Move down" disabled={index === items.length - 1} onClick={() => move(index, 1)}>↓</button>
              <ConfirmButton className="btn-quiet hover:!text-danger" question="Remove?" confirmLabel="Remove" onConfirm={() => onChange(items.filter((i) => i._key !== item._key))}>
                Remove
              </ConfirmButton>
            </div>
            {expanded && (
              <div className="grid gap-4 border-t border-line p-4 sm:grid-cols-2 sm:p-5">
                {section.fields.map((f) => (
                  <FieldInput
                    key={f.key}
                    id={`${item._key}-${f.key}`}
                    field={f}
                    value={item[f.key]}
                    onChange={(v) => onChange(items.map((i) => (i._key === item._key ? { ...i, [f.key]: v } : i)))}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
      <button type="button" className="btn-secondary" onClick={add}>{section.key === 'projects' ? 'Add a project by hand' : `Add ${section.itemLabel}`}</button>
    </div>
  )
}

function FieldInput({ id, field, value, onChange }: { id: string; field: FieldDef; value: FormValue; onChange: (value: FormValue) => void }) {
  const span = field.half ? '' : 'sm:col-span-2'
  const hint = field.hint && <p className="mt-1 text-xs text-muted">{field.hint}</p>

  if (field.kind === 'checkbox') {
    return (
      <label className={`inline-flex items-center gap-2 text-sm font-medium ${span}`}>
        <input id={id} type="checkbox" className="size-4 accent-[var(--accent)]" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
        {field.label}
      </label>
    )
  }
  if (field.kind === 'image') {
    return (
      <div className={span}>
        <label htmlFor={id} className="mb-1 block text-sm font-medium">{field.label}</label>
        <ImageInput id={id} value={String(value ?? '')} mode={field.image ?? 'cover'} onChange={onChange} />
        {hint}
      </div>
    )
  }
  if (field.kind === 'links') {
    return (
      <fieldset className={span}>
        <legend className="mb-1 text-sm font-medium">{field.label}</legend>
        <LinksInput id={id} links={Array.isArray(value) ? value : []} onChange={onChange} />
        {hint}
      </fieldset>
    )
  }
  const multiline = field.kind === 'textarea' || field.kind === 'lines'
  return (
    <div className={span}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{field.label}</label>
      {multiline ? (
        <textarea id={id} className="field min-h-28 text-base sm:text-sm" rows={field.kind === 'lines' ? 5 : 6} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input
          id={id}
          className="field text-base sm:text-sm"
          value={String(value ?? '')}
          inputMode={field.kind === 'url' ? 'url' : undefined}
          placeholder={field.kind === 'url' ? 'https://…' : undefined}
          onChange={(e) => onChange(e.target.value)}
          onBlur={field.kind === 'url' ? (e) => onChange(cleanUrl(e.target.value) || e.target.value) : undefined}
        />
      )}
      {hint}
    </div>
  )
}

function LinksInput({ id, links, onChange }: { id: string; links: CvLink[]; onChange: (links: CvLink[]) => void }) {
  const update = (index: number, patch: Partial<CvLink>) => onChange(links.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  return (
    <div className="space-y-2">
      {links.map((l, index) => (
        <div key={index} className="flex flex-wrap gap-2 sm:flex-nowrap">
          <input aria-label="Link label" placeholder="Label" className="field text-base sm:w-40 sm:text-sm" value={l.label} onChange={(e) => update(index, { label: e.target.value })} />
          <input
            id={index === 0 ? id : undefined}
            aria-label="Link address"
            placeholder="https://…"
            type="url"
            className="field flex-1 text-base sm:text-sm"
            value={l.url}
            onChange={(e) => update(index, { url: e.target.value })}
            onBlur={() => update(index, autoLabel(l))}
          />
          <button type="button" className="btn-quiet" aria-label="Remove link" onClick={() => onChange(links.filter((_, i) => i !== index))}>✕</button>
        </div>
      ))}
      <button type="button" className="btn-quiet" onClick={() => onChange([...links, { label: '', url: '' }])}>+ Add link</button>
      <p className="text-xs text-muted">Paste the address; the label fills in by itself.</p>
    </div>
  )
}
