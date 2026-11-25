// Names and typed answers: what the database can store, and what counts as a name.
import { describe, expect, it } from 'vitest';

import { cleanTypedText, hasVisibleText } from '../app/utils.js';

describe('cleanTypedText', () => {
  it('removes NUL and other control characters; tabs and line breaks become spaces', () => {
    expect(cleanTypedText('a\u0000b\u0007c\u007Fd')).toBe('abcd');
    expect(cleanTypedText('a\tb\nc\r\nd')).toBe('a b c  d');
  });

  it('replaces unpaired surrogates and keeps real emoji and joiners', () => {
    expect(cleanTypedText('x\uD800y\uDC00')).toBe('x�y�');
    expect(cleanTypedText('ok 😀')).toBe('ok 😀');
    expect(cleanTypedText('क्‍ष')).toBe('क्‍ष');
    expect(cleanTypedText(null)).toBe('');
  });
});

describe('hasVisibleText', () => {
  it('needs at least one visible character', () => {
    expect(hasVisibleText('Asha')).toBe(true);
    expect(hasVisibleText(' प्रिया ')).toBe(true);
    expect(hasVisibleText('')).toBe(false);
    expect(hasVisibleText('   ')).toBe(false);
    expect(hasVisibleText('​‌‍⁠﻿‎')).toBe(false);
    expect(hasVisibleText(' 　\u0000')).toBe(false);
  });
});
