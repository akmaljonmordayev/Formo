import { useEffect, useRef } from 'react';

const GAP = 36; // nuqtalar orasidagi masofa
const REACH = 170; // kursor ta'sir radiusi

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return [242, 163, 58];
  const n = parseInt(m[1], 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

// Mato to'qimasini eslatuvchi nuqtalar to'ri: kursor yaqinida yorishadi va
// itariladi, bosilganda halqa to'lqini tarqaladi. Rang tanlangan forma rangiga mos.
export default function Background({ color, reducedMotion }) {
  const canvasRef = useRef(null);
  const colorRef = useRef(hexToRgb(color));

  useEffect(() => {
    colorRef.current = hexToRgb(color);
  }, [color]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined; // canvas yo'q muhit (masalan, test) — fon shunchaki chizilmaydi
    let width = 0;
    let height = 0;
    let raf = 0;
    const pointer = { x: -9999, y: -9999, active: false };
    const ripples = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now) => {
      ctx.clearRect(0, 0, width, height);
      const [r, g, b] = colorRef.current;
      const cols = Math.ceil(width / GAP) + 1;
      const rows = Math.ceil(height / GAP) + 1;
      const offX = (width - (cols - 1) * GAP) / 2;
      const offY = (height - (rows - 1) * GAP) / 2;

      for (let i = 0; i < cols; i += 1) {
        for (let j = 0; j < rows; j += 1) {
          const bx = offX + i * GAP;
          const by = offY + j * GAP;
          let x = bx;
          let y = by;
          let glow = 0;

          if (pointer.active) {
            const dx = bx - pointer.x;
            const dy = by - pointer.y;
            const dist = Math.hypot(dx, dy);
            if (dist < REACH) {
              glow = 1 - dist / REACH;
              const push = glow * glow * 14;
              x += (dx / (dist || 1)) * push;
              y += (dy / (dist || 1)) * push;
            }
          }

          for (const rp of ripples) {
            const dist = Math.hypot(bx - rp.x, by - rp.y);
            const edge = Math.abs(dist - rp.radius);
            if (edge < 60) {
              const k = (1 - edge / 60) * rp.life;
              glow = Math.max(glow, k);
              const ang = Math.atan2(by - rp.y, bx - rp.x);
              x += Math.cos(ang) * k * 10;
              y += Math.sin(ang) * k * 10;
            }
          }

          const radius = 1.1 + glow * 2.4;
          const alpha = 0.16 + glow * 0.75;
          ctx.fillStyle = glow > 0.02 ? `rgba(${r}, ${g}, ${b}, ${alpha})` : `rgba(243, 245, 249, ${alpha})`;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (let n = ripples.length - 1; n >= 0; n -= 1) {
        const rp = ripples[n];
        rp.radius += 7;
        rp.life -= 0.016;
        if (rp.life <= 0) ripples.splice(n, 1);
      }
      if (now !== undefined) raf = requestAnimationFrame(draw);
    };

    const onMove = (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
    };
    const onDown = (e) => {
      if (reducedMotion) return;
      ripples.push({ x: e.clientX, y: e.clientY, radius: 0, life: 1 });
    };

    resize();
    window.addEventListener('resize', resize);
    if (reducedMotion) {
      draw();
    } else {
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerdown', onDown);
      document.addEventListener('pointerleave', onLeave);
      raf = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, [reducedMotion]);

  return <canvas ref={canvasRef} className="login__bg" aria-hidden="true" />;
}
