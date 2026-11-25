/**
 * @vitest-environment jsdom
 */
// The "statements", "spot" and "text" question types, from validation to review.
import { describe, expect, it } from 'vitest';

import { validateMeta, validateQuestions } from '../app/validate.js';
import {
  calculateRegularQuestionStats,
  findSpotWordIndexes,
  getQuestionPoints,
  normalizeTextAnswer,
  textAnswerMatches,
  tokenizeSpotText,
} from '../app/utils.js';
import { checkAnswer, checkSpotAnswer, checkStatementsAnswer, checkTextAnswer } from '../app/runtime.js';
import { answerStatus, buildResultsHtml, calculateSkillResults, gradeSelections } from '../app/results.js';
import { renderQuestionCard } from '../app/answerKey.js';

const statementsQuestion = {
  id: 's1',
  type: 'statements',
  skill: 'reading',
  prompt: 'Read the verse, then decide for each statement.',
  passage: 'Luke 2:7: “And she gave birth …”',
  statements: [
    { text: 'There was an innkeeper.', answer: 'cannot-tell', explanation: 'No innkeeper is mentioned.' },
    { text: 'There was no place for them in the inn.', answer: 'true' },
    { text: 'The baby was laid in a bed.', answer: 'false' },
  ],
};
const spotQuestion = {
  id: 'e1',
  type: 'spot',
  skill: 'detail',
  prompt: 'Tap the word that does not match the source.',
  source: 'And Jesus answered them, “Have faith in God.”',
  text: 'And Jesus answered them, “Have faith in Good.”',
  answer: 'Good',
  points: 1,
};
const textQuestion = {
  id: 't1',
  type: 'text',
  skill: 'reading',
  prompt: 'What comes next? 2, 6, 12, 20, 30, ___',
  answer: '42',
  accept: ['forty-two'],
  points: 1,
};

const meta = validateMeta({
  id: 'demo',
  title: 'Demo',
  skills: [{ id: 'reading', label: 'Reading' }, { id: 'detail', label: 'Detail' }],
});
const [statements, spot, text] = validateQuestions([statementsQuestion, spotQuestion, textQuestion]);

describe('validation', () => {
  it('accepts the three types and normalises their fields', () => {
    expect(statements.statements).toHaveLength(3);
    expect(statements.statements[1]).toEqual({ text: 'There was no place for them in the inn.', answer: 'true', explanation: '' });
    expect(statements.passage).toBe('Luke 2:7: “And she gave birth …”');
    expect(spot.source).toBe('And Jesus answered them, “Have faith in God.”');
    expect(text.accept).toEqual(['forty-two']);
  });

  const reject = (question, pattern) => expect(() => validateQuestions([question])).toThrow(pattern);

  it('names the question in its error messages', () => {
    reject({ ...statementsQuestion, statements: statementsQuestion.statements.slice(0, 1) }, /questions\[0\]\.statements must be a list of at least two statements \(question id "s1"\)/);
    reject({ ...spotQuestion, answer: 'Goodness' }, /questions\[0\]\.answer "Goodness" is not a word of its text \(question id "e1"\)/);
  });

  it('rejects a statement answer other than true / false / cannot-tell', () => {
    const bad = { ...statementsQuestion, statements: [{ text: 'A', answer: 'maybe' }, { text: 'B', answer: 'true' }] };
    reject(bad, /statements\[0\]\.answer must be one of "true", "false", "cannot-tell"/);
    reject({ ...statementsQuestion, statements: [{ answer: 'true' }, { text: 'B', answer: 'true' }] }, /statements\[0\]\.text is required/);
  });

  it('rejects "points" on a statements question (each statement is worth one point)', () => {
    reject({ ...statementsQuestion, points: 3 }, /points is not used by "statements" questions/);
  });

  it('requires the spot answer to be exactly one word of the text', () => {
    reject({ ...spotQuestion, text: 'Good is good and Good is right.' }, /appears 2 times in its text/);
    reject({ ...spotQuestion, answer: 'Good.' }, /is not a word of its text/);
    reject({ ...spotQuestion, text: '' }, /text is required for a "spot" question/);
  });

  it('requires a text answer and a list of accepted alternatives', () => {
    reject({ ...textQuestion, answer: undefined }, /questions\[0\]\.answer is required/);
    reject({ ...textQuestion, answer: 42 }, /questions\[0\]\.answer must be text/);
    reject({ ...textQuestion, answer: ' ' }, /answer is empty once spaces and a final full stop are removed/);
    reject({ ...textQuestion, answer: '.' }, /answer is empty/);
    reject({ ...textQuestion, accept: [' . '] }, /accept\[0\] is empty/);
    reject({ ...textQuestion, accept: [7] }, /accept\[0\] must be text/);
    reject({ ...textQuestion, accept: 'forty-two' }, /accept must be a list/);
    reject({ ...textQuestion, accept: [''] }, /accept\[0\] is empty/);
  });

  it('makes mcq, spot and text questions worth 1 point when "points" is left out', () => {
    const [noPointsSpot, noPointsText, noPointsMcq, noPointsMatching] = validateQuestions([
      { ...spotQuestion, points: undefined },
      { ...textQuestion, id: 't2', points: undefined },
      { id: 'm', type: 'mcq', prompt: 'Q', options: ['a', 'b'], answer: 'a' },
      { id: 'p', type: 'matching', prompt: 'M', pairs: [['A', 'a'], ['B', 'b']] },
    ]);
    expect([noPointsSpot, noPointsText, noPointsMcq].map(getQuestionPoints)).toEqual([1, 1, 1]);
    expect(getQuestionPoints(noPointsMatching)).toBe(2); // one per pair
    expect(validateQuestions([{ ...textQuestion, points: 0 }])[0].points).toBe(0); // an explicit 0 stays
  });

  it('lists the supported types for an unknown one', () => {
    reject({ ...textQuestion, type: 'essay' }, /use mcq, matching, statements, spot or text/);
  });
});

