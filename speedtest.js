/* ═══════════════════════════════════════════
   KAIR SPEED TEST — speedtest.js
   Core measurement engine
   Browser-based, no backend required
═══════════════════════════════════════════ */

const SpeedTest = (() => {

  // ── Configuration ─────────────────────────
  const CONFIG = {
    // Public CORS-friendly endpoints for ping/download tests
    pingEndpoints: [
      'https://www.cloudflare.com/cdn-cgi/trace',
      'https://httpbin.org/get',
      'https://jsonplaceholder.typicode.com/posts/1',
    ],
    // Cloudflare's public speed test files (various sizes)
    downloadEndpoints: [
      { url: 'https://speed.cloudflare.com/__down?bytes=1000000',  size: 1_000_000  },  // 1 MB
      { url: 'https://speed.cloudflare.com/__down?bytes=5000000',  size: 5_000_000  },  // 5 MB
      { url: 'https://speed.cloudflare.com/__down?bytes=10000000', size: 10_000_000 },  // 10 MB
    ],
    uploadEndpoint: 'https://speed.cloudflare.com/__up',
    pingCount: 10,
    downloadRuns: 3,
    uploadRuns: 2,
    timeoutMs: 8000,
  };

  // ── Utility helpers ───────────────────────
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
    const sorted = [...arr].sort((a, b) => a - b);
    const cut = Math.floor(sorted.length * trim);
    return mean(sorted.slice(cut, sorted.length - cut));
  };

  const bytesToMbps = (bytes, ms) => (bytes * 8) / (ms / 1000) / 1_000_000;

  // ── Abort controller helper ───────────────
  const withTimeout = (promise, ms) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    return promise(ctrl.signal).finally(() => clearTimeout(timer));
  };

  // ── Ping measurement ──────────────────────
  /**
   * Measures round-trip latency by sending small HEAD/GET requests.
   * Returns { ping: medianMs, jitter: avgDeviationMs, samples: [] }
   */
  const measurePing = async (onSample) => {
    const samples = [];
    const endpoint = CONFIG.pingEndpoints[0];

    // Warm-up request (not counted)
    try {
      await fetch(endpoint + '?_warmup=' + now(), {
        cache: 'no-store',
        mode: 'no-cors',
      });
    } catch (_) {}

    for (let i = 0; i < CONFIG.pingCount; i++) {
      try {
        const t0 = now();
        await fetch(endpoint + '?_t=' + t0, {
          cache: 'no-store',
          mode: 'no-cors',
        });
        const rtt = now() - t0;
        samples.push(rtt);
        if (onSample) onSample(rtt, samples);
      } catch (_) {
        // Network error — skip sample
      }
      await sleep(80);
    }

    if (!samples.length) throw new Error('Ping measurement failed — no samples collected.');

    const ping = median(samples);

    // Jitter = average of absolute differences between consecutive pings
    let jitterSum = 0;
    for (let i = 1; i < samples.length; i++) {
      jitterSum += Math.abs(samples[i] - samples[i - 1]);
    }
    const jitter = samples.length > 1 ? jitterSum / (samples.length - 1) : 0;

    return { ping, jitter, samples };
  };

  // ── Download measurement ──────────────────
  /**
   * Fetches payload files and measures throughput.
   * Uses multiple sizes + runs and returns a trimmed mean.
   * Returns { speed: Mbps, samples: [] }
   */
  const measureDownload = async (onProgress) => {
    const speedSamples = [];

    for (let run = 0; run < CONFIG.downloadRuns; run++) {
      // Cycle through endpoints of different sizes
      const ep = CONFIG.downloadEndpoints[run % CONFIG.downloadEndpoints.length];

      try {
        const t0 = now();
        const response = await fetch(ep.url + '&_t=' + t0, {
          cache: 'no-store',
        });

        if (!response.ok) throw new Error('HTTP ' + response.status);

        // Stream the response to measure actual received bytes
        const reader = response.body.getReader();
        let received = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          received += value.byteLength;
          const elapsed = now() - t0;
          const currentSpeed = bytesToMbps(received, elapsed);
          if (onProgress) onProgress(currentSpeed, run, CONFIG.downloadRuns);
        }

        const elapsed = now() - t0;
        const speed = bytesToMbps(received, elapsed);
        speedSamples.push(speed);

      } catch (err) {
        // Fallback: use the declared size and timing
        console.warn('Download stream failed, using timing fallback:', err.message);
        try {
          const t0 = now();
          await fetch(ep.url + '&_fallback=' + t0, { cache: 'no-store' });
          const elapsed = now() - t0;
          if (elapsed > 50) {
            speedSamples.push(bytesToMbps(ep.size, elapsed));
          }
        } catch (_) {}
      }

      await sleep(200);
    }

    if (!speedSamples.length) throw new Error('Download measurement failed — no samples collected.');

    return {
      speed: trimmedMean(speedSamples),
      samples: speedSamples,
    };
  };

  // ── Upload measurement ────────────────────
  /**
   * Sends controlled data payloads via POST.
   * Upload is browser-limited; results are honest estimates.
   * Returns { speed: Mbps, samples: [] }
   */
  const measureUpload = async (onProgress) => {
    const speedSamples = [];
    // Payload sizes: 500KB, 1MB
    const payloadSizes = [500_000, 1_000_000];

    for (let run = 0; run < CONFIG.uploadRuns; run++) {
      const size = payloadSizes[run % payloadSizes.length];

      try {
        // Generate random payload (avoid compression artifacts)
        const payload = new Uint8Array(size);
        crypto.getRandomValues(payload.subarray(0, Math.min(size, 65536)));
        // Fill rest with pattern
        for (let i = 65536; i < size; i++) payload[i] = i % 256;

        const blob = new Blob([payload], { type: 'application/octet-stream' });

        const t0 = now();
        const response = await fetch(CONFIG.uploadEndpoint + '?_t=' + t0, {
          method: 'POST',
          body: blob,
          cache: 'no-store',
        });

        const elapsed = now() - t0;

        if (elapsed > 100) {
          const speed = bytesToMbps(size, elapsed);
          speedSamples.push(speed);
          if (onProgress) onProgress(speed, run, CONFIG.uploadRuns);
        }

      } catch (err) {
        console.warn('Upload run failed:', err.message);
        // Graceful degradation — estimate from timing
        try {
          const size2 = 250_000;
          const payload2 = new Uint8Array(size2);
          const t0 = now();
          await fetch(CONFIG.uploadEndpoint + '?_fallback=' + t0, {
            method: 'POST',
            body: new Blob([payload2]),
            cache: 'no-store',
          });
          const elapsed = now() - t0;
          if (elapsed > 50) speedSamples.push(bytesToMbps(size2, elapsed));
        } catch (_) {}
      }

      await sleep(300);
    }

    if (!speedSamples.length) {
      // Last resort: synthesize from download with typical upload/download ratio
      return { speed: null, samples: [], estimated: true };
    }

    return {
      speed: trimmedMean(speedSamples),
      samples: speedSamples,
      estimated: false,
    };
  };

  // ── Quality rating ────────────────────────
  const rateConnection = (downloadMbps, pingMs) => {
    // Based on download speed and latency combined
    if (downloadMbps >= 100 && pingMs <= 20) return { rating: 'excellent', label: 'Excellent Connection' };
    if (downloadMbps >= 50  && pingMs <= 40) return { rating: 'excellent', label: 'Excellent Connection' };
    if (downloadMbps >= 25  && pingMs <= 60) return { rating: 'good',      label: 'Good Connection' };
    if (downloadMbps >= 10  && pingMs <= 100) return { rating: 'good',     label: 'Good Connection' };
    if (downloadMbps >= 5   && pingMs <= 150) return { rating: 'average',  label: 'Average Connection' };
    if (downloadMbps >= 1)                    return { rating: 'average',  label: 'Average Connection' };
    return { rating: 'poor', label: 'Poor Connection' };
  };

  // ── Full test runner ──────────────────────
  const run = async (callbacks = {}) => {
    const {
      onStage,       // (stageName, progress 0-100)
      onPingSample,  // (currentMs, allSamples)
      onDownloadProgress, // (currentMbps, run, total)
      onUploadProgress,   // (currentMbps, run, total)
      onComplete,    // (results)
      onError,       // (error)
    } = callbacks;

    const emit = (stage, pct) => onStage && onStage(stage, pct);

    try {
      // ── Stage 1: Ping ──────────────────────
      emit('Measuring ping…', 5);
      const pingResult = await measurePing((rtt, samples) => {
        const pct = 5 + (samples.length / CONFIG.pingCount) * 20;
        emit(`Ping: ${Math.round(rtt)} ms`, pct);
        if (onPingSample) onPingSample(rtt, samples);
      });
      emit('Ping complete', 25);

      // ── Stage 2: Download ──────────────────
      emit('Testing download…', 30);
      const dlResult = await measureDownload((speed, run, total) => {
        const pct = 30 + ((run / total) * 35);
        emit(`Download: ${speed.toFixed(1)} Mbps`, pct);
        if (onDownloadProgress) onDownloadProgress(speed, run, total);
      });
      emit('Download complete', 65);

      // ── Stage 3: Upload ────────────────────
      emit('Testing upload…', 70);
      const ulResult = await measureUpload((speed, run, total) => {
        const pct = 70 + ((run / total) * 25);
        emit(`Upload: ${speed.toFixed(1)} Mbps`, pct);
        if (onUploadProgress) onUploadProgress(speed, run, total);
      });
      emit('Finalizing…', 95);

      await sleep(300);

      // ── Compile results ────────────────────
      const download = dlResult.speed;
      const upload = ulResult.speed ?? (download * 0.2); // fallback estimate
      const ping = pingResult.ping;
      const jitter = pingResult.jitter;
      const quality = rateConnection(download, ping);

      const results = {
        download: +download.toFixed(2),
        upload: +(upload).toFixed(2),
        ping: +ping.toFixed(1),
        jitter: +jitter.toFixed(1),
        quality,
        uploadEstimated: ulResult.estimated ?? false,
        timestamp: new Date().toISOString(),
        samples: {
          ping: pingResult.samples,
          download: dlResult.samples,
          upload: ulResult.samples,
        },
      };

      emit('Complete', 100);
      if (onComplete) onComplete(results);
      return results;

    } catch (err) {
      console.error('[SpeedTest] Error:', err);
      if (onError) onError(err);
      throw err;
    }
  };

  // ── Public API ────────────────────────────
  return { run, rateConnection, bytesToMbps, median, mean };

})();

// Make available globally
window.SpeedTest = SpeedTest;
