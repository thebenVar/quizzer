// --- DOM Elements ---
// Ensure elements are accessed only after the DOM is loaded
let startQuizButton, quizContentElement, questionTextElement, optionsAreaElement,
    feedbackAreaElement, submitButton, resultAreaElement, scoreCardElement,
    finalScoreElement, totalPossibleScoreElement, quizContainer, progressTextElement,
    progressBarElement, overallTimerElement, shareScoreButton,
    correctAnswersCountElement, incorrectAnswersCountElement, liveCorrectCountElement,
    liveIncorrectCountElement, streakCounterElement, feedbackFlashElement,
    reviewSection, reviewToggleButton, reviewContent, achievementsListElement,
    liveGiftsElement, timeTakenElement, nameInputElement,
    resultMessageElement, correctionModeSelectorElement,
    nextQuestionButtonElement, initialSetupElement,
    questionViewElement, finishScreenElement, testBackButton, testNextButton,
    keyboardHintElement, nameHintElement, resumePanelElement, reviewCardsElement,
    downloadResultsButton, shareResultsButton;

// --- Quiz State ---
let currentQuestionIndex = 0;
let score = 0;
let correctCount = 0;
let incorrectCount = 0;
let currentStreak = 0;
let earnedGifts = []; // Will store objects like { class: 'fas fa-icon', source: 'streak'/'bonus' }
let userAnswers = {};
let totalPossibleScore = 0;
let overallTimerInterval;
let timeLeft = 0;
let autoProceedTimeout;
let quizStartTime;
let quizEndTime;
let totalRegularQuestions = 0;
let userName = "";
let currentQuizData = []; // This will hold the main quiz data after setup
let currentQuizMeta = null;
let quizQuestions = []; // All questions of the loaded quiz, before shuffling
let answerLog = []; // { questionId, isCorrect } for each answered question, for the per-skill results
let currentStreakRewards = {};
let currentBonusGiftClass = null;
let quizLib = null; // Functions from app/utils.js and app/runtime.js, loaded when the quiz starts
let showImmediateCorrection = true;

// Answers and timing, for grading at the end (test mode), the review and the results file
let selections = {};        // the participant's answer by question id (as a string)
let timeSpent = {};         // ms each question was on screen, by question id
let optionOrders = {};      // the order options were shown in, by question id (kept on revisits)
let questionShownAt = null; // when the current question's on-screen time started
let questionDisplayed = false;
let unansweredCount = 0;
let lastResults = null;     // what the results screen shows, kept for the review and the download
let reviewFilter = 'wrong';

// Test mode: saved progress and the deadline
let quizDeadline = null;    // absolute timestamp (ms), so time keeps running while away
let testInProgress = false;
let progressStorage = null;
let quizFingerprintValue = '';
let ticksSinceSave = 0;

// --- Sound Effects (Tone.js Synths) ---
let correctSound, incorrectSound, completeSound, giftSound;
let isAudioContextStarted = false;

// --- Functions ---

function getDOMElements() {
    initialSetupElement = document.getElementById('initial-setup');
    startQuizButton = document.getElementById('start-quiz-btn');
    quizContentElement = document.getElementById('quiz-content');
    questionTextElement = document.getElementById('question-text');
    optionsAreaElement = document.getElementById('options-area');
    feedbackAreaElement = document.getElementById('feedback-area');
    submitButton = document.getElementById('submit-btn');
    resultAreaElement = document.getElementById('result-area');
    scoreCardElement = document.getElementById('score-card');
    finalScoreElement = document.getElementById('final-score');
    totalPossibleScoreElement = document.getElementById('total-possible-score');
    quizContainer = document.getElementById('quiz-container');
    progressTextElement = document.getElementById('progress-text');
    progressBarElement = document.getElementById('progress-bar');
    overallTimerElement = document.getElementById('overall-timer');
    shareScoreButton = document.getElementById('share-score-btn');
    correctAnswersCountElement = document.getElementById('correct-answers-count');
    incorrectAnswersCountElement = document.getElementById('incorrect-answers-count');
    liveCorrectCountElement = document.getElementById('live-correct-count');
    liveIncorrectCountElement = document.getElementById('live-incorrect-count');
    streakCounterElement = document.getElementById('streak-counter');
    feedbackFlashElement = document.getElementById('feedback-flash');
    reviewSection = document.getElementById('review-section');
    reviewToggleButton = document.getElementById('review-toggle-btn');
    reviewContent = document.getElementById('review-content');
    achievementsListElement = document.getElementById('achievements-list');
    liveGiftsElement = document.getElementById('live-gifts');
    timeTakenElement = document.getElementById('time-taken');
    nameInputElement = document.getElementById('user-name');
    resultMessageElement = document.getElementById('result-message');
    correctionModeSelectorElement = document.getElementById('correction-mode-selector');
    nextQuestionButtonElement = document.getElementById('next-question-btn');
    questionViewElement = document.getElementById('question-view');
    finishScreenElement = document.getElementById('finish-screen');
    testBackButton = document.getElementById('test-back-btn');
    testNextButton = document.getElementById('test-next-btn');
    keyboardHintElement = document.getElementById('keyboard-hint');
    nameHintElement = document.getElementById('name-hint');
    resumePanelElement = document.getElementById('resume-panel');
    reviewCardsElement = document.getElementById('review-cards');
    downloadResultsButton = document.getElementById('download-results-btn');
    shareResultsButton = document.getElementById('share-results-btn');
}


function defineSynths() {
    if (typeof Tone === 'undefined') {
        console.error("Tone.js not loaded.");
        return;
    }
    if (!correctSound) {
        correctSound = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.2 } }).toDestination();
        incorrectSound = new Tone.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.05, release: 0.2 } }).toDestination();
        completeSound = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.05, decay: 0.2, sustain: 0.3, release: 0.5 } }).toDestination();
        giftSound = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.05, sustain: 0.1, release: 0.3 } }).toDestination();
        giftSound.volume.value = -6;
        console.log("Synths Defined");
    }
}

// Sounds play only once a click (the Start button) has started the audio;
// before that (e.g. a test submitted on page load) they are silently skipped.
async function playSound(synth, note, duration) {
    if (typeof Tone === 'undefined' || !isAudioContextStarted || !synth) return;
    if (Tone.context.state !== 'running') {
        try {
            await Tone.start();
        } catch {
            return;
        }
        if (Tone.context.state !== 'running') return;
    }
    synth.triggerAttackRelease(note, duration, Tone.now());
}

// With ?quiz=<id>, loads that quiz and fills the page with its title, logo and
// labels. Without it, shows the home page: the quizzes listed in quizzes/registry.json.
async function initPage() {
    let loader;
    try {
        let utils, runtime, progress, results, answerKey, submissions;
        [loader, utils, runtime, progress, results, answerKey, submissions] = await Promise.all([
            import('./app/loader.js'),
            import('./app/utils.js'),
            import('./app/runtime.js'),
            import('./app/progress.js'),
            import('./app/results.js'),
            import('./app/answerKey.js'),
            import('./app/submissions.js'),
        ]);
        quizLib = { ...utils, ...runtime, ...progress, ...results, ...submissions, renderQuestionCard: answerKey.renderQuestionCard };
    } catch (error) {
        showQuizLoadError(error);
        return;
    }

    // Results that could not be sent to the facilitators earlier are retried on every page.
    quizLib.flushOutbox(quizLib.getStorage(window)).catch(() => {});

    const quizParam = loader.getQuizIdFromSearch(window.location.search);
    if (!quizParam) {
        await showHomePage(loader);
        return;
    }
    const { quizId, answerKey } = loader.parseQuizRequest(quizParam);
    if (answerKey) {
        await showAnswerKey(loader, quizId);
    } else {
        await initQuiz(loader, quizId);
    }
}

// ?quiz=<id>-ans: every question with its answer, why, and how to approach it.
async function showAnswerKey(loader, quizId) {
    try {
        const [quiz, { renderAnswerKey }] = await Promise.all([
            loader.loadQuiz(quizId),
            import('./app/answerKey.js'),
        ]);
        currentQuizMeta = quiz.meta;

        // Not linked anywhere; also ask search engines to leave it out.
        const robots = document.createElement('meta');
        robots.name = 'robots';
        robots.content = 'noindex';
        document.head.appendChild(robots);

        const meta = quiz.meta;
        document.title = `${meta.pageTitle} – ${meta.uiText.answerKeyLabel}`;
        document.getElementById('quiz-title').textContent = meta.title;
        const logoElement = document.getElementById('logo');
        if (meta.branding.logoSrc) {
            logoElement.src = meta.branding.logoSrc;
            logoElement.alt = meta.branding.logoAlt;
            logoElement.onerror = () => { logoElement.hidden = true; };
            logoElement.hidden = false;
        }
        document.getElementById('home-link').textContent = meta.uiText.homeLinkLabel;
        setHomeLinkVisible(true);

        quizContainer.classList.add('answer-key-mode');
        const root = document.getElementById('answer-key');
        renderAnswerKey(root, quiz);
        root.hidden = false;
    } catch (error) {
        showQuizLoadError(error);
    }
}

