// The Dashboard tab of the facilitators' page: headline numbers, then charts
// drawn by hand (SVG columns, HTML meter rows and a dot plot; no chart library),
// question health from the statistics and the latest submissions.
// Every chart has a hover / keyboard tooltip and a "Show as table" view.
// Names and cohort names come from people, so everything is put on the page
// with textContent, never as HTML. The numbers come from app/dashboardData.js.
import {
  HEALTH_FLAGS, MAX_COHORT_SERIES, SMALL_COHORT,
  cohortGroups, headline, latestSubmissions, niceScale, questionHealth,
  scoreHistogram, scorePercent, skillAverages, skillsByCohort, timeBuckets,
} from './dashboardData.js';
import { STATS_THRESHOLDS, STAT_FLAG_NAMES } from './statsFormat.js';
import { cohortText, formatDateTime, formatDuration } from './resultsCsv.js';

// Categorical slots 1–3 of the documented palette (validated all-pairs on the
// page's white surface), the "Other" gray, and the chart furniture.
export const DASHBOARD_COLORS = Object.freeze({
  series: Object.freeze(['#2a78d6', '#eb6834', '#1baf7a']),
  other: '#898781',
  context: '#c3c2b7',
  track: '#e8f0fb',
  grid: '#e9ecef',
  axis: '#ced4da',
  tick: '#6c757d',
  ink: '#343a40',
  marker: '#495057',
});

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined && text !== null) element.textContent = String(text);
  return element;
}

function svg(tag, attributes = {}, text) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
  if (text !== undefined) element.textContent = String(text);
  return element;
}

function plural(count, one, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}

function percentText(value) {
  return value === null || value === undefined ? '–' : `${Math.round(value)}%`;
}

// --- Tooltip (one per dashboard) ---

function createTooltip(root) {
  const tip = el('div', 'dash-tooltip');
  tip.hidden = true;
  tip.setAttribute('aria-hidden', 'true');
  root.appendChild(tip);

  // rows: [{ value, label, color? }]; the value leads, the label follows.
  function show(anchor, rows) {
    tip.replaceChildren();
    for (const row of rows) {
      const line = el('div', 'dash-tip-row');
      if (row.color) {
        const key = el('span', 'dash-tip-key');
        key.style.background = row.color;
        line.appendChild(key);
      }
      line.append(el('strong', '', row.value), el('span', '', row.label));
      tip.appendChild(line);
    }
    tip.hidden = false;
    const rootBox = root.getBoundingClientRect();
    const box = anchor.getBoundingClientRect();
    const width = tip.offsetWidth;
    const height = tip.offsetHeight;
    let left = box.left - rootBox.left + box.width / 2 - width / 2;
    left = Math.max(0, Math.min(left, rootBox.width - width));
    let top = box.top - rootBox.top - height - 8;
    if (top < 0) top = box.bottom - rootBox.top + 8;
    tip.style.left = `${Math.round(left)}px`;
    tip.style.top = `${Math.round(top)}px`;
  }
  function hide() {
    tip.hidden = true;
  }
  return { show, hide };
}

// --- Card with a "Show as table" switch ---

function dataTable(headers, rows) {
  const wrap = el('div', 'fac-table-wrap');
  const table = el('table', 'dash-table');
  const head = el('tr');
  for (const [label, numeric] of headers) head.appendChild(el('th', numeric ? 'num' : '', label));
  table.createTHead().appendChild(head);
  const body = table.createTBody();
  for (const row of rows) {
    const tr = el('tr');
    row.forEach((cell, index) => tr.appendChild(el('td', headers[index][1] ? 'num' : '', cell)));
    body.appendChild(tr);
  }
  wrap.appendChild(table);
  return wrap;
}

