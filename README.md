# Folding Text Width Calculator

Measures the rendered column width of a Unicode string, accounting for East Asian wide characters and combining marks. ESM, zero dependencies.

## Usage

```js
import { textWidth, charWidth } from './src/index.js';

textWidth('hello');        // 5
textWidth('日本語');        // 6
textWidth('e\u0301');       // 1 — combining accent absorbed into the base
charWidth(0x8a9e);        // 2 — a CJK ideograph
```

## Why

Terminal and text-folding code needs to know how many columns a string occupies, not how many code points it has. A CJK ideograph takes two columns; a combining accent takes none. Getting this wrong breaks wrapping, padding, and alignment.

This library makes one deliberate trade-off: it implements a **simplified** grapheme-cluster boundary rather than full UAX #29 segmentation. A cluster runs from a base character through any following combining marks (general categories Mn/Me), variation selectors, and zero-width joiners. This covers accented Latin, CJK, Hangul, and common emoji-with-VS sequences without pulling in a Unicode property table. The cost is that exotic sequences (regional indicator pairs, complex emoji with skin-tone modifiers, Tag characters) are not measured exactly — they are broken into their constituent code points, each contributing its own width. For the common cases (text wrapping, table alignment, prompt truncation) this is sufficient and the zero-dependency, deterministic behaviour is worth more than perfect emoji coverage.

East Asian Ambiguous characters (UAX #11 class A) are treated as width 1, not 2. Terminals disagree on these; picking one side keeps the output predictable.

## The awkward edge

A lone combining mark with no preceding base starts its own cluster and contributes width 0. If your text begins with a stray combining character, `textWidth` will not count it. This is intentional and matches how most terminals render it (invisibly).

## API

- `textWidth(str: string): number` — total rendered column width.
- `charWidth(code: number): number` — width of a single code point (0, 1, or 2). Exposed for callers building their own segmentation.

Both are named exports of the package root.

## Performance

The window keeps a bounded buffer, so `push` is constant time and memory does not
grow with the length of the stream. `peak` and `trough` are linear in the window
size, which is the trade that keeps `push` cheap.

