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
    nextQuestionButtonElement, initialSetupElement;

// --- Quiz State ---
let currentQuestionIndex = 0;
let score = 0;
let correctCount = 0;
let incorrectCount = 0;
let currentStreak = 0;
let earnedGifts = []; // Will store objects like { class: 'fas fa-icon', source: 'streak'/'bonus' }
let userAnswers = {};
let incorrectlyAnsweredQuestions = []; // Now stores { questionText, userAnswer, correctAnswer, justification, isMatching? }
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

async function playSound(synth, note, duration) {
    if (typeof Tone === 'undefined') return;

    if (!isAudioContextStarted && Tone.context.state !== 'running') {
        try {
            await Tone.start();
            isAudioContextStarted = true;
            console.log("Audio Context Started by playSound.");
            defineSynths();
        } catch (e) {
            console.error("Error starting Audio Context:", e);
            return;
        }
    } else if (!isAudioContextStarted && Tone.context.state === 'running') {
        isAudioContextStarted = true;
         defineSynths();
    }

    if (synth) {
        if (Tone.context.state === 'running') {
            synth.triggerAttackRelease(note, duration, Tone.now());
        } else {
            console.warn("Audio context suspended, trying to resume and play.");
             Tone.start().then(() => {
                 isAudioContextStarted = true;
                 synth.triggerAttackRelease(note, duration, Tone.now());
             }).catch(e => console.error("Could not resume context to play sound:", e));
        }
    } else {
        console.warn("Synth not ready, attempting to define and play again.");
        defineSynths();
        if(synth && Tone.context.state === 'running') {
             synth.triggerAttackRelease(note, duration, Tone.now());
        } else {
            console.error("Synth still not defined or context not running after attempting re-initialization.");
        }
    }
}

// With ?quiz=<id>, loads that quiz and fills the page with its title, logo and
// labels. Without it, shows the home page: the quizzes listed in quizzes/registry.json.
async function initPage() {
    let loader;
    try {
        let utils, runtime;
        [loader, utils, runtime] = await Promise.all([
            import('./app/loader.js'),
            import('./app/utils.js'),
            import('./app/runtime.js'),
        ]);
        quizLib = { ...utils, ...runtime };
    } catch (error) {
        showQuizLoadError(error);
        return;
    }

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
        startQuizButton.disabled = false;
    } catch (error) {
        showQuizLoadError(error);
    }
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

// In test mode an answer is recorded silently, then the test moves on.
function recordTestAnswer(question, result) {
    score += result.pointsAwarded;
    if (result.isCorrect) {
        correctCount++;
    } else {
        incorrectCount++;
        if (result.reviewItem) {
            incorrectlyAnsweredQuestions.push(result.reviewItem);
        }
    }
    feedbackAreaElement.textContent = uiText('answerSaved');
    feedbackAreaElement.className = 'feedback-submitted';
    scheduleOrWaitForNext();
}

function getAchievementLabel(labelKey) {
    return currentQuizMeta.gamification.achievementLabels[labelKey];
}

function startQuizFlow() {
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
     incorrectlyAnsweredQuestions = [];
     answerLog = [];

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
        case "matching": loadMatchingOptions(currentQuestion); submitButton.style.display = 'inline-block'; break;
    }
}

function loadMCQOptions(question) {
     let regularOptions = [];
     let specialOptions = [];

     question.options.forEach(optionText => {
         const lowerCaseOption = optionText.toLowerCase().trim();
         if (lowerCaseOption === "all the above" || lowerCaseOption === "none of the above") {
             specialOptions.push(optionText);
         } else {
             regularOptions.push(optionText);
         }
     });

     quizLib.shuffleArray(regularOptions);
     const finalOptions = [...regularOptions, ...specialOptions];

     finalOptions.forEach(optionText => {
        const button = document.createElement('button');
        button.textContent = optionText;
        button.classList.add('mcq-option');
        button.onclick = () => handleMCQAnswer(optionText, question, button);
        optionsAreaElement.appendChild(button);
    });
 }

function handleMCQAnswer(selectedOption, question, buttonElement) {
    document.querySelectorAll('.mcq-option').forEach(btn => btn.disabled = true);
    buttonElement.classList.add('selected');

    const result = quizLib.checkMCQAnswer(question, selectedOption, showImmediateCorrection, currentQuizMeta.uiText);
    answerLog.push({ questionId: question.id, isCorrect: result.isCorrect });
    if (isTestMode()) {
        recordTestAnswer(question, result);
        return;
    }
    if (result.isCorrect) {
        score += result.pointsAwarded;
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
        if (result.reviewItem) {
            incorrectlyAnsweredQuestions.push(result.reviewItem);
        }
    }

    if (!question.isBonus) {
        updateLiveCountsAndStreak();
    }

    scheduleOrWaitForNext();
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


function loadMatchingOptions(question) {
     const container = document.createElement('div');
     container.classList.add('matching-container');
     const leftItems = question.pairs.map(pair => pair[0]);
     const rightItems = question.pairs.map(pair => pair[1]);
     quizLib.shuffleArray(rightItems);

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
          selectElement.onchange = (event) => {
              userAnswers[leftItem] = event.target.value;
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
     optionsAreaElement.querySelectorAll('.match-select').forEach(sel => sel.disabled = true);
     if (isTestMode()) {
         recordTestAnswer(currentQuestion, result);
         return;
     }
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
             if (result.reviewItem) {
                 incorrectlyAnsweredQuestions.push(result.reviewItem);
             }
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
             if (result.reviewItem) {
                 incorrectlyAnsweredQuestions.push(result.reviewItem);
             }
         }
         updateLiveCountsAndStreak();
     }

     scheduleOrWaitForNext();
 }