function card(id, title, subtitle, { chart = null, table = null, empty = '', notes = [] } = {}) {
  const section = el('section', 'dash-card');
  section.id = id;
  const head = el('div', 'dash-card-head');
  head.appendChild(el('h3', '', title));
  section.appendChild(head);
  if (subtitle) section.appendChild(el('p', 'dash-sub', subtitle));
  if (!chart) {
    section.appendChild(el('p', 'fac-status dash-empty', empty));
    return section;
  }
  const chartBox = el('div', 'dash-chart');
  chartBox.appendChild(chart);
  section.appendChild(chartBox);
  if (table) {
    const tableBox = el('div', 'dash-table-view');
    tableBox.hidden = true;
    tableBox.appendChild(table);
    section.appendChild(tableBox);
    const toggle = el('button', 'fac-secondary fac-small dash-table-toggle', 'Show as table');
    toggle.type = 'button';
    toggle.setAttribute('aria-pressed', 'false');
    toggle.addEventListener('click', () => {
      const showTable = tableBox.hidden;
      tableBox.hidden = !showTable;
      chartBox.hidden = showTable;
      toggle.textContent = showTable ? 'Show as chart' : 'Show as table';
      toggle.setAttribute('aria-pressed', String(showTable));
    });
    head.appendChild(toggle);
  }
  for (const note of notes) section.appendChild(el('p', 'dash-note', note));
  return section;
}

// --- Column chart (SVG), drawn at the width of its box ---

// bars: [{ value, tip: [{ value, label }], axisLabel? }]
// options: touching (histogram: 2px gaps, no 24px cap), xTicks [{ at: 0..1, label }],
// marker { at: 0..1, label }, ariaLabel.
function columnChart(bars, { touching = false, xTicks = null, marker = null, ariaLabel = '' }, tooltip, charts) {
  const box = el('div', 'dash-svg');
  let active = -1;

  function render(fullWidth) {
    const width = Math.max(240, Math.round(fullWidth));
    const height = 200;
    const margin = { top: marker ? 24 : 12, right: 18, bottom: 26, left: 34 };
    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;
    const { max, step } = niceScale(Math.max(...bars.map((bar) => bar.value)));
    const y = (value) => margin.top + plotH - (value / max) * plotH;
    const band = plotW / bars.length;
    const barW = touching ? Math.max(1, band - 2) : Math.max(2, Math.min(24, band * 0.7));

    const chart = svg('svg', { width, height, viewBox: `0 0 ${width} ${height}`, class: 'dash-svg-chart', tabindex: 0, role: 'img', 'aria-label': ariaLabel });
    const grid = svg('g', { class: 'dash-grid' });
    for (let tick = 0; tick <= max; tick += step) {
      const lineY = Math.round(y(tick)) + 0.5;
      grid.appendChild(svg('line', { x1: margin.left, x2: margin.left + plotW, y1: lineY, y2: lineY, stroke: tick === 0 ? DASHBOARD_COLORS.axis : DASHBOARD_COLORS.grid, 'stroke-width': 1 }));
      grid.appendChild(svg('text', { x: margin.left - 6, y: lineY, dy: '0.32em', 'text-anchor': 'end', class: 'dash-tick' }, tick));
    }
    chart.appendChild(grid);

    const marks = svg('g');
    const hits = svg('g');
    bars.forEach((bar, index) => {
      const x = margin.left + index * band + (band - barW) / 2;
      const top = y(bar.value);
      const h = margin.top + plotH - top;
      if (bar.value > 0) {
        const r = Math.min(4, barW / 2, h);
        const d = `M${x},${top + h}V${top + r}Q${x},${top} ${x + r},${top}H${x + barW - r}Q${x + barW},${top} ${x + barW},${top + r}V${top + h}Z`;
        marks.appendChild(svg('path', { d, fill: DASHBOARD_COLORS.series[0], class: 'dash-col', 'data-index': index }));
      }
      const hit = svg('rect', { x: margin.left + index * band, y: margin.top, width: band, height: plotH, fill: 'transparent', class: 'dash-hit', 'data-index': index });
      hit.addEventListener('pointerenter', () => activate(index));
      hit.addEventListener('pointerleave', () => activate(-1));
      hits.appendChild(hit);
    });
    chart.append(marks);

    // X labels: spaced so they never collide, and kept inside the chart.
    const labels = svg('g');
    const charWidth = 6.2;
    if (xTicks) {
      const minGap = Math.max(...xTicks.map((tick) => tick.label.length)) * charWidth + 10;
      const every = Math.max(1, Math.ceil(minGap / (plotW / (xTicks.length - 1 || 1))));
      xTicks.forEach((tick, index) => {
        if (index % every !== 0 && index !== xTicks.length - 1) return;
        if (index === xTicks.length - 1 && index % every !== 0) return;
        // The end labels sit inside the axis, clear of the y-axis "0" and the chart's edge.
        const anchor = tick.at <= 0 ? 'start' : tick.at >= 1 ? 'end' : 'middle';
        labels.appendChild(svg('text', { x: margin.left + tick.at * plotW, y: margin.top + plotH + 17, 'text-anchor': anchor, class: 'dash-tick' }, tick.label));
      });
    } else {
      const widest = Math.max(...bars.map((bar) => (bar.axisLabel || '').length)) * charWidth + 12;
      const every = Math.max(1, Math.ceil(widest / band));
      bars.forEach((bar, index) => {
        if (index % every !== 0 || !bar.axisLabel) return;
        const center = margin.left + index * band + band / 2;
        const half = (bar.axisLabel.length * charWidth) / 2;
        if (center - half < 0 || center + half > width) return;
        labels.appendChild(svg('text', { x: center, y: margin.top + plotH + 17, 'text-anchor': 'middle', class: 'dash-tick' }, bar.axisLabel));
      });
    }
    chart.appendChild(labels);

    if (marker && marker.at !== null && marker.at !== undefined) {
      const x = Math.round(margin.left + marker.at * plotW) + 0.5;
      chart.appendChild(svg('line', { x1: x, x2: x, y1: margin.top - 6, y2: margin.top + plotH, stroke: DASHBOARD_COLORS.marker, 'stroke-width': 1.5, class: 'dash-marker' }));
      const leftSide = marker.at > 0.6;
      chart.appendChild(svg('text', { x: leftSide ? x - 5 : x + 5, y: margin.top - 9, 'text-anchor': leftSide ? 'end' : 'start', class: 'dash-marker-label' }, marker.label));
    }
    chart.appendChild(hits);

    function activate(index) {
      active = index;
      for (const column of marks.querySelectorAll('.dash-col')) column.classList.toggle('dash-active', Number(column.dataset.index) === index);
      if (index < 0) {
        tooltip.hide();
        return;
      }
      tooltip.show(hits.children[index], bars[index].tip);
    }
    chart.addEventListener('focus', () => activate(active >= 0 ? active : bars.length - 1));
    chart.addEventListener('blur', () => activate(-1));
    chart.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return;
      event.preventDefault();
      let next = active < 0 ? 0 : active;
      if (event.key === 'ArrowLeft') next = Math.max(0, next - 1);
      if (event.key === 'ArrowRight') next = Math.min(bars.length - 1, next + 1);
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = bars.length - 1;
      activate(next);
    });
    box.replaceChildren(chart);
  }

  charts.push({ box, render });
  return box;
}

