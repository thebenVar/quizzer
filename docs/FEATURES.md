# Features

Every feature identified for quizzer, with its status. Use it to plan what to build next. When a feature ships, move it to **Done** with its commit; when a new idea comes up, add it to **Backlog** with the date.

Statuses: **Done** · **In progress** · **Next** (agreed, scheduled) · **Backlog** (identified, not scheduled) · **Parked** (needs a server or a decision first).

## Done

| # | Feature | Notes | Commit |
|---|---|---|---|
| F01 | One folder per quiz | `quizzes/<id>/meta.json` + `questions.json`; open with `?quiz=<id>`; no code changes to add a quiz | 44507df |
| F02 | Content checks in `npm test` | Duplicate ids, MCQ answer must match an option, one bonus question at most, missing files, misspelled settings | 44507df |
| F03 | All on-screen text in `uiText` | Every label and message can be changed or translated per quiz | 8a39093 |
| F04 | Home page | Lists the quizzes in `registry.json`; `"unlisted"` keeps drafts off it; "All quizzes" link back | 8a39093 |
| F05 | Test mode | `"mode": "test"`: no right/wrong feedback while answering, no streaks or gifts | aaf321b |
| F06 | Skills and per-skill results | `skills` in meta.json, `skill` per question, score per skill on the results screen | aaf321b |
| F07 | Consultant Aptitude Test | 40 questions over 8 skills, blind-checked by a reviewer; listed on the home page | aaf321b, e2a1580 |
| F08 | Answer key page | `?quiz=<id>-ans`: every question, correct answer, "Why", "How to approach"; printable; not linked | d1171b7 |
| F09 | Answer sheet document | Shareable doc version of the aptitude test's answers and approaches: [Consultant Aptitude Test – Answer Sheet](https://claude.ai/artifact/ExVwVf32w1p3YJQkjyoRRM) | — |
| F10 | Review my answers | After the quiz: own answer vs correct, "Why", "How to approach"; Wrong only / All; letters follow the order the participant saw | 244f917 |
| F11 | Download and share results | A self-contained results file (name, date, score, skills, full review) that opens offline and prints to PDF; Share uses the phone's share sheet | 244f917 |
| F12 | Name required in test mode | So a saved results file always carries the participant's name | 244f917 |
| F13 | Save progress and resume | A refresh or closed tab no longer loses a test; the clock keeps running; warning before leaving mid-test | 244f917 |
| F14 | Select, then Next / Back | No more final-on-first-tap; a Finish screen lists unanswered and partly answered questions before "Submit test" | 244f917 |
| F15 | Keyboard shortcuts | 1–4 / A–D to choose, Enter for Next, ← → in test mode | 244f917 |
| F16 | Time per skill | Results show e.g. "Deduction 4/5 · 9:10" — careful vs. hasty | 244f917 |
| F17 | Question type: passage + True / False / Can't tell | `"statements"`: one passage, several statements, one point each | 5057a6f |
| F18 | Question type: tap the error | `"spot"`: tap the word in a draft that differs from the source; handles Indian scripts and Hebrew vowel marks | 5057a6f |
| F19 | Question type: typed answer | `"text"`: no options to guess from; loose matching (case, spaces, numbers), `accept` list; works with transliteration keyboards | 5057a6f |
| F20 | New aptitude questions with these types | 8 new items (11 points) replace 11 single-point questions; still 40 points, 5 per skill; blind-checked | 5057a6f |

## In progress

Nothing at the moment.

## Backlog

| # | Feature | Identified | Notes |
|---|---|---|---|
| F21 | Question type: put in order | 2026-11-25 | ↑/↓ buttons rather than dragging (phones); sequencing and logic |
| F22 | Question type: select all that apply | 2026-11-25 | E.g. "which back-translations keep the meaning?" |
| F23 | Picture puzzles | 2026-11-25 | Shapes and grids; tests pattern recognition without relying on English; needs drawn images |
| F24 | Question pool with a random draw | 2026-11-25 | Each participant gets a different selection per skill; reduces answer sharing; allows retakes |
| F25 | Keep chosen options in place | 2026-11-25 | Today only options spelled "All the above" / "None of the above" in English stay last; a per-question setting would work in any language |
| F26 | Vary the "text vs. assumption" questions | 2026-11-25 | All five share one format (spot the folk detail); rework some as "which conclusion is supported?" |
| F27 | Check verse quotes against the ESV | 2026-11-25 | Proverbs 10:1, John 1:1, Mark 1:35, Ruth 1:16, James 1:23, Mark 1:30–31 and Mark 11:22 are unverified |
| F28 | Pilot the aptitude test | 2026-11-25 | With consultants whose skills are known; drop questions nearly everyone gets right or wrong |
| F29 | Translate the aptitude test | 2026-11-25 | `uiText`, result messages and questions can all be translated per quiz |
| F30 | Clean URLs | 2026-05-24 | `/quiz/<id>` instead of `?quiz=<id>`, via a `vercel.json` rewrite |
| F31 | Work offline | 2026-05-24 | Tone.js, html2canvas and Font Awesome come from CDNs; bundle them locally |
| F32 | Quizzes in Indian languages | 2026-11-25 | The verifier found Indic text broke "tap the error" (fixed). A full quiz in Hindi or another Indian language should be tried end to end: fonts, typed answers, results file |
| F33 | Tap the error with several errors | 2026-11-25 | Today one wrong word per question; allow several, or a phrase |
| F34 | Screen reader and touch testing | 2026-11-25 | Verifiers could only emulate a phone and could not test with a screen reader; try on real devices |
| F35 | Devanagari and other digits in typed answers | 2026-11-25 | "४२" does not yet match "42" |
| F36 | Update the answer sheet document | 2026-11-25 | The doc (F09) still describes the 11 questions replaced in F20; the `-ans` page is current |
| F37 | Skill links count points | 2026-11-25 | On the answer key page the skill links show the number of questions (e.g. 3), though each skill is worth 5 points |

## Server features

The site now has a backend: Vercel functions in `api/` and a Neon Postgres database (set up 2026-11-25). See the README section "Results sent to facilitators".

| # | Feature | Status | Notes |
|---|---|---|---|
| P2 | Results sent to the facilitator | **Done** (502f790, live f7a2951) | Quizzes opt in with `"collectResults": true` (only the aptitude test). Server re-grades, stores one row per submission; `results.html` with a shared password: table, per-person review, CSV, delete. Kept 12 months, deleted by hand |
| P4 | Question statistics | Backlog — now cheap | Which questions everyone gets right or wrong, from the stored results; about half a day |
| P5 | Cohort access codes | Backlog — now cheap | Stops duplicate or made-up names; tells cohorts apart; about half a day |
| P6 | Rate limit on `/api/*` | To do (Vercel dashboard) | Firewall rule, about 30 requests per minute per IP; protects the database and the facilitator password |
| P7 | Facilitator accounts | Backlog | Today one shared password; real sign-in (e.g. Google) if more facilitators need access |
| P8 | Automatic deletion after 12 months | Backlog | Today deleted by hand on the results page |
| P1 | Leaderboard | Parked | Dropped for now. If revived: public with nicknames for fun quizzes, never for the aptitude test |
| P3 | Answers kept secret | Parked | `questions.json` and the `-ans` page are public (the repo is public too). Needs grading on the server only, the answer keys out of the public repo, and a login for `-ans`. Consider the planned LMS (e.g. Moodle) before building this |
