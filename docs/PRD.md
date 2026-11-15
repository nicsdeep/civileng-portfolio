# PRD: CivilEng Portfolio

Product requirements. Read this before any change (see `AGENTS.md`), and update it when
behaviour changes.

## 1. Purpose

Turn the résumé someone already has into a portfolio website they can share as one link, in
under a minute, without learning anything.

**The user's real goal (first principles):** *"Give me a link that makes me look good to
employers."* Every screen, field and word is judged against that. If removing it does not hurt
that goal, remove it.

**Users:** students, graduates and professionals (CivilEng audience: engineers first, but anyone
with a résumé). Mostly on phones, often short on time and data.

**Owner/operator:** the CivilEng team. They need a record of every upload for system records
and later audit (§ 7).

## 2. The journey (the only main path)

```
Home ──► Create ──► (Sign up, once) ──► LIVE PORTFOLIO ◄──► Edit
                                            ▲
Returning owner ── opens site or link ──────┘
```

1. **Home (`/`)** explains the product in one line and has one main action: *Upload your résumé*.
   An example portfolio is one tap away. Signed-in owners never see Home; they go straight to
   their portfolio.
2. **Create (`/create`)**: upload a PDF or Word file, or paste text, and/or paste a **LinkedIn
   profile link** (one field under the upload card). With a résumé, the link fills only what
   the résumé lacks (§ 3a). Alone, **Build from LinkedIn only** makes a starter portfolio from
   the public profile; a tip says LinkedIn's *More → Save to PDF* gives the full profile. "Start from scratch" is a
   small secondary link. There are no checkboxes and no review screen. A spinner says what is
   happening ("Reading…", "Building your portfolio…").
3. **Account, only if needed.** Not signed in: the résumé waits in the browser, and the person
   creates a free account on one screen ("One last step"). Already signed in: this step is
   skipped.
4. **Live portfolio (`/p/<address>`)** opens straight away with a success banner: *"✓ Your
   portfolio is live!"* plus the address, a **Share link** button (native share sheet or copy)
   and close. The address comes from the name (`jane-doe`, or `jane-doe-2` if taken).
5. **Owner bar.** Whenever the owner views their own portfolio, a small bar reads *"This is your
   portfolio. Want to update it?"* with **Edit details**, **Upload new résumé** and **Share**.
   Share is hidden while the success banner is showing, so the same button never appears twice.
6. **Edit (`/editor`)**: tabs for Profile, Experience, Education, Projects, Skills,
   Certifications and Recommendations. **Save** goes straight back to the portfolio with
   *"✓ Changes saved."* `?tab=projects` opens a tab directly.
7. **Upload new résumé** (an owner using Create) updates the same portfolio in one go. It keeps
   the address, photo, logos, project pictures, links and credential links they added, and
   offers **Undo** in the success banner.

### Navigation rules
- Every page has a Back link (`BackLink`), the header, or a clear next button. Not-found and
  error pages offer *Home* or *Try again*.
- **Phones (under 768 px)** get a fixed bottom tab bar instead of a menu: signed out Home ·
  Example · Create · Sign in; signed in My portfolio · Edit · Upload · Account. Shared
  portfolios have their own tabs: About · Experience · Projects · Skills · Contact (only the
  sections that have content).
- **Shared portfolios (`/p/<address>`, `/example`) stand alone.** No platform header, footer,
  logo, menu or name. The visitor sees only the person: their initials/photo and name at the
  top, their sections, and a footer with their name and email. The browser tab shows
  "Section · Name" and the person's initials as the icon. Link previews (WhatsApp, LinkedIn,
  Slack…) show the person's name, headline, summary and photo, via `api/portfolio-page.ts`
  (§ 3b). The owner bar and success banners appear only to the signed-in owner.
- Header, signed out: Example · Sign in · **Create portfolio**. Signed in: My portfolio (`/me`) ·
  Account.
- `/me` always leads to your own portfolio, or to Create if you have none.
- `/finish` publishes a résumé waiting in the browser after sign-in or email confirmation.

### Success and error states
- Publish: "Your portfolio is live!" Update: "Your portfolio is updated." (with Undo). Save:
  "Changes saved."
