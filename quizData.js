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
        id: 201, // New ID for this bonus question
        question: "Match the household member to their primary instruction from Ephesians 5:22-6:9:",
        type: "Matching",
        isBonus: true,
        pairs: [
            ["Wives", "Submit to your own husbands"],
            ["Husbands", "Love your wives"],
            ["Children", "Obey your parents"],
            ["Fathers", "Do not exasperate children; bring them up in the Lord"],
            ["Slaves", "Obey masters with respect and fear"],
            ["Masters", "Treat slaves justly, do not threaten"]
        ],
        points: 0, // Bonus questions don't contribute to the main score
        justification: "Based on Ephesians 5:22 (Wives), 5:25 (Husbands), 6:1 (Children), 6:4 (Fathers), 6:5 (Slaves), 6:9 (Masters)."
    }
];

// --- Gamification Settings ---
const streakThresholds = {
    2: "fas fa-candy-cane", // Adjusted for shorter demo
    4: "fas fa-pencil-alt",
    // 8: "fas fa-book" // May not be reachable in a short demo
};
const bonusGiftClass = "fas fa-candy-cane";
