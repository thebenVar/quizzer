// The facilitators' results page (results.html): sign in with the facilitator
// password, pick a quiz, see every submission, open one person's answers,
// export a CSV and delete submissions. Every value from the server is put on
// the page as text (textContent), never as HTML: names are typed by participants.
import { loadQuiz } from './loader.js';
import { quizFingerprint, getStorage } from './progress.js';
import { answerStatus } from './grading.js';
import { renderQuestionCard } from './answerKey.js';
import { buildResultsCsv, formatDateTime, formatDuration, skillColumns } from './resultsCsv.js';
import { flushOutbox } from './submissions.js';
import { formatDateYMD } from './results.js';

const PASSWORD_KEY = 'quizzer:facilitator-password';
const RESULTS_URL = 'api/results';

const state = {
  password: '',
  quizIds: [],
  quizId: '',
  submissions: [],
  selectedId: null,
  reviewFilter: 'all',
  details: new Map(), // submission id -> Promise<submission with answers>
  quizzes: new Map(), // quizId -> Promise<{ meta, questions } | { error }>
};

const $ = (id) => document.getElementById(id);

function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined && text !== null) element.textContent = String(text);
  return element;
}

function readSession(key) {
  try {
    return window.sessionStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

function writeSession(key, value) {
  try {
    if (value) window.sessionStorage.setItem(key, value);
    else window.sessionStorage.removeItem(key);
  } catch {
    // Without session storage the password is simply asked again on reload.
  }
}

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function api(method, params) {
  const url = `${RESULTS_URL}?${new URLSearchParams(params).toString()}`;
  let response;
  try {
    response = await fetch(url, {
      method,
      // Percent-encoded, so a password in any script fits in a header (api/results.js decodes it).
      headers: { Authorization: `Bearer ${encodeURIComponent(state.password)}` },
      cache: 'no-store',
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError(0, 'The server could not be reached. Check the connection and try again.');
  }
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok || !body || body.ok !== true) {
    const message = body && body.error
      ? body.error
      : `The results service is not available here (HTTP ${response.status}). It runs on the Vercel deployment or with "vercel dev".`;
    throw new ApiError(response.status, message);
  }
  return body;
}

// --- Signing in ---

function showLogin(message) {
  $('results-view').hidden = true;
  $('login-form').hidden = false;
  const error = $('login-error');
  error.textContent = message || '';
  error.hidden = !message;
  $('password-input').value = '';
  $('password-input').focus();
}

function signOut() {
  state.password = '';
  writeSession(PASSWORD_KEY, '');
  state.submissions = [];
  state.selectedId = null;
  showLogin('');
}

async function signIn(password) {
  state.password = password;
  $('login-btn').disabled = true;
  try {
    const body = await api('GET', {});
    writeSession(PASSWORD_KEY, password);
    $('login-form').hidden = true;
    $('results-view').hidden = false;
    state.quizIds = body.quizIds;
    fillQuizPicker();
    await refresh();
  } catch (error) {
    state.password = '';
    writeSession(PASSWORD_KEY, '');
    showLogin(error.status === 401 ? 'Wrong password. Please try again.' : error.message);
  } finally {
    $('login-btn').disabled = false;
  }
}

// --- Loading and listing results ---

function fillQuizPicker() {
  const select = $('quiz-select');
  select.replaceChildren();
  if (state.quizIds.length === 0) {
    select.appendChild(el('option', '', 'No results yet'));
    select.disabled = true;
    state.quizId = '';
    return;
  }
  select.disabled = false;
  if (!state.quizIds.includes(state.quizId)) state.quizId = state.quizIds[0];
  for (const quizId of state.quizIds) {
    const option = el('option', '', quizId);
    option.value = quizId;
    select.appendChild(option);
  }
  select.value = state.quizId;
  // Show quiz titles once their meta.json has loaded.
  for (const option of select.options) {
    quizFor(option.value).then((quiz) => {
      if (quiz.meta) option.textContent = `${quiz.meta.title} (${option.value})`;
    });
  }
}

// Local dates from the date inputs, as the instants the server filters on:
// from the start of "from" up to (not including) the day after "to".
function dateRange() {
  const toInstant = (value, addDays) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + addDays).toISOString();
  };
  return { from: toInstant($('from-date').value, 0), to: toInstant($('to-date').value, 1) };
}

function setStatus(message) {
  $('results-status').textContent = message;
}

async function refresh() {
  if (!state.quizId) {
    state.submissions = [];
    renderTable();
    setStatus('No results have been sent yet.');
    return;
  }
  setStatus('Loading…');
  const params = { quiz: state.quizId };
  const { from, to } = dateRange();
  if (from) params.from = from;
  if (to) params.to = to;
  try {
    const body = await api('GET', params);
    state.quizIds = body.quizIds;
    state.submissions = body.submissions;
    if (!state.submissions.some((submission) => submission.id === state.selectedId)) state.selectedId = null;
    renderTable();
    renderReview();
    const count = state.submissions.length;
    const more = body.truncated ? ` Only the newest ${body.limit} are shown; choose dates to see older ones.` : '';
    setStatus(count === 0 ? 'No results for these dates.' : `${count} ${count === 1 ? 'result' : 'results'}, newest first.${more}`);
  } catch (error) {
    if (error.status === 401) {
      signOut();
      showLogin('Wrong password. Please sign in again.');
      return;
    }
    setStatus(error.message);
  }
}

function renderTable() {
  const skills = skillColumns(state.submissions);
  const headRow = el('tr');
  headRow.append(el('th', '', 'Name'), el('th', '', 'Date'), el('th', 'num', 'Score'));
  for (const skill of skills) headRow.appendChild(el('th', 'num', skill.label));
  headRow.append(el('th', 'num', 'Time'), el('th', '', ''));
  $('results-table').tHead.replaceChildren(headRow);

  const body = $('results-table').tBodies[0];
  body.replaceChildren();
  for (const submission of state.submissions) {
    const row = el('tr');
    row.tabIndex = 0;
    row.dataset.id = submission.id;
    if (submission.id === state.selectedId) row.classList.add('fac-selected');
    row.append(
      el('td', 'fac-name', submission.name),
      el('td', '', formatDateTime(submission.submittedAt)),
      el('td', 'num', `${submission.score} / ${submission.total}`),
    );
    const bySkill = new Map((submission.skills || []).map((skill) => [skill.id, skill]));
    for (const skill of skills) {
      const value = bySkill.get(skill.id);
      row.appendChild(el('td', 'num', value ? `${value.points} / ${value.outOf}` : ''));
    }
    row.appendChild(el('td', 'num', formatDuration(submission.timeTakenSeconds)));
    const actions = el('td');
    const remove = el('button', 'fac-danger', 'Delete');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Delete the results of ${submission.name}`);
    remove.addEventListener('click', (event) => {
      event.stopPropagation();
      deleteSubmission(submission);
    });
    actions.appendChild(remove);
    row.appendChild(actions);

    const open = () => selectSubmission(submission.id);
    row.addEventListener('click', open);
    row.addEventListener('keydown', (event) => {
      if (event.target === row && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        open();
      }
    });
    body.appendChild(row);
  }
}

async function deleteSubmission(submission) {
  const when = formatDateTime(submission.submittedAt);
  if (!window.confirm(`Delete the results of ${submission.name} (${when})?\n\nThis cannot be undone.`)) return;
  try {
    await api('DELETE', { id: submission.id });
    if (state.selectedId === submission.id) state.selectedId = null;
    await refresh();
    setStatus(`Deleted the results of ${submission.name}. ${$('results-status').textContent}`);
  } catch (error) {
    if (error.status === 401) {
      signOut();
      showLogin('Wrong password. Please sign in again.');
      return;
    }
    window.alert(`The results could not be deleted: ${error.message}`);
  }
}

// --- One person's answers ---

// The full submission (with answers), fetched when its row is opened.
function detailsFor(id) {
  if (!state.details.has(id)) {
    const request = api('GET', { id }).then((body) => body.submission);
    request.catch(() => state.details.delete(id));
    state.details.set(id, request);
  }
  return state.details.get(id);
}

function quizFor(quizId) {
  if (!state.quizzes.has(quizId)) {
    state.quizzes.set(quizId, loadQuiz(quizId).catch((error) => ({ error })));
  }
  return state.quizzes.get(quizId);
}

function selectSubmission(id) {
  state.selectedId = state.selectedId === id ? null : id;
  for (const row of $('results-table').tBodies[0].rows) {
    row.classList.toggle('fac-selected', row.dataset.id === state.selectedId);
  }
  renderReview().then(() => {
    if (state.selectedId) $('review-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

// The review items, as in the participant's own review: each question of the
// quiz with this person's answer, marked right or wrong as graded on the server.
export function reviewItems(questions, answers) {
  return questions.map((question, index) => {
    const stored = answers ? answers[String(question.id)] : undefined;
    const selection = stored ? stored.selection : null;
    const hasAnswer = selection !== null && selection !== undefined && answerStatus(question, selection) !== 'none';
    const response = { answer: selection ?? undefined, hasAnswer, isCorrect: Boolean(stored && stored.isCorrect) };
    if (question.type === 'mcq' && stored && Array.isArray(stored.optionOrder)) response.optionOrder = stored.optionOrder;
    return { question, number: index + 1, response };
  });
}

async function renderReview() {
  const panel = $('review-panel');
  const submission = state.submissions.find((item) => item.id === state.selectedId);
  if (!submission) {
    panel.hidden = true;
    panel.replaceChildren();
    return;
  }
  panel.hidden = false;
  panel.replaceChildren(el('h2', '', submission.name));

  const facts = el('p', 'fac-facts');
  facts.append(
    el('span', '', `Score ${submission.score} / ${submission.total}`),
    el('span', '', `Submitted ${formatDateTime(submission.submittedAt)}`),
    el('span', '', `Time taken ${formatDuration(submission.timeTakenSeconds)}`),
  );
  panel.appendChild(facts);

  if ((submission.skills || []).length > 0) {
    const list = el('ul', 'fac-skills');
    for (const skill of submission.skills) {
      const time = Number.isFinite(skill.seconds) ? ` · ${formatDuration(skill.seconds)}` : '';
      list.appendChild(el('li', '', `${skill.label}: ${skill.points} / ${skill.outOf}${time}`));
    }
    panel.appendChild(list);
  }

  const loading = el('p', 'fac-status', 'Loading the answers…');
  panel.appendChild(loading);
  let details;
  try {
    details = await detailsFor(submission.id);
  } catch (error) {
    if (state.selectedId !== submission.id) return;
    loading.remove();
    if (error.status === 401) {
      signOut();
      showLogin('Wrong password. Please sign in again.');
      return;
    }
    panel.appendChild(el('p', 'fac-error', `The answers could not be loaded: ${error.message}`));
    return;
  }
  const quiz = await quizFor(submission.quizId);
  if (state.selectedId !== submission.id) return; // another row was chosen meanwhile
  loading.remove();
  if (quiz.error) {
    panel.appendChild(el('p', 'fac-error', `The quiz could not be loaded, so the answers cannot be shown: ${quiz.error.message}`));
    return;
  }
  if (details.quizChanged || (details.quizVersion && details.quizVersion !== quizFingerprint(quiz.questions))) {
    panel.appendChild(el('p', 'fac-warning', details.quizChanged
      ? 'The quiz had been edited before these results arrived, so answers to questions that changed were not counted, and some questions below may differ from what this person saw.'
      : 'The quiz has been edited since this was submitted, so some questions below may differ from what this person saw. The score and skills above are as graded at the time.'));
  }

  const filter = el('div', 'fac-review-filter');
  filter.setAttribute('role', 'group');
  for (const [value, label] of [['all', 'All questions'], ['wrong', 'Wrong only']]) {
    const button = el('button', 'fac-secondary', label);
    button.type = 'button';
    button.setAttribute('aria-pressed', String(state.reviewFilter === value));
    button.addEventListener('click', () => {
      state.reviewFilter = value;
      renderReview();
    });
    filter.appendChild(button);
  }
  panel.appendChild(filter);

  const items = reviewItems(quiz.questions, details.answers);
  const shown = state.reviewFilter === 'wrong' ? items.filter((item) => !item.response.isCorrect) : items;
  if (shown.length === 0) panel.appendChild(el('p', 'fac-status', 'Every question was answered correctly.'));
  for (const item of shown) {
    panel.appendChild(renderQuestionCard(item.question, item.number, quiz.meta.uiText, item.response));
  }
}

// --- CSV export ---

function exportCsv() {
  if (state.submissions.length === 0) {
    setStatus('There is nothing to export for these dates.');
    return;
  }
  const blob = new Blob([buildResultsCsv(state.submissions)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${state.quizId}-results-${formatDateYMD(new Date())}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// --- Start ---

function init() {
  // Results this browser could not send earlier (a participant on this device).
  flushOutbox(getStorage(window)).catch(() => {});

  $('login-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const password = $('password-input').value;
    if (password) signIn(password);
  });
  $('sign-out-btn').addEventListener('click', signOut);
  $('export-csv-btn').addEventListener('click', exportCsv);
  $('quiz-select').addEventListener('change', (event) => {
    state.quizId = event.target.value;
    state.selectedId = null;
    refresh();
  });
  $('from-date').addEventListener('change', refresh);
  $('to-date').addEventListener('change', refresh);

  const saved = readSession(PASSWORD_KEY);
  if (saved) signIn(saved);
  else showLogin('');
}

if (typeof document !== 'undefined' && document.getElementById('login-form')) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}