describe('points', () => {
  it('a statements question is worth one point per statement', () => {
    expect(getQuestionPoints(statements)).toBe(3);
    expect(calculateRegularQuestionStats([statements, spot, text]).totalPossibleScore).toBe(5);
  });
});

describe('spot words', () => {
  it('keeps punctuation for display but not for matching', () => {
    const tokens = tokenizeSpotText('them, “Have faith in Good.” —');
    expect(tokens.map((token) => token.word)).toEqual(['them', 'Have', 'faith', 'in', 'Good', '']);
    expect(tokens[1]).toEqual({ token: '“Have', before: '“', word: 'Have', after: '' });
    expect(tokens[4].after).toBe('.”');
    expect(findSpotWordIndexes(spot.text, 'Good')).toEqual([7]);
  });

  it('grades the tapped word by position', () => {
    expect(checkSpotAnswer(spot, 7).isCorrect).toBe(true);
    expect(checkSpotAnswer(spot, 7).pointsAwarded).toBe(1);
    const wrong = checkSpotAnswer(spot, 5);
    expect(wrong.isCorrect).toBe(false);
    expect(wrong.feedback).toContain('The correct answer was: Good.');
    expect(checkSpotAnswer(spot, 99).isCorrect).toBe(false);
  });
});

describe('Indic and Hebrew text', () => {
  it('keeps vowel signs, virama and points with their word', () => {
    expect(tokenizeSpotText('यीशु ने कहा।').map((token) => token.word)).toEqual(['यीशु', 'ने', 'कहा']);
    expect(tokenizeSpotText('नमस्ते!')[0]).toEqual({ token: 'नमस्ते!', before: '', word: 'नमस्ते', after: '!' });
    expect(tokenizeSpotText('לֵךְ לְךָ׃').map((token) => token.word)).toEqual(['לֵךְ', 'לְךָ']);
  });

  it('accepts an Indic or pointed Hebrew answer in a spot question', () => {
    const [hindi] = validateQuestions([{ ...spotQuestion, source: 'यीशु ने कहा', text: 'यीशु ने सुना।', answer: 'सुना' }]);
    expect(checkSpotAnswer(hindi, 2).isCorrect).toBe(true);
    const [hebrew] = validateQuestions([{ ...spotQuestion, source: undefined, text: 'לֵךְ לְךָ מֵאַרְצְךָ', answer: 'לְךָ' }]);
    expect(checkSpotAnswer(hebrew, 1).isCorrect).toBe(true);
  });

  it('matches composed and decomposed forms (NFC)', () => {
    const decomposed = 'cafe\u0301';
    expect(tokenizeSpotText(`le ${decomposed}.`)[1].word).toBe('café');
    const [question] = validateQuestions([{ ...spotQuestion, source: undefined, text: `le ${decomposed}.`, answer: 'café' }]);
    expect(checkSpotAnswer(question, 1).isCorrect).toBe(true);
    expect(textAnswerMatches(decomposed, 'café')).toBe(true);
  });

  it('compares typed Indic answers', () => {
    expect(textAnswerMatches(' यीशु  मसीह। ', 'यीशु मसीह।')).toBe(true);
    expect(textAnswerMatches('यीशु मसीह', 'यीशु मसीह')).toBe(true);
    expect(textAnswerMatches('यीश मसीह', 'यीशु मसीह')).toBe(false);
  });
});

