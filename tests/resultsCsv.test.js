import { describe, expect, it } from 'vitest';

import { buildResultsCsv, csvField, formatDuration, skillColumns } from '../app/resultsCsv.js';

const submissions = [
  {
    id: 'a', quizId: 'cit-aptitude', name: 'Ravi, "the quick"', submittedAt: '2026-11-25T10:05:00.000Z', score: 30, total: 40, timeTakenSeconds: 2165,
    skills: [{ id: 'logic', label: 'Logic', points: 4, outOf: 5 }, { id: 'detail', label: 'Detail, fine', points: 5, outOf: 5 }],
  },
  {
    id: 'b', quizId: 'cit-aptitude', name: 'प्रिया\nशर्मा', submittedAt: '2026-11-24T10:05:00.000Z', score: 12, total: 40, timeTakenSeconds: 61,
    skills: [{ id: 'logic', label: 'Logic', points: 1, outOf: 5 }],
  },
  {
    id: 'c', quizId: 'cit-aptitude', name: '=HYPERLINK("http://x")', submittedAt: '2026-11-23T10:05:00.000Z', score: 0, total: 40, timeTakenSeconds: 5, skills: [],
  },
];

describe('results CSV', () => {
  it('quotes fields with commas, quotes and line breaks', () => {
    expect(csvField('plain')).toBe('plain');
    expect(csvField('a,b')).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField('two\nlines')).toBe('"two\nlines"');
    expect(csvField(' padded ')).toBe('" padded "');
    expect(csvField(null)).toBe('');
    expect(csvField(12)).toBe('12');
  });

  it('keeps spreadsheet formulas from running', () => {
    expect(csvField('=1+1')).toBe("'=1+1");
    expect(csvField('+91 999')).toBe("'+91 999");
    expect(csvField('-5')).toBe("'-5");
    expect(csvField('@cmd')).toBe("'@cmd");
    expect(csvField(-5)).toBe('-5');
  });

  it('builds one row per submission with a column per skill, UTF-8 BOM and CRLF', () => {
    const csv = buildResultsCsv(submissions);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]).toBe('Name,Submitted,Score,Out of,Logic (/5),"Detail, fine (/5)",Time taken (min:sec),Quiz,Submission id');
    expect(lines[1]).toMatch(/^"Ravi, ""the quick""",2026-11-2\d \d\d:\d\d,30,40,4,5,36:05,cit-aptitude,a$/);
    expect(lines[2]).toMatch(/^"प्रिया\nशर्मा",.*,12,40,1,,1:01,cit-aptitude,b$/);
    expect(lines[3]).toMatch(/^"'=HYPERLINK\(""http:\/\/x""\)",/);
    expect(csv.endsWith('\r\n')).toBe(true);
  });

  it('lists skills in order of first appearance and formats durations', () => {
    expect(skillColumns(submissions).map((skill) => skill.id)).toEqual(['logic', 'detail']);
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(3725)).toBe('62:05');
  });
});
