# quizzer

A reusable quiz app for the browser. The app (`index.html`, `script.js`, `style.css`, `app/`) is the same for every quiz; each quiz is a folder of content under `quizzes/`. Adding a quiz means adding a folder — no code changes.

Included quizzes:

- `gethsemane` — Gethsemane Bible Quiz on Ephesians (the default)
- `sample` — a short example quiz to copy when starting a new one

## Running it

The app loads its quiz files with `fetch()`, so it must be served over HTTP — opening `index.html` by double-clicking it will not work.

```sh
npx serve .
```

Then open:

- `http://localhost:3000/` — the default quiz (set in `quizzes/registry.json`)
- `http://localhost:3000/?quiz=sample` — any quiz, by folder name

Run the tests (they also check every quiz folder):

```sh
npm install
npm test
```

## Adding a quiz

1. Copy `quizzes/sample/` to `quizzes/<your-quiz>/`. The folder name is the quiz's id in the URL; use letters, numbers, `-` and `_`.
2. Edit `meta.json` (title and settings) and `questions.json` (the questions).
3. Optionally add a logo image to the folder and name it in `meta.json`.
4. Run `npm test`. If anything is wrong, the failure names the file, the question and the problem.
5. Open `?quiz=<your-quiz>`.

To make it the quiz that opens without `?quiz=`, set `"defaultQuiz"` in `quizzes/registry.json`.

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
| `isBonus` | no | At most one bonus question; it is always asked last and does not count towards the score |

Regular questions are asked in random order.

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
    "nameLabel": "Enter Your Name:",
    "namePlaceholder": "Your Name",
    "correctionModeLabel": "Feedback on incorrect answers:",
    "immediateCorrectionLabel": "Show correction immediately",
    "delayedCorrectionLabel": "Show only in final review",
    "startButtonLabel": "Start Quiz",
    "resultHeading": "Quiz Complete!",
    "reviewToggleClosed": "Review Incorrect Answers",
    "reviewToggleOpen": "Hide Review",
    "shareButtonLabel": "Share Score"
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

- `branding.logoSrc` is relative to the quiz folder (a full `https://` URL also works). Without it, no logo is shown.
- `timing.timeLimitSeconds` is the time for the whole quiz; `autoAdvanceDelayMs` is the pause before the next question.
- `{name}` in a result message is replaced with the player's name.
- `streakRewards` maps a streak of correct answers to a [Font Awesome 5](https://fontawesome.com/v5/search) icon class, awarded when the streak reaches that number. `bonusRewardClass` is the icon for getting the bonus question right.
- Any `uiText` or `achievementLabels` entry you leave out keeps its default.

## Project layout

```text
index.html, style.css, script.js   page, styles and quiz flow (shared by all quizzes)
app/loader.js                      finds and loads a quiz folder
app/validate.js                    content rules and defaults for meta.json / questions.json
app/runtime.js                     answer checking
app/utils.js                       scoring, timer and shuffle helpers
quizzes/registry.json              which quiz opens by default
quizzes/<id>/                      one folder per quiz
tests/                             Vitest tests, including a check of every quiz folder
```
