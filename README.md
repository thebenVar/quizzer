# quizzer

A reusable quiz app for the browser. The app (`index.html`, `script.js`, `style.css`, `app/`) is the same for every quiz; each quiz is a folder of content under `quizzes/`. The home page lists the quizzes and visitors pick one. Adding a quiz means adding a folder and one line in `quizzes/registry.json` — no code changes.

Included quizzes:

- `gethsemane` — Gethsemane Bible Quiz on Ephesians
- `sample` — a short six-question quiz, also a good starting point to copy
- `question-types-demo` — unlisted; two questions of each newer type (statements, spot, text), to try them

## Running it

The app loads its quiz files with `fetch()`, so it must be served over HTTP — opening `index.html` by double-clicking it will not work.

```sh
npx serve .
```

Then open:

- `http://localhost:3000/` — the home page, listing the quizzes
- `http://localhost:3000/?quiz=sample` — a quiz directly, by folder name
- `http://localhost:3000/?quiz=sample-ans` — that quiz's answer key (see [Answer key](#answer-key))

Run the tests (they also check every quiz folder):

```sh
npm install
npm test
```

## Adding a quiz

1. Copy `quizzes/sample/` to `quizzes/<your-quiz>/`. The folder name is the quiz's id in the URL; use letters, numbers, `-` and `_`.
2. Edit `meta.json` (title and settings) and `questions.json` (the questions).
3. Optionally add a logo image to the folder and name it in `meta.json`.
4. Add the folder name to `"quizzes"` in `quizzes/registry.json` so it appears on the home page.
5. Run `npm test`. If anything is wrong, the failure names the file, the question and the problem. It also fails if a quiz folder is missing from `registry.json`.
6. Open the home page and pick your quiz, or go straight to `?quiz=<your-quiz>`.

## `quizzes/registry.json`

The home page and its list of quizzes:

```json
{
  "title": "Bible Quizzes",
  "description": "Choose a quiz to begin.",
  "quizzes": ["gethsemane", "sample"],
  "unlisted": ["my-draft"]
}
```

- `quizzes` — folder names shown on the home page, in this order. Each card shows the quiz's logo, `title` and `description` from its `meta.json`.
- `unlisted` — optional. Quizzes kept off the home page (drafts, private quizzes); they still open with `?quiz=<id>` for anyone who has the link.
- `title`, `description` — optional; the home page heading (default "Quizzes") and the text under it.

## `questions.json`

