/* ==========================================================================
   Efeitos visuais "vivos"
   - Vagalumes em canvas (piscam, vagueiam, orbitam o cursor/dedo, reagem ao scroll)
   - Explosão de pétalas (confirmação de presença)
   - Coração ao tocar duas vezes na foto
   - Migalhas de cera ao quebrar o selo
   ========================================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  // aparelho modesto? começa econômico; o governador em tick() também se adapta em tempo real
  var lite = !!((navigator.deviceMemory && navigator.deviceMemory <= 3) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 3));

  /* ---------------- Vagalumes ---------------- */
  var cv, ctx, W = 0, H = 0, dpr = 1, flies = [], sprites = [], raf = 0, last = 0, running = false;
  var pointer = { x: -1e4, y: -1e4, t: -1e4 };
  var attr = null; // órbita ao redor de um ponto (ex.: o envelope)
  var lastScroll = window.scrollY || 0, scrollAcc = 0;
  var ema = 16.7, slowFrames = 0, frameN = 0;

  function makeSprite(r, g, b) {
    var s = document.createElement('canvas'), N = 64;
    s.width = s.height = N;
    var c = s.getContext('2d');
    var grd = c.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
    grd.addColorStop(0, 'rgba(255,255,250,1)');
    grd.addColorStop(0.1, 'rgba(' + r + ',' + g + ',' + b + ',0.95)');
    grd.addColorStop(0.32, 'rgba(' + r + ',' + g + ',' + b + ',0.28)');
    grd.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
    c.fillStyle = grd;
    c.fillRect(0, 0, N, N);
    return s;
  }

  function makeFly() {
    var pick = Math.random();
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: 0, vy: 0,
      a: Math.random() * Math.PI * 2,
      sp: 7 + Math.random() * 15,
      size: 9 + Math.random() * 15,
      ph: Math.random() * Math.PI * 2,
      fr: 0.18 + Math.random() * 0.45,
      depth: 0.35 + Math.random() * 0.65,
      s: sprites[pick < 0.62 ? 0 : pick < 0.85 ? 1 : 2]
    };
  }

  function resize() {
    if (!cv) return;
    // os brilhos são difusos: no celular, desenhar em 1x é imperceptível e bem mais leve
    dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1 : 1.5);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var target = Math.round(Math.max(16, Math.min(46, (W * H) / 24000)) * (lite ? 0.6 : 1));
    while (flies.length < target) flies.push(makeFly());
    if (flies.length > target) flies.length = target;
  }

  function tick(now) {
    raf = 0;
    if (!running) return;
    var rawDt = now - last;
    // governador: se o aparelho não sustenta ~45 fps, reduz a quantidade e desenha a 30 fps
    ema += (Math.min(rawDt, 100) - ema) * 0.05;
    if (!lite && ema > 24) {
      if (++slowFrames > 60) { lite = true; flies.length = Math.max(10, Math.round(flies.length * 0.6)); }
    } else slowFrames = 0;
    if (lite && (frameN++ & 1)) { raf = requestAnimationFrame(tick); return; }
    var dt = Math.min(0.05, rawDt / 1000 || 0.016);
    last = now;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    var sv = scrollAcc; scrollAcc = 0;
    var near = now - pointer.t < 2200;
    var t = now / 1000;
    for (var i = 0; i < flies.length; i++) {
      var f = flies[i];
      f.a += (Math.random() - 0.5) * 2.4 * dt;
      var tx = Math.cos(f.a) * f.sp, ty = Math.sin(f.a) * f.sp - 3;
      var k = Math.min(1, dt * 1.4);
      f.vx += (tx - f.vx) * k; f.vy += (ty - f.vy) * k;
      if (near) {
        var dx = pointer.x - f.x, dy = pointer.y - f.y, d2 = dx * dx + dy * dy;
        if (d2 < 52000 && d2 > 1) {
          var d = Math.sqrt(d2), pull = (1 - d / 228) * 70 * f.depth;
          f.vx += (dx / d * pull * 0.55 - dy / d * pull) * dt;
          f.vy += (dy / d * pull * 0.55 + dx / d * pull) * dt;
        }
      }
      if (attr) {
        var ax = attr.x - f.x, ay = attr.y - f.y, ad = Math.sqrt(ax * ax + ay * ay) + 0.001;
        if (ad < attr.reach) {
          var w = 1 - ad / attr.reach;
          var radial = (ad - attr.ring) * 0.9 * w; // mola em direção ao anel
          var orbit = attr.k * w * (i % 2 ? 1 : -1);
          f.vx += (ax / ad * radial - ay / ad * orbit) * dt;
          f.vy += (ay / ad * radial + ax / ad * orbit) * dt;
        }
      }
      f.x += f.vx * dt;
      f.y += f.vy * dt - sv * f.depth * 0.5;
      if (f.x < -40) f.x = W + 30; else if (f.x > W + 40) f.x = -30;
      if (f.y < -40) f.y = H + 30; else if (f.y > H + 40) f.y = -30;
      var blink = 0.5 + 0.5 * Math.sin(t * f.fr * 6.283 + f.ph);
      var al = (Math.pow(blink, 2.6) * 0.92 + 0.06) * f.depth;
      var s = f.size * (0.72 + 0.32 * blink);
      ctx.globalAlpha = al;
      ctx.drawImage(f.s, f.x - s / 2, f.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(tick);
  }

  function start() {
    if (!cv || running || reduce) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function init(canvas) {
    cv = canvas;
    if (!cv || !cv.getContext) return;
    ctx = cv.getContext('2d');
    sprites = [makeSprite(255, 222, 150), makeSprite(255, 242, 205), makeSprite(212, 196, 240)];
    resize();
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', function (e) {
      pointer.x = e.clientX; pointer.y = e.clientY; pointer.t = performance.now();
    }, { passive: true });
    window.addEventListener('pointerdown', function (e) {
      pointer.x = e.clientX; pointer.y = e.clientY; pointer.t = performance.now();
    }, { passive: true });
    window.addEventListener('scroll', function () {
      var y = window.scrollY || 0;
      scrollAcc += y - lastScroll;
      lastScroll = y;
    }, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });
    if (reduce) {
      // quadro estático, sem animação
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < flies.length; i++) {
        var f = flies[i];
        ctx.globalAlpha = 0.5 * f.depth;
        ctx.drawImage(f.s, f.x - f.size / 2, f.y - f.size / 2, f.size, f.size);
      }
      return;
    }
    start();
  }

  /* ---------------- Pétalas ---------------- */
  var PETAL_COLORS = ['#cdbde2', '#e9e2f2', '#f5f2eb', '#b9c6d5', '#a898c6', '#dfe6ee', '#c9d7c4'];
  function petals(x, y, n) {
    if (reduce) return;
    n = n || 40;
    for (var i = 0; i < n; i++) (function (i) {
      var el = document.createElement('i');
      el.className = 'petal';
      el.style.background = PETAL_COLORS[i % PETAL_COLORS.length];
      var size = 7 + Math.random() * 9;
      el.style.width = size + 'px';
      el.style.height = size * 1.35 + 'px';
      document.body.appendChild(el);
      // física simples amostrada em quadros-chave
      var ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.25;
      var v = 380 + Math.random() * 420;
      var vx = Math.cos(ang) * v, vy = Math.sin(ang) * v;
      var px = x, py = y, rot = Math.random() * 360, spin = (Math.random() - 0.5) * 720;
      var flip = Math.random() * 360, flipSpeed = 300 + Math.random() * 500;
      var T = 2.2 + Math.random() * 1.4, steps = 26, dt = T / steps, frames = [];
      var sway = 18 + Math.random() * 30, swayF = 2 + Math.random() * 2.5, ph = Math.random() * 6;
      for (var k = 0; k <= steps; k++) {
        var tt = k * dt;
        var op = k / steps > 0.72 ? Math.max(0, 1 - (k / steps - 0.72) / 0.28) : 1;
        frames.push({
          transform: 'translate3d(' + (px + Math.sin(tt * swayF + ph) * sway * Math.min(1, tt)).toFixed(1) + 'px,' + py.toFixed(1) + 'px,0) rotate(' + (rot + spin * tt).toFixed(0) + 'deg) rotateX(' + (flip + flipSpeed * tt).toFixed(0) + 'deg)',
          opacity: op
        });
        vx *= Math.pow(0.18, dt); // arrasto do ar
        vy = vy * Math.pow(0.25, dt) + 900 * dt;
        if (vy > 110) vy = 110; // velocidade terminal (flutua)
        px += vx * dt; py += vy * dt;
      }
      var a = el.animate(frames, { duration: T * 1000, easing: 'linear', fill: 'forwards' });
      a.onfinish = function () { el.remove(); };
    })(i);
  }

  /* ---------------- Coração (toque duplo) ---------------- */
  function heart(container, x, y) {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'float-heart');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS(NS, 'use');
    use.setAttribute('href', '#i-heart');
    svg.appendChild(use);
    svg.style.left = x + 'px';
    svg.style.top = y + 'px';
    container.appendChild(svg);
    var r = (Math.random() - 0.5) * 30;
    var a = svg.animate([
      { transform: 'scale(0) rotate(' + r + 'deg)', opacity: 0 },
      { transform: 'scale(1.25) rotate(' + r + 'deg)', opacity: 1, offset: 0.18 },
      { transform: 'scale(.95) rotate(' + r + 'deg)', opacity: 1, offset: 0.3 },
      { transform: 'scale(1) rotate(' + r + 'deg)', opacity: 1, offset: 0.55 },
      { transform: 'translateY(-90px) scale(.8) rotate(' + r + 'deg)', opacity: 0 }
    ], { duration: reduce ? 400 : 1300, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
    a.onfinish = function () { svg.remove(); };
    if (!reduce) {
      var rect = container.getBoundingClientRect();
      petals(rect.left + x, rect.top + y, 12);
    }
  }

  /* ---------------- Migalhas de cera ---------------- */
  function crumbs(container, cx, cy, n) {
    if (reduce) return;
    n = n || 10;
    for (var i = 0; i < n; i++) {
      var el = document.createElement('i');
      el.className = 'wax-crumb';
      var s = 2 + Math.random() * 4;
      el.style.width = s + 'px'; el.style.height = s + 'px';
      el.style.left = cx + 'px'; el.style.top = cy + 'px';
      container.appendChild(el);
      var ang = Math.random() * Math.PI * 2, dist = 20 + Math.random() * 50;
      var dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist * 0.6 - 10;
      var fall = 140 + Math.random() * 160;
      var a = el.animate([
        { transform: 'translate(0,0) rotate(0)', opacity: 1 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + (Math.random() * 180) + 'deg)', opacity: 1, offset: 0.25 },
        { transform: 'translate(' + (dx * 1.3) + 'px,' + (dy + fall) + 'px) rotate(' + (Math.random() * 540) + 'deg)', opacity: 0 }
      ], { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.3,.6,.6,1)', fill: 'forwards' });
      a.onfinish = (function (el) { return function () { el.remove(); }; })(el);
    }
  }

  /* ---------------- Órbita / dispersão ---------------- */
  function attract(x, y, ring) {
    if (x == null) { attr = null; return; }
    attr = { x: x, y: y, ring: ring || 220, reach: (ring || 220) * 1.9, k: 34 };
  }
  function scatter(x, y, power) {
    power = power || 160;
    for (var i = 0; i < flies.length; i++) {
      var f = flies[i], dx = f.x - x, dy = f.y - y, d = Math.sqrt(dx * dx + dy * dy) + 0.001;
      if (d < 520) { var k = power * (1 - d / 520); f.vx += dx / d * k; f.vy += dy / d * k; }
    }
  }

  window.FX = { init: init, start: start, stop: stop, petals: petals, heart: heart, crumbs: crumbs, attract: attract, scatter: scatter, reduce: reduce };
})();
