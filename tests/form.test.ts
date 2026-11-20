import { describe, expect, it } from 'vitest'
import { SECTIONS, blankItem, fromForm, toForm } from '../src/features/editor/form'
import { exampleCv } from '../src/content/example'

describe('editor form', () => {
  it('round-trips the example portfolio without changes', () => {
    expect(fromForm(toForm(exampleCv))).toEqual(exampleCv)
  })

  it('turns lines into clean arrays', () => {
    const form = toForm(exampleCv)
    const project = form.lists.projects[0]
    project.tech = 'React\n  Supabase \n\n'
    form.lists.experience[0].bullets = 'First\n\n  Second  \n'
    form.profile.interests = 'One\nTwo\n'
    const cv = fromForm(form)
    expect(cv.projects[0].tech).toEqual(['React', 'Supabase'])
    expect(cv.experience[0].bullets).toEqual(['First', 'Second'])
    expect(cv.interests).toEqual(['One', 'Two'])
  })

  it('ignores new items until they have content', () => {
    const form = toForm(exampleCv)
    for (const section of SECTIONS) form.lists[section.key].push(blankItem(section))
    expect(fromForm(form)).toEqual(exampleCv)
  })

  it('gives every item a unique key', () => {
    const form = toForm(exampleCv)
    const keys = Object.values(form.lists).flat().map((i) => i._key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('research in the editor form', () => {
  it('round-trips research items, with one objective and stage per line', async () => {
    const { toForm, fromForm } = await import('../src/features/editor/form')
    const { emptyCv } = await import('../src/content/cv')
    const cv = { ...emptyCv, research: [{ title: 'T', kind: 'Thesis', year: '2026', summary: 'S', aim: 'A', objectives: ['O1', 'O2'], method: ['M1: x', 'M2: y'], significance: 'G', keywords: ['K'], links: [] }] }
    const form = toForm(cv)
    expect(form.lists.research[0].objectives).toBe('O1\nO2')
    expect(fromForm(form).research).toEqual(cv.research)
  })
})
