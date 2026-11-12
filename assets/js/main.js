/* ==========================================================================
   Convite de casamento — lógica principal
   Tudo roda no navegador (site estático, compatível com GitHub Pages).
   ========================================================================== */
(() => {
  'use strict';

  const C = window.CONVITE || {};
  const html = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const T = (ms) => (reduce ? Math.min(ms, 40) : ms);
  const NS = 'http://www.w3.org/2000/svg';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const Som = window.Som || { unlock() {}, startMusic() {}, stopMusic() {}, toggle() {}, isOn: () => false, wantsSound: () => false, sfx() {}, onChange() {}, supported: false };
  const FX = window.FX || { init() {}, petals() {}, heart() {}, crumbs() {}, attract() {}, scatter() {} };
  const params = new URLSearchParams(location.search);
  // durante a intro o conteúdo não é renderizado (content-visibility); medir algo
  // lá dentro forçaria o navegador a renderizar tudo (e baixar fontes) antes da hora
  const contentHidden = () => html.classList.contains('is-intro') && !html.classList.contains('is-revealed');

  /* ------------------------------------------------------------------
     Dados derivados da configuração
     ------------------------------------------------------------------ */
  const N1 = (C.noivos && C.noivos.primeiro) || { nome: 'Heron', completo: 'Heron de Souza' };
  const N2 = (C.noivos && C.noivos.segundo) || { nome: 'Daniela', completo: 'Daniela Medina' };
  const TX = C.textos || {};
  const TZ = C.fuso || 'America/Sao_Paulo';
  const DATE = new Date(C.data || '2027-06-12T16:30:00-03:00');
  const CER = C.cerimonia || {};
  const REC = C.recepcao || null;

  function fmt(d, opts) {
    try { return new Intl.DateTimeFormat('pt-BR', Object.assign({ timeZone: TZ }, opts)).format(d); }
    catch (e) { return new Intl.DateTimeFormat('pt-BR', opts).format(d); }
  }
  const ano = fmt(DATE, { year: 'numeric' });
  const dia = fmt(DATE, { day: 'numeric' });
  const mes = fmt(DATE, { month: 'long' });
  const mesCurto = fmt(DATE, { month: 'short' }).replace('.', '').toUpperCase();
  const diaSemana = fmt(DATE, { weekday: 'long' }).replace('-feira', '');
  const dataCurta = `${fmt(DATE, { day: '2-digit' })} · ${fmt(DATE, { month: '2-digit' })} · ${ano}`;
  const horaRaw = fmt(DATE, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const hora = horaRaw.replace(':00', 'h').replace(':', 'h');

  const prazoDate = C.rsvp && C.rsvp.prazo ? new Date(C.rsvp.prazo + 'T12:00:00') : null;
  const prazo = prazoDate && !isNaN(prazoDate)
    ? new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' }).format(prazoDate)
    : '';

  const para = (params.get('para') || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  const maxPessoas = clamp(parseInt(params.get('max'), 10) || (C.rsvp && C.rsvp.maxPessoas) || 4, 1, 30);

  const binds = {
    nome1: N1.nome, nome2: N2.nome, completo1: N1.completo, completo2: N2.completo,
    nomesCurto: `${N1.nome} & ${N2.nome}`,
    inicial1: (N1.nome || 'H').charAt(0).toUpperCase(),
    inicial2: (N2.nome || 'D').charAt(0).toUpperCase(),
    chamada: TX.chamada, textoConvite: TX.convite, envelopeNota: TX.envelopeNota, fraseFinal: TX.fraseFinal,
    cidade: C.cidade, ano, dia, mes, diaSemana, dataCurta,
    carimbo: `${N1.nome} • ${N2.nome} • ${ano} •`.toUpperCase(),
    carimboDia: `${dia} ${mesCurto}`,
    horaCerimonia: CER.horario || hora,
    cerimoniaNome: CER.nome,
    trajeNome: C.traje && C.traje.nome,
    trajeTexto: C.traje && C.traje.texto,
    trajeEvitar: C.traje && C.traje.evitar,
    presentesTexto: C.presentes && C.presentes.texto,
    prazo
  };

  function bindAll() {
    $$('[data-bind]').forEach((el) => {
      const v = binds[el.getAttribute('data-bind')];
      if (v != null && v !== '') el.textContent = v;
    });
    document.title = `${N1.nome} & ${N2.nome} · Convite de Casamento`;
    const to = $('#toName');
    to.textContent = para || TX.envelopePara || 'você';
    if (to.textContent.length > 15) to.classList.add('is-long');
    if (!(C.traje && C.traje.evitar)) $('.dress__avoid').hidden = true;
    if (fine) $('#heroTip').textContent = 'clique duas vezes na foto';
    if (!prazo) $('.card--rsvp .card__text').hidden = true;
  }

  /* ------------------------------------------------------------------
     Ornamentos: ramos de folhas (ecoam o relevo do papel)
     ------------------------------------------------------------------ */
  function leafPath(L, W) {
    return `M0 0C${(L * 0.25).toFixed(1)} ${(-W).toFixed(1)} ${(L * 0.72).toFixed(1)} ${(-W).toFixed(1)} ${L.toFixed(1)} 0C${(L * 0.72).toFixed(1)} ${W.toFixed(1)} ${(L * 0.25).toFixed(1)} ${W.toFixed(1)} 0 0Z`;
  }
  function sprigSVG(w = 220, h = 34) {
    const cx = w / 2, cy = h / 2 + 1;
    let out = '';
    for (const side of [-1, 1]) {
      const ex = cx + side * (w / 2 - 4), ey = cy - 4;
      const qx = cx + side * w * 0.24, qy = cy + 5;
      out += `<path d="M${cx} ${cy}Q${qx} ${qy} ${ex} ${ey}" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>`;
      const n = 7;
      for (let i = 1; i <= n; i++) {
        for (const up of [-1, 1]) {
          const t = (i - (up > 0 ? 0.45 : 0)) / (n + 0.4);
          if (t <= 0.04) continue;
          const x = (1 - t) * (1 - t) * cx + 2 * (1 - t) * t * qx + t * t * ex;
          const y = (1 - t) * (1 - t) * cy + 2 * (1 - t) * t * qy + t * t * ey;
          const L = 14 * (1 - t * 0.5), W = 3.4 * (1 - t * 0.3);
          const base = side > 0 ? 0 : 180;
          const ang = base + (up < 0 ? -38 : 34) * side;
          out += `<path d="${leafPath(L, W)}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang})" fill="currentColor" opacity=".85"/>`;
        }
      }
    }
    out += `<circle cx="${cx}" cy="${cy}" r="2.3" fill="currentColor"/>`;
    return `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false">${out}</svg>`;
  }
  function buildSprigs() { $$('.sprig').forEach((el) => { el.innerHTML = sprigSVG(); }); }

  /* ------------------------------------------------------------------
     Floresta (silhuetas de pinheiros geradas, em camadas com parallax)
     ------------------------------------------------------------------ */
  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function firTree(cx, base, th, tw, r) {
    const tiers = 6 + Math.floor(r() * 4), trunk = th * 0.05;
    const left = [], right = [];
    for (let i = 0; i < tiers; i++) {
      const t0 = i / tiers;
      const y = base - trunk - (th - trunk) * t0;
      const hw = (tw / 2) * Math.pow(1 - t0, 0.92) * (0.82 + r() * 0.36);
      const tierH = (th - trunk) / tiers;
      left.push([cx - hw, y + r() * 2], [cx - hw * 0.42, y - tierH * 0.55]);
      right.push([cx + hw * (0.82 + r() * 0.36), y + r() * 2], [cx + hw * 0.42, y - tierH * 0.55]);
    }
    const pts = [[cx - tw * 0.05, base], ...left, [cx + (r() - 0.5) * 2, base - th], ...right.reverse(), [cx + tw * 0.05, base]];
    return 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';
  }
  function forestPath(w, h, seed, minH, maxH, gap) {
    const r = rng(seed);
    let d = '', x = -30;
    while (x < w + 30) {
      const th = h * (minH + r() * (maxH - minH));
      const tw = th * (0.24 + r() * 0.12);
      d += firTree(x, h + 1, th, tw, r);
      x += tw * (gap + r() * 0.55);
    }
    return d + `M-10 ${h + 2}L-10 ${h - 3}L${w + 10} ${h - 3}L${w + 10} ${h + 2}Z`;
  }
  const forests = [];
  function buildForests() {
    $$('.forest').forEach((f, fi) => {
      const layers = $$('.forest__layer', f).map((svg, li) => {
        svg.dataset.seed = String(11 + fi * 31 + li * 7);
        return { el: svg, depth: parseFloat(svg.dataset.depth) || 0.2 };
      });
      forests.push({ el: f, layers });
    });
  }
  function rebuildForests() {
    if (contentHidden()) return;
    $$('.forest__layer').forEach((svg) => {
      const w = Math.max(320, Math.round(svg.clientWidth)), h = Math.max(60, Math.round(svg.clientHeight));
      const vb = (svg.getAttribute('viewBox') || '').split(' ');
      if (vb.length === 4 && Math.abs(+vb[2] - w) < 40 && Math.abs(+vb[3] - h) < 30) return;
      const lvl = svg.classList.contains('forest__layer--1') ? 1 : svg.classList.contains('forest__layer--2') ? 2 : 3;
      const conf = { 3: [0.5, 1.0, 0.45], 2: [0.45, 0.98, 0.5], 1: [0.4, 0.95, 0.62] }[lvl];
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      svg.innerHTML = `<path d="${forestPath(w, h, +svg.dataset.seed || 11, conf[0], conf[1], conf[2])}"/>`;
    });
  }

  /* ------------------------------------------------------------------
     Programação + ramo que cresce com o scroll
     ------------------------------------------------------------------ */
  const vine = { len: 0, H: 0, leaves: [], nodes: [], p: -1 };
  function buildTimeline() {
    const list = $('#timelineList');
    const items = Array.isArray(C.programacao) ? C.programacao : [];
    if (!items.length) { $('#programacao').hidden = true; return; }
    list.innerHTML = items.map((it) => `
      <li class="tl-item">
        <span class="tl-time"><svg class="ic" aria-hidden="true"><use href="#i-clock"/></svg>${esc(it.hora)}</span>
        <h3 class="tl-title">${esc(it.titulo)}</h3>
        ${it.texto ? `<p class="tl-text">${esc(it.texto)}</p>` : ''}
      </li>`).join('');
  }
  function buildVine() {
    const tl = $('#timeline'), svg = $('#vine'), stem = $('#vineStem'), g = $('#vineLeaves'), list = $('#timelineList');
    if (!tl || $('#programacao').hidden || contentHidden()) return;
    const W = tl.clientWidth, H = tl.clientHeight;
    if (!W || !H) return;
    const mobile = window.matchMedia('(max-width: 720px)').matches;
    const cx = mobile ? 26 : W / 2, amp = mobile ? 8 : 15, wl = mobile ? 210 : 280;
    const xAt = (y) => cx + Math.sin((y / wl) * Math.PI * 2) * amp;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    let d = `M${xAt(0).toFixed(1)} 0`;
    for (let y = 10; y <= H; y += 10) d += `L${xAt(y).toFixed(1)} ${y}`;
    stem.setAttribute('d', d);
    const len = stem.getTotalLength();
    stem.style.strokeDasharray = `${len} ${len}`;
    stem.style.strokeDashoffset = len;
    vine.len = len; vine.H = H; vine.p = -1;

    // nós (um por item)
    g.innerHTML = '';
    vine.nodes = [];
    const nodeYs = [];
    $$('.tl-item', list).forEach((li) => {
      const y = list.offsetTop + li.offsetTop + 17;
      nodeYs.push(y);
      const x = xAt(y);
      const glow = document.createElementNS(NS, 'circle');
      glow.setAttribute('cx', x.toFixed(1)); glow.setAttribute('cy', y.toFixed(1)); glow.setAttribute('r', '11');
      glow.setAttribute('class', 'vine-glow');
      const node = document.createElementNS(NS, 'circle');
      node.setAttribute('cx', x.toFixed(1)); node.setAttribute('cy', y.toFixed(1)); node.setAttribute('r', '5');
      node.setAttribute('class', 'vine-node');
      g.appendChild(glow); g.appendChild(node);
      vine.nodes.push({ at: y / H, node, glow, item: li });
    });

    // folhas alternadas ao longo do caule
    vine.leaves = [];
    const r = rng(7);
    let i = 0;
    for (let y = 26; y < H - 12; y += 30 + r() * 18, i++) {
      if (nodeYs.some((ny) => Math.abs(ny - y) < 20)) continue;
      const x = xAt(y), x2 = xAt(y + 3);
      const tang = (Math.atan2(3, x2 - x) * 180) / Math.PI;
      const side = i % 2 ? 1 : -1;
      const ang = tang + side * (42 + r() * 22);
      const L = 15 + r() * 9, Wd = 3.6 + r() * 1.6;
      const wrap = document.createElementNS(NS, 'g');
      wrap.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang.toFixed(1)})`);
      const leaf = document.createElementNS(NS, 'path');
      leaf.setAttribute('d', leafPath(L, Wd));
      leaf.setAttribute('class', 'vine-leaf');
      wrap.appendChild(leaf);
      g.insertBefore(wrap, g.firstChild);
      vine.leaves.push({ at: y / H, el: leaf });
    }
    updateVine(window.innerHeight);
  }
  function updateVine(vh) {
    if (!vine.len) return;
    const r = $('#timeline').getBoundingClientRect();
    if (r.bottom < -200 || r.top > vh + 200) return;
    const p = clamp((vh * 0.7 - r.top) / r.height, 0, 1);
    if (Math.abs(p - vine.p) < 0.001) return;
    vine.p = p;
    $('#vineStem').style.strokeDashoffset = (vine.len * (1 - p)).toFixed(1);
    for (const l of vine.leaves) l.el.classList.toggle('is-on', l.at <= p);
    for (const n of vine.nodes) {
      const on = n.at <= p + 0.015;
      n.node.classList.toggle('is-on', on);
      n.glow.classList.toggle('is-on', on);
      if (on) n.item.classList.add('is-on');
    }
  }

  /* ------------------------------------------------------------------
     Locais
     ------------------------------------------------------------------ */
  const mapsUrl = (p) => p.mapaUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([p.nome, p.endereco].filter(Boolean).join(', '))}`;
  const wazeUrl = (p) => `https://waze.com/ul?q=${encodeURIComponent(p.endereco || p.nome || '')}&navigate=yes`;
  function placeCard(kind, icon, p, time) {
    const q = encodeURIComponent([p.nome, p.endereco].filter(Boolean).join(', '));
    return `
      <article class="card place reveal" data-tilt>
        <div class="card__frame" aria-hidden="true"></div>
        <svg class="card__icon" aria-hidden="true"><use href="#${icon}"/></svg>
        <p class="eyebrow eyebrow--ink place__kind">${esc(kind)}</p>
        <h3 class="place__name">${esc(p.nome)}</h3>
        ${time ? `<p class="place__time"><svg class="ic" aria-hidden="true"><use href="#i-clock"/></svg>${esc(time)}</p>` : ''}
        <p class="place__addr">${esc(p.endereco)}</p>
        <div class="place__actions">
          <a class="btn btn--ink btn--sm" href="${esc(mapsUrl(p))}" target="_blank" rel="noopener"><svg class="ic" aria-hidden="true"><use href="#i-pin"/></svg> Maps</a>
          <a class="btn btn--line btn--sm" href="${esc(wazeUrl(p))}" target="_blank" rel="noopener"><svg class="ic" aria-hidden="true"><use href="#i-nav"/></svg> Waze</a>
          <button class="btn btn--line btn--sm" type="button" data-map="${q}" data-name="${esc(p.nome)}" aria-expanded="false"><svg class="ic" aria-hidden="true"><use href="#i-map"/></svg> <span>Ver mapa</span></button>
        </div>
        <div class="place__map"></div>
      </article>`;
  }
  function buildPlaces() {
    const box = $('#places');
    const same = !REC || (REC.endereco && CER.endereco && REC.endereco.trim() === CER.endereco.trim() && REC.nome === CER.nome);
    if (same) {
      const t = REC && REC.horario ? `${CER.horario || hora} · festa ${REC.horario}` : CER.horario || hora;
      box.innerHTML = placeCard(REC ? 'Cerimônia & Recepção' : 'Cerimônia', 'i-rings', CER, t);
    } else {
      box.innerHTML = placeCard('Cerimônia', 'i-rings', CER, CER.horario || hora) + placeCard('Recepção', 'i-glass', REC, REC.horario);
    }
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-map]');
      if (!b) return;
      const card = b.closest('.place'), wrap = $('.place__map', card), label = $('span', b);
      const open = b.getAttribute('aria-expanded') === 'true';
      if (!open) {
        if (!wrap.firstChild) {
          wrap.innerHTML = `<iframe title="Mapa: ${b.dataset.name}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=${b.dataset.map}&z=15&output=embed"></iframe>`;
        }
        wrap.style.height = '304px';
        b.setAttribute('aria-expanded', 'true');
        label.textContent = 'Fechar mapa';
      } else {
        wrap.style.height = '0px';
        b.setAttribute('aria-expanded', 'false');
        label.textContent = 'Ver mapa';
      }
    });
  }

  /* ------------------------------------------------------------------
     Traje
     ------------------------------------------------------------------ */
  function buildSwatches() {
    const ul = $('#swatches');
    const cores = (C.traje && C.traje.cores) || [];
    if (!cores.length) { ul.hidden = true; return; }
    ul.innerHTML = cores.map((c, i) => `
      <li class="swatch">
        <button class="swatch__dot" type="button" style="--c:${esc(c.hex)};--i:${i}" aria-label="${esc(c.nome)}"></button>
        <span class="swatch__name">${esc(c.nome)}</span>
      </li>`).join('');
    ul.addEventListener('click', (e) => {
      const b = e.target.closest('.swatch__dot');
      if (!b) return;
      Som.sfx('pop');
      b.animate([{ transform: 'scale(1)' }, { transform: 'scale(.82)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 520, easing: 'ease-out' });
      toast(b.getAttribute('aria-label'));
    });
  }

  /* ------------------------------------------------------------------
     Presentes: PIX (BR Code + QR) e lista externa
     ------------------------------------------------------------------ */
  function crc16(str) {
    let crc = 0xffff;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }
  const emv = (id, v) => id + String(v.length).padStart(2, '0') + v;
  const ascii = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '').trim();
  function pixPayload(p) {
    const key = String(p.chave || '').trim();
    let s = emv('00', '01') + emv('26', emv('00', 'br.gov.bcb.pix') + emv('01', key)) + emv('52', '0000') + emv('53', '986');
    s += emv('58', 'BR') + emv('59', ascii(p.nome).toUpperCase().slice(0, 25) || 'NOIVOS') + emv('60', ascii(p.cidade).toUpperCase().slice(0, 15) || 'BRASIL');
    s += emv('62', emv('05', '***')) + '6304';
    return s + crc16(s);
  }
  function qrSVG(text) {
    const qr = window.qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount(), q = 1, S = n + q * 2;
    const finder = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c) && !finder(r, c)) d += `M${c + q} ${r + q}h1v1h-1z`;
    }
    let f = '';
    for (const [r, c] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
      f += `<rect x="${c + q + 0.5}" y="${r + q + 0.5}" width="6" height="6" rx="1.7" fill="none" stroke="currentColor" stroke-width="1"/>`;
      f += `<rect x="${c + q + 2}" y="${r + q + 2}" width="3" height="3" rx=".9" fill="currentColor"/>`;
    }
    return `<svg viewBox="0 0 ${S} ${S}" shape-rendering="crispEdges" style="color:#1b293d"><path d="${d}" fill="currentColor"/><g shape-rendering="geometricPrecision">${f}</g></svg>`;
  }
  function buildGifts() {
    const P = (C.presentes && C.presentes.pix) || {};
    const L = (C.presentes && C.presentes.lista) || {};
    const pix = $('#pix'), warn = $('#pixWarn');
    const warns = [];
    if (P.chave) {
      const payload = pixPayload(P);
      pix.hidden = false;
      $('#pixKey').textContent = P.chave;
      $('#pixName').textContent = P.nome ? `Em nome de ${P.nome}` : '';
      // o gerador de QR (20 KB) só é baixado quando a seção de presentes se aproxima
      const drawQR = () => {
        try { $('#pixQr').innerHTML = qrSVG(payload); } catch (e) { $('#pixQr').hidden = true; }
      };
      const loadQR = () => {
        if (window.qrcode) { drawQR(); return; }
        const sc = document.createElement('script');
        sc.src = 'assets/js/vendor/qrcode.min.js';
        sc.onload = drawQR;
        sc.onerror = () => { $('#pixQr').hidden = true; };
        document.head.appendChild(sc);
      };
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((ents) => {
          if (ents.some((en) => en.isIntersecting)) { io.disconnect(); loadQR(); }
        }, { rootMargin: '900px 0px' });
        io.observe($('#presentes'));
      } else loadQR();
      pix.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-copy]');
        if (!b) return;
        const ok = await copy(b.dataset.copy === 'key' ? P.chave : payload);
        Som.sfx('pop');
        toast(ok ? (b.dataset.copy === 'key' ? 'Chave PIX copiada ♥' : 'Código PIX copiado — cole no app do banco') : 'Não consegui copiar :(');
        if (ok) {
          const s = $('span', b), old = s.textContent;
          s.textContent = 'Copiado!';
          setTimeout(() => { s.textContent = old; }, 1800);
        }
      });
      if (/exemplo/i.test(P.chave)) warns.push('a chave PIX é de exemplo — troque em <code>presentes.pix.chave</code>');
    }
    if (L.url) {
      const a = $('#giftList');
      a.hidden = false; a.href = L.url;
      if (L.texto) $('span', a).textContent = L.texto;
    }
    if (!P.chave && !L.url) warns.push('preencha a chave PIX ou o link da lista em <code>presentes</code>');
    if (warns.length) {
      warn.hidden = false;
      warn.innerHTML = `⚙️ Para os noivos: ${warns.join('; ')} (arquivo <code>assets/js/config.js</code>). Este aviso some quando estiver configurado.`;
    }
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
      ta.remove();
      return ok;
    }
  }

  /* ------------------------------------------------------------------
     Agenda (Google + .ics)
     ------------------------------------------------------------------ */
  function buildCalendar() {
    const end = new Date(DATE.getTime() + (C.duracaoHoras || 8) * 36e5);
    const stamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const title = `Casamento ${N1.nome} & ${N2.nome}`;
    const loc = [CER.nome, CER.endereco].filter(Boolean).join(' — ');
    const site = location.href.split('#')[0].split('?')[0];
    const details = `${TX.convite || ''}\n\nConvite: ${site}`;
    $('#calGoogle').href = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
      + `&text=${encodeURIComponent(title)}&dates=${stamp(DATE)}/${stamp(end)}`
      + `&details=${encodeURIComponent(details)}&location=${encodeURIComponent(loc)}&ctz=${encodeURIComponent(TZ)}`;
    const e = (s) => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Convite//Casamento//PT-BR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${stamp(DATE)}-${ascii(N1.nome + N2.nome).toLowerCase().replace(/\W/g, '')}@convite`,
      `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(DATE)}`, `DTEND:${stamp(end)}`,
      `SUMMARY:${e(title)}`, `LOCATION:${e(loc)}`, `DESCRIPTION:${e(details)}`,
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${e('Amanhã: ' + title)}`, 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    const a = $('#calIcs');
    a.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
    a.setAttribute('download', `casamento-${ascii(N1.nome).toLowerCase()}-${ascii(N2.nome).toLowerCase()}.ics`);

    const btn = $('#calBtn'), menu = $('#calMenu');
    const close = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const open = menu.hidden;
      menu.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      if (open) Som.sfx('pop');
    });
    menu.addEventListener('click', () => setTimeout(close, 50));
    document.addEventListener('click', (ev) => { if (!ev.target.closest('.cal')) close(); });
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') close(); });
  }

  /* ------------------------------------------------------------------
     Contagem regressiva com dígitos que rolam
     ------------------------------------------------------------------ */
  function initCountdown() {
    const box = $('#countdown');
    const nums = { d: $('[data-u="d"]', box), h: $('[data-u="h"]', box), m: $('[data-u="m"]', box), s: $('[data-u="s"]', box) };
    const heart = $('.heartbeat');
    const cur = {};
    // só anima quando a contagem está na tela (fora dela, apenas troca o texto)
    let visible = !('IntersectionObserver' in window);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((ents) => { visible = ents[0].isIntersecting; }, { rootMargin: '100px 0px' }).observe(box);
    }
    function setNum(k, val, min) {
      const str = String(val).padStart(min, '0');
      const el = nums[k];
      if (cur[k] === str) return;
      if (cur[k] === undefined || el.children.length !== str.length) {
        el.innerHTML = '';
        for (const ch of str) {
          const d = document.createElement('span');
          d.className = 'digit'; d.dataset.v = ch;
          d.innerHTML = `<span>${ch}</span>`;
          el.appendChild(d);
        }
        el.setAttribute('aria-label', str);
        cur[k] = str;
        return;
      }
      [...str].forEach((ch, i) => {
        const d = el.children[i];
        if (d.dataset.v === ch) return;
        d.dataset.v = ch;
        const old = d.lastElementChild, nu = document.createElement('span');
        nu.textContent = ch;
        d.appendChild(nu);
        if (reduce || !visible || !nu.animate) { old.remove(); return; }
        // só transform/opacity: roda inteiro na GPU
        old.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-75%)', opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' }).onfinish = () => old.remove();
        nu.animate([{ transform: 'translateY(75%)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)' });
      });
      el.setAttribute('aria-label', str);
      cur[k] = str;
    }
    function update() {
      const diff = DATE.getTime() - Date.now();
      if (diff <= 0) {
        const since = Math.floor(-diff / 864e5);
        const title = $('#contagemTitulo'), after = $('#countdownAfter');
        if (since < 1) {
          title.textContent = 'É hoje!';
          box.hidden = true;
          after.innerHTML = 'o grande dia chegou <svg class="ic heartbeat" aria-hidden="true"><use href="#i-heart"/></svg>';
        } else {
          title.textContent = 'Casados há';
          ['h', 'm', 's'].forEach((k) => { nums[k].parentElement.hidden = true; });
          setNum('d', since, 1);
          after.textContent = since === 1 ? 'dia — e contando' : 'dias — e contando';
          nums.d.nextElementSibling.textContent = since === 1 ? 'dia' : 'dias';
        }
        return false;
      }
      setNum('d', Math.floor(diff / 864e5), 2);
      setNum('h', Math.floor((diff % 864e5) / 36e5), 2);
      setNum('m', Math.floor((diff % 36e5) / 6e4), 2);
      setNum('s', Math.floor((diff % 6e4) / 1e3), 2);
      if (heart && !reduce && visible) { heart.classList.remove('beat'); void heart.getBoundingClientRect(); heart.classList.add('beat'); }
      return true;
    }
    const loop = () => { if (update()) setTimeout(loop, 1000 - (Date.now() % 1000) + 8); };
    loop();
  }

  /* ------------------------------------------------------------------
     RSVP
     ------------------------------------------------------------------ */
  const RSVP_KEY = 'convite:rsvp';
  function initRSVP() {
    const R = C.rsvp || {};
    const form = $('#rsvpForm'), done = $('#rsvpDone'), nome = $('#fNome'), out = $('#fPessoas');
    const people = $('#peopleField'), diet = $('#dietField'), warn = $('#rsvpWarn'), submit = $('#rsvpSubmit');
    const btnTxt = $('#rsvpSubmitTxt');
    let pessoas = 1;
    const digits = String(R.whatsapp || '').replace(/\D/g, '');
    const mode = R.googleScriptUrl ? 'sheet' : digits ? 'whatsapp' : 'none';
    btnTxt.textContent = mode === 'whatsapp' ? 'Confirmar pelo WhatsApp' : 'Enviar confirmação';
    if (mode !== 'whatsapp') $('use', submit).setAttribute('href', '#i-envelope');
    if (mode === 'none') {
      warn.hidden = false;
      warn.innerHTML = '⚙️ Para os noivos: configure <code>rsvp.whatsapp</code> (ou <code>rsvp.googleScriptUrl</code>) em <code>assets/js/config.js</code> para receber as confirmações. Este aviso some quando estiver configurado.';
    }
    if (para) nome.value = para;
    if (maxPessoas <= 1) people.hidden = true;

    const syncStepper = () => {
      out.textContent = pessoas;
      out.value = pessoas;
      $$('.stepper__btn', people).forEach((b) => {
        const st = +b.dataset.step;
        b.disabled = (st < 0 && pessoas <= 1) || (st > 0 && pessoas >= maxPessoas);
      });
    };
    syncStepper();
    people.addEventListener('click', (e) => {
      const b = e.target.closest('[data-step]');
      if (!b) return;
      pessoas = clamp(pessoas + +b.dataset.step, 1, maxPessoas);
      syncStepper();
      Som.sfx('pop');
      out.animate && out.animate([{ transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' });
    });
    const syncPresence = () => {
      const sim = form.presenca.value === 'sim';
      people.classList.toggle('is-hidden', !sim);
      diet.classList.toggle('is-hidden', !sim);
    };
    form.addEventListener('change', (e) => { if (e.target.name === 'presenca') { syncPresence(); Som.sfx('pop'); } });
    nome.addEventListener('input', () => { nome.closest('.field').classList.remove('has-error'); $('#errNome').hidden = true; });

    function showDone(data, via) {
      const sim = data.presenca === 'sim';
      $('#rsvpDoneTitle').textContent = sim ? 'Obrigado!' : 'Que pena…';
      let t = sim
        ? `${data.nome}, sua presença está confirmada${data.pessoas > 1 ? ` para ${data.pessoas} pessoas` : ''}. Mal podemos esperar para celebrar com você!`
        : `Obrigado por avisar, ${data.nome}. Vamos sentir sua falta — você estará no nosso coração.`;
      if (via === 'whatsapp') t += ' Abrimos o WhatsApp com a sua mensagem: é só tocar em enviar.';
      $('#rsvpDoneText').textContent = t;
      form.hidden = true;
      done.hidden = false;
      $$('.card--rsvp > .card__text').forEach((p) => { p.hidden = true; });
    }

    try {
      const saved = JSON.parse(localStorage.getItem(RSVP_KEY) || 'null');
      if (saved && saved.nome) {
        nome.value = saved.nome;
        form.presenca.value = saved.presenca;
        pessoas = clamp(saved.pessoas || 1, 1, maxPessoas);
        $('#fRestricao').value = saved.restricao || '';
        $('#fMsg').value = saved.mensagem || '';
        syncStepper(); syncPresence();
        showDone(saved);
      }
    } catch (e) { /* ok */ }

    $('#rsvpEdit').addEventListener('click', () => {
      done.hidden = true;
      form.hidden = false;
      $$('.card--rsvp > .card__text').forEach((p) => { p.hidden = !prazo; });
      nome.focus();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        nome: nome.value.replace(/\s+/g, ' ').trim(),
        presenca: form.presenca.value,
        pessoas: form.presenca.value === 'sim' ? pessoas : 0,
        restricao: $('#fRestricao').value.trim(),
        mensagem: $('#fMsg').value.trim(),
        convite: para,
        enviadoEm: new Date().toISOString()
      };
      if (!data.nome) {
        nome.closest('.field').classList.add('has-error');
        $('#errNome').hidden = false;
        nome.focus();
        return;
      }
      const sim = data.presenca === 'sim';
      let msg = `💌 *Confirmação de presença*\nCasamento de ${N1.nome} & ${N2.nome}\n\n*Nome:* ${data.nome}\n`;
      msg += sim ? `*Presença:* confirmada ✅\n*Pessoas:* ${data.pessoas}\n` : '*Presença:* não poderei ir 😢\n';
      if (sim && data.restricao) msg += `*Restrição alimentar:* ${data.restricao}\n`;
      if (data.mensagem) msg += `\n*Recado:* ${data.mensagem}\n`;
      if (para && para !== data.nome) msg += `\n_(convite: ${para})_`;
      const wa = digits ? `https://wa.me/${digits}?text=${encodeURIComponent(msg)}` : '';

      let via = mode;
      if (mode === 'whatsapp') {
        // precisa ser síncrono ao clique (bloqueador de pop-up)
        const w = window.open(wa, '_blank', 'noopener');
        if (!w) location.href = wa;
      } else if (mode === 'sheet') {
        submit.disabled = true;
        btnTxt.textContent = 'Enviando…';
        try {
          await fetch(R.googleScriptUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(data) });
        } catch (err) {
          if (wa) { via = 'whatsapp'; location.href = wa; }
          else { toast('Não foi possível enviar agora. Tente novamente.'); submit.disabled = false; btnTxt.textContent = 'Enviar confirmação'; return; }
        }
        submit.disabled = false;
        btnTxt.textContent = 'Enviar confirmação';
      }
      try { localStorage.setItem(RSVP_KEY, JSON.stringify(data)); } catch (err) { /* ok */ }
      window.dispatchEvent(new Event('rsvp:done'));
      showDone(data, via);
      done.focus({ preventScroll: true });
      $('#rsvpCard').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      Som.sfx('chime');
      if (sim) {
        await wait(T(650));
        const r = $('.rsvp-done__check').getBoundingClientRect();
        FX.petals(r.left + r.width / 2, r.top + r.height / 2, 46);
      }
    });
  }

  /* ------------------------------------------------------------------
     Pequenas interações
     ------------------------------------------------------------------ */
  let toastT = 0;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('is-on'), 2400);
  }

  function initTilt() {
    if (!fine || reduce) return;
    $$('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.classList.add('is-tilting');
        card.style.setProperty('--rx', ((0.5 - py) * 5).toFixed(2) + 'deg');
        card.style.setProperty('--ry', ((px - 0.5) * 6).toFixed(2) + 'deg');
        card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', () => {
        card.classList.remove('is-tilting');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
        card.style.setProperty('--my', '-10%');
      });
    });
  }

  function initReveal() {
    const els = $$('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    els.forEach((el) => io.observe(el));
  }

  function initPill() {
    const pill = $('#rsvpPill');
    const confirmed = () => { try { return !!localStorage.getItem(RSVP_KEY); } catch (e) { return false; } };
    const vis = new Set();
    const sync = () => html.classList.toggle('no-pill', vis.size > 0 || confirmed());
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((ents) => {
        ents.forEach((en) => { if (en.isIntersecting) vis.add(en.target); else vis.delete(en.target); });
        sync();
      }, { threshold: 0.05 });
      [$('#rsvp'), $('#rodape'), $('#inicio')].forEach((el) => el && io.observe(el));
    }
    pill.addEventListener('click', (e) => {
      e.preventDefault();
      $('#rsvp').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
    window.addEventListener('rsvp:done', sync);
    sync();
  }

  // pausa a névoa fora da tela (menos trabalho de GPU e bateria no celular)
  function initFog() {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => en.target.classList.toggle('is-off', !en.isIntersecting));
    }, { rootMargin: '150px 0px' });
    $$('.site .fog').forEach((f) => io.observe(f));
  }

  function initHeroHearts() {
    const hero = $('#inicio');
    let lastT = 0, lx = 0, ly = 0;
    const pop = (e) => {
      if (e.target.closest('a,button')) return;
      const r = hero.getBoundingClientRect();
      FX.heart(hero, e.clientX - r.left, e.clientY - r.top);
      Som.sfx('heart');
    };
    hero.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'mouse') return;
      const now = performance.now();
      if (now - lastT < 320 && Math.hypot(e.clientX - lx, e.clientY - ly) < 40) { pop(e); lastT = 0; }
      else { lastT = now; lx = e.clientX; ly = e.clientY; }
    });
    hero.addEventListener('dblclick', pop);
    hero.addEventListener('mousedown', (e) => { if (e.detail > 1) e.preventDefault(); });
  }

  function initMenu() {
    const btn = $('#menuBtn'), menu = $('#menu'), use = $('use', btn);
    let open = false;
    const set = (v, focusBack = true) => {
      open = v;
      btn.setAttribute('aria-expanded', String(v));
      btn.setAttribute('aria-label', v ? 'Fechar menu' : 'Abrir menu');
      use.setAttribute('href', v ? '#i-close' : '#i-menu');
      if (v) {
        menu.hidden = false;
        html.classList.add('is-locked');
        requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
        setTimeout(() => { const a = $('a', menu); a && a.focus({ preventScroll: true }); }, 60);
      } else {
        menu.classList.remove('is-open');
        html.classList.remove('is-locked');
        setTimeout(() => { if (!open) menu.hidden = true; }, 500);
        if (focusBack) btn.focus({ preventScroll: true });
      }
    };
    btn.addEventListener('click', () => { set(!open); Som.sfx('pop'); });
    menu.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) { if (e.target === menu) set(false); return; }
      e.preventDefault();
      set(false, false);
      const target = $(a.getAttribute('href'));
      setTimeout(() => target && target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }), 30);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) set(false); });
  }

  function initSound() {
    const btn = $('#soundBtn');
    if (!Som.supported) return;
    btn.hidden = false;
    const sync = (on) => {
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', on ? 'Pausar música' : 'Tocar música');
    };
    sync(false);
    Som.onChange(sync);
    btn.addEventListener('click', () => { Som.unlock(); Som.toggle(); });
  }

  /* ------------------------------------------------------------------
     Scroll: parallax, ramo, floresta, estado do topo
     ------------------------------------------------------------------ */
  function initScroll() {
    const heroMedia = $('#heroMedia');
    let ticking = false;
    const update = () => {
      ticking = false;
      if (contentHidden()) return;
      const y = window.scrollY || 0, vh = window.innerHeight;
      html.classList.toggle('is-scrolled', y > vh * 0.55);
      if (!reduce && y < vh * 1.3) heroMedia.style.transform = `translate3d(0, ${(y * 0.3).toFixed(1)}px, 0)`;
      updateVine(vh);
      if (!reduce) {
        for (const f of forests) {
          const r = f.el.getBoundingClientRect();
          if (r.bottom < -60 || r.top > vh + 60) continue;
          const p = clamp((vh - r.top) / (vh + r.height), 0, 1);
          for (const L of f.layers) L.el.style.transform = `translate3d(0, ${((1 - p) * 110 * L.depth).toFixed(1)}px, 0)`;
        }
      }
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    let rt = 0, lastW = window.innerWidth;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        if (Math.abs(window.innerWidth - lastW) > 20) { lastW = window.innerWidth; rebuildForests(); }
        buildVine();
        update();
      }, 180);
    }, { passive: true });
    update();
  }

  // medidas dependem de layout: refaz ramo e floresta (com leve debounce)
  let relayoutT = 0;
  function relayout() {
    clearTimeout(relayoutT);
    relayoutT = setTimeout(() => { buildVine(); rebuildForests(); }, 60);
  }

  /* ------------------------------------------------------------------
     INTRO — a experiência do envelope
     ------------------------------------------------------------------ */
  const Intro = (() => {
    const root = $('#intro'), bg = $('#introBg'), stage = $('#introStage');
    const env = $('#env'), pos = $('.env__pos'), tilt = $('#envTilt');
    const front = $('#envFront'), back = $('#envBack'), seal = $('#seal'), letter = $('#letter');
    const hint = $('#introHint'), skipBtn = $('#introSkip'), main = $('#conteudo');
    const touch = window.matchMedia('(pointer: coarse)').matches;
    let state = 'arriving', busy = false, done = false, hintT = 0, nudgeT = 0, kb = false;

    const setState = (s) => { state = s; root.dataset.state = s; };
    function setHint(text, delay = 0) {
      clearTimeout(hintT);
      hint.classList.remove('is-on');
      if (!text) return;
      hintT = setTimeout(() => { hint.firstElementChild.textContent = text; hint.classList.add('is-on'); }, delay);
    }
    function armNudge() {
      clearTimeout(nudgeT);
      if (reduce) return;
      nudgeT = setTimeout(() => {
        if (state !== 'front' && state !== 'back' && state !== 'letter') return;
        pos.classList.remove('is-nudge');
        void pos.offsetWidth;
        pos.classList.add('is-nudge');
        armNudge();
      }, 5200);
    }
    function orbit() {
      const r = env.getBoundingClientRect();
      FX.attract(r.left + r.width / 2, r.top + r.height / 2, Math.hypot(r.width, r.height) / 2 + 26);
    }
    window.addEventListener('resize', () => { if (state === 'front' || state === 'back') orbit(); }, { passive: true });

    function lock(v) {
      html.classList.toggle('is-locked', v);
      html.classList.toggle('is-intro', v);
      if ('inert' in main) main.inert = v;
      else main.setAttribute('aria-hidden', String(v));
    }

    function preload(urls, ms) {
      return Promise.race([
        Promise.all(urls.map((u) => new Promise((res) => {
          const i = new Image();
          i.onload = i.onerror = () => (i.decode ? i.decode().catch(() => {}).then(res) : res());
          i.src = u;
        }))),
        wait(ms)
      ]);
    }

    async function start() {
      lock(true);
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      window.scrollTo(0, 0);
      env.style.animationPlayState = 'paused';
      await preload(['assets/img/papel-relevo.webp', 'assets/img/selo.webp', 'assets/img/selo-postal.webp', 'assets/img/casal-blur.webp'], 2500);
      env.style.animationPlayState = 'running';
      Som.sfx('whoosh');
      await wait(T(1500));
      setState('front');
      setHint(touch ? 'Toque no envelope' : 'Clique no envelope', 200);
      armNudge();
      orbit();
      // enquanto a pessoa abre o envelope, a foto da capa e o forro já vão sendo baixados
      ['assets/img/casal.webp', 'assets/img/forro-tile.webp', 'assets/img/papel-relevo-tile.webp'].forEach((u) => { const i = new Image(); i.decoding = 'async'; i.src = u; });
    }

    async function flip() {
      if (state !== 'front' || busy) return;
      busy = true;
      Som.unlock();
      if ((C.musica || {}).tocarAoAbrir !== false && Som.wantsSound()) Som.startMusic();
      Som.sfx('paper');
      setHint('');
      setState('flipping');
      front.setAttribute('tabindex', '-1');
      await wait(T(1250));
      setState('back');
      busy = false;
      setHint(touch ? 'Toque no selo para abrir' : 'Clique no selo para abrir', 150);
      if (kb) seal.focus({ preventScroll: true });
      armNudge();
    }

    async function open() {
      if (state !== 'back' || busy) return;
      busy = true;
      Som.unlock();
      clearTimeout(nudgeT);
      setHint('');
      seal.classList.add('is-shaking');
      Som.sfx('crack');
      await wait(T(330));
      seal.classList.remove('is-shaking');
      seal.classList.add('is-cracked');
      back.classList.add('is-broken');
      if (navigator.vibrate) { try { navigator.vibrate(18); } catch (e) { /* ok */ } }
      const bb = back.getBoundingClientRect(), sb = seal.getBoundingClientRect();
      FX.crumbs(back, sb.left - bb.left + sb.width / 2, sb.top - bb.top + sb.height / 2, 12);
      FX.attract(null);
      FX.scatter(sb.left + sb.width / 2, sb.top + sb.height / 2, 190);
      await wait(T(280));
      setState('opening');
      Som.sfx('flap');
      await wait(T(1050));
      setState('letter');
      Som.sfx('slide');
      await wait(T(1100));
      busy = false;
      letter.setAttribute('tabindex', '0');
      letter.setAttribute('role', 'button');
      letter.setAttribute('aria-label', 'Retirar o convite do envelope');
      if (kb) letter.focus({ preventScroll: true });
      setHint(touch ? 'Puxe o convite para cima' : 'Puxe (ou clique) o convite', 100);
      armNudge();
    }

    async function takeOut() {
      if (state !== 'letter' || busy) return;
      busy = true;
      clearTimeout(nudgeT);
      setHint('');
      Som.sfx('slide');
      letter.classList.remove('is-dragging');
      letter.style.transition = `transform ${T(560)}ms cubic-bezier(.3,.7,.3,1)`;
      letter.style.transform = 'translate3d(0, -108%, 0)';
      await wait(T(540));
      setState('out');
      letter.style.zIndex = '20';
      back.classList.add('is-dropping');
      tilt.style.setProperty('--tx', '0deg');
      tilt.style.setProperty('--ty', '0deg');
      await wait(30);
      const r = letter.getBoundingClientRect();
      const vw = window.innerWidth, vh = window.innerHeight;
      const dx = vw / 2 - (r.left + r.width / 2), dy = vh / 2 - (r.top + r.height / 2);
      const s = Math.min((vw * 0.9) / r.width, (vh * 0.7) / r.height, 1.75);
      const base = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) translate3d(0, -108%, 0)`;
      letter.style.transition = `transform ${T(1150)}ms cubic-bezier(.65,0,.35,1)`;
      letter.style.transform = `${base} scale(${s.toFixed(3)}) rotate(-1deg)`;
      await wait(T(1150 + 1300));
      Som.sfx('whoosh');
      letter.style.transition = `transform ${T(1250)}ms cubic-bezier(.6,0,.85,.35), opacity ${T(900)}ms ease ${T(300)}ms`;
      letter.style.transform = `${base} scale(${(s * 6).toFixed(3)}) rotate(0deg)`;
      letter.style.opacity = '0';
      bg.classList.add('is-gone');
      html.classList.add('is-revealed');
      await wait(T(1300));
      finish();
    }

    function finish() {
      if (done) return;
      done = true;
      FX.attract(null);
      requestAnimationFrame(relayout);
      clearTimeout(nudgeT); clearTimeout(hintT);
      root.classList.add('is-gone');
      bg.classList.add('is-gone');
      html.classList.add('is-revealed');
      lock(false);
      html.classList.add('is-smooth');
      try { sessionStorage.setItem('convite:aberto', '1'); } catch (e) { /* ok */ }
      setTimeout(() => { bg.style.display = 'none'; }, 1700);
      const h = $('#heroNames');
      if (h && !location.hash) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    }

    function skip(instant) {
      if (done) return;
      if (instant) {
        root.classList.add('is-gone');
        bg.style.display = 'none';
        finish();
        return;
      }
      root.style.transition = 'opacity .6s ease';
      root.style.opacity = '0';
      bg.classList.add('is-gone');
      html.classList.add('is-revealed');
      setTimeout(finish, T(600));
    }

    // ---- interação ----
    function onActivate(e) {
      if (done) return;
      if (state === 'front') flip();
      else if (state === 'back') open();
      else if (state === 'letter' && e && e.type === 'keydown') takeOut();
    }
    // Toque em qualquer ponto do palco avança (mais tolerante e imune a
    // falhas de hit-testing em elementos 3D, comuns no Safari).
    stage.addEventListener('click', (e) => {
      if (done || busy || e.target.closest('#seal')) return;
      if (state === 'front' || state === 'back') { kb = false; onActivate(); }
    });
    seal.addEventListener('click', (e) => { e.stopPropagation(); kb = e.detail === 0; open(); });
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || (state === 'letter' && e.key === 'ArrowUp')) {
        if (e.target === seal) return; // botão nativo já trata
        if (e.target.closest && e.target.closest('#introSkip')) return;
        e.preventDefault();
        kb = true;
        onActivate(e);
      }
    });
    skipBtn.addEventListener('click', () => skip(false));
    $('.skip-link').addEventListener('click', () => skip(true));

    // puxar a carta (arrastar para cima) — ou tocar
    let drag = null;
    stage.addEventListener('pointerdown', (e) => {
      if (state !== 'letter' || busy) return;
      drag = { y0: e.clientY, x0: e.clientX, t0: performance.now(), dy: 0, id: e.pointerId };
      letter.classList.add('is-dragging');
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
    });
    stage.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dy = drag.y0 - e.clientY;
      drag.dy = dy;
      const off = dy > 0 ? dy * 0.9 : dy * 0.25;
      letter.style.transform = `translate3d(0, calc(-40% - ${off.toFixed(1)}px), 0) rotate(${clamp((e.clientX - drag.x0) * 0.02, -3, 3).toFixed(2)}deg)`;
    });
    const endDrag = (e) => {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      const d = drag;
      drag = null;
      letter.classList.remove('is-dragging');
      const dt = performance.now() - d.t0;
      const isTap = Math.abs(d.dy) < 8 && dt < 500;
      if (d.dy > 46 || isTap || (d.dy > 20 && d.dy / dt > 0.4)) takeOut();
      else letter.style.transform = '';
    };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);

    // inclinação 3D + brilho seguindo o cursor
    const sheens = $$('.paper-sheen', root);
    let tiltRaf = 0, pend = null;
    function applyTilt() {
      tiltRaf = 0;
      if (!pend || state === 'out' || done) return;
      const { px, py } = pend;
      tilt.style.setProperty('--tx', ((0.5 - py) * 9).toFixed(2) + 'deg');
      tilt.style.setProperty('--ty', ((px - 0.5) * 13).toFixed(2) + 'deg');
      for (const s of sheens) {
        s.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        s.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      }
    }
    if (!reduce) {
      window.addEventListener('pointermove', (e) => {
        if (done || drag) return;
        const r = env.getBoundingClientRect();
        pend = { px: clamp((e.clientX - r.left) / r.width, -0.4, 1.4), py: clamp((e.clientY - r.top) / r.height, -0.4, 1.4) };
        if (!tiltRaf) tiltRaf = requestAnimationFrame(applyTilt);
      }, { passive: true });
      // giroscópio (Android; iOS exige permissão, então ignoramos)
      if (touch && 'DeviceOrientationEvent' in window && typeof DeviceOrientationEvent.requestPermission !== 'function') {
        window.addEventListener('deviceorientation', (e) => {
          if (done || drag || e.gamma == null) return;
          pend = { px: 0.5 + clamp(e.gamma, -30, 30) / 70, py: 0.5 + clamp((e.beta || 45) - 45, -30, 30) / 70 };
          if (!tiltRaf) tiltRaf = requestAnimationFrame(applyTilt);
        }, { passive: true });
      }
    }

    return { start, skip, isDone: () => done };
  })();

  /* ------------------------------------------------------------------
     Inicialização
     ------------------------------------------------------------------ */
  function boot() {
    window.__conviteOk = true;
    bindAll();
    buildSprigs();
    buildTimeline();
    buildPlaces();
    buildSwatches();
    buildGifts();
    buildCalendar();
    buildForests();
    initRSVP();
    initSound();
    initMenu();
    initTilt();
    initReveal();
    initHeroHearts();
    initFog();
    initPill();
    initCountdown();
    FX.init($('#fireflies'));

    const hash = location.hash && location.hash.length > 1 ? location.hash : '';
    let target = null;
    try { target = hash ? $(hash) : null; } catch (e) { target = null; }
    if (target && target.id !== 'inicio') {
      Intro.skip(true);
      requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
    } else {
      Intro.start();
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(relayout);
      if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', relayout);
    }
    window.addEventListener('load', relayout);
    relayout();
    initScroll();

    $('#replayBtn').addEventListener('click', () => {
      try { sessionStorage.removeItem('convite:aberto'); } catch (e) { /* ok */ }
      location.href = location.pathname + location.search;
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