describe('typed answers', () => {
  it('ignores case, extra spaces and one trailing full stop', () => {
    expect(normalizeTextAnswer('  The   Good  Shepherd. ')).toBe('the good shepherd');
    expect(textAnswerMatches('THE good shepherd.', 'The good shepherd')).toBe(true);
    expect(textAnswerMatches('good shepherd..', 'good shepherd')).toBe(false);
    expect(textAnswerMatches('İSTANBUL', 'i̇stanbul')).toBe(true); // plain toLowerCase, not locale-dependent
  });

  it('matches a number written differently, and the accepted alternatives', () => {
    expect(textAnswerMatches(' 42 ', '42')).toBe(true);
    expect(textAnswerMatches('42.0', '42')).toBe(true);
    expect(textAnswerMatches('42.', '42')).toBe(true);
    expect(textAnswerMatches('+42', '42')).toBe(true);
    expect(textAnswerMatches('42..', '42')).toBe(false);
    expect(textAnswerMatches('1e2', '100')).toBe(false);
    expect(textAnswerMatches('.5', '0.5')).toBe(true);
    expect(textAnswerMatches('4 2', '42')).toBe(false);
    expect(textAnswerMatches('43', '42')).toBe(false);
    expect(textAnswerMatches('Forty-Two', '42', ['forty-two'])).toBe(true);
    expect(textAnswerMatches('', '0')).toBe(false);
  });

  it('grades a typed answer', () => {
    expect(checkTextAnswer(text, 'forty-two').isCorrect).toBe(true);
    const wrong = checkTextAnswer(text, '40');
    expect(wrong.pointsAwarded).toBe(0);
    expect(wrong.feedback).toContain('The correct answer was: 42.');
  });
});

describe('statements grading', () => {
  it('gives one point per correct statement', () => {
    const result = checkStatementsAnswer(statements, { 0: 'cannot-tell', 1: 'false', 2: 'false' });
    expect(result.results).toEqual([true, false, true]);
    expect(result.pointsAwarded).toBe(2);
    expect(result.isCorrect).toBe(false);
    expect(result.feedback).toBe('2 of 3 statements correct.');
    expect(checkStatementsAnswer(statements, { 0: 'cannot-tell', 1: 'true', 2: 'false' }).feedback).toBe('Correct!');
  });

  it('counts unanswered statements as wrong, and gives no points for a bonus', () => {
    expect(checkStatementsAnswer(statements, { 1: 'true' }).pointsAwarded).toBe(1);
    expect(checkStatementsAnswer({ ...statements, isBonus: true }, { 1: 'true' }).pointsAwarded).toBe(0);
  });

  it('checkAnswer picks the checker for each type', () => {
    expect(checkAnswer(statements, { 0: 'cannot-tell', 1: 'true', 2: 'false' }).isCorrect).toBe(true);
    expect(checkAnswer(spot, 7).isCorrect).toBe(true);
    expect(checkAnswer(text, '42').isCorrect).toBe(true);
  });
});

describe('answered status (finish screen)', () => {
  it('tells none, partial and complete apart for each type', () => {
    expect(answerStatus(statements, undefined)).toBe('none');
    expect(answerStatus(statements, { 0: 'true' })).toBe('partial');
    expect(answerStatus(statements, { 0: 'true', 1: 'false', 2: 'cannot-tell' })).toBe('complete');
    expect(answerStatus(spot, 0)).toBe('complete');
    expect(answerStatus(spot, undefined)).toBe('none');
    expect(answerStatus(text, '   ')).toBe('none');
    expect(answerStatus(text, 'x')).toBe('complete');
  });
});

