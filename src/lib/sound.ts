/**
 * Crispy little WebAudio synth. No asset files, zero latency, works offline.
 * Everything is short, bright and percussive on purpose.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

const MUTE_KEY = "arena:muted:v1";

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    try {
      muted = localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      /* ignore */
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function isMuted() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return muted;
  }
}

export function setMuted(next: boolean) {
  muted = next;
  try {
    localStorage.setItem(MUTE_KEY, next ? "1" : "0");
  } catch {
    /* ignore */
  }
}

type ToneOpts = {
  freq: number;
  to?: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  attack?: number;
};

function tone({ freq, to, dur = 0.09, type = "triangle", gain = 0.22, delay = 0, attack = 0.004 }: ToneOpts) {
  const c = ac();
  if (!c || !master || muted) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to && to !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise({
  dur = 0.09,
  gain = 0.2,
  delay = 0,
  hp = 900,
  lp = 9000,
}: { dur?: number; gain?: number; delay?: number; hp?: number; lp?: number } = {}) {
  const c = ac();
  if (!c || !master || muted) return;
  const t = c.currentTime + delay;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const high = c.createBiquadFilter();
  high.type = "highpass";
  high.frequency.value = hp;
  const low = c.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = lp;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(high).connect(low).connect(g).connect(master);
  src.start(t);
}

/** Unlock audio on the first user gesture (iOS needs this). */
export function primeAudio() {
  ac();
}

export const sfx = {
  click: () => {
    tone({ freq: 1180, to: 780, dur: 0.045, type: "square", gain: 0.1 });
    noise({ dur: 0.03, gain: 0.06, hp: 2600 });
  },
  tick: () => tone({ freq: 1560, to: 1560, dur: 0.022, type: "square", gain: 0.055 }),
  hover: () => tone({ freq: 900, dur: 0.02, type: "sine", gain: 0.03 }),
  bet: () => {
    tone({ freq: 320, to: 180, dur: 0.09, type: "sine", gain: 0.16 });
    noise({ dur: 0.05, gain: 0.07, hp: 1400 });
  },
  coin: () => {
    tone({ freq: 1720, dur: 0.05, type: "square", gain: 0.1 });
    tone({ freq: 2450, dur: 0.09, type: "square", gain: 0.07, delay: 0.045 });
  },
  reveal: () => {
    tone({ freq: 660, to: 1320, dur: 0.07, type: "triangle", gain: 0.14 });
    noise({ dur: 0.035, gain: 0.05, hp: 3200 });
  },
  gem: (step = 0) => {
    const base = 620 * Math.pow(1.0595, Math.min(24, step * 2));
    tone({ freq: base, to: base * 1.5, dur: 0.08, type: "triangle", gain: 0.16 });
    tone({ freq: base * 2, dur: 0.06, type: "sine", gain: 0.07, delay: 0.02 });
  },
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone({ freq: f, dur: 0.16, type: "triangle", gain: 0.17, delay: i * 0.055 }),
    );
    noise({ dur: 0.12, gain: 0.05, hp: 4200, delay: 0.02 });
  },
  jackpot: () => {
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) =>
      tone({ freq: f, dur: 0.24, type: "square", gain: 0.13, delay: i * 0.06 }),
    );
    noise({ dur: 0.5, gain: 0.05, hp: 5200, delay: 0.1 });
  },
  lose: () => {
    tone({ freq: 300, to: 110, dur: 0.34, type: "sawtooth", gain: 0.16 });
    noise({ dur: 0.14, gain: 0.09, hp: 400, lp: 2200 });
  },
  explode: () => {
    noise({ dur: 0.42, gain: 0.3, hp: 120, lp: 2600 });
    tone({ freq: 180, to: 40, dur: 0.4, type: "sawtooth", gain: 0.2 });
  },
  whoosh: () => noise({ dur: 0.26, gain: 0.1, hp: 500, lp: 4200 }),
  peg: () => {
    tone({ freq: 1500 + Math.random() * 700, dur: 0.028, type: "square", gain: 0.07 });
  },
  card: () => {
    noise({ dur: 0.07, gain: 0.13, hp: 2200, lp: 11000 });
  },
  chip: () => {
    tone({ freq: 980, to: 640, dur: 0.05, type: "square", gain: 0.11 });
    noise({ dur: 0.04, gain: 0.08, hp: 3000 });
  },
  hop: (step = 0) => {
    const base = 420 + step * 26;
    tone({ freq: base, to: base * 2.1, dur: 0.1, type: "sine", gain: 0.15 });
  },
  splash: () => {
    noise({ dur: 0.3, gain: 0.16, hp: 700, lp: 5200 });
    tone({ freq: 260, to: 90, dur: 0.22, type: "sine", gain: 0.1 });
  },
  engine: () => noise({ dur: 0.18, gain: 0.05, hp: 180, lp: 1200 }),
  failsafe: () => {
    [392, 523, 659, 784, 1047, 1319].forEach((f, i) =>
      tone({ freq: f, dur: 0.5, type: "triangle", gain: 0.15, delay: i * 0.085 }),
    );
    tone({ freq: 90, to: 300, dur: 0.7, type: "sawtooth", gain: 0.12 });
    noise({ dur: 0.7, gain: 0.06, hp: 3000, delay: 0.25 });
  },
  denied: () => {
    tone({ freq: 220, dur: 0.1, type: "square", gain: 0.13 });
    tone({ freq: 165, dur: 0.16, type: "square", gain: 0.13, delay: 0.11 });
  },
};