function showResults() {
    quizEndTime = Date.now();
    clearInterval(overallTimerInterval);
    clearTimeout(autoProceedTimeout);

    quizContentElement.style.display = 'none';

    finalScoreElement.textContent = score;
    totalPossibleScoreElement.textContent = totalPossibleScore;
    correctAnswersCountElement.textContent = correctCount;
    incorrectAnswersCountElement.textContent = incorrectCount;

    const durationMs = quizEndTime - quizStartTime;
    const durationSeconds = Math.floor(durationMs / 1000);
    const minutesTaken = Math.floor(durationSeconds / 60);
    const secondsTaken = durationSeconds % 60;
    timeTakenElement.textContent = `${minutesTaken}:${secondsTaken < 10 ? '0' : ''}${secondsTaken}`;

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

    populateReviewSection();
    const canReview = currentQuizMeta.showAnswerReview && incorrectlyAnsweredQuestions.length > 0;
    reviewSection.style.display = canReview ? 'block' : 'none';

    shareScoreButton.style.display = 'inline-block';


    resultAreaElement.style.display = 'block';
    setHomeLinkVisible(true);
    playSound(completeSound, "G4", "4n");
}

function populateSkillBreakdown() {
    const section = document.getElementById('skill-breakdown');
    const list = document.getElementById('skill-breakdown-list');
    const rows = quizLib.calculateSkillBreakdown(currentQuizMeta.skills, currentQuizData, answerLog);

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
        value.textContent = uiText('skillScore', { correct: row.correct, total: row.total });
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


function populateReviewSection() {
     reviewContent.innerHTML = '';
     if (incorrectlyAnsweredQuestions.length === 0) {
         reviewContent.innerHTML = `<p>${uiText('reviewNothingToReview')}</p>`;
         return;
     }
     incorrectlyAnsweredQuestions.forEach(item => {
         const div = document.createElement('div');
         div.classList.add('review-item');
         const qText = document.createElement('p');
         qText.innerHTML = `<strong>${uiText('reviewQuestionLabel')}</strong> ${item.questionText}`;
         div.appendChild(qText);

         if (item.isMatching) {
             const userAnsText = document.createElement('p');
             userAnsText.innerHTML = `<strong>${uiText('reviewYourMatchesLabel')}</strong>`;
             div.appendChild(userAnsText);
             const userList = document.createElement('ul');
             userList.style.listStyle = 'none'; userList.style.paddingLeft = '15px';
              for (const left in item.userAnswer) {
                  const li = document.createElement('li');
                  li.innerHTML = `${left} &rarr; <span class="review-user-answer">${item.userAnswer[left]}</span>`;
                  userList.appendChild(li);
              }
              div.appendChild(userList);
             const correctAnsText = document.createElement('p');
             correctAnsText.innerHTML = `<strong>${uiText('reviewCorrectMatchesLabel')}</strong>`;
              div.appendChild(correctAnsText);
              const correctList = document.createElement('ul');
              correctList.style.listStyle = 'none'; correctList.style.paddingLeft = '15px';
              for (const left in item.correctAnswer) {
                  const li = document.createElement('li');
                  li.innerHTML = `${left} &rarr; <span class="review-correct-answer">${item.correctAnswer[left]}</span>`;
                  correctList.appendChild(li);
              }
              div.appendChild(correctList);
         } else {
             const userAnsText = document.createElement('p');
             userAnsText.innerHTML = `<strong>${uiText('reviewYourAnswerLabel')}</strong> <span class="review-user-answer">${item.userAnswer}</span>`;
             div.appendChild(userAnsText);

             const correctAnsText = document.createElement('p');
             correctAnsText.innerHTML = `<strong>${uiText('reviewCorrectAnswerLabel')}</strong> <span class="review-correct-answer">${item.correctAnswer}</span>`;
             div.appendChild(correctAnsText);
         }

         if (item.justification) {
             const justificationText = document.createElement('p');
             justificationText.style.marginTop = '8px';
             justificationText.style.fontStyle = 'italic';
             justificationText.style.fontSize = '0.9em';
             justificationText.innerHTML = `<strong>${uiText('explanationPrefix')}</strong> ${item.justification}`;
             div.appendChild(justificationText);
         }

         reviewContent.appendChild(div);
     });
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
         } else if (!correctSound){
              defineSynths();
         }

            startQuizFlow();
     });


     submitButton.addEventListener('click', () => {
        const currentQuestion = currentQuizData[currentQuestionIndex];
          if (currentQuestion.type === "matching") {
            handleMatchingSubmit();
        }
     });

    nextQuestionButtonElement.addEventListener('click', () => {
        proceedToNextQuestion();
    });

    // Removed proceedToRealQuizButton listener

    reviewToggleButton.addEventListener('click', toggleReview);
    shareScoreButton.addEventListener('click', shareScoreAsImage);

    initPage();

});
