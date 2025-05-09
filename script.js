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
    resultNameElement, resultMessageElement;

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
let timeLeft = 30 * 60;
let autoProceedTimeout;
let quizStartTime;
let quizEndTime;
let totalRegularQuestions = 0;
let userName = "Quiz Taker"; // Default name

// --- Sound Effects (Tone.js Synths) ---
let correctSound, incorrectSound, completeSound, giftSound;
let isAudioContextStarted = false;

// --- Functions ---

// Function to get DOM elements after the page loads
function getDOMElements() {
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
    // finalRatingElement removed
    nameInputElement = document.getElementById('user-name');
    resultNameElement = document.getElementById('result-name'); // This was missing, needed for the span inside result-message
    resultMessageElement = document.getElementById('result-message');
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

function startQuizFlow() {
     console.log("Starting quiz flow...");
     userName = nameInputElement.value.trim() || "Quiz Taker";
     document.getElementById('name-input-area').style.display = 'none';

     quizStartTime = Date.now();
     calculateTotalPossibleScore();
     startOverallTimer();
     loadQuestion();
}


function startOverallTimer() {
     clearInterval(overallTimerInterval);
     timeLeft = 30 * 60;
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
     totalPossibleScore = quizData
         .filter(q => !q.isBonus)
         .reduce((sum, question) => sum + (question.points || 0), 0);
     totalRegularQuestions = quizData.filter(q => !q.isBonus && q.type !== 'Rating').length; // Rating questions don't count for progress
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
     // Progress bar should reflect progress through scorable, non-bonus questions
     const scorableQuestionsAnswered = quizData.slice(0, currentQuestionIndex).filter(q => !q.isBonus && q.type !== 'Rating').length;
     const progress = totalRegularQuestions > 0 ? (scorableQuestionsAnswered / totalRegularQuestions) * 100 : 0;
     progressBarElement.style.width = `${progress}%`;
 }

 function displayLiveGifts() {
     liveGiftsElement.innerHTML = '';
     // Display only unique base gift classes live
     const uniqueLiveGiftClasses = [...new Set(earnedGifts.map(gift => gift.class))];
     uniqueLiveGiftClasses.forEach(giftClass => {
         const icon = document.createElement('i');
         icon.className = giftClass;
         liveGiftsElement.appendChild(icon);
     });
 }

function proceedToNextQuestion() {
     clearTimeout(autoProceedTimeout);
     currentQuestionIndex++;
     loadQuestion();
 }

function scheduleAutoProceed() {
     clearTimeout(autoProceedTimeout);
     autoProceedTimeout = setTimeout(proceedToNextQuestion, 2000);
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
    submitButton.disabled = false;

    if (currentQuestionIndex >= quizData.length) {
        showResults();
        return;
    }

    const currentQuestion = quizData[currentQuestionIndex];

    updateProgressBar();
    if (currentQuestion.isBonus) {
         progressTextElement.textContent = `Bonus Question!`;
    } else { // Rating question is removed, so this logic simplifies
         const regularQuestionIndex = quizData.slice(0, currentQuestionIndex + 1).filter(q => !q.isBonus).length; // Simplified filter
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
        // Rating case removed
        default: optionsAreaElement.innerHTML = '<p>Unsupported question type.</p>'; scheduleAutoProceed(); break;
    }
}

function loadMCQOptions(question) {
     let regularOptions = [];
     let specialOptions = [];

     question.options.forEach(option => {
         const lowerCaseOption = option.toLowerCase().trim();
         if (lowerCaseOption === "all the above" || lowerCaseOption === "none of the above") {
             specialOptions.push(option);
         } else {
             regularOptions.push(option);
         }
     });

     const shuffledRegularOptions = [...regularOptions].sort(() => Math.random() - 0.5);
     const finalOptions = [...shuffledRegularOptions, ...specialOptions];

     finalOptions.forEach(option => {
        const button = document.createElement('button');
        button.textContent = option;
        button.classList.add('mcq-option');
        button.onclick = () => handleMCQAnswer(option, question, button);
        optionsAreaElement.appendChild(button);
    });
 }

function handleMCQAnswer(selectedOption, question, buttonElement) {
    document.querySelectorAll('.mcq-option').forEach(btn => btn.disabled = true);
    buttonElement.classList.add('selected');

    if (selectedOption === question.answer) {
        score += question.points;
        correctCount++;
        currentStreak++;
        feedbackAreaElement.textContent = "Correct!";
        feedbackAreaElement.className = 'feedback-correct';
        playSound(correctSound, "C5", "8n");
        triggerFeedbackFlash(true);
        checkStreakForGift();
    } else {
        incorrectCount++;
        currentStreak = 0;
        feedbackAreaElement.textContent = `Incorrect!`;
        feedbackAreaElement.className = 'feedback-incorrect';
        playSound(incorrectSound, "C3", "8n");
        triggerFeedbackFlash(false);
        incorrectlyAnsweredQuestions.push({
            questionText: question.question,
            userAnswer: selectedOption,
            correctAnswer: question.answer,
            justification: question.justification || "No specific justification provided."
        });
    }
    updateLiveCountsAndStreak();
    scheduleAutoProceed();
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
     const shuffledRightItems = [...rightItems].sort(() => Math.random() - 0.5);

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
         shuffledRightItems.forEach(rightItem => {
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
     const currentQuestion = quizData[currentQuestionIndex];
     let correctMatches = 0;
     let userMatches = {};
     let correctPairs = {};

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

     const isAllCorrect = correctMatches === currentQuestion.pairs.length;

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
             feedbackAreaElement.textContent = `Bonus Incorrect (${correctMatches}/${currentQuestion.pairs.length})`;
             feedbackAreaElement.className = 'feedback-incorrect';
             playSound(incorrectSound, "C3", "8n");
             triggerFeedbackFlash(false);
         }
     } else {
         const pointsEarned = correctMatches;
         score += pointsEarned;

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
             feedbackAreaElement.textContent = `Answer Submitted! (${correctMatches}/${currentQuestion.pairs.length} correct)`;
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
     scheduleAutoProceed();
 }

// loadRatingOptions and handleRatingAnswer removed

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

    // Rating display logic removed

    const percentage = totalPossibleScore > 0 ? (score / totalPossibleScore) * 100 : 0;
    let messageText = ""; // Renamed variable to avoid conflict
    if (percentage === 100) {
        messageText = `Excellent work, ${userName}! Perfect score!`;
    } else if (percentage >= 70) {
        messageText = `Great job, ${userName}!`;
    } else if (percentage >= 50) {
        messageText = `Good effort, ${userName}!`;
    } else {
        messageText = `Keep practicing, ${userName}!`;
    }
    resultMessageElement.textContent = messageText; // Set the full message content


    populateAchievements();
    achievementsListElement.parentElement.style.display = 'block';

    populateReviewSection();
    reviewSection.style.display = incorrectlyAnsweredQuestions.length > 0 ? 'block' : 'none';

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
        if (!streakGiftsDisplayed.has(gift.class)) { // Ensure each type of streak gift is shown once
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
     const regularQuestions = quizData.filter(q => !q.isBonus && q.points > 0);
     const maxRegularScore = regularQuestions.reduce((sum, q) => sum + q.points, 0);

     if (correctCount === regularQuestions.length && regularQuestions.length > 0) {
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

    startQuizButton.addEventListener('click', async () => {
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

         startQuizButton.style.display = 'none';
         quizContentElement.style.display = 'block';
         startQuizFlow();
     });


     submitButton.addEventListener('click', () => {
        const currentQuestion = quizData[currentQuestionIndex];
        if (currentQuestion.type === "Matching") {
            handleMatchingSubmit();
        }
     });

    reviewToggleButton.addEventListener('click', toggleReview);
    shareScoreButton.addEventListener('click', shareScoreAsImage);

    calculateTotalPossibleScore();
});
