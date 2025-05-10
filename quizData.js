// --- Gethsemane Bible Quiz Data (50 Questions + Bonus) ---
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
        id: 4,
        question: "In whom were we chosen, according to Ephesians 1:11?",
        type: "MCQ",
        options: ["In faith", "In love", "In Spirit", "In Christ"],
        answer: "In Christ",
        points: 1,
        justification: "Ephesians 1:11 - 'In him we were also chosen...'"
    },
    {
        id: 5,
        question: "According to Ephesians 1:13, when were we included in Christ?",
        type: "MCQ",
        options: ["When we believe", "When we confess", "When we ask", "When we hear the word of truth"],
        answer: "When we hear the word of truth",
        points: 1,
        justification: "Ephesians 1:13 - 'And you also were included in Christ when you heard the message of truth, the gospel of your salvation.'"
    },
    {
        id: 6,
        question: "In whom and with whom were we marked with a seal when we heard the gospel?",
        type: "MCQ",
        options: ["Holy Spirit and Christ", "In Father and with Christ", "In Father and with Holy Spirit", "In Christ and with Holy Spirit"],
        answer: "In Christ and with Holy Spirit",
        points: 1,
        justification: "Ephesians 1:13 - '...When you believed, you were marked in him with a seal, the promised Holy Spirit...'"
    },
    {
        id: 7,
        question: "For what is Paul giving thanks regarding the Ephesians church?",
        type: "MCQ",
        options: ["Faith in Jesus and love for the poor", "Faith in Jesus and love for neighbors", "Faith in Jesus and Love for saints"],
        answer: "Faith in Jesus and Love for saints",
        points: 1,
        justification: "Ephesians 1:15 - '...ever since I heard about your faith in the Lord Jesus and your love for all God’s people (saints)...'"
    },
    {
        id: 8,
        question: "What is Paul asking God to give the Ephesians church so that they may know Him better?",
        type: "MCQ",
        options: ["Spirit of understanding", "Spirit of fruit", "Spirit of gifts", "Spirit of wisdom and revelation"],
        answer: "Spirit of wisdom and revelation",
        points: 1,
        justification: "Ephesians 1:17 - 'I keep asking that the God of our Lord Jesus Christ...may give you the Spirit of wisdom and revelation, so that you may know him better.'"
    },
    {
        id: 9,
        question: "What does Paul pray will be enlightened in the Ephesians church so they may know the hope to which he has called them?",
        type: "MCQ",
        options: ["Eyes of their mind", "Eyes of their spirit", "Eyes of their heart", "None of the above"],
        answer: "Eyes of their heart",
        points: 1,
        justification: "Ephesians 1:18 - 'I pray that the eyes of your heart may be enlightened in order that you may know the hope to which he has called you...'"
    },
    {
        id: 10,
        question: "In whom is the power that is like the working of His mighty strength exerted?",
        type: "MCQ",
        options: ["Apostles", "Church", "Corinthians", "Christ"],
        answer: "Christ",
        points: 1,
        justification: "Ephesians 1:19-20 speaks of this power being exerted 'in Christ when he raised him from the dead...'"
    },
    {
        id: 11,
        question: "From where did God raise Christ by His power?",
        type: "MCQ",
        options: ["Earth", "Sin", "Dead", "All the above"],
        answer: "Dead",
        points: 1,
        justification: "Ephesians 1:20 - '...when he raised him from the dead...'"
    },
    {
        id: 12,
        question: "To whom has every title been given, not only in the present age but also in the one to come?",
        type: "MCQ",
        options: ["Church", "People", "Apostles", "Christ"],
        answer: "Christ",
        points: 1,
        justification: "Ephesians 1:21 - '...far above all rule and authority, power and dominion, and every name that is invoked...' referring to Christ."
    },
    {
        id: 13,
        question: "God placed all things under Christ’s ________.",
        type: "MCQ",
        options: ["Hand", "Heart", "Body", "Feet"],
        answer: "Feet",
        points: 1,
        justification: "Ephesians 1:22 - 'And God placed all things under his feet...'"
    },
    {
        id: 14,
        question: "Which is the body of Christ?",
        type: "MCQ",
        options: ["People", "Church", "None of the above"],
        answer: "Church",
        points: 1,
        justification: "Ephesians 1:22-23 - '...and appointed him to be head over everything for the church, which is his body...'"
    },
    {
        id: 16,
        question: "Once, where did the members of the church used to live?",
        type: "MCQ",
        options: ["Ephesus", "In hell", "In transgressions and sins", "None of the above"],
        answer: "In transgressions and sins",
        points: 1,
        justification: "Ephesians 2:1-2 - 'As for you, you were dead in your transgressions and sins, in which you used to live...'"
    },
    {
        id: 17,
        question: "At one time, by nature, we were objects of ________?",
        type: "MCQ",
        options: ["World", "Sin", "Love", "Wrath"],
        answer: "Wrath",
        points: 1,
        justification: "Ephesians 2:3 - '...Like the rest, we were by nature deserving of wrath.'"
    },
    {
        id: 18,
        question: "When we were dead in transgression we were made alive in Christ who is rich in _____ and by His great _______",
        type: "MCQ",
        options: ["Love and mercy", "faith and love", "grace and mercy", "mercy and Love"],
        answer: "mercy and Love",
        points: 1,
        justification: "Ephesians 2:4 - 'But because of his great love for us, God, who is rich in mercy, made us alive with Christ...'"
    },
    {
        id: 19,
        question: "We are saved by ________?",
        type: "MCQ",
        options: ["Faith", "Love", "Works", "Grace"],
        answer: "Grace",
        points: 1,
        justification: "Ephesians 2:8 - 'For it is by grace you have been saved...' (also 2:5)"
    },
    {
        id: 20,
        question: "Evaluate: I) Salvation is by Grace. II) It is the gift of God and not by works.",
        type: "MCQ",
        options: ["I is correct, II is wrong", "I is wrong, II is correct", "Both are wrong", "Both are correct"],
        answer: "Both are correct",
        points: 1,
        justification: "Ephesians 2:8-9 - 'For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God— not by works...'"
    },
    {
        id: 21,
        question: "What did God prepare in advance for us to do?",
        type: "MCQ",
        options: ["Faith", "Bad deeds", "Love", "Good works"],
        answer: "Good works",
        points: 1,
        justification: "Ephesians 2:10 - '...created in Christ Jesus to do good works, which God prepared in advance for us to do.'"
    },
    {
        id: 22,
        question: "How were the Ephesians (Gentiles) formerly described by those who call themselves 'the circumcision' (Jews)?",
        type: "MCQ",
        options: ["Ephesians", "Robbers", "Sinners", "Uncircumcised"],
        answer: "Uncircumcised",
        points: 1,
        justification: "Ephesians 2:11 - '...you who are Gentiles by birth and called \"uncircumcised\" by those who call themselves \"the circumcision\"...'"
    },
    {
        id: 23,
        question: "How are we who once were far away brought near to God in Christ Jesus?",
        type: "MCQ",
        options: ["Through faith", "Through circumcision", "Through work", "Through the blood of Christ"],
        answer: "Through the blood of Christ",
        points: 1,
        justification: "Ephesians 2:13 - 'But now in Christ Jesus you who once were far away have been brought near by the blood of Christ.'"
    },
    {
        id: 24,
        question: "When the Ephesians were Gentiles, they were without which of the following?",
        type: "MCQ",
        options: ["Citizenship of Israel", "Hope", "Covenants of the promises", "All the above"],
        answer: "All the above",
        points: 1,
        justification: "Ephesians 2:12 lists these: separate from Christ, excluded from citizenship in Israel, foreigners to the covenants of the promise, without hope and without God."
    },
    {
        id: 25,
        question: "Christ abolished in His flesh the law with its ________ and ________.",
        type: "MCQ",
        options: ["Law and rules", "Bond and barriers", "Regulations and bonds", "Commandments and regulations"],
        answer: "Commandments and regulations",
        points: 1,
        justification: "Ephesians 2:15 - '...by setting aside in his flesh the law with its commandments and regulations.'"
    },
    {
        id: 26,
        question: "What was Christ's purpose in abolishing the law, according to Ephesians 2:15?",
        type: "MCQ",
        options: ["To create one new man out of three", "To create one new man out of one", "To create one new man out of four", "To create one new man out of two"],
        answer: "To create one new man out of two",
        points: 1,
        justification: "Ephesians 2:15 - 'His purpose was to create in himself one new humanity out of the two, thus making peace...'"
    },
    {
        id: 27,
        question: "To the people who were far away and to those who were near, Christ came and preached ________.",
        type: "MCQ",
        options: ["Gospel", "Word of God", "Faith", "Peace"],
        answer: "Peace",
        points: 1,
        justification: "Ephesians 2:17 - 'He came and preached peace to you who were far away and peace to those who were near.'"
    },
    {
        id: 28,
        question: "Through whom do we have access to the Father by one Spirit?",
        type: "MCQ",
        options: ["The Spirit", "The Word", "Faith", "Christ"],
        answer: "Christ",
        points: 1,
        justification: "Ephesians 2:18 - 'For through him [Christ] we both have access to the Father by one Spirit.'"
    },
    {
        id: 29,
        question: "We are built on the foundation of the apostles and prophets, with Christ Jesus himself as the chief ________?",
        type: "MCQ",
        options: ["Builder", "Priest", "Commander", "Cornerstone"],
        answer: "Cornerstone",
        points: 1,
        justification: "Ephesians 2:20 - '...built on the foundation of the apostles and prophets, with Christ Jesus himself as the chief cornerstone.'"
    },
    {
        id: 30,
        question: "In Christ, we are being built together to become a dwelling in which God lives by His ________?",
        type: "MCQ",
        options: ["Love", "Body", "Will", "Spirit"],
        answer: "Spirit",
        points: 1,
        justification: "Ephesians 2:22 - 'And in him you too are being built together to become a dwelling in which God lives by his Spirit.'"
    },
    {
        id: 31,
        question: "Through what are the Gentiles heirs together with Israel, members together of one body, and sharers together in the promise in Christ Jesus?",
        type: "MCQ",
        options: ["The Law", "Good works", "The Gospel", "All the above"],
        answer: "The Gospel",
        points: 1,
        justification: "Ephesians 3:6 - 'This mystery is that through the gospel the Gentiles are heirs together with Israel...'"
    },
    {
        id: 32,
        question: "By reading Paul's letter, the Ephesians will be able to understand his insight into what?",
        type: "MCQ",
        options: ["The love of Christ", "The mystery of the world", "The mystery of Christ", "All the above"],
        answer: "The mystery of Christ",
        points: 1,
        justification: "Ephesians 3:4 - 'In reading this, then, you will be able to understand my insight into the mystery of Christ...'"
    },
    {
        id: 33,
        question: "By what did Paul become a servant of the gospel?",
        type: "MCQ",
        options: ["The gift of the Spirit", "Faith", "The laws of Moses", "The gift of God’s grace"],
        answer: "The gift of God’s grace",
        points: 1,
        justification: "Ephesians 3:7 - 'I became a servant of this gospel by the gift of God’s grace given me through the working of his power.'"
    },
    {
        id: 34,
        question: "The mystery of Christ has been revealed by the Spirit to whom?",
        type: "MCQ",
        options: ["A servant", "Pastors", "God’s holy apostles and prophets", "None of the above"],
        answer: "God’s holy apostles and prophets",
        points: 1,
        justification: "Ephesians 3:5 - '...which was not made known to people in other generations as it has now been revealed by the Spirit to God’s holy apostles and prophets.'"
    },
    {
        id: 35,
        question: "In Him and through faith in Him, we may approach God with what?",
        type: "MCQ",
        options: ["Joy", "Love", "Freedom and confidence", "All the above"],
        answer: "Freedom and confidence",
        points: 1,
        justification: "Ephesians 3:12 - 'In him and through faith in him we may approach God with freedom and confidence.'"
    },
    {
        id: 36,
        question: "Through what will Christ dwell in the hearts of the church?",
        type: "MCQ",
        options: ["The Word", "The Spirit", "The Law", "Faith"],
        answer: "Faith",
        points: 1,
        justification: "Ephesians 3:17 - '...so that Christ may dwell in your hearts through faith.'"
    },
    {
        id: 37,
        question: "In what should the church be rooted and established?",
        type: "MCQ",
        options: ["Laws", "Sin", "Love", "None of the above"],
        answer: "Love",
        points: 1,
        justification: "Ephesians 3:17 - 'And I pray that you, being rooted and established in love...'"
    },
    {
        id: 38,
        question: "God is able to do immeasurably more than all we ________ or ________?",
        type: "MCQ",
        options: ["Do or ask", "Imagine or do", "Think or say", "Ask or imagine"],
        answer: "Ask or imagine",
        points: 1,
        justification: "Ephesians 3:20 - 'Now to him who is able to do immeasurably more than all we ask or imagine...'"
    },
    {
        id: 39,
        question: "Paul asks the Ephesian church to live a life worthy of the ________ they have received.",
        type: "MCQ",
        options: ["Faith", "Lord", "Suffering", "Calling"],
        answer: "Calling",
        points: 1,
        justification: "Ephesians 4:1 - '...I urge you to live a life worthy of the calling you have received.'"
    },
    // Question 40 was excluded
    {
        id: 41,
        question: "We need to make every effort to keep the unity of the ________ through the bond of ________.",
        type: "MCQ",
        options: ["Church, peace", "Spirit, love", "People, peace", "Spirit, peace"],
        answer: "Spirit, peace",
        points: 1,
        justification: "Ephesians 4:3 - 'Make every effort to keep the unity of the Spirit through the bond of peace.'"
    },
    {
        id: 42,
        question: "When we were called to one hope, there was ________ body and ________ Spirit.",
        type: "MCQ",
        options: ["Two", "Three", "One", "None of the above"],
        answer: "One",
        points: 1,
        justification: "Ephesians 4:4 - 'There is one body and one Spirit, just as you were called to one hope when you were called...'"
    },
    {
        id: 43,
        question: "The grace that has been given to us is measured according to the gift of ________?",
        type: "MCQ",
        options: ["The Father", "The Holy Spirit", "The apostles", "Christ"],
        answer: "Christ",
        points: 1,
        justification: "Ephesians 4:7 - 'But to each one of us grace has been given as Christ apportioned it.'"
    },
    {
        id: 44,
        question: "“When he ascended on high, he took many captives and gave gifts to his people.” This quotes which Old Testament passage?",
        type: "MCQ",
        options: ["Psalms 86:6", "Isaiah 53:4", "Psalms 68:18", "None of the above"],
        answer: "Psalms 68:18",
        points: 1,
        justification: "Ephesians 4:8 directly quotes Psalm 68:18."
    },
    {
        id: 45,
        question: "What roles did Christ give (mentioned in Ephesians 4:11) to equip his people for works of service?",
        type: "MCQ",
        options: ["Apostles, evangelists, pastors and teachers", "Apostles, missionaries, pastors and teachers", "Apostles, prophets, evangelists, pastors and teachers", "None of the above"],
        answer: "Apostles, prophets, evangelists, pastors and teachers",
        points: 1,
        justification: "Ephesians 4:11 - 'So Christ himself gave the apostles, the prophets, the evangelists, the pastors and teachers...'"
    },
    {
        id: 46,
        question: "The body of Christ may be built up until we all reach unity in the ________ and in the knowledge of the ________.",
        type: "MCQ",
        options: ["Christ, Word", "Body, Son of God", "Church, Son of God", "Faith, Son of God"],
        answer: "Faith, Son of God",
        points: 1,
        justification: "Ephesians 4:13 - '...until we all reach unity in the faith and in the knowledge of the Son of God...'"
    },
    {
        id: 47,
        question: "By speaking the ________ in love, we will grow to become in every respect the mature body of him who is the head, that is, Christ.",
        type: "MCQ",
        options: ["Faith", "Love", "Faith in truth", "Truth"],
        answer: "Truth",
        points: 1,
        justification: "Ephesians 4:15 - 'Instead, speaking the truth in love, we will grow to become in every respect the mature body of him who is the head...'"
    },
    {
        id: 48,
        question: "In Christ the whole body, joined and held together by every supporting ligament, grows and builds itself up in ________, as each part does its work.",
        type: "MCQ",
        options: ["Truth", "Christ", "Faith", "Love"],
        answer: "Love",
        points: 1,
        justification: "Ephesians 4:16 - '...grows and builds itself up in love, as each part does its work.'"
    },
    {
        id: 49,
        question: "Paul urges the church to no longer live as the ________ do, in the futility of their thinking.",
        type: "MCQ",
        options: ["World", "Sinners", "Gentiles", "None of the above"],
        answer: "Gentiles",
        points: 1,
        justification: "Ephesians 4:17 - 'So I tell you this, and insist on it in the Lord, that you must no longer live as the Gentiles do...'"
    },
    {
        id: 50,
        question: "According to chapter 4, Paul is a prisoner for the ________?",
        type: "MCQ",
        options: ["His sin", "Man", "World", "Lord"],
        answer: "Lord",
        points: 1,
        justification: "Ephesians 4:1 - 'As a prisoner for the Lord, then, I urge you...'"
    },
    {
        id: 51,
        question: "Paul asks us to bear with one another in ________?",
        type: "MCQ",
        options: ["Hand", "Faith", "Love", "All the above"],
        answer: "Love",
        points: 1,
        justification: "Ephesians 4:2 - 'Be completely humble and gentle; be patient, bearing with one another in love.'"
    },
    // Bonus Matching Question (Original ID 85)
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
    10: "fas fa-candy-cane",
    25: "fas fa-pencil-alt",
    40: "fas fa-book"
};
const bonusGiftClass = "fas fa-candy-cane"; // Candy for bonus question
