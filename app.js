/* ============================================================
   SpeedCheck Pro — app.js
   Speed test simulation engine, gauge, history, analysis
   ============================================================ */

'use strict';

/* ── Constants ── */
const STORAGE_KEY = 'speedcheck_history';
const MAX_HISTORY = 50;

/* ── State ── */
const state = {
  running: false,
  phase: null,        // 'ping' | 'download' | 'upload'
  current: null,
  history: [],
  animFrame: null,
  phaseTimer: null,
};

/* ── DOM Refs ── */
const $  = id => document.getElementById(id);
const el = {
  startBtn:      $('startBtn'),
  startBtnText:  $('startBtnText'),
  speedValue:    $('speedValue'),
  speedUnit:     $('speedUnit'),
  speedLabel:    $('speedLabel'),
  gaugeFill:     $('gaugeFill'),
  gaugeNeedle:   $('gaugeNeedle'),
  gaugeSvg:      document.querySelector('.gauge-svg'),
  miniPing:      $('pingVal'),
  miniJitter:    $('jitterVal'),
  miniDownload:  $('downloadVal'),
  miniUpload:    $('uploadVal'),
  serverInfo:    $('serverInfo'),
  phaseSteps:    document.querySelectorAll('.phase-step'),
  results:       $('results'),
  analysis:      $('analysis'),
  historyEmpty:  $('historyEmpty'),
  historyWrap:   $('historyTableWrap'),
  historyBody:   $('historyBody'),
  chartWrapper:  $('chartWrapper'),
  exportBtn:     $('exportBtn'),
  clearBtn:      $('clearBtn'),
  themeToggle:   $('themeToggle'),
  themeIcon:     $('themeIcon'),
};

/* ── Gauge geometry ── */
// Arc from 30,170 to 270,170 (180° sweep) — radius 120
// Total arc length ≈ Math.PI * 120 = 376.99
const ARC_LENGTH = 376.99;
const MAX_SPEED = 1000; // Mbps scale

function speedToOffset(mbps) {
  const pct = Math.min(mbps / MAX_SPEED, 1);
  // Use sqrt curve for better visual spread at lower speeds
  const visual = Math.pow(pct, 0.6);
  return ARC_LENGTH - (visual * ARC_LENGTH);
}

function speedToNeedleAngle(mbps) {
  const pct = Math.min(mbps / MAX_SPEED, 1);
  const visual = Math.pow(pct, 0.6);
  // Needle goes from -90° (left) to +90° (right)
  return -90 + visual * 180;
}

function setGauge(mbps, color) {
  const offset = speedToOffset(mbps);
  const angle  = speedToNeedleAngle(mbps);
  el.gaugeFill.style.strokeDashoffset = offset;
  if (color) el.gaugeFill.style.stroke = color;
  el.gaugeNeedle.style.transform = `rotate(${angle}deg)`;
  el.gaugeNeedle.style.transformOrigin = '150px 170px';
}