async function initQuiz(loader, quizId) {
    try {
        const quiz = await loader.loadQuiz(quizId);

        currentQuizMeta = quiz.meta;
        quizQuestions = quiz.questions;
        currentStreakRewards = currentQuizMeta.gamification.streakRewards;
        currentBonusGiftClass = currentQuizMeta.gamification.bonusRewardClass;

        applyQuizMetaToPage(currentQuizMeta);
        initialSetupElement.style.display = 'block';
        updateStartButton();

        if (isTestMode()) {
            progressStorage = quizLib.getStorage(window);
            quizFingerprintValue = quizLib.quizFingerprint(quizQuestions);
            offerSavedProgress();
        }
    } catch (error) {
        showQuizLoadError(error);
    }
}

// Test mode, and a quiz that sends its results to the facilitators, need a name
// before they can start; other quizzes fall back to the default name.
function updateStartButton() {
    if (!isTestMode() && !currentQuizMeta.collectResults) {
        startQuizButton.disabled = false;
        return;
    }
    const hasName = quizLib.hasVisibleText(nameInputElement.value);
    startQuizButton.disabled = !hasName;
    nameHintElement.hidden = hasName;
}

// Test mode: a test saved part-way can be resumed, or is submitted if its time ran out meanwhile.
function offerSavedProgress() {
    const saved = quizLib.loadProgress(progressStorage, currentQuizMeta.id, quizFingerprintValue);
    const order = saved ? quizLib.restoreQuestionOrder(saved.order, quizQuestions) : null;
    if (!order) {
        if (saved) quizLib.clearProgress(progressStorage, currentQuizMeta.id);
        return;
    }

    if (quizLib.isExpired(saved.deadline)) {
        restoreTestState(saved, order);
        submitTest();
        return;
    }

    const current = Math.min(Math.max(saved.index, 0), order.length - 1) + 1;
    document.getElementById('resume-heading').textContent = uiText('resumeHeading');
    // The time left counts down while the panel is shown; at zero the saved answers are submitted.
    const updateResumeDetails = () => {
        const left = quizLib.secondsLeft(saved.deadline);
        document.getElementById('resume-details').textContent = uiText('resumeDetails', {
            current,
            total: order.length,
            time: quizLib.formatMinutesSeconds(left),
        });
        if (left <= 0) {
            stopResumeCountdown();
            restoreTestState(saved, order);
            submitTest();
        }
    };
    stopResumeCountdown();
    resumeCountdown = setInterval(updateResumeDetails, 1000);
    updateResumeDetails();
    document.getElementById('resume-btn').onclick = () => {
        stopResumeCountdown();
        startAudioFromClick();
        // Re-check in case the time ran out while the start screen was open.
        restoreTestState(saved, order);
        if (quizLib.isExpired(quizDeadline)) {
            submitTest();
        } else {
            beginTest();
        }
    };
    if (resumeCountdown !== null) { // not already submitted because the time ran out
        resumePanelElement.hidden = false;
        setStartAreaVisible(false);
    }
}

let resumeCountdown = null;
function stopResumeCountdown() {
    clearInterval(resumeCountdown);
    resumeCountdown = null;
}

// Lets the end-of-test sound play after resuming (browsers need a click to start audio).
function startAudioFromClick() {
    if (typeof Tone === 'undefined' || isAudioContextStarted) return;
    Tone.start().then(() => {
        isAudioContextStarted = true;
        defineSynths();
    }).catch(() => {});
}

function setStartAreaVisible(visible) {
    document.getElementById('name-input-area').style.display = visible ? '' : 'none';
    startQuizButton.style.display = visible ? '' : 'none';
}

function startOver() {
    stopResumeCountdown();
    quizLib.clearProgress(progressStorage, currentQuizMeta.id);
    resumePanelElement.hidden = true;
    setStartAreaVisible(true);
    updateStartButton();
    nameInputElement.focus();
}

async function showHomePage(loader) {
    const titleElement = document.getElementById('quiz-title');
    const descriptionElement = document.getElementById('quiz-description');
    const listElement = document.getElementById('quiz-list');

    let list;
    try {
        list = await loader.loadQuizList();
    } catch (error) {
        console.error('Error loading quiz list:', error);
        document.title = 'Quizzes not available';
        titleElement.textContent = 'Quizzes not available';
        const errorElement = document.getElementById('quiz-load-error');
        errorElement.textContent = error.message;
        errorElement.hidden = false;
        return;
    }

    document.title = list.title;
    titleElement.textContent = list.title;
    descriptionElement.textContent = list.description;
    descriptionElement.hidden = list.description.length === 0;

    listElement.innerHTML = '';
    for (const entry of list.quizzes) {
        const item = document.createElement('li');
        if (entry.error) {
            // Shown so a broken quiz is noticed; visitors just see it is unavailable.
            console.error(`Quiz "${entry.id}" could not be loaded:`, entry.error);
            item.className = 'quiz-card quiz-card-broken';
            item.textContent = `"${entry.id}" is not available right now.`;
            listElement.appendChild(item);
            continue;
        }

        const { meta } = entry;
        const link = document.createElement('a');
        link.className = 'quiz-card';
        link.href = `?quiz=${encodeURIComponent(entry.id)}`;

        if (meta.branding.logoSrc) {
            const logo = document.createElement('img');
            logo.className = 'quiz-card-logo';
            logo.src = meta.branding.logoSrc;
            logo.alt = '';
            logo.onerror = () => logo.remove();
            link.appendChild(logo);
        }

        const textWrap = document.createElement('span');
        textWrap.className = 'quiz-card-text';
        const title = document.createElement('span');
        title.className = 'quiz-card-title';
        title.textContent = meta.title;
        textWrap.appendChild(title);
        if (meta.description) {
            const description = document.createElement('span');
            description.className = 'quiz-card-description';
            description.textContent = meta.description;
            textWrap.appendChild(description);
        }
        link.appendChild(textWrap);

        item.appendChild(link);
        listElement.appendChild(item);
    }
    listElement.hidden = false;
}

function setHomeLinkVisible(visible) {
    document.getElementById('home-link').hidden = !visible;
}

