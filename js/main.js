// main.js
// Renders the meter list, draws the selected meter as rhythm blocks,
// and plays it as tabla strokes, with the visuals synced to the audio clock.

import { METERS } from './meters.js';
import { getContext, resumeAudio, playSyllable } from './audio.js';
import { initScanner } from './scanner-ui.js';

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
  sound: document.getElementById('sound'),
  example: document.getElementById('example'),
  exampleUrdu: document.getElementById('example-urdu'),
  exampleRoman: document.getElementById('example-roman'),
  examplePoet: document.getElementById('example-poet'),
};

// ---------- Scheduler settings ----------
// Every 25 ms we look 0.1 s into the future and book any syllables that fall
// inside that window on the audio clock (the "lookahead scheduler" pattern).
const SCHEDULER_INTERVAL_MS = 25;
const SCHEDULE_AHEAD_S = 0.1;

// ---------- State ----------
const state = {
  meter: null,
  schedule: [],     // [{ el, weight, accent }] one entry per syllable
  playing: false,
  nextIndex: 0,     // which syllable gets booked next
  nextTime: 0,      // when it should sound, in audio-clock seconds
  finished: false,  // true once the last syllable is booked (loop off)
  endTime: 0,       // when that last syllable ends
  visualQueue: [],  // [{ el, start, end }] booked syllables waiting to glow
  timerId: null,
  rafId: null,
};

// Tempo slider = short syllables per minute, so 1 unit lasts 60 / tempo seconds.
const unitSec = () => 60 / Number(els.tempo.value);

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
// The first syllable of every foot is marked as an accent.
function renderRhythm(meter) {
  els.rhythm.innerHTML = '';
  state.schedule = [];

  meter.arkan.forEach((rukn) => {
    const group = document.createElement('div');
    group.className = 'rukn';

    const beats = document.createElement('div');
    beats.className = 'beats';

    rukn.pattern.forEach((weight, i) => {
      const beat = document.createElement('div');
      beat.className = `beat ${weight === 2 ? 'long' : 'short'}`;
      beat.style.setProperty('--w', weight);
      beat.innerHTML = `
        <span class="beat-mark" aria-hidden="true">${weight === 2 ? '—' : '◡'}</span>
        <span class="beat-digit">${weight}</span>
      `;
      beats.appendChild(beat);

      state.schedule.push({ el: beat, weight, accent: i === 0 });
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
async function play() {
  if (!state.meter || state.playing) return;
  state.playing = true;

  const ctx = await resumeAudio();
  if (!state.playing) return; // user pressed Stop while audio was waking up

  state.nextIndex = 0;
  state.nextTime = ctx.currentTime + 0.05; // tiny gap so the first stroke isn't late
  state.finished = false;
  state.visualQueue = [];

  els.play.textContent = '■ Stop';
  els.play.setAttribute('aria-pressed', 'true');

  scheduler();
  state.timerId = setInterval(scheduler, SCHEDULER_INTERVAL_MS);
  state.rafId = requestAnimationFrame(draw);
}

function stop() {
  state.playing = false;
  clearInterval(state.timerId);
  state.timerId = null;
  if (state.rafId !== null) cancelAnimationFrame(state.rafId);
  state.rafId = null;
  state.visualQueue = [];
  state.schedule.forEach((s) => s.el.classList.remove('active'));
  els.play.textContent = '▶ Play';
  els.play.setAttribute('aria-pressed', 'false');
}

// Books every syllable that starts within the next SCHEDULE_AHEAD_S seconds.
// Tempo is read at booking time, so slider changes apply within ~0.1 s.
function scheduler() {
  if (!state.playing || state.finished) return;
  const ctx = getContext();

  // If the tab was in the background, timers slow down; skip ahead instead of
  // firing a burst of late strokes all at once.
  if (state.nextTime < ctx.currentTime - 0.2) {
    state.nextTime = ctx.currentTime + 0.05;
  }

  while (state.nextTime < ctx.currentTime + SCHEDULE_AHEAD_S) {
    const item = state.schedule[state.nextIndex];
    const duration = item.weight * unitSec();

    if (els.sound.checked) playSyllable(item.weight, state.nextTime, item.accent);
    state.visualQueue.push({ el: item.el, start: state.nextTime, end: state.nextTime + duration });

    state.nextTime += duration;
    state.nextIndex += 1;

    if (state.nextIndex >= state.schedule.length) {
      if (els.loop.checked) {
        state.nextIndex = 0;
      } else {
        state.finished = true;
        state.endTime = state.nextTime;
        break;
      }
    }
  }
}

// Runs every frame: lights up whichever booked syllable the audio clock is in.
function draw() {
  if (!state.playing) return;
  const now = getContext().currentTime;

  // Remove syllables that have finished.
  while (state.visualQueue.length && state.visualQueue[0].end <= now) {
    state.visualQueue.shift().el.classList.remove('active');
  }

  // Light the current one (if it has started yet).
  const current = state.visualQueue[0];
  if (current && current.start <= now) current.el.classList.add('active');

  if (state.finished && now >= state.endTime) {
    stop();
    return;
  }

  state.rafId = requestAnimationFrame(draw);
}

// ---------- Events ----------
els.play.addEventListener('click', () => (state.playing ? stop() : play()));

els.tempo.addEventListener('input', () => {
  els.tempoValue.textContent = els.tempo.value;
});

// ---------- Start ----------
renderMeterList();
selectMeter(METERS[0].id);
initScanner({ onMeterFound: selectMeter });