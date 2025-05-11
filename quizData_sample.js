// --- Gethsemane Bible Quiz Data (SAMPLE - 6 Questions + New Bonus) ---
const quizData = [
    {
        id: 301,
        question: "Who was the first king of Israel?",
        type: "MCQ",
        options: ["David", "Solomon", "Samuel", "Saul"],
        answer: "Saul",
        points: 1,
        justification: "Saul was anointed by Samuel as the first king of Israel (1 Samuel 10:1)."
    },
    {
        id: 302,
        question: "How many disciples did Jesus have in His core group?",
        type: "MCQ",
        options: ["7", "10", "3", "12"],
        answer: "12",
        points: 1,
        justification: "Jesus called twelve disciples to be His closest followers (Matthew 10:1-4)."
    },
    {
        id: 303,
        question: "What was the name of the mountain where Moses received the Ten Commandments?",
        type: "MCQ",
        options: ["Mount Carmel", "Mount Zion", "Mount Nebo", "Mount Sinai"],
        answer: "Mount Sinai",
        points: 1,
        justification: "God gave Moses the Ten Commandments on Mount Sinai (Exodus 19-20)."
    },
    {
        id: 304,
        question: "Which of these books is considered a Gospel in the New Testament?",
        type: "MCQ",
        options: ["Acts", "Romans", "Revelation", "John"],
        answer: "John",
        points: 1,
        justification: "The four Gospels are Matthew, Mark, Luke, and John."
    },
    {
        id: 305,
        question: "Who was swallowed by a great fish after disobeying God?",
        type: "MCQ",
        options: ["Elijah", "Daniel", "Peter", "Jonah"],
        answer: "Jonah",
        points: 1,
        justification: "The story of Jonah being swallowed by a great fish is found in the Book of Jonah (Jonah 1:17)."
    },
    {
        id: 307, // New ID for the "All the above" question
        question: "Which of the following are considered patriarchs in the Old Testament?",
        type: "MCQ",
        options: ["Abraham", "Isaac", "Jacob", "All the above"],
        answer: "All the above",
        points: 1,
        justification: "Abraham, his son Isaac, and Isaac's son Jacob are foundational patriarchs of the Israelite nation."
    },
    // New Bonus Matching Question
    {
        id: 306,
        question: "Match the biblical figure to their primary role or description:",
        type: "Matching",
        isBonus: true,
        pairs: [
            ["Abraham", "Father of a multitude"],
            ["Moses", "Led Israelites out of Egypt"],
            ["David", "Shepherd King, wrote Psalms"],
            ["Paul", "Apostle to the Gentiles"]
        ],
        points: 0, // Bonus questions don't contribute to the main score
        justification: "These are well-known roles/descriptions for these key biblical figures."
    }
];

// --- Gamification Settings (Adjusted for a 6-question quiz) ---
const streakThresholds = {
    2: "fas fa-candy-cane",
    4: "fas fa-pencil-alt",
    6: "fas fa-book" // Now reachable with 6 regular questions
};
const bonusGiftClass = "fas fa-candy-cane"; // Candy for bonus question
