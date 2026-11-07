// visuals.js
// Generative geometry driven by the rhythm.
//
// Every syllable of the misra sits at a point on a circle. Its angle is
// WHERE in the line it falls, so long syllables leave wider gaps than short
// ones. That makes each meter draw its own polygon: a visual signature.
// The line travels counter-clockwise, echoing Urdu's right-to-left reading.
//
//   long  (dum) -> an 8-pointed star (the khatam, as in Kashi) that blooms
//   short (tak) -> a small gold point that sparks a ring
//   accent      -> first syllable of each foot, drawn larger

const TAU = Math.PI * 2;
const BLOOM_MS = 900;
const ENERGY_DECAY_S = 0.9;

export function createVisualizer(canvas) {
  const ctx = canvas.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const color = (name) => css.getPropertyValue(name).trim();
  const COLORS = {
    ink: color('--ink'),
    lapis: color('--lapis'),
    turquoise: color('--turquoise'),
    gold: color('--gold'),
  };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let marks = [];      // [{ frac, weight, accent, energy }]
  let blooms = [];     // [{ mark, born }]
  let playhead = null; // 0..1 position in the line, or null when stopped
  let width = 0;
  let height = 0;
  let rafId = null;
  let lastNow = performance.now();

  // ---------- Sizing (sharp on high-DPI screens) ----------
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    requestFrame();
  }
  new ResizeObserver(resize).observe(canvas);

  // ---------- Geometry helpers ----------
  const radius = () => Math.min(width, height) * 0.38;

  // frac 0 = top of the circle; increasing frac moves counter-clockwise.
  function pointAt(frac) {
    const angle = -Math.PI / 2 - frac * TAU;
    const r = radius();
    return { x: width / 2 + r * Math.cos(angle), y: height / 2 + r * Math.sin(angle), angle };
  }

  // The {8/3} star polygon: join every 3rd of 8 points on a circle.
  function starPath(x, y, r, rotation) {
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const k = (i * 3) % 8;
      const a = rotation + (k * TAU) / 8;
      const px = x + r * Math.cos(a);
      const py = y + r * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  // ---------- Drawing ----------
  function draw(now) {
    const dt = Math.min((now - lastNow) / 1000, 0.1);
    lastNow = now;
    const decay = Math.exp(-dt / ENERGY_DECAY_S);
    marks.forEach((m) => { m.energy *= decay; });

    ctx.clearRect(0, 0, width, height);
    if (marks.length === 0) return;

    const cx = width / 2;
    const cy = height / 2;
    const R = radius();

    // Guide circle
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.stroke();

    // The meter's signature polygon
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = COLORS.turquoise;
    ctx.beginPath();
    marks.forEach((m, i) => {
      const p = pointAt(m.frac);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.stroke();

    // Spokes from the centre to every long syllable form an inner rosette
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = COLORS.lapis;
    marks.forEach((m) => {
      if (m.weight !== 2) return;
      const p = pointAt(m.frac);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    });

    // Centre star breathes with the most recent stroke
    const pulse = marks.reduce((max, m) => Math.max(max, m.energy), 0);
    ctx.globalAlpha = 0.35 + 0.5 * pulse;
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 1.5;
    starPath(cx, cy, R * (0.18 + 0.06 * pulse), pulse * Math.PI / 8);
    ctx.stroke();

    // Marks: stars for long syllables, points for short ones
    marks.forEach((m) => {
      const p = pointAt(m.frac);
      const grow = 1 + 0.5 * m.energy;
      ctx.globalAlpha = 0.35 + 0.65 * m.energy;
      if (m.weight === 2) {
        const size = (m.accent ? 13 : 10) * grow;
        ctx.fillStyle = m.energy > 0.3 ? COLORS.turquoise : COLORS.lapis;
        starPath(p.x, p.y, size, -p.angle);
        ctx.fill();
      } else {
        const size = (m.accent ? 5 : 4) * grow;
        ctx.fillStyle = COLORS.gold;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, TAU);
        ctx.fill();
      }
    });

    // Blooms: expanding outlines that fade as they grow
    blooms = blooms.filter((b) => now - b.born < BLOOM_MS);
    blooms.forEach((b) => {
      const t = (now - b.born) / BLOOM_MS;
      const eased = 1 - (1 - t) ** 3; // fast start, gentle finish
      const p = pointAt(b.mark.frac);
      ctx.globalAlpha = (1 - t) * 0.8;
      ctx.lineWidth = 1.5;
      if (b.mark.weight === 2) {
        ctx.strokeStyle = COLORS.turquoise;
        starPath(p.x, p.y, (b.mark.accent ? 70 : 52) * eased, -p.angle + eased * Math.PI / 4);
      } else {
        ctx.strokeStyle = COLORS.gold;
        ctx.beginPath();
        ctx.arc(p.x, p.y, (b.mark.accent ? 30 : 22) * eased, 0, TAU);
      }
      ctx.stroke();
    });

    // Playhead: a hand sweeping from the centre to the current position
    if (playhead !== null) {
      const p = pointAt(playhead);
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  // ---------- Animation loop (only runs while something is moving) ----------
  function requestFrame() {
    if (rafId === null) rafId = requestAnimationFrame(frame);
  }

  function frame(now) {
    rafId = null;
    draw(now);
    const busy = playhead !== null || blooms.length > 0 || marks.some((m) => m.energy > 0.01);
    if (busy) requestFrame();
  }

  // ---------- Public API ----------
  return {
    // beats: [{ frac, weight, accent }] for the whole misra
    setMeter(beats) {
      marks = beats.map((b) => ({ ...b, energy: 0 }));
      blooms = [];
      playhead = null;
      lastNow = performance.now();
      requestFrame();
    },
    // Called the moment a syllable starts sounding
    pulse(index) {
      const mark = marks[index];
      if (!mark) return;
      mark.energy = 1;
      if (!reduceMotion) blooms.push({ mark, born: performance.now() });
      requestFrame();
    },
    setPlayhead(frac) {
      playhead = frac;
      requestFrame();
    },
  };
}