describe('results', () => {
  const selections = { s1: { 0: 'cannot-tell', 1: 'false' }, e1: 7, t1: '41' };
  const graded = gradeSelections([statements, spot, text], selections);

  it('adds partial statement points to the score', () => {
    expect(graded.score).toBe(2); // 1 statement + the spot
    expect(graded.totalPossibleScore).toBe(5);
    expect(graded.correctCount).toBe(1);
    expect(graded.incorrectCount).toBe(2);
  });

  it('counts points per skill', () => {
    const rows = calculateSkillResults(meta.skills, [statements, spot, text], graded.answerLog, {});
    expect(rows.map(({ id, correct, total }) => ({ id, correct, total }))).toEqual([
      { id: 'reading', correct: 1, total: 4 },
      { id: 'detail', correct: 1, total: 1 },
    ]);
  });

  it('review card: each statement with the choice made and the correct one', () => {
    const card = renderQuestionCard(statements, 1, meta.uiText, graded.items[0].response);
    expect(card.querySelector('.ak-passage').textContent).toBe(statements.passage);
    const rows = [...card.querySelectorAll('.ak-statement')];
    expect(rows.map((row) => row.className)).toEqual([
      'ak-statement ak-statement-right',
      'ak-statement ak-statement-wrong',
      'ak-statement ak-statement-wrong',
    ]);
    expect(rows[0].textContent).toContain("Your answer: Can't tell");
    expect(rows[0].querySelector('.ak-statement-why').textContent).toBe('No innkeeper is mentioned.');
    expect([...rows[1].querySelectorAll('.ak-chip')].map((c) => c.textContent)).toEqual(['✗ Your answer: False', '✓ Correct: True']);
    expect([...rows[2].querySelectorAll('.ak-chip')].map((c) => c.textContent)).toEqual(['✗ Not answered', '✓ Correct: False']);
  });

  it('review card: the tapped word and the correct word are marked', () => {
    const wrongTap = renderQuestionCard(spot, 2, meta.uiText, { answer: 5, hasAnswer: true, isCorrect: false });
    expect(wrongTap.querySelector('.ak-spot-wrong').textContent).toBe('faith');
    expect(wrongTap.querySelector('.ak-spot-correct').textContent).toBe('Good');
    expect(wrongTap.querySelector('.ak-source-text').textContent).toBe(spot.source);
    // Punctuation is shown around the words
    expect(wrongTap.querySelector('.ak-spot-text').textContent).toBe(spot.text);
  });

  it('review card: your typed answer vs the correct answer', () => {
    const card = renderQuestionCard(text, 3, meta.uiText, graded.items[2].response);
    expect([...card.querySelectorAll('.ak-chip')].map((c) => c.textContent)).toEqual(['✗ Your answer: 41', '✓ Correct: 42']);
    expect(card.querySelector('.ak-accept').textContent).toBe('Also accepted: forty-two');
  });

  it('spot and text cards use their own text for the correct answer', () => {
    const custom = { ...meta.uiText, reviewCorrectAnswerValue: 'Right answer: {answer}', statementCorrectReveal: 'Should be: {answer}' };
    expect(renderQuestionCard(text, 3, custom).querySelector('.ak-chip').textContent).toBe('✓ Right answer: 42');
    expect(renderQuestionCard(spot, 2, custom).querySelector('.ak-chip').textContent).toBe('✓ Right answer: Good');
    expect(renderQuestionCard(statements, 1, custom).querySelector('.ak-chip').textContent).toBe("✓ Should be: Can't tell");
  });

  it('answer key cards (no response) show only the correct answers', () => {
    const card = renderQuestionCard(statements, 1, meta.uiText);
    expect([...card.querySelectorAll('.ak-chip')].map((c) => c.textContent)).toEqual(['✓ Correct: Can\'t tell', '✓ Correct: True', '✓ Correct: False']);
    expect(renderQuestionCard(spot, 2, meta.uiText).querySelectorAll('.ak-spot-wrong')).toHaveLength(0);
  });

  it('the results file includes the new types, escaped', () => {
    const html = buildResultsHtml({
      meta,
      name: 'Ana',
      date: new Date(2026, 0, 2),
      durationSeconds: 60,
      score: graded.score,
      totalPossibleScore: graded.totalPossibleScore,
      skillRows: [],
      items: gradeSelections([statements, spot, text], { ...selections, t1: '<b>41</b>' }).items,
    });
    expect(html).toContain('ak-passage');
    expect(html).toContain('ak-spot-correct');
    expect(html).toContain('Your answer: &lt;b&gt;41&lt;/b&gt;');
    expect(html).not.toMatch(/<b>41/);
  });
});
