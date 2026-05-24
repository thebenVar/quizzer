# Generic Quiz Content Separation Implementation Plan

> **For agentic workers:** REQUIRED: Use the `subagent-driven-development` agent (recommended) or `executing-plans` agent to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the quiz app so the shared app shell and runtime are independent from any specific quiz, while quiz questions and quiz-wide metadata/config live in separate content files.

**Architecture:** Keep the app as plain static HTML/CSS/JS on Vercel. Move runtime code into an `app/` area, move each quiz into its own `quizzes/<quiz-id>/` folder with separate `meta.json` and `questions.json`, and use a tiny boot layer that fetches one quiz package and passes a single normalized `{ meta, questions }` object into the runtime. Since Vercel is the deployment target, prefer `fetch()` plus JSON over global script-loaded data.

**Tech Stack:** Vanilla HTML, CSS, and JavaScript on Vercel; static JSON content files; existing CDN dependencies for Tone.js and html2canvas; no framework or bundler required.

---

## Recommended Target Architecture

Separate the repo into three explicit layers:

1. **App shell / runtime**
   - Owns DOM structure, state, question flow, timer, scoring, review rendering, sharing, and generic achievement handling.
   - Knows nothing about “Gethsemane”, “Ephesians”, or any specific reward names beyond generic config values.

2. **Quiz metadata / config**
   - Owns quiz title, page title, logo path, timer length, labels, result messaging thresholds, streak reward mapping, share image filename, and any quiz-wide feature flags.
   - Contains no per-question content.

3. **Quiz questions data**
   - Owns the question bank only.
   - Contains per-question prompts, answer choices, answers, points, justification/explanation, and question-type-specific payloads.

The runtime boundary should be a single boot contract:
- Loader chooses a quiz.
- Loader fetches `meta.json` and `questions.json` for that quiz.
- Loader validates both are present.
- Loader calls the app runtime with `{ meta, questions }`.

## Proposed File / Folder Structure

```text
/
  index.html                    # generic shell entry
  style.css                     # shared styling
  README.md
  logo.png                      # optional default/fallback asset
  app/
    boot.js                     # chooses quiz, validates content, starts app
    loader.js                   # fetches registry and quiz content
    runtime.js                  # state machine, timer, scoring, flow control
    ui.js                       # DOM lookup and render/update helpers
    questionTypes.js            # MCQ and matching render/grade helpers
    utils.js                    # shuffle, time formatting, small helpers
    defaults.js                 # default labels/settings when meta omits values
    validate.js                 # schema checks for metadata and questions
  quizzes/
    registry.json               # default quiz id and available quiz ids
    gethsemane/
      meta.json
      questions.json
      assets/
        logo.png                # optional quiz-specific asset
    sample/
      meta.json
      questions.json
  vercel.json                   # optional only if you want clean-path rewrites later
  docs/
    content-model.md            # optional short reference for content authors
  .local/
    superpowers/
      plans/
        2026-05-24-generic-quiz-content-separation.md
```

On Vercel, keep `index.html` as the only shell and switch quizzes via a query-string selector such as `index.html?quiz=gethsemane`. If you later want cleaner URLs like `/quiz/gethsemane`, add a small `vercel.json` rewrite after the core refactor lands rather than introducing routing complexity first.

## Suggested Data Contracts

### Metadata Contract

`meta.json` should define one plain object for quiz-wide configuration.

```json
{
  "id": "gethsemane",
  "title": "Gethsemane Bible Quiz",
  "pageTitle": "Gethsemane Bible Quiz",
  "description": "Optional intro copy shown on the start screen.",
  "branding": {
    "logoSrc": "quizzes/gethsemane/assets/logo.png",
    "logoAlt": "Gethsemane Logo"
  },
  "timing": {
    "timeLimitSeconds": 3600,
    "autoAdvanceDelayMs": 2000
  },
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
    "shareFileName": "gethsemane-quiz-score.png"
  },
  "gamification": {
    "streakRewards": {
      "2": "fas fa-candy-cane",
      "4": "fas fa-pencil-alt",
      "6": "fas fa-book"
    },
    "bonusRewardClass": "fas fa-candy-cane",
    "achievementLabels": {
      "perfectScore": "Perfect Score! ✨",
      "highScore": "Bible Whiz! 👍"
    }
  }
}
```