function applyQuizMetaToPage(meta) {
    const text = meta.uiText;
    document.title = meta.pageTitle;
    document.getElementById('home-link').textContent = text.homeLinkLabel;
    setHomeLinkVisible(true);
    document.getElementById('quiz-title').textContent = meta.title;

    const descriptionElement = document.getElementById('quiz-description');
    descriptionElement.textContent = meta.description;
    descriptionElement.hidden = meta.description.trim().length === 0;

    const logoElement = document.getElementById('logo');
    if (meta.branding.logoSrc) {
        logoElement.onerror = () => {
            logoElement.hidden = true;
            console.error(`Logo image not found at ${meta.branding.logoSrc}`);
        };
        logoElement.src = meta.branding.logoSrc;
        logoElement.alt = meta.branding.logoAlt;
        logoElement.hidden = false;
    }

    document.getElementById('name-label').textContent = text.nameLabel;
    nameInputElement.placeholder = text.namePlaceholder;
    document.getElementById('correction-mode-label').textContent = text.correctionModeLabel;
    document.getElementById('immediate-correction-label').textContent = text.immediateCorrectionLabel;
    document.getElementById('delayed-correction-label').textContent = text.delayedCorrectionLabel;
    startQuizButton.textContent = text.startButtonLabel;
    document.getElementById('result-heading').textContent = text.resultHeading;
    reviewToggleButton.textContent = text.reviewToggleClosed;
    document.getElementById('share-score-label').textContent = text.shareButtonLabel;
    submitButton.textContent = text.submitButtonLabel;
    document.getElementById('next-question-label').textContent = text.nextButtonLabel;
    document.getElementById('final-score-label').textContent = text.finalScoreLabel;
    document.getElementById('correct-count-label').textContent = text.correctCountLabel;
    document.getElementById('incorrect-count-label').textContent = text.incorrectCountLabel;
    document.getElementById('time-taken-label').textContent = text.timeTakenLabel;
    document.getElementById('achievements-heading').textContent = text.achievementsHeading;
    document.getElementById('skill-breakdown-heading').textContent = text.skillBreakdownHeading;

    nameHintElement.textContent = text.nameRequiredHint;
    document.getElementById('resume-btn').textContent = text.resumeButtonLabel;
    document.getElementById('start-over-btn').textContent = text.startOverButtonLabel;
    document.getElementById('test-back-label').textContent = text.testBackButtonLabel;
    document.getElementById('finish-heading').textContent = text.finishHeading;
    document.getElementById('back-to-test-btn').textContent = text.backToTestLabel;
    document.getElementById('submit-test-btn').textContent = text.submitTestLabel;
    document.getElementById('unanswered-count-label').textContent = text.unansweredCountLabel;
    document.getElementById('review-filter-wrong').textContent = text.reviewFilterWrong;
    document.getElementById('review-filter-all').textContent = text.reviewFilterAll;
    document.getElementById('download-results-label').textContent = text.downloadResultsLabel;
    document.getElementById('share-results-label').textContent = text.shareResultsLabel;
    document.getElementById('results-retry-btn').textContent = text.resultsRetryLabel;

    // A quiz that sends results to the facilitators says so before it starts.
    const collectNotice = document.getElementById('results-collected-notice');
    collectNotice.textContent = text.resultsCollectedNotice;
    collectNotice.hidden = !meta.collectResults;

    // A test gives no hints while it runs: no feedback choice, no live right/wrong counts.
    correctionModeSelectorElement.style.display = meta.mode === 'test' ? 'none' : '';
    document.getElementById('live-stats').style.display = meta.mode === 'test' ? 'none' : '';
}

function showQuizLoadError(error) {
    console.error('Error loading quiz:', error);
    document.title = 'Quiz not available';
    document.getElementById('quiz-title').textContent = 'Quiz not available';
    initialSetupElement.style.display = 'none';
    const homeLink = document.getElementById('home-link');
    homeLink.textContent = '← All quizzes';
    homeLink.hidden = false;
    const errorElement = document.getElementById('quiz-load-error');
    errorElement.textContent = error.message;
    errorElement.hidden = false;
}

// The quiz's text for `key` (see DEFAULT_UI_TEXT in app/validate.js), with {placeholders} filled in.
function uiText(key, values) {
    return quizLib.fillText(currentQuizMeta.uiText[key], values);
}

// "test" mode: no right/wrong feedback, streaks or gifts until the end.
function isTestMode() {
    return currentQuizMeta.mode === 'test';
}

function getAchievementLabel(labelKey) {
    return currentQuizMeta.gamification.achievementLabels[labelKey];
}

// --- Time on each question (only while it is on screen; revisits add up) ---
function startQuestionClock() {
    questionShownAt = document.hidden ? null : Date.now();
}

function stopQuestionClock() {
    const question = currentQuizData[currentQuestionIndex];
    if (questionShownAt !== null && question) {
        const id = String(question.id);
        timeSpent[id] = (timeSpent[id] || 0) + (Date.now() - questionShownAt);
    }
    questionShownAt = null;
}

// The order a question's options (or a matching question's right-hand items) are
// shown in: shuffled once, then kept, so going back shows them in the same place.
function getOptionOrder(question) {
    const id = String(question.id);
    const items = question.type === 'matching' ? question.pairs.map(pair => pair[1]) : question.options;
    const saved = optionOrders[id];
    if (Array.isArray(saved) && saved.length === items.length && items.every(item => saved.includes(item))) {
        return saved;
    }
    let order;
    if (question.type === 'matching') {
        order = quizLib.shuffleArray([...items]);
    } else {
        // "All the above" / "None of the above" stay last
        const isSpecial = option => ['all the above', 'none of the above'].includes(option.toLowerCase().trim());
        order = [...quizLib.shuffleArray(items.filter(option => !isSpecial(option))), ...items.filter(isSpecial)];
    }
    optionOrders[id] = order;
    return order;
}

function showKeyboardHint(question) {
    if (question.type === 'mcq') {
        // In a quiz a right answer moves on by itself, so the tip only mentions choosing.
        keyboardHintElement.textContent = uiText(isTestMode() ? 'keyboardHint' : 'keyboardHintQuiz', { max: Math.min(question.options.length, 9) });
        keyboardHintElement.hidden = false;
    } else if (question.type === 'statements' || question.type === 'spot') {
        keyboardHintElement.textContent = uiText(isTestMode() ? 'keyboardHintTabChooseNext' : 'keyboardHintTabChoose');
        keyboardHintElement.hidden = false;
    } else if (question.type === 'text' && !isTestMode()) {
        keyboardHintElement.textContent = uiText('keyboardHintTextSubmit');
        keyboardHintElement.hidden = false;
    } else if (isTestMode()) {
        keyboardHintElement.textContent = uiText('keyboardHintMatching');
        keyboardHintElement.hidden = false;
    } else {
        keyboardHintElement.hidden = true;
    }
}

// --- Rendering the newer question types (shared by quiz and test mode) ---

// "statements": the passage, then each statement with True / False / Can't tell buttons.
// `onChange(statementIndex, value)` is called on each choice.
function loadStatementsOptions(question, initial, onChange) {
    if (question.passage) {
        const passage = document.createElement('blockquote');
        passage.className = 'question-passage';
        passage.textContent = question.passage;
        optionsAreaElement.appendChild(passage);
    }
    const list = document.createElement('ol');
    list.className = 'statements-list';
    question.statements.forEach((statement, index) => {
        const row = document.createElement('li');
        row.className = 'statement-row';
        const statementText = document.createElement('p');
        statementText.className = 'statement-text';
        statementText.textContent = statement.text;
        const group = document.createElement('div');
        group.className = 'statement-choices';
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', statement.text);
        ['true', 'false', 'cannot-tell'].forEach(value => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'choice-btn statement-choice';
            button.dataset.value = value;
            button.textContent = quizLib.statementAnswerLabel(value, currentQuizMeta.uiText);
            const isSelected = initial[index] === value;
            button.classList.toggle('selected', isSelected);
            button.setAttribute('aria-pressed', String(isSelected));
            button.onclick = () => {
                group.querySelectorAll('.statement-choice').forEach(other => {
                    other.classList.toggle('selected', other === button);
                    other.setAttribute('aria-pressed', String(other === button));
                });
                onChange(index, value);
            };
            group.appendChild(button);
        });
        row.append(statementText, group);
        list.appendChild(row);
    });
    optionsAreaElement.appendChild(list);
}

// "spot": the optional source, then the text with each word a button.
// `onSelect(wordIndex, button)` is called when a word is chosen.
function loadSpotOptions(question, selectedIndex, onSelect) {
    if (question.source) {
        const source = document.createElement('div');
        source.className = 'question-source';
        const label = document.createElement('p');
        label.className = 'question-source-label';
        label.textContent = uiText('spotSourceLabel');
        const sourceText = document.createElement('p');
        sourceText.className = 'question-source-text';
        sourceText.textContent = question.source;
        source.append(label, sourceText);
        optionsAreaElement.appendChild(source);
    }
    const line = document.createElement('p');
    line.className = 'spot-text';
    quizLib.tokenizeSpotText(question.text).forEach((token, index) => {
        if (index > 0) line.append(' ');
        if (token.before) line.append(token.before);
        if (token.word) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'choice-btn spot-word';
            button.textContent = token.word;
            button.dataset.index = String(index);
            const isSelected = selectedIndex === index;
            button.classList.toggle('selected', isSelected);
            button.setAttribute('aria-pressed', String(isSelected));
            button.onclick = () => onSelect(index, button);
            line.appendChild(button);
        }
        if (token.after) line.append(token.after);
    });
    optionsAreaElement.appendChild(line);
}

function markSelected(selector, chosen) {
    optionsAreaElement.querySelectorAll(selector).forEach(element => {
        element.classList.toggle('selected', element === chosen);
        element.setAttribute('aria-pressed', String(element === chosen));
    });
}

