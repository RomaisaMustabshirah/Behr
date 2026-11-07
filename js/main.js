// main.js
// Renders the meter list, draws the selected meter as rhythm blocks,
// and animates a playhead through it. Sound is added in Step 2.

import { METERS } from './meters.js';

// ---------- DOM references ----------
const els = {
  list: document.getElementById('meter-list'),
  emptyHint: document.getElementById('empty-hint'),
  view: document.getElementById('meter-view'),
  name: document.getElementById('meter-name'),
  urdu: document.getElementById('meter-urdu'),
  rhythm: document.getElementById('rhythm'),
  play: document.getElementById('play-btn'),
  tempo: document.getElementById('tempo'),
  tempoValue: document.getElementById('tempo-value'),
  loop: document.getElementById('loop'),
  example: document.getElementById('example'),
  exampleUrdu: document.getElementById('example-urdu'),
  exampleRoman: document.getElementById('example-roman'),
  examplePoet: document.getElementById('example-poet'),
};

// ---------- State ----------
// position is measured in "units": a short syllable lasts 1 unit, a long one 2.
const state = {
  meter: null,
  schedule: [],   // [{ el, start, end }] in units
  totalUnits: 0,
  playing: false,
  position: 0,
  lastFrame: 0,
  rafId: null,
};

// Tempo slider = short syllables per minute, so 1 unit lasts 60000 / tempo ms.
const unitMs = () => 60000 / Number(els.tempo.value);

// ---------- Meter list ----------
function renderMeterList() {
  METERS.forEach((meter) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'meter-btn';
    btn.dataset.id = meter.id;
    btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = `
      <span class="meter-btn-name">${meter.name}</span>
      <span class="meter-btn-urdu urdu" lang="ur" dir="rtl">${meter.urdu}</span>
    `;
    btn.addEventListener('click', () => selectMeter(meter.id));
    els.list.appendChild(btn);
  });
}

function selectMeter(id) {
  stop();
  const meter = METERS.find((m) => m.id === id);
  if (!meter) return;
  state.meter = meter;

  els.list.querySelectorAll('.meter-btn').forEach((btn) => {
    const active = btn.dataset.id === id;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  els.emptyHint.hidden = true;
  els.view.hidden = false;
  els.name.textContent = meter.name;
  els.urdu.textContent = meter.urdu;

  renderRhythm(meter);
  renderExample(meter);
}

// ---------- Rhythm drawing ----------
// Each foot becomes a group; each syllable becomes a block whose width
// is proportional to its weight (long = twice as wide as short).
function renderRhythm(meter) {
  els.rhythm.innerHTML = '';
  state.schedule = [];
  let cursor = 0;

  meter.arkan.forEach((rukn) => {
    const group = document.createElement('div');
    group.className = 'rukn';

    const beats = document.createElement('div');
    beats.className = 'beats';

    rukn.pattern.forEach((weight) => {
      const beat = document.createElement('div');
      beat.className = `beat ${weight === 2 ? 'long' : 'short'}`;
      beat.style.setProperty('--w', weight);
      beat.innerHTML = `
        <span class="beat-mark" aria-hidden="true">${weight === 2 ? '—' : '◡'}</span>
        <span class="beat-digit">${weight}</span>
      `;
      beats.appendChild(beat);

      state.schedule.push({ el: beat, start: cursor, end: cursor + weight });
      cursor += weight;
    });

    const label = document.createElement('div');
    label.className = 'rukn-label';
    label.innerHTML = `
      <span class="urdu" lang="ur">${rukn.urdu}</span>
      <span class="rukn-roman" dir="ltr">${rukn.roman}</span>
    `;

    group.append(beats, label);
    els.rhythm.appendChild(group);
  });

  state.totalUnits = cursor;
}

function renderExample(meter) {
  if (!meter.example) {
    els.example.hidden = true;
    return;
  }
  els.example.hidden = false;
  els.exampleUrdu.textContent = meter.example.urdu;
  els.exampleRoman.textContent = meter.example.roman;
  els.examplePoet.textContent = `— ${meter.example.poet}`;
}

// ---------- Playback ----------
function play() {
  if (!state.meter) return;
  state.playing = true;
  state.position = 0;
  state.lastFrame = performance.now();
  els.play.textContent = '■ Stop';
  els.play.setAttribute('aria-pressed', 'true');
  state.rafId = requestAnimationFrame(tick);
}

function stop() {
  state.playing = false;
  if (state.rafId !== null) cancelAnimationFrame(state.rafId);
  state.rafId = null;
  state.schedule.forEach((s) => s.el.classList.remove('active'));
  els.play.textContent = '▶ Play';
  els.play.setAttribute('aria-pressed', 'false');
}

// We advance the position by the time since the LAST frame (not since start),
// so moving the tempo slider mid-play speeds up smoothly instead of jumping.
function tick(now) {
  if (!state.playing) return;

  state.position += (now - state.lastFrame) / unitMs();
  state.lastFrame = now;

  if (state.position >= state.totalUnits) {
    if (els.loop.checked) {
      state.position -= state.totalUnits;
    } else {
      stop();
      return;
    }
  }

  state.schedule.forEach((s) => {
    const isActive = state.position >= s.start && state.position < s.end;
    s.el.classList.toggle('active', isActive);
  });

  state.rafId = requestAnimationFrame(tick);
}

// ---------- Events ----------
els.play.addEventListener('click', () => (state.playing ? stop() : play()));

els.tempo.addEventListener('input', () => {
  els.tempoValue.textContent = els.tempo.value;
});

// ---------- Start ----------
renderMeterList();
selectMeter(METERS[0].id);
