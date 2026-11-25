# quizzer

A reusable quiz app for the browser. The app (`index.html`, `script.js`, `style.css`, `app/`) is the same for every quiz; each quiz is a folder of content under `quizzes/`. The home page lists the quizzes and visitors pick one. Adding a quiz means adding a folder and one line in `quizzes/registry.json` — no code changes.

Included quizzes:

- `gethsemane` — Gethsemane Bible Quiz on Ephesians
- `sample` — a short six-question quiz, also a good starting point to copy

## Running it

The app loads its quiz files with `fetch()`, so it must be served over HTTP — opening `index.html` by double-clicking it will not work.

```sh
npx serve .
```

Then open:

- `http://localhost:3000/` — the home page, listing the quizzes
- `http://localhost:3000/?quiz=sample` — a quiz directly, by folder name

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

A list of questions. Two types are supported:

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
| `type` | yes | `mcq` or `matching` |
| `prompt` | yes | The question text |
| `options` | mcq | At least two. "All the above" / "None of the above" stay last; other options are shuffled |
| `answer` | mcq | Must match one of the `options` exactly |
| `pairs` | matching | `[left, right]` pairs; the right-hand side is shuffled |
| `points` | no | Default 0. A matching question with 0 points is worth one point per pair |
| `explanation` | no | Shown when the answer is wrong, and in the final review |
| `isBonus` | no | At most one bonus question; it is always asked last and does not count towards the score. Not allowed in test mode |
| `skill` | if the quiz lists `skills` | Which skill the question measures (one of the `id`s in `meta.json` `skills`) |

Regular questions are asked in random order. A line break in a `prompt` (`
` in the JSON) is shown as a new line, which helps for quoted verses or lists.

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
- `skills` — optional list of `{ "id", "label" }`. When present, every question names its `skill`, and the results screen shows a score per skill in this order.
- `showAnswerReview` — default `true`. Set `false` to hide the review of wrong answers at the end (for example, to keep a test's questions from circulating).
- `uiText` holds every piece of text the quiz shows: start screen labels, progress and timer, answer feedback, results and review labels, and error alerts. The full list of keys and their default (English) wording is `DEFAULT_UI_TEXT` in [`app/validate.js`](app/validate.js). Words in `{braces}` such as `{current}`, `{total}`, `{answer}`, `{count}` and `{time}` are filled in by the app; keep them in your wording. A misspelled key fails `npm test`. Together with `scoring.resultBands` and `gamification.achievementLabels`, this is how you put a quiz in another language.
- `branding.logoSrc` is relative to the quiz folder (a full `https://` URL also works). Without it, no logo is shown.
- `timing.timeLimitSeconds` is the time for the whole quiz; `autoAdvanceDelayMs` is the pause before the next question.
- `{name}` in a result message is replaced with the player's name.
- `streakRewards` maps a streak of correct answers to a [Font Awesome 5](https://fontawesome.com/v5/search) icon class, awarded when the streak reaches that number. `bonusRewardClass` is the icon for getting the bonus question right.
- Any `uiText` or `achievementLabels` entry you leave out keeps its default.

## Test mode (assessments)

A quiz with `"mode": "test"` in `meta.json` is an assessment rather than a game:

- No feedback while answering: each answer just shows "Answer saved." and the test moves on. There are no right/wrong counts, streaks, sounds, flashes, gifts or bonus question, and no choice of feedback mode.
- At the end: the score, time taken and, if the quiz lists `skills`, a score per skill.
- Combine with `"showAnswerReview": false` so the answers are not shown at the end, and list the test under `"unlisted"` in `registry.json` if it should be reached only by its link.
- This does not make a test secret: `questions.json`, answers included, is loaded by the browser and can be opened by anyone who knows where to look. Keeping answers private needs grading on a server.

`quizzes/cit-aptitude/` is an example: an aptitude test for consultants in training, with 40 questions over eight skills.

## Project layout

```text
index.html, style.css, script.js   page, styles and quiz flow (shared by all quizzes)
app/loader.js                      finds and loads a quiz folder
app/validate.js                    content rules and defaults for meta.json / questions.json
app/runtime.js                     answer checking
app/utils.js                       scoring, timer and shuffle helpers
quizzes/registry.json              the home page: which quizzes are listed, and in what order
quizzes/<id>/                      one folder per quiz
tests/                             Vitest tests, including a check of every quiz folder
```
