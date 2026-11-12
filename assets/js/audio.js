/* ==========================================================================
   Efeitos sonoros do convite (Web Audio API, sintetizados: sem arquivos)
   Papel ao virar o envelope, selo de cera quebrando, aba abrindo, carta
   deslizando e pequenos sinos nas interações. Não há música de fundo.
   O botão no canto superior esquerdo liga/desliga os sons (fica salvo).
   ========================================================================== */
(function () {
  'use strict';

  var AC = window.AudioContext || window.webkitAudioContext;
  var KEY = 'convite:som';
  var S = { ctx: null, sfx: null, noise: null, pref: readPref(), listeners: [] };

  function readPref() {
    try { var v = localStorage.getItem(KEY); return v === null ? true : v === '1'; } catch (e) { return true; }
  }
  function savePref(v) { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) { /* ok */ } }

  // o contexto de áudio só pode nascer depois de um toque/clique (regra dos navegadores)
  function ensure() {
    if (S.ctx || !AC) return S.ctx;
    var ctx = new AC();
    S.ctx = ctx;

    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 14; comp.ratio.value = 3.2;
    comp.attack.value = 0.006; comp.release.value = 0.3;
    comp.connect(ctx.destination);

    var verb = ctx.createConvolver();
    verb.buffer = impulse(ctx, 1.8, 2.8);
    var wet = ctx.createGain(); wet.gain.value = 0.3;
    verb.connect(wet); wet.connect(comp);

    var sfx = ctx.createGain(); sfx.gain.value = 0.85;
    sfx.connect(comp);
    var send = ctx.createGain(); send.gain.value = 0.2;
    sfx.connect(send); send.connect(verb);

    S.sfx = sfx;
    return ctx;
  }

  function impulse(ctx, seconds, decay) {
    var rate = ctx.sampleRate, len = Math.floor(rate * seconds);
    var buf = ctx.createBuffer(2, len, rate);
    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c), lp = 0;
      for (var i = 0; i < len; i++) {
        var t = i / len;
        lp += ((Math.random() * 2 - 1) - lp) * (0.55 - 0.4 * t);
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

  /* ---------- blocos de som ---------- */
  // nota curta e metálica (sininho), usada nos toques e na confirmação
  var PARTIALS = [[1, 1, 2.2], [2, 0.2, 1], [3, 0.05, 0.45], [6.27, 0.08, 0.16]];
  function tine(time, midi, vel) {
    var ctx = S.ctx, f = 440 * Math.pow(2, (midi - 69) / 12);
    var out = ctx.createGain();
    out.gain.value = vel;
    out.connect(S.sfx);
    for (var i = 0; i < PARTIALS.length; i++) {
      var p = PARTIALS[i], fr = f * p[0];
      if (fr > 15000) continue;
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = fr;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(p[1], time + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, time + p[2] * 0.6);
      o.connect(g); g.connect(out);
      o.start(time); o.stop(time + p[2] * 0.6 + 0.05);
    }
  }
  // ruído filtrado: papel, cera, ar
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
    chime: function (t) { var n = [86, 90, 93, 98]; for (var i = 0; i < n.length; i++) tine(t + i * 0.09, n[i], 0.12); },
    pop: function (t) { tine(t, 93 + Math.floor(Math.random() * 5), 0.1); },
    heart: function (t) { tine(t, 86, 0.1); tine(t + 0.11, 93, 0.09); }
  };

  /* ---------- API pública ---------- */
  function unlock() {
    var ctx = ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return !!ctx;
  }
  function sfx(name) {
    if (!S.pref || !S.ctx || !SFX[name]) return;
    if (S.ctx.state === 'suspended') S.ctx.resume();
    try { SFX[name](S.ctx.currentTime + 0.01); } catch (e) { /* silencioso */ }
  }
  function emit() { for (var i = 0; i < S.listeners.length; i++) S.listeners[i](S.pref); }
  function setOn(v) { S.pref = !!v; savePref(S.pref); emit(); }

  // pausa ao sair da aba / minimizar
  document.addEventListener('visibilitychange', function () {
    if (!S.ctx) return;
    if (document.hidden) S.ctx.suspend(); else S.ctx.resume();
  });

  window.Som = {
    supported: !!AC,
    unlock: unlock,
    sfx: sfx,
    toggle: function () { setOn(!S.pref); },
    setOn: setOn,
    isOn: function () { return S.pref; },
    onChange: function (fn) { S.listeners.push(fn); }
  };
})();
