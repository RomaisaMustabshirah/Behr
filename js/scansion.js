// scansion.js
// Behr's scansion engine (taqtī‘): verse in, meter out.
// Pure logic, no DOM, so it can be tested on its own.
//
// Pipeline:
//   1. normalize   — clean Roman Urdu, map ā/ī/ū/ñ, fix Persian "khw"
//   2. phonemes    — split each word into consonants and vowels
//   3. syllabify   — group phonemes into syllables (onset + vowel + coda)
//   4. weigh       — give each syllable its possible weights
//   5. match       — align the weights against every meter (dynamic programming)
//
// A token's "options" say which weights it may take in a verse:
//   [1]    always short          [2]    always long
//   [1, 2] flexible (poetic licence, e.g. word-final "ki", "pe", "se")
//   [1, 0] an extra short that may also vanish (0 = not counted)

import { METERS } from './meters.js';

const LONG_VOWELS = ['aa', 'ii', 'ee', 'uu', 'oo', 'ai', 'au', 'ei']; // two letters
const SINGLE_LONG = ['e', 'o'];                                      // one letter, long
const SHORT_VOWELS = ['a', 'i', 'u'];
const DIGRAPHS = ['kh', 'gh', 'ch', 'sh', 'zh', 'th', 'dh', 'ph', 'bh', 'jh'];
const NASAL = '~'; // internal marker for noon ghunna (ñ), which carries no weight

// ---------- 1. Normalize ----------
export function normalize(text) {
  return text
    .normalize('NFD')                                   // ā -> a + combining macron
    .replace(/n\u0303/g, NASAL)                         // ñ -> nasal marker
    .replace(/([aeiouAEIOU])N(?=[^A-Za-z]|$)/g, `$1${NASAL}`) // "meiN" style nasal
    .toLowerCase()
    .replace(/a\u0304/g, 'aa')                          // ā -> aa
    .replace(/i\u0304/g, 'ii')                          // ī -> ii
    .replace(/u\u0304/g, 'uu')                          // ū -> uu
    .replace(/[\u0300-\u036f]/g, '')                    // drop other accents (ḳ -> k)
    .replace(/[^a-z~\s-]/g, ' ')                        // punctuation -> space
    .replace(/kh[wv](?=a)/g, 'kh');                     // silent Persian v: khwaab -> khaab
}

// ---------- 2. Phonemes ----------
function toPhonemes(word) {
  const out = [];
  let i = 0;
  while (i < word.length) {
    const one = word[i];
    const two = word.slice(i, i + 2);

    if (one === NASAL) { i += 1; continue; }            // nasal adds no sound unit
    if (LONG_VOWELS.includes(two)) { out.push({ type: 'V', text: two, long: true }); i += 2; continue; }
    if (SINGLE_LONG.includes(one)) { out.push({ type: 'V', text: one, long: true }); i += 1; continue; }
    if (SHORT_VOWELS.includes(one)) { out.push({ type: 'V', text: one, long: false }); i += 1; continue; }
    if (DIGRAPHS.includes(two)) { out.push({ type: 'C', text: two }); i += 2; continue; }

    out.push({ type: 'C', text: one });
    i += 1;
  }
  return out;
}

// ---------- 3. Syllabify ----------
// Between two vowels: one consonant goes to the next syllable (ha-zaa);
// two or more: the first closes the current syllable (nik-le).
function syllabify(phonemes) {
  const vowelIdx = [];
  phonemes.forEach((p, i) => { if (p.type === 'V') vowelIdx.push(i); });
  if (vowelIdx.length === 0) return [];

  const syllables = vowelIdx.map((vi) => ({ onset: [], vowel: phonemes[vi], coda: [] }));
  syllables[0].onset = phonemes.slice(0, vowelIdx[0]);

  for (let k = 0; k < vowelIdx.length - 1; k++) {
    const gap = phonemes.slice(vowelIdx[k] + 1, vowelIdx[k + 1]);
    if (gap.length <= 1) {
      syllables[k + 1].onset = gap;
    } else {
      syllables[k].coda = [gap[0]];
      syllables[k + 1].onset = gap.slice(1);
    }
  }

  const last = vowelIdx.length - 1;
  syllables[last].coda = phonemes.slice(vowelIdx[last] + 1);
  return syllables;
}

// ---------- 4. Weigh ----------
const join = (ps) => ps.map((p) => p.text).join('');

