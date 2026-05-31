# ⚡ SpeedCheck Pro

A modern, lightweight internet speed test web application — no backend, no installs, no sign-up required. Works entirely in the browser.

**Live Demo:** [yourusername.github.io/speedcheck-pro](https://yourusername.github.io/speedcheck-pro/)

---

## 📋 Overview

SpeedCheck Pro is a polished speed test application inspired by Speedtest.net, built with pure HTML, CSS, and Vanilla JavaScript. It measures:

- **Download speed** (Mbps)
- **Upload speed** (Mbps)
- **Ping / Latency** (ms)
- **Jitter** (ms)

Results are saved to `localStorage` for persistent history, visualised in a live chart, and analysed for real-world use cases (gaming, streaming, remote work, etc.).

---

## ✨ Features

| Feature | Details |
|---|---|
| 🎯 Speed Test | Animated circular gauge with needle, real-time counter |
| 📊 Results Dashboard | Download, upload, ping, jitter cards with progress bars |
| 🏆 Quality Rating | A+ to F grade with description |
| 🔍 Connection Analysis | Gaming, 4K streaming, video calls, remote work, smart home |
| 📈 Speed History | Line chart + data table with per-entry deletion |
| 💾 Persistence | Auto-saved to localStorage (up to 50 tests) |
| 📤 Export | One-click CSV download |
| 🌙 Dark / Light Mode | Toggle with persistent preference |
| 📱 Mobile-First | Fully responsive down to 320px |
| ⚡ PWA Ready | manifest.json for Add-to-Home-Screen |
| 🔍 SEO Ready | OG tags, Twitter cards, schema.org, sitemap.xml |

---

## 🚀 Installation & Local Development

No build tools required. Just open the file.

### Option 1 — Direct Open
```bash
git clone https://github.com/YOUR_USERNAME/speedcheck-pro.git
cd speedcheck-pro
open index.html          # macOS
# or
start index.html         # Windows
# or
xdg-open index.html      # Linux
```

### Option 2 — Live Server (recommended for development)

If you have VS Code, install the **Live Server** extension and click "Go Live".

Or use Python's built-in server:
```bash
cd speedcheck-pro
python3 -m http.server 8080
# Then open http://localhost:8080
```

Or Node.js:
```bash
npx serve .
```

---

## 🌐 Deploy to GitHub Pages

### Step 1 — Create a GitHub repository
Go to [github.com/new](https://github.com/new) and create a new public repository named `speedcheck-pro`.

### Step 2 — Push your code
```bash
git init
git add .
git commit -m "Launch SpeedCheck Pro"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/speedcheck-pro.git
git push -u origin main
```

### Step 3 — Enable GitHub Pages
1. Go to your repository → **Settings** → **Pages**
2. Under **Source**, select **Deploy from a branch**
3. Choose **main** branch → **/ (root)** folder
4. Click **Save**

Your site will be live at:
```
https://YOUR_USERNAME.github.io/speedcheck-pro/
```

### Step 4 — Update your URLs
Replace `yourusername` in these files with your actual GitHub username:
- `index.html` — OG tags and schema.org URLs
- `sitemap.xml` — `<loc>` entries
- `robots.txt` — Sitemap URL

---

## 🎨 Customisation Guide

### Change the colour scheme
Open `style.css` and edit the `:root` variables:

```css
:root {
  --accent:  #00d4ff;  /* Primary accent — change to your brand colour */
  --accent2: #0091ff;  /* Secondary accent */
  --green:   #00e5a0;  /* Success / upload colour */
  --bg:      #0a0f1e;  /* Background */
}
```

### Change the speed scale
In `app.js`, update `MAX_SPEED`:
```js
const MAX_SPEED = 1000; // Change to 500 for 500 Mbps max scale
```

### Change the test simulation profile
Edit the `profiles` array in `generateTestProfile()` in `app.js` to add or modify connection types:
```js
{ download: 500, upload: 200, ping: 6, jitter: 1, label: 'Fiber Pro' },
```

### Adjust history limit
```js
const MAX_HISTORY = 50; // Change to any number
```

### Change fonts
Update the Google Fonts link in `index.html` and the `font-family` references in `style.css`.

---

## 📁 File Structure

```
speedcheck-pro/
├── index.html        # Main HTML — semantic, accessible, SEO-ready
├── style.css         # All styles — dark/light mode, animations
├── app.js            # Speed test engine, chart, history, UI logic
├── manifest.json     # PWA manifest
├── sitemap.xml       # SEO sitemap
├── robots.txt        # Crawler directives
├── .gitignore        # Git ignore rules
└── README.md         # This file
```

---

## 🔧 Technical Notes

- **No dependencies** — pure HTML/CSS/JS, zero npm packages
- **No backend** — speed simulation runs entirely in the browser
- **localStorage** — results persist across sessions, up to 50 entries
- **Canvas chart** — hand-drawn with the Canvas 2D API, no charting libraries
- **Accessibility** — ARIA labels, roles, live regions, keyboard navigable
- **Performance** — < 15 KB of JS, no blocking resources

> **Note:** Speed results are browser-based simulations designed for demonstration. For production use, integrate with a real measurement API (e.g. Cloudflare Speed Test API, LibreSpeed backend).

---

## 📬 Contact & Support

- **Email:** [salatrir@gmail.com](mailto:salatrir@gmail.com)
- **Issues:** [github.com/YOUR_USERNAME/speedcheck-pro/issues](https://github.com/YOUR_USERNAME/speedcheck-pro/issues)

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

*Built with ❤️ · Powered by the open web*
