/**
 * Core width-calculation logic.
 *
 * Design decisions, stated plainly so the tests match the implementation:
 *
 * 1. Width is measured per *grapheme cluster*, not per code point, and not per
 *    UTF-16 code unit. A base character followed by combining marks still occupies
 *    one column. We implement a pragmatic grapheme-cluster boundary finder: a
 *    cluster runs from a base character through any immediately following
 *    combining marks, ZWJ joiners, and variation selectors. This is a subset of
 *    UAX #29, intentionally limited; see the README for the trade-off.
 *
 * 2. East Asian width follows UAX #11 ranges (East Asian Wide and Fullwidth
 *    contribute width 2; everything else we recognise contributes width 1).
 *    Characters outside the explicit wide ranges default to width 1. We do NOT
 *    treat East Asian Ambiguous as wide — see README.
 *
 * 3. Control characters U+0000–U+001F and U+007F contribute width 0. C1
 *    controls (U+0080–U+009F) are also width 0. This is a deliberate choice
 *    documented in the README; terminals differ.
 *
 * 4. Zero-width joiners (U+200D) and combining marks themselves are width 0
 *    and are absorbed into the preceding cluster. Variation selectors are
 *    width 0.
 */

// A combining mark: Mn (Nonspacing_Mark), Me (Enclosing_Mark), or Cf format
// characters that are part of a cluster. We encode this as explicit ranges
// rather than relying on a Unicode property table, so the library has zero
// runtime dependencies and is deterministic.
const COMBINING_RANGES = [
  // Combining Diacritical Marks
  [0x0300, 0x036f],
  // Combining Diacritical Marks Supplement
  [0x1ab0, 0x1aff],
  // Combining Diacritical Marks for Symbols
  [0x20d0, 0x20ff],
  // Variation Selectors
  [0xfe00, 0xfe0f],
  // Combining Half Marks
  [0xfe20, 0xfe2f],
  // Variation Selectors Supplement
  [0xe0100, 0xe01ef],
];

// East Asian Wide and Fullwidth ranges per UAX #11 (narrowed to the ranges we
// actually inspect; this is not the full table but covers CJK, Hiragana,
// Katakana, Hangul, fullwidth forms, and CJK punctuation).
//
// IMPORTANT: ranges must be sorted ascending by start for binarySearch.
const WIDE_RANGES = [
  // Hangul Jamo
  [0x1100, 0x115f],
  // CJK Radicals Supplement / Kangxi
  [0x2e80, 0x2eff],
  [0x2f00, 0x2fdf],
  // CJK Symbols and Punctuation, Hiragana, Katakana
  [0x3000, 0x30ff],
  // Bopomofo, Bopomofo Extended, CJK Strokes, Kanbun
  [0x31a0, 0x31ff],
  // CJK Unified Ideographs Extension A
  [0x3400, 0x4dbf],
  // CJK Unified Ideographs
  [0x4e00, 0x9fff],
  // Yi Syllables and Radicals
  [0xa000, 0xa4cf],
  // Hangul Syllables
  [0xac00, 0xd7a3],
  // CJK Compatibility Ideographs
  [0xf900, 0xfaff],
  // Fullwidth ASCII variants
  [0xff01, 0xff60],
  // Halfwidth and Fullwidth Forms (Hangul Jamo, etc.)
  [0xffa0, 0xffdc],
  // Fullwidth forms continuation
  [0xffe0, 0xffe6],
  // CJK Unified Ideographs Extension B
  [0x20000, 0x2a6df],
  // CJK Unified Ideographs Extension C/D/E/F and supplements
  [0x2a700, 0x2b73f],
  [0x2b740, 0x2b81f],
  [0x2b820, 0x2ceaf],
  [0x2ceb0, 0x2ebef],
  // CJK Compatibility Ideographs Supplement
  [0x2f800, 0x2fa1f],
];

const ZWJ = 0x200d;

function binarySearch(ranges, code) {
  let lo = 0;
  let hi = ranges.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [start, end] = ranges[mid];
    if (code < start) {
      hi = mid - 1;
    } else if (code > end) {
      lo = mid + 1;
    } else {
      return true;
    }
  }
  return false;
}

/**
 * Returns true if `code` is a combining mark or format character that should be
 * absorbed into the preceding cluster (width 0, does not start a cluster).
 */
function isCombining(code) {
  return binarySearch(COMBINING_RANGES, code);
}

/**
 * Returns the column width contribution of a base code point. Combining marks,
 * ZWJ, variation selectors, and control characters return 0.
 */
export function charWidth(code) {
  if (code <= 0x001f || (code >= 0x007f && code <= 0x009f)) {
    return 0;
  }
  if (isCombining(code)) {
    return 0;
  }
  if (code === ZWJ) {
    return 0;
  }
  if (binarySearch(WIDE_RANGES, code)) {
    return 2;
  }
  return 1;
}

/**
 * Iterates grapheme clusters as arrays of code points, per the simplified
 * segmentation rules documented at the top of this file.
 *
 * A new cluster starts at any code point that is NOT a combining mark, NOT a
 * ZWJ, and NOT a variation selector. This is narrower than full UAX #29 but
 * covers the common emoji-sequence and accent cases without a property table.
 */
function* clusters(str) {
  let current = null;
  for (let i = 0; i < str.length;) {
    const code = str.codePointAt(i);
    i += code > 0xffff ? 2 : 1;
    if (current !== null && (isCombining(code) || code === ZWJ)) {
      current.push(code);
    } else {
      if (current !== null) {
        yield current;
      }
      current = [code];
    }
  }
  if (current !== null) {
    yield current;
  }
}

/**
 * Computes the rendered column width of `str`.
 *
 * Width is summed over grapheme clusters: each cluster contributes the width of
 * its first code point (the base). Combining marks, ZWJ, and variation
 * selectors contribute 0 by construction because they never start a cluster.
 *
 * @param {string} str
 * @returns {number}
 */
export function textWidth(str) {
  if (typeof str !== 'string') {
    throw new TypeError('textWidth expects a string');
  }
  let width = 0;
  for (const cluster of clusters(str)) {
    width += charWidth(cluster[0]);
  }
  return width;
}
