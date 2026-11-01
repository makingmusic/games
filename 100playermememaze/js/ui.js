// 100-Player Meme Maze — HUD, title/win screens, touch controls (iPad) + mouse look
'use strict';

const UI = {
  isTouch: ('ontouchstart' in window) || navigator.maxTouchPoints > 0,
  _move: { x: 0, y: 0 },
  _look: { dx: 0, dy: 0 },
  _stickTouch: null,
  _lookTouch: null,
  _stickOrigin: null,

  init(onPlay, onPlayAgain) {
    this.el = {
      title: document.getElementById('title'),
      hud: document.getElementById('hud'),
      planks: document.getElementById('plankCount'),
      hint: document.getElementById('hint'),
      flash: document.getElementById('flash'),
      deathMsg: document.getElementById('deathMsg'),
      win: document.getElementById('win'),
      stick: document.getElementById('stick'),
      nub: document.getElementById('stickNub'),
    };
    // buttons fire on click (desktop) AND touchend (iPod/iPad fallback), guarded so they fire once
    const once = (fn) => { let done = false; return () => { if (done) return; done = true; fn(); }; };
    const playOnce = once(() => { Sound.unlock(); this.el.title.style.display = 'none'; onPlay(); });
    const againOnce = once(() => { this.el.win.style.display = 'none'; onPlayAgain(); });
    const hook = (id, fn) => {
      const b = document.getElementById(id);
      b.addEventListener('click', fn);
      b.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false });
    };
    hook('playBtn', playOnce);
    hook('againBtn', againOnce);
    if (!this.isTouch) {
      const canvas = document.getElementById('game');
      canvas.addEventListener('click', () => { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* ignore */ } });
    } else {
      document.body.classList.add('touch');
    }
    this.initTouch();
  },

  initTouch() {
    const stickZone = 0.45; // left 45% of the screen = move stick
    // touches on real UI controls must keep their native click (preventDefault on
    // touchstart cancels the synthesized click on iOS — buttons would never fire)
    const isUITouch = (t) => !!(t.target && t.target.closest && t.target.closest('button, a'));
    const onStart = (e) => {
      let consumed = false;
      for (const t of e.changedTouches) {
        if (isUITouch(t)) continue; // let buttons be buttons
        consumed = true;
        if (t.clientX < window.innerWidth * stickZone && !this._stickTouch) {
          this._stickTouch = t.identifier;
          this._stickOrigin = { x: t.clientX, y: t.clientY };
          this.el.stick.style.left = (t.clientX - 65) + 'px';
          this.el.stick.style.top = (t.clientY - 65) + 'px';
          this.el.stick.classList.add('on');
        } else if (!this._lookTouch) {
          this._lookTouch = t.identifier;
          this._lastLook = { x: t.clientX, y: t.clientY };
        }
      }
      if (consumed) e.preventDefault();
    };
    const onMove = (e) => {
      let consumed = false;
      for (const t of e.changedTouches) {
        if (t.identifier === this._stickTouch) {
          consumed = true;
          const dx = clamp(t.clientX - this._stickOrigin.x, -55, 55);
          const dy = clamp(t.clientY - this._stickOrigin.y, -55, 55);
          this._move.x = dx / 55;
          this._move.y = dy / 55;
          this.el.nub.style.transform = `translate(${dx * 0.55}px, ${dy * 0.55}px)`;
        } else if (t.identifier === this._lookTouch) {
          consumed = true;
          this._look.dx += t.clientX - this._lastLook.x;
          this._look.dy += t.clientY - this._lastLook.y;
          this._lastLook = { x: t.clientX, y: t.clientY };
        }
      }
      if (consumed) e.preventDefault();
    };
    const onEnd = (e) => {
      let consumed = false;
      for (const t of e.changedTouches) {
        if (t.identifier === this._stickTouch) {
          consumed = true;
          this._stickTouch = null;
          this._move.x = this._move.y = 0;
          this.el.nub.style.transform = 'translate(0,0)';
          this.el.stick.classList.remove('on');
        }
        if (t.identifier === this._lookTouch) { consumed = true; this._lookTouch = null; }
      }
      if (consumed) e.preventDefault();
    };
    document.addEventListener('touchstart', onStart, { passive: false });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd, { passive: false });
    document.addEventListener('touchcancel', onEnd, { passive: false });
  },

  getMove() { return this._move; },
  consumeLook() {
    const l = { dx: this._look.dx, dy: this._look.dy };
    this._look.dx = this._look.dy = 0;
    return l;
  },

  setPlanks(n) { if (this.el) this.el.planks.textContent = n; },

  hint(text, seconds) {
    if (!this.el) return;
    this.el.hint.textContent = text;
    this.el.hint.classList.add('show');
    clearTimeout(this._hintTimer);
    if (seconds) this._hintTimer = setTimeout(() => this.el.hint.classList.remove('show'), seconds * 1000);
  },

  deathFlash() {
    this.el.flash.classList.remove('boom');
    void this.el.flash.offsetWidth; // restart animation
    this.el.flash.classList.add('boom');
    this.el.deathMsg.classList.remove('boom');
    void this.el.deathMsg.offsetWidth;
    this.el.deathMsg.classList.add('boom');
  },

  showWin() { this.el.win.style.display = 'flex'; },
};