// --- Meter rows (HTML): one bar per named row, each out of 100% ---

function scaleRow() {
  const row = el('li', 'dash-bar-row dash-scale-row');
  row.setAttribute('aria-hidden', 'true');
  const scale = el('div', 'dash-scale');
  for (const at of [0, 50, 100]) {
    const tick = el('span', `dash-scale-tick dash-scale-${at}`, `${at}%`);
    tick.style.left = `${at}%`;
    scale.appendChild(tick);
  }
  row.append(el('div', 'dash-bar-label'), scale, el('span', 'dash-bar-value'));
  return row;
}

// rows: [{ label, sub?, percent, tip: [{ value, label }] }]
function meterList(rows, tooltip) {
  const list = el('ul', 'dash-bars');
  for (const row of rows) {
    const item = el('li', 'dash-bar-row');
    const label = el('div', 'dash-bar-label');
    label.appendChild(el('span', 'dash-bar-name', row.label));
    if (row.sub) label.appendChild(el('span', 'dash-bar-sub', row.sub));
    const track = el('div', 'dash-track');
    track.tabIndex = 0;
    track.setAttribute('aria-label', `${row.label}: ${percentText(row.percent)}${row.sub ? `, ${row.sub}` : ''}`);
    const bar = el('div', 'dash-bar');
    bar.style.width = `${Math.max(0, Math.min(100, row.percent ?? 0))}%`;
    track.appendChild(bar);
    const show = () => tooltip.show(track, row.tip);
    track.addEventListener('pointerenter', show);
    track.addEventListener('focus', show);
    track.addEventListener('pointerleave', tooltip.hide);
    track.addEventListener('blur', tooltip.hide);
    item.append(label, track, el('span', 'dash-bar-value', percentText(row.percent)));
    list.appendChild(item);
  }
  list.appendChild(scaleRow());
  return list;
}

