// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { findPhone, isStreetAddress, parseResume, sectionFor, slugify, takeDates } from '../src/features/import/parse'
import { docxXmlToText, pdfItemsToText, type PdfItem } from '../src/features/import/extract'
import { slugProblem } from '../src/features/portfolio/api'
import { addressFollowsName, isAutoAddress } from '../src/features/portfolio/publish'

// A made-up résumé in a common single-column layout (as pasted text).
const PLAIN = `JANE WANJIRU DOE
Civil Engineer (EIT)
Edmund, Ontario | jane.doe@example.com | +1 555 010 0199 | linkedin.com/in/janedoe

PROFESSIONAL SUMMARY
Civil engineer with three years of experience in road and drainage design.
I like clear drawings.

WORK EXPERIENCE
Junior Civil Engineer | Acme Consulting Ltd | Toronto, Ontario
Jan 2022 – Present
• Designed stormwater systems for 12 subdivisions
• Prepared tender drawings in Civil 3D

Engineering Intern
City of Edmund, Edmund, Ontario
May 2020 - Aug 2021
- Inspected 40 culverts
- Wrote inspection reports

EDUCATION
BASc Civil Engineering, University of Testing
2016 – 2020

SKILLS
Design: AutoCAD Civil 3D, HEC-RAS, SWMM
Programming: Python, Excel (VBA, Power Query)
Communication, Teamwork

PROJECTS
Bridge Monitoring Dashboard – Capstone
Built a dashboard showing sensor data from a pedestrian bridge using Python and Excel. Source: https://github.com/janedoe/bridge

CERTIFICATIONS
• EIT – Professional Engineers Ontario, 2022
• First Aid, 2021

REFERENCES
Available on request`

describe('parseResume (plain text)', () => {
  it('never takes a street address for the name or headline', () => {
    const r = parseResume('3453 Caribou Crescent\nJane Doe\nSite Engineer\njane@example.com\n\nEXPERIENCE\nEngineer, Acme\n2020 – 2022')
    expect(r.cv.name).toBe('Jane Doe')
    expect(r.cv.headline).toBe('Site Engineer')
    expect(slugify(r.cv.name)).toBe('jane-doe')
  })

  it('tells street addresses from postcodes and headlines', () => {
    for (const a of ['3453 Caribou Crescent', '1200 Bay St.', '45B Ngong Road', 'P.O. Box 123, Nairobi']) expect(isStreetAddress(a)).toBe(true)
    for (const a of ['00100, Nairobi, Kenya', '5 years in structural design', 'Jane Doe', 'Site Engineer']) expect(isStreetAddress(a)).toBe(false)
  })

  const { cv, skipped } = parseResume(PLAIN)

  it('reads the header', () => {
    expect(cv.name).toBe('Jane Wanjiru Doe')
    expect(cv.headline).toBe('Civil Engineer (EIT)')
    expect(cv.location).toBe('Edmund, Ontario')
    expect(cv.email).toBe('jane.doe@example.com')
    expect(cv.links).toEqual([{ label: 'LinkedIn', url: 'https://linkedin.com/in/janedoe' }])
  })

  it('finds the phone number for the private record, but never puts it on the public portfolio', () => {
    expect(parseResume(PLAIN).phone).toBe('+1 555 010 0199')
    expect(cv.phone).toBe('')
    expect(JSON.stringify(cv)).not.toContain('555')
  })

  it('does not mistake dates for phone numbers', () => {
    expect(findPhone('Engineer 2016 - 2020\nTel: 0712 345 678')).toBe('0712 345 678')
    expect(findPhone('2016 - 2020, 10/01/2024')).toBe('')
  })

  it('reads the summary and experience', () => {
    expect(cv.summary).toBe('Civil engineer with three years of experience in road and drainage design. I like clear drawings.')
    expect(cv.experience).toEqual([
      { role: 'Junior Civil Engineer', org: 'Acme Consulting Ltd', logo: '', location: 'Toronto, Ontario', start: 'Jan 2022', end: '', bullets: ['Designed stormwater systems for 12 subdivisions', 'Prepared tender drawings in Civil 3D'] },
      { role: 'Engineering Intern', org: 'City of Edmund', logo: '', location: 'Edmund, Ontario', start: 'May 2020', end: 'Aug 2021', bullets: ['Inspected 40 culverts', 'Wrote inspection reports'] },
    ])
  })

  it('reads education, skills, projects and certifications', () => {
    expect(cv.education[0]).toMatchObject({ degree: 'BASc Civil Engineering', school: 'University of Testing', dates: '2016 – 2020' })
    expect(cv.skills).toEqual([
      { group: 'Skills', items: ['Communication', 'Teamwork'] },
      { group: 'Design', items: ['AutoCAD Civil 3D', 'HEC-RAS', 'SWMM'] },
      { group: 'Programming', items: ['Python', 'Excel (VBA, Power Query)'] },
    ])
    expect(cv.projects).toEqual([
      {
        title: 'Bridge Monitoring Dashboard',
        subtitle: 'Capstone',
        description: 'Built a dashboard showing sensor data from a pedestrian bridge using Python and Excel.',
        image: '',
        tech: ['Python', 'Excel'],
        links: [{ label: 'Source', url: 'https://github.com/janedoe/bridge' }],
        featured: true,
      },
    ])
    expect(cv.certifications).toEqual([
      { name: 'EIT', issuer: 'Professional Engineers Ontario', date: '2022', url: '' },
      { name: 'First Aid', issuer: '', date: '2021', url: '' },
    ])
    expect(skipped).toEqual(['REFERENCES'])
  })
})

