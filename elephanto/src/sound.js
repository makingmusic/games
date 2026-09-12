// Elephanto — tiny WebAudio beeps. No external files.
// All sounds are optional: the game plays fine if audio is unavailable.

var AudioCtx = null;
var audioUnlocked = false;

function unlockAudio() {
  if (audioUnlocked) return;
  try {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    AudioCtx = new AC();
    if (AudioCtx.state === 'suspended') AudioCtx.resume();
    audioUnlocked = true;
  } catch (e) { /* audio unavailable — stay silent */ }
}

function beep(freq, dur, type, vol, slide) {
  if (!audioUnlocked || !AudioCtx) return;
  try {
    var t = AudioCtx.currentTime;
    var osc = AudioCtx.createOscillator();
    var gain = AudioCtx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + dur);
    gain.gain.setValueAtTime(vol || 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain); gain.connect(AudioCtx.destination);
    osc.start(t); osc.stop(t + dur);
  } catch (e) { /* ignore */ }
}

function sfx(name) {
  switch (name) {
    case 'hit':     beep(180, 0.12, 'square', 0.14, 90); break;
    case 'swing':   beep(320, 0.06, 'sine', 0.06, 180); break;
    case 'hurt':    beep(140, 0.2, 'sawtooth', 0.12, 70); break;
    case 'pickup':  beep(520, 0.1, 'sine', 0.12, 780); break;
    case 'quest':   beep(660, 0.12, 'sine', 0.12, 990);
                    setTimeout(function () { beep(990, 0.16, 'sine', 0.12, 1320); }, 120); break;
    case 'meow':    beep(700, 0.25, 'sine', 0.1, 420); break;
    case 'lava':    beep(90, 0.4, 'sawtooth', 0.14, 40); break;
    case 'heal':    beep(440, 0.15, 'sine', 0.1, 660); break;
    case 'down':    beep(220, 0.3, 'square', 0.14, 55); break;
    case 'win':     [523, 659, 784, 1047].forEach(function (f, i) {
                      setTimeout(function () { beep(f, 0.22, 'sine', 0.12); }, i * 160);
                    }); break;
  }
}