// "text": one input. `onInput(value)` is called as the participant types.
function loadTextOptions(question, initialValue, onInput) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'text-answer';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('aria-label', uiText('textAnswerLabel'));
    input.placeholder = uiText('textAnswerPlaceholder');
    input.value = initialValue || '';
    input.addEventListener('input', () => onInput(input.value));
    optionsAreaElement.appendChild(input);
    // Ready to type, except on touch screens, where it would pop up the keyboard over the question.
    if (!window.matchMedia || !window.matchMedia('(hover: none)').matches) {
        input.focus({ preventScroll: true });
    }
}

// --- Test mode: select, then Next; submit at the end ---

function startTestFlow() {
    const name = nameInputElement.value.trim();
    if (!quizLib.hasVisibleText(name)) {
        updateStartButton();
        return;
    }
    quizLib.clearProgress(progressStorage, currentQuizMeta.id);
    userName = name;
    currentQuizData = quizLib.shuffleArray(quizQuestions.filter(q => !q.isBonus));
    currentQuestionIndex = 0;
    selections = {};
    timeSpent = {};
    optionOrders = {};
    quizStartTime = Date.now();
    quizDeadline = quizLib.computeDeadline(quizStartTime, currentQuizMeta.timing.timeLimitSeconds);
    beginTest();
}

function restoreTestState(saved, order) {
    currentQuizData = order;
    currentQuestionIndex = Math.min(Math.max(saved.index, 0), order.length - 1);
    selections = { ...saved.selections };
    timeSpent = { ...saved.timeSpent };
    optionOrders = { ...saved.optionOrder };
    userName = saved.name || uiText('defaultPlayerName');
    quizStartTime = saved.startedAt;
    quizDeadline = saved.deadline;
    testInProgress = true;
}

function beginTest() {
    initialSetupElement.style.display = 'none';
    setHomeLinkVisible(false);
    quizContentElement.style.display = 'block';
    testInProgress = true;
    window.addEventListener('beforeunload', warnBeforeLeaving);
    calculateTotalPossibleScore();
    startDeadlineTimer();
    if (testInProgress) {
        showTestQuestion(currentQuestionIndex);
    }
}

function warnBeforeLeaving(event) {
    if (!testInProgress) return undefined;
    saveTestProgress();
    event.preventDefault();
    event.returnValue = uiText('leaveTestWarning');
    return event.returnValue;
}

function saveTestProgress() {
    if (!testInProgress) return;
    // Include the time on the current question so far, without stopping its clock.
    const spent = { ...timeSpent };
    const question = currentQuizData[currentQuestionIndex];
    if (questionShownAt !== null && question) {
        const id = String(question.id);
        spent[id] = (spent[id] || 0) + (Date.now() - questionShownAt);
    }
    quizLib.saveProgress(progressStorage, currentQuizMeta.id, quizFingerprintValue, {
        order: currentQuizData.map(q => q.id),
        index: currentQuestionIndex,
        selections,
        name: userName,
        startedAt: quizStartTime,
        deadline: quizDeadline,
        timeSpent: spent,
        optionOrder: optionOrders,
    });
}

function startDeadlineTimer() {
    clearInterval(overallTimerInterval);
    ticksSinceSave = 0;
    const tick = () => {
        timeLeft = quizLib.secondsLeft(quizDeadline);
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(overallTimerInterval);
            submitTest();
            return;
        }
        ticksSinceSave++;
        if (ticksSinceSave >= 10) { // keeps the saved time per question roughly current
            ticksSinceSave = 0;
            saveTestProgress();
        }
    };
    overallTimerInterval = setInterval(tick, 1000);
    tick();
}

function countCompleteAnswers() {
    return currentQuizData.filter(q => quizLib.answerStatus(q, quizLib.selectionFor(selections, q)) === 'complete').length;
}

function updateTestProgressBar() {
    const total = currentQuizData.length;
    progressBarElement.style.width = `${total > 0 ? (countCompleteAnswers() / total) * 100 : 0}%`;
}

function showTestQuestion(index) {
    if (!testInProgress) return;
    stopQuestionClock();
    currentQuestionIndex = Math.max(0, Math.min(index, currentQuizData.length - 1));
    const question = currentQuizData[currentQuestionIndex];
    const isLast = currentQuestionIndex === currentQuizData.length - 1;

    finishScreenElement.hidden = true;
    questionViewElement.hidden = false;
    optionsAreaElement.innerHTML = '';
    feedbackAreaElement.textContent = '';
    feedbackAreaElement.className = '';
    submitButton.style.display = 'none';
    nextQuestionButtonElement.style.display = 'none';

    progressTextElement.textContent = uiText('questionProgress', { current: currentQuestionIndex + 1, total: currentQuizData.length });
    updateTestProgressBar();
    questionTextElement.textContent = question.prompt;

    const selection = quizLib.selectionFor(selections, question);
    if (question.type === 'mcq') {
        getOptionOrder(question).forEach(optionText => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = optionText;
            button.classList.add('mcq-option', 'choice-btn');
            button.setAttribute('aria-pressed', String(selection === optionText));
            if (selection === optionText) button.classList.add('selected');
            button.onclick = () => selectTestOption(question, optionText, button);
            optionsAreaElement.appendChild(button);
        });
    } else if (question.type === 'statements') {
        const initial = selection && typeof selection === 'object' ? selection : {};
        loadStatementsOptions(question, initial, (statementIndex, value) => {
            const id = String(question.id);
            selections[id] = { ...(selections[id] || {}), [statementIndex]: value };
            noteTestAnswerSaved();
        });
    } else if (question.type === 'spot') {
        loadSpotOptions(question, Number.isInteger(selection) ? selection : null, (wordIndex, button) => {
            selections[String(question.id)] = wordIndex;
            markSelected('.spot-word', button);
            noteTestAnswerSaved();
        });
    } else if (question.type === 'text') {
        loadTextOptions(question, typeof selection === 'string' ? selection : '', value => {
            const id = String(question.id);
            if (value.trim()) selections[id] = value; else delete selections[id];
            updateTestProgressBar();
            saveTestProgress();
        });
    } else {
        const initial = selection && typeof selection === 'object' ? selection : {};
        loadMatchingOptions(question, initial, (left, value) => {
            const id = String(question.id);
            const current = { ...(selections[id] || {}) };
            if (value) current[left] = value; else delete current[left];
            selections[id] = current;
            updateTestProgressBar();
            saveTestProgress();
        });
    }

    testBackButton.hidden = currentQuestionIndex === 0;
    testNextButton.hidden = false;
    document.getElementById('test-next-label').textContent = uiText(isLast ? 'testFinishButtonLabel' : 'testNextButtonLabel');
    showKeyboardHint(question);

    questionDisplayed = true;
    startQuestionClock();
    saveTestProgress();
}

function selectTestOption(question, optionText, button) {
    selections[String(question.id)] = optionText;
    optionsAreaElement.querySelectorAll('.mcq-option').forEach(btn => {
        const isSelected = btn === button;
        btn.classList.toggle('selected', isSelected);
        btn.setAttribute('aria-pressed', String(isSelected));
    });
    noteTestAnswerSaved();
}

function noteTestAnswerSaved() {
    feedbackAreaElement.textContent = uiText('answerSaved');
    feedbackAreaElement.className = 'feedback-quiet';
    updateTestProgressBar();
    saveTestProgress();
}

function goToNextTestQuestion() {
    if (currentQuestionIndex >= currentQuizData.length - 1) {
        showFinishScreen();
    } else {
        showTestQuestion(currentQuestionIndex + 1);
    }
}

function goToPreviousTestQuestion() {
    if (currentQuestionIndex > 0) {
        showTestQuestion(currentQuestionIndex - 1);
    }
}

// The summary before submitting: how many are answered, and links to the others.
function showFinishScreen() {
    stopQuestionClock();
    questionDisplayed = false;
    questionViewElement.hidden = true;
    finishScreenElement.hidden = false;

    const total = currentQuizData.length;
    // Not complete: unanswered, or a matching question with only some pairs chosen
    // (those count as answered, and are graded, but are flagged here).
    const unanswered = [];
    let answered = 0;
    currentQuizData.forEach((q, index) => {
        const status = quizLib.answerStatus(q, quizLib.selectionFor(selections, q));
        if (status !== 'none') answered++;
        if (status !== 'complete') unanswered.push({ index, partial: status === 'partial' });
    });
    progressTextElement.textContent = uiText('finishHeading');
    updateTestProgressBar();
    document.getElementById('finish-answered').textContent = uiText('finishAnsweredCount', { answered, total });
    document.getElementById('finish-unanswered-label').textContent = uiText(unanswered.length > 0 ? 'finishUnansweredLabel' : 'finishAllAnswered');

    const list = document.getElementById('finish-unanswered-list');
    list.replaceChildren();
    list.hidden = unanswered.length === 0;
    unanswered.forEach(({ index, partial }) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = partial ? 'finish-jump-btn finish-jump-partial' : 'finish-jump-btn';
        button.textContent = partial ? uiText('finishPartlyAnsweredTag', { number: index + 1 }) : String(index + 1);
        button.title = uiText(partial ? 'finishJumpToPartlyAnswered' : 'finishJumpToQuestion', { number: index + 1 });
        button.setAttribute('aria-label', button.title);
        button.onclick = () => showTestQuestion(index);
        list.appendChild(button);
    });
    saveTestProgress();
    // Focus the heading, not "Submit test", so a second Enter cannot submit by accident.
    document.getElementById('finish-heading').focus();
}