Rule of thumb: if a value applies to the whole quiz or changes visible copy/behavior across multiple questions, it belongs in metadata.

### Questions Contract

`questions.json` should define one array of question objects only.

```json
[
  {
    "id": 1,
    "type": "mcq",
    "prompt": "What are the words of blessing used by Paul to greet the Ephesians Church?",
    "options": ["Grace and Love", "Love and Peace", "Grace and Faith", "Grace and Peace"],
    "answer": "Grace and Peace",
    "points": 1,
    "explanation": "Ephesians 1:2 - 'Grace and peace to you from God our Father and the Lord Jesus Christ.'",
    "isBonus": false
  },
  {
    "id": 306,
    "type": "matching",
    "prompt": "Match the biblical figure to their primary role or description:",
    "pairs": [
      ["Abraham", "Father of a multitude"],
      ["Moses", "Led Israelites out of Egypt"]
    ],
    "points": 0,
    "explanation": "These are well-known roles/descriptions for these key biblical figures.",
    "isBonus": true
  }
]
```

Rule of thumb: if a value is needed to render or grade exactly one question, it belongs in the questions file.

Recommended normalization decisions:
- Use lowercase `type` values such as `mcq` and `matching`.
- Rename `question` to `prompt` and `justification` to `explanation` for clearer semantics.
- Keep `isBonus` on the question object, because bonus status is question-specific.
- Do not keep quiz-wide streak thresholds or reward classes in `questions.json`.

## Phased Implementation Plan

## Concrete TDD Implementation Sequence

Use this when moving from planning into implementation. The rule is simple: add the smallest failing test for the next boundary, make the smallest code change to pass it, then run the narrowest relevant validation before moving on.

### Recommended Test Stack

- Unit, DOM-slice, and loader tests: **Vitest with jsdom** (single tool)
- Browser smoke tests: **Playwright** (deferred — add only after loader integration needs real-browser validation or Tone.js/html2canvas interactions require it)
- Local hosted test environment: `vercel dev` or any simple static server (only needed for manual checks or future Playwright tests)

This stack fits the current app because:
- The runtime is plain browser JavaScript; most logic can be isolated into pure modules tested by Vitest.
- DOM rendering tests use Vitest's built-in jsdom environment.
- Loader/fetch tests mock `fetch` with `vi.fn()` — no real server needed.
- One test command (`vitest run`) covers everything until you need a real browser.

### TDD Step 0: Establish the test harness before refactoring

**Write failing tests first**
- Add a unit test runner and one trivial passing smoke test so the repo has a stable test entrypoint.
- Add one jsdom test that proves a small DOM fixture can be mounted and queried.

**Then implement**
- Add the minimum package and test configuration needed for local and CI execution.
- One command: `vitest run`.

**Validation**
- Run `npm test` and confirm both tests pass.

### TDD Step 1: Lock the content contract with failing validation tests

**Write failing tests first**
- Add tests for `validateMeta()` covering required keys, defaultable optional keys, and clear failure messages.
- Add tests for `validateQuestions()` covering valid MCQ, valid matching, missing prompt, unsupported type, missing answer/options, and malformed bonus question payloads.
- Add a test for a `normalizeLegacyQuestion()` or equivalent adapter only if you choose a transitional migration path.

**Then implement**
- Create `app/validate.js` and the smallest schema/default logic needed to satisfy the tests.
- Keep validation framework-free; simple explicit checks are enough for this project.

**Validation**
- Run only the validation test file(s).

### TDD Step 2: Extract and test pure utility behavior

**Write failing tests first**
- Add tests for `shuffleArray()` shape preservation and non-loss of values.
- Add tests for time formatting.
- Add tests for score percentage/band selection helpers.
- Add tests for achievement or streak reward resolution helpers once those are extracted.

**Then implement**
- Move these pure helpers into `app/utils.js`.
- Keep behavior identical to the current app unless the plan intentionally changes it.

**Validation**
- Run the utility-focused test file(s).

### TDD Step 3: Extract runtime scoring and progression logic behind tests

**Write failing tests first**
- Add tests for total score calculation excluding bonus questions.
- Add tests for progress text behavior with and without a bonus question.
- Add tests for correct/incorrect answer bookkeeping, streak increment/reset, and incorrectly answered question review payloads.
- Add tests for result message selection from metadata result bands.

