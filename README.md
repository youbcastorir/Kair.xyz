# ⬡ Kair Speed Test

> A fast, transparent, privacy-first internet speed testing tool — built with pure HTML, CSS, and Vanilla JavaScript.

**Live:** [kair.xyz](https://kair.xyz) · **Contact:** [salatrir@gmail.com](mailto:salatrir@gmail.com)

---

## Overview

Kair Speed Test measures your internet connection quality directly in the browser — no signup, no tracking, no backend required. All results are stored locally on your device and never sent to any server.

**What it measures:**
- ↓ **Download speed** — how fast data arrives to your device (Mbps)
- ↑ **Upload speed** — how fast data leaves your device (Mbps)
- ⬤ **Ping / Latency** — round-trip time for a small request (ms)
- ≋ **Jitter** — variation in ping over time, indicates connection stability (ms)

---

## How Speed Testing Works

### Ping (Latency)
Multiple small HTTP requests are sent to a known endpoint. The round-trip time is measured in milliseconds. We take the **median of 10 samples** to avoid outliers caused by brief network hiccups.

### Jitter
Jitter is the **average deviation between consecutive ping samples**. A stable connection has low jitter (< 5 ms). High jitter (> 30 ms) indicates an unstable connection — problematic for video calls and gaming.

### Download Speed
Multiple data payloads of different sizes are fetched via HTTP. The browser streams each response and we measure throughput (bytes received ÷ time elapsed). We run 3 rounds, discard outliers using a trimmed mean, and report the result in **Mbps**.

### Upload Speed
Controlled binary payloads are sent via HTTP POST. We measure how long the browser takes to transmit each payload and calculate throughput. Upload testing is **browser-limited** — browsers throttle outbound connections, so results may be lower than ISP-reported upload speeds.

### ⚠ Browser Limitations
This tool runs **entirely in-browser** without a dedicated test server infrastructure. Results are real and useful for relative comparisons, but may differ from tools like Speedtest.net or Fast.com, which use:
- Dedicated global test server networks
- TCP/UDP-level protocol optimization
- Multi-connection parallel testing

Use Kair Speed Test to **track changes over time** and **troubleshoot basic connectivity issues**.

---

## Features

- ✅ No signup or account required
- ✅ Test history stored in `localStorage` (local only, never uploaded)
- ✅ Dark / Light mode toggle (preference saved)
- ✅ Animated speed meter with log-scale arc
- ✅ Connection quality rating: Excellent / Good / Average / Poor
- ✅ Fully responsive — mobile-first design
- ✅ PWA-ready (installable, works offline after first load)
- ✅ SEO optimized with Open Graph, Twitter Cards, Schema.org
- ✅ Zero external dependencies (no npm, no bundler)

---

## GitHub Pages Deployment

### Quick Deploy

```bash
git init
git add .
git commit -m "Launch Kair Speed Test"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/kair-speed-test.git
git push -u origin main
```

Then in your GitHub repository:
1. Go to **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / `/ (root)`
4. Click **Save**

Your site will be live at: `https://YOUR_USERNAME.github.io/kair-speed-test`

### Custom Domain (optional)
1. Add a `CNAME` file in the root with your domain: `kair.xyz`
2. Configure your DNS: add a `CNAME` record pointing to `YOUR_USERNAME.github.io`

---

## Customization Guide

### Change the color theme
Edit CSS variables in `style.css` under `:root {}`:
```css
--accent: #00d4ff;   /* Primary accent (cyan) */
--accent2: #00ff88;  /* Secondary accent (green) */
--accent3: #7b5fff;  /* Tertiary accent (purple) */
```

### Change test endpoints
Edit `CONFIG` in `speedtest.js`:
```js
const CONFIG = {
  pingEndpoints: ['https://your-endpoint.com/ping'],
  downloadEndpoints: [
    { url: 'https://your-cdn.com/file.bin', size: 1_000_000 },
  ],
  uploadEndpoint: 'https://your-endpoint.com/upload',
};
```

### Adjust history limit
In `app.js`:
```js
const MAX_HISTORY = 10; // change to any number
```

### Change quality thresholds
In `speedtest.js`, edit the `rateConnection()` function to match your definition of "good" vs "poor" speeds.

---

## SEO Setup

The `index.html` includes:
- `<title>` and `<meta description>` optimized for speed test queries
- **Open Graph** tags for Facebook/LinkedIn previews
- **Twitter/X Card** tags for rich link previews
- **Schema.org** `SoftwareApplication` markup for Google rich results
- `sitemap.xml` listing the canonical URL
- `robots.txt` allowing all crawlers

To update for your domain, find and replace all instances of `kair.xyz` with your domain.

---

## Performance Notes

- **Zero JavaScript frameworks** — no React, Vue, or Angular overhead
- **No npm / bundler** — load directly in browser, no build step
- **Lazy canvas animation** — background particles run at 60fps using `requestAnimationFrame`
- **Smooth number animations** — CSS-style easing via JS `requestAnimationFrame`
- **Fonts** — loaded from Google Fonts with `preconnect` hints; falls back gracefully
- **Total JS size** — ~12 KB unminified across all three files
- **Lighthouse score** — targets 95+ Performance, 100 Accessibility

---

## File Structure

```
kair-speed-test/
├── index.html       # Main HTML, SEO meta, schema.org
├── style.css        # All styles, dark/light themes, animations
├── app.js           # Main controller: test flow + history
├── speedtest.js     # Core measurement engine
├── ui.js            # DOM updates, animations, canvas background
├── manifest.json    # PWA manifest
├── sitemap.xml      # SEO sitemap
├── robots.txt       # Crawler permissions
├── README.md        # This file
└── .gitignore       # Git ignore rules
```

---

## Support & Contact

Questions, feedback, or bug reports:

📧 **Email:** [salatrir@gmail.com](mailto:salatrir@gmail.com)  
🌐 **Website:** [kair.xyz](https://kair.xyz)

---

## License

MIT — free to use, modify, and distribute. Attribution appreciated but not required.

---

> *Kair Speed Test is honest about what it is: a browser-based tool with real but limited measurement capability. We'd rather give you accurate expectations than impressive-looking numbers.*