// Grades the stored answers. Called by "Submit test", and when the time runs out.
function submitTest() {
    if (!testInProgress) return;
    stopQuestionClock();
    questionDisplayed = false;
    testInProgress = false;
    window.removeEventListener('beforeunload', warnBeforeLeaving);
    clearInterval(overallTimerInterval);

    const graded = quizLib.gradeSelections(currentQuizData, selections, currentQuizMeta.uiText);
    score = graded.score;
    correctCount = graded.correctCount;
    incorrectCount = graded.incorrectCount;
    unansweredCount = graded.unansweredCount;
    answerLog = graded.answerLog;
    calculateTotalPossibleScore();
    quizLib.clearProgress(progressStorage, currentQuizMeta.id);

    initialSetupElement.style.display = 'none';
    resumePanelElement.hidden = true;
    showResults(Math.min(Date.now(), quizDeadline));
}

function startQuizFlow() {
     if (isTestMode()) {
         startTestFlow();
         return;
     }
     console.log("Starting quiz flow...");
     userName = nameInputElement.value.trim() || uiText('defaultPlayerName');
     initialSetupElement.style.display = 'none'; // Hide the entire initial setup div
     setHomeLinkVisible(false); // Leaving mid-quiz would lose progress

     const selectedCorrectionMode = document.querySelector('input[name="correction"]:checked');
     showImmediateCorrection = !isTestMode() && (selectedCorrectionMode ? selectedCorrectionMode.value === 'immediate' : true);
     console.log("Immediate Correction Mode:", showImmediateCorrection);

     quizContentElement.style.display = 'block'; // Show quiz content now


     let regularQuizQuestions = quizQuestions.filter(q => !q.isBonus);
     let bonusQuestion = quizQuestions.find(q => q.isBonus);

     quizLib.shuffleArray(regularQuizQuestions);

     currentQuizData = [...regularQuizQuestions];
     if (bonusQuestion) {
         currentQuizData.push(bonusQuestion);
     }

     currentQuestionIndex = 0;
     score = 0;
     correctCount = 0;
     incorrectCount = 0;
     currentStreak = 0;
     earnedGifts = [];
     answerLog = [];
     selections = {};
     timeSpent = {};
     optionOrders = {};
     unansweredCount = 0;

     quizStartTime = Date.now();
     calculateTotalPossibleScore();
     startOverallTimer();
     loadQuestion();
}


function startOverallTimer() {
     clearInterval(overallTimerInterval);
     timeLeft = currentQuizMeta.timing.timeLimitSeconds;
     updateTimerDisplay();
     overallTimerInterval = setInterval(() => {
         timeLeft--;
         updateTimerDisplay();
         if (timeLeft <= 0) {
             clearInterval(overallTimerInterval);
             clearTimeout(autoProceedTimeout);
             feedbackAreaElement.textContent = uiText('timesUp');
             feedbackAreaElement.className = 'feedback-incorrect';
             playSound(incorrectSound, "C3", "8n");
             showResults();
         }
     }, 1000);
 }

function updateTimerDisplay() {
     overallTimerElement.textContent = uiText('timeLeft', { time: quizLib.formatMinutesSeconds(timeLeft) });
 }

function calculateTotalPossibleScore() {
    const stats = quizLib.calculateRegularQuestionStats(currentQuizData);
    totalPossibleScore = stats.totalPossibleScore;
    totalRegularQuestions = stats.totalRegularQuestions;
 }

function updateLiveCountsAndStreak() {
    liveCorrectCountElement.textContent = uiText('liveCorrectCount', { count: correctCount });
    liveIncorrectCountElement.textContent = uiText('liveIncorrectCount', { count: incorrectCount });
    if (currentStreak > 1) {
        streakCounterElement.textContent = uiText('streakCounter', { count: currentStreak });
        streakCounterElement.classList.add('visible');
    } else {
        streakCounterElement.classList.remove('visible');
    }
}

 function updateProgressBar() {
     const progress = currentQuizData.length > 0 ? ((currentQuestionIndex) / currentQuizData.length) * 100 : 0;
     progressBarElement.style.width = `${progress}%`;
 }

 function displayLiveGifts() {
     liveGiftsElement.innerHTML = '';
     const uniqueLiveGiftClasses = [...new Set(earnedGifts.map(gift => gift.class))];
     uniqueLiveGiftClasses.forEach(giftClass => {
         const icon = document.createElement('i');
         icon.className = giftClass;
         liveGiftsElement.appendChild(icon);
     });
 }

function proceedToNextQuestion() {
     clearTimeout(autoProceedTimeout);
     nextQuestionButtonElement.style.display = 'none';
     stopQuestionClock();
     currentQuestionIndex++;
     loadQuestion();
 }

function scheduleOrWaitForNext() {
    clearTimeout(autoProceedTimeout);
    const currentQuestion = currentQuizData[currentQuestionIndex];
    const isIncorrectAndImmediateCorrection = !currentQuestion.isBonus && showImmediateCorrection && feedbackAreaElement.classList.contains('feedback-incorrect');

    if (isIncorrectAndImmediateCorrection) {
        nextQuestionButtonElement.style.display = 'inline-block';
        submitButton.style.display = 'none';
    } else {
        autoProceedTimeout = setTimeout(proceedToNextQuestion, currentQuizMeta.timing.autoAdvanceDelayMs);
    }
}

function triggerFeedbackFlash(isCorrect, isBonus = false) {
    feedbackFlashElement.className = 'feedback-flash';
    void feedbackFlashElement.offsetWidth;
    if (isBonus && isCorrect) {
         feedbackFlashElement.classList.add('bonus-flash');
    } else if (isCorrect) {
        feedbackFlashElement.classList.add('correct-flash');
    } else {
        feedbackFlashElement.classList.add('incorrect-flash');
    }
}


function loadQuestion() {
    optionsAreaElement.innerHTML = '';
    feedbackAreaElement.textContent = '';
    feedbackAreaElement.className = '';
    userAnswers = {};
    submitButton.style.display = 'none';
    nextQuestionButtonElement.style.display = 'none';
    submitButton.disabled = false;

    if (currentQuestionIndex >= currentQuizData.length) {
        showResults();
        return;
    }

    const currentQuestion = currentQuizData[currentQuestionIndex];

    updateProgressBar();
    if (currentQuestion.isBonus) {
         progressTextElement.textContent = uiText('bonusProgress');
    } else {
         const regularQuestionIndex = currentQuizData.slice(0, currentQuestionIndex + 1).filter(q => !q.isBonus).length;
         progressTextElement.textContent = uiText('questionProgress', { current: regularQuestionIndex, total: totalRegularQuestions });
    }

    updateLiveCountsAndStreak();
    displayLiveGifts();


    questionTextElement.textContent = currentQuestion.prompt;
    const existingLabel = questionTextElement.querySelector('.bonus-question-label');
    if (existingLabel) existingLabel.remove();

    if (currentQuestion.isBonus) {
        const bonusLabel = document.createElement('span');
        bonusLabel.textContent = uiText('bonusBadge');
        bonusLabel.classList.add('bonus-question-label');
        questionTextElement.prepend(bonusLabel);
    }


    switch (currentQuestion.type) {
        case "mcq": loadMCQOptions(currentQuestion); break;
        case "matching":
            loadMatchingOptions(currentQuestion, {}, (left, value) => { userAnswers[left] = value; updateQuizSubmitButton(currentQuestion); });
            submitButton.style.display = 'inline-block';
            break;
        case "statements":
            loadStatementsOptions(currentQuestion, {}, (statementIndex, value) => { userAnswers[statementIndex] = value; updateQuizSubmitButton(currentQuestion); });
            submitButton.style.display = 'inline-block';
            break;
        case "spot":
            loadSpotOptions(currentQuestion, null, (wordIndex, button) => handleSpotAnswer(currentQuestion, wordIndex, button));
            break;
        case "text":
            loadTextOptions(currentQuestion, '', value => { userAnswers.text = value; updateQuizSubmitButton(currentQuestion); });
            submitButton.style.display = 'inline-block';
            break;
    }
    updateQuizSubmitButton(currentQuestion);
    showKeyboardHint(currentQuestion);
    questionDisplayed = true;
    startQuestionClock();
}

