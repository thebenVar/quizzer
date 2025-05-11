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
    resultNameElement, resultMessageElement, correctionModeSelectorElement,
    nextQuestionButtonElement, initialSetupElement; // Removed practice/real quiz buttons

// --- Quiz State ---
let currentQuestionIndex = 0;
let score = 0;
let correctCount = 0;
let incorrectCount = 0;
let currentStreak = 0;
let earnedGifts = []; // Will store objects like { class: 'fas fa-icon', source: 'streak'/'bonus' }
let userAnswers = {};
let incorrectlyAnsweredQuestions = []; // Now stores { questionText, userAnswer, correctAnswer, justification, isMatching? }
// userRating removed
let totalPossibleScore = 0;
let overallTimerInterval;
let timeLeft = 60 * 60; // Default to 60 minutes
let autoProceedTimeout;
let quizStartTime;
let quizEndTime;
let totalRegularQuestions = 0;
let userName = "Quiz Taker"; // Default name
let currentQuizData = []; // This will hold the main quiz data after setup
let showImmediateCorrection = true;

// --- Sound Effects (Tone.js Synths) ---
let correctSound, incorrectSound, completeSound, giftSound;
let isAudioContextStarted = false;

// --- Functions ---

// Function to get DOM elements after the page loads
function getDOMElements() {
    initialSetupElement = document.getElementById('initial-setup');
    startQuizButton = document.getElementById('start-quiz-btn'); // Only one start button now
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
    // finalRatingElement removed
    nameInputElement = document.getElementById('user-name');
    resultNameElement = document.getElementById('result-name');
    resultMessageElement = document.getElementById('result-message');
    correctionModeSelectorElement = document.getElementById('correction-mode-selector');
    nextQuestionButtonElement = document.getElementById('next-question-btn');
    // Removed proceedToRealQuizButton, resultTitleElement as they are not needed for single quiz flow
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

// Function to shuffle an array (Fisher-Yates shuffle)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
}

// Simplified startQuizFlow for a single quiz type
function startQuizFlow() {
     console.log("Starting quiz flow...");
     userName = nameInputElement.value.trim() || "Quiz Taker";
     initialSetupElement.style.display = 'none'; // Hide the entire initial setup div

     const selectedCorrectionMode = document.querySelector('input[name="correction"]:checked');
     showImmediateCorrection = selectedCorrectionMode ? selectedCorrectionMode.value === 'immediate' : true;
     console.log("Immediate Correction Mode:", showImmediateCorrection);
     // correctionModeSelectorElement is part of initialSetupElement, so it's hidden too.

     // Use mainQuizDataArray directly (assuming it's defined in quizData.js)
     // or quizData if that's the name in your file (fallback)
     let quizDataToUse = typeof mainQuizDataArray !== 'undefined' ? mainQuizDataArray : quizData;

     if (!quizDataToUse || quizDataToUse.length === 0) {
         alert("Quiz data not found. Please ensure quizData.js is loaded and defines 'mainQuizDataArray' or 'quizData'.");
         initialSetupElement.style.display = 'block'; // Show setup again
         return;
     }
     quizContentElement.style.display = 'block'; // Show quiz content now


     let regularQuizQuestions = quizDataToUse.filter(q => !q.isBonus);
     let bonusQuestion = quizDataToUse.find(q => q.isBonus);

     shuffleArray(regularQuizQuestions);

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

     quizStartTime = Date.now();
     calculateTotalPossibleScore();
     startOverallTimer();
     loadQuestion();
}


function startOverallTimer() {
     clearInterval(overallTimerInterval);
     timeLeft = 60 * 60;
     updateTimerDisplay();
     overallTimerInterval = setInterval(() => {
         timeLeft--;
         updateTimerDisplay();
         if (timeLeft <= 0) {
             clearInterval(overallTimerInterval);
             clearTimeout(autoProceedTimeout);
             feedbackAreaElement.textContent = "Time's up!";
             feedbackAreaElement.className = 'feedback-incorrect';
             playSound(incorrectSound, "C3", "8n");
             showResults();
         }
     }, 1000);
 }