describe('parseResume (edge cases)', () => {
  it('returns an empty portfolio for text that is not a résumé', () => {
    const { cv } = parseResume('hello')
    expect(cv.experience).toEqual([])
    expect(cv.education).toEqual([])
  })

  it('handles headings with content on the same line and Windows line endings', () => {
    const { cv } = parseResume('Sam Example\r\nSkills: Python, SQL\r\nInterests  Hiking • Bridges\r\n')
    expect(cv.skills[0].items).toEqual(['Python', 'SQL'])
    expect(cv.interests).toEqual(['Hiking', 'Bridges'])
  })

  it('drops links that are not web addresses', () => {
    const { cv } = parseResume('Sam Example\njavascript:alert(1)\nhttps://example.com/sam\n\nEXPERIENCE\nEngineer\n2020 - 2021')
    expect(cv.links.map((l) => l.url)).toEqual(['https://example.com/sam'])
  })
})

describe('helpers', () => {
  it('recognises headings however they are written', () => {
    expect(sectionFor('WORK EXPERIENCE')).toBe('experience')
    expect(sectionFor('Licenses & Certifications')).toBe('certifications')
    expect(sectionFor('Recommendati on')).toBe('testimonials')
    expect(sectionFor('Websites, Portfolios, Profiles')).toBe('links')
    expect(sectionFor('Built a bridge')).toBeNull()
  })

  it('finds date ranges', () => {
    expect(takeDates('Engineer  07/2022 - Current')).toMatchObject({ start: '07/2022', end: '', rest: 'Engineer' })
    expect(takeDates('Acme | March 17 – May 19, 2026')).toMatchObject({ start: 'March 17', end: 'May 19, 2026', rest: 'Acme' })
    expect(takeDates('BSc Expected Graduation 11/2026')).toMatchObject({ start: 'Expected 11/2026', rest: 'BSc' })
  })

  it('suggests and checks public addresses', () => {
    expect(slugify('Zoë  O’Brien-Smith')).toBe('zoe-o-brien-smith')
    expect(slugProblem('jane-doe')).toBeNull()
    expect(slugProblem('ab')).toMatch(/3/)
    expect(slugProblem('Jane Doe')).toMatch(/lowercase/)
    expect(slugProblem('jane--doe')).toMatch(/Hyphens/)
  })
})

