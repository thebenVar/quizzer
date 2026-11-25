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

## In progress

Agreed 2026-11-25. Test-flow work, built first because the new question types depend on it.

| # | Feature | Notes |
|---|---|---|
| F10 | Review my answers | After the quiz: own answer vs correct, "Why", "How to approach"; Wrong only / All toggle. Turns `showAnswerReview` on for the aptitude test |
| F11 | Download and share results | A self-contained results file (name, date, score, skills, full review) that opens offline and prints to PDF; Share uses the phone's share sheet |
| F12 | Name required in test mode | So a saved results file always carries the participant's name |
| F13 | Save progress and resume | A refresh or closed tab no longer loses a test; the clock keeps running; warning before leaving mid-test |
| F14 | Select, then Next / Back | No more final-on-first-tap; a Finish screen lists unanswered questions before "Submit test" |
| F15 | Keyboard shortcuts | 1–4 / A–D to choose, Enter for Next, ← → in test mode |
| F16 | Time per skill | Results show e.g. "Deduction 4/5 · 9:10" — careful vs. hasty |

## Next

| # | Feature | Notes |
|---|---|---|
| F17 | Question type: passage + True / False / Can't tell | One passage, several statements; the classic critical-thinking format; strengthens "text vs. assumption" |
| F18 | Question type: tap the error | Tap the word in a draft that differs from the source; the consultant's checking job |
| F19 | Question type: typed answer | No options to guess from; for series and counting |
| F20 | About 10 new aptitude questions | Using F17–F19, replacing the weakest of the current 40 |

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

## Parked

Each needs a server (or a hosting decision) first.

| # | Feature | Identified | Notes |
|---|---|---|---|
| P1 | Leaderboard | 2026-11-25 | Dropped for now. If revived: public with nicknames for fun quizzes, never for the aptitude test |
| P2 | Results sent to the facilitator | 2026-11-25 | Simplest: Google Sheet + Apps Script. Until then participants can send their downloaded results file (F11) |
| P3 | Answers kept secret | 2026-11-25 | Today `questions.json` and the `-ans` page are public (the repo is public too). Needs grading on a server, and a private repo or a separate private content repo |
| P4 | Question statistics | 2026-11-25 | Which questions everyone gets right or wrong, from pilot results; needs P2 |
| P5 | Cohort access codes | 2026-11-25 | Stops duplicate or made-up names; needs P2 |
