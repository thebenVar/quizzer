/**
 * @vitest-environment jsdom
 */
// The Dashboard tab of the facilitators' page (app/dashboardView.js).
import { describe, expect, it, vi } from 'vitest';

import { renderDashboard } from '../app/dashboardView.js';

const at = (year, month, day, hour = 12) => new Date(year, month - 1, day, hour).toISOString();
const now = new Date(2026, 10, 25, 18);
const quizSkills = [{ id: 'read', label: 'Reading' }, { id: 'write', label: 'Writing' }];
const evil = '<img src=x onerror=alert(1)>';

function submission(index, overrides = {}) {
  return {
    id: `s${index}`,
    quizId: 'quiz',
    name: `Person ${index}`,
    submittedAt: at(2026, 11, 10 + (index % 15), 9 + (index % 8)),
    score: 10 + (index % 30),
    total: 40,
    timeTakenSeconds: 600 + index * 7,
    cohortId: ['c1', 'c2', null][index % 3],
    cohortLabel: ['North', 'South', null][index % 3],
    cohortCode: null,
    skills: [
      { id: 'read', label: 'Reading', points: index % 5, outOf: 4, seconds: 100 },
      { id: 'write', label: 'Writing', points: index % 3, outOf: 2, seconds: 60 },
    ],
    ...overrides,
  };
}

const stats = {
  submissions: 12, excluded: 0, enoughData: true,
  questions: [
    { id: 1, percentCorrect: 95, discrimination: 0.4 },
    { id: 2, percentCorrect: 10, discrimination: 0.1 },
    { id: 3, percentCorrect: 50, discrimination: 0.5 },
  ],
};

function render(options) {
  const root = document.createElement('div');
  document.body.replaceChildren(root); // one dashboard at a time: the cards have ids
  renderDashboard(root, { quizSkills, now, stats, ...options });
  return root;
}

