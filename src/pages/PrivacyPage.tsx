import { Link } from 'react-router'
import { usePageTitle } from '../lib/usePageTitle'
import { PageHeading, SectionTitle } from '../components/ui'

export const PRIVACY_EMAIL = 'civileng.portfolio@gmail.com'

export function PrivacyPage() {
  usePageTitle('Privacy Policy')
  return (
    <div className="container-page max-w-3xl py-10">
      <PageHeading eyebrow="Privacy Policy" title="How we handle" accent="your information." />

      <div className="space-y-8 leading-relaxed">
        <section aria-labelledby="collect">
          <SectionTitle id="collect">Information we collect</SectionTitle>
          <p>When you use CivilEng Portfolio, we process the information you provide to create your portfolio:</p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 marker:text-accent">
            <li>résumés you upload or paste, profile links you give us (such as LinkedIn), and the details in them, such as your name, contact details, experience, education and skills;</li>
            <li>your account details if you sign in, and the portfolio content you save;</li>
            <li>basic technical information, such as a hashed network identifier used to protect the service from abuse.</li>
          </ul>
        </section>

        <section aria-labelledby="use">
          <SectionTitle id="use">How we use it</SectionTitle>
          <p>
            To build and show your portfolio, to keep service and audit records, to provide support, to prevent misuse, and to
            improve how résumés are read.
          </p>
        </section>

        <section aria-labelledby="visible">
          <SectionTitle id="visible">What is public</SectionTitle>
          <p>
            Only what you choose to publish in the editor appears on your portfolio. Your phone number is never shown unless you
            add it yourself. Everything else stays private and is not shared with other users or sold to anyone.
          </p>
        </section>

        <section aria-labelledby="retention">
          <SectionTitle id="retention">How long we keep it</SectionTitle>
          <p>
            We keep uploaded résumés and related records for as long as needed for the purposes above, including after a portfolio
            or account is deleted, unless you ask us to delete them.
          </p>
        </section>

        <section aria-labelledby="rights">
          <SectionTitle id="rights">Your rights</SectionTitle>
          <p>
            You can ask to see, correct or delete the information we hold about you. Email us at{' '}
            <a href={`mailto:${PRIVACY_EMAIL}?subject=${encodeURIComponent('Privacy request')}`} className="link font-semibold">{PRIVACY_EMAIL}</a>{' '}
            and we will reply.
          </p>
        </section>

        <p>
          <Link to="/create" className="btn-primary">Create your portfolio</Link>
        </p>
      </div>
    </div>
  )
}
