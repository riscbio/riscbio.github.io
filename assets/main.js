(() => {
  document.getElementById('yr').textContent = new Date().getFullYear();
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

  function frame(t) {
    ctx.clearRect(0, 0, w, h);
    const link = 140 * dpr;
    for (let i = 0; i < cells.length; i++) {
      const a = cells[i];
      if (!reduce) {
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
      if (!reduce) { a.ax += a.sx; a.ay += a.sy; a.hr += a.hs; }
      drawCube(a, a.r * 2.4 * pulse);
      // square halo, slowly spinning and breathing
      const hsz = a.r * 6 * halo;
      ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.hr);
      ctx.globalAlpha = .28; ctx.strokeStyle = a.c; ctx.lineWidth = dpr;
      ctx.strokeRect(-hsz, -hsz, hsz * 2, hsz * 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    if (!reduce) requestAnimationFrame(frame);
  }

  addEventListener('resize', resize);
  addEventListener('pointermove', (e) => { mouse.x = e.clientX * dpr; mouse.y = e.clientY * dpr; });
  addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
  resize();
  requestAnimationFrame(frame);
})();
