// --- Gethsemane Bible Quiz Data (50 Questions) ---
const quizData = [
    {
        id: 1,
        question: "What are the words of blessing used by Paul to greet the Ephesians Church?",
        type: "MCQ",
        options: ["Grace and Love", "Love and Peace", "Grace and Faith", "Grace and Peace"],
        answer: "Grace and Peace",
        points: 1
    },
    {
        id: 2,
        question: "When did God choose us, according to Paul in the book of Ephesians?",
        type: "MCQ",
        options: ["In the womb", "In the creation", "Before formed in the womb", "Before the creation"],
        answer: "Before the creation",
        points: 1
    },
    {
        id: 3,
        question: "How did God choose us to be in His sight?",
        type: "MCQ",
        options: ["Holy and pure", "Holy and Righteous", "Pure and blameless", "Holy and blameless"],
        answer: "Holy and blameless",
        points: 1
    },
    {
        id: 4,
        question: "In whom were we chosen, according to Ephesians 1:11?",
        type: "MCQ",
        options: ["In faith", "In love", "In Spirit", "In Christ"],
        answer: "In Christ",
        points: 1
    },
    {
        id: 5,
        question: "According to Ephesians 1:13, when were we included in Christ?",
        type: "MCQ",
        options: ["When we believe", "When we confess", "When we ask", "When we hear the word of truth"],
        answer: "When we hear the word of truth",
        points: 1
    },
    {
        id: 6,
        question: "In whom and with whom were we marked with a seal when we heard the gospel?",
        type: "MCQ",
        options: ["Holy Spirit and Christ", "In Father and with Christ", "In Father and with Holy Spirit", "In Christ and with Holy Spirit"],
        answer: "In Christ and with Holy Spirit",
        points: 1
    },
    {
        id: 7,
        question: "For what is Paul giving thanks regarding the Ephesians church?",
        type: "MCQ",
        options: ["Faith in Jesus and love for the poor", "Faith in Jesus and love for neighbors", "Faith in Jesus and Love for saints"],
        answer: "Faith in Jesus and Love for saints",
        points: 1
    },
    {
        id: 8,
        question: "What is Paul asking God to give the Ephesians church so that they may know Him better?",
        type: "MCQ",
        options: ["Spirit of understanding", "Spirit of fruit", "Spirit of gifts", "Spirit of wisdom and revelation"],
        answer: "Spirit of wisdom and revelation",
        points: 1
    },
    {
        id: 9,
        question: "What does Paul pray will be enlightened in the Ephesians church so they may know the hope to which he has called them?",
        type: "MCQ",
        options: ["Eyes of their mind", "Eyes of their spirit", "Eyes of their heart", "None of the above"],
        answer: "Eyes of their heart",
        points: 1
    },
    {
        id: 10,
        question: "In whom is the power that is like the working of His mighty strength exerted?",
        type: "MCQ",
        options: ["Apostles", "Church", "Corinthians", "Christ"],
        answer: "Christ",
        points: 1
    },
    {
        id: 11, // Formerly 11a
        question: "From where did God raise Christ by His power?",
        type: "MCQ",
        options: ["Earth", "Sin", "Dead", "All the above"],
        answer: "Dead",
        points: 1
    },
    {
        id: 12, // Formerly 11b
        question: "To whom has every title been given, not only in the present age but also in the one to come?",
        type: "MCQ",
        options: ["Church", "People", "Apostles", "Christ"],
        answer: "Christ",
        points: 1
    },
    {
        id: 13, // Formerly 12
        question: "God placed all things under Christ’s ________.",
        type: "MCQ",
        options: ["Hand", "Heart", "Body", "Feet"],
        answer: "Feet",
        points: 1
    },
    {
        id: 14, // Formerly 13
        question: "Which is the body of Christ?",
        type: "MCQ",
        options: ["People", "Church", "None of the above"],
        answer: "Church",
        points: 1
    },
    // Question 15 was excluded
    {
        id: 16,
        question: "Once, where did the members of the church used to live?",
        type: "MCQ",
        options: ["Ephesus", "In hell", "In transgressions and sins", "None of the above"],
        answer: "In transgressions and sins",
        points: 1
    },
    {
        id: 17,
        question: "At one time, by nature, we were objects of ________?",
        type: "MCQ",
        options: ["World", "Sin", "Love", "Wrath"],
        answer: "Wrath",
        points: 1
    },
    {
        id: 18,
        question: "When we were dead in transgressions, God made us alive with Christ because He is rich in ________ and because of His great ________ for us.",
        type: "MCQ",
        options: ["Love and mercy", "Faith and love", "Grace and mercy", "Mercy and Love"],
        answer: "Mercy and Love",
        points: 1
    },
    {
        id: 19,
        question: "We are saved by ________?",
        type: "MCQ",
        options: ["Faith", "Love", "Works", "Grace"],
        answer: "Grace",
        points: 1
    },
    {
        id: 20,
        question: "Evaluate: I) Salvation is by Grace. II) It is the gift of God and not by works.",
        type: "MCQ",
        options: ["I is correct, II is wrong", "I is wrong, II is correct", "Both are wrong", "Both are correct"],
        answer: "Both are correct",
        points: 1
    },
    {
        id: 21,
        question: "What did God prepare in advance for us to do?",
        type: "MCQ",
        options: ["Faith", "Bad deeds", "Love", "Good works"],
        answer: "Good works",
        points: 1
    },
    {
        id: 22,
        question: "How were the Ephesians (Gentiles) formerly described by those who call themselves 'the circumcision' (Jews)?",
        type: "MCQ",
        options: ["Ephesians", "Robbers", "Sinners", "Uncircumcised"],
        answer: "Uncircumcised",
        points: 1
    },
    {
        id: 23,
        question: "How are we who once were far away brought near to God in Christ Jesus?",
        type: "MCQ",
        options: ["Through faith", "Through circumcision", "Through work", "Through the blood of Christ"],
        answer: "Through the blood of Christ",
        points: 1
    },
    {
        id: 24,
        question: "When the Ephesians were Gentiles, they were without which of the following?",
        type: "MCQ",
        options: ["Citizenship of Israel", "Hope", "Covenants of the promises", "All the above"],
        answer: "All the above",
        points: 1
    },
    {
        id: 25,
        question: "Christ abolished in His flesh the law with its ________ and ________.",
        type: "MCQ",
        options: ["Law and rules", "Bond and barriers", "Regulations and bonds", "Commandments and regulations"],
        answer: "Commandments and regulations",
        points: 1
    },
    {
        id: 26,
        question: "What was Christ's purpose in abolishing the law, according to Ephesians 2:15?",
        type: "MCQ",
        options: ["To create one new man out of three", "To create one new man out of one", "To create one new man out of four", "To create one new man out of two"],
        answer: "To create one new man out of two",
        points: 1
    },
    {
        id: 27,
        question: "To the people who were far away and to those who were near, Christ came and preached ________.",
        type: "MCQ",
        options: ["Gospel", "Word of God", "Faith", "Peace"],
        answer: "Peace",
        points: 1
    },
    {
        id: 28,
        question: "Through whom do we have access to the Father by one Spirit?",
        type: "MCQ",
        options: ["The Spirit", "The Word", "Faith", "Christ"],
        answer: "Christ",
        points: 1
    },
    {
        id: 29,
        question: "We are built on the foundation of the apostles and prophets, with Christ Jesus himself as the chief ________?",
        type: "MCQ",
        options: ["Builder", "Priest", "Commander", "Cornerstone"],
        answer: "Cornerstone",
        points: 1
    },
    {
        id: 30,
        question: "In Christ, we are being built together to become a dwelling in which God lives by His ________?",
        type: "MCQ",
        options: ["Love", "Body", "Will", "Spirit"],
        answer: "Spirit",
        points: 1
    },
    {
        id: 31,
        question: "Through what are the Gentiles heirs together with Israel, members together of one body, and sharers together in the promise in Christ Jesus?",
        type: "MCQ",
        options: ["The Law", "Good works", "The Gospel", "All the above"],
        answer: "The Gospel",
        points: 1
    },
    {
        id: 32,
        question: "By reading Paul's letter, the Ephesians will be able to understand his insight into what?",
        type: "MCQ",
        options: ["The love of Christ", "The mystery of the world", "The mystery of Christ", "All the above"],
        answer: "The mystery of Christ",
        points: 1
    },
    {
        id: 33,
        question: "By what did Paul become a servant of the gospel?",
        type: "MCQ",
        options: ["The gift of the Spirit", "Faith", "The laws of Moses", "The gift of God’s grace"],
        answer: "The gift of God’s grace",
        points: 1
    },
    {
        id: 34,
        question: "The mystery of Christ has been revealed by the Spirit to whom?",
        type: "MCQ",
        options: ["A servant", "Pastors", "God’s holy apostles and prophets", "None of the above"],
        answer: "God’s holy apostles and prophets",
        points: 1
    },
    {
        id: 35,
        question: "In Him and through faith in Him, we may approach God with what?",
        type: "MCQ",
        options: ["Joy", "Love", "Freedom and confidence", "All the above"],
        answer: "Freedom and confidence",
        points: 1
    },
    {
        id: 36,
        question: "Through what will Christ dwell in the hearts of the church?",
        type: "MCQ",
        options: ["The Word", "The Spirit", "The Law", "Faith"],
        answer: "Faith",
        points: 1
    },
    {
        id: 37,
        question: "In what should the church be rooted and established?",
        type: "MCQ",
        options: ["Laws", "Sin", "Love", "None of the above"], // Changed "None" to "None of the above"
        answer: "Love",
        points: 1
    },
    {
        id: 38,
        question: "God is able to do immeasurably more than all we ________ or ________?",
        type: "MCQ",
        options: ["Do or ask", "Imagine or do", "Think or say", "Ask or imagine"],
        answer: "Ask or imagine",
        points: 1
    },
    {
        id: 39,
        question: "Paul asks the Ephesian church to live a life worthy of the ________ they have received.",
        type: "MCQ",
        options: ["Faith", "Lord", "Suffering", "Calling"],
        answer: "Calling",
        points: 1
    },
    // Question 40 was excluded
    {
        id: 41,
        question: "We need to make every effort to keep the unity of the ________ through the bond of ________.",
        type: "MCQ",
        options: ["Church, peace", "Spirit, love", "People, peace", "Spirit, peace"],
        answer: "Spirit, peace",
        points: 1
    },
    {
        id: 42,
        question: "When we were called to one hope, there was ________ body and ________ Spirit.",
        type: "MCQ",
        options: ["Two", "Three", "One", "None of the above"],
        answer: "One",
        points: 1
    },
    {
        id: 43,
        question: "The grace that has been given to us is measured according to the gift of ________?",
        type: "MCQ",
        options: ["The Father", "The Holy Spirit", "The apostles", "Christ"],
        answer: "Christ",
        points: 1
    },
    {
        id: 44,
        question: "“When he ascended on high, he took many captives and gave gifts to his people.” This quotes which Old Testament passage?",
        type: "MCQ",
        options: ["Psalms 86:6", "Isaiah 53:4", "Psalms 68:18", "None of the above"],
        answer: "Psalms 68:18",
        points: 1
    },
    {
        id: 45,
        question: "What roles did Christ give (mentioned in Ephesians 4:11) to equip his people for works of service?",
        type: "MCQ",
        options: ["Apostles, evangelists, pastors and teachers", "Apostles, missionaries, pastors and teachers", "Apostles, prophets, evangelists, pastors and teachers", "None of the above"],
        answer: "Apostles, prophets, evangelists, pastors and teachers",
        points: 1
    },
    {
        id: 46,
        question: "The body of Christ may be built up until we all reach unity in the ________ and in the knowledge of the ________.",
        type: "MCQ",
        options: ["Christ, Word", "Body, Son of God", "Church, Son of God", "Faith, Son of God"],
        answer: "Faith, Son of God",
        points: 1
    },
    {
        id: 47,
        question: "By speaking the ________ in love, we will grow to become in every respect the mature body of him who is the head, that is, Christ.",
        type: "MCQ",
        options: ["Faith", "Love", "Faith in truth", "Truth"],
        answer: "Truth",
        points: 1
    },
    {
        id: 48,
        question: "In Christ the whole body, joined and held together by every supporting ligament, grows and builds itself up in ________, as each part does its work.",
        type: "MCQ",
        options: ["Truth", "Christ", "Faith", "Love"],
        answer: "Love",
        points: 1
    },
    {
        id: 49,
        question: "Paul urges the church to no longer live as the ________ do, in the futility of their thinking.",
        type: "MCQ",
        options: ["World", "Sinners", "Gentiles", "None of the above"],
        answer: "Gentiles",
        points: 1
    },
    {
        id: 50,
        question: "According to chapter 4, Paul is a prisoner for the ________?",
        type: "MCQ",
        options: ["His sin", "Man", "World", "Lord"],
        answer: "Lord",
        points: 1
    },
    {
        id: 51,
        question: "Paul asks us to bear with one another in ________?",
        type: "MCQ",
        options: ["Hand", "Faith", "Love", "All the above"],
        answer: "Love",
        points: 1
    }
];

// --- Gamification Settings ---
const streakThresholds = {
    10: "fas fa-candy-cane",
    25: "fas fa-pencil-alt",
    40: "fas fa-book"
};
const bonusGiftClass = "fas fa-candy-cane"; // Candy for bonus question