function loadMCQOptions(question) {
     getOptionOrder(question).forEach(optionText => {
        const button = document.createElement('button');
        button.textContent = optionText;
        button.classList.add('mcq-option', 'choice-btn');
        button.onclick = () => handleMCQAnswer(optionText, question, button);
        optionsAreaElement.appendChild(button);
    });
 }

function handleMCQAnswer(selectedOption, question, buttonElement) {
    document.querySelectorAll('.mcq-option').forEach(btn => btn.disabled = true);
    buttonElement.classList.add('selected');

    const result = quizLib.checkMCQAnswer(question, selectedOption, showImmediateCorrection, currentQuizMeta.uiText);
    recordQuizAnswer(question, selectedOption, result);
    showInstantFeedback(question, result);
}

// Quiz mode: keeps an answer for the per-skill results, the review and the results file.
function recordQuizAnswer(question, selection, result) {
    answerLog.push({ questionId: question.id, isCorrect: result.isCorrect, points: result.pointsAwarded });
    selections[String(question.id)] = selection;
}

// Quiz mode: score, streak, sound and feedback after an answer (mcq, spot, text, statements).
// `pointsAwarded` is added even when not fully correct (partial credit for statements).
function showInstantFeedback(question, result) {
    score += result.pointsAwarded;
    if (result.isCorrect) {
        if (!question.isBonus) {
            correctCount++;
        }
        currentStreak++;
        feedbackAreaElement.textContent = result.feedback;
        feedbackAreaElement.className = 'feedback-correct';
        playSound(correctSound, "C5", "8n");
        triggerFeedbackFlash(true, question.isBonus);
        checkStreakForGift();
    } else {
        if (!question.isBonus) {
            incorrectCount++;
        }
        currentStreak = 0;
        feedbackAreaElement.innerHTML = result.feedback;
        feedbackAreaElement.className = 'feedback-incorrect';
        playSound(incorrectSound, "C3", "8n");
        triggerFeedbackFlash(false, question.isBonus);
    }

    if (!question.isBonus) {
        updateLiveCountsAndStreak();
    }

    scheduleOrWaitForNext();
}

// Quiz mode: Submit is enabled once every match / statement has a choice, or text is typed.
function updateQuizSubmitButton(question) {
    if (!['matching', 'statements', 'text'].includes(question.type)) return;
    const answer = question.type === 'text' ? userAnswers.text : userAnswers;
    submitButton.disabled = quizLib.answerStatus(question, answer) !== 'complete';
}

function handleSpotAnswer(question, wordIndex, button) {
    optionsAreaElement.querySelectorAll('.spot-word').forEach(word => { word.disabled = true; });
    button.classList.add('selected');
    const result = quizLib.checkSpotAnswer(question, wordIndex, showImmediateCorrection, currentQuizMeta.uiText);
    if (!result.isCorrect && showImmediateCorrection && !question.isBonus) {
        optionsAreaElement.querySelectorAll('.spot-word').forEach(word => {
            if (word.textContent === question.answer) word.classList.add('spot-correct');
        });
        button.classList.add('spot-wrong');
    }
    recordQuizAnswer(question, wordIndex, result);
    showInstantFeedback(question, result);
}

function handleStatementsSubmit() {
    const question = currentQuizData[currentQuestionIndex];
    submitButton.disabled = true;
    optionsAreaElement.querySelectorAll('.statement-choice').forEach(button => { button.disabled = true; });
    const result = quizLib.checkStatementsAnswer(question, userAnswers, showImmediateCorrection, currentQuizMeta.uiText);
    if (showImmediateCorrection && !question.isBonus) {
        // Each statement marked right or wrong, with the right answer and its explanation.
        optionsAreaElement.querySelectorAll('.statement-row').forEach((row, index) => {
            const statement = question.statements[index];
            row.classList.add(result.results[index] ? 'statement-right' : 'statement-wrong');
            if (!result.results[index]) {
                const reveal = document.createElement('p');
                reveal.className = 'statement-reveal';
                reveal.textContent = uiText('statementCorrectReveal', { answer: quizLib.statementAnswerLabel(statement.answer, currentQuizMeta.uiText) });
                if (statement.explanation) reveal.append(' — ', statement.explanation);
                row.appendChild(reveal);
            }
        });
    }
    recordQuizAnswer(question, { ...userAnswers }, result);
    showInstantFeedback(question, result);
}

function handleTextSubmit() {
    const question = currentQuizData[currentQuestionIndex];
    const input = optionsAreaElement.querySelector('.text-answer');
    if (!input || input.value.trim() === '') {
        if (input) input.focus();
        return;
    }
    submitButton.disabled = true;
    input.disabled = true;
    const result = quizLib.checkTextAnswer(question, input.value, showImmediateCorrection, currentQuizMeta.uiText);
    input.classList.add(result.isCorrect ? 'text-answer-right' : 'text-answer-wrong');
    recordQuizAnswer(question, input.value, result);
    showInstantFeedback(question, result);
}

 function checkStreakForGift() {
     const giftClass = quizLib.getNewStreakGiftClass({ currentStreak, streakRewards: currentStreakRewards, earnedGifts });

     if (giftClass) {
         earnedGifts.push({ class: giftClass, source: 'streak' });
         console.log(`Streak Gift earned: ${giftClass} for streak ${currentStreak}`);
         displayLiveGifts();
         playSound(giftSound, "E5", "16n");
     }
 }


// `initial`: matches already chosen ({ left: right }); `onChange(left, right)` is called on each change.
function loadMatchingOptions(question, initial = {}, onChange = (left, value) => { userAnswers[left] = value; }) {
     const container = document.createElement('div');
     container.classList.add('matching-container');
     const leftItems = question.pairs.map(pair => pair[0]);
     const rightItems = getOptionOrder(question);

     leftItems.forEach((leftItem) => {
         const leftElement = document.createElement('div');
         leftElement.textContent = leftItem;
         leftElement.classList.add('match-item-left');
         const selectElement = document.createElement('select');
         selectElement.classList.add('match-select');
         selectElement.dataset.leftItem = leftItem;
         const defaultOption = document.createElement('option');
         defaultOption.value = "";
         defaultOption.textContent = uiText('matchPlaceholder');
         selectElement.appendChild(defaultOption);
         rightItems.forEach(rightItem => {
             const optionElement = document.createElement('option');
             optionElement.value = rightItem;
             optionElement.textContent = rightItem;
             selectElement.appendChild(optionElement);
         });
         selectElement.value = initial[leftItem] || '';
          selectElement.onchange = (event) => {
              onChange(leftItem, event.target.value);
          };
         container.appendChild(leftElement);
         container.appendChild(selectElement);
     });
     optionsAreaElement.appendChild(container);
 }

 function handleMatchingSubmit() {
     submitButton.disabled = true;
     const currentQuestion = currentQuizData[currentQuestionIndex];

     const result = quizLib.checkMatchingAnswer(currentQuestion, userAnswers, showImmediateCorrection, currentQuizMeta.uiText);
     answerLog.push({ questionId: currentQuestion.id, isCorrect: result.isCorrect });
     selections[String(currentQuestion.id)] = { ...userAnswers };
     optionsAreaElement.querySelectorAll('.match-select').forEach(sel => sel.disabled = true);
     if (currentQuestion.isBonus) {
         if (result.isCorrect) {
             feedbackAreaElement.textContent = result.feedback;
             feedbackAreaElement.className = 'feedback-bonus';
             if (currentBonusGiftClass && !earnedGifts.some(gift => gift.class === currentBonusGiftClass && gift.source === 'bonus')) {
                 earnedGifts.push({ class: currentBonusGiftClass, source: 'bonus' });
             }
             displayLiveGifts();
             playSound(giftSound, "G5", "8n");
             triggerFeedbackFlash(true, true);
         } else {
             feedbackAreaElement.innerHTML = result.feedback;
             feedbackAreaElement.className = 'feedback-incorrect';
             playSound(incorrectSound, "C3", "8n");
             triggerFeedbackFlash(false);
         }
     } else {
         score += result.pointsAwarded;
         if (result.isCorrect) {
             correctCount++;
             currentStreak++;
             feedbackAreaElement.textContent = result.feedback;
             feedbackAreaElement.className = 'feedback-correct';
             playSound(correctSound, "C5", "8n");
             triggerFeedbackFlash(true);
             checkStreakForGift();
         } else {
             incorrectCount++;
             currentStreak = 0;
             feedbackAreaElement.innerHTML = result.feedback;
             feedbackAreaElement.className = 'feedback-submitted';
             playSound(incorrectSound, "C3", "8n");
             triggerFeedbackFlash(false);
         }
         updateLiveCountsAndStreak();
     }

     scheduleOrWaitForNext();
 }


