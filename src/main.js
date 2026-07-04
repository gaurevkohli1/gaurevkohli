import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

/* ============================================================
   Lenis smooth scroll — driven by the GSAP ticker
   ============================================================ */
const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

/* ============================================================
   Kinetic type splitting
   ============================================================ */
function splitLetters(el) {
  const text = el.textContent;
  el.textContent = '';
  const letters = [];
  for (const ch of text) {
    const span = document.createElement('span');
    span.className = 'k-letter';
    span.textContent = ch === ' ' ? ' ' : ch;
    el.appendChild(span);
    letters.push(span);
  }
  return letters;
}

function splitWords(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  return words.map((w, i) => {
    const span = document.createElement('span');
    span.className = 'k-word';
    span.textContent = w;
    el.appendChild(span);
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    return span;
  });
}

/* ============================================================
   Hero orbit — canvas frame sequence, scroll-scrubbed
   ============================================================ */
const canvas = document.getElementById('orbitCanvas');
const ctx = canvas.getContext('2d');
const DPR = Math.min(window.devicePixelRatio || 1, 2);

const frames = [];      // ImageBitmap[]
let frameCount = 0;
const playhead = { frame: 0 };
let lastDrawn = -1;

function sizeCanvas() {
  canvas.width = Math.round(canvas.clientWidth * DPR);
  canvas.height = Math.round(canvas.clientHeight * DPR);
  lastDrawn = -1;
  render(true);
}

function render(force = false) {
  const idx = Math.max(0, Math.min(frameCount - 1, Math.round(playhead.frame)));
  if (!force && idx === lastDrawn) return;
  const img = frames[idx];
  if (!img) return;
  lastDrawn = idx;
  const cw = canvas.width, ch = canvas.height;
  const scale = Math.max(cw / img.width, ch / img.height);
  const dw = img.width * scale, dh = img.height * scale;
  ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
}

/* Fallback frames (procedural) so the site runs before real media lands */
async function makeFallbackFrames(n = 120, w = 1600, h = 900) {
  const off = new OffscreenCanvas(w, h);
  const c = off.getContext('2d');
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const g = c.createRadialGradient(w / 2, h * 0.44, 60, w / 2, h / 2, w * 0.65);
    g.addColorStop(0, '#101711');
    g.addColorStop(1, '#070907');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.save();
    c.translate(w / 2, h * 0.52);
    c.rotate(t * Math.PI * 2);
    c.strokeStyle = 'rgba(209,254,23,0.75)';
    c.lineWidth = 3;
    c.beginPath();
    c.ellipse(0, 0, 300, 96, 0, 0.25, Math.PI * 1.65);
    c.stroke();
    c.fillStyle = '#D1FE17';
    c.beginPath();
    c.arc(300 * Math.cos(0.25), 96 * Math.sin(0.25), 7, 0, Math.PI * 2);
    c.fill();
    c.restore();
    out.push(await createImageBitmap(off));
  }
  return out;
}

