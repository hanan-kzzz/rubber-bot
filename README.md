# 🌳 Rubber Business Telegram Income & Expense Tracker Bot

A complete, production-ready Telegram accounting tracker designed specifically for rubber business owners and authorized staff. Built with **Node.js**, **Telegraf**, and **Google Sheets** (via a secure Google Apps Script Web App), ready for 24/7 deployment on **Render**.

---

## 📑 Table of Contents

- [Features](#-features)
- [Project Architecture](#-project-architecture)
- [Folder Structure](#-folder-structure)
- [Android Mobile Setup Guide (No Laptop Required)](#-android-mobile-setup-guide-no-laptop-required)
  - [Step 1: Create Telegram Bot via BotFather](#step-1-create-telegram-bot-via-botfather)
  - [Step 2: Obtain Numeric Telegram User IDs](#step-2-obtain-numeric-telegram-user-ids)
  - [Step 3: Setup Google Sheet & Google Apps Script](#step-3-setup-google-sheet--google-apps-script)
  - [Step 4: Create GitHub Repository on Mobile](#step-4-create-github-repository-on-mobile)
  - [Step 5: Deploy on Render from Mobile](#step-5-deploy-on-render-from-mobile)
- [Environment Variables](#-environment-variables)
- [Testing & Verification Checklist](#-testing--verification-checklist)
- [Free Tier Limitations & Hosting Details](#-free-tier-limitations--hosting-details)
- [Troubleshooting Common Issues](#-troubleshooting-common-issues)

---

## 🚀 Features

- **👑 Attractive Executive Dashboard (In Telegram & Web App):**
  - **In-Telegram Dashboard (`/dashboard`):**
    - High-impact visual overview with box-drawing cards, color-coded badges (🟢 Surplus / 🔴 Deficit), and ASCII/emoji inflow-outflow balance bars (`[🟩🟩🟩🟩🟩🟩🟩🟥🟥🟥] 70% Inflow`).
    - One-tap period switchers: `⚡ Today`, `🗓️ Last 7 Days`, `📅 This Month`, `🌐 All-Time`.
    - Deep-dive buttons for `📦 Goods Trade` and `👷 Staff Wages` ledger breakdown.
    - One-tap launcher button to open the full visual Web App directly inside Telegram or in any browser.
  - **Modern Responsive Web Dashboard (`/dashboard` & `/webapp`):**
    - Built-in glassmorphism dark theme designed specifically for the rubber estate business.
    - Interactive **Chart.js** data visualizations: Daily Cashflow Trend (Grouped Bar chart) and Operational Expense Distribution (Doughnut chart).
    - Real-time KPI cards: Total Revenue, Total Expenses, Net Cashflow (with dynamic glow), Goods Net Margin, Staff Wages Paid, and Travel costs.
    - Interactive Ledger table with instant live search and category/type filter chips (`All`, `Income`, `Expenses`, `Wages`).
    - Seamless **Telegram Mini App (WebApp)** integration with haptic feedback and responsive mobile/desktop viewports.
    - Instant Live Google Sheets Sync with automatic fallback to rich sample demo preview data.
- **24/7 Persistent Docked Bottom Keyboard (ReplyKeyboardMarkup):**
  - Pinned right below the message input box 24/7 on Telegram Desktop and Mobile — no scrolling back up or typing `/start`.
  - Balanced multi-row layout: Primary Actions (`➕ Add Income`, `➖ Add Expense`), Operations (`👷 Staff Wages`, `🚗 Travel Expenses`, `📦 Goods Summary`), Reports (`📊 Daily Report`, `📅 Monthly Report`, `📄 Recent Records`), and Hubs (`📥 Excel & AI Prompts`, `👑 Executive Hub`, `👥 Customers`, `👷 Employees`, `❌ Cancel / Reset`).
  - Seamless instant-switch triggers: tapping any button immediately launches that flow or resets any active entry.
- **Clickable Inline Keyboard Interface:** Dynamic in-chat menus for date pickers, customer select, categories, and payment statuses.
- **Categorized Income Management with Payment Status:**
  - Rubber Sales, Goods Income, Customer Payments, Other Income.
  - **Payment Status Tracking:** Mark each income transaction as `✅ Fully Paid`, `⏳ Not Paid (Unpaid / Parcel Due)`, or `📦 Partial / Parcel Paid`.
  - For partial payments, enter the amount received now; the remaining balance is automatically calculated and tracked as customer due.
  - Indian Rupee (`₹`) input validation, customer name, date selection, optional description, review card.
- **Transaction Deletion / Removal (`/delete` & In-Bot Interface):**
  - Delete mistaken transaction records (Income, Expense, Wages, Goods, Travel) directly from Telegram.
  - Accessible via `/delete [TX_ID]`, `/recent`, or the `🗑️ Delete / Remove an Entry` button with safety confirmation dialog.
  - Permanently deletes the corresponding row in your Google Sheets ledger.
- **Categorized Expense Management:**
  - Goods Purchases (Rubber-related goods, Raw materials, Supplies, Other goods).
  - Refreshments (Tea powder, Sugar, Coffee powder, Food).
  - Utilities & Maintenance (LED & electrical, Cleaning supplies, Maintenance).
  - Miscellaneous expenses.
- **Dedicated Staff Daily Wages Flow:**
  - Select active workers from Google Sheets or type new worker name.
  - Record actual daily wage amount paid (no forced predefined salaries).
  - Date and work notes.
- **Dedicated Travel Expenses Flow:**
  - Driver/worker name, travel route (Start ➔ Destination), travel purpose, amount, and date.
- **Goods Transactions Hub:**
  - Separately tracks Goods Income and Goods Purchase Expenses.
  - Displays Goods Difference (`Goods Income − Goods Purchases`) for today or current month.
- **Financial Reports & Calculations (IST Timezone):**
  - **Daily Report:** Today's income, expenses, net cashflow, goods difference, wages, travel, other expenses, transaction count.
  - **Monthly Report:** Comprehensive figures for current month.
  - **Custom Date Report:** Select any start and end date (`YYYY-MM-DD`).
  - Clear **Net Cashflow** definition (`Total Income − Total Expenses`).
- **Dedicated Customer Directory, Balances & Dues Tracking:**
  - Registered customers and buyers appear as quick one-tap buttons when entering income.
  - Any new customer name entered during income recording is automatically saved to the `Customers` sheet.
  - **Outstanding Balances & Dues Hub (`/dues`):** View all customers with unpaid balances or parcel dues, with total pending receivables across your business.
  - Admin-only menu to view customer directory, check individual customer billing vs received totals, add new customers, and toggle Active/Inactive status.
- **Owner-Controlled Employee Management:**
  - Admin-only buttons to add workers, view directory, toggle Active/Inactive status, and view recorded wage breakdowns.
- **Strict Role-Based Security:**
  - Telegram numeric IDs only (usernames are not used for authentication).
  - Owner gets admin privileges; authorized staff can record transactions and view reports.
  - Unrecognized users are locked out and informed of their numeric ID.
- **AI Model Analysis & Direct Google Sheet Link:**
  - One-tap button to open Google Spreadsheet directly on mobile or web.
  - Ready-to-use expert AI prompts formatted with one-tap copy for ChatGPT, Gemini, or Claude.
  - Prompts include: Full Financial & Profit Audit, Customer Sales & Concentration, Staff Daily Wages & Labor Variance, Goods Merchandise Margins, and Expense Optimization & Cost Leakage.
- **Auto-Initializing Google Sheets Ledger:**
  - Automatically creates and formats `Transactions`, `Employees`, `Customers`, and `Categories` sheets with freeze rows, color headers, and INR formatting.

---

## 🏗️ Project Architecture

```
Telegram App (User / Staff)
        │
        ▼ (HTTPS Webhook or Long Polling)
Express + Telegraf Backend (Node.js on Render)
        │
        ▼ (HTTPS POST with SCRIPT_SECRET)
Google Apps Script Web App (Code.gs)
        │
        ▼ (SpreadsheetApp Service)
Google Sheets Ledger (Transactions, Employees, Categories)
```

---

## 📁 Folder Structure

```
rubber-bot/
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore file for secrets and dependencies
├── package.json              # Project metadata and dependencies
├── render.yaml               # Render infrastructure blueprint
├── README.md                 # Complete documentation & mobile setup guide
├── google-apps-script/
│   └── Code.gs               # Complete Google Apps Script ledger backend
├── src/
│   ├── index.js              # Server entry point, Telegraf bot & Express setup
│   ├── config/
│   │   └── config.js         # Configuration loader & business categories
│   ├── middleware/
│   │   └── auth.js           # Numeric Telegram ID authorization middleware
│   ├── services/
│   │   ├── sheetsService.js  # Client for Google Apps Script Web App
│   │   └── sessionStore.js   # Conversational state machine with auto-expiry
│   ├── keyboards/
│   │   └── inlineKeyboards.js# Reusable Telegram inline button layouts
│   ├── handlers/
│   │   ├── menuHandler.js    # /start, main menu, and help system
│   │   ├── incomeHandler.js  # Add Income wizard
│   │   ├── expenseHandler.js # Add Expense wizard
│   │   ├── wagesHandler.js   # Staff Wages wizard
│   │   ├── travelHandler.js  # Travel Expenses wizard
│   │   ├── goodsHandler.js   # Goods transactions summary & shortcuts
│   │   ├── reportHandler.js  # Daily, Monthly & Custom date reports
│   │   ├── employeeHandler.js# Admin worker directory & wage summaries
│   │   └── recentHandler.js  # Recent transactions viewer
│   └── utils/
│       ├── formatter.js      # Currency (₹), IST Date & Card formatters
│       ├── idGenerator.js    # Unique transaction ID generator
│       └── logger.js         # Structured logger with IST timestamps
└── test/
    └── bot.test.js           # Unit test suite
```

---

## 📱 Android Mobile Setup Guide (No Laptop Required)

You can complete this entire setup on an Android phone using Chrome and the Telegram app.

---

### Step 1: Create Telegram Bot via BotFather

1. Open the **Telegram** app on your phone.
2. Search for `@BotFather` (verified checkmark) and tap **Start**.
3. Send the command:
   ```
   /newbot
   ```
4. Enter a display name for your bot (e.g. `My Rubber Business Tracker`).
5. Enter a unique username ending in `bot` (e.g. `rubber_kerala_biz_bot`).
6. BotFather will reply with your **Bot Token** formatted like:
   ```
   7123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   ```
7. Copy this token and save it in a secure note on your phone.

---

### Step 2: Obtain Numeric Telegram User IDs

1. In Telegram, search for `@userinfobot` or `@raw_data_bot` and tap **Start**.
2. The bot will immediately reply with your **Id** (a 9 or 10 digit number, e.g., `987654321`).
3. This number is your **`OWNER_ID`**.
4. Ask your authorized staff members to start `@userinfobot` and send you their numeric IDs.
5. These IDs will become your **`ALLOWED_STAFF_IDS`** (separated by commas).

---

### Step 3: Setup Google Sheet & Google Apps Script

1. Open **Google Chrome** on your Android phone.
2. Go to [https://sheets.new](https://sheets.new) to create a new blank Google Sheet.
3. Rename the spreadsheet to `Rubber Business Ledger`.
4. In Chrome, tap the **three dots menu (⋮)** in the top right corner and check **"Desktop site"**.
   > *Note:* Desktop mode is required to access the "Extensions" menu on a phone.
5. In the top menu bar, tap **Extensions ➔ Apps Script**. A new tab opens with the Apps Script editor.
6. Delete any existing template code inside `Code.gs`.
7. Open [`google-apps-script/Code.gs`](google-apps-script/Code.gs), copy the entire code, and paste it into the editor.
8. (Optional) In line 27 of `Code.gs`, verify or change `SCRIPT_SECRET`:
   ```javascript
   var SCRIPT_SECRET = "my_secure_rubber_bot_secret_2026";
   ```
9. Tap the **Save (💾)** icon at the top of the editor.
10. **Initialize the Sheets:**
    - Above the code, locate the function dropdown (it usually shows `myFunction` or `setupSheets`).
    - Select **`setupSheets`**.
    - Tap **Run**.
    - A popup will ask for permissions. Tap **Review permissions** ➔ Choose your Google Account ➔ Tap **Advanced** ➔ Tap **Go to Untitled project (unsafe)** ➔ Tap **Allow**.
    - Once execution finishes, return to your Google Sheet tab. You will see 3 beautifully styled sheets: `Transactions`, `Employees`, and `Categories`!
11. **Deploy as Web App:**
    - In Apps Script, tap the blue **Deploy** button (top right) ➔ **New deployment**.
    - Tap the **Gear icon (⚙️)** next to "Select type" ➔ Select **Web app**.
    - Fill out the settings:
      - **Description:** `Rubber Bot Backend`
      - **Execute as:** `Me (your_email@gmail.com)`
      - **Who has access:** `Anyone` *(Crucial: This allows the Render backend to reach the script using the secret key)*.
    - Tap **Deploy**.
    - Copy the **Web App URL** (it ends with `/exec`). Save this URL.

---

### Step 4: Create GitHub Repository on Mobile

1. Open Chrome on your phone and log in to [https://github.com](https://github.com).
2. Tap the **+** icon in the top right ➔ **New repository**.
3. Name it `rubber-business-bot`, set it to **Private** (or Public), and tap **Create repository**.
4. To upload the code files:
   - On the repository page, tap **Add file ➔ Upload files**.
   - Select the files from your phone's file manager or download folder.
   - Alternatively, use Termux or git clone if you use a mobile terminal.

---

### Step 5: Deploy on Render from Mobile

1. Go to [https://render.com](https://render.com) in your mobile browser and sign up/log in (you can sign in with your GitHub account).
2. On your Render Dashboard, tap **New + ➔ Web Service**.
3. Select **Build and deploy from a Git repository** ➔ Choose your `rubber-business-bot` repository.
4. Configure the service:
   - **Name:** `rubber-bot`
   - **Region:** `Singapore` or closest to India
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
5. Scroll down to **Environment Variables** and add the following keys:

| Key | Value | Description |
|---|---|---|
| `BOT_TOKEN` | `7123456789:ABCdef...` | Token from @BotFather |
| `OWNER_ID` | `987654321` | Your numeric Telegram ID |
| `ALLOWED_STAFF_IDS` | `112233445,998877665` | Staff numeric IDs (comma-separated) |
| `GOOGLE_SCRIPT_URL` | `https://script.google.com/macros/s/.../exec` | Deployment URL from Step 3 |
| `GOOGLE_SCRIPT_SECRET`| `my_secure_rubber_bot_secret_2026` | Matches secret in `Code.gs` |

6. Tap **Create Web Service**.
7. Render will build and deploy the bot. Within 2-3 minutes, the status will show **Live**!
8. When running on Render, the backend automatically detects `RENDER_EXTERNAL_URL` and configures the Telegram webhook with zero extra effort.

---

## ⚙️ Environment Variables

A template file [`.env.example`](.env.example) is included in the project:

```env
BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
OWNER_ID=123456789
ALLOWED_STAFF_IDS=987654321,555444333
GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/AKfycbxXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/exec
GOOGLE_SCRIPT_SECRET=my_secure_rubber_bot_secret_2026
PORT=3000
WEBHOOK_DOMAIN=
```

---

## ✅ Testing & Verification Checklist

Once deployed, open your bot in Telegram and run this checklist:

- [ ] **Start Bot:** Send `/start`. The welcome message and inline buttons should appear.
- [ ] **Unauthorized Test:** Have a friend or secondary account send `/start`. The bot must reply with `⛔ Access Denied` and show their Telegram numeric ID.
- [ ] **Add Income:**
  1. Tap `➕ Add Income`.
  2. Select `🌳 Rubber Sales`.
  3. Enter `45000`.
  4. Enter customer name: `Kottayam Rubber Traders`.
  5. Select `📅 Today`.
  6. Tap `⏭️ Skip Note`.
  7. Check the review card and tap `✅ Confirm & Save`.
  8. Open your Google Sheet; verify the transaction appeared in the `Transactions` sheet with ID `TXN-INC-...`.
- [ ] **Add Goods Purchase:**
  1. Tap `➖ Add Expense` ➔ `📦 Goods & Purchases` ➔ `Rubber-related purchases`.
  2. Enter `12000`.
  3. Enter vendor name: `Estate Tools Supply`.
  4. Select `📅 Today`.
  5. Tap `✅ Confirm & Save`.
- [ ] **Goods Transactions Hub:**
  1. Tap `📦 Goods Transactions`.
  2. Verify Goods Income shows `₹45,000.00`, Goods Purchases shows `₹12,000.00`, and Goods Difference shows `₹33,000.00`.
- [ ] **Staff Wages:**
  1. Tap `👥 Manage Employees (Admin)` ➔ `➕ Add New Employee`.
  2. Enter worker name: `Raju`.
  3. Return to Main Menu ➔ Tap `👷 Staff Wages`.
  4. Worker `👤 Raju` should appear as a clickable button!
  5. Tap `👤 Raju`, enter wage `950`, choose `Today`, add note `Tapping work`, and confirm.
- [ ] **Travel Expense:**
  1. Tap `🚗 Travel Expenses`.
  2. Pick worker `👤 Raju`.
  3. Enter route: `Estate to Town Center`.
  4. Enter purpose: `Collect tapping knives & acid`.
  5. Enter amount: `350`. Confirm and save.
- [ ] **Reports:**
  1. Tap `📊 Daily Report`. Verify Total Income, Total Expenses, Net Cashflow, and breakdown match the recorded entries.
  2. Tap `📅 Monthly Report`.
  3. Tap `📋 Custom Date Report`. Enter today's date for start and end; verify report accuracy.
- [ ] **Recent Transactions:**
  1. Tap `📄 Recent Records`. Verify the last recorded entries are displayed with details.

---

## 💡 Free Tier Limitations & Hosting Details

### 1. Render Free Tier Web Service
- **Cost:** Free.
- **Sleep Behavior:** Free web services spin down (sleep) after 15 minutes of inactivity. When a user sends a message, Telegram's webhook wakes up the service. The first response after waking may take 25–45 seconds; subsequent messages are instant.
- **Monthly Limit:** Render provides 750 free hours per month (sufficient to keep one web service alive continuously).
- **Zero Cost Guarantee:** Render does not require a credit card for free tier accounts.

### 2. Google Apps Script & Google Sheets
- **Cost:** 100% Free with any personal Google account.
- **Quotas:**
  - URL Fetch calls: 20,000 requests/day (far exceeds standard business requirements).
  - Script runtime: 6 minutes per single execution (our calls complete in ~0.5–1.5 seconds).
  - Google Sheet storage: Up to 10 million cells (enough for hundreds of thousands of transactions).

### 3. Telegram Bot API
- **Cost:** Free forever. No message count limits for business accounting usage.

---

## 🛠️ Troubleshooting Common Issues

### Issue 1: "Access Denied. You are not authorized."
- **Cause:** Your Telegram numeric user ID is not configured in `OWNER_ID` or `ALLOWED_STAFF_IDS`.
- **Fix:** Copy the numeric ID shown in the error message, go to Render ➔ Environment Variables, update `OWNER_ID` with that number, and tap **Save Changes**.

### Issue 2: "Google Apps Script URL is not configured."
- **Cause:** `GOOGLE_SCRIPT_URL` is empty or incorrect.
- **Fix:** Ensure you deployed the script as a **Web App**, set **Who has access** to **Anyone**, and copied the URL ending in `/exec`.

### Issue 3: "Unauthorized: Invalid secret token"
- **Cause:** The `GOOGLE_SCRIPT_SECRET` in Render does not match `SCRIPT_SECRET` in `Code.gs`.
- **Fix:** Ensure both values are identical (default: `my_secure_rubber_bot_secret_2026`).

### Issue 4: Bot does not respond on Telegram
- **Cause:** Render web service is building, crashed, or incorrect `BOT_TOKEN`.
- **Fix:** Open Render ➔ Click your service ➔ Check **Logs**. Look for errors. If the log displays `BOT_TOKEN is missing`, paste the correct token from @BotFather in Environment Variables.

### Issue 5: Changes to Google Apps Script not taking effect
- **Cause:** After editing `Code.gs`, you must deploy a new version.
- **Fix:** In Apps Script, tap **Deploy ➔ Manage deployments ➔ Edit (pencil icon) ➔ Version: New version ➔ Deploy**.

---

## 📜 License

MIT License. Free for commercial and personal business use.
