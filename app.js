/* ═══════════════════════════════════════════
   KAIR SPEED TEST — app.js
   Main controller: wires UI + SpeedTest engine
   + localStorage history management
═══════════════════════════════════════════ */

(() => {
  'use strict';

  // ── Constants ──────────────────────────────
  const STORAGE_KEY = 'kair-history';
  const MAX_HISTORY = 10;

  // ── State ──────────────────────────────────
  let isRunning = false;
  let currentStage = null; // 'ping' | 'download' | 'upload'

  // ── History helpers ─────────────────────────
  const loadHistory = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (_) {
      return [];
    }
  };

  const saveHistory = (entries) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (_) {}
  };

  const addToHistory = (result) => {
    const entries = loadHistory();
    entries.push(result);
    // Keep only most recent MAX_HISTORY
    if (entries.length > MAX_HISTORY) entries.splice(0, entries.length - MAX_HISTORY);
    saveHistory(entries);
    return entries;
  };

  const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  };

  // ── Stage tracker ───────────────────────────
  const setStage = (name) => {
    if (currentStage && currentStage !== name) {
      UI.completeMetric(currentStage);
    }
    currentStage = name;
    if (name) UI.activateMetric(name);
  };

  // ── Main test flow ──────────────────────────
  const runTest = async () => {
    if (isRunning) return;
    isRunning = true;

    UI.resetUI();
    UI.setButtonState('loading');
    UI.setTesting(true);
    UI.setProgress(0, 'Initializing…');
    currentStage = null;

    try {
      await SpeedTest.run({

        // Stage updates (drives progress bar + meter label)
        onStage: (stageName, pct) => {
          UI.setProgress(pct, stageName);

          // Determine current stage from label
          if (stageName.toLowerCase().includes('ping')) {
            setStage('ping');
            UI.speedUnit.textContent = 'ms';
            UI.speedLabel.textContent = 'PING';
          } else if (stageName.toLowerCase().includes('download')) {
            setStage('download');
            UI.speedUnit.textContent = 'Mbps';
            UI.speedLabel.textContent = 'DOWNLOAD';
          } else if (stageName.toLowerCase().includes('upload')) {
            setStage('upload');
            UI.speedUnit.textContent = 'Mbps';
            UI.speedLabel.textContent = 'UPLOAD';
          } else if (stageName.toLowerCase().includes('finaliz') || stageName.toLowerCase().includes('complete')) {
            setStage(null);
          }
        },

        // Live ping samples → animate ping metric + meter
        onPingSample: (rtt, samples) => {
          UI.setMetric('ping', rtt, 'ms');
          UI.setMeterSpeed(rtt, 'PING');
          // Update jitter live
          if (samples.length > 2) {
            let jSum = 0;
            for (let i = 1; i < samples.length; i++) jSum += Math.abs(samples[i] - samples[i - 1]);
            const liveJitter = jSum / (samples.length - 1);
            UI.setMetric('jitter', liveJitter, 'ms');
          }
        },

        // Live download progress → animate download metric + meter
        onDownloadProgress: (speed) => {
          UI.setMeterSpeed(speed, 'DOWNLOAD');
          UI.setMetric('download', speed, 'Mbps');
        },

        // Live upload progress → animate upload metric + meter
        onUploadProgress: (speed) => {
          UI.setMeterSpeed(speed, 'UPLOAD');
          UI.setMetric('upload', speed, 'Mbps');
        },

        // Final results
        onComplete: (results) => {
          // Complete all metrics
          ['ping','jitter','download','upload'].forEach(n => UI.completeMetric(n));

          // Set final values
          UI.setMeterSpeed(results.download, 'DOWNLOAD');
          UI.setMetric('download', results.download, 'Mbps');
          UI.setMetric('upload', results.upload, 'Mbps');
          UI.setMetric('ping', results.ping, 'ms');
          UI.setMetric('jitter', results.jitter, 'ms');

          // Quality
          UI.showQuality(results.quality.rating, results.quality.label);

          // History
          const entries = addToHistory(results);
          UI.renderHistory(entries);

          // Reset button
          UI.setButtonState('done');
          UI.setTesting(false);
          isRunning = false;

          // Scroll to results on mobile
          if (window.innerWidth < 768) {
            document.getElementById('metricDownload')?.scrollIntoView({
              behavior: 'smooth', block: 'nearest'
            });
          }
        },

        onError: (err) => {
          console.error('[App] Test failed:', err);
          UI.setProgress(0, 'Test failed — check your connection');
          UI.setButtonState('idle');
          UI.setTesting(false);
          UI.resetMeter();
          isRunning = false;

          // Show a gentle error in the meter
          document.getElementById('speedNumber').textContent = '!';
          document.getElementById('speedLabel').textContent = 'ERROR';
        },
      });

    } catch (err) {
      // Caught by onError above, but handle double-catch
      UI.setButtonState('idle');
      UI.setTesting(false);
      isRunning = false;
    }
  };

  // ── DOM ready ───────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {

    // Init UI (theme, canvas, scroll reveals)
    UI.init();

    // Load & render existing history
    UI.renderHistory(loadHistory());

    // Start button
    document.getElementById('btnStart').addEventListener('click', () => {
      if (!isRunning) runTest();
    });

    // Clear history button
    document.getElementById('btnClear').addEventListener('click', () => {
      if (confirm('Clear all test history? This cannot be undone.')) {
        const empty = clearHistory();
        UI.renderHistory(empty);
      }
    });

    // Smooth scroll for nav links
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    // Keyboard shortcut: Space to start test
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target === document.body && !isRunning) {
        e.preventDefault();
        runTest();
      }
    });

    // Service Worker registration (PWA)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {
        // SW not available — fine, app works without it
      });
    }

  });

})();
