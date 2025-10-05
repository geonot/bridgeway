(() => {
  // Utility: clamp and toHex
  const clamp = (v, lo = 0, hi = 255) => Math.max(lo, Math.min(hi, v));
  const toHex = (n) => clamp(Math.round(n)).toString(16).padStart(2, '0');
  const rgbToHex = (r, g, b) => `#${toHex(r)}${toHex(g)}${toHex(b)}`;

  // Set current year
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Mobile nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    // Close mobile menu when clicking nav links
    nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }));
  }

  // Color extraction from logo -> set CSS variables
  function extractPaletteFromImage(src, { samples = 4000, k = 5 } = {}) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          const w = (canvas.width = img.naturalWidth);
          const h = (canvas.height = img.naturalHeight);
          if (!ctx || w * h === 0) return resolve(null);
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, w, h).data;

          // Sample a subset of pixels for speed
          const step = Math.max(1, Math.floor((w * h) / samples));
          const points = [];
          for (let i = 0; i < data.length; i += 4 * step) {
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
            if (a < 200) continue; // skip transparent
            // Skip near-white/near-black extremes sparsely
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            if ((max > 245 && min > 230) || (max < 25 && min < 20)) continue;
            points.push([r, g, b]);
          }
          if (points.length === 0) return resolve(null);

          // k-means-ish iterative refinement (few iterations for speed)
          const centroids = [];
          for (let i = 0; i < Math.min(k, points.length); i++) {
            centroids.push(points[Math.floor((i + 1) * points.length / (k + 1))]);
          }
          for (let iter = 0; iter < 6; iter++) {
            const sums = Array.from({ length: centroids.length }, () => [0, 0, 0, 0]);
            for (const p of points) {
              let bi = 0, bd = Infinity;
              for (let i = 0; i < centroids.length; i++) {
                const c = centroids[i];
                const d = (p[0]-c[0])**2 + (p[1]-c[1])**2 + (p[2]-c[2])**2;
                if (d < bd) { bd = d; bi = i; }
              }
              const s = sums[bi]; s[0]+=p[0]; s[1]+=p[1]; s[2]+=p[2]; s[3]++;
            }
            for (let i = 0; i < centroids.length; i++) {
              const s = sums[i];
              if (s[3] > 0) centroids[i] = [s[0]/s[3], s[1]/s[3], s[2]/s[3]];
            }
          }

          // Rank centroids by frequency (approximate via assignment one more pass)
          const counts = new Array(centroids.length).fill(0);
          for (const p of points) {
            let bi = 0, bd = Infinity;
            for (let i = 0; i < centroids.length; i++) {
              const c = centroids[i];
              const d = (p[0]-c[0])**2 + (p[1]-c[1])**2 + (p[2]-c[2])**2;
              if (d < bd) { bd = d; bi = i; }
            }
            counts[bi]++;
          }
          const ranked = centroids.map((c, i) => ({ c, n: counts[i] }))
            .sort((a, b) => b.n - a.n)
            .map(o => o.c.map(v => Math.round(v)));

          resolve(ranked);
        } catch (err) {
          console.error(err);
          resolve(null);
        }
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  function setPalette(colors) {
    if (!colors || colors.length === 0) return;
    const [c1=[45,74,106], c2=[106,160,200], c3=[196,154,108]] = colors;
    const root = document.documentElement;
    const hex1 = rgbToHex(...c1), hex2 = rgbToHex(...c2), hex3 = rgbToHex(...c3);
    root.style.setProperty('--brand', hex1);
    root.style.setProperty('--brand-2', hex2);
    root.style.setProperty('--accent', hex3);
    // Derive text/muted heuristically based on perceived luminance
    const lum = (r,g,b)=> (0.2126*r + 0.7152*g + 0.0722*b)/255;
    const t = lum(...c1) > 0.6 ? '#1d232a' : '#101418';
    const m = lum(...c1) > 0.6 ? '#5a6876' : '#8b96a3';
    document.documentElement.style.setProperty('--text', t);
    document.documentElement.style.setProperty('--muted', m);
  }

  // Header scroll behavior
  let lastScroll = 0;
  const headerEl = document.querySelector('.site-header');
  
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
      headerEl?.classList.add('scrolled');
    } else {
      headerEl?.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
  }, { passive: true });

  // Intersection Observer for scroll reveals
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);

  // Apply reveal to sections and cards
  document.querySelectorAll('.section, .card').forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    revealObserver.observe(el);
  });

  // Kick off palette extraction after idle to not block rendering
  const logoEl = document.querySelector('link[rel="icon"], .brand img, img[alt*="logo" i]');
  // Use Flask static path for logo extraction
  const logoSrc = (logoEl && (logoEl.href || logoEl.currentSrc || logoEl.src)) || '/static/images/bridge-nobg.png';
  if (logoSrc) {
    const run = () => extractPaletteFromImage(logoSrc).then(setPalette).catch(()=>{});
    if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 1500 });
    else setTimeout(run, 300);
  }
})();