**Then implement**
- Move state transition logic into `app/runtime.js` functions that can be exercised without a full DOM.
- Keep DOM writes out of these tests; test data in and state out.

**Validation**
- Run runtime unit tests only.

### TDD Step 4: Replace hardcoded shell text with metadata-driven DOM tests

**Write failing tests first**
- Add jsdom tests that boot a small HTML fixture and assert metadata populates the page title, heading, labels, button text, and logo attributes.
- Add a test that missing optional metadata falls back to defaults.
- Add a test that no quiz-specific fallback text leaks into the shell when metadata is absent or delayed.

**Then implement**
- Create or extract `app/ui.js` and `app/defaults.js`.
- Update `index.html` placeholders only as much as needed to satisfy the tests.

**Validation**
- Run the UI jsdom tests.

### TDD Step 5: Add loader tests before introducing fetched content

**Write failing tests first**
- Add tests for parsing the quiz id from the query string.
- Add tests that the loader fetches `quizzes/registry.json`, resolves the default quiz, then fetches `meta.json` and `questions.json` for the selected quiz.
- Add tests for clear error states when registry fetch fails, quiz id is unknown, or content fetch returns malformed JSON.

**Then implement**
- Create `app/loader.js` and the smallest boot orchestration in `app/boot.js`.
- Keep loading logic separate from rendering so it stays easy to test.

**Validation**
- Run loader-focused tests only.

### TDD Step 6: Migrate one quiz package first under tests

**Write failing tests first**
- Add content validation tests that load the new `quizzes/gethsemane/meta.json` and `quizzes/gethsemane/questions.json` and assert they pass schema validation.
- Add a browser test that boots `?quiz=gethsemane`, starts the quiz, answers one known question, and verifies score/progress updates.

**Then implement**
- Create the first real quiz package and wire the loader to it.
- Remove the old global-data dependency only after this path passes.

**Validation**
- Run the gethsemane content-validation tests.
- Run the single browser flow test for gethsemane.

### TDD Step 7: Migrate the sample quiz as the second compatibility proof

**Write failing tests first**
- Add content validation tests for `quizzes/sample/meta.json` and `quizzes/sample/questions.json`.
- Add a browser test that boots `?quiz=sample` and verifies the alternate quiz loads without app code changes.
- Add a test that sample-specific gamification metadata is honored by the generic runtime.

**Then implement**
- Create the sample quiz package.
- Remove any remaining special cases or assumptions left over from the first migration.

**Validation**
- Run the sample content tests.
- Run the browser flow test for sample.

### TDD Step 8: Finish with cross-quiz regression tests, then cleanup

**Write failing tests first**
- Add a small browser matrix covering start flow, MCQ answer, matching question, review toggle, timer display, and score export button visibility for both quizzes.
- Add a regression test that changing only the quiz id changes content but not runtime behavior.

**Then implement**
- Remove deprecated root quiz globals and any temporary adapters that are no longer needed.
- Update README and content docs only after the new flow is proven.

**Validation**
- Run the full unit suite.
- Run the browser smoke suite against a local hosted environment.

### Minimum Viable Test Order

If you want the leanest path, do the work in this order:

1. Test harness
2. Validation tests
3. Utility tests
4. Runtime scoring/progression tests
5. Metadata-driven UI tests
6. Loader tests
7. First quiz migration plus one browser flow
8. Second quiz migration plus one browser flow
9. Cross-quiz regression smoke tests

### Stop Conditions

Do not start the next slice until the current slice passes its narrow test command.

If a failing test reveals the contract is wrong rather than the code, update the contract once, fix the tests to match the corrected contract, and continue. Do not let legacy field names remain half-supported across the runtime unless that is a deliberate temporary adapter with a removal step.

### Task 1: Freeze the content boundary before moving files

**Files:**
- Modify: `README.md`
- Create: `docs/content-model.md` (optional but recommended)

- [ ] List every quiz-specific value currently hardcoded in `index.html` and `script.js`.
- [ ] Classify each one as `runtime`, `metadata`, or `question data`.
- [ ] Write down the normalized contracts above so migration does not invent names mid-stream.
- [ ] Decide whether to preserve current names temporarily through an adapter or rename everything during migration. Recommended: normalize once at the boot boundary, then update runtime to the normalized shape.
- [ ] Validation: confirm every current global (`mainQuizDataArray`, `quizData`, `streakThresholds`, `bonusGiftClass`) has an explicit replacement home.

