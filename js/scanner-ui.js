// scanner-ui.js
// The "Scan a verse" panel: reads the textarea, runs the scansion engine,
// shows each syllable with its weight, and lists the best-matching meters.

import { scanVerse } from './scansion.js';

const SAMPLE = 'hazāroñ ḳhvāhisheñ aisī ki har ḳhvāhish pe dam nikle';
const MARK = { 1: '◡', 2: '—', 0: '·' };
const MAX_RESULTS = 4;

export function initScanner({ onMeterFound }) {
  const els = {
    input: document.getElementById('scan-input'),
    scanBtn: document.getElementById('scan-btn'),
    sampleBtn: document.getElementById('scan-sample'),
    output: document.getElementById('scan-output'),
    syllables: document.getElementById('scan-syllables'),
    results: document.getElementById('scan-results'),
  };

  function run() {
    const text = els.input.value.trim();
    if (!text) return;

    const { tokens, results } = scanVerse(text);
    els.output.hidden = false;

    if (tokens.length === 0) {
      els.syllables.innerHTML = '';
      els.results.innerHTML = '<li class="scan-empty">No syllables found. Try Roman Urdu letters.</li>';
      return;
    }

    const best = results[0] || null;
    renderSyllables(tokens, best);
    renderResults(results);

    // A perfect match jumps straight to that meter so it can be played.
    if (best && best.mismatches === 0) onMeterFound(best.meter.id);
  }

  // Each syllable chip shows its text and the weight the best meter gave it.
  function renderSyllables(tokens, best) {
    const resolved = new Map(); // tokenIndex -> { weight, type }
    if (best) {
      best.steps.forEach((s) => {
        resolved.set(s.tokenIndex, {
          weight: s.type === 'skip' ? 0 : best.pattern[s.slot],
          type: s.type,
        });
      });
    }

    els.syllables.innerHTML = '';
    let lastWord = -1;

    tokens.forEach((token, i) => {
      if (lastWord !== -1 && token.wordIndex !== lastWord) {
        const gap = document.createElement('span');
        gap.className = 'scan-gap';
        els.syllables.appendChild(gap);
      }
      lastWord = token.wordIndex;

      const r = resolved.get(i);
      const chip = document.createElement('span');
      chip.className = 'syl';
      if (token.options.length > 1) chip.classList.add('flex');
      if (r && r.type === 'mismatch') chip.classList.add('mismatch');
      if (r && r.type === 'skip') chip.classList.add('skipped');

      const weight = r ? r.weight : token.options[0];
      chip.innerHTML = `
        <span class="syl-text">${token.text}</span>
        <span class="syl-mark">${MARK[weight]}</span>
      `;
      chip.title = r && r.type === 'mismatch'
        ? `The meter expects ${weight === 2 ? 'long' : 'short'} here`
        : token.options.length > 1 ? 'Flexible syllable (poetic licence)' : '';
      els.syllables.appendChild(chip);
    });
  }

  function renderResults(results) {
    els.results.innerHTML = '';
    if (results.length === 0) {
      els.results.innerHTML = '<li class="scan-empty">No meter has this many syllables. Check the spelling of long vowels.</li>';
      return;
    }

    results.slice(0, MAX_RESULTS).forEach((r) => {
      const li = document.createElement('li');
      li.className = 'scan-result';
      const badge = r.mismatches === 0
        ? '<span class="badge perfect">perfect match</span>'
        : `<span class="badge">${r.mismatches} mismatch${r.mismatches > 1 ? 'es' : ''}</span>`;
      li.innerHTML = `
        <span class="scan-result-name">${r.meter.name}</span>
        <span class="urdu" lang="ur">${r.meter.urdu}</span>
        ${badge}
        <button type="button" class="ghost-btn">Show</button>
      `;
      li.querySelector('button').addEventListener('click', () => {
        onMeterFound(r.meter.id);
        document.getElementById('stage').scrollIntoView({ behavior: 'smooth' });
      });
      els.results.appendChild(li);
    });
  }

  els.scanBtn.addEventListener('click', run);
  els.sampleBtn.addEventListener('click', () => {
    els.input.value = SAMPLE;
    run();
  });
  els.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) run();
  });
}