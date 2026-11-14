import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../features/auth/AuthProvider'
import { fetchMyPortfolio, saveMyPortfolio, type PortfolioRow } from '../features/portfolio/api'
import { portfolioOwnerId } from '../lib/supabase'
import { usePageTitle } from '../lib/usePageTitle'
import { bundledCv, emptyCv } from '../content/cv'
import { normalizeCv } from '../content/normalize'
import type { Link as CvLink } from '../content/types'
import { StatusMessage } from '../components/ui'
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
  const mine = useQuery({ queryKey: ['my-portfolio', userId], queryFn: () => fetchMyPortfolio(userId) })

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
  return <Editor key={userId} userId={userId} row={mine.data} />
}

function startingContent(userId: string, row: PortfolioRow | null) {
  if (row) return normalizeCv(row.content)
  // The site owner (or anyone, before an owner is configured) starts from the bundled CV.
  return !portfolioOwnerId || portfolioOwnerId === userId ? bundledCv : emptyCv
}

function Editor({ userId, row }: { userId: string; row: PortfolioRow | null }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CvForm>(() => toForm(startingContent(userId, row)))
  const [published, setPublished] = useState(row?.published ?? false)
  const [savedSnapshot, setSavedSnapshot] = useState(() => (row ? JSON.stringify([normalizeCv(row.content), row.published]) : ''))
  const [tab, setTab] = useState<'profile' | ListSection>('profile')

  const current = useMemo(() => fromForm(form), [form])
  const dirty = JSON.stringify([current, published]) !== savedSnapshot

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const save = useMutation({
    mutationFn: () => saveMyPortfolio(userId, current, published),
    onSuccess: (saved) => {
      setSavedSnapshot(JSON.stringify([normalizeCv(saved.content), saved.published]))
      queryClient.setQueryData(['my-portfolio', userId], saved)
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!current.name) return
    save.mutate()
  }

  const setProfile = (key: string, value: FormValue) => setForm((f) => ({ ...f, profile: { ...f.profile, [key]: value } }))
  const setList = (key: ListSection, items: FormItem[]) => setForm((f) => ({ ...f, lists: { ...f.lists, [key]: items } }))

  const isOwner = portfolioOwnerId === userId
  const tabs: { key: 'profile' | ListSection; label: string }[] = [{ key: 'profile', label: 'Profile' }, ...SECTIONS.map((s) => ({ key: s.key, label: s.label }))]
  const section = SECTIONS.find((s) => s.key === tab)

  return (
    <form onSubmit={onSubmit} className="container-page max-w-5xl py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Signed in · <Link to="/account" className="link normal-case tracking-normal">account</Link></p>
          <h1 className="display mt-1 text-5xl">Edit <em className="text-brand-italic">portfolio.</em></h1>
        </div>
        <Link to="/" className="link text-sm" target="_blank">View public site ↗</Link>
      </div>

      <OwnerNotice userId={userId} isOwner={isOwner} />

      <div className="sticky top-16 z-10 -mx-4 mt-6 border-y border-line bg-bg/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            Published
          </label>
          <span className="text-xs text-muted" role="status">
            {save.isPending ? 'Saving…' : dirty ? 'Unsaved changes' : row || save.isSuccess ? 'All changes saved' : 'Not saved yet'}
          </span>
          <button type="submit" className="btn-primary ml-auto" disabled={save.isPending || !dirty || !current.name}>Save</button>
        </div>
        {!current.name && <p className="mt-2 text-sm text-danger">Add your full name before saving.</p>}
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

      <div className="mt-10 flex flex-wrap gap-3 border-t border-line pt-6 text-sm">
        <button
          type="button"
          className="btn-quiet"
          onClick={() => {
            if (window.confirm('Replace everything in the editor with the CV bundled with the site? Nothing is saved until you press Save.')) setForm(toForm(bundledCv))
          }}
        >
          Reset to bundled CV
        </button>
      </div>
    </form>
  )
}

function OwnerNotice({ userId, isOwner }: { userId: string; isOwner: boolean }) {
  if (isOwner) {
    return (
      <p className="mt-4 text-sm text-muted">
        This is the portfolio shown on the public site. Untick <strong>Published</strong> to hide it; the site then shows the bundled CV.
      </p>
    )
  }
  return (
    <div className="mt-4 rounded-2xl bg-accent-soft px-4 py-3 text-sm">
      <p>
        <strong>{portfolioOwnerId ? 'This account is not the site owner.' : 'The public site is not linked to an account yet.'}</strong>{' '}
        It shows the CV bundled with the code until you link it. To show what you save here, add this environment variable in
        Vercel (Project → Settings → Environment Variables) and redeploy:
      </p>
      <code className="mt-2 block rounded-lg bg-surface px-3 py-2 text-xs break-all select-all">VITE_PORTFOLIO_OWNER_ID={userId}</code>
    </div>
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

  return (
    <div className="space-y-3">
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
              <button
                type="button"
                className="btn-quiet hover:!text-danger"
                onClick={() => {
                  if (window.confirm(`Remove “${section.title(item)}”?`)) onChange(items.filter((i) => i._key !== item._key))
                }}
              >
                Remove
              </button>
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
      <button type="button" className="btn-secondary" onClick={add}>Add {section.itemLabel}</button>
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
        <input id={id} className="field text-base sm:text-sm" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
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
          />
          <button type="button" className="btn-quiet" aria-label="Remove link" onClick={() => onChange(links.filter((_, i) => i !== index))}>✕</button>
        </div>
      ))}
      <button type="button" className="btn-quiet" onClick={() => onChange([...links, { label: '', url: '' }])}>+ Add link</button>
      <p className="text-xs text-muted">Links need a full address starting with https://; others are not saved.</p>
    </div>
  )
}