### Task 2: Reorganize the repo around shared app code and per-quiz content

**Files:**
- Create: `app/`
- Create: `quizzes/`
- Create: `quizzes/registry.json`
- Move or replace: `quizData.js`, `quizData_sample.js`

- [ ] Create the `app/` folder for shared runtime code and the `quizzes/` folder for content packages.
- [ ] Add a tiny quiz registry that declares the default quiz id and available quiz ids.
- [ ] Move the current real quiz into `quizzes/gethsemane/` and the sample quiz into `quizzes/sample/`.
- [ ] Split each quiz package into `meta.json` and `questions.json`.
- [ ] Keep old root quiz data files only as short-lived compatibility shims if needed; otherwise remove them in the same phase to avoid two sources of truth.
- [ ] Validation: directory tree shows exactly one location for app logic and one location per quiz package.

### Task 3: Make the HTML shell generic and metadata-driven

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Create or modify: `app/ui.js`, `app/defaults.js`

- [ ] Replace quiz-specific document title, heading text, and logo assumptions in `index.html` with neutral placeholders and stable element ids.
- [ ] Identify every piece of visible shell copy that should come from metadata instead of hardcoded markup.
- [ ] Keep the DOM shape mostly intact to reduce CSS churn, but stop embedding quiz names in the HTML itself.
- [ ] Add a default/fallback behavior for missing metadata values so content files can stay small.
- [ ] Validation: opening the shell without content does not show misleading quiz-specific copy; opening it with content applies the quiz title, labels, and logo at startup.

### Task 4: Split the monolithic runtime into generic app responsibilities

**Files:**
- Move and split: `script.js` into `app/boot.js`, `app/loader.js`, `app/runtime.js`, `app/ui.js`, `app/questionTypes.js`, `app/utils.js`, `app/validate.js`

- [ ] Move bootstrapping into `app/boot.js` and content loading into `app/loader.js`.
- [ ] Move state, timer, scoring, streak logic, and result calculation into `app/runtime.js`.
- [ ] Move DOM read/write operations into `app/ui.js`.
- [ ] Move MCQ and matching rendering/grading helpers into `app/questionTypes.js`.
- [ ] Move generic helpers such as shuffling and time formatting into `app/utils.js`.
- [ ] Add schema checks in `app/validate.js` so malformed content fails early.
- [ ] Replace direct reads of globals like `mainQuizDataArray`, `streakThresholds`, and `bonusGiftClass` with reads from the loaded `meta` and `questions` objects.
- [ ] Validation: the runtime entry point accepts one quiz definition object and does not reference any quiz by name.

### Task 5: Add a Vercel-friendly loader for hosted quiz content

**Files:**
- Create or modify: `app/boot.js`
- Create or modify: `app/loader.js`
- Create or modify: `quizzes/registry.json`
- Modify: `index.html`

- [ ] Use `fetch()` as the primary loading mechanism for `registry.json`, `meta.json`, and `questions.json`.
- [ ] Choose one quiz from the query string, with a registry-defined default when no query param is present.
- [ ] Load `meta.json` and `questions.json` for the chosen quiz, then start the runtime only after both are present.
- [ ] Keep path-based quiz URLs optional; if you want them later, add a small `vercel.json` rewrite instead of mixing routing concerns into the runtime.
- [ ] Fail clearly if content is missing or malformed, with an error message that tells the maintainer which contract is missing.
- [ ] Validation: a Vercel preview deployment loads the default quiz successfully; `?quiz=sample` loads the sample quiz without editing app code; local development works through `vercel dev` or any simple static server.

### Task 6: Migrate existing quiz content into the new contracts

**Files:**
- Create: `quizzes/gethsemane/meta.json`
- Create: `quizzes/gethsemane/questions.json`
- Create: `quizzes/sample/meta.json`
- Create: `quizzes/sample/questions.json`
- Remove or deprecate: `quizData.js`, `quizData_sample.js`