// --- Dot plot (HTML): per skill, one dot per cohort series over the overall bar ---

function seriesColor(series) {
  return series.slot ? DASHBOARD_COLORS.series[series.slot - 1] : DASHBOARD_COLORS.other;
}

function dotPlot(data, tooltip) {
  const wrap = el('div', 'dash-dotplot');
  const legend = el('ul', 'dash-legend');
  const overallKey = el('li');
  overallKey.append(el('span', 'dash-key dash-key-bar'), el('span', '', 'All submissions'));
  legend.appendChild(overallKey);
  for (const series of data.series) {
    const key = el('li');
    const swatch = el('span', 'dash-key dash-key-dot');
    swatch.style.background = seriesColor(series);
    key.append(swatch, el('span', '', series.label), el('span', 'dash-legend-n', `n = ${series.n}`));
    legend.appendChild(key);
  }
  wrap.appendChild(legend);

  const list = el('ul', 'dash-bars');
  data.skills.forEach((skill, index) => {
    const overall = data.overall[index];
    const item = el('li', 'dash-bar-row');
    const label = el('div', 'dash-bar-label');
    label.appendChild(el('span', 'dash-bar-name', skill.label));
    const track = el('div', 'dash-track dash-dot-track');
    track.tabIndex = 0;
    const context = el('div', 'dash-bar dash-bar-context');
    context.style.width = `${Math.max(0, Math.min(100, overall.percent ?? 0))}%`;
    track.appendChild(context);
    const tip = [{ value: percentText(overall.percent), label: 'All submissions', color: DASHBOARD_COLORS.context }];
    const spoken = [`${skill.label}: all submissions ${percentText(overall.percent)}`];
    for (const series of data.series) {
      const value = series.values[index].percent;
      tip.push({ value: percentText(value), label: series.label, color: seriesColor(series) });
      spoken.push(`${series.label} ${percentText(value)}`);
      if (value === null) continue;
      const dot = el('span', 'dash-dot');
      dot.style.left = `${Math.max(0, Math.min(100, value))}%`;
      dot.style.background = seriesColor(series);
      track.appendChild(dot);
    }
    track.setAttribute('aria-label', spoken.join(', '));
    const show = () => tooltip.show(track, tip);
    track.addEventListener('pointerenter', show);
    track.addEventListener('focus', show);
    track.addEventListener('pointerleave', tooltip.hide);
    track.addEventListener('blur', tooltip.hide);
    item.append(label, track, el('span', 'dash-bar-value', percentText(overall.percent)));
    list.appendChild(item);
  });
  list.appendChild(scaleRow());
  wrap.appendChild(list);
  return wrap;
}

// --- The cards ---

function tiles(numbers, { truncated, limit }) {
  const row = el('div', 'dash-tiles');
  const tile = (label, value, sub) => {
    const box = el('div', 'dash-tile');
    box.append(el('p', 'dash-tile-label', label), el('p', 'dash-tile-value', value));
    if (sub) box.appendChild(el('p', 'dash-tile-sub', sub));
    row.appendChild(box);
  };
  tile('Submissions', numbers.count, truncated ? `Newest ${limit} only` : '');
  tile('Average score', percentText(numbers.averagePercent), numbers.averageScore === null ? '' : `${numbers.averageScore} / ${numbers.total ?? '–'} points`);
  tile('Median time taken', numbers.medianSeconds === null ? '–' : formatDuration(numbers.medianSeconds), 'min:sec');
  tile('Cohorts', numbers.cohortCount, numbers.withoutCohort > 0 ? `+ ${numbers.withoutCohort} without a cohort` : '');
  tile('Last 7 days', numbers.lastSevenDays, numbers.lastSevenDays === 1 ? 'submission' : 'submissions');
  return row;
}

