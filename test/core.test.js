import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { textWidth, charWidth } from '../src/index.js';

describe('textWidth', () => {
  it('returns 0 for the empty string', () => {
    assert.equal(textWidth(''), 0);
  });

  it('measures ASCII as one column per character', () => {
    assert.equal(textWidth('hello'), 5);
    assert.equal(textWidth('A B'), 3);
  });

  it('measures a fullwidth Latin letter as width 2', () => {
    // U+FF21 FULLWIDTH LATIN CAPITAL LETTER A
    assert.equal(textWidth('\uFF21'), 2);
  });

  it('measures a CJK ideograph as width 2', () => {
    assert.equal(textWidth('語'), 2);
    assert.equal(textWidth('日本語'), 6);
  });

  it('measures Hangul syllables as width 2', () => {
    assert.equal(textWidth('한국'), 4);
  });

  it('treats combining diacritics as width 0 absorbed into the base', () => {
    // 'e' + combining acute accent
    const composed = 'e\u0301';
    assert.equal(textWidth(composed), 1);
    // Precomposed é should match.
    assert.equal(textWidth('é'), 1);
  });

  it('handles a combining mark with no base gracefully', () => {
    // A lone combining char starts its own cluster; its base width is 0.
    assert.equal(textWidth('\u0301'), 0);
  });

  it('treats ASCII control characters as width 0', () => {
    assert.equal(textWidth('a\u0007b'), 2);
    assert.equal(textWidth('\u001B'), 0);
  });

  it('treats C1 control characters (U+0080–U+009F) as width 0', () => {
    assert.equal(textWidth('x\u0085y'), 2);
  });

  it('treats variation selectors as width 0', () => {
    // U+2764 HEAVY BLACK HEART followed by U+FE0F variation selector-16.
    assert.equal(textWidth('\u2764\uFE0F'), 1);
  });

  it('throws TypeError for non-string input', () => {
    assert.throws(() => textWidth(42), TypeError);
    assert.throws(() => textWidth(null), TypeError);
  });

  it('mixes narrow and wide correctly', () => {
    // 'a' (1) + '語' (2) + 'b' (1) = 4
    assert.equal(textWidth('a語b'), 4);
  });
});

describe('charWidth', () => {
  it('returns 2 for a CJK code point', () => {
    assert.equal(charWidth(0x8a9e), 2);
  });

  it('returns 1 for a plain ASCII letter', () => {
    assert.equal(charWidth(0x61), 1);
  });

  it('returns 0 for a combining mark', () => {
    assert.equal(charWidth(0x0301), 0);
  });

  it('returns 0 for DEL (U+007F)', () => {
    assert.equal(charWidth(0x007f), 0);
  });

  it('returns 0 for ZWJ', () => {
    assert.equal(charWidth(0x200d), 0);
  });
});