/* ── Inject SVG gradient ── */
function initGaugeSVG() {
  const svg = el.gaugeSvg;
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#00e5a0"/>
      <stop offset="50%" style="stop-color:#00d4ff"/>
      <stop offset="100%" style="stop-color:#0091ff"/>
    </linearGradient>
    <linearGradient id="gaugeUpGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#00e5a0"/>
      <stop offset="100%" style="stop-color:#00a87a"/>
    </linearGradient>
  `;
  svg.insertBefore(defs, svg.firstChild);
  el.gaugeFill.setAttribute('stroke', 'url(#gaugeGradient)');
}

/* ── Tick marks ── */
function initGaugeTicks() {
  const tickContainer = $('gaugeTicks');
  const cx = 150, cy = 170, r = 120;
  const speeds = [0, 50, 100, 200, 300, 500, 750, 1000];
  speeds.forEach(speed => {
    const pct = Math.pow(speed / MAX_SPEED, 0.6);
    const angleDeg = -180 + pct * 180;
    const angleRad = (angleDeg * Math.PI) / 180;
    const x1 = cx + (r - 10) * Math.cos(angleRad);
    const y1 = cy + (r - 10) * Math.sin(angleRad);
    const x2 = cx + (r + 4) * Math.cos(angleRad);
    const y2 = cy + (r + 4) * Math.sin(angleRad);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1); line.setAttribute('y1', y1);
    line.setAttribute('x2', x2); line.setAttribute('y2', y2);
    line.setAttribute('stroke', 'rgba(255,255,255,0.2)');
    line.setAttribute('stroke-width', '1.5');
    tickContainer.appendChild(line);
  });
}

/* ── Speed simulation engine ── */
function simulateSpeed(targetMbps, variance) {
  const jitter = (Math.random() - 0.5) * 2 * variance;
  return Math.max(0.1, targetMbps + jitter);
}

function generateTestProfile() {
  // Realistic distribution of connection speeds
  const profiles = [
    { download: 15,  upload: 5,   ping: 65,  jitter: 8,  label: 'Basic DSL' },
    { download: 50,  upload: 10,  ping: 25,  jitter: 4,  label: 'Cable' },
    { download: 100, upload: 20,  ping: 18,  jitter: 3,  label: 'Fast Cable' },
    { download: 200, upload: 50,  ping: 12,  jitter: 2,  label: 'Fiber Lite' },
    { download: 300, upload: 100, ping: 8,   jitter: 1,  label: 'Fiber' },
    { download: 500, upload: 200, ping: 6,   jitter: 1,  label: 'Fiber Pro' },
    { download: 940, upload: 500, ping: 4,   jitter: 0.5,label: 'Gigabit Fiber' },
  ];
  return profiles[Math.floor(Math.random() * profiles.length)];
}

/* ── Animated counter ── */
function animateCounter(el, from, to, duration, decimals = 1, onDone) {
  const start = performance.now();
  function step(now) {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    const val = from + (to - from) * ease;
    el.textContent = val.toFixed(decimals);
    if (p < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent = to.toFixed(decimals);
      if (onDone) onDone();
    }
  }
  requestAnimationFrame(step);
}

/* ── Phase runner ── */
function runPhase(name, targetMbps, variance, duration, onDone) {
  state.phase = name;
  updatePhaseUI(name, 'active');

  el.speedLabel.textContent = name.toUpperCase();
  if (name !== 'ping') {
    el.speedUnit.textContent = 'Mbps';
    el.gaugeFill.setAttribute('stroke', name === 'download' ? 'url(#gaugeGradient)' : 'url(#gaugeUpGradient)');
  } else {
    el.speedUnit.textContent = 'ms';
    el.gaugeFill.setAttribute('stroke', '#ffd166');
  }

  const totalTicks = Math.floor(duration / 80);
  let tick = 0;

  // Ramp-up profile: slow start → peak → settle
  function getProgressSpeed(t, total) {
    const p = t / total;
    if (p < 0.25) return targetMbps * (p / 0.25) * 0.7 + simulateSpeed(targetMbps * 0.1, variance * 0.3);
    if (p < 0.7)  return simulateSpeed(targetMbps, variance);
    return simulateSpeed(targetMbps * 0.95, variance * 0.5);
  }

  const interval = setInterval(() => {
    if (!state.running) { clearInterval(interval); return; }
    tick++;
    const currentSpeed = getProgressSpeed(tick, totalTicks);
    el.speedValue.textContent = currentSpeed.toFixed(name === 'ping' ? 0 : 1);
    setGauge(name !== 'ping' ? currentSpeed : currentSpeed / 2, null);
    if (tick >= totalTicks) {
      clearInterval(interval);
      updatePhaseUI(name, 'done');
      onDone(simulateSpeed(targetMbps, variance * 0.3));
    }
  }, 80);
}

function updatePhaseUI(phase, status) {
  el.phaseSteps.forEach(step => {
    if (step.dataset.phase === phase) {
      step.classList.remove('active', 'done');
      step.classList.add(status);
    }
  });
}

/* ── Main test runner ── */
async function runSpeedTest() {
  if (state.running) { stopTest(); return; }
  state.running = true;

  // Reset UI
  el.startBtn.classList.add('running');
  el.startBtnText.textContent = 'STOP';
  el.gaugeSvg.classList.add('active');
  el.phaseSteps.forEach(s => s.classList.remove('active', 'done'));
  el.speedValue.textContent = '0';
  el.speedUnit.textContent = 'Mbps';
  el.speedLabel.textContent = '';
  el.serverInfo.textContent = 'Connecting to test server…';
  el.miniPing.textContent = '—';
  el.miniJitter.textContent = '—';
  el.miniDownload.textContent = '—';
  el.miniUpload.textContent = '—';

  const profile = generateTestProfile();
  await sleep(600);
  el.serverInfo.textContent = `Server: ${profile.label} · Measuring latency…`;

  const result = { timestamp: Date.now(), download: 0, upload: 0, ping: 0, jitter: 0 };

  /* Phase 1: Ping */
  await new Promise(resolve => {
    runPhase('ping', profile.ping, profile.ping * 0.15, 2000, finalPing => {
      result.ping = Math.round(finalPing);
      result.jitter = +(profile.jitter + (Math.random() - 0.5) * profile.jitter * 0.4).toFixed(1);
      el.miniPing.textContent = result.ping;
      el.miniJitter.textContent = result.jitter;
      el.serverInfo.textContent = `Ping: ${result.ping}ms · Jitter: ${result.jitter}ms · Starting download…`;
      resolve();
    });
  });
  if (!state.running) return;
  await sleep(400);

  /* Phase 2: Download */
  await new Promise(resolve => {
    runPhase('download', profile.download, profile.download * 0.08, 4500, finalDown => {
      result.download = +finalDown.toFixed(1);
      el.miniDownload.textContent = result.download;
      el.serverInfo.textContent = `↓ ${result.download} Mbps · Starting upload…`;
      resolve();
    });
  });
  if (!state.running) return;
  await sleep(400);

  /* Phase 3: Upload */
  await new Promise(resolve => {
    runPhase('upload', profile.upload, profile.upload * 0.08, 4000, finalUp => {
      result.upload = +finalUp.toFixed(1);
      el.miniUpload.textContent = result.upload;
      el.serverInfo.textContent = `↑ ${result.upload} Mbps · Test complete`;
      resolve();
    });
  });

  if (!state.running) return;
  finishTest(result);
}

function stopTest() {
  state.running = false;
  resetStartBtn();
  el.gaugeSvg.classList.remove('active');
  el.phaseSteps.forEach(s => s.classList.remove('active', 'done'));
  el.speedLabel.textContent = 'Stopped';
  el.serverInfo.textContent = 'Test stopped. Click GO to run again.';
  setGauge(0);
  animateCounter(el.speedValue, parseFloat(el.speedValue.textContent) || 0, 0, 600, 1);
}

function resetStartBtn() {
  el.startBtn.classList.remove('running');
  el.startBtnText.textContent = 'GO';
  el.gaugeSvg.classList.remove('active');
  state.running = false;
  state.phase = null;
}

function finishTest(result) {
  resetStartBtn();
  el.speedLabel.textContent = 'COMPLETE';
  el.speedValue.textContent = result.download.toFixed(1);
  el.speedUnit.textContent = 'Mbps';
  setGauge(result.download, 'url(#gaugeGradient)');

  state.current = result;
  state.history.unshift(result);
  if (state.history.length > MAX_HISTORY) state.history.pop();
  saveHistory();

  showResults(result);
  showAnalysis(result);
  updateHistoryUI();
  updateStatsRow();
}

/* ── Results display ── */
function showResults(r) {
  const sec = document.getElementById('results');
  sec.style.display = '';
  sec.classList.add('section-enter');

  animateCounter($('res-download'), 0, r.download, 900, 1);
  animateCounter($('res-upload'),   0, r.upload,   900, 1);
  animateCounter($('res-ping'),     0, r.ping,     700, 0);
  animateCounter($('res-jitter'),   0, r.jitter,   700, 1);

  setTimeout(() => {
    $('bar-download').style.width = Math.min(r.download / MAX_SPEED * 100 * 3, 100) + '%';
    $('bar-upload').style.width   = Math.min(r.upload   / MAX_SPEED * 100 * 5, 100) + '%';
    $('bar-ping').style.width     = Math.max(0, 100 - (r.ping / 200 * 100)) + '%';
    $('bar-jitter').style.width   = Math.max(0, 100 - (r.jitter / 50 * 100)) + '%';
  }, 200);

  // Quality rating
  const { grade, title, desc, icon } = getQualityRating(r);
  $('qualityIcon').textContent  = icon;
  $('qualityTitle').textContent = title;
  $('qualityDesc').textContent  = desc;
  $('qualityBadge').textContent = grade;
  $('qualityBadge').className   = `quality-badge grade-${grade[0].toLowerCase()}`;
}

function getQualityRating(r) {
  const score = (
    Math.min(r.download / 200, 1) * 40 +
    Math.min(r.upload   / 50,  1) * 20 +
    Math.max(0, 1 - r.ping / 150)  * 25 +
    Math.max(0, 1 - r.jitter / 30) * 15
  );

  if (score >= 85) return { grade: 'A+', title: 'Exceptional Connection',   desc: `${r.download} Mbps down is superb. Ideal for any online activity.`,                       icon: '🚀' };
  if (score >= 70) return { grade: 'A',  title: 'Excellent Connection',     desc: `Fast and stable. Handles 4K streaming, gaming, and video calls easily.`,                 icon: '⚡' };
  if (score >= 55) return { grade: 'B',  title: 'Good Connection',          desc: `Solid performance for most tasks including HD streaming and remote work.`,              icon: '✅' };
  if (score >= 40) return { grade: 'C',  title: 'Average Connection',       desc: `Works for basic browsing and SD video. May struggle with heavy workloads.`,            icon: '📶' };
  if (score >= 25) return { grade: 'D',  title: 'Below Average',            desc: `Noticeable slowdowns likely. Consider upgrading your plan or checking your hardware.`, icon: '⚠️' };
  return               { grade: 'F',  title: 'Poor Connection',          desc: `Very slow speeds detected. Check your router, modem, or contact your ISP.`,            icon: '🔴' };
}

/* ── Analysis cards ── */
const USE_CASES = [
  {
    key: 'gaming',
    emoji: '🎮',
    title: 'Online Gaming',
    check: r => {
      if (r.ping <= 20 && r.jitter <= 2 && r.download >= 25) return 'excellent';
      if (r.ping <= 50 && r.jitter <= 10 && r.download >= 10) return 'good';
      if (r.ping <= 100) return 'fair';
      return 'poor';
    },
    desc: {
      excellent: 'Perfect for competitive gaming. Ultra-low latency.',
      good:      'Smooth gaming experience with minimal lag.',
      fair:      'Playable but may notice occasional lag spikes.',
      poor:      'High ping will cause noticeable lag in games.',
    },
  },
  {
    key: '4k',
    emoji: '📺',
    title: '4K Streaming',
    check: r => {
      if (r.download >= 50)  return 'excellent';
      if (r.download >= 25)  return 'good';
      if (r.download >= 10)  return 'fair';
      return 'poor';
    },
    desc: {
      excellent: 'Flawless 4K/HDR streaming on multiple devices simultaneously.',
      good:      'Smooth 4K streaming. May buffer briefly on slower services.',
      fair:      'HD streaming works well. 4K may buffer at peak hours.',
      poor:      'Limited to SD/720p streaming.',
    },
  },
  {
    key: 'videocall',
    emoji: '📹',
    title: 'Video Calls',
    check: r => {
      if (r.upload >= 10 && r.ping <= 30 && r.jitter <= 5) return 'excellent';
      if (r.upload >= 5  && r.ping <= 60 && r.jitter <= 15) return 'good';
      if (r.upload >= 2)  return 'fair';
      return 'poor';
    },
    desc: {
      excellent: 'Crystal-clear video calls on Zoom, Teams, and Meet.',
      good:      'Good quality video calls with occasional minor drops.',
      fair:      'Calls work but video quality may be reduced.',
      poor:      'Video calls may be choppy. Audio-only recommended.',
    },
  },
  {
    key: 'remotework',
    emoji: '💼',
    title: 'Remote Work',
    check: r => {
      if (r.download >= 100 && r.upload >= 20 && r.ping <= 30) return 'excellent';
      if (r.download >= 50  && r.upload >= 10 && r.ping <= 60) return 'good';
      if (r.download >= 15  && r.upload >= 5)  return 'fair';
      return 'poor';
    },
    desc: {
      excellent: 'Ideal for remote work. Fast collaboration and file transfers.',
      good:      'Comfortable for all standard remote work activities.',
      fair:      'Manageable but large uploads/downloads take time.',
      poor:      'May struggle with cloud-based work tools.',
    },
  },
  {
    key: 'download',
    emoji: '⬇️',
    title: 'Large Downloads',
    check: r => {
      if (r.download >= 200) return 'excellent';
      if (r.download >= 100) return 'good';
      if (r.download >= 25)  return 'fair';
      return 'poor';
    },
    desc: {
      excellent: r => `A 10 GB file downloads in ~${Math.round(10*8*1024/r.download)} seconds.`,
      good:      r => `A 10 GB file downloads in ~${Math.round(10*8*1024/r.download)} seconds.`,
      fair:      r => `A 10 GB file downloads in ~${Math.round(10*8*1024/r.download)} seconds.`,
      poor:      () => 'Large downloads will take a long time.',
    },
  },
  {
    key: 'smart',
    emoji: '🏠',
    title: 'Smart Home / IoT',
    check: r => {
      if (r.download >= 50 && r.upload >= 10) return 'excellent';
      if (r.download >= 25 && r.upload >= 5)  return 'good';
      if (r.download >= 10) return 'fair';
      return 'poor';
    },
    desc: {
      excellent: 'Supports many simultaneous smart devices and security cameras.',
      good:      'Handles typical smart home setups without issues.',
      fair:      'Basic smart devices work fine. Limit concurrent streams.',
      poor:      'Smart devices may experience connectivity issues.',
    },
  },
];

function showAnalysis(r) {
  const sec = document.getElementById('analysis');
  sec.style.display = '';
  sec.classList.add('section-enter');

  const grid = $('analysisGrid');
  grid.innerHTML = '';

  USE_CASES.forEach(uc => {
    const status = uc.check(r);
    const descVal = uc.desc[status];
    const desc = typeof descVal === 'function' ? descVal(r) : descVal;
    const statusLabel = { excellent: 'Excellent', good: 'Good', fair: 'Fair', poor: 'Poor' }[status];
    const card = document.createElement('div');
    card.className = 'analysis-card';
    card.innerHTML = `
      <div class="analysis-emoji" aria-hidden="true">${uc.emoji}</div>
      <div class="analysis-body">
        <div class="analysis-title">${uc.title}</div>
        <span class="analysis-status status-${status}">${statusLabel}</span>
        <div class="analysis-desc">${desc}</div>
      </div>
    `;
    grid.appendChild(card);
  });
}

/* ── History & chart ── */
function updateHistoryUI() {
  const h = state.history;
  if (h.length === 0) {
    el.historyEmpty.style.display = '';
    el.historyWrap.style.display = 'none';
    el.chartWrapper.style.display = 'none';
    return;
  }
  el.historyEmpty.style.display = 'none';
  el.historyWrap.style.display = '';
  el.chartWrapper.style.display = '';

  // Table
  el.historyBody.innerHTML = h.map((r, i) => {
    const d = new Date(r.timestamp);
    const dt = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`;
    const { grade } = getQualityRating(r);
    const gc = `grade-${grade[0].toLowerCase()}`;
    return `<tr>
      <td>${dt}</td>
      <td>${r.download}</td>
      <td>${r.upload}</td>
      <td>${r.ping}</td>
      <td>${r.jitter}</td>
      <td><span class="grade-badge ${gc}">${grade}</span></td>
      <td><button class="btn-del" data-index="${i}" aria-label="Delete this result">✕</button></td>
    </tr>`;
  }).join('');

  // Delete listeners
  el.historyBody.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', () => {
      state.history.splice(+btn.dataset.index, 1);
      saveHistory();
      updateHistoryUI();
      updateStatsRow();
    });
  });

  drawChart();
}

