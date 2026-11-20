import type { Cv } from './types'

/**
 * A fictional person, shown at /example so visitors can see what a finished
 * portfolio looks like. Any resemblance to a real person is accidental.
 */
export const exampleCv: Cv = {
  name: 'Amara Lindqvist',
  photo: '',
  headline: 'Structural engineer (EIT)',
  location: 'Edmund, Ontario',
  status: 'Example portfolio · open to structural design roles',
  email: 'amara@example.com',
  phone: '',
  summary:
    'Structural engineer-in-training with four years of experience designing and inspecting bridges and mid-rise buildings. ' +
    'I combine hand calculations with finite-element modelling, write clear reports for owners and contractors, and care ' +
    'about safe, durable and low-carbon structures.',
  links: [
    { label: 'LinkedIn', url: 'https://www.linkedin.com/' },
    { label: 'Portfolio PDF', url: 'https://example.com/' },
  ],
  skills: [
    { group: 'Design & analysis', items: ['Steel and concrete design (CSA S16, A23.3)', 'Bridge design (CSA S6)', 'Finite-element analysis', 'Seismic and wind loads'] },
    { group: 'Software', items: ['SAP2000', 'ETABS', 'Revit', 'AutoCAD Civil 3D', 'Python', 'Excel / VBA'] },
    { group: 'Field', items: ['Condition inspections', 'Construction review', 'Load testing'] },
  ],
  experience: [
    {
      role: 'Structural Engineer-in-Training',
      org: 'Northbridge Consulting Engineers',
      logo: '',
      location: 'Edmund, Ontario',
      start: '2023',
      end: '',
      bullets: [
        'Designed steel and concrete members for three mid-rise residential buildings, from schematic design to issued-for-construction drawings.',
        'Modelled a 60 m two-span bridge rehabilitation in SAP2000 and wrote the load-rating report.',
        'Led weekly site reviews and resolved 40+ contractor RFIs within agreed turnaround times.',
      ],
    },
    {
      role: 'Engineering Intern',
      org: 'Lakeshore Municipality, Infrastructure Services',
      logo: '',
      location: 'Ontario',
      start: '05/2021',
      end: '08/2022',
      bullets: [
        'Inspected 25 culverts and small bridges and entered findings into the asset-management system.',
        'Automated inspection summaries with Python, saving about a day of work per month.',
      ],
    },
  ],
  education: [
    {
      degree: 'BASc, Civil Engineering (Structural option)',
      school: 'University of the Great Lakes',
      logo: '',
      location: 'Ontario',
      dates: '2018 – 2022',
      bullets: ['Capstone: timber pedestrian bridge, winner of the faculty design award.', 'Steel Bridge team, design lead.'],
    },
  ],
  projects: [
    {
      title: 'Riverside footbridge',
      subtitle: 'Capstone design project',
      description:
        'A 32 m glulam timber footbridge designed for pedestrians and maintenance vehicles, with vibration checks, ' +
        'connection design and a construction-staging plan. Embodied carbon was 35% lower than the steel option.',
      image: '',
      tech: ['Timber design', 'SAP2000', 'Revit'],
      links: [],
      featured: true,
    },
    {
      title: 'Bridge load-rating toolkit',
      subtitle: 'Internal tool',
      description: 'Python scripts that turn inspection data and analysis results into consistent load-rating tables and charts for reports.',
      image: '',
      tech: ['Python', 'Excel'],
      links: [],
      featured: true,
    },
    {
      title: 'Mid-rise retrofit study',
      subtitle: 'Seismic assessment',
      description: 'Compared three retrofit schemes for a 1970s concrete building and recommended the option with the least disruption to tenants.',
      image: '',
      tech: ['ETABS', 'Seismic design'],
      links: [],
      featured: true,
    },
  ],
  research: [
    {
      title: 'Freeze–thaw durability of recycled-aggregate concrete in Ontario bridge decks',
      kind: 'Master’s research (example)',
      year: 'In progress',
      summary: 'Made-up example. Recycled concrete aggregate lowers embodied carbon, but its performance under Ontario’s freeze–thaw cycles and de-icing salts is uncertain.',
      aim: 'To test whether air-entrained recycled-aggregate concrete meets durability requirements for bridge decks in Ontario climates.',
      objectives: ['Characterize recycled aggregates from three Ontario sources.', 'Measure freeze–thaw and salt-scaling resistance of trial mixes.', 'Recommend mix limits for deck applications.'],
      method: ['Materials: aggregate absorption, density and residual mortar content.', 'Testing: rapid freeze–thaw cycling and salt-scaling tests on trial mixes.', 'Analysis: compare durability factors against natural-aggregate controls.'],
      significance: 'Could let agencies use more recycled aggregate in structural concrete without shortening deck service life.',
      keywords: ['Recycled aggregate', 'Freeze–thaw', 'Bridge decks', 'Durability'],
      links: [],
    },
  ],
  certifications: [
    { name: 'Engineer-in-Training (EIT)', issuer: 'Professional Engineers Ontario', date: '2023', url: '' },
    { name: 'Working at Heights', issuer: 'Ontario Ministry of Labour', date: '2022', url: '' },
  ],
  interests: ['Low-carbon structures', 'Bridge rehabilitation', 'Mentoring engineering students'],
  testimonials: [
    {
      quote: 'Amara’s calculations are careful and her reports are the clearest on our team. Clients ask for her by name.',
      name: 'Example Reference',
      title: 'Principal, Northbridge Consulting Engineers',
    },
  ],
}
