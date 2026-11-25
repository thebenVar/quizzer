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

function renderOptions(question, text) {
  if (question.type === 'matching') {
    const wrap = el('div', 'ak-matches');
    wrap.appendChild(el('p', 'ak-matches-heading', text.answerKeyMatchingHeading));
    const list = el('ul', 'ak-match-list');
    for (const [left, right] of question.pairs) {
      const item = el('li', 'ak-match');
      item.append(el('span', 'ak-match-left', left), el('span', 'ak-match-arrow', '→'), el('span', 'ak-match-right', right));
      list.appendChild(item);
    }
    wrap.appendChild(list);
    return wrap;
  }

  const list = el('ol', 'ak-options');
  question.options.forEach((option, index) => {
    const isCorrect = option === question.answer;
    const item = el('li', isCorrect ? 'ak-option ak-option-correct' : 'ak-option');
    item.appendChild(el('span', 'ak-option-letter', String.fromCharCode(65 + index)));
    item.appendChild(el('span', 'ak-option-text', option));
    if (isCorrect) {
      const tag = el('span', 'ak-option-tag');
      tag.append(el('span', 'ak-check', '✓'), ` ${text.answerKeyCorrect}`);
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

function renderQuestion(question, number, text) {
  const card = el('article', 'ak-card');

  const head = el('div', 'ak-card-head');
  head.appendChild(el('span', 'ak-number', String(number)));
  const prompt = el('p', 'ak-prompt', question.prompt);
  if (question.isBonus) {
    prompt.prepend(el('span', 'ak-bonus', text.bonusBadge), ' ');
  }
  head.appendChild(prompt);
  card.appendChild(head);

  card.appendChild(renderOptions(question, text));

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
      section.appendChild(renderQuestion(question, number, text));
    }
    root.appendChild(section);
  }
}
