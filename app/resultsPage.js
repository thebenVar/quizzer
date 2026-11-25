// The facilitators' results page (results.html): sign in with the facilitator
// password, pick a quiz, cohort and dates, then
//   Dashboard: headline numbers and charts for those filters (app/dashboardView.js);
//   Results: every submission, one person's answers, CSV export, delete;
//   Question statistics: per question, from GET /api/stats, with a CSV export;
//   Cohorts: make cohort codes with a link to share, deactivate / reactivate them.
// Every value from the server is put on the page as text (textContent), never
// as HTML: names, cohort names and typed answers come from people.
import { loadQuiz, loadRegistry } from './loader.js';
import { quizFingerprint, getStorage } from './progress.js';
import { answerStatus } from './grading.js';
import { renderQuestionCard } from './answerKey.js';
import { buildResultsCsv, cohortText, formatDateTime, formatDuration, skillColumns } from './resultsCsv.js';
import { buildStatsCsv } from './statsFormat.js';
import { renderStatsView } from './statsView.js';
import { renderDashboard } from './dashboardView.js';
import { flushOutbox } from './submissions.js';
import { formatDateYMD } from './results.js';

const PASSWORD_KEY = 'quizzer:facilitator-password';
const TABS = ['dashboard', 'results', 'stats', 'cohorts'];

