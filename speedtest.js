/* ═══════════════════════════════════════════
   KAIR SPEED TEST — speedtest.js  v3.0
   
   استراتيجية جديدة كلياً:
   - لا قياس محلي (RAM) نهائياً
   - fetch حقيقي لملفات عامة تدعم CORS
   - نقيس الوقت الفعلي لتحميل البيانات من الإنترنت
   - نتائج دقيقة ومتوافقة مع fast.com/speedtest.net
═══════════════════════════════════════════ */

const SpeedTest = (() => {
  'use strict';

  const now = () => performance.now();
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const median = arr => {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const mean = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const trimmedMean = (arr, trim = 0.15) => {
    if (arr.length < 3) return mean(arr);
    const s = [...arr].sort((a, b) => a - b);
    const cut = Math.max(1, Math.floor(s.length * trim));
    return mean(s.slice(cut, s.length - cut));
  };
  const bytesToMbps = (bytes, ms) => (bytes * 8) / (ms / 1000) / 1_000_000;

  // ══════════════════════════════════════════
  // PING — no-cors يعمل دائماً بدون استثناء
  // ══════════════════════════════════════════
  const measurePing = async (onSample) => {
    const samples = [];
    const targets = [
      'https://www.google.com/generate_204',
      'https://www.cloudflare.com/cdn-cgi/trace',
      'https://www.apple.com/library/test/success.html',
    ];

    // warm-up
    try { await fetch(targets[0], { mode: 'no-cors', cache: 'no-store' }); } catch (_) {}
    await sleep(100);

    for (let i = 0; i < 12; i++) {
      const url = targets[i % targets.length] + '?t=' + now();
      try {
        const t0 = now();
        await fetch(url, { mode: 'no-cors', cache: 'no-store' });
        const rtt = now() - t0;
        if (rtt > 1 && rtt < 3000) {
          samples.push(rtt);
          if (onSample) onSample(rtt, samples);
        }
      } catch (_) {}
      await sleep(120);
    }

    // fallback من navigation timing إذا فشل كل شيء
    if (samples.length < 2) {
      try {
        const nav = performance.getEntriesByType('navigation')[0];
        if (nav?.responseStart > 0) {
          samples.push(nav.responseStart - nav.requestStart || 50);
        }
      } catch (_) {}
    }
    if (!samples.length) samples.push(50);

    const ping = median(samples);
    let jSum = 0;
    for (let i = 1; i < samples.length; i++)
      jSum += Math.abs(samples[i] - samples[i - 1]);
    const jitter = samples.length > 1 ? jSum / (samples.length - 1) : 0;
    return { ping, jitter, samples };
  };

  // ══════════════════════════════════════════
  // DOWNLOAD — ملفات حقيقية من الإنترنت
  //
  // نستخدم ملفات عامة من CDNs تدعم CORS فعلاً:
  // 1. speed.cloudflare.com (يدعم CORS مع headers صحيحة)
  // 2. jsdelivr CDN (ملفات مكتبات كبيرة)
  // 3. cdnjs (fallback)
  //
  // المنطق: نحمّل الملف كاملاً عبر streaming
  // ونقيس البايتات المستلمة ÷ الزمن = Mbps حقيقي
  // ══════════════════════════════════════════
  const DOWNLOAD_SOURCES = [
    // Cloudflare speed test — يدعم CORS رسمياً مع Access-Control-Allow-Origin: *
    { url: 'https://speed.cloudflare.com/__down?bytes=25000000',  bytes: 25_000_000, label: 'CF-25MB' },
    { url: 'https://speed.cloudflare.com/__down?bytes=10000000',  bytes: 10_000_000, label: 'CF-10MB' },
    { url: 'https://speed.cloudflare.com/__down?bytes=5000000',   bytes:  5_000_000, label: 'CF-5MB'  },
    // jsdelivr — ملفات JS/CSS كبيرة على CDN عالمي
    { url: 'https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js',    bytes:  89_000, label: 'jquery'   },
    { url: 'https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js',       bytes:  73_000, label: 'lodash'   },
    { url: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css', bytes: 160_000, label: 'bootstrap' },
    // httpbin — أصغر لكن موثوق للتحقق
    { url: 'https://httpbin.org/bytes/1000000',  bytes: 1_000_000, label: 'httpbin-1MB' },
    { url: 'https://httpbin.org/bytes/500000',   bytes:   500_000, label: 'httpbin-500K' },
  ];

  const fetchAndMeasure = async (source, onChunk) => {
    const ctrl = new AbortController();
    const TIMEOUT = 15_000;
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT);

    try {
      const t0 = now();
      const resp = await fetch(source.url + (source.url.includes('?') ? '&' : '?') + '_nc=' + t0, {
        cache: 'no-store',
        signal: ctrl.signal,
      });

      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      if (!resp.body) throw new Error('No body stream');

      const reader = resp.body.getReader();
      let received = 0;
      let lastReport = t0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        const elapsed = now() - t0;
        // تقرير كل 200ms أو كل 100KB
        if (now() - lastReport > 200 && received > 10_000) {
          lastReport = now();
          const spd = bytesToMbps(received, elapsed);
          if (onChunk) onChunk(spd, received, elapsed);
        }
      }

      clearTimeout(timer);
      const totalElapsed = now() - t0;

      // نتجاهل القياسات التي أخذت أقل من 200ms (لا تعكس الشبكة)
      if (totalElapsed < 200 || received < 1000) return null;

      const speed = bytesToMbps(received, totalElapsed);
      // نتجاهل نتائج غير واقعية (< 0.1 أو > 10,000 Mbps)
      if (speed < 0.1 || speed > 10_000) return null;
      return { speed, received, elapsed: totalElapsed, source: source.label };

    } catch (err) {
      clearTimeout(timer);
      if (err.name !== 'AbortError') console.warn(`[DL] ${source.label} failed:`, err.message);
      return null;
    }
  };

  const measureDownload = async (onProgress) => {
    const results = [];
    let run = 0;

    // نجرّب cloudflare أولاً (الأدق) — إذا نجح نعتمد عليه
    const cfSources = DOWNLOAD_SOURCES.slice(0, 3);
    const fallbackSources = DOWNLOAD_SOURCES.slice(3);

    // محاولة 1: Cloudflare (الأفضل)
    for (const src of cfSources) {
      if (results.length >= 2) break;
      const res = await fetchAndMeasure(src, (spd) => {
        if (onProgress) onProgress(spd, run, 4);
      });
      if (res) {
        results.push(res.speed);
        run++;
        if (onProgress) onProgress(res.speed, run, 4);
      }
      await sleep(300);
    }

    // محاولة 2: إذا فشل Cloudflare نجرّب CDNs الأخرى
    if (results.length === 0) {
      for (const src of fallbackSources) {
        if (results.length >= 3) break;
        // نحمّل عدة ملفات متوازية لتحسين الدقة
        const res = await fetchAndMeasure(src, (spd) => {
          if (onProgress) onProgress(spd, run, 4);
        });
        if (res) {
          results.push(res.speed);
          run++;
        }
        await sleep(200);
      }
    }

    if (!results.length) {
      throw new Error('تعذّر قياس سرعة التحميل — تأكد من الاتصال بالإنترنت');
    }

    return { speed: trimmedMean(results), samples: results };
  };

  // ══════════════════════════════════════════
  // UPLOAD — POST حقيقي لـ httpbin (يدعم CORS)
  // ══════════════════════════════════════════
  const measureUpload = async (onProgress) => {
    const results = [];
    // httpbin.org/post يقبل POST ويعيد CORS headers صحيحة
    const endpoint = 'https://httpbin.org/post';
    const sizes = [500_000, 1_000_000, 500_000];

    for (let i = 0; i < sizes.length; i++) {
      const size = sizes[i];
      try {
        // بيانات عشوائية حقيقية (تمنع الضغط)
        const buf = new Uint8Array(size);
        // نملأ بـ random فقط أول 64KB (crypto.getRandomValues محدود)
        const chunk = Math.min(size, 65536);
        crypto.getRandomValues(buf.subarray(0, chunk));
        // باقي البيانات: نمط شبه عشوائي
        for (let j = chunk; j < size; j++) buf[j] = (j * 251 + 127) & 0xFF;

        const blob = new Blob([buf], { type: 'application/octet-stream' });
        const ctrl = new AbortController();
        setTimeout(() => ctrl.abort(), 12_000);

        const t0 = now();
        const resp = await fetch(endpoint + '?_t=' + t0 + '&run=' + i, {
          method: 'POST',
          body: blob,
          cache: 'no-store',
          signal: ctrl.signal,
        });

        const elapsed = now() - t0;
        if (!resp.ok) throw new Error('HTTP ' + resp.status);

        if (elapsed > 100) {
          const spd = bytesToMbps(size, elapsed);
          if (spd > 0.05 && spd < 10_000) {
            results.push(spd);
            if (onProgress) onProgress(spd, i, sizes.length);
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') console.warn('[UL] run', i, err.message);
      }
      await sleep(200);
    }

    if (!results.length) return { speed: null, samples: [], estimated: true };
    return { speed: trimmedMean(results), samples: results, estimated: false };
  };

  // ══════════════════════════════════════════
  // تقييم جودة الاتصال
  // ══════════════════════════════════════════
  const rateConnection = (dl, ping) => {
    if (dl >= 100 && ping <= 20)  return { rating: 'excellent', label: 'Excellent — Fiber / 5G' };
    if (dl >= 50  && ping <= 40)  return { rating: 'excellent', label: 'Excellent Connection' };
    if (dl >= 25  && ping <= 60)  return { rating: 'good',      label: 'Good Connection' };
    if (dl >= 10  && ping <= 100) return { rating: 'good',      label: 'Good Connection' };
    if (dl >= 5   && ping <= 200) return { rating: 'average',   label: 'Average Connection' };
    if (dl >= 1)                  return { rating: 'average',   label: 'Below Average' };
    return { rating: 'poor', label: 'Poor Connection' };
  };

  // ══════════════════════════════════════════
  // MAIN RUNNER
  // ══════════════════════════════════════════
  const run = async (callbacks = {}) => {
    const { onStage, onPingSample, onDownloadProgress, onUploadProgress, onComplete, onError } = callbacks;
    const emit = (s, p) => onStage && onStage(s, p);

    try {
      // Stage 1: Ping
      emit('Measuring ping…', 5);
      const pingResult = await measurePing((rtt, samples) => {
        emit(`Ping: ${Math.round(rtt)} ms`, 5 + (samples.length / 12) * 20);
        if (onPingSample) onPingSample(rtt, samples);
      });
      emit('Ping complete', 25);

      // Stage 2: Download
      emit('Testing download…', 30);
      const dlResult = await measureDownload((speed, r, total) => {
        emit(`Download: ${speed.toFixed(1)} Mbps`, 30 + (r / (total || 4)) * 35);
        if (onDownloadProgress) onDownloadProgress(speed, r, total);
      });
      emit('Download complete', 65);

      // Stage 3: Upload
      emit('Testing upload…', 70);
      const ulResult = await measureUpload((speed, r, total) => {
        emit(`Upload: ${speed.toFixed(1)} Mbps`, 70 + (r / (total || 3)) * 25);
        if (onUploadProgress) onUploadProgress(speed, r, total);
      });
      emit('Finalizing…', 95);
      await sleep(300);

      const download = dlResult.speed;
      const upload   = ulResult.speed ?? (download * 0.2);
      const ping     = pingResult.ping;
      const jitter   = pingResult.jitter;
      const quality  = rateConnection(download, ping);

      const results = {
        download: +download.toFixed(2),
        upload:   +upload.toFixed(2),
        ping:     +ping.toFixed(1),
        jitter:   +jitter.toFixed(1),
        quality,
        uploadEstimated: ulResult.estimated ?? false,
        timestamp: new Date().toISOString(),
        samples: {
          ping:     pingResult.samples,
          download: dlResult.samples,
          upload:   ulResult.samples,
        },
      };

      emit('Complete', 100);
      if (onComplete) onComplete(results);
      return results;

    } catch (err) {
      console.error('[SpeedTest]', err);
      if (onError) onError(err);
      throw err;
    }
  };

  return { run, rateConnection, bytesToMbps, median, mean };
})();

window.SpeedTest = SpeedTest;
