// The answer key page, opened with ?quiz=<id>-ans. It is not linked from anywhere.
// Shows every question with its correct answer, why it is correct, and how to
// approach it; grouped by skill when the quiz lists skills.
import { fillText } from './utils.js';

// Questions in the order the page shows them: by skill (in meta.json order) when
// the quiz has skills, otherwise as listed; a bonus question always last.
export function groupQuestionsForAnswerKey(meta, questions) {
  const regular = questions.filter((question) => !question.isBonus);
  const bonus = questions.filter((question) => question.isBonus);

  const groups = meta.skills.length === 0
    ? [{ skill: null, questions: regular }]
    : meta.skills
        .map((skill) => ({ skill, questions: regular.filter((question) => question.skill === skill.id) }))
        .filter((group) => group.questions.length > 0);

  if (bonus.length > 0) {
    groups.push({ skill: null, bonus: true, questions: bonus });
  }
  return groups.filter((group) => group.questions.length > 0);
}

function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function skillAnchor(skill) {
  return `skill-${skill.id.replace(/[^a-z0-9_-]/gi, '-')}`;
}

function renderMatchList(pairs, className, marks) {
  const list = el('ul', 'ak-match-list');
  pairs.forEach(([left, right], index) => {
    const item = el('li', className);
    const mark = marks ? marks[index] : null;
    if (mark === 'wrong') item.classList.add('ak-match-wrong');
    item.append(el('span', 'ak-match-left', left), el('span', 'ak-match-arrow', '→'), el('span', 'ak-match-right', right));
    if (mark === 'wrong') item.appendChild(el('span', 'ak-cross', '✗'));
    list.appendChild(item);
  });
  return list;
}

// `response` (optional) is a participant's answer, for the review at the end:
// { answer: option text | { left: right }, hasAnswer, isCorrect, optionOrder? }.
function renderOptions(question, text, response) {
  if (question.type === 'matching') {
    const wrap = el('div', 'ak-matches');
    if (response && response.hasAnswer) {
      const given = question.pairs.map(([left]) => [left, (response.answer && response.answer[left]) || text.reviewNotAnswered]);
      const marks = question.pairs.map(([left, right]) => (response.answer && response.answer[left] === right ? 'right' : 'wrong'));
      wrap.appendChild(el('p', 'ak-matches-heading ak-matches-heading-yours', text.reviewYourMatchesHeading));
      wrap.appendChild(renderMatchList(given, 'ak-match ak-match-yours', marks));
    }
    wrap.appendChild(el('p', 'ak-matches-heading', text.answerKeyMatchingHeading));
    wrap.appendChild(renderMatchList(question.pairs, 'ak-match'));
    return wrap;
  }

  // In a review, options are lettered in the order the participant saw them.
  const shown = response && Array.isArray(response.optionOrder) &&
    response.optionOrder.length === question.options.length &&
    question.options.every((option) => response.optionOrder.includes(option))
    ? response.optionOrder
    : question.options;
  const list = el('ol', 'ak-options');
  shown.forEach((option, index) => {
    const isCorrect = option === question.answer;
    const isChosen = Boolean(response && response.hasAnswer && response.answer === option);
    const item = el('li', 'ak-option');
    if (isCorrect) item.classList.add('ak-option-correct');
    if (isChosen) item.classList.add('ak-option-chosen');
    if (isChosen && !isCorrect) item.classList.add('ak-option-wrong');
    item.appendChild(el('span', 'ak-option-letter', String.fromCharCode(65 + index)));
    item.appendChild(el('span', 'ak-option-text', option));
    if (isCorrect || isChosen) {
      const tag = el('span', 'ak-option-tag');
      const parts = [];
      if (isChosen) parts.push(text.reviewYourAnswerTag);
      if (isCorrect) parts.push(text.answerKeyCorrect);
      tag.append(el('span', isCorrect ? 'ak-check' : 'ak-cross', isCorrect ? '✓' : '✗'), ` ${parts.join(' · ')}`);
      item.appendChild(tag);
    }
    list.appendChild(item);
  });
  return list;
}

function renderNote(kind, label, body) {
  const note = el('div', `ak-note ak-note-${kind}`);
  note.append(el('p', 'ak-note-label', label), el('p', 'ak-note-body', body));
  return note;
}

// One question card: prompt, options with the correct one marked, Why and How to
// approach. Used by the answer key page and, with `response`, by the review of a
// participant's answers (on the results screen and in the downloaded results file).
export function renderQuestionCard(question, number, text, response) {
  const card = el('article', 'ak-card');
  if (response) {
    card.classList.add(response.isCorrect ? 'ak-card-right' : 'ak-card-wrong');
  }

  const head = el('div', 'ak-card-head');
  head.appendChild(el('span', 'ak-number', String(number)));
  const prompt = el('p', 'ak-prompt', question.prompt);
  if (question.isBonus) {
    prompt.prepend(el('span', 'ak-bonus', text.bonusBadge), ' ');
  }
  head.appendChild(prompt);
  card.appendChild(head);

  if (response && !response.hasAnswer) {
    card.appendChild(el('p', 'ak-not-answered', text.reviewNotAnsweredCard));
  }

  card.appendChild(renderOptions(question, text, response));

  if (question.explanation) {
    card.appendChild(renderNote('why', text.answerKeyWhy, question.explanation));
  }
  if (question.approach) {
    card.appendChild(renderNote('approach', text.answerKeyApproach, question.approach));
  }
  return card;
}

export function renderAnswerKey(root, { meta, questions }) {
  const text = meta.uiText;
  const groups = groupQuestionsForAnswerKey(meta, questions);
  root.replaceChildren();

  // Summary line and print button
  const summary = el('div', 'ak-summary');
  summary.appendChild(el('span', 'ak-badge', text.answerKeyLabel));
  const counts = [fillText(text.answerKeyQuestionCount, { count: questions.length })];
  if (meta.skills.length > 0) {
    counts.push(fillText(text.answerKeySkillCount, { count: groups.filter((group) => group.skill).length }));
  }
  summary.appendChild(el('span', 'ak-counts', counts.join(' · ')));
  const printButton = el('button', 'ak-print');
  printButton.type = 'button';
  printButton.append(el('i', 'fas fa-print'), ` ${text.answerKeyPrint}`);
  printButton.addEventListener('click', () => window.print());
  summary.appendChild(printButton);
  root.appendChild(summary);

  // Jump links to each skill
  const skillGroups = groups.filter((group) => group.skill);
  if (skillGroups.length > 1) {
    const nav = el('nav', 'ak-nav');
    for (const group of skillGroups) {
      const link = el('a', 'ak-nav-link');
      link.href = `#${skillAnchor(group.skill)}`;
      link.append(el('span', '', group.skill.label), el('span', 'ak-nav-count', String(group.questions.length)));
      nav.appendChild(link);
    }
    root.appendChild(nav);
  }

  let number = 0;
  for (const group of groups) {
    const section = el('section', 'ak-section');
    if (group.skill) {
      section.id = skillAnchor(group.skill);
      section.appendChild(el('h2', 'ak-section-title', group.skill.label));
      if (group.skill.description) {
        section.appendChild(el('p', 'ak-section-intro', group.skill.description));
      }
    }
    for (const question of group.questions) {
      number += 1;
      section.appendChild(renderQuestionCard(question, number, text));
    }
    root.appendChild(section);
  }
}
