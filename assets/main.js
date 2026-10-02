(() => {
  const yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Scroll reveal
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  // Wordmark letters pop on hover
  document.querySelectorAll('.wordmark .l').forEach((l) => {
    l.addEventListener('mouseenter', () => {
      l.classList.remove('pop'); void l.offsetWidth; l.classList.add('pop');
    });
    l.addEventListener('animationend', (ev) => { if (ev.animationName === 'pop') l.classList.remove('pop'); });
  });

  // Cell field background
  const canvas = document.getElementById('cells');
  const ctx = canvas.getContext('2d');
  const colors = ['#ff3b6b', '#ff8a1f', '#ffd23f', '#3ee07a', '#3bd1ff', '#6b6bff', '#c35cff'];
  let w, h, dpr, cells = [];
  const mouse = { x: -9999, y: -9999 };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width = innerWidth * dpr;
    h = canvas.height = innerHeight * dpr;
    const count = Math.round(Math.min(90, (innerWidth * innerHeight) / 16000));
    cells = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - .5) * .9 * dpr, vy: (Math.random() - .5) * .9 * dpr,
      r: (Math.random() * 3 + 1.5) * dpr,
      c: colors[i % colors.length],
      p: Math.random() * Math.PI * 2,
      hr: Math.random() * Math.PI, hs: (Math.random() - .5) * .02,
      ax: Math.random() * Math.PI * 2, ay: Math.random() * Math.PI * 2,
      sx: (Math.random() - .5) * .012, sy: (Math.random() - .5) * .012 + .004,
    }));
  }


  // 3D cube: 8 vertices, 6 faces, rotated and projected, shaded by face normal
  const V = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
  const F = [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[4,5,1,0],[3,2,6,7]];
  const light = [-.4, -.6, -.7];
  function drawCube(a, s) {
    const cx = Math.cos(a.ax), sx = Math.sin(a.ax), cy = Math.cos(a.ay), sy = Math.sin(a.ay);
    const P = V.map(([x, y, z]) => {
      const y1 = y * cx - z * sx, z1 = y * sx + z * cx;
      const x2 = x * cy + z1 * sy, z2 = -x * sy + z1 * cy;
      return [x2, y1, z2];
    });
    const faces = [];
    for (const f of F) {
      const [p0, p1, p2] = [P[f[0]], P[f[1]], P[f[2]]];
      const u = [p1[0]-p0[0], p1[1]-p0[1], p1[2]-p0[2]], v = [p2[0]-p0[0], p2[1]-p0[1], p2[2]-p0[2]];
      const n = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
      if (n[2] >= 0) continue; // back face (camera looks down +z)
      const len = Math.hypot(n[0], n[1], n[2]) || 1;
      const lit = Math.max(0, (n[0]*light[0] + n[1]*light[1] + n[2]*light[2]) / len);
      faces.push({ f, lit, z: (P[f[0]][2] + P[f[2]][2]) / 2 });
    }
    faces.sort((m, n) => n.z - m.z);
    ctx.fillStyle = a.c; ctx.strokeStyle = a.c; ctx.lineJoin = 'round'; ctx.lineWidth = dpr;
    ctx.shadowColor = a.c; ctx.shadowBlur = 12 * dpr;
    for (const { f, lit } of faces) {
      ctx.beginPath();
      f.forEach((i, k) => { const X = a.x + P[i][0] * s, Y = a.y + P[i][1] * s; k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.closePath();
      ctx.globalAlpha = .25 + lit * .6; ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = .9; ctx.stroke();
    }
  }

  // ---- Easter egg: microfluidic channel -------------------------------
  // Idle 5 min (or click the "." in RISC.BIO) -> cubes line up into two
  // walls with a gap in the middle, and cell-like particles flow through.
  const IDLE_MS = 5 * 60 * 1000, CLICK_MS = 45 * 1000;
  let lastRelease = 0;
  let mode = 'free';           // 'free' | 'idle' | 'click'
  let m = 0;                   // 0 = free field, 1 = channel fully formed
  let modeStart = 0, lastActive = performance.now();
  let flow = [];               // flowing cell particles

  function channelGeom() {
    const cy = h * 0.5;
    const gap = Math.max(90, Math.min(innerHeight * 0.18, 170)) * dpr;
    return { cy, gap };
  }
  function assignSlots() {
    const sorted = [...cells].sort((p, q) => p.y - q.y);
    const half = Math.ceil(sorted.length / 2);
    [sorted.slice(0, half), sorted.slice(half)].forEach((row, ri) => {
      row.sort((p, q) => p.x - q.x).forEach((c, k) => { c.row = ri; c.slot = k; c.rowLen = row.length; });
    });
  }
  function enterChannel(kind) {
    if (reduce || mode !== 'free') return;
    mode = kind; modeStart = performance.now(); assignSlots();
    document.body.classList.add('channel-on');
  }
  function releaseChannel() {
    if (mode === 'free') return;
    mode = 'free'; lastRelease = performance.now();
    document.body.classList.remove('channel-on');
    for (const c of cells) { c.vx = (Math.random() - .5) * 2 * dpr; c.vy = (Math.random() - .5) * 2 * dpr; }
  }
  function spawnCell(g) {
    const r = (Math.random() * 3 + 3.5) * dpr;
    const lane = (g.gap / 2 - 22 * dpr - r);
    flow.push({
      x: -20 * dpr, y: g.cy + (Math.random() * 2 - 1) * lane, r,
      v: (Math.random() * 1.4 + 1.4) * dpr, ph: Math.random() * Math.PI * 2,
      c: colors[(Math.random() * colors.length) | 0], rot: Math.random() * Math.PI,
    });
  }
  function drawFlow(t, g) {
    const alive = [];
    for (const f of flow) {
      f.x += f.v;
      f.y += Math.sin(t / 380 + f.ph) * .25 * dpr;
      const lim = g.gap / 2 - 20 * dpr - f.r;
      f.y = Math.max(g.cy - lim, Math.min(g.cy + lim, f.y));
      f.rot += .01;
      if (f.x > w + 30 * dpr) continue;
      alive.push(f);
      const a = Math.min(1, m * 1.2);
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot);
      // membrane (slightly squashed, stretched by speed) + nucleus
      ctx.shadowColor = f.c; ctx.shadowBlur = 10 * dpr;
      ctx.globalAlpha = .18 * a; ctx.fillStyle = f.c;
      ctx.beginPath(); ctx.ellipse(0, 0, f.r * 1.25, f.r * .95, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = .8 * a; ctx.strokeStyle = f.c; ctx.lineWidth = 1.2 * dpr; ctx.stroke();
      ctx.globalAlpha = .9 * a;
      ctx.beginPath(); ctx.arc(f.r * .25, -f.r * .1, f.r * .35, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    flow = alive;
  }
  const lerpAngle = (a, b, k) => {
    let d = ((b - a) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    return a + d * k;
  };

  function frame(t) {
    const now = performance.now();
    if (mode === 'free' && now - lastActive > IDLE_MS) enterChannel('idle');
    if (mode === 'click' && now - modeStart > CLICK_MS) releaseChannel();
    m += ((mode === 'free' ? 0 : 1) - m) * .03;
    const g = channelGeom();
    ctx.clearRect(0, 0, w, h);
    const link = 140 * dpr;
    for (let i = 0; i < cells.length; i++) {
      const a = cells[i];
      if (!reduce && mode !== 'free') {
        const spacing = w / a.rowLen;
        const tx = (a.slot + .5) * spacing;
        const ty = g.cy + (a.row ? 1 : -1) * g.gap / 2;
        a.x += (tx - a.x) * .045; a.y += (ty - a.y) * .045;
        a.ax = lerpAngle(a.ax, -.55, .04); a.ay = lerpAngle(a.ay, .75, .04); a.hr = lerpAngle(a.hr, 0, .04);
      } else if (!reduce) {
        // gentle repel from cursor
        const mx = a.x - mouse.x, my = a.y - mouse.y, md = Math.hypot(mx, my);
        if (md < 160 * dpr && md > 0) { a.vx += (mx / md) * .05; a.vy += (my / md) * .05; }
        a.vx *= .995; a.vy *= .995;
        a.vx += (Math.random() - .5) * .04 * dpr; a.vy += (Math.random() - .5) * .04 * dpr;
        // keep everything drifting: gentle speed floor and cap
        const sp = Math.hypot(a.vx, a.vy), min = .25 * dpr, max = 1.2 * dpr;
        if (sp < min) { const k = min / (sp || 1); a.vx = (a.vx || .1) * k; a.vy = (a.vy || .1) * k; }
        else if (sp > max) { a.vx *= max / sp; a.vy *= max / sp; }
        a.x += a.vx; a.y += a.vy;
        if (a.x < 0 || a.x > w) a.vx *= -1;
        if (a.y < 0 || a.y > h) a.vy *= -1;
      }
      for (let j = i + 1; j < cells.length; j++) {
        const b = cells[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < link) {
          const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
          g.addColorStop(0, a.c); g.addColorStop(1, b.c);
          ctx.strokeStyle = g; ctx.globalAlpha = (1 - d / link) * .35;
          ctx.lineWidth = dpr; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    for (const a of cells) {
      const pulse = reduce ? 1 : 1 + Math.sin(t / 900 + a.p) * .12;
      const halo = reduce ? 1 : 1 + Math.sin(t / 900 + a.p) * .25;
      if (!reduce && mode === 'free') { a.ax += a.sx; a.ay += a.sy; a.hr += a.hs; }
      const rr = a.r + (3.2 * dpr - a.r) * m;
      drawCube(a, rr * 2.4 * pulse);
      // square halo, slowly spinning and breathing
      const hsz = rr * (6 - 2.6 * m) * halo;
      ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.hr);
      ctx.globalAlpha = .28; ctx.strokeStyle = a.c; ctx.lineWidth = dpr;
      ctx.strokeRect(-hsz, -hsz, hsz * 2, hsz * 2);
      ctx.restore();
    }
    if (mode !== 'free' && m > .85 && flow.length < 60 && Math.random() < .12) spawnCell(g);
    if (flow.length) drawFlow(t, g);
    ctx.globalAlpha = 1;
    if (!reduce) requestAnimationFrame(frame);
  }

  addEventListener('resize', () => { resize(); if (mode !== 'free') assignSlots(); });
  // idle channel: any activity releases it. clicked channel: a click, key, or scroll releases it.
  const activity = (e) => {
    lastActive = performance.now();
    if (mode === 'idle' || (mode === 'click' && e.type !== 'pointermove')) releaseChannel();
  };
  ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) =>
    addEventListener(ev, activity, { passive: true }));
  const dot = document.querySelector('.wordmark .rdot');
  if (dot) dot.addEventListener('click', (e) => {
    e.stopPropagation();
    if (mode === 'free' && performance.now() - lastRelease > 400) enterChannel('click');
  });
  addEventListener('pointermove', (e) => { mouse.x = e.clientX * dpr; mouse.y = e.clientY * dpr; });
  addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
  resize();
  if (location.hash === '#channel') setTimeout(() => enterChannel('click'), 800);
  requestAnimationFrame(frame);
})();
