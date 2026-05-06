# Al-Noor PWA — Deployment Guide

## 📁 Folder Structure

```
quran/
├── index.html        ← Main app (renamed from quran.html)
├── quran.css         ← Styles
├── quran.js          ← App logic
├── pwa.js            ← PWA install/offline/SW manager
├── sw.js             ← Service Worker (caching, offline, push)
├── manifest.json     ← Web App Manifest
├── offline.html      ← Offline fallback page
└── icons/
    ├── icon-16.png   through icon-512.png
    └── screenshot-1.png
```

## 🚀 Deployment (Required for PWA)

PWA features **require HTTPS**. Use one of:

### Option 1 — GitHub Pages (Free)
1. Create a GitHub repo (e.g. `al-noor`)
2. Upload the entire `quran/` folder contents to the repo root
3. Go to Settings → Pages → Source: `main` branch → `/root`
4. App is live at `https://yourusername.github.io/al-noor/`

### Option 2 — Netlify (Free, Drag & Drop)
1. Go to [netlify.com](https://netlify.com)
2. Drag & drop the `quran/` folder into the deploy area
3. App is instantly live at a `https://xxx.netlify.app` URL

### Option 3 — Vercel
```bash
npm i -g vercel
cd quran/
vercel
```

### Option 4 — Any HTTPS Web Host
Upload all files to your hosting root or subdirectory.

---

## 📲 PWA Features Included

| Feature | Description |
|---|---|
| **Service Worker** | Caches app shell + API responses for offline use |
| **Install Prompt** | Android/Chrome: native "Add to Home Screen" banner |
| **iOS Guide** | Step-by-step Safari install instructions |
| **Offline Page** | Beautiful fallback when network is unavailable |
| **Splash Screen** | Animated launch screen while app loads |
| **Update Banner** | Notifies user when a new version is available |
| **Web App Manifest** | Full metadata, icons, shortcuts, screenshots |
| **App Shortcuts** | Jump to Quran / Prayer Times / Tasbeeh from long-press |
| **Push Notifications** | Prayer time alert infrastructure (requires backend) |
| **Background Sync** | Bookmark sync when back online |
| **Wake Lock** | Prevents screen sleep during Quran reading |
| **Share API** | Native share sheet for verses |
| **Vibration** | Haptic feedback on Tasbeeh counter |
| **Offline Detection** | Live network status indicator |

---

## 🔔 Prayer Notifications (Optional Advanced Setup)

To enable push notifications for prayer times, you need a backend:
1. Generate VAPID keys: `npx web-push generate-vapid-keys`
2. Store the public key in your app
3. Send push payloads to registered devices before each prayer time

---

## 🎨 Icons

Icons were auto-generated. To replace with custom artwork:
- Create a 512×512 PNG
- Use [pwabuilder.com/imageGenerator](https://www.pwabuilder.com/imageGenerator) to auto-generate all sizes
- Replace files in the `icons/` folder

---

## ✅ PWA Checklist

- [x] HTTPS (required — set up via hosting)
- [x] Web App Manifest with all icon sizes
- [x] Service Worker registered
- [x] Offline fallback page
- [x] App installable on Android + iOS
- [x] `theme-color` meta tag
- [x] `apple-mobile-web-app-capable` meta tag
- [x] App shortcuts defined
- [x] Splash screen
- [x] Cache strategies: Static (Cache-First), API (Network-First), Fonts (Cache-First)

---

Built by **Aaqib Jeelani** — Al-Noor Islamic App