function overTimeCard(submissions, { from, to, now }, tooltip, charts) {
  const { unit, buckets } = timeBuckets(submissions, { from, to, now });
  const per = unit === 'day' ? 'day' : unit === 'week' ? 'week (Monday to Sunday)' : 'month';
  if (buckets.length === 1) {
    return card('dash-over-time', 'Submissions over time', '', { empty: `All ${plural(buckets[0].count, 'submission')} came on one day, ${buckets[0].label}.` });
  }
  const bars = buckets.map((bucket) => ({
    value: bucket.count,
    axisLabel: bucket.shortLabel,
    tip: [{ value: plural(bucket.count, 'submission'), label: bucket.label }],
  }));
  const chart = columnChart(bars, { ariaLabel: `Submissions per ${unit}. Use the arrow keys to read each ${unit}.` }, tooltip, charts);
  const table = dataTable([[unit === 'day' ? 'Day' : unit === 'week' ? 'Week' : 'Month', false], ['Submissions', true]], buckets.map((bucket) => [bucket.label, bucket.count]));
  return card('dash-over-time', 'Submissions over time', `Submissions per ${per}`, { chart, table });
}

function distributionCard(submissions, tooltip, charts) {
  const { bins, average } = scoreHistogram(submissions);
  const bars = bins.map((bin) => ({ value: bin.count, tip: [{ value: plural(bin.count, 'submission'), label: `Score ${bin.label}` }] }));
  const xTicks = bins.map((bin) => ({ at: bin.from / 100, label: `${bin.from}%` })).concat({ at: 1, label: '100%' });
  const chart = columnChart(bars, {
    touching: true,
    xTicks,
    marker: average === null ? null : { at: average / 100, label: `Average ${percentText(average)}` },
    ariaLabel: 'Number of submissions per score range. Use the arrow keys to read each range.',
  }, tooltip, charts);
  const rows = bins.map((bin, index) => [`${bin.from}–${bin.to}%${index === bins.length - 1 ? ' (incl. 100%)' : ''}`, bin.count]);
  const table = dataTable([['Score', false], ['Submissions', true]], rows);
  return card('dash-distribution', 'Score distribution', `Submissions per 10-point score range; the line marks the average (${percentText(average)})`, { chart, table });
}

function skillsCard(submissions, quizSkills, { compareCohorts, cohortOrder }, tooltip) {
  const averages = skillAverages(submissions, quizSkills);
  if (averages.length === 0) {
    return card('dash-skills', 'Average per skill', '', { empty: 'This quiz has no skills.' });
  }
  const groups = cohortGroups(submissions);
  if (compareCohorts && groups.length >= 2) {
    const data = skillsByCohort(submissions, quizSkills, { cohortOrder });
    const headers = [['Skill', false], ['All submissions', true], ...data.series.map((series) => [`${series.label} (n = ${series.n})`, true])];
    const rows = data.skills.map((skill, index) => [skill.label, percentText(data.overall[index].percent), ...data.series.map((series) => percentText(series.values[index].percent))]);
    const notes = data.series.some((series) => series.key === 'other')
      ? [`Each cohort keeps its own colour; with only ${MAX_COHORT_SERIES} colours, the larger cohorts in view are shown and the others are counted together as "Other". Choose a cohort above to see it alone.`]
      : [];
    return card('dash-skills', 'Average per skill', '% of the points for each skill, in quiz order: the bar is all submissions, each dot a cohort', {
      chart: dotPlot(data, tooltip),
      table: dataTable(headers, rows),
      notes,
    });
  }
  const meterRows = averages.map((skill) => ({
    label: skill.label,
    percent: skill.percent,
    tip: [{ value: percentText(skill.percent), label: `${skill.label} (${plural(skill.n, 'submission')})` }],
  }));
  return card('dash-skills', 'Average per skill', '% of the points for each skill, in quiz order', {
    chart: meterList(meterRows, tooltip),
    table: dataTable([['Skill', false], ['Average', true], ['Submissions', true]], averages.map((skill) => [skill.label, percentText(skill.percent), skill.n])),
  });
}