- Errors say what to do next ("Check your connection and try again", "Paste the full text…").
  Upload limits explain themselves ("Too many uploads from this network. Please try again in an
  hour.").
- Destructive actions (Delete portfolio, remove an item, remove a résumé) ask once inline.
  Reversible ones (Clear all fields) use Undo instead.

## 3. Paste a link: the system understands it

Anywhere a picture or link is needed, people paste a link and see the result at once, before
saving.

| Field | Paste… | We fill in |
|---|---|---|
| Profile **Photo** | a photo link, or a GitHub/LinkedIn/profile page | the profile picture |
| Experience **Company logo** | the company website or a logo link | the site's logo/icon, or a logo service if the site can't be read |
| Education **School logo** | the university website or a logo link | the same as above |
| Project **Picture** | the project page or an image link | its preview picture, or a screenshot |
| Projects tab: **Add a project from a link** | a live site or GitHub repo | title, description (from the page's about text), picture, live/source link. Shown as a preview card: **Add this project** or **Cancel** |
| Any **link row** | an address | the label fills itself ("GitHub", "LinkedIn", or the site name) |
| Certification **Credential link** | the verification page | shown as a link on the certificate |

- On public pages, the project picture shows on top of the card. The **first project link is
  shown in full under the project** (🔗 `my-app.vercel.app`) so it can be clicked.
- How it works: `api/preview.ts` (a Vercel function) reads the page's Open Graph data, title,
  description, icon, first paragraph and first large picture. Fallbacks are the Google favicon
  service for logos and WordPress mShots for screenshots.
- Safety: only public http(s) addresses. Private and internal networks are refused, including
  after redirects. Timeouts and size limits apply. See `docs/QAP.md` § Security.

### 3a. LinkedIn profile link, and résumé + link together
- LinkedIn does not let other sites read full profiles. The public preview gives name, headline,
  current company, school, location, a short summary and the photo. `src/features/import/
  linkedin.ts` turns that into a portfolio (`cvFromLinkedIn`).
- **No contradictions: the résumé wins.** `mergeProfiles(resume, linkedIn)` keeps everything
  from the résumé and only fills gaps: name, photo, headline, location, summary when missing,
  companies and schools not already listed, and the LinkedIn link (added first).
- If the link cannot be read, the résumé still builds the portfolio and a note says so.
- A LinkedIn "Save to PDF" file is read like any résumé (Top Skills, Honors-Awards,
  "Page x of y", Company/Role/date layout).
- A pasted link is recorded in the upload history with source `link` (§ 7).

### 3b. What visitors never see
- Developer things: links labelled or pointing at an API, endpoint, Swagger, GraphQL, OpenAPI or
  webhook are dropped when reading a résumé and hidden on public pages (`isTechnicalLink`).
- Project cards are compact: two per row from 640 px, smaller titles, readable 14 px text,
  long descriptions folded behind **Read more** (full text when printing).

## 4. Reading résumés (no AI)

`src/features/import`: PDF (pdf.js, with layout: left-column headings, wrapped and side-by-side
bullets), Word .docx (document XML) and plain text are read by rules in the browser. Sections are
found by common heading names. The phone number is found for the private record but never put on
the public page (people can add a public phone in the editor).

## 5. Data

- `pf_profiles`: one row per user holding the whole portfolio as JSON (`src/content/types.ts`),
  with `slug` (unique, 3–40 characters `a-z0-9-`) and `published`. RLS: owners can do everything
  to their own row; visitors can read only the public columns of published rows.
- `pf_resume_uploads` and the `pf-resumes` Storage bucket: the private upload history (§ 7).
  `source` is `file`, `paste` or `link` (a pasted profile link; no file).
- Portfolio fields include `photo`, `experience[].logo`, `education[].logo`, `projects[].image`
  and `certifications[].url`. These are image and page links, cleaned by `normalizeCv` (only
  https images, only http(s)/mailto links).

## 6. Design

Keep the CivilEng look: Instrument Serif headings with an italic teal word, Inter text, navy
`#072c58` and teal `#039694`, orange `#ff4f0a` primary buttons, rounded panels, light and dark
themes. Favicon: "E" for Edmund with an arch bridge. No restyling without a request.

## 7. Records and privacy

Every upload (with or without an account) is stored privately for system records and audit: the
contact details (including phone), the parsed content, the text and the original file. Users
cannot read the history. The owner reads it in the Supabase dashboard. Records stay after a
portfolio or account is deleted.

The UI shows one standard line, *"By uploading, you agree to our Privacy Policy."*, beside each
upload button. `/privacy` describes collection, use, retention and rights truthfully, with the
contact civileng.portfolio@gmail.com. Do not remove the notice or make the policy say anything
the code does not do.

## 8. Out of scope (for now)

AI writing or parsing, a custom domain per user, an admin web page for the upload history,
storing copies of linked images (they are shown from their original sites).
