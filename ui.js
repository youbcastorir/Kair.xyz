/* ═══════════════════════════════════════════
   KAIR SPEED TEST — ui.js
   UI controller: meter, animations, DOM updates
═══════════════════════════════════════════ */

const UI = (() => {

  // ── DOM refs ───────────────────────────────
  const $ = id => document.getElementById(id);

  const els = {
    speedNumber:   $('speedNumber'),
    speedUnit:     $('speedUnit'),
    speedLabel:    $('speedLabel'),
    arcProgress:   $('arcProgress'),
    meterWrapper:  $('meterWrapper'),

    pingValue:     $('pingValue'),
    jitterValue:   $('jitterValue'),
    downloadValue: $('downloadValue'),
    uploadValue:   $('uploadValue'),

    pingBar:       $('pingBar'),
    jitterBar:     $('jitterBar'),
    downloadBar:   $('downloadBar'),
    uploadBar:     $('uploadBar'),

    metricPing:    $('metricPing'),
    metricJitter:  $('metricJitter'),
    metricDownload:$('metricDownload'),
    metricUpload:  $('metricUpload'),

    qualityBadge:  $('qualityBadge'),
    qualityText:   $('qualityText'),

    btnStart:      $('btnStart'),
    btnText:       $('btnText'),
    progressWrap:  $('progressWrap'),
    progressBar:   $('progressBar'),
    progressStage: $('progressStage'),

    historyList:   $('historyList'),
    historyEmpty:  $('historyEmpty'),
    historyStats:  $('historyStats'),
    hstatBestDl:   $('hstatBestDl'),
    hstatAvgDl:    $('hstatAvgDl'),
    hstatBestPing: $('hstatBestPing'),
    hstatTests:    $('hstatTests'),
    btnClear:      $('btnClear'),

    bgCanvas:      $('bg-canvas'),
    themeToggle:   $('themeToggle'),
  };

  // ── Arc math ───────────────────────────────
  // Arc spans 270° (from 135° to 405°). Total arc length ≈ 754px at r=120.
  // Offset calculation: dashoffset = total - (fraction * arc_span)
  // Full arc = 754, offset at 0% = 754, offset at 100% = 754 - (270/360)*754 ≈ 188
  const ARC_TOTAL = 2 * Math.PI * 120; // ≈ 754
  const ARC_SPAN  = (270 / 360) * ARC_TOTAL; // ≈ 565

  const speedToFraction = (mbps) => {
    // Log scale: 0 Mbps → 0, 1 → ~5%, 10 → ~35%, 100 → ~70%, 500 → ~100%
    if (mbps <= 0) return 0;
    const logVal = Math.log10(mbps + 1) / Math.log10(501);
    return Math.min(logVal, 1);
  };

  const setArc = (fraction) => {
    const offset = ARC_TOTAL - fraction * ARC_SPAN;
    els.arcProgress.style.strokeDashoffset = offset;
  };

  // ── Number animation ───────────────────────
  let animFrames = {};

  const animateNumber = (key, el, target, duration = 600, decimals = 1, suffix = '') => {
    if (animFrames[key]) cancelAnimationFrame(animFrames[key]);
    const start = parseFloat(el.dataset.current || '0') || 0;
    const startTime = performance.now();

    const tick = (t) => {
      const elapsed = t - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const value = start + (target - start) * ease;
      el.textContent = decimals === 0 ? Math.round(value) : value.toFixed(decimals);
      el.dataset.current = value;
      if (progress < 1) {
        animFrames[key] = requestAnimationFrame(tick);
      } else {
        el.textContent = decimals === 0 ? Math.round(target) : target.toFixed(decimals);
        el.dataset.current = target;
      }
    };
    animFrames[key] = requestAnimationFrame(tick);
  };

  // ── Meter display ──────────────────────────
  const setMeterSpeed = (mbps, label) => {
    const fraction = speedToFraction(mbps);
    setArc(fraction);
    animateNumber('speed', els.speedNumber, mbps, 400, mbps < 10 ? 2 : 1);
    if (label) els.speedLabel.textContent = label;
  };

  const resetMeter = () => {
    setArc(0);
    els.speedNumber.textContent = '—';
    els.speedNumber.dataset.current = '0';
    els.speedUnit.textContent = 'Mbps';
    els.speedLabel.textContent = 'READY';
    els.speedLabel.style.color = '';
  };

  // ── Metric updates ─────────────────────────
  const setMetric = (name, value, unit) => {
    const map = {
      ping:     { el: els.pingValue,     bar: els.pingBar,     max: 200,  invert: true },
      jitter:   { el: els.jitterValue,   bar: els.jitterBar,   max: 100,  invert: true },
      download: { el: els.downloadValue, bar: els.downloadBar, max: 500,  invert: false },
      upload:   { el: els.uploadValue,   bar: els.uploadBar,   max: 200,  invert: false },
    };
    const m = map[name];
    if (!m) return;

    const decimals = (name === 'ping' || name === 'jitter') ? 1 : 2;
    animateNumber(name, m.el, value, 500, decimals);

    // Bar fill: inverted for latency (lower = better = fuller bar)
    const fraction = Math.min(value / m.max, 1);
    const barPct = m.invert ? (1 - fraction) * 100 : fraction * 100;
    m.bar.style.width = barPct + '%';
  };

  const activateMetric = (name) => {
    ['ping','jitter','download','upload'].forEach(n => {
      const card = $('metric' + n.charAt(0).toUpperCase() + n.slice(1));
      if (card) {
        card.classList.toggle('active', n === name);
        card.classList.remove('complete');
      }
    });
  };

  const completeMetric = (name) => {
    const card = $('metric' + name.charAt(0).toUpperCase() + name.slice(1));
    if (card) {
      card.classList.remove('active');
      card.classList.add('complete');
    }
  };

  // ── Quality badge ──────────────────────────
  const showQuality = (rating, label) => {
    els.qualityBadge.hidden = false;
    els.qualityBadge.dataset.rating = rating;
    els.qualityText.textContent = label;
  };

  const hideQuality = () => {
    els.qualityBadge.hidden = true;
  };

  // ── Button states ──────────────────────────
  const setButtonState = (state) => {
    // state: 'idle' | 'loading' | 'done'
    const btn = els.btnStart;
    btn.disabled = state === 'loading';
    btn.classList.toggle('loading', state === 'loading');

    if (state === 'idle') {
      els.btnText.textContent = 'Start Test';
      els.progressWrap.hidden = true;
    } else if (state === 'loading') {
      els.btnText.textContent = 'Testing…';
      els.progressWrap.hidden = false;
    } else if (state === 'done') {
      els.btnText.textContent = 'Test Again';
      els.progressWrap.hidden = true;
    }
  };

  // ── Progress ───────────────────────────────
  const setProgress = (pct, stageText) => {
    els.progressBar.style.setProperty('--progress', pct + '%');
    els.progressBar.setAttribute('aria-valuenow', Math.round(pct));
    if (stageText) els.progressStage.textContent = stageText;
  };

  // ── Testing state ──────────────────────────
  const setTesting = (active) => {
    els.meterWrapper.classList.toggle('testing', active);
  };

  // ── History rendering ──────────────────────
  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const renderHistory = (entries) => {
    // Clear previous items (keep empty state)
    const items = els.historyList.querySelectorAll('.history-item');
    items.forEach(i => i.remove());

    if (!entries || !entries.length) {
      els.historyEmpty.hidden = false;
      els.historyStats.hidden = true;
      els.btnClear.hidden = true;
      return;
    }

    els.historyEmpty.hidden = true;
    els.historyStats.hidden = false;
    els.btnClear.hidden = false;

    // Stats
    const downloads = entries.map(e => e.download).filter(Boolean);
    const pings = entries.map(e => e.ping).filter(Boolean);
    if (downloads.length) {
      els.hstatBestDl.textContent = Math.max(...downloads).toFixed(1) + ' Mbps';
      els.hstatAvgDl.textContent = (downloads.reduce((a, b) => a + b, 0) / downloads.length).toFixed(1) + ' Mbps';
    }
    if (pings.length) {
      els.hstatBestPing.textContent = Math.min(...pings).toFixed(0) + ' ms';
    }
    els.hstatTests.textContent = entries.length;

    // Items (newest first)
    [...entries].reverse().forEach((entry, i) => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.style.animationDelay = (i * 0.05) + 's';

      const ulText = entry.uploadEstimated
        ? `~${entry.upload} <small style="opacity:0.6">(est.)</small>`
        : entry.upload;

      item.innerHTML = `
        <div class="hi-meta">
          <div class="hi-date">${formatDate(entry.timestamp)}</div>
          <div class="hi-metrics">
            <div class="hi-metric">↓ <strong>${entry.download}</strong> <span>Mbps</span></div>
            <div class="hi-metric">↑ <strong>${ulText}</strong> <span>Mbps</span></div>
            <div class="hi-metric">⬤ <strong>${entry.ping}</strong> <span>ms</span></div>
            <div class="hi-metric">≋ <strong>${entry.jitter}</strong> <span>ms</span></div>
          </div>
        </div>
        <div class="hi-badge" data-rating="${entry.quality?.rating || 'average'}">${entry.quality?.label || 'Average'}</div>
      `;
      els.historyList.appendChild(item);
    });
  };

  // ── Scroll reveal ──────────────────────────
  const initReveal = () => {
    const revealEls = document.querySelectorAll('.how-card, .about-grid, .accuracy-note, .hstat');
    revealEls.forEach(el => el.classList.add('reveal'));

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(el => obs.observe(el));
  };

  // ── Background canvas animation ────────────
  const initCanvas = () => {
    const canvas = els.bgCanvas;
    const ctx = canvas.getContext('2d');
    let W, H, particles = [], raf;

    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };

    const isDark = () => document.body.dataset.theme !== 'light';

    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * W;
        this.y = Math.random() * H;
        this.r = Math.random() * 1.5 + 0.3;
        this.vx = (Math.random() - 0.5) * 0.15;
        this.vy = (Math.random() - 0.5) * 0.15;
        this.life = Math.random();
        this.maxLife = Math.random() * 0.4 + 0.3;
        this.color = Math.random() > 0.5 ? '#00d4ff' : '#00ff88';
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life += 0.002;
        if (this.life > this.maxLife || this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset();
      }
      draw() {
        const alpha = Math.sin((this.life / this.maxLife) * Math.PI) * (isDark() ? 0.4 : 0.2);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = this.color.replace(')', `,${alpha})`).replace('rgb', 'rgba').replace('#00d4ff', `rgba(0,212,255,${alpha})`).replace('#00ff88', `rgba(0,255,136,${alpha})`);
        ctx.fill();
      }
    }

    const init = () => {
      resize();
      particles = Array.from({ length: 80 }, () => new Particle());
    };

    // Draw subtle grid lines
    const drawGrid = () => {
      const alpha = isDark() ? 0.03 : 0.05;
      ctx.strokeStyle = `rgba(0,212,255,${alpha})`;
      ctx.lineWidth = 1;
      const step = 80;
      for (let x = 0; x < W; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
    };

    const loop = () => {
      ctx.clearRect(0, 0, W, H);
      drawGrid();
      particles.forEach(p => { p.update(); p.draw(); });
      raf = requestAnimationFrame(loop);
    };

    init();
    loop();

    window.addEventListener('resize', () => { resize(); });
    return () => cancelAnimationFrame(raf);
  };

  // ── Theme toggle ───────────────────────────
  const initTheme = () => {
    const saved = localStorage.getItem('kair-theme');
    if (saved) document.body.dataset.theme = saved;

    els.themeToggle.addEventListener('click', () => {
      const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
      document.body.dataset.theme = next;
      localStorage.setItem('kair-theme', next);
    });
  };

  // ── Reset UI to idle ───────────────────────
  const resetUI = () => {
    resetMeter();
    ['ping','jitter','download','upload'].forEach(n => {
      const card = $('metric' + n.charAt(0).toUpperCase() + n.slice(1));
      if (card) { card.classList.remove('active', 'complete'); }
    });
    els.pingValue.textContent = '—';
    els.jitterValue.textContent = '—';
    els.downloadValue.textContent = '—';
    els.uploadValue.textContent = '—';
    els.pingBar.style.width = '0%';
    els.jitterBar.style.width = '0%';
    els.downloadBar.style.width = '0%';
    els.uploadBar.style.width = '0%';
    hideQuality();
    setProgress(0, '');
  };

  // ── Init ───────────────────────────────────
  const init = () => {
    initTheme();
    initReveal();
    initCanvas();
  };

  // ── Public API ─────────────────────────────
  return {
    init,
    setMeterSpeed,
    resetMeter,
    resetUI,
    setMetric,
    activateMetric,
    completeMetric,
    showQuality,
    hideQuality,
    setButtonState,
    setProgress,
    setTesting,
    renderHistory,
  };

})();

window.UI = UI;