// `endTime` (ms): when the quiz ended; defaults to now.
function showResults(endTime) {
    quizEndTime = endTime ?? Date.now();
    clearInterval(overallTimerInterval);
    clearTimeout(autoProceedTimeout);
    stopQuestionClock();
    questionDisplayed = false;

    quizContentElement.style.display = 'none';

    finalScoreElement.textContent = score;
    totalPossibleScoreElement.textContent = totalPossibleScore;
    correctAnswersCountElement.textContent = correctCount;
    incorrectAnswersCountElement.textContent = incorrectCount;
    document.getElementById('unanswered-answers-count').textContent = unansweredCount;
    document.getElementById('unanswered-summary').hidden = !(isTestMode() && unansweredCount > 0);

    const durationSeconds = Math.max(0, Math.floor((quizEndTime - quizStartTime) / 1000));
    timeTakenElement.textContent = quizLib.formatMinutesSeconds(durationSeconds);

    // Every question asked, with the participant's answer, for the review and the results file
    const graded = quizLib.gradeSelections(currentQuizData, selections, currentQuizMeta.uiText, optionOrders);
    lastResults = {
        date: new Date(quizEndTime),
        durationSeconds,
        score,
        totalPossibleScore,
        items: graded.items,
        skillRows: quizLib.calculateSkillResults(currentQuizMeta.skills, currentQuizData, answerLog, timeSpent),
    };

    resultMessageElement.textContent = quizLib.getResultMessage({
        score,
        totalPossibleScore,
        userName,
        resultBands: currentQuizMeta.scoring.resultBands,
    });

    populateSkillBreakdown();

    // Test mode has no gifts or achievements to show.
    if (isTestMode()) {
        achievementsListElement.parentElement.style.display = 'none';
    } else {
        populateAchievements();
        achievementsListElement.parentElement.style.display = 'block';
    }

    sendResultsToFacilitators(durationSeconds);

    reviewFilter = 'wrong';
    renderReview();
    reviewSection.style.display = currentQuizMeta.showAnswerReview ? 'block' : 'none';

    // The score image is part of the quiz game; a test shares its results file instead.
    shareScoreButton.style.display = isTestMode() ? 'none' : 'inline-block';
    downloadResultsButton.style.display = 'inline-block';
    shareResultsButton.hidden = !canShareResultsFile();


    resultAreaElement.style.display = 'block';
    setHomeLinkVisible(true);
    playSound(completeSound, "G4", "4n");
}

// --- Results sent to the facilitators (meta.json "collectResults": true) ---
// The submission goes into the outbox first (localStorage), so it is retried
// on the next page load if sending fails or the tab is closed meanwhile.
let pendingSubmission = null;

function sendResultsToFacilitators(durationSeconds) {
    const area = document.getElementById('results-send');
    if (!currentQuizMeta.collectResults) {
        pendingSubmission = null;
        area.hidden = true;
        return;
    }
    pendingSubmission = quizLib.buildSubmission({
        id: quizLib.createSubmissionId(),
        quizId: currentQuizMeta.id,
        quizVersion: quizLib.quizFingerprint(quizQuestions),
        name: userName,
        startedAt: quizStartTime,
        timeTakenSeconds: durationSeconds,
        selections,
        timeSpent,
        optionOrders,
    });
    quizLib.enqueueSubmission(quizLib.getStorage(window), pendingSubmission);
    area.hidden = false;
    trySendingResults();
}

async function trySendingResults() {
    const submission = pendingSubmission;
    if (!submission) return;
    showSendStatus('sending');
    const storage = quizLib.getStorage(window);
    let outcome;
    try {
        ({ outcome } = await quizLib.sendSubmission(storage, submission));
    } catch (error) {
        console.error('Error sending results:', error);
        outcome = 'retry';
    }
    if (pendingSubmission !== submission) return;
    showSendStatus(outcome);
    // A connection that works again also sends anything left from earlier.
    if (outcome === 'sent') quizLib.flushOutbox(storage).catch(() => {});
}

function showSendStatus(outcome) {
    const status = document.getElementById('results-send-status');
    const retryButton = document.getElementById('results-retry-btn');
    const messages = { sending: 'resultsSending', sent: 'resultsSent', rejected: 'resultsSendRejected', retry: 'resultsSendFailed' };
    status.textContent = uiText(messages[outcome] || 'resultsSendFailed');
    status.className = outcome === 'sent' ? 'send-ok' : outcome === 'sending' ? '' : 'send-failed';
    retryButton.hidden = outcome !== 'retry';
}

function populateSkillBreakdown() {
    const section = document.getElementById('skill-breakdown');
    const list = document.getElementById('skill-breakdown-list');
    const rows = lastResults.skillRows;

    list.innerHTML = '';
    section.hidden = rows.length === 0;
    for (const row of rows) {
        const item = document.createElement('li');
        const label = document.createElement('span');
        label.className = 'skill-label';
        label.textContent = row.label;
        const bar = document.createElement('span');
        bar.className = 'skill-bar';
        const fill = document.createElement('span');
        fill.className = 'skill-bar-fill';
        fill.style.width = `${(row.correct / row.total) * 100}%`;
        bar.appendChild(fill);
        const value = document.createElement('span');
        value.className = 'skill-score';
        value.textContent = quizLib.skillScoreText(row, currentQuizMeta.uiText);
        item.append(label, bar, value);
        list.appendChild(item);
    }
}

function populateAchievements() {
    achievementsListElement.innerHTML = '';
    let achievementsDisplayed = false;
    let bonusCandyAwardedThisTime = currentBonusGiftClass
        ? earnedGifts.some(gift => gift.source === 'bonus' && gift.class === currentBonusGiftClass)
        : false;

    // Display streak gifts
    const streakGiftsDisplayed = new Set();
    earnedGifts.filter(gift => gift.source === 'streak').forEach(gift => {
        if (!streakGiftsDisplayed.has(gift.class)) {
            const li = document.createElement('li');
            li.classList.add('gift-icon');
            const icon = document.createElement('i');
            icon.className = gift.class;
            li.appendChild(icon);
            achievementsListElement.appendChild(li);
            achievementsDisplayed = true;
            streakGiftsDisplayed.add(gift.class);
        }
    });

    // Display the bonus candy separately if awarded
    if (bonusCandyAwardedThisTime) {
         const li = document.createElement('li');
         li.classList.add('bonus-gift-item');
         const icon = document.createElement('i');
            icon.className = currentBonusGiftClass;
         li.appendChild(icon);
         li.append(' ' + uiText('bonusGiftLabel'));
         achievementsListElement.appendChild(li);
         achievementsDisplayed = true;
    }

     const regularQuestionsFromSession = currentQuizData.filter(q => !q.isBonus && q.points > 0);
     const maxRegularScore = regularQuestionsFromSession.reduce((sum, q) => sum + q.points, 0);

     if (correctCount === regularQuestionsFromSession.length && regularQuestionsFromSession.length > 0) {
         const li = document.createElement('li');
         li.classList.add('achievement-text');
         li.textContent = getAchievementLabel('perfectScore');
         li.style.backgroundColor = "#fff3cd"; li.style.color = "#664d03";
         achievementsListElement.appendChild(li);
         achievementsDisplayed = true;
     } else if (maxRegularScore > 0 && score / maxRegularScore >= 0.7) {
         const li = document.createElement('li');
         li.classList.add('achievement-text');
         li.textContent = getAchievementLabel('highScore');
         li.style.backgroundColor = "#cfe2ff"; li.style.color = "#0a58ca";
         achievementsListElement.appendChild(li);
         achievementsDisplayed = true;
     }

     if (!achievementsDisplayed) {
          achievementsListElement.innerHTML = `<li>${getAchievementLabel('noAchievements')}</li>`;
     }
}


