/**
 * Web Audio API Notification Sound Synthesizer
 * Generates an elegant, gentle, two-tone notification chime without requiring external mp3 assets.
 * Works 100% offline, compliant with PWA Service Worker offline requirements.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (e) {
    return null;
  }
}

export function playNotificationSound(severity: 'info' | 'success' | 'warning' | 'urgent' | 'error' = 'info') {
  if (typeof window === 'undefined') return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Frequencies tailored to severity
    const isUrgent = severity === 'urgent' || severity === 'error';
    const note1Freq = isUrgent ? 659.25 : severity === 'warning' ? 587.33 : 523.25; // E5, D5, C5
    const note2Freq = isUrgent ? 880.00 : severity === 'warning' ? 739.99 : 659.25; // A5, F#5, E5

    // Tone 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(note1Freq, now);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.25);

    // Tone 2 (Harmonic chime 100ms later)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(note2Freq, now + 0.1);

    gain2.gain.setValueAtTime(0, now + 0.1);
    gain2.gain.linearRampToValueAtTime(0.18, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.1);
    osc2.stop(now + 0.5);

    // Subtle vibration on mobile devices supporting Navigator.vibrate
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      if (severity === 'urgent') {
        navigator.vibrate([100, 50, 100]);
      } else {
        navigator.vibrate(60);
      }
    }
  } catch (e) {
    // Fail silently without disrupting user interaction
  }
}