describe('dashboard', () => {
  it('shows the headline numbers and every chart with a table view', () => {
    const list = Array.from({ length: 30 }, (_, index) => submission(index));
    const root = render({ submissions: list });
    const tiles = [...root.querySelectorAll('.dash-tile')].map((tile) => tile.querySelector('.dash-tile-label').textContent);
    expect(tiles).toEqual(['Submissions', 'Average score', 'Median time taken', 'Cohorts', 'Last 7 days']);
    expect(root.querySelector('.dash-tile-value').textContent).toBe('30');
    for (const id of ['dash-over-time', 'dash-distribution', 'dash-skills', 'dash-cohorts', 'dash-health', 'dash-latest']) {
      expect(root.querySelector(`#${id}`)).not.toBeNull();
    }
    expect(root.querySelectorAll('#dash-over-time svg .dash-col').length).toBeGreaterThan(0);
    expect(root.querySelector('#dash-distribution .dash-marker-label').textContent).toMatch(/^Average \d+%$/);
    // Several cohorts in view: the skills are a dot plot with a legend.
    expect(root.querySelectorAll('#dash-skills .dash-legend li')).toHaveLength(4);
    expect(root.querySelectorAll('#dash-skills .dash-dot')).toHaveLength(6);
    expect([...root.querySelectorAll('#dash-skills .dash-bar-name')].map((name) => name.textContent)).toEqual(['Reading', 'Writing']);
    expect(root.querySelectorAll('#dash-latest tbody tr')).toHaveLength(5);
  });

  it('switches each chart to a table and back', () => {
    const root = render({ submissions: Array.from({ length: 12 }, (_, index) => submission(index)) });
    const toggles = root.querySelectorAll('.dash-table-toggle');
    expect(toggles).toHaveLength(4);
    const card = root.querySelector('#dash-distribution');
    const toggle = card.querySelector('.dash-table-toggle');
    toggle.click();
    expect(card.querySelector('.dash-chart').hidden).toBe(true);
    expect(card.querySelector('.dash-table-view').hidden).toBe(false);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    const rows = [...card.querySelectorAll('.dash-table tbody tr')];
    expect(rows).toHaveLength(10);
    expect(rows.reduce((sum, row) => sum + Number(row.cells[1].textContent), 0)).toBe(12);
    toggle.click();
    expect(card.querySelector('.dash-chart').hidden).toBe(false);
    expect(toggle.textContent).toBe('Show as table');

    const cohortRows = [...root.querySelectorAll('#dash-cohorts .dash-table tbody tr')].map((row) => row.cells[0].textContent);
    expect(cohortRows.sort()).toEqual(['No cohort', 'North', 'South']);
  });

  it('shows names and cohort names as text, never as HTML', () => {
    const list = [
      submission(1, { name: evil, cohortId: 'x', cohortLabel: `<b>${evil}</b>` }),
      submission(2, { cohortId: 'y', cohortLabel: '<script>alert(2)</script>' }),
    ];
    const root = render({ submissions: list });
    expect(root.querySelector('img')).toBeNull();
    expect(root.querySelector('b')).toBeNull();
    expect(root.querySelector('script')).toBeNull();
    expect(root.textContent).toContain(evil);
    expect(root.querySelector('#dash-cohorts .dash-bar-name').textContent).toMatch(/<(b|script)>/);
    // The tooltip shows labels as text too.
    root.querySelector('#dash-cohorts .dash-track').dispatchEvent(new Event('pointerenter'));
    const tip = root.querySelector('.dash-tooltip');
    expect(tip.hidden).toBe(false);
    expect(tip.querySelector('img, b, script')).toBeNull();
  });

  it('says so plainly when there are no submissions', () => {
    const root = render({ submissions: [] });
    expect(root.querySelector('.dash-tile')).toBeNull();
    expect(root.textContent).toContain('No submissions for these filters yet');
  });

  it('shows the numbers but no charts for a single submission', () => {
    const root = render({ submissions: [submission(1)], stats: { submissions: 1, excluded: 0, enoughData: false, questions: [{ id: 1, percentCorrect: 100, discrimination: null }] } });
    expect(root.querySelectorAll('.dash-tile')).toHaveLength(5);
    expect(root.querySelector('svg')).toBeNull();
    expect(root.textContent).toContain('There is one submission for these filters');
    expect(root.querySelectorAll('#dash-latest tbody tr')).toHaveLength(1);
    const off = root.querySelector('#dash-health [data-flag="no-separation"]');
    expect(off.tagName).toBe('DIV'); // not a link to an empty list
    expect(off.textContent).toContain('needs 10 submissions');
    expect(root.querySelectorAll('#dash-health button')).toHaveLength(2);
    expect(root.querySelector('#dash-health').textContent).toContain('only a first impression');
  });

  it('draws one series of meter bars per skill when one cohort is chosen', () => {
    const list = Array.from({ length: 6 }, (_, index) => submission(index, { cohortId: 'c1', cohortLabel: 'North' }));
    const root = render({ submissions: list, cohortFilter: 'ABC234' });
    expect(root.querySelector('#dash-skills .dash-legend')).toBeNull();
    expect(root.querySelectorAll('#dash-skills .dash-bar')).toHaveLength(2);
    const cohorts = root.querySelector('#dash-cohorts');
    expect(cohorts.querySelector('.dash-bars, .dash-table-toggle')).toBeNull(); // no one-bar chart
    expect(cohorts.textContent).toMatch(/North: average \d+% over 6 submissions/);
    expect(cohorts.textContent).toContain('choose "All cohorts"');
  });

  it('gives a cohort the same colour whatever else is in view', () => {
    const cohortOrder = ['id:c1', 'id:c2'];
    const colourOf = (list, label) => {
      const root = render({ submissions: list, cohortOrder });
      const key = [...root.querySelectorAll('#dash-skills .dash-legend li')].find((item) => item.textContent.startsWith(label));
      return key.querySelector('.dash-key').style.background;
    };
    const many = Array.from({ length: 12 }, (_, index) => submission(index));
    const southHeavy = Array.from({ length: 12 }, (_, index) => submission(index, index < 9 ? { cohortId: 'c2', cohortLabel: 'South' } : {}));
    expect(colourOf(many, 'South')).toBe(colourOf(southHeavy, 'South'));
    expect(colourOf(many, 'North')).toBe(colourOf(southHeavy, 'North'));
    expect(colourOf(many, 'North')).not.toBe(colourOf(many, 'South'));
  });

  it('marks cohorts with few submissions', () => {
    const list = Array.from({ length: 7 }, (_, index) => submission(index, index < 2 ? { cohortId: 'small', cohortLabel: 'Small group' } : { cohortId: 'big', cohortLabel: 'Big group' }));
    const root = render({ submissions: list });
    const names = [...root.querySelectorAll('#dash-cohorts .dash-bar-row:not(.dash-scale-row)')].map((row) => row.textContent);
    expect(names.find((text) => text.includes('Small group'))).toContain('n = 2 (small)');
    expect(names.find((text) => text.includes('Big group'))).not.toContain('(small)');
    expect(root.querySelector('#dash-cohorts').textContent).toContain('fewer than 5 submissions');
  });

  it('links question health to the statistics and latest submissions to the review', () => {
    const onOpenStats = vi.fn();
    const onOpenSubmission = vi.fn();
    const list = Array.from({ length: 8 }, (_, index) => submission(index));
    const root = render({ submissions: list, onOpenStats, onOpenSubmission });
    const counts = Object.fromEntries([...root.querySelectorAll('#dash-health [data-flag]')].map((button) => [button.dataset.flag, button.querySelector('.dash-health-count').textContent]));
    expect(counts).toEqual({ 'very-easy': '1', 'very-hard': '1', 'no-separation': '1' });
    root.querySelector('#dash-health [data-flag="very-hard"]').click();
    expect(onOpenStats).toHaveBeenCalledWith('very-hard');
    const first = root.querySelector('#dash-latest tbody tr');
    first.click();
    expect(onOpenSubmission).toHaveBeenCalledWith(first.dataset.id);
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(onOpenSubmission).toHaveBeenCalledTimes(2);
  });

  it('says when the statistics are not available', () => {
    const list = Array.from({ length: 3 }, (_, index) => submission(index));
    expect(render({ submissions: list, stats: { submissions: 0, excluded: 3, questions: [] } }).querySelector('#dash-health').textContent).toContain('No question statistics yet');
    expect(render({ submissions: list, stats: null, statsError: 'Boom' }).querySelector('#dash-health').textContent).toContain('could not be loaded: Boom');
  });

  it('says so in words, not with one bar, when everything came on one day', () => {
    const list = Array.from({ length: 3 }, (_, index) => submission(index, { submittedAt: at(2026, 11, 25, 9 + index) }));
    const card = render({ submissions: list, from: '2026-11-25', to: '2026-11-25' }).querySelector('#dash-over-time');
    expect(card.querySelector('svg')).toBeNull();
    expect(card.textContent).toContain('All 3 submissions came on one day, 25 Nov 2026.');
  });

  it('is the first tab of the results page, shown after sign-in', async () => {
    const { readFile } = await import('node:fs/promises');
    const html = await readFile('results.html', 'utf8'); // tests run from the project folder
    const page = new DOMParser().parseFromString(html, 'text/html');
    const tabs = [...page.querySelectorAll('[role="tab"]')];
    expect(tabs.map((tab) => tab.id)).toEqual(['tab-dashboard-btn', 'tab-results-btn', 'tab-stats-btn', 'tab-cohorts-btn']);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(page.getElementById('tab-dashboard').hidden).toBe(false);
    for (const id of ['tab-results', 'tab-stats', 'tab-cohorts']) expect(page.getElementById(id).hidden).toBe(true);
  });

  it('reads each column with the keyboard', () => {
    const root = render({ submissions: Array.from({ length: 10 }, (_, index) => submission(index)) });
    const chart = root.querySelector('#dash-distribution svg');
    chart.dispatchEvent(new Event('focus'));
    const tip = root.querySelector('.dash-tooltip');
    expect(tip.hidden).toBe(false);
    expect(tip.textContent).toContain('Score 90–100%');
    chart.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
    expect(tip.textContent).toContain('Score 0–10%');
    chart.dispatchEvent(new Event('blur'));
    expect(tip.hidden).toBe(true);
  });

  it('renders 2000 submissions quickly', () => {
    const list = Array.from({ length: 2000 }, (_, index) => submission(index, { submittedAt: at(2026, 1 + (index % 11), 1 + (index % 28)) }));
    const started = performance.now();
    const root = render({ submissions: list, truncated: true, limit: 2000 });
    expect(performance.now() - started).toBeLessThan(1500);
    expect(root.textContent).toContain('Newest 2000 only');
  });
});