// Review of the participant's answers: answer key cards with their answer marked.
function renderReview() {
    if (!lastResults) return;
    const items = quizLib.filterReviewItems(lastResults.items, reviewFilter);
    reviewCardsElement.replaceChildren();
    if (items.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'review-empty';
        empty.textContent = uiText('reviewNothingToReview');
        reviewCardsElement.appendChild(empty);
    }
    for (const item of items) {
        reviewCardsElement.appendChild(quizLib.renderQuestionCard(item.question, item.number, currentQuizMeta.uiText, item.response));
    }
    document.getElementById('review-filter-wrong').setAttribute('aria-pressed', String(reviewFilter === 'wrong'));
    document.getElementById('review-filter-all').setAttribute('aria-pressed', String(reviewFilter === 'all'));
}

function setReviewFilter(filter) {
    reviewFilter = filter;
    renderReview();
}

// --- Download and share the results as a single HTML file ---
function buildResultsFile() {
    const html = quizLib.buildResultsHtml({
        meta: currentQuizMeta,
        name: userName,
        date: lastResults.date,
        durationSeconds: lastResults.durationSeconds,
        score: lastResults.score,
        totalPossibleScore: lastResults.totalPossibleScore,
        skillRows: lastResults.skillRows,
        items: lastResults.items,
        review: currentQuizMeta.showAnswerReview,
        doc: document,
    });
    const fileName = quizLib.resultsFileName(currentQuizMeta.id, userName, lastResults.date);
    return { html, fileName };
}

function downloadResults() {
    if (!lastResults) return;
    const { html, fileName } = buildResultsFile();
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function makeResultsFile() {
    const { html, fileName } = buildResultsFile();
    return new File([html], fileName, { type: 'text/html' });
}

function canShareResultsFile() {
    try {
        return Boolean(lastResults && typeof File === 'function' && navigator.canShare && navigator.share &&
            navigator.canShare({ files: [makeResultsFile()] }));
    } catch {
        return false;
    }
}

async function shareResults() {
    if (!lastResults) return;
    try {
        await navigator.share({
            files: [makeResultsFile()],
            title: uiText('shareResultsTitle', { title: currentQuizMeta.title, name: userName }),
        });
    } catch (error) {
        if (error && error.name === 'AbortError') return; // the participant closed the share sheet
        console.error('Error sharing results:', error);
        alert(uiText('shareResultsFailed'));
    }
}

function toggleReview() {
     if (reviewContent.style.display === 'none' || reviewContent.style.display === '') {
         reviewContent.style.display = 'block';
         reviewToggleButton.textContent = currentQuizMeta.uiText.reviewToggleOpen;
     } else {
         reviewContent.style.display = 'none';
         reviewToggleButton.textContent = currentQuizMeta.uiText.reviewToggleClosed;
     }
 }

async function shareScoreAsImage() {
    const elementToCapture = scoreCardElement;
    const buttonsToHide = resultAreaElement.querySelectorAll('.result-buttons, #review-section');

    buttonsToHide.forEach(el => el.classList.add('hide-for-screenshot'));

    try {
        if (typeof html2canvas === 'undefined') {
            alert(uiText('shareNotReady'));
            return;
        }
        const canvas = await html2canvas(elementToCapture, {
            backgroundColor: '#e7f0fe',
            logging: false,
            useCORS: true
        });
        const imageDataUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = imageDataUrl;
        downloadLink.download = quizLib.getShareFileName(currentQuizMeta.scoring);
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    } catch (error) {
        console.error('Error generating score image:', error);
        alert(uiText('shareFailed'));
    } finally {
         buttonsToHide.forEach(el => el.classList.remove('hide-for-screenshot'));
    }
}


// --- Keyboard shortcuts ---
// 1–9 / A–Z choose that option; Enter = Next; in test mode ← / → = Back / Next.
function handleShortcutKey(event) {
    if (!quizLib || !currentQuizMeta || !questionDisplayed) return;
    // Keys used to compose text (Indic and other input methods) are not shortcuts.
    if (event.isComposing || event.keyCode === 229) return;
    // Enter in a typed-answer box submits it (quiz) or goes to the next question (test);
    // every other key typed there is left alone.
    if (event.key === 'Enter' && event.target instanceof HTMLElement && event.target.classList.contains('text-answer')) {
        event.preventDefault();
        if (isTestMode()) {
            goToNextTestQuestion();
        } else if (submitButton.style.display !== 'none' && !submitButton.disabled) {
            handleTextSubmit();
        }
        return;
    }
    if (quizLib.isTypingTarget(event.target)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const question = currentQuizData[currentQuestionIndex];
    if (!question) return;

    if (event.key === 'Enter') {
        // A focused button outside the options (Back, Next…) handles Enter itself.
        if (event.target instanceof HTMLButtonElement && !optionsAreaElement.contains(event.target)) return;
        if (isTestMode()) {
            event.preventDefault();
            // Enter on a focused choice (option, True/False/Can't tell, word) that is not
            // yet chosen chooses it; otherwise it is Next.
            const option = event.target instanceof HTMLElement ? event.target.closest('.choice-btn') : null;
            if (option && optionsAreaElement.contains(option) && !option.classList.contains('selected')) {
                option.click();
            } else {
                goToNextTestQuestion();
            }
        } else if (nextQuestionButtonElement.style.display !== 'none') {
            event.preventDefault();
            proceedToNextQuestion();
        }
        return;
    }
    if (isTestMode() && event.key === 'ArrowRight') {
        event.preventDefault();
        goToNextTestQuestion();
        return;
    }
    if (isTestMode() && event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPreviousTestQuestion();
        return;
    }

    const index = quizLib.optionIndexForKey(event.key);
    if (index === null || question.type !== 'mcq') return;
    const button = optionsAreaElement.querySelectorAll('.mcq-option')[index];
    if (!button || button.disabled) return;
    event.preventDefault();
    button.click();
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    getDOMElements();

    startQuizButton.addEventListener('click', async () => { // Single start button
         if (!isAudioContextStarted && Tone.context.state !== 'running') {
             try {
                 await Tone.start();
                 isAudioContextStarted = true;
                 console.log("Audio Context Started by Start Button.");
                 defineSynths();
             } catch (e) {
                 console.error("Error starting Audio Context on start button:", e);
             }
         } else {
              isAudioContextStarted = true;
              if (!correctSound) defineSynths();
         }

            startQuizFlow();
     });


     submitButton.addEventListener('click', () => {
        const currentQuestion = currentQuizData[currentQuestionIndex];
          if (currentQuestion.type === "statements") {
            handleStatementsSubmit();
          } else if (currentQuestion.type === "text") {
            handleTextSubmit();
          } else if (currentQuestion.type === "matching") {
            handleMatchingSubmit();
        }
     });

    nextQuestionButtonElement.addEventListener('click', () => {
        proceedToNextQuestion();
    });

    // Removed proceedToRealQuizButton listener

    reviewToggleButton.addEventListener('click', toggleReview);
    shareScoreButton.addEventListener('click', shareScoreAsImage);
    document.getElementById('review-filter-wrong').addEventListener('click', () => setReviewFilter('wrong'));
    document.getElementById('review-filter-all').addEventListener('click', () => setReviewFilter('all'));
    downloadResultsButton.addEventListener('click', downloadResults);
    shareResultsButton.addEventListener('click', shareResults);
    document.getElementById('results-retry-btn').addEventListener('click', trySendingResults);

    // Test mode
    nameInputElement.addEventListener('input', () => { if (currentQuizMeta) updateStartButton(); });
    testNextButton.addEventListener('click', goToNextTestQuestion);
    testBackButton.addEventListener('click', goToPreviousTestQuestion);
    document.getElementById('back-to-test-btn').addEventListener('click', () => showTestQuestion(currentQuestionIndex));
    document.getElementById('submit-test-btn').addEventListener('click', submitTest);
    document.getElementById('start-over-btn').addEventListener('click', startOver);

    document.addEventListener('keydown', handleShortcutKey);

    // On-screen time stops while the page is hidden (another tab, phone locked).
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopQuestionClock();
            saveTestProgress();
        } else if (questionDisplayed) {
            startQuestionClock();
        }
    });
    window.addEventListener('pagehide', () => saveTestProgress());

    initPage();

});
