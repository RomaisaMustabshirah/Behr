// audio.js
// A tiny synthesized tabla built with the Web Audio API.
// Long syllables  -> "dum": a deep bass stroke whose pitch drops (like the bayan)
// Short syllables -> "tak": a bright, short ring plus a click (like the dayan)

let ctx = null;
let master = null;
let noiseBuffer = null;

// Create the AudioContext lazily: browsers only allow audio after a user gesture.
export function getContext() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    noiseBuffer = makeNoiseBuffer(ctx);
  }
  return ctx;
}

// Call this from a click handler before playing anything.
export async function resumeAudio() {
  const c = getContext();
  if (c.state === 'suspended') await c.resume();
  return c;
}

// Half a second of white noise, reused for every "tak" click.
function makeNoiseBuffer(c) {
  const length = Math.floor(c.sampleRate * 0.5);
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// "dum": sine wave that starts high and slides down = the bayan's pitch bend.
function playDum(time, accent) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(accent ? 150 : 130, time);
  osc.frequency.exponentialRampToValueAtTime(60, time + 0.18);

  // Envelope: exponential ramps can't reach 0, so we use 0.0001 as "silent".
  const peak = accent ? 1.0 : 0.75;
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(peak, time + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.6);

  osc.connect(gain).connect(master);
  osc.start(time);
  osc.stop(time + 0.65);
}

// "tak": short triangle ring + a burst of filtered noise for the finger click.
function playTak(time, accent) {
  const osc = ctx.createOscillator();
  const ring = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(accent ? 520 : 460, time);

  ring.gain.setValueAtTime(0.0001, time);
  ring.gain.exponentialRampToValueAtTime(accent ? 0.6 : 0.45, time + 0.003);
  ring.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);

  osc.connect(ring).connect(master);
  osc.start(time);
  osc.stop(time + 0.2);

  const noise = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const click = ctx.createGain();

  noise.buffer = noiseBuffer;
  filter.type = 'bandpass';
  filter.frequency.value = 3000;
  filter.Q.value = 1.5;

  click.gain.setValueAtTime(accent ? 0.4 : 0.3, time);
  click.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);

  noise.connect(filter).connect(click).connect(master);
  noise.start(time);
  noise.stop(time + 0.05);
}

// The only function main.js needs: weight 2 = dum, weight 1 = tak.
export function playSyllable(weight, time, accent = false) {
  if (!ctx) return;
  if (weight === 2) playDum(time, accent);
  else playTak(time, accent);
}