function cohortsCard(submissions, { cohortFilter }, tooltip) {
  const groups = cohortGroups(submissions);
  if (groups.length === 1) {
    // One group in view: the number and why, not a one-bar chart.
    const [group] = groups;
    const why = cohortFilter ? 'One cohort is chosen above; choose "All cohorts" to compare them.' : 'All these submissions are in one group, so there is nothing to compare yet.';
    return card('dash-cohorts', 'Cohort comparison', '', {
      empty: `${group.label}: average ${percentText(group.averagePercent)} over ${plural(group.n, 'submission')}. ${why}`,
    });
  }
  const rows = groups.map((group) => ({
    label: group.label,
    sub: `n = ${group.n}${group.small ? ' (small)' : ''}`,
    percent: group.averagePercent,
    tip: [{ value: percentText(group.averagePercent), label: `${group.label}, ${plural(group.n, 'submission')}` }],
  }));
  const notes = [];
  if (groups.some((group) => group.small)) notes.push(`(small): fewer than ${SMALL_COHORT} submissions, so the average can change a lot with one more.`);
  const table = dataTable([['Cohort', false], ['Average score', true], ['Average points', true], ['Submissions', true]],
    groups.map((group) => [group.label, percentText(group.averagePercent), group.averageScore ?? '–', `${group.n}${group.small ? ' (small)' : ''}`]));
  return card('dash-cohorts', 'Cohort comparison', 'Average score per cohort, highest first', { chart: meterList(rows, tooltip), table, notes });
}

function healthCard(stats, statsError, onOpenStats) {
  const section = el('section', 'dash-card');
  section.id = 'dash-health';
  section.appendChild(el('div', 'dash-card-head')).appendChild(el('h3', '', 'Question health'));
  if (statsError) {
    section.appendChild(el('p', 'fac-status dash-empty', `The question statistics could not be loaded: ${statsError}`));
    return section;
  }
  const health = questionHealth(stats);
  if (!health.available) {
    section.appendChild(el('p', 'fac-status dash-empty', health.reason === 'no-submissions'
      ? 'No question statistics yet: no submissions on the current version of the quiz for these filters.'
      : 'The question statistics are not available.'));
    return section;
  }
  section.appendChild(el('p', 'dash-sub', `Questions flagged in the statistics (${plural(health.submissions, 'submission')} on the current version). Choose one to see those questions.`));
  const list = el('div', 'dash-health');
  const describe = {
    'very-easy': `at least ${STATS_THRESHOLDS.veryEasyPercent}% correct`,
    'very-hard': `${STATS_THRESHOLDS.veryHardPercent}% correct or less`,
    'no-separation': `discrimination below ${STATS_THRESHOLDS.lowDiscrimination}`,
  };
  for (const flag of HEALTH_FLAGS) {
    // Without enough data "Doesn't separate" is not worked out: no link to an empty list.
    const unavailable = flag === 'no-separation' && !health.enoughData;
    const item = el(unavailable ? 'div' : 'button', unavailable ? 'dash-health-item dash-health-off' : 'dash-health-item');
    item.dataset.flag = flag;
    item.append(
      el('span', 'dash-health-count', unavailable ? '–' : health.counts[flag]),
      el('span', `dash-health-name stats-flag stats-flag-${flag}`, STAT_FLAG_NAMES[flag]),
      el('span', 'dash-health-rule', unavailable ? `not enough data: needs ${STATS_THRESHOLDS.minSubmissionsForDiscrimination} submissions` : describe[flag]),
    );
    if (!unavailable) {
      item.type = 'button';
      item.setAttribute('aria-label', `${STAT_FLAG_NAMES[flag]}: ${plural(health.counts[flag], 'question')} of ${health.questionCount}. Show them in the question statistics.`);
      item.addEventListener('click', () => onOpenStats(flag));
    }
    list.appendChild(item);
  }
  section.appendChild(list);
  if (!health.enoughData) {
    section.appendChild(el('p', 'dash-note', `With fewer than ${STATS_THRESHOLDS.minSubmissionsForDiscrimination} submissions these flags are only a first impression, and "Doesn't separate" cannot be worked out yet.`));
  }
  if (health.excluded > 0) {
    section.appendChild(el('p', 'dash-note', `${plural(health.excluded, 'submission')} taken on an earlier version of the quiz ${health.excluded === 1 ? 'is' : 'are'} not counted here.`));
  }
  return section;
}

