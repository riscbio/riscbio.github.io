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
      vx: (Math.random() - .5) * .25 * dpr, vy: (Math.random() - .5) * .25 * dpr,
      r: (Math.random() * 3 + 1.5) * dpr,
      c: colors[i % colors.length],
      p: Math.random() * Math.PI * 2,
    }));
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
        a.vx *= .99; a.vy *= .99;
        a.vx += (Math.random() - .5) * .01; a.vy += (Math.random() - .5) * .01;
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
      const pulse = reduce ? 1 : 1 + Math.sin(t / 900 + a.p) * .25;
      ctx.globalAlpha = .9; ctx.fillStyle = a.c;
      ctx.shadowColor = a.c; ctx.shadowBlur = 14 * dpr;
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = .25; ctx.strokeStyle = a.c; ctx.lineWidth = dpr;
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r * pulse * 3.2, 0, Math.PI * 2); ctx.stroke();
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
