// Barry's Prison Run — tiny WebAudio synth. No audio files; everything optional.

var AudioCtx = null;
var audioUnlocked = false;
var muted = false;

try { muted = localStorage.getItem('bpr_mute') === '1'; } catch (e) {}

function unlockAudio() {
  if (audioUnlocked) return;
  try {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    AudioCtx = new AC();
    if (AudioCtx.state === 'suspended') AudioCtx.resume();
    audioUnlocked = true;
  } catch (e) { /* stay silent */ }
}

function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('bpr_mute', muted ? '1' : '0'); } catch (e) {}
  return muted;
}

function tone(freq, dur, type, vol, slide, delay) {
  if (!audioUnlocked || !AudioCtx || muted) return;
  try {
    var t = AudioCtx.currentTime + (delay || 0);
    var osc = AudioCtx.createOscillator();
    var gain = AudioCtx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + dur);
    gain.gain.setValueAtTime(vol || 0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain); gain.connect(AudioCtx.destination);
    osc.start(t); osc.stop(t + dur + 0.02);
  } catch (e) { /* ignore */ }
}

function noise(dur, vol, lowpass) {
  if (!audioUnlocked || !AudioCtx || muted) return;
  try {
    var t = AudioCtx.currentTime;
    var n = Math.floor(AudioCtx.sampleRate * dur);
    var buf = AudioCtx.createBuffer(1, n, AudioCtx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var src = AudioCtx.createBufferSource();
    src.buffer = buf;
    var gain = AudioCtx.createGain();
    gain.gain.value = vol || 0.08;
    var filt = AudioCtx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = lowpass || 1200;
    src.connect(filt); filt.connect(gain); gain.connect(AudioCtx.destination);
    src.start(t);
  } catch (e) { /* ignore */ }
}

// The signature sound. A silly two-part honk: "ho... OY!"
// pitch wobbles randomly so no two HOYs are alike.
function hoySound(vol) {
  var v = vol === undefined ? 0.16 : vol;
  var base = 250 + Math.random() * 90;
  tone(base, 0.09, 'sawtooth', v, base * 0.72);
  tone(base * 1.25, 0.2, 'sawtooth', v * 1.05, base * 0.62, 0.09);
  tone(base * 2.5, 0.18, 'square', v * 0.25, base * 1.9, 0.09);
}

function sfx(name, vol) {
  var v = vol;
  switch (name) {
    case 'hoy':     hoySound(v); break;
    case 'step':    tone(90, 0.05, 'triangle', 0.05, 70); break;
    case 'jump':    tone(240, 0.14, 'sine', 0.09, 420); break;
    case 'land':    noise(0.08, 0.06, 500); break;
    case 'poof':    tone(500, 0.3, 'sine', 0.12, 120); noise(0.15, 0.05, 900); break;
    case 'button':  tone(300, 0.1, 'square', 0.12, 150);
                    tone(500, 0.14, 'square', 0.12, 700, 0.1); break;
    case 'check':   tone(660, 0.12, 'sine', 0.1, 880);
                    tone(880, 0.18, 'sine', 0.1, 1320, 0.11); break;
    case 'shoot':   tone(160, 0.12, 'square', 0.1, 60); noise(0.1, 0.06, 800); break;
    case 'splat':   noise(0.12, 0.12, 600); tone(180, 0.1, 'sine', 0.08, 90); break;
    case 'bosshit': tone(320, 0.1, 'square', 0.1, 210); noise(0.1, 0.08, 700); break;
    case 'whistle': tone(1200, 0.22, 'sine', 0.1, 1600);
                    tone(1600, 0.3, 'sine', 0.1, 1100, 0.2); break;
    case 'stomp':   tone(70, 0.35, 'sawtooth', 0.2, 34); noise(0.25, 0.14, 300); break;
    case 'ring':    tone(520, 0.16, 'sine', 0.09, 300); break;
    case 'tennis':  tone(700, 0.07, 'sine', 0.07, 500); break;
    case 'bonk':    tone(200, 0.16, 'square', 0.12, 80); break;
    case 'gotcha':  tone(400, 0.1, 'sawtooth', 0.12, 250);
                    hoySound(0.14); break;
    case 'zap':     tone(1800, 0.35, 'sawtooth', 0.1, 200); noise(0.3, 0.06, 4000);
                    tone(90, 0.4, 'sine', 0.12, 600, 0.05); break;
    case 'pickup':  tone(520, 0.1, 'sine', 0.11, 780);
                    tone(780, 0.14, 'sine', 0.11, 1040, 0.1); break;
    case 'win':     [523, 659, 784, 1047, 1319].forEach(function (f, i) {
                      tone(f, 0.24, 'sine', 0.11, undefined, i * 150);
                    }); break;
    case 'fanfare': [392, 523, 659, 784].forEach(function (f, i) {
                      tone(f, 0.2, 'triangle', 0.12, undefined, i * 130);
                    }); break;
    case 'tap':     tone(600, 0.06, 'sine', 0.08, 500); break;
    case 'climb':   tone(180, 0.05, 'triangle', 0.05, 240); break;
    case 'slide':   noise(0.4, 0.05, 2500); break;
    case 'engine':  tone(80, 0.4, 'sawtooth', 0.06, 95); break;
    case 'heli':    noise(0.25, 0.05, 400); break;
    case 'yum':     tone(350, 0.12, 'sine', 0.1, 500); tone(500, 0.18, 'sine', 0.1, 700, 0.12); break;
    case 'wobble':  tone(300, 0.1, 'sine', 0.06, 330); break;
  }
}
