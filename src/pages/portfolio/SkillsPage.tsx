import { usePortfolio } from '../../app/PortfolioLayout'
import { usePageTitle } from '../../lib/usePageTitle'
import { Chips, PageHeading, SectionTitle } from '../../components/ui'

export function SkillsPage() {
  const { cv } = usePortfolio()
  usePageTitle('Skills', cv.name)

  return (
    <div className="container-page max-w-4xl py-10">
      <PageHeading eyebrow="Toolkit" title="Skills &" accent="certifications." />

      <section aria-labelledby="skills" className="grid gap-4 sm:grid-cols-2">
        <h2 id="skills" className="sr-only">Skills</h2>
        {cv.skills.map((s) => (
          <div key={s.group} className="panel p-5">
            <h3 className="label">{s.group}</h3>
            <Chips items={s.items} label={s.group} />
          </div>
        ))}
      </section>

      {cv.certifications.length > 0 && (
        <section className="mt-12" aria-labelledby="certs">
          <SectionTitle id="certs">Certifications</SectionTitle>
          <ul className="panel divide-y divide-line">
            {cv.certifications.map((c) => (
              <li key={`${c.name}-${c.issuer}`} className="flex flex-col gap-0.5 px-5 py-3 sm:flex-row sm:items-baseline sm:justify-between">
                <span>
                  <span className="font-medium">{c.name}</span>
                  {c.issuer && <span className="text-muted"> · {c.issuer}</span>}
                </span>
                {c.date && <span className="shrink-0 text-sm text-muted">{c.date}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {cv.interests.length > 0 && (
        <section className="mt-12" aria-labelledby="interests">
          <SectionTitle id="interests">Professional <em className="text-brand-italic">interests</em></SectionTitle>
          <Chips items={cv.interests} label="Professional interests" />
        </section>
      )}
    </div>
  )
}