async function loadFrames(onProgress) {
  // phones and low-memory devices get the lighter 960px frame set
  const small = matchMedia('(max-width: 820px)').matches
    || (navigator.deviceMemory && navigator.deviceMemory <= 4);
  const dir = small ? '/media/frames-sm' : '/media/frames';
  try {
    const res = await fetch(`${dir}/manifest.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error('no manifest');
    const m = await res.json(); // { count, pad, prefix, ext }
    frameCount = m.count;
    frames.length = frameCount;
    let loaded = 0;
    const CONCURRENCY = 10;
    let next = 0;
    async function worker() {
      while (next < frameCount) {
        const i = next++;
        const name = `${m.prefix}${String(i + 1).padStart(m.pad, '0')}.${m.ext}`;
        const r = await fetch(`${dir}/${name}`);
        const blob = await r.blob();
        frames[i] = await createImageBitmap(blob);
        loaded++;
        onProgress(loaded / frameCount);
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  } catch {
    const fb = await makeFallbackFrames();
    frames.push(...fb);
    frameCount = fb.length;
    onProgress(1);
  }
}

/* ============================================================
   Scroll choreography
   ============================================================ */
function buildHero() {
  const heroLines = document.querySelectorAll('.hero__line');
  const letterGroups = [...heroLines].map((l) => splitLetters(l));
  const allLetters = letterGroups.flat();

  // Frame scrub across the whole hero scene
  gsap.to(playhead, {
    frame: () => frameCount - 1,
    ease: 'none',
    onUpdate: render,
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.35,
      invalidateOnRefresh: true,
    },
  });

  // Kinetic title: letters track in over the first stretch of the scrub,
  // then the whole title drifts up and out near the end of the scene.
  gsap.set(allLetters, { yPercent: 108, opacity: 0, rotate: 4 });
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.5,
    },
  });
  tl.to(letterGroups[0], { yPercent: 0, opacity: 1, rotate: 0, stagger: 0.014, duration: 0.09, ease: 'power3.out' }, 0.015)
    .to(letterGroups[1], { yPercent: 0, opacity: 1, rotate: 0, stagger: 0.014, duration: 0.09, ease: 'power3.out' }, 0.055)
    .fromTo('#heroSub', { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.08, ease: 'power2.out' }, 0.13)
    .to('#scrollCue', { opacity: 0, duration: 0.04 }, 0.1)
    .to('.hero__titles', { yPercent: -16, letterSpacing: '0.06em', duration: 0.5, ease: 'none' }, 0.5)
    .to('#heroSub', { opacity: 0, duration: 0.12 }, 0.62)
    .to(allLetters, { opacity: 0, yPercent: -70, stagger: { each: 0.006, from: 'center' }, duration: 0.16, ease: 'power2.in' }, 0.8)
    .to('.hero__meta', { opacity: 0, duration: 0.1 }, 0.8);
}

function buildStats() {
  const vals = document.querySelectorAll('.stat__val');
  gsap.from('.stat', {
    y: 44, opacity: 0, stagger: 0.08, duration: 0.9, ease: 'power3.out',
    scrollTrigger: { trigger: '#stats', start: 'top 78%', once: true },
  });
  vals.forEach((el) => {
    const target = Number(el.dataset.count);
    const obj = { v: 0 };
    gsap.to(obj, {
      v: target,
      duration: 1.6,
      ease: 'power2.out',
      snap: { v: 1 },
      onUpdate: () => { el.textContent = String(Math.round(obj.v)); },
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  });
}

function buildPillars() {
  const pillars = gsap.utils.toArray('.pillar');
  const ticks = gsap.utils.toArray('.pillars__tick');
  const SEG = 1 / pillars.length;

  pillars.forEach((p) => {
    gsap.set(p.querySelectorAll('.pillar__index, .pillar__title, .pillar__copy'), { y: 70, opacity: 0 });
  });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '#pillars',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.5,
      onUpdate: (self) => {
        const active = Math.min(pillars.length - 1, Math.floor(self.progress / SEG));
        ticks.forEach((t, i) => t.classList.toggle('is-active', i === active));
      },
    },
  });

  pillars.forEach((p, i) => {
    const parts = p.querySelectorAll('.pillar__index, .pillar__title, .pillar__copy');
    const at = i * SEG;
    tl.to(p, { opacity: 1, duration: 0.02 }, at + SEG * 0.08)
      .to(parts, { y: 0, opacity: 1, stagger: 0.03, duration: SEG * 0.35, ease: 'power3.out' }, at + SEG * 0.08);
    if (i < pillars.length - 1) {
      tl.to(parts, { y: -60, opacity: 0, stagger: 0.02, duration: SEG * 0.28, ease: 'power2.in' }, at + SEG * 0.72)
        .to(p, { opacity: 0, duration: 0.02 }, at + SEG * 0.98);
    }
  });

  // subtle slow zoom on the builder video while pinned
  gsap.fromTo('#builderVideo', { scale: 1.08 }, {
    scale: 1, ease: 'none',
    scrollTrigger: { trigger: '#pillars', start: 'top top', end: 'bottom bottom', scrub: true },
  });
}

function buildWork() {
  const words = splitWords(document.querySelector('.work__heading'));
  gsap.from(words, {
    yPercent: 120, opacity: 0, rotate: 3, stagger: 0.1, duration: 0.9, ease: 'power3.out',
    scrollTrigger: { trigger: '.work__heading', start: 'top 80%', once: true },
  });
  gsap.utils.toArray('.card').forEach((card, i) => {
    gsap.from(card, {
      y: 90, opacity: 0, duration: 1, ease: 'power3.out', delay: i * 0.05,
      scrollTrigger: { trigger: card, start: 'top 88%', once: true },
    });
  });
}

function buildFinale() {
  const lines = document.querySelectorAll('.finale__line');
  const groups = [...lines].map((l) => splitLetters(l));
  const all = groups.flat();
  gsap.set(all, { yPercent: 115, opacity: 0 });
  gsap.timeline({
    scrollTrigger: { trigger: '#contact', start: 'top 62%', end: 'top 12%', scrub: 0.6 },
  })
    .to(groups[0], { yPercent: 0, opacity: 1, stagger: 0.02, duration: 0.4, ease: 'power3.out' }, 0)
    .to(groups[1], { yPercent: 0, opacity: 1, stagger: 0.02, duration: 0.4, ease: 'power3.out' }, 0.18)
    .to(groups[2], { yPercent: 0, opacity: 1, stagger: 0.02, duration: 0.4, ease: 'power3.out' }, 0.36)
    .from('.contact__field', { y: 34, opacity: 0, stagger: 0.06, duration: 0.35, ease: 'power2.out' }, 0.5)
    .from('.finale__actions', { y: 40, opacity: 0, duration: 0.4, ease: 'power2.out' }, 0.62)
    .from('.footer', { opacity: 0, duration: 0.4 }, 0.75);
}

/* ============================================================
   Contact form — hands the message off to WhatsApp or email
   ============================================================ */
function buildContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  const WHATSAPP = '919659433000';
  const EMAIL = 'gaurevkohli1@gmail.com';

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const via = e.submitter?.dataset.send || 'whatsapp';
    const name = form.name.value.trim();
    const contact = form.contact.value.trim();
    const message = form.message.value.trim();

    let invalid = false;
    [[form.name, name], [form.message, message]].forEach(([el, v]) => {
      el.classList.toggle('is-invalid', !v);
      if (!v && !invalid) { el.focus(); invalid = true; }
    });
    if (invalid) return;

    const lines = [
      `Hi Gaurev, I'm ${name}.`,
      message,
      contact ? `You can reach me back at: ${contact}` : '',
    ].filter(Boolean);

    if (via === 'whatsapp') {
      const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(lines.join('\n\n'))}`;
      window.open(url, '_blank', 'noopener');
    } else {
      const subject = `Project inquiry — ${name}`;
      const url = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n\n'))}`;
      window.location.href = url;
    }
  });

  form.querySelectorAll('.contact__input').forEach((el) => {
    el.addEventListener('input', () => el.classList.remove('is-invalid'));
  });
}