A list of questions. Five types are supported: `mcq` and `matching` (below), and `statements`, `spot` and `text` (see [More question types](#more-question-types)).

```json
[
  {
    "id": 1,
    "type": "mcq",
    "prompt": "Who was the first king of Israel?",
    "options": ["David", "Solomon", "Samuel", "Saul"],
    "answer": "Saul",
    "points": 1,
    "explanation": "Saul was anointed by Samuel (1 Samuel 10:1)."
  },
  {
    "id": 2,
    "type": "matching",
    "prompt": "Match the person to their role:",
    "pairs": [["Moses", "Led Israel out of Egypt"], ["Paul", "Apostle to the Gentiles"]],
    "points": 2,
    "isBonus": true
  }
]
```

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Unique within the quiz |
| `type` | yes | `mcq`, `matching`, `statements`, `spot` or `text` |
| `prompt` | yes | The question text |
| `options` | mcq | At least two. "All the above" / "None of the above" stay last; other options are shuffled |
| `answer` | mcq | Must match one of the `options` exactly |
| `pairs` | matching | `[left, right]` pairs; the right-hand side is shuffled |
| `points` | no | Default 1 (`mcq`, `spot`, `text`). A matching question without `points` (or with 0) is worth one point per pair. Not allowed on `statements` (one point per statement) |
| `explanation` | no | Shown when the answer is wrong, and in the final review |
| `isBonus` | no | At most one bonus question; it is always asked last and does not count towards the score. Not allowed in test mode |
| `approach` | no | A tip on how to think the question through; shown on the answer key page |
| `skill` | if the quiz lists `skills` | Which skill the question measures (one of the `id`s in `meta.json` `skills`) |

Scores, including the results per skill, are counted in points: a question adds its points to its skill's total, so a `statements` question adds one point per statement.

Regular questions are asked in random order. A line break in a `prompt` (`
` in the JSON) is shown as a new line, which helps for quoted verses or lists.

### More question types

`quizzes/question-types-demo/` (unlisted: `?quiz=question-types-demo`) has two of each. All three work in quiz and test mode, are saved and resumed in a test, and appear in the review, the answer key page and the downloaded results file.

**`statements`** — a passage and statements to judge True / False / Can't tell:

```json
{
  "id": "s1", "type": "statements", "skill": "reading",
  "prompt": "Read the verse, then decide for each statement.",
  "passage": "Luke 2:7: “She gave birth to her firstborn son …”",
  "statements": [
    { "text": "An innkeeper turned them away.", "answer": "cannot-tell", "explanation": "No innkeeper is mentioned." },
    { "text": "There was no room for them in the inn.", "answer": "true" }
  ],
  "explanation": "optional, for the whole question", "approach": "optional"
}
```

- `passage` (optional) is shown in a quote box; `statements` needs at least two, each with `text` and `answer` (`"true"`, `"false"` or `"cannot-tell"`) and an optional `explanation`.
- One point per statement judged correctly (partial credit). `points` is not used and is rejected, so the worth is always the number of statements. The question counts as correct (for streaks and the correct/incorrect counts) only when every statement is right.
- Quiz mode: choose for every statement (Submit stays disabled until then, as for matching), then Submit; with immediate correction each wrong statement shows its right answer and explanation. Test mode: choose and change, then Next; the finish summary marks the question "partly answered" until every statement has a choice.

**`spot`** — tap the wrong word:

```json
{
  "id": "e1", "type": "spot", "skill": "detail",
  "prompt": "Tap the word in the draft that does not match the source.",
  "source": "And Jesus answered them, “Have faith in God.”",
  "text": "And Jesus answered them, “Have faith in Good.”",
  "answer": "Good", "points": 1
}
```

- `source` (optional) is shown above as the reference. Every word of `text` can be tapped; punctuation is shown but is not part of a word.
- `answer` is the word without punctuation and must appear exactly once in `text` (case-sensitive); otherwise `npm test` names the question and says how many times it was found. Words in any script work: vowel signs, virama and Hebrew points stay part of their word (`यीशु ने कहा।` has the words `यीशु`, `ने`, `कहा`), and text and answer are compared in Unicode NFC form.
- Editing a question (for example its `text`) discards progress saved part-way through a test, so a saved word cannot point at the wrong word.
- Quiz mode: a tap answers, like a multiple-choice option (with immediate correction, the right word is shown). Test mode: a tap selects (it can be changed), then Next. Keyboard: Tab to a word, Enter to choose it.

**`text`** — a typed answer:

```json
{
  "id": "t1", "type": "text", "skill": "reasoning",
  "prompt": "What comes next? 2, 6, 12, 20, 30, ___",
  "answer": "42", "accept": ["forty-two"], "points": 1
}
```

- The comparison ignores case, extra spaces and one trailing full stop, and treats composed and decomposed Unicode forms alike (NFC), so Indic answers typed with any keyboard match. A plain decimal number also matches the same number written differently (`42.0`, ` 42 `, `+42`); `42..` and exponents (`1e2`) do not. `accept` (optional) lists other accepted answers. `answer` and each `accept` item must be text (`"42"`, not `42`) and must not be empty.
- Enter while an input method is still composing a word (common for Indic scripts) does not submit.
- Quiz mode: type and Submit (or press Enter). Test mode: the typed text is saved as you type; Enter goes to the next question.

## `meta.json`

Only `title` is required; everything else has a default.

```json
{
  "title": "Sample Bible Quiz",
  "pageTitle": "Browser tab title (defaults to title)",
  "description": "Short text shown under the title on the start screen",
  "branding": { "logoSrc": "logo.png", "logoAlt": "Logo description" },
  "timing": { "timeLimitSeconds": 3600, "autoAdvanceDelayMs": 2000 },
  "uiText": {
    "startButtonLabel": "Start Quiz",
    "questionProgress": "Question {current} / {total}",
    "correctAnswerReveal": "The correct answer was: {answer}.",
    "bonusCorrectFeedback": "Bonus Correct! 🎉"
  },
  "scoring": {
    "resultBands": [
      { "minPercent": 100, "message": "Excellent work, {name}! Perfect score!" },
      { "minPercent": 70, "message": "Great job, {name}!" },
      { "minPercent": 50, "message": "Good effort, {name}!" },
      { "minPercent": 0, "message": "Keep practicing, {name}!" }
    ],
    "shareFileName": "quiz-score.png"
  },
  "gamification": {
    "streakRewards": { "2": "fas fa-candy-cane", "4": "fas fa-pencil-alt" },
    "bonusRewardClass": "fas fa-candy-cane",
    "achievementLabels": {
      "perfectScore": "Perfect Score! ✨",
      "highScore": "High Score! 👍",
      "noAchievements": "No special achievements or gifts this time."
    }
  }
}
```

- `mode` — `"quiz"` (default) or `"test"`. See [Test mode](#test-mode-assessments) below.
- `skills` — optional list of `{ "id", "label", "description" }`. When present, every question names its `skill`, and the results screen shows a score per skill in this order. The optional `description` introduces the skill on the answer key page.
- `collectResults` — default `false`. Set `true` to send each participant's name and answers to the facilitators when they finish (see [Results sent to facilitators](#results-sent-to-facilitators)). Such a quiz needs a name before it starts, in quiz mode too.
- `showAnswerReview` — default `true`. Set `false` to hide the review of answers at the end, and to leave the answers out of the downloaded results file (for example, to keep a test's questions from circulating).
- `uiText` holds every piece of text the quiz shows: start screen labels, progress and timer, answer feedback, results and review labels, and error alerts. The full list of keys and their default (English) wording is `DEFAULT_UI_TEXT` in [`app/validate.js`](app/validate.js). Words in `{braces}` such as `{current}`, `{total}`, `{answer}`, `{count}` and `{time}` are filled in by the app; keep them in your wording. A misspelled key fails `npm test`. Together with `scoring.resultBands` and `gamification.achievementLabels`, this is how you put a quiz in another language. This includes the test-mode buttons and summary (`testNextButtonLabel`, `finishHeading`, `submitTestLabel`, …), the resume panel (`resumeHeading`, `resumeDetails`, …), the keyboard tip (`keyboardHint`), the review (`reviewFilterWrong`, `reviewFilterAll`, …), the per-skill time (`skillScoreWithTime`), the newer question types (`statementTrue`, `statementFalse`, `statementCannotTell`, `statementsFeedback`, `spotSourceLabel`, `textAnswerPlaceholder`, …) and the results file (`downloadResultsLabel`, `resultsFile…`).
- `branding.logoSrc` is relative to the quiz folder (a full `https://` URL also works). Without it, no logo is shown.
- `timing.timeLimitSeconds` is the time for the whole quiz; `autoAdvanceDelayMs` is the pause before the next question.
- `{name}` in a result message is replaced with the player's name.
- `streakRewards` maps a streak of correct answers to a [Font Awesome 5](https://fontawesome.com/v5/search) icon class, awarded when the streak reaches that number. `bonusRewardClass` is the icon for getting the bonus question right.
- Any `uiText` or `achievementLabels` entry you leave out keeps its default.

## Test mode (assessments)

A quiz with `"mode": "test"` in `meta.json` is an assessment rather than a game:

- **Name required.** The Start button stays disabled until a name is typed.
- **Select, then Next.** Clicking an option only selects it (it can be changed). **Next** moves on and **Back** returns to the previous question; nothing moves on by itself. Matching questions use their dropdowns and Next. Each choice shows a quiet "Answer saved." — no right/wrong feedback, streaks, sounds, flashes, gifts or bonus question, and no choice of feedback mode.
- **Finish and submit.** On the last question Next reads **Finish** and opens a summary: how many questions are answered and a button for each unanswered one (it jumps to that question), with **Back to the test** and **Submit test**. Only Submit grades the test. When the time runs out, the test is submitted with whatever has been answered.
- **Results.** The score, time taken, the number not answered and, if the quiz lists `skills`, a score per skill with the time spent on that skill's questions (for example "4 / 5 · 3:20"). Time counts only while a question is on screen, adding up revisits.
- **Resume.** Progress is saved in the browser (localStorage) after every change: question order, current question, answers, name, per-question time and the deadline. Opening the test again shows **Resume your test** (with question N of M and the time left) or **Start over**. The deadline is a fixed time, so the clock keeps running while the page is closed; if it has passed, the test is submitted with the saved answers and the results are shown. The browser warns before leaving a test in progress. Saved progress is removed after submitting, and is discarded if the quiz's questions change. Without browser storage (some private windows) the test still works, it just cannot be resumed. Resume is for test mode only; a quiz (game mode) starts over when reopened.
- Combine with `"showAnswerReview": false` so the answers are not shown at the end, and list the test under `"unlisted"` in `registry.json` if it should be reached only by its link.
- This does not make a test secret: `questions.json`, answers included, is loaded by the browser and can be opened by anyone who knows where to look. Keeping answers private needs grading on a server.

`quizzes/cit-aptitude/` is an example: an aptitude test for consultants in training, with 40 questions over eight skills.

## Results sent to facilitators

A quiz with `"collectResults": true` in `meta.json` sends each participant's results to a small server on Vercel, and facilitators see them on a password-protected page. Today only `cit-aptitude` uses it.

**For participants.** The start screen says: "Your name and answers will be sent to the facilitators. Only they can see them." (`resultsCollectedNotice`). When the test is submitted (Submit test, or when the time runs out; in quiz mode, when the results show), the results screen shows "Sending your results…", then "✓ Your results were sent." If sending fails (no connection, server down), it says so, offers **Try again**, and keeps the results in the browser (localStorage); they are sent automatically the next time any page of the app is opened. The browser keeps at most 20 unsent results (the oldest are dropped), so on a shared computer used offline by many participants, have each one download their results file as well. The review, **Download my results** and **Share** work as before, so the file can still be sent by hand. The texts are `uiText` keys (`resultsSending`, `resultsSent`, `resultsSendFailed`, `resultsSendRejected`, `resultsRetryLabel`).

**How it works.**

- The browser sends `POST /api/submit` with an id it made itself (a UUID, so a retry is stored only once), the quiz id and the fingerprint of the version of the quiz it showed, the name, start time, time taken, the answers, the time per question and the option order shown.
- `api/submit.js` loads the quiz from the deployed `quizzes/` folder with the same checks as the app, refuses anything malformed (unknown fields or question ids, answers of the wrong shape, a quiz without `collectResults`, bodies over 100 KB) and **grades the answers itself** with the app's grading code (`app/grading.js`). A score sent by the browser is never used.
- It stores one row in a Postgres table `submissions` (created on first use). Control characters are removed from names and typed answers, and a start time from a clearly wrong clock (in the future, or more than 7 days before submitting) is stored as unknown.
- If the quiz was edited after the participant took it (results waiting in the outbox while a question changed), the submission is not refused: the answers that still fit the current quiz are graded, the others are left out, and the row is marked so the results page shows a warning.
- The browser drops a submission from its outbox once the server stores it, or when the server refuses it for good (a 4xx answer from `/api`; logged in the console). Network errors and 5xx answers are retried later.

**What is stored:** name (at most 80 characters), quiz id, a fingerprint of the quiz version taken and whether the quiz had changed since, start and submit time, time taken, score, the score and time per skill, and per question the answer given, whether it was right, the points and the seconds spent. **Not stored:** IP address, browser or device details, location, or anything else.

**Facilitators' page:** `/results.html` (not linked anywhere, not indexed). Sign in with the facilitator password (kept only for that browser tab). Pick a quiz and, optionally, dates; the table lists name, date, score, each skill and time taken, newest first. The list shows the newest 2000 results for the chosen dates; narrow the dates to see older ones. Click a row to load that person's answers, shown as cards as in the participant's own review. **Export CSV** downloads the rows shown (UTF-8 with BOM, so Excel shows names in Indian scripts correctly). **Delete** removes one submission after a confirmation.

**Retention and privacy.** Results are kept for 12 months and then deleted by hand from the results page (there is no automatic deletion). Participants are told before they start that their name and answers go to the facilitators and that only the facilitators can see them; keep the password to the facilitators. The answers themselves are still public (`questions.json` and the `-ans` page, see [Test mode](#test-mode-assessments)); keeping them secret is a separate step (P3).

### Setting it up on Vercel

1. In the Vercel project, open **Storage**, create a **Neon** (Postgres) database and connect it to the project. This sets `DATABASE_URL` (`POSTGRES_URL` is also accepted).
2. In **Settings → Environment Variables**, add `FACILITATOR_PASSWORD`. Make it **long and random** (for example 20 or more characters from a password manager's generator), since it is the only thing protecting everyone's names and answers; share it only with facilitators, and change it when someone leaves. Without it the results page refuses everyone. (For scripts: the results page sends it as `Authorization: Bearer <password>`, percent-encoded with `encodeURIComponent`.)
3. Add a rate limit, so the password cannot be guessed by trying many times: in the project, open **Firewall → Configure → New Rule**, name it "API rate limit", set **If** *Request Path* *starts with* `/api/`, **Then** *Rate Limit* (fixed window) of about **30 requests per 60 seconds per IP**, action *Deny* (429), and **Publish**. A participant sends one request per test, so this does not get in the way; a stricter second rule for `/api/results` (about 10 per minute) is also reasonable. A whole class behind one school or office IP submitting at once may need the `/api/submit` limit raised.
4. Redeploy. `vercel.json` bundles `quizzes/**` with the functions in `api/`; the static site works as before.
5. Open `/results.html` once and sign in, to check the password and the database connection (the page says what is wrong if either is missing).

The table is created on the first request that needs it. `npm install` brings in the database driver (`@neondatabase/serverless`).

### Testing locally

`npx serve .` still runs the whole app, but without `/api`: sending fails and the results wait in the browser's outbox (the results page says the service is not available). To test sending, use the Vercel CLI from the project folder:

```sh
npm i -g vercel
vercel link          # once, to connect the folder to the Vercel project
vercel env pull      # writes .env.local with DATABASE_URL and FACILITATOR_PASSWORD (git-ignored)
vercel dev
```

Then take the test at `http://localhost:3000/?quiz=cit-aptitude` and open `http://localhost:3000/results.html`. Note that `vercel dev` with the pulled `DATABASE_URL` writes to that real database; use a Neon branch for testing if you want to keep it clean. The tests (`npm test`) use an in-memory database and need no network.

## Keyboard

In both modes, keys **1–9** or **A–Z** choose that option of a multiple-choice question (in a test this selects it; in a quiz it answers, like a click). **Enter** goes to the next question (in a quiz, when the Next Question button shows). In a test, **←** and **→** are Back and Next. For `statements` and `spot` questions, **Tab** moves between the choices or words and **Enter** chooses one (in a test, Enter on an already chosen one goes Next). In a `text` question, **Enter** submits the answer (quiz) or goes Next (test). Other keys typed into a text field or dropdown are left alone. A small tip under the question says so (hidden on touch screens).

## Review and results file

- **Review my answers** (when `showAnswerReview` is true): the questions as cards in the answer key's style, with the participant's answer marked (green if right, red with ✗ if wrong), the correct answer, "Not answered" for skipped ones, and the question's Why and How to approach. Matching questions show the participant's pairs above the correct ones. A switch shows **Wrong only** (the default) or **All questions**.
- **Download my results** saves one self-contained `.html` file (`<quiz-id>-results-<name>-<YYYY-MM-DD>.html`): quiz title, name, date, time taken, score, the per-skill table (with times) and, when `showAnswerReview` is true, every question with the answer given, the correct answer, Why and How to approach. It has no external links, opens offline in any browser and prints cleanly.
- **Share my results** appears where the device can share files (most phones); it shares that same file.
- **Share Score** (quiz mode only) saves the score card as an image, as before.

## Answer key

Add `-ans` to any quiz's name to see its answer key: `?quiz=cit-aptitude-ans`. The page lists every question with all its options, the correct one marked, and the question's `explanation` ("Why") and `approach` ("How to approach"). When the quiz lists `skills`, questions are grouped by skill with jump links. It has a Print button and prints cleanly.

The page is not linked from anywhere and asks search engines not to index it, but it is not secret: anyone who adds `-ans` sees it. Because of this, no quiz folder may end in `-ans`.

## Project layout

```text
index.html, style.css, script.js   page, styles and quiz flow (shared by all quizzes)
app/loader.js                      finds and loads a quiz folder
app/validate.js                    content rules and defaults for meta.json / questions.json
app/runtime.js                     answer checking
app/answerKey.js                   the answer key page (?quiz=<id>-ans) and its question cards, also used by the review
app/progress.js                    saving and resuming a test in progress (localStorage, deadline, quiz fingerprint)
app/grading.js                     grading stored answers, score and time per skill (no DOM; also used by the server)
app/results.js                     the downloadable results file (re-exports grading.js)
app/submissions.js                 sending results to the facilitators, and the outbox in localStorage
app/resultsPage.js, results.html   the facilitators' results page
app/resultsCsv.js                  the CSV export of that page
api/submit.js, api/results.js      Vercel functions: receive and re-grade results; list and delete them
api/_lib/                          shared server code (database, request checks); not routes
vercel.json                        includes quizzes/** in the functions
app/utils.js                       scoring, timer, shuffle and keyboard helpers
quizzes/registry.json              the home page: which quizzes are listed, and in what order
quizzes/<id>/                      one folder per quiz
tests/                             Vitest tests, including a check of every quiz folder
```
