// Checks every quiz folder under quizzes/ against the content rules,
// so a mistake in a new quiz fails `npm test` instead of breaking the page.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { loadQuiz } from '../app/loader.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const quizzesDir = path.join(repoRoot, 'quizzes');

async function fileFetch(url) {
  const filePath = path.join(repoRoot, url);
  if (!fs.existsSync(filePath)) {
    return { ok: false, status: 404, text: async () => 'Not found' };
  }
  return { ok: true, status: 200, text: async () => fs.readFileSync(filePath, 'utf8') };
}

const quizIds = fs
  .readdirSync(quizzesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

describe('quiz content', () => {
  it('has at least one quiz', () => {
    expect(quizIds.length).toBeGreaterThan(0);
  });

  it('registry.json names an existing quiz as the default', () => {
    const registry = JSON.parse(fs.readFileSync(path.join(quizzesDir, 'registry.json'), 'utf8'));
    expect(quizIds).toContain(registry.defaultQuiz);
  });

  describe.each(quizIds)('quizzes/%s', (quizId) => {
    it('loads and passes validation', async () => {
      await expect(loadQuiz(quizId, { fetchFn: fileFetch })).resolves.toBeDefined();
    });

    it('has its logo file, if it names one', async () => {
      const { meta } = await loadQuiz(quizId, { fetchFn: fileFetch });
      const logoSrc = meta.branding.logoSrc;
      if (logoSrc && !/^([a-z]+:|\/)/i.test(logoSrc)) {
        expect(fs.existsSync(path.join(repoRoot, logoSrc)), `${logoSrc} is missing`).toBe(true);
      }
    });
  });
});
