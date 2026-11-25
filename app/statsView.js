// The "Question statistics" view of the facilitators' page: a summary, one row
// per question (bars drawn with CSS, no chart library) and, for the chosen
// question, its details next to the question shown as an answer-key card.
// Everything is put on the page as text (textContent).
import { renderQuestionCard } from './answerKey.js';
import { STATS_THRESHOLDS, shortPrompt, statFlags } from './statsFormat.js';
import { formatDuration } from './resultsCsv.js';

function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined && text !== null) element.textContent = String(text);
  return element;
}

function percentText(value) {
  return value === null || value === undefined ? '–' : `${Math.round(value)}%`;
}

function discriminationText(value) {
  return value === null || value === undefined ? 'not enough data' : value.toFixed(2);
}

// A horizontal bar for a percentage (0–100).
function bar(percent, className = '') {
  const outer = el('span', `stats-bar ${className}`.trim());
  const fill = el('span', 'stats-bar-fill');
  fill.style.width = `${Math.max(0, Math.min(100, percent ?? 0))}%`;
  outer.appendChild(fill);
  return outer;
}

function flagList(item) {
  const flags = statFlags(item);
  const list = el('span', 'stats-flags');
  for (const flag of flags) list.appendChild(el('span', `stats-flag stats-flag-${flag.id}`, flag.label));
  return list;
}

// The questions in the order chosen: 'quiz' (file order) or 'correct' (lowest % correct first).
export function sortStatsQuestions(questions, sort) {
  if (sort !== 'correct') return [...questions];
  return [...questions].sort((left, right) => (left.percentCorrect ?? Infinity) - (right.percentCorrect ?? Infinity) || left.number - right.number);
}

function renderSummary(stats) {
  const summary = el('div', 'stats-summary');
  const overall = stats.overall;
  const facts = el('p', 'fac-facts');
  facts.append(
    el('span', '', `${stats.submissions} ${stats.submissions === 1 ? 'submission' : 'submissions'}`),
    el('span', '', overall.averageScore === null ? 'Average score –' : `Average score ${overall.averageScore} / ${overall.total} (${percentText(overall.averagePercent)})`),
  );
  summary.appendChild(facts);
  if (overall.skills.length > 0) {
    const list = el('ul', 'fac-skills');
    for (const skill of overall.skills) {
      list.appendChild(el('li', '', `${skill.label}: ${skill.averagePoints ?? '–'}${skill.outOf ? ` / ${skill.outOf}` : ''}`));
    }
    summary.appendChild(list);
  }
  if (stats.excluded > 0) {
    summary.appendChild(el('p', 'fac-warning', `${stats.excluded} ${stats.excluded === 1 ? 'submission was' : 'submissions were'} left out because the quiz has been edited since ${stats.excluded === 1 ? 'it was' : 'they were'} taken.`));
  }
  if (!stats.enoughData && stats.submissions > 0) {
    summary.appendChild(el('p', 'fac-status', `Discrimination needs at least ${STATS_THRESHOLDS.minSubmissionsForDiscrimination} submissions: not enough data yet.`));
  }
  if (stats.truncated) {
    summary.appendChild(el('p', 'fac-status', `Only the newest ${stats.limit} submissions are counted; choose dates to narrow it.`));
  }
  summary.appendChild(el('p', 'fac-note', `Correct % counts unanswered as not correct. Discrimination = share correct in the top ${Math.round(STATS_THRESHOLDS.groupFraction * 100)}% by total score minus the bottom ${Math.round(STATS_THRESHOLDS.groupFraction * 100)}% (−1 to 1; below ${STATS_THRESHOLDS.lowDiscrimination} the question does not separate stronger from weaker participants).`));
  return summary;
}

function renderTable(stats, { sort, selectedId, onSelect }) {
  const wrap = el('div', 'fac-table-wrap');
  const table = el('table', 'stats-table');
  const head = el('tr');
  for (const [label, className] of [['#', 'num'], ['Question', ''], ['Skill', ''], ['Answered', 'num'], ['Correct', ''], ['Discrimination', 'num'], ['Avg time', 'num'], ['Flags', '']]) {
    head.appendChild(el('th', className, label));
  }
  table.createTHead().appendChild(head);
  const body = table.createTBody();
  for (const item of sortStatsQuestions(stats.questions, sort)) {
    const row = el('tr');
    row.tabIndex = 0;
    row.dataset.id = String(item.id);
    if (String(item.id) === String(selectedId)) row.classList.add('fac-selected');
    const correct = el('td', 'stats-correct');
    correct.append(bar(item.percentCorrect), el('span', 'stats-bar-label', percentText(item.percentCorrect)));
    const flags = el('td', 'stats-flags-cell');
    flags.appendChild(flagList(item));
    row.append(
      el('td', 'num', item.number),
      el('td', 'stats-prompt', shortPrompt(item.prompt, 70)),
      el('td', '', item.skillLabel ?? ''),
      el('td', 'num', item.answered),
      correct,
      el('td', 'num', discriminationText(item.discrimination)),
      el('td', 'num', item.averageSeconds === null ? '–' : formatDuration(item.averageSeconds)),
      flags,
    );
    const open = () => onSelect(item.id);
    row.addEventListener('click', open);
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });
    body.appendChild(row);
  }
  wrap.appendChild(table);
  return wrap;
}

