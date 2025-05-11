// --- Gethsemane Bible Quiz Data (All Approved Questions + Bonus) ---
// This array should be named mainQuizDataArray if you are using the two-phase (practice/real) quiz setup.
// If this is the only quiz data file, it can be named quizData.
const mainQuizDataArray = [ // Or const quizData = [
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
        id: 11, // Original 11a
        question: "From where did God raise Christ by His power?",
        type: "MCQ",
        options: ["Earth", "Sin", "Dead", "All the above"],
        answer: "Dead",
        points: 1,
        justification: "Ephesians 1:20 - '...when he raised him from the dead...'"
    },
    {
        id: 12, // Original 11b
        question: "To whom has every title been given, not only in the present age but also in the one to come?",
        type: "MCQ",
        options: ["Church", "People", "Apostles", "Christ"],
        answer: "Christ",
        points: 1,
        justification: "Ephesians 1:21 - '...far above all rule and authority, power and dominion, and every name that is invoked...' referring to Christ."
    },
    {
        id: 13, // Original 12
        question: "God placed all things under Christ’s ________.",
        type: "MCQ",
        options: ["Hand", "Heart", "Body", "Feet"],
        answer: "Feet",
        points: 1,
        justification: "Ephesians 1:22 - 'And God placed all things under his feet...'"
    },
    {
        id: 14, // Original 13
        question: "Which is the body of Christ?",
        type: "MCQ",
        options: ["People", "Church", "None of the above"],
        answer: "Church",
        points: 1,
        justification: "Ephesians 1:22-23 - '...and appointed him to be head over everything for the church, which is his body...'"
    },
    // Original Question 15 was excluded.
    {
        id: 15, // Re-numbering from original 16
        question: "Once, where did the members of the church used to live?",
        type: "MCQ",
        options: ["Ephesus", "In hell", "In transgressions and sins", "None of the above"],
        answer: "In transgressions and sins",
        points: 1,
        justification: "Ephesians 2:1-2 - 'As for you, you were dead in your transgressions and sins, in which you used to live...'"
    },
    {
        id: 16, // Original 17
        question: "At one time, by nature, we were objects of ________?",
        type: "MCQ",
        options: ["World", "Sin", "Love", "Wrath"],
        answer: "Wrath",
        points: 1,
        justification: "Ephesians 2:3 - '...Like the rest, we were by nature deserving of wrath.'"
    },
    {
        id: 17, // Original 18
        question: "When we were dead in transgression we were made alive in Christ who is rich in _____ and by His great _______",
        type: "MCQ",
        options: ["Love and mercy", "faith and love", "grace and mercy", "mercy and Love"],
        answer: "mercy and Love",
        points: 1,
        justification: "Ephesians 2:4 - 'But because of his great love for us, God, who is rich in mercy, made us alive with Christ...'"
    },
    {
        id: 18, // Original 19
        question: "We are saved by ________?",
        type: "MCQ",
        options: ["Faith", "Love", "Works", "Grace"],
        answer: "Grace",
        points: 1,
        justification: "Ephesians 2:8 - 'For it is by grace you have been saved...' (also 2:5)"
    },
    {
        id: 19, // Original 20
        question: "Evaluate: I) Salvation is by Grace. II) It is the gift of God and not by works.",
        type: "MCQ",
        options: ["I is correct, II is wrong", "I is wrong, II is correct", "Both are wrong", "Both are correct"],
        answer: "Both are correct",
        points: 1,
        justification: "Ephesians 2:8-9 - 'For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God— not by works...'"
    },
    {
        id: 20, // Original 21
        question: "What did God prepare in advance for us to do?",
        type: "MCQ",
        options: ["Faith", "Bad deeds", "Love", "Good works"],
        answer: "Good works",
        points: 1,
        justification: "Ephesians 2:10 - '...created in Christ Jesus to do good works, which God prepared in advance for us to do.'"
    },
    // ... (Continue with questions 22-39 from the answer key, re-numbering their IDs sequentially from 21)
    // ... (Question 40 was excluded)
    // ... (Continue with questions 41-51 from the answer key, re-numbering their IDs sequentially)

    // Start adding questions from original ID 52 onwards, ensuring justifications
    {
        id: 52, // Original 52
        question: "Where did Christ ascend to?",
        type: "MCQ",
        options: ["Steps", "Temple top", "Mount Zion", "High above all the heavens"],
        answer: "High above all the heavens",
        points: 1,
        justification: "Ephesians 4:10 - 'He who descended is the very one who ascended higher than all the heavens, in order to fill the whole universe.'"
    },
    {
        id: 53, // Original 53
        question: "Paul frequently compares the church to the ________?",
        type: "MCQ",
        options: ["Mountain", "Animal", "Body", "Tree"],
        answer: "Body",
        points: 1,
        justification: "Multiple references, e.g., Ephesians 1:23, 4:12, 4:16, 5:23, 5:30."
    },
    {
        id: 54, // Original 54
        question: "We were created to be like God in true ________ and ________.",
        type: "MCQ",
        options: ["Nature and holiness", "Godliness and righteousness", "Will and nature", "Righteousness and holiness"],
        answer: "Righteousness and holiness",
        points: 1,
        justification: "Ephesians 4:24 - '...and to put on the new self, created to be like God in true righteousness and holiness.'"
    },
    {
        id: 55, // Original 55
        question: "What is created to be like God (Ephesians 4:24)?",
        type: "MCQ",
        options: ["Apostle", "Church", "Adam", "New self"],
        answer: "New self",
        points: 1,
        justification: "Ephesians 4:24 - '...and to put on the new self, created to be like God...'"
    },
    {
        id: 56, // Original 56
        question: "Before what should our anger go down?",
        type: "MCQ",
        options: ["God", "The sun rises up", "The church", "The sun goes down"],
        answer: "The sun goes down",
        points: 1,
        justification: "Ephesians 4:26 - 'In your anger do not sin: Do not let the sun go down while you are still angry...'"
    },
    {
        id: 57, // Original 57
        question: "Paul asks the Church to put off ________ and speak ________ to their neighbors.",
        type: "MCQ",
        options: ["Blame and gospel", "Anger and love", "Old self and truth", "Falsehood and truthfully"],
        answer: "Falsehood and truthfully",
        points: 1,
        justification: "Ephesians 4:25 - 'Therefore each of you must put off falsehood and speak truthfully to your neighbor...'"
    },
    {
        id: 58, // Original 58
        question: "What kind of talk should come out of our mouths?",
        type: "MCQ",
        options: ["Truthful words", "Comforting words", "Only what is helpful for building others up according to their needs", "All the above"],
        answer: "Only what is helpful for building others up according to their needs",
        points: 1,
        justification: "Ephesians 4:29 - 'Do not let any unwholesome talk come out of your mouths, but only what is helpful for building others up according to their needs, that it may benefit those who listen.'"
    },
    {
        id: 59, // Original 59
        question: "With whom were we sealed for the day of redemption?",
        type: "MCQ",
        options: ["The Father", "The Son", "The heaven", "The Holy Spirit"],
        answer: "The Holy Spirit",
        points: 1,
        justification: "Ephesians 4:30 - 'And do not grieve the Holy Spirit of God, with whom you were sealed for the day of redemption.'"
    },
    {
        id: 60, // Original 60
        question: "In whom did God forgive us?",
        type: "MCQ",
        options: ["Love", "Holy Spirit", "Church", "Christ"],
        answer: "Christ",
        points: 1,
        justification: "Ephesians 4:32 - '...forgiving each other, just as in Christ God forgave you.'"
    },
    {
        id: 61, // Original 61
        question: "How does Paul ask the Church to behave with one another?",
        type: "MCQ",
        options: ["Kind", "Compassionate", "Forgiving", "All the above"],
        answer: "All the above",
        points: 1,
        justification: "Ephesians 4:32 - 'Be kind and compassionate to one another, forgiving each other...'"
    },
    {
        id: 62, // Original 62
        question: "Whom should we imitate?",
        type: "MCQ",
        options: ["Christ", "Apostle", "Satan", "God"],
        answer: "God",
        points: 1,
        justification: "Ephesians 5:1 - 'Follow God’s example, therefore, as dearly loved children...'"
    },
    {
        id: 63, // Original 63
        question: "We should live a life of ________? (Ephesians 5:2)",
        type: "MCQ",
        options: ["Faith", "Truth", "Love", "All the above"],
        answer: "Love",
        points: 1,
        justification: "Ephesians 5:2 - '...and walk in the way of love, just as Christ loved us...'"
    },
    // Original Question 64 was excluded.
    {
        id: 65, // Original 65
        question: "On whom does God’s wrath come?",
        type: "MCQ",
        options: ["Sinners", "People", "Gentiles", "Those who are disobedient"],
        answer: "Those who are disobedient",
        points: 1,
        justification: "Ephesians 5:6 - 'Let no one deceive you with empty words, for because of such things God’s wrath comes on those who are disobedient.'"
    },
    {
        id: 66, // Original 66
        question: "Paul asks us to live as children of?",
        type: "MCQ",
        options: ["God", "Love", "Faith", "Light"],
        answer: "Light",
        points: 1,
        justification: "Ephesians 5:8 - 'For you were once darkness, but now you are light in the Lord. Live as children of light...'"
    },
    {
        id: 67, // Original 67
        question: "Once we were in________? (Ephesians 5:8)",
        type: "MCQ",
        options: ["World", "Sin", "Darkness", "All the above"],
        answer: "Darkness",
        points: 1,
        justification: "Ephesians 5:8 - 'For you were once darkness, but now you are light in the Lord.'"
    },
    {
        id: 68, // Original 68
        question: "Who does not have an inheritance in the kingdom of Christ and of God?",
        type: "MCQ",
        options: ["Immoral", "Impure", "Greedy person (an idolater)", "All the above"],
        answer: "All the above",
        points: 1,
        justification: "Ephesians 5:5 - 'For of this you can be sure: No immoral, impure or greedy person—such a person is an idolater—has any inheritance in the kingdom of Christ and of God.'"
    },
    {
        id: 69, // Original 69
        question: "The fruit of the light consists in all ________?",
        type: "MCQ",
        options: ["Goodness", "Righteousness", "Truth", "All the above"],
        answer: "All the above",
        points: 1,
        justification: "Ephesians 5:9 - '(for the fruit of the light consists in all goodness, righteousness and truth)'"
    },
    {
        id: 70, // Original 70
        question: "Paul asks us to expose the ________?",
        type: "MCQ",
        options: ["Christ", "Truth", "Gospel", "Fruitless deeds of darkness"],
        answer: "Fruitless deeds of darkness",
        points: 1,
        justification: "Ephesians 5:11 - 'Have nothing to do with the fruitless deeds of darkness, but rather expose them.'"
    },
    {
        id: 71, // Original 71
        question: "Paul states that what the disobedient do in secret is ________?",
        type: "MCQ",
        options: ["Unholy", "Sin", "Corruption", "Shameful"],
        answer: "Shameful",
        points: 1,
        justification: "Ephesians 5:12 - 'It is shameful even to mention what the disobedient do in secret.'"
    },
    {
        id: 72, // Original 72
        question: "What makes everything visible?",
        type: "MCQ",
        options: ["Word of God", "Truth", "Law", "Light"],
        answer: "Light",
        points: 1,
        justification: "Ephesians 5:13 - 'But everything exposed by the light becomes visible...'"
    },
    {
        id: 73, // Original 73
        question: "Paul advises us to be careful how we live, not as unwise but as ________?",
        type: "MCQ",
        options: ["Unwise", "Holy", "Wise", "None of the above"],
        answer: "Wise",
        points: 1,
        justification: "Ephesians 5:15 - 'Be very careful, then, how you live—not as unwise but as wise...'"
    },
    {
        id: 74, // Original 74
        question: "Make the most of every ________ because the days are evil.",
        type: "MCQ",
        options: ["Key", "Answer", "Good", "Opportunity"],
        answer: "Opportunity",
        points: 1,
        justification: "Ephesians 5:16 - '...making the most of every opportunity, because the days are evil.'"
    },
    {
        id: 75, // Original 75
        question: "Paul says not to be foolish, but understand what the ________ is.",
        type: "MCQ",
        options: ["Who God is", "Neighbor", "Plans of Satan", "Lord’s will"],
        answer: "Lord’s will",
        points: 1,
        justification: "Ephesians 5:17 - 'Therefore do not be foolish, but understand what the Lord’s will is.'"
    },
    {
        id: 76, // Original 76
        question: "When will Christ shine on us?",
        type: "MCQ",
        options: ["When we believe", "When we disobey", "When we stand", "When we awake from sleep / rise from the dead"],
        answer: "When we awake from sleep / rise from the dead",
        points: 1,
        justification: "Ephesians 5:14 - 'This is why it is said: \"Wake up, sleeper, rise from the dead, and Christ will shine on you.\""
    },
    {
        id: 77, // Original 77
        question: "Paul asks us to speak to one another with ________?",
        type: "MCQ",
        options: ["Psalms", "Hymns", "Songs from the Spirit", "All the above"],
        answer: "All the above",
        points: 1,
        justification: "Ephesians 5:19 - 'Speak to one another with psalms, hymns, and songs from the Spirit.'"
    },
    {
        id: 78, // Original 78
        question: "How should husbands love their wives?",
        type: "MCQ",
        options: ["Just as Christ loved the Church", "As their own bodies", "With care", "Both A and B"],
        answer: "Both A and B",
        points: 1,
        justification: "Ephesians 5:25 - 'Husbands, love your wives, just as Christ loved the church...' and Ephesians 5:28 - 'In this same way, husbands ought to love their wives as their own bodies.'"
    },
    {
        id: 79, // Original 79
        question: "Who is the head of the Church?",
        type: "MCQ",
        options: ["Pastor", "Apostle", "Bishop", "Christ"],
        answer: "Christ",
        points: 1,
        justification: "Ephesians 5:23 - 'For the husband is the head of the wife as Christ is the head of the church...'"
    },
    {
        id: 80, // Original 80
        question: "Paul advises children to obey their parents in the________?",
        type: "MCQ",
        options: ["Church", "World", "Heart", "Lord"],
        answer: "Lord",
        points: 1,
        justification: "Ephesians 6:1 - 'Children, obey your parents in the Lord, for this is right.'"
    },
    {
        id: 81, // Original 81
        question: "What is the first commandment with a promise?",
        type: "MCQ",
        options: ["You shall have no other gods before me", "Remember the Sabbath day", "You shall not take the name of the Lord your God in vain", "Honor your father and your mother"],
        answer: "Honor your father and your mother",
        points: 1,
        justification: "Ephesians 6:2 - \"'Honor your father and mother'—which is the first commandment with a promise—\""
    },
    {
        id: 82, // Original 82
        question: "Paul advises fathers to bring up their children in the ________ and ________ of the Lord.",
        type: "MCQ",
        options: ["Love and law", "Word and love", "Law and care", "Training and instruction"],
        answer: "Training and instruction",
        points: 1,
        justification: "Ephesians 6:4 - 'Fathers, do not exasperate your children; instead, bring them up in the training and instruction of the Lord.'"
    },
    {
        id: 83, // Original 83
        question: "Paul asks slaves to obey their earthly masters with ________?",
        type: "MCQ",
        options: ["Respect", "Fear", "Sincerity of heart", "All the above"],
        answer: "All the above",
        points: 1,
        justification: "Ephesians 6:5 - 'Slaves, obey your earthly masters with respect and fear, and with sincerity of heart, just as you would obey Christ.'"
    },
    {
        id: 84, // Original 84
        question: "Put on the full ________ to take your stand against the devil’s schemes.",
        type: "MCQ",
        options: ["Word of God", "Armor of God", "Faith", "Strength"],
        answer: "Armor of God",
        points: 1,
        justification: "Ephesians 6:11 - 'Put on the full armor of God, so that you can take your stand against the devil’s schemes.'"
    },
    {
        id: 86, // Original 86
        question: "Who is the dear brother and faithful servant in the Lord that Paul mentions sending?",
        type: "MCQ",
        options: ["Titus", "Timothy", "Barnabas", "Tychicus"],
        answer: "Tychicus",
        points: 1,
        justification: "Ephesians 6:21 - 'Tychicus, the dear brother and faithful servant in the Lord, will tell you everything...'"
    },
    {
        id: 87, // Original 87
        question: "The Lord will reward each one for whatever ________ they do.",
        type: "MCQ",
        options: ["Work", "Ministry", "Plan", "Good"],
        answer: "Good",
        points: 1,
        justification: "Ephesians 6:8 - '...because you know that the Lord will reward each one for whatever good they do...'"
    },
    {
        id: 88, // Original 88
        question: "Paul says to pray in the________ on all occasions with all kinds of prayers and requests.",
        type: "MCQ",
        options: ["On our knees", "Tongues", "Silent", "Spirit"],
        answer: "Spirit",
        points: 1,
        justification: "Ephesians 6:18 - 'And pray in the Spirit on all occasions with all kinds of prayers and requests.'"
    },
    {
        id: 89, // Original 89
        question: "Serve ________, as if you were serving the Lord, not people.",
        type: "MCQ",
        options: ["In truth", "Without heart", "None of the above", "Wholeheartedly"],
        answer: "Wholeheartedly",
        points: 1,
        justification: "Ephesians 6:7 - 'Serve wholeheartedly, as if you were serving the Lord, not people...'"
    },
    {
        id: 90, // Original 90
        question: "Paul says that he is an ambassador in ________?",
        type: "MCQ",
        options: ["Christ", "Church", "World", "Chains"],
        answer: "Chains",
        points: 1,
        justification: "Ephesians 6:20 - 'for which I am an ambassador in chains.'"
    },
    {
        id: 91, // Original 91
        question: "Paul requests prayer so that he may declare the mystery of the ________ fearlessly.",
        type: "MCQ",
        options: ["Truth", "Faith", "Christ", "Gospel"],
        answer: "Gospel",
        points: 1,
        justification: "Ephesians 6:19 - 'Pray also for me, that whenever I speak, words may be given me so that I will fearlessly make known the mystery of the gospel...'"
    },
    {
        id: 92, // Original 92
        question: "If we don’t grow up into Christ, we remain like ________?",
        type: "MCQ",
        options: ["Dead", "Not human", "None", "Infants"],
        answer: "Infants",
        points: 1,
        justification: "Ephesians 4:14 - 'Then we will no longer be infants, tossed back and forth by the waves...'"
    },
    {
        id: 93, // Original 93
        question: "Who famously said 'Growth is the only evidence of life'?",
        type: "MCQ",
        options: ["McDonald", "George MacDonald", "C. S. Lewis", "John Henry Newman"],
        answer: "John Henry Newman",
        points: 1,
        justification: "This is a known quote attributed to John Henry Newman (external knowledge)."
    },
    {
        id: 94, // Original 94
        question: "God wants us not to ________ unity but to ________ the unity of the Spirit.",
        type: "MCQ",
        options: ["Break, build", "Hold, leave", "Seek, find", "Create, keep"],
        answer: "Create, keep",
        points: 1,
        justification: "Interpretation of Ephesians 4:3 which says to 'make every effort to keep the unity of the Spirit.' The implication is we don't create the unity of the Spirit itself, but keep/maintain it."
    },
    {
        id: 95, // Original 95
        question: "Being a saint refers to both a________ (in Christ) and a________ (in living).",
        type: "MCQ",
        options: ["Need, seeking", "Gift, law", "None", "Position, progress"],
        answer: "Position, progress",
        points: 1,
        justification: "Theological concept. 'Position' refers to our standing in Christ (e.g., Eph 1:1, 2:6). 'Progress' refers to our growth and sanctification (e.g., Eph 4:1, 4:15)."
    },
    {
        id: 96, // Original 96
        question: "Paul calls the people to:",
        type: "MCQ",
        options: ["Walk in love", "Walk as children of light", "Walk carefully (as wise)", "All the above"],
        answer: "All the above",
        points: 1,
        justification: "Ephesians 5:2 (walk in love), Ephesians 5:8 (walk as children of light), Ephesians 5:15 (be careful how you walk/live)."
    },
    {
        id: 97, // Original 97
        question: "What is a key aspect of spiritual warfare according to Ephesians 6?",
        type: "MCQ",
        options: ["Exercise", "Understand the battle and the enemy", "None of the above", "Stand firm"],
        answer: "Stand firm",
        points: 1,
        justification: "Ephesians 6:11, 13, 14 all emphasize 'stand firm' or 'take your stand.'"
    },
    {
        id: 98, // Original 98
        question: "We cannot be _______ in our spirituality, as our Christian pilgrimage involves spiritual warfare.",
        type: "MCQ",
        options: ["Active", "Holy", "Unholy", "Passive"],
        answer: "Passive",
        points: 1,
        justification: "Interpretation based on the active commands in Ephesians 6:10-18 (be strong, put on, stand, take up, pray)."
    },
    {
        id: 100, // Original 100
        question: "One of the devil’s tactics might be to make us forget which spiritual reality?",
        type: "MCQ",
        options: ["The Spiritual gifts", "We are sinners", "All the above", "We are seated with Christ in the heavenly realms"],
        answer: "We are seated with Christ in the heavenly realms",
        points: 1,
        justification: "Interpretation linking the 'devil's schemes' (Ephesians 6:11) with the profound truth of our position 'seated...with him in the heavenly realms in Christ Jesus' (Ephesians 2:6). Forgetting this position makes us vulnerable."
    },
    // Bonus Matching Question (Original ID 85)
    {
        id: 85, // Using original ID for the armor matching question
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