function updateStatsRow() {
  const h = state.history;
  if (h.length === 0) {
    ['bestDownload','avgDownload','bestPing','testsRun'].forEach(id => $(id).textContent = '—');
    $('testsRun').textContent = '0';
    return;
  }
  const downs = h.map(r => r.download);
  const pings = h.map(r => r.ping);
  $('bestDownload').textContent = Math.max(...downs).toFixed(1);
  $('avgDownload').textContent  = (downs.reduce((a,b)=>a+b,0)/downs.length).toFixed(1);
  $('bestPing').textContent     = Math.min(...pings);
  $('testsRun').textContent     = h.length;
}

/* ── Canvas chart ── */
let chartCtx = null;

function drawChart() {
  const canvas = $('speedChart');
  if (!canvas) return;
  const wrapper = $('chartWrapper');
  canvas.width  = wrapper.clientWidth - 48;
  canvas.height = wrapper.clientHeight - 48;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const h = [...state.history].reverse(); // oldest → newest
  if (h.length < 2) return;

  const W = canvas.width, H = canvas.height;
  const pad = { top: 20, right: 20, bottom: 30, left: 50 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top  - pad.bottom;

  const maxVal = Math.max(...h.map(r => Math.max(r.download, r.upload))) * 1.15;

  function xPos(i) { return pad.left + (i / (h.length - 1)) * cW; }
  function yPos(v) { return pad.top  + cH - (v / maxVal) * cH; }

  const isDark = document.documentElement.dataset.theme !== 'light';
  const textColor  = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
  const gridColor  = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  // Grid lines
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (cH / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    const label = ((maxVal * (4 - i)) / 4).toFixed(0);
    ctx.fillStyle = textColor;
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(label, pad.left - 8, y + 4);
  }

  // Download line
  drawLine(ctx, h, xPos, yPos, r => r.download, '#00d4ff', '#0091ff', H, pad);
  // Upload line
  drawLine(ctx, h, xPos, yPos, r => r.upload,   '#00e5a0', '#00a87a', H, pad);

  // Legend
  ctx.font = '11px Syne, sans-serif';
  ctx.fillStyle = '#00d4ff';
  ctx.textAlign = 'left';
  ctx.fillText('▬ Download', pad.left, H - 6);
  ctx.fillStyle = '#00e5a0';
  ctx.fillText('▬ Upload', pad.left + 110, H - 6);
}

function drawLine(ctx, data, xPos, yPos, getter, color1, color2, H, pad) {
  if (data.length < 2) return;
  const grad = ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
  grad.addColorStop(0, color1);
  grad.addColorStop(1, color2);

  // Area fill
  const areaGrad = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
  areaGrad.addColorStop(0, color1 + '22');
  areaGrad.addColorStop(1, color1 + '00');
  ctx.beginPath();
  ctx.moveTo(xPos(0), H - pad.bottom);
  data.forEach((r, i) => ctx.lineTo(xPos(i), yPos(getter(r))));
  ctx.lineTo(xPos(data.length - 1), H - pad.bottom);
  ctx.closePath();
  ctx.fillStyle = areaGrad;
  ctx.fill();

  // Line
  ctx.beginPath();
  data.forEach((r, i) => i === 0 ? ctx.moveTo(xPos(i), yPos(getter(r))) : ctx.lineTo(xPos(i), yPos(getter(r))));
  ctx.strokeStyle = grad;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Dots
  data.forEach((r, i) => {
    ctx.beginPath();
    ctx.arc(xPos(i), yPos(getter(r)), 3.5, 0, Math.PI * 2);
    ctx.fillStyle = color1;
    ctx.fill();
  });
}

/* ── Export CSV ── */
function exportCSV() {
  if (state.history.length === 0) return;
  const header = 'Date,Time,Download (Mbps),Upload (Mbps),Ping (ms),Jitter (ms),Grade\n';
  const rows = state.history.map(r => {
    const d = new Date(r.timestamp);
    const { grade } = getQualityRating(r);
    return `${d.toLocaleDateString()},${d.toLocaleTimeString()},${r.download},${r.upload},${r.ping},${r.jitter},${grade}`;
  }).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `speedcheck-pro-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── LocalStorage ── */
function saveHistory() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.history)); } catch {}
}
function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state.history = JSON.parse(raw);
  } catch {}
}

/* ── Theme ── */
function initTheme() {
  const saved = localStorage.getItem('speedcheck_theme') || 'dark';
  document.documentElement.dataset.theme = saved;
  el.themeIcon.textContent = saved === 'dark' ? '☀️' : '🌙';
}
function toggleTheme() {
  const current = document.documentElement.dataset.theme;
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  el.themeIcon.textContent = next === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('speedcheck_theme', next);
  if (state.history.length > 0) drawChart();
}

/* ── Utilities ── */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ── Init ── */
function init() {
  initGaugeSVG();
  initGaugeTicks();
  initTheme();
  loadHistory();
  updateHistoryUI();
  updateStatsRow();
  setGauge(0);

  el.startBtn.addEventListener('click', () => {
    if (state.running) stopTest();
    else runSpeedTest();
  });

  el.themeToggle.addEventListener('click', toggleTheme);
  el.exportBtn.addEventListener('click', exportCSV);
  el.clearBtn.addEventListener('click', () => {
    if (confirm('Clear all speed test history? This cannot be undone.')) {
      state.history = [];
      saveHistory();
      updateHistoryUI();
      updateStatsRow();
    }
  });

  // Redraw chart on resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (state.history.length > 1) drawChart(); }, 200);
  });
}

document.addEventListener('DOMContentLoaded', init);