const state = {
  password: '',
  quizIds: [],
  quizId: '',
  cohortFilter: '', // '' = all, 'none', or a cohort code
  cohorts: [],
  tab: 'dashboard',
  submissions: [],
  selectedId: null,
  reviewFilter: 'all',
  stats: null,
  statsSort: 'quiz',
  statsSelected: null,
  statsFlag: '', // '' or a flag id: only the questions with that flag
  dashboardRequest: 0,
  dashboardStats: null, // the dashboard's own copy, so it never overwrites the Question statistics tab's
  statsRequest: 0,
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

// Calls one of the facilitator APIs (api/results, api/stats, api/cohorts).
async function api(method, path, params = {}, body = undefined) {
  const query = new URLSearchParams(params).toString();
  const headers = {
    // Percent-encoded, so a password in any script fits in a header (api/_lib/auth.js decodes it).
    Authorization: `Bearer ${encodeURIComponent(state.password)}`,
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(query ? `${path}?${query}` : path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError(0, 'The server could not be reached. Check the connection and try again.');
  }
  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  if (!response.ok || !json || json.ok !== true) {
    const message = json && json.error
      ? json.error
      : `The results service is not available here (HTTP ${response.status}). It runs on the Vercel deployment or with "vercel dev".`;
    throw new ApiError(response.status, message);
  }
  return json;
}

// A 401 anywhere means the password is no longer right: back to the sign-in form.
function handleAuthError(error) {
  if (error && error.status === 401) {
    signOut();
    showLogin('Wrong password. Please sign in again.');
    return true;
  }
  return false;
}

// The link that opens the quiz with the code filled in, next to this page.
export function cohortLink(pageHref, quizId, code) {
  const url = new URL('./', pageHref);
  url.search = new URLSearchParams({ quiz: quizId, code }).toString();
  return url.toString();
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
  state.stats = null;
  state.dashboardStats = null;
  state.details.clear();
  showLogin('');
}

async function signIn(password) {
  state.password = password;
  $('login-btn').disabled = true;
  try {
    const body = await api('GET', 'api/results');
    writeSession(PASSWORD_KEY, password);
    $('login-form').hidden = true;
    $('results-view').hidden = false;
    state.quizIds = await quizChoices(body.quizIds);
    fillQuizPicker();
    await changeQuiz();
  } catch (error) {
    state.password = '';
    writeSession(PASSWORD_KEY, '');
    showLogin(error.status === 401 ? 'Wrong password. Please try again.' : error.message);
  } finally {
    $('login-btn').disabled = false;
  }
}

// --- Quiz, cohort and date filters ---

function quizFor(quizId) {
  if (!state.quizzes.has(quizId)) {
    state.quizzes.set(quizId, loadQuiz(quizId).catch((error) => ({ error })));
  }
  return state.quizzes.get(quizId);
}

// Quizzes with results, plus the registered quizzes that collect results
// (so cohort codes can be made before anyone has taken the quiz).
async function quizChoices(withResults) {
  const ids = new Set(withResults);
  try {
    const registry = await loadRegistry();
    const registered = [...registry.quizzes, ...registry.unlisted];
    const quizzes = await Promise.all(registered.map((quizId) => quizFor(quizId)));
    registered.forEach((quizId, index) => {
      if (quizzes[index].meta && quizzes[index].meta.collectResults) ids.add(quizId);
    });
  } catch {
    // Without the registry, the quizzes with results are enough.
  }
  return [...ids].sort();
}

function fillQuizPicker() {
  const select = $('quiz-select');
  select.replaceChildren();
  if (state.quizIds.length === 0) {
    select.appendChild(el('option', '', 'No quizzes collect results'));
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

function fillCohortPicker() {
  const select = $('cohort-select');
  select.replaceChildren();
  const choices = [['', 'All cohorts'], ['none', 'No cohort']];
  for (const cohort of state.cohorts) {
    choices.push([cohort.code, `${cohort.label} (${cohort.code})${cohort.active ? '' : ' – inactive'}`]);
  }
  for (const [value, label] of choices) {
    const option = el('option', '', label);
    option.value = value;
    select.appendChild(option);
  }
  if (!choices.some(([value]) => value === state.cohortFilter)) state.cohortFilter = '';
  select.value = state.cohortFilter;
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

function filterParams() {
  const params = { quiz: state.quizId };
  const { from, to } = dateRange();
  if (from) params.from = from;
  if (to) params.to = to;
  if (state.cohortFilter) params.cohort = state.cohortFilter;
  return params;
}

async function changeQuiz() {
  state.selectedId = null;
  state.statsSelected = null;
  state.statsFlag = '';
  state.cohortFilter = '';
  await loadCohorts();
  await refreshTab();
}

async function refreshTab() {
  if (state.tab === 'dashboard') await refreshDashboard();
  else if (state.tab === 'stats') await refreshStats();
  else if (state.tab === 'cohorts') renderCohorts();
  else await refresh();
}

function showTab(tab) {
  state.tab = tab;
  for (const name of TABS) {
    $(`tab-${name}`).hidden = name !== tab;
    $(`tab-${name}-btn`).setAttribute('aria-selected', String(name === tab));
  }
  return refreshTab();
}

// --- Dashboard ---

async function refreshDashboard() {
  const root = $('dashboard-view');
  const status = $('dashboard-status');
  if (!state.quizId) {
    root.replaceChildren();
    status.textContent = 'No results have been sent yet.';
    return;
  }
  const request = ++state.dashboardRequest;
  status.textContent = 'Loading…';
  root.classList.add('dash-loading'); // the previous render stays, faded, until the new one is ready
  const params = filterParams();
  try {
    const [list, statsResult, quiz] = await Promise.all([
      api('GET', 'api/results', params),
      api('GET', 'api/stats', params).then((body) => ({ body }), (error) => ({ error })),
      quizFor(state.quizId),
    ]);
    if (request !== state.dashboardRequest) return; // the filters changed meanwhile
    if (statsResult.error && handleAuthError(statsResult.error)) return;
    state.dashboardStats = statsResult.body ?? null;
    renderDashboard(root, {
      submissions: list.submissions,
      stats: state.dashboardStats,
      statsError: statsResult.error ? statsResult.error.message : '',
      quizSkills: quiz.meta ? quiz.meta.skills : [],
      from: $('from-date').value,
      to: $('to-date').value,
      cohortFilter: state.cohortFilter,
      // Creation order (the list is newest first), so a cohort keeps its colour whatever is in view.
      cohortOrder: [...state.cohorts].reverse().map((cohort) => `id:${cohort.id}`),
      truncated: list.truncated,
      limit: list.limit,
      now: new Date(),
      onOpenSubmission: openSubmission,
      onOpenStats: openStatsWithFlag,
    });
    status.textContent = '';
  } catch (error) {
    if (request !== state.dashboardRequest) return;
    if (handleAuthError(error)) return;
    root.replaceChildren();
    status.textContent = error.message;
  } finally {
    if (request === state.dashboardRequest) root.classList.remove('dash-loading');
  }
}

// From the dashboard's latest submissions: that person's answers on the Results tab.
async function openSubmission(id) {
  state.selectedId = id;
  await showTab('results');
  if (state.selectedId === id) $('review-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// From the dashboard's question health: the statistics with only that flag.
function openStatsWithFlag(flag) {
  state.statsFlag = flag;
  state.statsSort = flag === 'very-hard' ? 'correct' : 'quiz';
  state.statsSelected = null;
  showTab('stats');
}

// --- Results ---

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
  try {
    const body = await api('GET', 'api/results', filterParams());
    state.submissions = body.submissions;
    if (!state.submissions.some((submission) => submission.id === state.selectedId)) state.selectedId = null;
    renderTable();
    renderReview();
    const count = state.submissions.length;
    const more = body.truncated ? ` Only the newest ${body.limit} are shown; choose dates to see older ones.` : '';
    setStatus(count === 0 ? 'No results for these filters.' : `${count} ${count === 1 ? 'result' : 'results'}, newest first.${more}`);
  } catch (error) {
    if (handleAuthError(error)) return;
    setStatus(error.message);
  }
}

function renderTable() {
  const skills = skillColumns(state.submissions);
  const headRow = el('tr');
  headRow.append(el('th', '', 'Name'), el('th', '', 'Date'), el('th', '', 'Cohort'), el('th', 'num', 'Score'));
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
      el('td', submission.cohortLabel ? '' : 'fac-muted', cohortText(submission)),
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
    await api('DELETE', 'api/results', { id: submission.id });
    if (state.selectedId === submission.id) state.selectedId = null;
    state.stats = null;
    await refresh();
    setStatus(`Deleted the results of ${submission.name}. ${$('results-status').textContent}`);
  } catch (error) {
    if (handleAuthError(error)) return;
    window.alert(`The results could not be deleted: ${error.message}`);
  }
}

// The full submission (with answers), fetched when its row is opened.
function detailsFor(id) {
  if (!state.details.has(id)) {
    const request = api('GET', 'api/results', { id }).then((body) => body.submission);
    request.catch(() => state.details.delete(id));
    state.details.set(id, request);
  }
  return state.details.get(id);
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
  if (cohortText(submission)) facts.appendChild(el('span', '', `Cohort ${cohortText(submission)}`));
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
    if (handleAuthError(error)) return;
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

// --- Downloads ---

function download(text, fileName) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function filterSuffix() {
  return state.cohortFilter ? `-${state.cohortFilter.toLowerCase()}` : '';
}

function exportCsv() {
  if (state.submissions.length === 0) {
    setStatus('There is nothing to export for these filters.');
    return;
  }
  download(buildResultsCsv(state.submissions), `${state.quizId}${filterSuffix()}-results-${formatDateYMD(new Date())}.csv`);
}

function exportStatsCsv() {
  if (!state.stats || state.stats.submissions === 0) {
    $('stats-status').textContent = 'There are no statistics to export for these filters.';
    return;
  }
  download(buildStatsCsv(state.stats), `${state.quizId}${filterSuffix()}-statistics-${formatDateYMD(new Date())}.csv`);
}

// --- Question statistics ---

async function refreshStats() {
  const root = $('stats-view');
  const status = $('stats-status');
  if (!state.quizId) {
    root.replaceChildren();
    status.textContent = 'No quiz to show.';
    return;
  }
  status.textContent = 'Computing the statistics…';
  const request = ++state.statsRequest;
  try {
    const [body, quiz] = await Promise.all([api('GET', 'api/stats', filterParams()), quizFor(state.quizId)]);
    if (request !== state.statsRequest) return; // the filters changed meanwhile
    state.stats = body;
    status.textContent = body.submissions === 0 ? 'No submissions for these filters (on the current version of the quiz).' : '';
    renderStats(quiz.meta ? quiz : null);
  } catch (error) {
    if (request !== state.statsRequest) return;
    if (handleAuthError(error)) return;
    state.stats = null;
    root.replaceChildren();
    status.textContent = error.message;
  }
}

function renderStats(quiz) {
  if (!state.stats) return;
  renderStatsView($('stats-view'), {
    stats: state.stats,
    quiz,
    sort: state.statsSort,
    selectedId: state.statsSelected,
    flagFilter: state.statsFlag,
    onFlagFilter: (flag) => {
      state.statsFlag = flag;
      renderStats(quiz);
    },
    onSort: (sort) => {
      state.statsSort = sort;
      renderStats(quiz);
    },
    onSelect: (id) => {
      state.statsSelected = String(state.statsSelected) === String(id) ? null : id;
      renderStats(quiz);
      const details = document.querySelector('.stats-details');
      if (details) details.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
  });
}

// --- Cohorts ---

async function loadCohorts() {
  state.cohorts = [];
  if (state.quizId) {
    const quiz = await quizFor(state.quizId);
    if (!quiz.meta || quiz.meta.cohortCodes !== 'off') {
      try {
        state.cohorts = (await api('GET', 'api/cohorts', { quiz: state.quizId })).cohorts;
      } catch (error) {
        if (handleAuthError(error)) return;
        $('cohorts-status').textContent = error.message;
      }
    }
  }
  fillCohortPicker();
  renderCohorts();
}

async function renderCohorts() {
  const quiz = state.quizId ? await quizFor(state.quizId) : null;
  const off = !quiz || (quiz.meta && quiz.meta.cohortCodes === 'off');
  $('cohorts-off').hidden = !off;
  $('cohorts-off').textContent = off ? 'This quiz does not use cohort codes. To use them, set "cohortCodes" to "optional" or "required" in its meta.json.' : '';
  $('cohort-form').hidden = off;

  const head = el('tr');
  for (const label of ['Name', 'Code', 'Link to share', 'Results', 'Status', '']) head.appendChild(el('th', '', label));
  $('cohorts-table').tHead.replaceChildren(head);
  const body = $('cohorts-table').tBodies[0];
  body.replaceChildren();
  for (const cohort of state.cohorts) {
    const row = el('tr', cohort.active ? '' : 'fac-inactive');
    const link = cohortLink(window.location.href, cohort.quizId, cohort.code);
    const linkCell = el('td');
    const linkBox = el('div', 'fac-link');
    const input = el('input');
    input.type = 'text';
    input.readOnly = true;
    input.value = link;
    input.setAttribute('aria-label', `Link for ${cohort.label}`);
    const copy = el('button', 'fac-secondary fac-small', 'Copy');
    copy.type = 'button';
    copy.addEventListener('click', () => copyText(link, input, copy));
    linkBox.append(input, copy);
    linkCell.appendChild(linkBox);

    const status = el('td');
    status.appendChild(el('span', 'fac-badge', cohort.active ? 'Active' : 'Inactive'));
    const toggleCell = el('td');
    const toggle = el('button', 'fac-secondary fac-small', cohort.active ? 'Deactivate' : 'Reactivate');
    toggle.type = 'button';
    toggle.addEventListener('click', () => setCohortActive(cohort, !cohort.active));
    toggleCell.appendChild(toggle);

    row.append(el('td', 'fac-name', cohort.label), el('td', 'fac-code', cohort.code), linkCell, el('td', 'num', cohort.submissionCount ?? 0), status, toggleCell);
    body.appendChild(row);
  }
  if (!off) {
    $('cohorts-status').textContent = state.cohorts.length === 0 ? 'No cohort codes yet for this quiz.' : `${state.cohorts.length} ${state.cohorts.length === 1 ? 'cohort' : 'cohorts'}, newest first.`;
  } else {
    $('cohorts-status').textContent = '';
  }
}

async function copyText(text, input, button) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    input.focus();
    input.select();
    try {
      document.execCommand('copy');
    } catch {
      // The link stays selected for the facilitator to copy by hand.
    }
  }
  const label = button.textContent;
  button.textContent = 'Copied';
  setTimeout(() => { button.textContent = label; }, 1500);
}

async function createCohort(event) {
  event.preventDefault();
  const label = $('cohort-label-input').value.trim();
  if (!label) return;
  $('cohort-create-btn').disabled = true;
  try {
    const body = await api('POST', 'api/cohorts', {}, { quizId: state.quizId, label });
    $('cohort-label-input').value = '';
    await loadCohorts();
    $('cohorts-status').textContent = `Created "${body.cohort.label}" with the code ${body.cohort.code}.`;
  } catch (error) {
    if (handleAuthError(error)) return;
    $('cohorts-status').textContent = `The cohort could not be created: ${error.message}`;
  } finally {
    $('cohort-create-btn').disabled = false;
  }
}

async function setCohortActive(cohort, active) {
  if (!active && !window.confirm(`Deactivate the code ${cohort.code} (${cohort.label})?\n\nParticipants will no longer be able to start with it. Results already sent keep their cohort. You can reactivate it later.`)) return;
  try {
    await api('PATCH', 'api/cohorts', { id: cohort.id }, { active });
    await loadCohorts();
  } catch (error) {
    if (handleAuthError(error)) return;
    $('cohorts-status').textContent = `The cohort could not be changed: ${error.message}`;
  }
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
  $('export-stats-btn').addEventListener('click', exportStatsCsv);
  $('cohort-form').addEventListener('submit', createCohort);
  for (const tab of TABS) {
    $(`tab-${tab}-btn`).addEventListener('click', () => showTab(tab));
  }
  $('quiz-select').addEventListener('change', (event) => {
    state.quizId = event.target.value;
    changeQuiz();
  });
  $('cohort-select').addEventListener('change', (event) => {
    state.cohortFilter = event.target.value;
    state.selectedId = null;
    refreshTab();
  });
  const onDates = () => refreshTab();
  $('from-date').addEventListener('change', onDates);
  $('to-date').addEventListener('change', onDates);

  const saved = readSession(PASSWORD_KEY);
  if (saved) signIn(saved);
  else showLogin('');
}

if (typeof document !== 'undefined' && document.getElementById('login-form')) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}
