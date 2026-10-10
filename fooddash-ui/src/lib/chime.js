// A short two-tone "ding-dong" made with Web Audio — no sound files needed.
let ctx;

export function unlockAudio() {
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
}

export function chime() {
  if (!ctx) return;
  const now = ctx.currentTime;
  [[880, 0], [660, 0.18]].forEach(([freq, at]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + at);
    gain.gain.exponentialRampToValueAtTime(0.35, now + at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + at);
    osc.stop(now + at + 0.65);
  });
}