describe('extracting text', () => {
  const item = (text: string, x: number, y: number, size = 9): PdfItem => ({ text, x, y, size, width: text.length * size * 0.5 })

  it('reads a two-column PDF layout with headings in the left column', () => {
    const page = [
      item('JANE DOE', 150, 760, 30),
      item('Professional', 35, 641, 12), item('Builds bridges and roads.', 150, 642),
      item('Summary', 35, 626, 12), item('Likes concrete.', 150, 627),
      item('Experience', 35, 598, 12), item('Site Engineer', 150, 600), item('2020 - 2022', 480, 600),
      item('•', 155, 586), item('Supervised a 40 m bridge deck pour with a team of', 164, 586),
      item('twelve.', 164, 572),
      item('Skills', 35, 540, 12), item('•', 155, 540), item('Python', 164, 540), item('•', 368, 540), item('AutoCAD (Civil', 377, 540),
      item('•', 155, 526), item('SQL', 164, 526), item('3D)', 377, 526),
    ]
    const text = pdfItemsToText([page])
    expect(text.split('\n')).toEqual([
      'JANE DOE',
      'Professional Summary',
      'Builds bridges and roads.',
      'Likes concrete.',
      'Experience',
      'Site Engineer  2020 - 2022',
      '• Supervised a 40 m bridge deck pour with a team of twelve.',
      'Skills',
      '• Python',
      '• AutoCAD (Civil 3D)',
      '• SQL',
    ])
    const { cv } = parseResume(text)
    expect(cv.summary).toBe('Builds bridges and roads. Likes concrete.')
    expect(cv.experience[0]).toMatchObject({ role: 'Site Engineer', start: '2020', end: '2022' })
    expect(cv.skills[0].items).toEqual(['Python', 'AutoCAD (Civil 3D)', 'SQL'])
  })

  it('reads paragraphs and lists from a Word document', () => {
    const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
    const xml = `<w:document xmlns:w="${W}"><w:body>
      <w:p><w:r><w:t>Jane </w:t></w:r><w:r><w:t>Doe</w:t></w:r></w:p>
      <w:p><w:r><w:t>Skills</w:t></w:r></w:p>
      <w:p><w:pPr><w:numPr><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Python</w:t></w:r></w:p>
      <w:tbl><w:tr><w:tc><w:p><w:r><w:t>Cell</w:t><w:tab/><w:t>text</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
    </w:body></w:document>`
    expect(docxXmlToText(xml)).toBe('Jane Doe\nSkills\n• Python\nCell  text')
  })
})

describe('automatic addresses', () => {
  it('knows which addresses were made from the name', () => {
    expect(isAutoAddress('jane-doe', 'Jane Doe')).toBe(true)
    expect(isAutoAddress('jane-doe-3', 'Jane Doe')).toBe(true)
    expect(isAutoAddress('jane-doe-x7k2', 'Jane Doe')).toBe(true)
    expect(isAutoAddress('3453-caribou-crescent', 'Jane Doe')).toBe(true)
    expect(isAutoAddress('jane-builds', 'Jane Doe')).toBe(false)
  })
  it('moves only automatic addresses, and only when the name changes', () => {
    expect(addressFollowsName('jane-doe', 'Jane Doe', 'Jane Wanjiru')).toBe(true)
    expect(addressFollowsName('jane-doe', 'Jane Doe', 'jane doe')).toBe(false)
    expect(addressFollowsName('jane-builds', 'Jane Doe', 'Jane Wanjiru')).toBe(false)
    expect(addressFollowsName('3453-caribou-crescent', '3453 Caribou Crescent', 'Nicholas Kioko')).toBe(true)
    expect(addressFollowsName('3453-caribou-crescent', 'Nicholas Kioko', 'Nicholas Kioko')).toBe(true)
    expect(addressFollowsName(null, 'Jane Doe', 'Jane Wanjiru')).toBe(false)
  })
})