function weighWord(word) {
  const phonemes = toPhonemes(word);
  const syllables = syllabify(phonemes);
  const tokens = [];

  syllables.forEach((s, idx) => {
    const isLast = idx === syllables.length - 1;
    const base = join(s.onset) + s.vowel.text;

    if (s.coda.length === 0) {
      // Open syllable: short vowel = 1, long vowel = 2 (word-final long vowels may shorten)
      if (!s.vowel.long) tokens.push({ text: base, options: [1] });
      else tokens.push({ text: base, options: isLast ? [1, 2] : [2] });
    } else if (s.coda.length === 1 && !s.vowel.long) {
      // Closed short syllable: "har", "dam" = 2
      tokens.push({ text: base + join(s.coda), options: [2], closed: true });
    } else {
      // Overlong: long vowel + consonant ("kaam") or two consonants ("dard")
      // counts as a long syllable plus an extra short one.
      const main = base + join(s.coda.slice(0, -1));
      const extra = s.coda[s.coda.length - 1].text;
      const maybeNasal = isLast && s.vowel.long && extra === 'n'; // "hain" typed without ñ
      tokens.push({ text: main, options: [2] });
      tokens.push({ text: extra, options: maybeNasal ? [1, 0] : [1], overflow: true });
    }
  });

  return {
    tokens,
    startsWithVowel: phonemes.length > 0 && phonemes[0].type === 'V',
  };
}

// ---------- Line ----------
export function scanLine(text) {
  const words = normalize(text).split(/[\s-]+/).filter(Boolean);
  const weighed = words.map((w) => ({ word: w, ...weighWord(w) })).filter((w) => w.tokens.length);

  // Wasl (joining): a final consonant can slide onto a vowel-initial next word,
  // e.g. "dil-e" -> "di-le", so the syllable it leaves may become short.
  for (let w = 0; w < weighed.length - 1; w++) {
    if (!weighed[w + 1].startsWithVowel) continue;
    const last = weighed[w].tokens[weighed[w].tokens.length - 1];
    if (last.overflow && !last.options.includes(0)) last.options = [...last.options, 0];
    else if (last.closed) last.options = [1, 2];
  }

  // The very last extra short syllable of a line may be dropped.
  const lastWord = weighed[weighed.length - 1];
  if (lastWord) {
    const lastToken = lastWord.tokens[lastWord.tokens.length - 1];
    if (lastToken.overflow && !lastToken.options.includes(0)) lastToken.options = [...lastToken.options, 0];
  }

  // Flatten, remembering which word each token came from.
  return weighed.flatMap((w, wordIndex) => w.tokens.map((t) => ({ ...t, wordIndex })));
}

// ---------- 5. Match ----------
// Dynamic programming: cost[i][j] = fewest mismatches when the first i tokens
// cover the first j syllables of the meter. A token may skip (if 0 is allowed),
// match (if its options include the meter's weight), or mismatch (cost 1).
export function matchMeter(tokens, pattern) {
  const n = tokens.length;
  const m = pattern.length;
  const cost = Array.from({ length: n + 1 }, () => Array(m + 1).fill(Infinity));
  const back = Array.from({ length: n + 1 }, () => Array(m + 1).fill(null));
  cost[0][0] = 0;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= m; j++) {
      if (cost[i][j] === Infinity) continue;
      const opts = tokens[i].options;

      if (opts.includes(0) && cost[i][j] < cost[i + 1][j]) {
        cost[i + 1][j] = cost[i][j];
        back[i + 1][j] = { i, j, type: 'skip' };
      }

      if (j < m) {
        const ok = opts.includes(pattern[j]);
        const c = cost[i][j] + (ok ? 0 : 1);
        if (c < cost[i + 1][j + 1]) {
          cost[i + 1][j + 1] = c;
          back[i + 1][j + 1] = { i, j, type: ok ? 'match' : 'mismatch' };
        }
      }
    }
  }

  if (cost[n][m] === Infinity) return null; // syllable counts can't line up

  const steps = [];
  let i = n;
  let j = m;
  while (i > 0) {
    const b = back[i][j];
    steps.unshift({ tokenIndex: b.i, slot: b.type === 'skip' ? null : b.j, type: b.type });
    i = b.i;
    j = b.j;
  }
  return { mismatches: cost[n][m], steps };
}

// ---------- Public API ----------
export function scanVerse(text) {
  const tokens = scanLine(text);
  if (tokens.length === 0) return { tokens, results: [] };

  const results = METERS
    .map((meter) => {
      const pattern = meter.arkan.flatMap((rukn) => rukn.pattern);
      const match = matchMeter(tokens, pattern);
      return match ? { meter, pattern, ...match } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.mismatches - b.mismatches);

  return { tokens, results };
}