function updateTimerDisplay() {
     const minutes = Math.floor(timeLeft / 60);
     const seconds = timeLeft % 60;
     overallTimerElement.textContent = `Time Left: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
 }

function calculateTotalPossibleScore() {
     totalPossibleScore = currentQuizData
         .filter(q => !q.isBonus)
         .reduce((sum, question) => sum + (question.points || 0), 0);
     totalRegularQuestions = currentQuizData.filter(q => !q.isBonus).length;
 }

function updateLiveCountsAndStreak() {
    liveCorrectCountElement.textContent = `✔️ ${correctCount}`;
    liveIncorrectCountElement.textContent = `❌ ${incorrectCount}`;
    if (currentStreak > 1) {
        streakCounterElement.textContent = `🔥 Streak: ${currentStreak}`;
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
        autoProceedTimeout = setTimeout(proceedToNextQuestion, 2000);
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
         progressTextElement.textContent = `Bonus Question!`;
    } else {
         const regularQuestionIndex = currentQuizData.slice(0, currentQuestionIndex + 1).filter(q => !q.isBonus).length;
         progressTextElement.textContent = `Question ${regularQuestionIndex} / ${totalRegularQuestions}`;
    }

    updateLiveCountsAndStreak();
    displayLiveGifts();


    questionTextElement.textContent = currentQuestion.question;
    const existingLabel = questionTextElement.querySelector('.bonus-question-label');
    if (existingLabel) existingLabel.remove();

    if (currentQuestion.isBonus) {
        const bonusLabel = document.createElement('span');
        bonusLabel.textContent = '✨ BONUS ✨';
        bonusLabel.classList.add('bonus-question-label');
        questionTextElement.prepend(bonusLabel);
    }


    switch (currentQuestion.type) {
        case "MCQ": loadMCQOptions(currentQuestion); break;
        case "Matching": loadMatchingOptions(currentQuestion); submitButton.style.display = 'inline-block'; break;
        default: optionsAreaElement.innerHTML = '<p>Unsupported question type.</p>'; scheduleOrWaitForNext(); break;
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

     shuffleArray(regularOptions);
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
    let isCorrect = false;

    if (selectedOption === question.answer) {
        isCorrect = true;
        if (!question.isBonus) {
            score += question.points;
            correctCount++;
        }
        currentStreak++;
        feedbackAreaElement.textContent = "Correct!";
        feedbackAreaElement.className = 'feedback-correct';
        playSound(correctSound, "C5", "8n");
        triggerFeedbackFlash(true, question.isBonus);
        checkStreakForGift();
    } else {
        isCorrect = false;
        if (!question.isBonus) {
            incorrectCount++;
        }
        currentStreak = 0;
        let feedbackText = `Incorrect!`;
        if (showImmediateCorrection && !question.isBonus) {
            feedbackText += ` The correct answer was: ${question.answer}.`;
            if (question.justification) {
                feedbackText += `<br><span class="feedback-justification">Why? ${question.justification}</span>`;
            }
        }
        feedbackAreaElement.innerHTML = feedbackText;
        feedbackAreaElement.className = 'feedback-incorrect';
        playSound(incorrectSound, "C3", "8n");
        triggerFeedbackFlash(false, question.isBonus);
        if (!question.isBonus) {
            incorrectlyAnsweredQuestions.push({
                questionText: question.question,
                userAnswer: selectedOption,
                correctAnswer: question.answer,
                justification: question.justification || "No specific justification provided."
            });
        }
    }
    if (!question.isBonus) {
        updateLiveCountsAndStreak();
    }

    scheduleOrWaitForNext();
}

 function checkStreakForGift() {
     const streakLevel = currentStreak;
     const giftClass = streakThresholds[streakLevel];
     if (giftClass && !earnedGifts.some(gift => gift.class === giftClass && gift.source === 'streak')) {
         earnedGifts.push({ class: giftClass, source: 'streak' });
         console.log(`Streak Gift earned: ${giftClass} for streak ${streakLevel}`);
         displayLiveGifts();
         playSound(giftSound, "E5", "16n");
     }
 }


function loadMatchingOptions(question) {
     const container = document.createElement('div');
     container.classList.add('matching-container');
     const leftItems = question.pairs.map(pair => pair[0]);
     const rightItems = question.pairs.map(pair => pair[1]);
     shuffleArray(rightItems);

     leftItems.forEach((leftItem) => {
         const leftElement = document.createElement('div');
         leftElement.textContent = leftItem;
         leftElement.classList.add('match-item-left');
         const selectElement = document.createElement('select');
         selectElement.classList.add('match-select');
         selectElement.dataset.leftItem = leftItem;
         const defaultOption = document.createElement('option');
         defaultOption.value = "";
         defaultOption.textContent = "Select match...";
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
     let correctMatches = 0;
     let userMatches = {};
     let correctPairs = {};
     let isAllCorrect = false;

     currentQuestion.pairs.forEach(pair => {
         const leftItem = pair[0];
         const correctAnswer = pair[1];
         const userAnswer = userAnswers[leftItem];
         userMatches[leftItem] = userAnswer || "Not Answered";
         correctPairs[leftItem] = correctAnswer;

         if (userAnswer && userAnswer === correctAnswer) {
             correctMatches++;
         }
     });

     isAllCorrect = correctMatches === currentQuestion.pairs.length;

     if (currentQuestion.isBonus) {
         if (isAllCorrect) {
             feedbackAreaElement.textContent = `Bonus Correct! Candy Earned! 🍬`;
             feedbackAreaElement.className = 'feedback-bonus';
             if (!earnedGifts.some(gift => gift.class === bonusGiftClass && gift.source === 'bonus')) {
                 earnedGifts.push({ class: bonusGiftClass, source: 'bonus' });
             }
             displayLiveGifts();
             playSound(giftSound, "G5", "8n");
             triggerFeedbackFlash(true, true);
         } else {
             let feedbackText = `Bonus Incorrect (${correctMatches}/${currentQuestion.pairs.length})`;
             if (showImmediateCorrection) {
                 feedbackText += ` Review correct matches at the end.`;
                 if (currentQuestion.justification) {
                     feedbackText += `<br><span class="feedback-justification">Hint: ${currentQuestion.justification}</span>`;
                 }
             }
             feedbackAreaElement.innerHTML = feedbackText;
             feedbackAreaElement.className = 'feedback-incorrect';
             playSound(incorrectSound, "C3", "8n");
             triggerFeedbackFlash(false);
             incorrectlyAnsweredQuestions.push({
                 questionText: currentQuestion.question + " (Bonus)",
                 userAnswer: userMatches,
                 correctAnswer: correctPairs,
                 justification: currentQuestion.justification || "Match all pairs correctly.",
                 isMatching: true
             });
         }
     } else {
         const pointsAwarded = isAllCorrect ? (currentQuestion.points || currentQuestion.pairs.length) : 0;
         score += pointsAwarded;

         if (isAllCorrect) {
             correctCount++;
             currentStreak++;
             feedbackAreaElement.textContent = `Answer Submitted! (${correctMatches}/${currentQuestion.pairs.length} correct)`;
             feedbackAreaElement.className = 'feedback-correct';
             playSound(correctSound, "C5", "8n");
             triggerFeedbackFlash(true);
             checkStreakForGift();
         } else {
             incorrectCount++;
             currentStreak = 0;
             let feedbackText = `Answer Submitted! (${correctMatches}/${currentQuestion.pairs.length} correct)`;
             if (showImmediateCorrection) {
                 feedbackText += ` Some matches were incorrect. Review at the end.`;
                 if (currentQuestion.justification) {
                     feedbackText += `<br><span class="feedback-justification">Why? ${currentQuestion.justification}</span>`;
                 }
             }
             feedbackAreaElement.innerHTML = feedbackText;
             feedbackAreaElement.className = 'feedback-submitted';
             playSound(incorrectSound, "C3", "8n");
             triggerFeedbackFlash(false);
             incorrectlyAnsweredQuestions.push({
                 questionText: currentQuestion.question,
                 userAnswer: userMatches,
                 correctAnswer: correctPairs,
                 justification: currentQuestion.justification || "Match all pairs correctly.",
                 isMatching: true
             });
         }
         updateLiveCountsAndStreak();
     }

     optionsAreaElement.querySelectorAll('.match-select').forEach(sel => sel.disabled = true);
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

    const percentage = totalPossibleScore > 0 ? (score / totalPossibleScore) * 100 : 0;
    let messageText = "";
    if (percentage === 100 && totalRegularQuestions > 0) {
        messageText = `Excellent work, ${userName}! Perfect score!`;
    } else if (percentage >= 70) {
        messageText = `Great job, ${userName}!`;
    } else if (percentage >= 50) {
        messageText = `Good effort, ${userName}!`;
    } else {
        messageText = `Keep practicing, ${userName}!`;
    }
    resultMessageElement.textContent = messageText; // Set the full message content
    // resultTitleElement removed

    populateAchievements();
    achievementsListElement.parentElement.style.display = 'block';

    populateReviewSection();
    reviewSection.style.display = incorrectlyAnsweredQuestions.length > 0 ? 'block' : 'none';

    // No "Proceed to Real Quiz" button in the final version
    shareScoreButton.style.display = 'inline-block';


    resultAreaElement.style.display = 'block';
    playSound(completeSound, "G4", "4n");
}

function populateAchievements() {
    achievementsListElement.innerHTML = '';
    let achievementsDisplayed = false;
    let bonusCandyAwardedThisTime = earnedGifts.some(gift => gift.source === 'bonus' && gift.class === bonusGiftClass);

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
         icon.className = bonusGiftClass;
         li.appendChild(icon);
         li.append(" (Bonus!)");
         achievementsListElement.appendChild(li);
         achievementsDisplayed = true;
    }

     // Add text achievements
     const regularQuestionsFromSession = currentQuizData.filter(q => !q.isBonus && q.points > 0);
     const maxRegularScore = regularQuestionsFromSession.reduce((sum, q) => sum + q.points, 0);

     if (correctCount === regularQuestionsFromSession.length && regularQuestionsFromSession.length > 0) {
         const li = document.createElement('li');
         li.classList.add('achievement-text');
         li.textContent = "Perfect Score! ✨";
         li.style.backgroundColor = "#fff3cd"; li.style.color = "#664d03";
         achievementsListElement.appendChild(li);
         achievementsDisplayed = true;
     } else if (maxRegularScore > 0 && score / maxRegularScore >= 0.7) {
         const li = document.createElement('li');
         li.classList.add('achievement-text');
         li.textContent = "Bible Whiz! 👍";
         li.style.backgroundColor = "#cfe2ff"; li.style.color = "#0a58ca";
         achievementsListElement.appendChild(li);
         achievementsDisplayed = true;
     }

     if (!achievementsDisplayed) {
          achievementsListElement.innerHTML = '<li>No special achievements or gifts this time.</li>';
     }
}


function populateReviewSection() {
     reviewContent.innerHTML = '';
     if (incorrectlyAnsweredQuestions.length === 0) {
         reviewContent.innerHTML = '<p>No incorrect answers to review!</p>';
         return;
     }
     incorrectlyAnsweredQuestions.forEach(item => {
         const div = document.createElement('div');
         div.classList.add('review-item');
         const qText = document.createElement('p');
         qText.innerHTML = `<strong>Q:</strong> ${item.questionText}`;
         div.appendChild(qText);

         if (item.isMatching) {
             const userAnsText = document.createElement('p');
             userAnsText.innerHTML = `<strong>Your Matches:</strong>`;
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
             correctAnsText.innerHTML = `<strong>Correct Matches:</strong>`;
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
             userAnsText.innerHTML = `<strong>Your Answer:</strong> <span class="review-user-answer">${item.userAnswer}</span>`;
             div.appendChild(userAnsText);

             const correctAnsText = document.createElement('p');
             correctAnsText.innerHTML = `<strong>Correct Answer:</strong> <span class="review-correct-answer">${item.correctAnswer}</span>`;
             div.appendChild(correctAnsText);
         }

         if (item.justification) {
             const justificationText = document.createElement('p');
             justificationText.style.marginTop = '8px';
             justificationText.style.fontStyle = 'italic';
             justificationText.style.fontSize = '0.9em';
             justificationText.innerHTML = `<strong>Why?</strong> ${item.justification}`;
             div.appendChild(justificationText);
         }

         reviewContent.appendChild(div);
     });
 }

function toggleReview() {
     if (reviewContent.style.display === 'none' || reviewContent.style.display === '') {
         reviewContent.style.display = 'block';
         reviewToggleButton.textContent = 'Hide Review';
     } else {
         reviewContent.style.display = 'none';
         reviewToggleButton.textContent = 'Review Incorrect Answers';
     }
 }

async function shareScoreAsImage() {
    const elementToCapture = scoreCardElement;
    const buttonsToHide = resultAreaElement.querySelectorAll('.result-buttons, #review-section');

    buttonsToHide.forEach(el => el.classList.add('hide-for-screenshot'));

    try {
        if (typeof html2canvas === 'undefined') {
            alert('Share functionality is still loading, please try again in a moment.');
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
        downloadLink.download = 'gethsemane-quiz-score.png';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    } catch (error) {
        console.error('Error generating score image:', error);
        alert('Sorry, there was an error generating the score image.');
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

         // Hide initial setup and show quiz content
         initialSetupElement.style.display = 'none';
         quizContentElement.style.display = 'block';

         // Use mainQuizDataArray (or quizData if that's the name in your file)
         if (typeof mainQuizDataArray !== 'undefined') {
            initializeAndStartQuiz(mainQuizDataArray); // Simplified call
         } else if (typeof quizData !== 'undefined') { // Fallback for older data file name
            console.warn("Using global 'quizData' as 'mainQuizDataArray' not found. Please rename array in quizData.js to 'mainQuizDataArray'.");
            initializeAndStartQuiz(quizData);
         } else {
            alert("Quiz data not found. Please ensure quizData.js is loaded correctly.");
            initialSetupElement.style.display = 'block'; // Show setup again if data fails
            quizContentElement.style.display = 'none';
         }
     });


     submitButton.addEventListener('click', () => {
        const currentQuestion = currentQuizData[currentQuestionIndex];
        if (currentQuestion.type === "Matching") {
            handleMatchingSubmit();
        }
     });

    nextQuestionButtonElement.addEventListener('click', () => {
        proceedToNextQuestion();
    });

    // Removed proceedToRealQuizButton listener

    reviewToggleButton.addEventListener('click', toggleReview);
    shareScoreButton.addEventListener('click', shareScoreAsImage);

});