describe('question statistics filter', () => {
  it('shows only the questions with the chosen flag', async () => {
    const { renderStatsView } = await import('../app/statsView.js');
    const full = {
      submissions: 12, excluded: 0, enoughData: true, limit: 2000, truncated: false,
      overall: { averageScore: 1, total: 3, averagePercent: 33, skills: [] },
      questions: [
        { number: 1, id: 1, type: 'mcq', prompt: 'Easy', answered: 12, percentCorrect: 95, discrimination: 0.4, averageSeconds: 5 },
        { number: 2, id: 2, type: 'mcq', prompt: 'Hard', answered: 12, percentCorrect: 10, discrimination: 0.4, averageSeconds: 5 },
      ],
    };
    const root = document.createElement('div');
    const onFlagFilter = vi.fn();
    renderStatsView(root, { stats: full, quiz: null, flagFilter: 'very-hard', onFlagFilter });
    expect([...root.querySelectorAll('tbody tr')].map((row) => row.dataset.id)).toEqual(['2']);
    const select = root.querySelector('#stats-flag-filter');
    expect(select.value).toBe('very-hard');
    select.value = '';
    select.dispatchEvent(new Event('change'));
    expect(onFlagFilter).toHaveBeenCalledWith('');
    renderStatsView(root, { stats: full, quiz: null, flagFilter: 'no-separation' });
    expect(root.textContent).toContain('No questions are flagged');
  });
});