- [ ] Move all question objects from `quizData.js` into `quizzes/gethsemane/questions.json`.
- [ ] Build `quizzes/gethsemane/meta.json` from the hardcoded values currently in `index.html` and `script.js`, including title, timer length, result messaging, share filename, and any quiz-wide branding.
- [ ] Move all sample question objects from `quizData_sample.js` into `quizzes/sample/questions.json`.
- [ ] Move `streakThresholds` and `bonusGiftClass` out of the sample question file and into `quizzes/sample/meta.json`.
- [ ] Normalize field names during migration, or add a one-time adapter in the loader if you want to reduce churn during the first pass.
- [ ] Validation: the real quiz and sample quiz both render and score correctly from their new content files.

### Task 7: Update docs and run cross-quiz smoke tests

**Files:**
- Modify: `README.md`
- Modify: `docs/content-model.md` if created

- [ ] Update the README so it no longer says the app is specifically a Gethsemane or Ephesians quiz.
- [ ] Document how to add a new quiz: create `meta.json`, create `questions.json`, register the quiz id, then open `index.html?quiz=<id>`.
- [ ] Document the Vercel/local-dev constraint: deployment is hosted, so use `vercel dev` or any simple static server locally rather than relying on `file://`.
- [ ] Run a manual smoke test matrix for both quizzes: start flow, MCQ scoring, matching question scoring, timer countdown, review toggle, achievements, and score image export.
- [ ] Validation: README matches the refactored structure and a maintainer can add a new quiz without touching runtime logic.

## Key Migration Risks and Decisions

1. **Local-file compatibility is the main architectural constraint.**
   - If the app must keep working when someone double-clicks `index.html`, do not make `fetch('questions.json')` or ES-module-only imports the critical path.
   - Recommended first choice: classic scripts plus a tiny loader.

2. **Load order must become explicit.**
   - Today the app assumes globals already exist when `script.js` runs.
   - After the refactor, the boot layer must validate `meta` and `questions` before the runtime initializes.

3. **Path handling will change when files move.**
   - Relative asset paths such as logos and screenshots should be tested from the final `index.html` location, especially under `file://`.
   - Avoid root-relative URLs.

4. **A partial migration can leave two sources of truth.**
   - Do not keep hardcoded title/timer/reward logic in the runtime after creating metadata files.
   - Either ship a short compatibility adapter intentionally, or remove the old globals in the same pass.

5. **Question-type normalization is a one-way decision.**
   - Decide once whether the canonical runtime contract uses `MCQ`/`Matching` or `mcq`/`matching`.
   - Recommended: normalize to lowercase in the new contract and keep any backward-compatibility mapping only in the loader.

6. **Some current behavior is app-generic but currently named like quiz content.**
   - Examples: result-band copy, share filename, streak reward icons, and timer length.
   - These belong in metadata, not in the shared runtime.

7. **CDN dependencies remain an offline risk.**
   - Tone.js and html2canvas are currently remote.
   - This refactor does not need to solve that, but if true offline local use matters, note it as a separate follow-up.

## Brief Migration Notes for Existing Files

- `quizData.js`
  - Becomes the real quiz package.
  - Move the question array into `quizzes/gethsemane/questions.js`.
  - Create `quizzes/gethsemane/meta.js` from the current hardcoded shell values: title, page title, timer, result messages, share filename, labels, and branding.
  - Clean up any placeholder comments about `mainQuizDataArray` vs `quizData`; the runtime should no longer care.

- `quizData_sample.js`
  - Split the question array into `quizzes/sample/questions.js`.
  - Move `streakThresholds` and `bonusGiftClass` into `quizzes/sample/meta.js` under `gamification`.
  - Give the sample quiz its own neutral title and branding so it becomes a true example package, not half runtime demo and half content file.

## Recommended Order of Execution

1. Contract and file-structure decision.
2. Shell genericization.
3. Runtime split.
4. Static-safe boot loader.
5. Content migration for both quizzes.
6. README and content-author documentation.
7. Manual smoke test of both quiz ids.

## Self-Review

- Spec coverage: the plan separates app shell/runtime, question data, and quiz metadata/config; covers repo structure, phased plan, data contracts, migration risks, and existing file migration.
- Placeholder scan: no `TODO`, `TBD`, or unspecified “appropriate handling” steps remain.
- Type consistency: the plan consistently uses `meta` and `questions` as the runtime boundary and recommends normalized lowercase question types.
