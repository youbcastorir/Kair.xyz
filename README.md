# ⚡ SpeedCheck Pro

A modern, professional internet speed test — no backend, no dependencies, no sign-up.

**Live Demo:** [yourusername.github.io/speedcheck-pro](https://yourusername.github.io/speedcheck-pro/)

---

## 📁 Project Structure

```
speedcheck-pro/
├── index.html                  # Main app (HTML + SEO + schema.org)
├── style.css                   # All styles (dark/light, animations)
├── app.js                      # Speed test engine + history + chart
├── 404.html                    # Custom GitHub Pages 404
├── manifest.json               # PWA manifest
├── sitemap.xml                 # SEO sitemap
├── robots.txt                  # Crawler directives
├── _config.yml                 # GitHub Pages config (disables Jekyll)
├── .gitignore
├── README.md
└── icons/
    ├── icon-192.svg            # PWA icon (192px)
    ├── icon-512.svg            # PWA icon (512px)
    └── og-image.svg            # Open Graph social preview
└── .github/
    └── workflows/
        └── deploy.yml          # Auto-deploy to GitHub Pages
```

---

## 🚀 Deploy to GitHub Pages

### Step 1 — Create repository on GitHub

Go to [github.com/new](https://github.com/new):
- Repository name: `speedcheck-pro`
- Visibility: **Public**
- Do NOT initialize with README

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

Go to your repo → **Settings** → **Pages** → under **Source** select **GitHub Actions**.

The workflow in `.github/workflows/deploy.yml` will auto-deploy on every push to `main`.

Your site will be live at:
```
https://YOUR_USERNAME.github.io/speedcheck-pro/
```

### Step 4 — Update your URL (important)

Replace `yourusername` with your actual GitHub username in:

| File | What to change |
|------|----------------|
| `index.html` | OG tags, Twitter card, canonical, schema.org URLs |
| `sitemap.xml` | All `<loc>` entries |
| `robots.txt` | Sitemap URL |
| `404.html` | The back-link `href` |

---

## ✨ Features

| Feature | Details |
|---|---|
| 🎯 Speed Test | Animated gauge, needle, real-time counter |
| 📊 Results Dashboard | Download, upload, ping, jitter with grade A+–F |
| 🔍 Connection Analysis | Gaming, 4K, video calls, remote work, smart home |
| 📈 History Chart | Canvas line chart + sortable table |
| 💾 Persistence | localStorage, up to 50 tests |
| 📤 Export | One-click CSV download |
| 🌙 Dark / Light Mode | Toggle with persistent preference |
| 📱 Mobile-First | Responsive down to 320px |
| ⚡ PWA Ready | Add to Home Screen |
| 🔍 SEO | OG, Twitter card, schema.org, sitemap, robots |

---

## 🎨 Customisation

**Colours** — edit `:root` in `style.css`:
```css
--accent: #00d4ff;   /* primary */
--green:  #00e5a0;   /* upload / success */
--bg:     #0a0f1e;   /* background */
```

**Speed scale** — edit `app.js`:
```js
const MAX_SPEED = 1000; // max Mbps on gauge
```

**Connection profiles** — edit `generateTestProfile()` in `app.js`:
```js
{ download: 500, upload: 200, ping: 6, jitter: 1, label: 'Fiber Pro' }
```

---

## 📬 Contact

- **Email:** salatrir@gmail.com
- **Issues:** github.com/YOUR_USERNAME/speedcheck-pro/issues

---

*MIT License · Built for the open web*
