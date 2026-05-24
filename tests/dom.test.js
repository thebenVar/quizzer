/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';

describe('jsdom environment', () => {
  it('can mount and query a DOM fixture', () => {
    document.body.innerHTML = `
      <div id="quiz-container">
        <h1 id="title"></h1>
        <button id="start-quiz-btn">Start</button>
      </div>
    `;

    const title = document.getElementById('title');
    expect(title).not.toBeNull();
    title.textContent = 'Test Quiz';
    expect(title.textContent).toBe('Test Quiz');

    const btn = document.getElementById('start-quiz-btn');
    expect(btn.textContent).toBe('Start');
  });
});
