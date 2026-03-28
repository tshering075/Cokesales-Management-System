/**
 * Incoming-order alert (SMS-style double beep × 2).
 * Web Audio API — no asset file. Fails silently if autoplay blocks.
 */
export function playNewOrderIncomingAlert() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;

    const ctx = new Ctx();
    const now = ctx.currentTime;

    const beep = (freq, start, dur, vol = 0.14) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(vol, start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    };

    const pair = (t0) => {
      beep(784, t0, 0.1, 0.16);
      beep(1046, t0 + 0.12, 0.11, 0.14);
    };

    pair(now);
    pair(now + 0.38);

    ctx.resume?.().catch(() => {});
  } catch (e) {
    console.warn("playNewOrderIncomingAlert:", e);
  }
}

/** Short success tone when the distributor submits their own order (bell + popup companion). */
export function playOrderSubmittedNotifyChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.12, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.32);
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1174, now + 0.14);
    g2.gain.setValueAtTime(0, now + 0.14);
    g2.gain.linearRampToValueAtTime(0.09, now + 0.16);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc2.connect(g2);
    g2.connect(ctx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.36);
    ctx.resume?.().catch(() => {});
  } catch (e) {
    console.warn("playOrderSubmittedNotifyChime:", e);
  }
}
