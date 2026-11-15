// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { cvFromLinkedIn, isLinkedInProfile, mergeProfiles, nameFromProfileUrl } from '../src/features/import/linkedin'
import { parseResume } from '../src/features/import/parse'
import { pdfItemsToText, type PdfItem } from '../src/features/import/extract'
import { isTechnicalLink } from '../src/content/normalize'

// What LinkedIn shares publicly (shape taken from a real public profile, made-up person).
const PREVIEW = {
  title: 'Jane Doe - Acme Consulting | LinkedIn',
  description: 'Structural engineer designing safe bridges. Mentor. · Experience: Acme Consulting · Education: University of Testing · Location: Nairobi, Kenya · 500+ connections on LinkedIn. View Jane Doe’s profile on LinkedIn, a professional community of 1 billion members.',
  image: 'https://media.licdn.com/dms/image/v2/abc/profile-displayphoto-shrink_800_800/0/1?e=1&v=beta',
}

describe('LinkedIn profile links', () => {
  it('recognises profile links only', () => {
    expect(isLinkedInProfile('https://www.linkedin.com/in/jane-doe-12ab/')).toBe(true)
    expect(isLinkedInProfile('linkedin.com/in/jane')).toBe(true)
    expect(isLinkedInProfile('https://www.linkedin.com/company/acme')).toBe(false)
    expect(isLinkedInProfile('https://example.com/in/jane')).toBe(false)
  })

  it('reads the public summary into a portfolio', () => {
    const cv = cvFromLinkedIn(PREVIEW, 'https://www.linkedin.com/in/jane-doe-12ab?trk=x')
    expect(cv).toMatchObject({
      name: 'Jane Doe',
      photo: PREVIEW.image,
      headline: 'Structural engineer designing safe bridges',
      location: 'Nairobi, Kenya',
      summary: 'Structural engineer designing safe bridges. Mentor.',
      links: [{ label: 'LinkedIn', url: 'https://www.linkedin.com/in/jane-doe-12ab' }],
    })
    expect(cv.experience[0]).toMatchObject({ org: 'Acme Consulting', role: 'Structural engineer designing safe bridges' })
    expect(cv.education[0]).toMatchObject({ school: 'University of Testing' })
  })

  it('still gets the name when LinkedIn shares nothing', () => {
    expect(nameFromProfileUrl('https://www.linkedin.com/in/jane-wanjiru-doe-1a2b3c4')).toBe('Jane Wanjiru Doe')
    expect(cvFromLinkedIn(null, 'linkedin.com/in/sam-example').name).toBe('Sam Example')
  })

  it('combines with a résumé without contradicting it: the résumé wins, LinkedIn fills gaps', () => {
    const resume = parseResume(`Jane W. Doe
Bridge engineer

EXPERIENCE
Site Engineer | Acme Consulting
2020 - 2022
• Supervised a deck pour`).cv
    const merged = mergeProfiles(resume, cvFromLinkedIn(PREVIEW, 'linkedin.com/in/jane-doe'))
    expect(merged.name).toBe('Jane W. Doe') // résumé
    expect(merged.headline).toBe('Bridge engineer') // résumé
    expect(merged.photo).toBe(PREVIEW.image) // filled from LinkedIn
    expect(merged.location).toBe('Nairobi, Kenya') // filled from LinkedIn
    expect(merged.experience.map((e) => e.org)).toEqual(['Acme Consulting']) // no duplicate role
    expect(merged.education.map((e) => e.school)).toEqual(['University of Testing']) // added, was missing
    expect(merged.links[0]).toEqual({ label: 'LinkedIn', url: 'https://linkedin.com/in/jane-doe' })
  })
})

describe("LinkedIn's Save to PDF file", () => {
  const item = (text: string, x: number, y: number, size = 10): PdfItem => ({ text, x, y, size, width: text.length * size * 0.45 })
  // Sidebar on the left (x 30), main column on the right (x 220), as LinkedIn lays it out.
  const page = [
    item('Contact', 30, 780, 13), item('jane@example.com', 30, 762), item('www.linkedin.com/in/jane-doe', 30, 748),
    item('Top Skills', 30, 720, 13), item('Bridge Design', 30, 704), item('SAP2000', 30, 690), item('AutoCAD', 30, 676),
    item('Languages', 30, 650, 13), item('English', 30, 634), item('Swahili', 30, 620),
    item('Jane Doe', 220, 780, 26), item('Structural Engineer at Acme Consulting', 220, 752, 12), item('Nairobi, Kenya', 220, 736),
    item('Summary', 220, 704, 15), item('I design safe, durable bridges and mentor young engineers.', 220, 688),
    item('Experience', 220, 656, 15),
    item('Acme Consulting', 220, 638, 12), item('Structural Engineer', 220, 624, 11), item('January 2021 - Present (3 years 11 months)', 220, 610),
    item('Nairobi, Kenya', 220, 596), item('Designed three footbridges and led site reviews.', 220, 582),
    item('City of Edmund', 220, 560, 12), item('Engineering Intern', 220, 546, 11), item('May 2019 - August 2020 (1 year 4 months)', 220, 532),
    item('Inspected culverts and wrote reports.', 220, 518),
    item('Education', 220, 490, 15), item('University of Testing', 220, 472, 12), item('Bachelor of Science - BS, Civil Engineering · (2015 - 2019)', 220, 458),
    item('Page 1 of 1', 300, 40),
  ]

  it('reads the main column, then the sidebar, in LinkedIn order', () => {
    const { cv } = parseResume(pdfItemsToText([page]))
    expect(cv.name).toBe('Jane Doe')
    expect(cv.headline).toBe('Structural Engineer at Acme Consulting')
    expect(cv.location).toBe('Nairobi, Kenya')
    expect(cv.summary).toBe('I design safe, durable bridges and mentor young engineers.')
    expect(cv.experience).toEqual([
      { role: 'Structural Engineer', org: 'Acme Consulting', logo: '', location: 'Nairobi, Kenya', start: 'January 2021', end: '', bullets: ['Designed three footbridges and led site reviews.'] },
      { role: 'Engineering Intern', org: 'City of Edmund', logo: '', location: '', start: 'May 2019', end: 'August 2020', bullets: ['Inspected culverts and wrote reports.'] },
    ])
    expect(cv.education[0]).toMatchObject({ school: 'University of Testing', degree: 'Bachelor of Science - BS, Civil Engineering', dates: '2015 – 2019' })
    expect(cv.skills.flatMap((s) => s.items)).toEqual(expect.arrayContaining(['Bridge Design', 'SAP2000', 'AutoCAD', 'English', 'Swahili']))
    expect(cv.email).toBe('jane@example.com')
    expect(JSON.stringify(cv)).not.toContain('Page 1 of 1')
  })
})

describe('technical links are kept out of the way', () => {
  it('spots API and developer links', () => {
    expect(isTechnicalLink({ label: 'API', url: 'https://medmatch.onrender.com' })).toBe(true)
    expect(isTechnicalLink({ label: 'Docs', url: 'https://x.dev/api/v1' })).toBe(true)
    expect(isTechnicalLink({ label: 'Live demo', url: 'https://medmatch.vercel.app' })).toBe(false)
    expect(parseResume('Sam Example\nAPI Endpoint: https://sam-api.onrender.com\nGitHub: https://github.com/sam\n\nEXPERIENCE\nDev\n2020 - 2021').cv.links.map((l) => l.label)).toEqual(['GitHub'])
  })
})