function countList(title, entries, total) {
  const section = el('div', 'stats-detail-block');
  section.appendChild(el('h4', '', title));
  if (entries.length === 0) {
    section.appendChild(el('p', 'fac-status', 'None.'));
    return section;
  }
  const list = el('ul', 'stats-dist');
  for (const entry of entries) {
    const item = el('li', entry.correct ? 'stats-dist-correct' : '');
    item.append(
      el('span', 'stats-dist-label', entry.label),
      bar(total > 0 ? (entry.count / total) * 100 : 0, entry.correct ? 'stats-bar-correct' : ''),
      el('span', 'stats-dist-count', String(entry.count)),
    );
    list.appendChild(item);
  }
  section.appendChild(list);
  return section;
}

function renderDetails(item, question, text, stats) {
  const panel = el('div', 'stats-details');
  panel.appendChild(el('h3', '', `Question ${item.number}`));
  const facts = el('p', 'fac-facts');
  facts.append(
    el('span', '', `Answered ${item.answered} of ${stats.submissions}`),
    el('span', '', `Correct ${percentText(item.percentCorrect)}`),
    el('span', '', `Discrimination ${discriminationText(item.discrimination)}`),
    el('span', '', `Average time ${item.averageSeconds === null ? '–' : formatDuration(item.averageSeconds)}`),
  );
  panel.appendChild(facts);
  panel.appendChild(flagList(item));

  const columns = el('div', 'stats-detail-columns');
  const numbers = el('div', 'stats-detail-numbers');
  if (item.options) {
    numbers.appendChild(countList('Chosen options', item.options.map((option) => ({ label: option.option, count: option.count, correct: option.correct })), stats.submissions));
  }
  if (item.wrongAnswers) {
    numbers.appendChild(countList('Most common wrong answers', item.wrongAnswers.map((entry) => ({ label: entry.answer, count: entry.count })), stats.submissions));
  }
  if (item.wrongWords) {
    numbers.appendChild(countList('Most tapped wrong words', item.wrongWords.map((entry) => ({ label: entry.answer, count: entry.count })), stats.submissions));
  }
  if (item.pairs) {
    numbers.appendChild(countList('Pairs matched correctly (%)', item.pairs.map((pair) => ({ label: `${pair.left} → ${pair.right}`, count: Math.round(pair.percentCorrect ?? 0), correct: true })), 100));
  }
  if (item.statements) {
    const block = el('div', 'stats-detail-block');
    block.appendChild(el('h4', '', 'Statements'));
    const list = el('ol', 'stats-statements');
    for (const statement of item.statements) {
      const entry = el('li');
      entry.appendChild(el('p', 'stats-statement-text', statement.text));
      const line = el('p', 'fac-facts');
      line.append(
        el('span', '', `Correct ${percentText(statement.percentCorrect)}`),
        el('span', '', `Discrimination ${discriminationText(statement.discrimination)}`),
        el('span', '', `${text.statementTrue} ${statement.distribution.true} · ${text.statementFalse} ${statement.distribution.false} · ${text.statementCannotTell} ${statement.distribution['cannot-tell']}`),
      );
      entry.append(line, flagList(statement));
      list.appendChild(entry);
    }
    block.appendChild(list);
    numbers.appendChild(block);
  }
  columns.appendChild(numbers);
  const card = el('div', 'stats-detail-card');
  if (question) card.appendChild(renderQuestionCard(question, item.number, text));
  columns.appendChild(card);
  panel.appendChild(columns);
  return panel;
}

// Renders the whole view into `root`.
// options: { stats, quiz: { meta, questions } | null, sort, selectedId, onSelect(id), onSort(sort) }
export function renderStatsView(root, { stats, quiz, sort = 'quiz', selectedId = null, onSelect = () => {}, onSort = () => {} }) {
  root.replaceChildren(renderSummary(stats));

  const controls = el('div', 'stats-controls');
  const label = el('label', '', 'Sort ');
  const select = el('select');
  for (const [value, text] of [['quiz', 'Quiz order'], ['correct', '% correct (lowest first)']]) {
    const option = el('option', '', text);
    option.value = value;
    select.appendChild(option);
  }
  select.value = sort;
  select.addEventListener('change', () => onSort(select.value));
  label.appendChild(select);
  controls.appendChild(label);
  root.appendChild(controls);

  root.appendChild(renderTable(stats, { sort, selectedId, onSelect }));

  const item = stats.questions.find((entry) => String(entry.id) === String(selectedId));
  if (item) {
    const question = quiz ? quiz.questions.find((entry) => String(entry.id) === String(item.id)) : null;
    root.appendChild(renderDetails(item, question, quiz ? quiz.meta.uiText : {}, stats));
  }
}
