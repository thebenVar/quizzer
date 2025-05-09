// --- Gethsemane Bible Quiz Data (DEMO - Small Test Set) ---
const quizData = [
    {
        id: 1,
        question: "What are the words of blessing used by Paul to greet the Ephesians Church?",
        type: "MCQ",
        options: ["Grace and Love", "Love and Peace", "Grace and Faith", "Grace and Peace"],
        answer: "Grace and Peace",
        points: 1,
        justification: "Ephesians 1:2 - 'Grace and peace to you from God our Father and the Lord Jesus Christ.'"
    },
    {
        id: 2,
        question: "When did God choose us, according to Paul in the book of Ephesians?",
        type: "MCQ",
        options: ["In the womb", "In the creation", "Before formed in the womb", "Before the creation"],
        answer: "Before the creation",
        points: 1,
        justification: "Ephesians 1:4 - 'For he chose us in him before the creation of the world...'"
    },
    {
        id: 3,
        question: "How did God choose us to be in His sight?",
        type: "MCQ",
        options: ["Holy and pure", "Holy and Righteous", "Pure and blameless", "Holy and blameless"],
        answer: "Holy and blameless",
        points: 1,
        justification: "Ephesians 1:4 - '...to be holy and blameless in his sight.'"
    },
    {
        id: 24, // Example of a question with "All the above"
        question: "When the Ephesians were Gentiles, they were without which of the following?",
        type: "MCQ",
        options: ["Citizenship of Israel", "Hope", "Covenants of the promises", "All the above"],
        answer: "All the above",
        points: 1,
        justification: "Ephesians 2:12 lists these: separate from Christ, excluded from citizenship in Israel, foreigners to the covenants of the promise, without hope and without God."
    },
    {
        id: 9, // Example of a question with "None of the above"
        question: "What does Paul pray will be enlightened in the Ephesians church so they may know the hope to which he has called them?",
        type: "MCQ",
        options: ["Eyes of their mind", "Eyes of their spirit", "Eyes of their heart", "None of the above"], // "None of the above" is an option, but "Eyes of their heart" is correct
        answer: "Eyes of their heart",
        points: 1,
        justification: "Ephesians 1:18 - 'I pray that the eyes of your heart may be enlightened in order that you may know the hope to which he has called you...'"
    },
    // Bonus Matching Question
    {
        id: 85,
        question: "Match the piece of armor to its description:",
        type: "Matching",
        isBonus: true,
        pairs: [
            ["Belt", "truth"],
            ["Breastplate", "righteousness"],
            ["Shield", "faith"],
            ["Helmet", "salvation"]
        ],
        points: 0,
        justification: "Ephesians 6:14-17 describes the armor: Belt of truth, Breastplate of righteousness, Shield of faith, Helmet of salvation."
    }
];

// --- Gamification Settings ---
const streakThresholds = {
    2: "fas fa-candy-cane", // Adjusted for shorter demo
    4: "fas fa-pencil-alt",
    // 8: "fas fa-book" // May not be reachable in a short demo
};
const bonusGiftClass = "fas fa-candy-cane";
