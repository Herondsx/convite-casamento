/* ==========================================================================
   Som do convite
   - Caixinha de música sintetizada em tempo real (Web Audio API) tocando a
     progressão do Cânone em Ré de Pachelbel (domínio público), com variações.
   - Efeitos: papel, selo de cera rachando, aba, carta deslizando, "whoosh".
   - Se CONVITE.musica.arquivo estiver preenchido, toca esse MP3 em loop.
   Nenhum arquivo de áudio é necessário.
   ========================================================================== */
(function () {
  'use strict';

  var AC = window.AudioContext || window.webkitAudioContext;
  var cfg = (window.CONVITE && window.CONVITE.musica) || {};
  var KEY = 'convite:som';

  var S = {
    ctx: null, comp: null, music: null, sfx: null, verb: null,
    noise: null, timer: null, step: 0, next: 0,
    on: false, // música tocando
    pref: readPref(), // preferência do usuário (true = quer som)
    fileEl: null, fileGain: null,
    listeners: []
  };

  function readPref() {
    try { var v = localStorage.getItem(KEY); return v === null ? true : v === '1'; } catch (e) { return true; }
  }
  function savePref(v) { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) { /* ok */ } }

  function ensure() {
    if (S.ctx || !AC) return S.ctx;
    var ctx = new AC();
    S.ctx = ctx;

    var master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);

    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 14; comp.ratio.value = 3.2;
    comp.attack.value = 0.006; comp.release.value = 0.3;
    comp.connect(master);

    var verb = ctx.createConvolver();
    verb.buffer = impulse(ctx, 3.4, 2.6);
    var wet = ctx.createGain(); wet.gain.value = 0.42;
    verb.connect(wet); wet.connect(comp);

    var music = ctx.createGain(); music.gain.value = 0.0001;
    music.connect(comp); music.connect(verb);

    var sfx = ctx.createGain(); sfx.gain.value = 0.85;
    sfx.connect(comp);
    var sfxWet = ctx.createGain(); sfxWet.gain.value = 0.18;
    sfx.connect(sfxWet); sfxWet.connect(verb);

    S.comp = comp; S.music = music; S.sfx = sfx; S.verb = verb;
    return ctx;
  }

  function impulse(ctx, seconds, decay) {
    var rate = ctx.sampleRate, len = Math.floor(rate * seconds);
    var buf = ctx.createBuffer(2, len, rate);
    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c), lp = 0;
      for (var i = 0; i < len; i++) {
        var t = i / len;
        lp += ((Math.random() * 2 - 1) - lp) * (0.55 - 0.4 * t); // cauda mais escura
        var fadeIn = i < rate * 0.012 ? i / (rate * 0.012) : 1;
        d[i] = lp * Math.pow(1 - t, decay) * fadeIn * 0.9;
      }
    }
    return buf;
  }

  function noiseBuf() {
    if (S.noise) return S.noise;
    var ctx = S.ctx, len = ctx.sampleRate * 2;
    var b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    S.noise = b;
    return b;
  }

  /* ---------- timbre de caixinha de música (dente de aço) ---------- */
  var PARTIALS = [[1, 1, 2.8], [2, 0.2, 1.2], [3, 0.05, 0.5], [6.27, 0.08, 0.17], [9.4, 0.025, 0.08]];
  function tine(time, midi, vel, dest) {
    var ctx = S.ctx;
    var f = 440 * Math.pow(2, (midi - 69) / 12);
    var out = ctx.createGain();
    out.gain.value = vel;
    out.connect(dest || S.music);
    var dscale = Math.max(0.45, Math.min(1.35, 1.7 - (midi - 60) / 34));
    for (var i = 0; i < PARTIALS.length; i++) {
      var p = PARTIALS[i], fr = f * p[0];
      if (fr > 15000) continue;
      var o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = fr;
      if (i === 1) o.detune.value = 3;
      var g = ctx.createGain();
      var dec = p[2] * dscale;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(p[1], time + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dec);
      o.connect(g); g.connect(out);
      o.start(time); o.stop(time + dec + 0.05);
    }
  }

  /* ---------- Cânone em Ré (Pachelbel, domínio público) ---------- */
  var BPM = 70, EIGHTH = 60 / BPM / 2;
  // [baixo, arpejo(4 colcheias)] por acorde: D A Bm F#m G D G A
  var PROG = [
    [62, [69, 74, 78, 74]],
    [57, [69, 73, 76, 73]],
    [59, [66, 71, 74, 71]],
    [54, [66, 69, 73, 69]],
    [55, [67, 71, 74, 71]],
    [50, [66, 69, 74, 69]],
    [55, [67, 71, 74, 71]],
    [57, [64, 69, 73, 69]]
  ];
  var M1 = [90, 88, 86, 85, 83, 81, 83, 85]; // fá# mi ré dó# si lá si dó#
  var M2 = [86, 85, 83, 81, 79, 78, 79, 76];
  var M3 = [86, 90, 93, 91, 90, 86, 90, 88, 86, 83, 86, 81, 79, 83, 81, 79]; // 2 por acorde
  var PLAN = [
    { arp: 1, mel: null }, { arp: 1, mel: M1 }, { arp: 1, mel: M2 }, { arp: 1, mel: M3 },
    { arp: 0.6, mel: M1, hi: -12 }, { arp: 1, mel: M2 }, { arp: 1, mel: M3 }, { arp: 0.5, mel: null }
  ];

  function jitter(t) { return t + (Math.random() - 0.5) * 0.014; }
  function scheduleStep(step, t) {
    var chord = Math.floor(step / 4) % 8;
    var within = step % 4;
    var loop = Math.floor(step / 32);
    var plan = PLAN[loop === 0 ? 0 : 1 + ((loop - 1) % (PLAN.length - 1))];
    var c = PROG[chord];
    var v = 0.85 + Math.random() * 0.3;
    if (within === 0) tine(jitter(t), c[0], 0.2 * v);
    if (Math.random() < plan.arp || within === 0) {
      var av = [0.11, 0.075, 0.09, 0.07][within];
      tine(jitter(t + 0.004), c[1][within], av * v);
    }
    var mel = plan.mel;
    if (mel) {
      var hi = plan.hi || 0;
      if (mel.length === 8 && within === 0) tine(jitter(t + 0.01), mel[chord] + hi, 0.15 * v);
      if (mel.length === 16 && (within === 0 || within === 2)) tine(jitter(t + 0.01), mel[chord * 2 + within / 2], 0.13 * v);
    }
  }
  function scheduler() {
    var ctx = S.ctx;
    while (S.next < ctx.currentTime + 0.3) {
      scheduleStep(S.step, S.next);
      S.next += EIGHTH;
      S.step++;
    }
  }

  /* ---------- música: arquivo do usuário (opcional) ---------- */
  function fileStart() {
    if (!S.fileEl) {
      var a = new Audio();
      a.src = cfg.arquivo; a.loop = true; a.preload = 'auto'; a.crossOrigin = 'anonymous';
      S.fileEl = a;
      try {
        var src = S.ctx.createMediaElementSource(a);
        S.fileGain = S.ctx.createGain(); S.fileGain.gain.value = 0.0001;
        src.connect(S.fileGain); S.fileGain.connect(S.comp);
      } catch (e) { S.fileGain = null; }
    }
    var p = S.fileEl.play();
    if (p && p.catch) p.catch(function () { /* bloqueado: o usuário pode tocar no botão */ });
    if (S.fileGain) {
      var now = S.ctx.currentTime;
      S.fileGain.gain.cancelScheduledValues(now);
      S.fileGain.gain.setValueAtTime(Math.max(0.0001, S.fileGain.gain.value), now);
      S.fileGain.gain.exponentialRampToValueAtTime(0.9, now + 2.5);
    }
  }
  function fileStop() {
    if (!S.fileEl) return;
    if (S.fileGain) {
      var now = S.ctx.currentTime;
      S.fileGain.gain.cancelScheduledValues(now);
      S.fileGain.gain.setValueAtTime(Math.max(0.0001, S.fileGain.gain.value), now);
      S.fileGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      setTimeout(function () { if (!S.on) S.fileEl.pause(); }, 900);
    } else {
      S.fileEl.pause();
    }
  }

  /* ---------- API pública ---------- */
  function unlock() {
    var ctx = ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return !!ctx;
  }

  function startMusic() {
    if (!unlock()) return;
    if (S.on) return;
    S.on = true;
    S.pref = true; savePref(true);
    var ctx = S.ctx, now = ctx.currentTime;
    if (cfg.arquivo) {
      fileStart();
    } else {
      S.music.gain.cancelScheduledValues(now);
      S.music.gain.setValueAtTime(Math.max(0.0001, S.music.gain.value), now);
      S.music.gain.exponentialRampToValueAtTime(0.75, now + 3);
      if (!S.timer) {
        S.next = now + 0.12;
        S.timer = setInterval(scheduler, 60);
        scheduler();
      }
    }
    emit();
  }

  function stopMusic(remember) {
    if (!S.on) return;
    S.on = false;
    if (remember !== false) { S.pref = false; savePref(false); }
    if (S.ctx) {
      if (cfg.arquivo) {
        fileStop();
      } else {
        var now = S.ctx.currentTime;
        S.music.gain.cancelScheduledValues(now);
        S.music.gain.setValueAtTime(Math.max(0.0001, S.music.gain.value), now);
        S.music.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
        setTimeout(function () {
          if (!S.on && S.timer) { clearInterval(S.timer); S.timer = null; }
        }, 1400);
      }
    }
    emit();
  }

  function toggle() { if (S.on) stopMusic(); else startMusic(); }

  /* ---------- efeitos ---------- */
  function burst(t, dur, o) {
    var ctx = S.ctx;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf();
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    var flt = ctx.createBiquadFilter();
    flt.type = o.type || 'bandpass';
    flt.frequency.setValueAtTime(o.f || 1500, t);
    if (o.f2) flt.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    flt.Q.value = o.q || 0.8;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.gain || 0.3, t + (o.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(S.sfx);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
  }
  function thump(t, f1, f2, dur, gain) {
    var ctx = S.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(S.sfx);
    o.start(t); o.stop(t + dur + 0.05);
  }

  var SFX = {
    paper: function (t) { // virar o envelope
      burst(t, 0.5, { type: 'bandpass', f: 700, f2: 2600, q: 0.6, gain: 0.16, attack: 0.08 });
      for (var i = 0; i < 5; i++) burst(t + 0.05 + i * 0.07 + Math.random() * 0.03, 0.06, { f: 2500 + Math.random() * 2500, q: 1.2, gain: 0.07 + Math.random() * 0.06 });
    },
    crack: function (t) { // selo de cera quebrando
      burst(t, 0.035, { type: 'highpass', f: 2200, q: 0.7, gain: 0.55, attack: 0.001 });
      thump(t, 180, 60, 0.12, 0.35);
      burst(t + 0.045, 0.025, { type: 'highpass', f: 3500, gain: 0.25, attack: 0.001 });
      for (var i = 0; i < 4; i++) burst(t + 0.09 + Math.random() * 0.2, 0.012, { type: 'highpass', f: 4000, gain: 0.06 + Math.random() * 0.06, attack: 0.001 });
    },
    flap: function (t) { burst(t, 0.6, { type: 'bandpass', f: 500, f2: 1800, q: 0.5, gain: 0.13, attack: 0.15 }); },
    slide: function (t) {
      burst(t, 0.9, { type: 'bandpass', f: 1400, f2: 2600, q: 0.9, gain: 0.08, attack: 0.25 });
      burst(t + 0.1, 0.7, { type: 'highpass', f: 5000, q: 0.5, gain: 0.03, attack: 0.2 });
    },
    whoosh: function (t) { burst(t, 1.4, { type: 'lowpass', f: 250, f2: 3200, q: 1.4, gain: 0.2, attack: 0.6 }); },
    chime: function (t) { var n = [86, 90, 93, 98]; for (var i = 0; i < n.length; i++) tine(t + i * 0.09, n[i], 0.12, S.sfx); },
    pop: function (t) { tine(t, 93 + Math.floor(Math.random() * 5), 0.1, S.sfx); },
    heart: function (t) { tine(t, 86, 0.1, S.sfx); tine(t + 0.11, 93, 0.09, S.sfx); }
  };

  function sfx(name) {
    if (!S.pref || !S.ctx || !SFX[name]) return;
    if (S.ctx.state === 'suspended') S.ctx.resume();
    try { SFX[name](S.ctx.currentTime + 0.01); } catch (e) { /* silencioso */ }
  }

  function emit() { for (var i = 0; i < S.listeners.length; i++) S.listeners[i](S.on); }

  // pausa ao sair da aba / minimizar
  document.addEventListener('visibilitychange', function () {
    if (!S.ctx) return;
    if (document.hidden) {
      if (S.fileEl && S.on) S.fileEl.pause();
      S.ctx.suspend();
    } else if (S.on) {
      S.ctx.resume();
      if (S.fileEl) S.fileEl.play().catch(function () {});
    }
  });

  window.Som = {
    supported: !!AC,
    unlock: unlock,
    startMusic: startMusic,
    stopMusic: stopMusic,
    toggle: toggle,
    isOn: function () { return S.on; },
    wantsSound: function () { return S.pref; },
    sfx: sfx,
    onChange: function (fn) { S.listeners.push(fn); }
  };
})();
