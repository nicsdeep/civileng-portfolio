import { Link } from 'react-router'
import { usePageTitle } from '../lib/usePageTitle'
import { PageHeading, SectionTitle } from '../components/ui'

export function PrivacyPage() {
  usePageTitle('Privacy')
  return (
    <div className="container-page max-w-3xl py-10">
      <PageHeading eyebrow="Privacy" title="Your résumé and" accent="your data." />

      <div className="space-y-8 leading-relaxed">
        <section aria-labelledby="kept">
          <SectionTitle id="kept">What we keep</SectionTitle>
          <p>When you upload or paste a résumé, after you agree to it, CivilEng Portfolio keeps a record of that upload:</p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 marker:text-accent">
            <li>the original file (PDF, Word or text), if you uploaded one;</li>
            <li>the text read from it, and the details found in it, such as your name, email address, phone number, location, experience, education, skills and certifications;</li>
            <li>when it was uploaded, and your account if you are signed in or sign in afterwards on the same device;</li>
            <li>a scrambled (hashed) form of your network address, used only to stop abuse. Your actual address is not stored.</li>
          </ul>
        </section>

        <section aria-labelledby="who">
          <SectionTitle id="who">Who can see it</SectionTitle>
          <p>
            These records are private. They are not shown on any portfolio and cannot be read by other visitors or other users.
            Only the people who run CivilEng Portfolio can see them. Your public portfolio shows only what you choose to publish
            in the editor, and never your phone number unless you add it yourself.
          </p>
        </section>

        <section aria-labelledby="why">
          <SectionTitle id="why">Why</SectionTitle>
          <p>To build your portfolio, to keep a history of uploads, to help you if something goes wrong, and to improve how résumés are read.</p>
        </section>

        <section aria-labelledby="how-long">
          <SectionTitle id="how-long">How long</SectionTitle>
          <p>
            Upload records are kept even if you delete your portfolio or your account. “Remove résumé” on this site removes it from
            your browser only. You can ask for your records to be deleted at any time, and we will do so.
          </p>
        </section>

        <section aria-labelledby="rights">
          <SectionTitle id="rights">Your rights</SectionTitle>
          <p>
            You can ask to see, correct or delete the records we hold about you. Contact the CivilEng Portfolio team with the email
            address on your résumé and we will reply.
          </p>
        </section>

        <p>
          <Link to="/create" className="btn-primary">Back to create your portfolio</Link>
        </p>
      </div>
    </div>
  )
}
