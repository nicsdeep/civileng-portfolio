import { usePortfolio } from '../app/Layout'
import { usePageTitle } from '../lib/usePageTitle'
import { Bullets, PageHeading, SectionTitle } from '../components/ui'
import { dateRange } from '../content/normalize'

export function ExperiencePage() {
  usePageTitle('Experience')
  const { cv } = usePortfolio()

  return (
    <div className="container-page max-w-4xl py-10">
      <PageHeading eyebrow="Career" title="Experience &" accent="education." />

      <section aria-labelledby="work">
        <SectionTitle id="work">Work</SectionTitle>
        <ol className="space-y-5">
          {cv.experience.map((e) => (
            <li key={`${e.role}-${e.org}-${e.start}`} className="panel p-5 sm:p-6">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h3 className="text-lg font-semibold">{e.role}</h3>
                <p className="shrink-0 text-sm text-muted">{dateRange(e.start, e.end)}</p>
              </div>
              <p className="text-sm text-accent">{[e.org, e.location].filter(Boolean).join(' · ')}</p>
              <Bullets items={e.bullets} />
            </li>
          ))}
        </ol>
      </section>

      {cv.education.length > 0 && (
        <section className="mt-12" aria-labelledby="education">
          <SectionTitle id="education">Education</SectionTitle>
          <ol className="space-y-5">
            {cv.education.map((e) => (
              <li key={`${e.degree}-${e.school}`} className="panel p-5 sm:p-6">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <h3 className="text-lg font-semibold">{e.degree}</h3>
                  <p className="shrink-0 text-sm text-muted">{e.dates}</p>
                </div>
                <p className="text-sm text-accent">{[e.school, e.location].filter(Boolean).join(' · ')}</p>
                <Bullets items={e.bullets} />
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}