function latestCard(submissions, onOpenSubmission) {
  const section = el('section', 'dash-card');
  section.id = 'dash-latest';
  section.appendChild(el('div', 'dash-card-head')).appendChild(el('h3', '', 'Latest submissions'));
  section.appendChild(el('p', 'dash-sub', "Choose one to see that person's answers."));
  const wrap = el('div', 'fac-table-wrap');
  const table = el('table', 'dash-latest-table');
  const head = el('tr');
  head.append(el('th', '', 'Name'), el('th', '', 'Cohort'), el('th', 'num', 'Score'), el('th', '', 'Date'));
  table.createTHead().appendChild(head);
  const body = table.createTBody();
  for (const submission of latestSubmissions(submissions, 5)) {
    const row = el('tr');
    row.tabIndex = 0;
    row.dataset.id = submission.id;
    const cohort = cohortText(submission);
    row.append(
      el('td', 'fac-name', submission.name),
      el('td', cohort ? 'dash-latest-cohort' : 'dash-latest-cohort fac-muted', cohort || '–'),
      el('td', 'num', submission.score === null || submission.score === undefined ? '–' : `${submission.score} / ${submission.total} (${percentText(scorePercent(submission))})`),
      el('td', '', formatDateTime(submission.submittedAt)),
    );
    const open = () => onOpenSubmission(submission.id);
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
  section.appendChild(wrap);
  return section;
}

// Renders the whole dashboard into `root`.
// options: { submissions (GET /api/results list), stats (GET /api/stats or null),
//   statsError, quizSkills ([{ id, label }] from meta.json), from, to (date inputs),
//   cohortFilter, cohortOrder (cohort keys "id:<id>", oldest first: fixes each cohort's colour),
//   truncated, limit, now, onOpenSubmission(id), onOpenStats(flag) }
export function renderDashboard(root, {
  submissions = [], stats = null, statsError = '', quizSkills = [], from = '', to = '', cohortFilter = '', cohortOrder = [],
  truncated = false, limit = 2000, now = new Date(), onOpenSubmission = () => {}, onOpenStats = () => {},
} = {}) {
  if (root.dashboardObserver) root.dashboardObserver.disconnect();
  root.replaceChildren();
  root.classList.add('dash');

  if (submissions.length === 0) {
    root.appendChild(el('p', 'fac-status dash-empty', 'No submissions for these filters yet. When participants send their results, the dashboard fills in here.'));
    return;
  }

  const tooltip = createTooltip(root);
  const charts = [];
  root.insertBefore(tiles(headline(submissions, { now }), { truncated, limit }), root.firstChild);

  const grid = el('div', 'dash-grid');
  if (submissions.length === 1) {
    const note = el('p', 'fac-status dash-empty dash-wide', 'There is one submission for these filters. The charts appear from two submissions; until then the numbers above and the list below say it all.');
    grid.appendChild(note);
  } else {
    grid.append(
      overTimeCard(submissions, { from, to, now }, tooltip, charts),
      distributionCard(submissions, tooltip, charts),
      skillsCard(submissions, quizSkills, { compareCohorts: !cohortFilter, cohortOrder }, tooltip),
      cohortsCard(submissions, { cohortFilter }, tooltip),
    );
  }
  grid.append(healthCard(stats, statsError, onOpenStats), latestCard(submissions, onOpenSubmission));
  root.insertBefore(grid, root.lastChild);
  if (truncated) root.insertBefore(el('p', 'dash-note', `Only the newest ${limit} submissions are counted; choose dates to narrow it.`), root.lastChild);

  // Draw the SVG charts at their box's width, and again when it changes.
  const widths = new Map();
  const draw = () => {
    for (const chart of charts) {
      const width = chart.box.clientWidth || 560;
      if (widths.get(chart) === width) continue;
      widths.set(chart, width);
      chart.render(width);
    }
  };
  draw();
  if (typeof ResizeObserver === 'function') {
    root.dashboardObserver = new ResizeObserver(() => draw());
    for (const chart of charts) root.dashboardObserver.observe(chart.box);
  }
}

