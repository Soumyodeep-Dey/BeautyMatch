# 💄 BeautyMatch – Smart Skin Compatibility for Beauty Products

**BeautyMatch** is a privacy-first Chrome Extension that analyzes beauty product pages (Amazon.in, Sephora, Nykaa) and shows whether a product is a **Good Match**, **Caution**, or **Not Recommended** based on the user’s skin profile.

---

## 🚀 Features

- 🧠 Smart match verdicts based on skin tone, type, and allergies  
- 🛍️ Auto-scrapes product data from supported websites  
- ✍️ Quick onboarding quiz to save your skin profile  
- 🎨 Tailwind-powered popup UI with React  
- 🔒 No backend – everything runs locally in the browser

---

## 📁 Project Structure

```
BeautyMatch/
├── public/
│   ├── manifest.json             # Chrome extension config (MV3)
│   ├── onboarding.html           # Onboarding page HTML
│   └── icons/                    # Extension icons
├── src/
│   ├── pages/
│   │   └── Onboarding.tsx        # Onboarding React component
│   ├── content/
│   │   └── scraper.ts            # Content script to scrape product info
│   ├── background/
│   │   └── background.ts         # Background service worker (MV3)
│   ├── App.tsx                   # Popup verdict UI
│   ├── main.tsx                  # React entry point
│   └── styles/                   # Tailwind CSS
├── index.html                    # Popup HTML
├── vite.config.ts                # Vite + CRXJS build config
└── README.md                     # You're here!
```

---

## 🧠 How It Works

1. **User completes onboarding quiz**  
2. Skin profile is saved to `chrome.storage.sync`  
3. On supported product pages, the extension:
   - Scrapes the product ingredients, shade, and formulation
   - Compares them with the saved skin profile
   - Displays a clear verdict in the popup

---

## 🛠 Tech Stack

- Vite + React + TypeScript
- Tailwind CSS for styling
- `@crxjs/vite-plugin` for MV3 Chrome Extension builds
- Chrome Extension APIs: `storage`, `runtime`, `scripting`

---

## 🧪 Run Locally

```bash
# Install dependencies
npm install

# Build for Chrome (creates /dist)
npm run build

# Load in Chrome:
# 1. Go to chrome://extensions
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

## 🌱 Future Ideas

* Support more e-commerce platforms
* Improve ingredient database matching
* Add dark mode or accessibility settings
* User login + syncing across devices (optional)

---

> Built with 💅 by Soumyodeep Dey and contributors.