/* Play scene videos only while on screen */
function manageVideos() {
  document.querySelectorAll('video.scene__video').forEach((v) => {
    const io = new IntersectionObserver(
      ([e]) => { e.isIntersecting ? v.play().catch(() => {}) : v.pause(); },
      { threshold: 0.05 }
    );
    io.observe(v);
  });
}

/* ============================================================
   Boot
   ============================================================ */
const loaderEl = document.getElementById('loader');
const pctEl = document.getElementById('loaderPct');
const fillEl = document.getElementById('loaderFill');

async function boot() {
  lenis.stop();
  sizeCanvas();

  await Promise.all([
    document.fonts.ready,
    loadFrames((p) => {
      const pct = Math.round(p * 100);
      pctEl.textContent = String(pct);
      fillEl.style.width = `${pct}%`;
    }),
  ]);

  render(true);
  buildHero();
  buildStats();
  buildPillars();
  buildWork();
  buildFinale();
  buildContactForm();
  manageVideos();
  ScrollTrigger.refresh();

  gsap.timeline()
    .to(loaderEl, { yPercent: -100, duration: 0.9, ease: 'power4.inOut', delay: 0.25 })
    .add(() => {
      loaderEl.style.display = 'none';
      lenis.start();
    });

  window.addEventListener('resize', () => {
    sizeCanvas();
    ScrollTrigger.refresh();
  });
}

boot();
