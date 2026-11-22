// Midnight Ledger: all sound is synthesized with WebAudio, no audio files.
// The context starts on the first gesture, so the title screen stays silent.
export function createAudio() {
  let context = null;
  let lastAlarmBeep = 0;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, dur, type, gain, when = 0) {
    const ac = ensure();
    if (!ac) return;
    try {
      const osc = ac.createOscillator();
      const amp = ac.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      amp.gain.setValueAtTime(gain, ac.currentTime + when);
      amp.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + when + dur);
      osc.connect(amp);
      amp.connect(ac.destination);
      osc.start(ac.currentTime + when);
      osc.stop(ac.currentTime + when + dur);
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }

  return {
    unlock() {
      const ac = ensure();
      if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
    },
    tick() {
      tone(1400, 0.05, 'square', 0.04);
    },
    pickup() {
      tone(523, 0.12, 'sine', 0.12);
      tone(784, 0.16, 'sine', 0.12, 0.09);
      tone(1047, 0.22, 'sine', 0.12, 0.18);
    },
    win() {
      [523, 659, 784, 1047].forEach((freq, i) => tone(freq, 0.22, 'triangle', 0.12, i * 0.11));
    },
    lose() {
      tone(220, 0.5, 'sawtooth', 0.1);
      tone(110, 0.7, 'sawtooth', 0.1, 0.1);
    },
    // A short pulse while the alarm is hot; called every frame, throttled inside.
    alarmPulse(alarm, now) {
      if (alarm < 60 || now - lastAlarmBeep < 500) return;
      lastAlarmBeep = now;
      tone(880, 0.09, 'square', 0.05);
    },
  };
}
