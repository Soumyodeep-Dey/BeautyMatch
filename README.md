# 💄 BeautyMatch – Smart Skin Compatibility for Beauty Products

**BeautyMatch** is a privacy-first Chrome Extension that analyzes beauty product pages from **Amazon.in**, **Sephora India**, and **Nykaa**, and shows whether a product is a **Good Match**, **Caution**, or **Not Recommended** based on your skin profile.

---

## 🚀 Features

* 🧠 Smart verdicts based on your skin tone, type, and allergies
* 🛍️ Automatically scrapes ingredient info from supported Indian websites
* ✍️ Quick onboarding to save your skin profile
* 🎨 Tailwind-powered popup UI with React
* 🔒 100% local – no server, no tracking, no data sharing

---

## 📁 Project Structure

```
BeautyMatch/
├── public/
│   ├── manifest.json              # Chrome extension config (MV3)
│   ├── onboarding.html            # Onboarding page HTML
│   └── icons/                     # Extension icons
├── src/
│   ├── pages/
│   │   └── Onboarding.tsx         # Onboarding React component
│   ├── content/
│   │   └── scraper.ts             # Content script to scrape product info
│   ├── background/
│   │   └── background.ts          # Background service worker (MV3)
│   ├── App.tsx                    # Verdict popup UI
│   ├── main.tsx                   # React entry point
│   └── styles/                    # Tailwind CSS
├── index.html                     # Popup HTML
├── vite.config.ts                 # Vite + CRXJS build config
└── README.md                      # You're here!
```

---

## 🧠 How It Works

1. You complete a short onboarding quiz
2. Your skin profile is saved in `chrome.storage.sync`
3. When visiting supported product pages, the extension:

   * Scrapes ingredients from the page
   * Compares them with your saved skin profile
   * Displays a personalized verdict in the popup

---

## 🛠 Tech Stack

* **Vite + React + TypeScript**
* **Tailwind CSS** for styling
* **@crxjs/vite-plugin** for Manifest V3 Chrome Extension builds
* **Chrome Extension APIs**: `storage`, `runtime`, `scripting`

---

## 🧪 Run Locally

```bash
# Install dependencies
npm install

# Build for Chrome (outputs to /dist)
npm run build

# Load in Chrome:
# 1. Visit chrome://extensions
# 2. Enable Developer Mode
# 3. Click "Load unpacked"
# 4. Select the /dist folder
```

---

## 📦 Scripts

| Command         | Description                     |
| --------------- | ------------------------------- |
| `npm run dev`   | Launches dev server for pages   |
| `npm run build` | Builds extension for production |

---

## 🌱 Future Roadmap

* Add support for more Indian and global e-commerce platforms
* Improve ingredient matching accuracy
* Add accessibility settings and dark mode
* Optional: user login and syncing across devices

---

> 🚀 Built with ❤️ by [Soumyodeep Dey](https://soumyodeep-dey.vercel.app/)
