/**
 * Generates the complete, self-contained HTML/CSS/JS for the modern Rubber Business Web Dashboard.
 * Compatible with regular desktop/mobile browsers AND Telegram WebApp (Mini App).
 */
function renderDashboardHtml(initialData = {}) {
  const serializedData = JSON.stringify(initialData).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Rubber Business • Executive Financial Dashboard</title>
  <!-- Telegram WebApp SDK -->
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <!-- Google Fonts: Inter -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
  <!-- Chart.js CDN -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>

  <style>
    :root {
      --bg-dark: #0a0e17;
      --bg-surface: #111827;
      --bg-surface-elevated: #1e293b;
      --bg-glass: rgba(17, 24, 39, 0.78);
      --border-subtle: rgba(255, 255, 255, 0.08);
      --border-accent: rgba(16, 185, 129, 0.3);
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --emerald-500: #10b981;
      --emerald-400: #34d399;
      --emerald-bg: rgba(16, 185, 129, 0.12);
      --rose-500: #f43f5e;
      --rose-400: #fb7185;
      --rose-bg: rgba(244, 63, 94, 0.12);
      --blue-500: #3b82f6;
      --blue-bg: rgba(59, 130, 246, 0.12);
      --amber-500: #f59e0b;
      --amber-bg: rgba(245, 158, 11, 0.12);
      --purple-500: #a855f7;
      --purple-bg: rgba(168, 85, 247, 0.12);
      --radius-sm: 8px;
      --radius-md: 14px;
      --radius-lg: 20px;
      --shadow-card: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
      --shadow-glow-emerald: 0 0 25px rgba(16, 185, 129, 0.25);
      --shadow-glow-rose: 0 0 25px rgba(244, 63, 94, 0.25);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-tap-highlight-color: transparent;
    }

    body {
      background-color: var(--bg-dark);
      background-image: 
        radial-gradient(circle at 15% 10%, rgba(16, 185, 129, 0.08) 0%, transparent 40%),
        radial-gradient(circle at 85% 90%, rgba(59, 130, 246, 0.06) 0%, transparent 40%);
      background-attachment: fixed;
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }

    .container {
      max-width: 1380px;
      margin: 0 auto;
      padding: 20px 24px 60px;
      width: 100%;
    }

    /* TOP HEADER */
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border-subtle);
      margin-bottom: 28px;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .brand-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35);
    }

    .brand-text h1 {
      font-size: 1.45rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      background: linear-gradient(to right, #ffffff, #cbd5e1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .brand-text p {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-top: 2px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.15);
      color: var(--emerald-400);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .status-badge.demo {
      background: rgba(245, 158, 11, 0.15);
      color: var(--amber-500);
      border-color: rgba(245, 158, 11, 0.3);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 9px 16px;
      border-radius: var(--radius-sm);
      font-size: 0.86rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid transparent;
      text-decoration: none;
      color: var(--text-main);
    }

    .btn-secondary {
      background: var(--bg-surface-elevated);
      border-color: var(--border-subtle);
    }
    .btn-secondary:hover {
      background: #283548;
      border-color: rgba(255, 255, 255, 0.18);
    }

    .btn-sheet {
      background: rgba(16, 185, 129, 0.12);
      border-color: rgba(16, 185, 129, 0.3);
      color: var(--emerald-400);
    }
    .btn-sheet:hover {
      background: rgba(16, 185, 129, 0.22);
      transform: translateY(-1px);
    }

    /* CONTROL BAR (PERIOD SELECTOR) */
    .control-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 24px;
      background: var(--bg-surface);
      padding: 12px 18px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
    }

    .period-chips {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow-x: auto;
      padding-bottom: 2px;
      -webkit-overflow-scrolling: touch;
    }

    .period-chip {
      padding: 6px 14px;
      border-radius: var(--radius-sm);
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-muted);
      background: transparent;
      border: 1px solid transparent;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.18s ease;
    }

    .period-chip:hover {
      color: var(--text-main);
      background: rgba(255, 255, 255, 0.04);
    }

    .period-chip.active {
      color: #ffffff;
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      border-color: rgba(16, 185, 129, 0.4);
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.35);
    }

    .demo-toggle-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .switch-label {
      font-size: 0.8rem;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* METRIC CARDS GRID */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 18px;
      margin-bottom: 28px;
    }

    .metric-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 20px;
      position: relative;
      overflow: hidden;
      box-shadow: var(--shadow-card);
      transition: transform 0.2s ease, border-color 0.2s ease;
    }

    .metric-card:hover {
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.15);
    }

    .metric-card.highlight {
      border-color: var(--border-accent);
      background: linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, var(--bg-surface) 100%);
      box-shadow: var(--shadow-card), var(--shadow-glow-emerald);
    }

    .metric-card.deficit {
      border-color: rgba(244, 63, 94, 0.3);
      background: linear-gradient(180deg, rgba(244, 63, 94, 0.08) 0%, var(--bg-surface) 100%);
      box-shadow: var(--shadow-card), var(--shadow-glow-rose);
    }

    .card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .card-label {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .card-icon {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 19px;
    }

    .icon-income { background: var(--emerald-bg); color: var(--emerald-400); }
    .icon-expense { background: var(--rose-bg); color: var(--rose-400); }
    .icon-net { background: var(--blue-bg); color: var(--blue-500); }
    .icon-goods { background: var(--amber-bg); color: var(--amber-500); }
    .icon-wages { background: var(--purple-bg); color: var(--purple-500); }

    .card-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 1.85rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 6px;
      line-height: 1.2;
    }

    .text-emerald { color: var(--emerald-400); }
    .text-rose { color: var(--rose-400); }

    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.78rem;
      color: var(--text-dim);
      margin-top: 4px;
    }

    .tag {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.72rem;
      font-weight: 700;
    }
    .tag-emerald { background: var(--emerald-bg); color: var(--emerald-400); }
    .tag-rose { background: var(--rose-bg); color: var(--rose-400); }

    /* CHARTS SECTION */
    .charts-grid {
      display: grid;
      grid-template-columns: 1.6fr 1fr;
      gap: 22px;
      margin-bottom: 30px;
    }

    .chart-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 22px;
      box-shadow: var(--shadow-card);
      display: flex;
      flex-direction: column;
    }

    .chart-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .chart-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .chart-subtitle {
      font-size: 0.78rem;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .chart-container {
      position: relative;
      flex: 1;
      min-height: 280px;
      max-height: 340px;
    }

    /* RECENT TRANSACTIONS TABLE SECTION */
    .table-section {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 22px;
      box-shadow: var(--shadow-card);
    }

    .table-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 14px;
      margin-bottom: 18px;
    }

    .search-input-wrap {
      position: relative;
      min-width: 260px;
    }

    .search-input {
      width: 100%;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 9px 14px 9px 36px;
      color: var(--text-main);
      font-size: 0.86rem;
      outline: none;
      transition: border-color 0.15s ease;
    }
    .search-input:focus {
      border-color: var(--emerald-400);
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-dim);
      font-size: 14px;
    }

    .filter-tabs {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .filter-tab {
      padding: 5px 12px;
      border-radius: var(--radius-sm);
      font-size: 0.78rem;
      font-weight: 600;
      background: var(--bg-surface-elevated);
      color: var(--text-muted);
      border: 1px solid transparent;
      cursor: pointer;
    }
    .filter-tab.active {
      background: rgba(16, 185, 129, 0.2);
      color: var(--emerald-400);
      border-color: rgba(16, 185, 129, 0.4);
    }

    .table-wrapper {
      overflow-x: auto;
      margin-top: 10px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.88rem;
    }

    th {
      padding: 12px 14px;
      color: var(--text-muted);
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border-subtle);
    }

    td {
      padding: 14px 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: #e2e8f0;
    }

    tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }

    .td-amount {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      white-space: nowrap;
    }

    .badge-type {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-income { background: var(--emerald-bg); color: var(--emerald-400); border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-expense { background: var(--rose-bg); color: var(--rose-400); border: 1px solid rgba(244, 63, 94, 0.3); }

    .category-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 8px;
      border-radius: 4px;
      background: var(--bg-surface-elevated);
      font-size: 0.78rem;
      color: #cbd5e1;
    }

    /* FOOTER */
    footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      color: var(--text-dim);
      font-size: 0.8rem;
    }

    /* RESPONSIVE DESIGN */
    @media (max-width: 960px) {
      .charts-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .container {
        padding: 14px 14px 40px;
      }
      .brand-text h1 {
        font-size: 1.25rem;
      }
      .metrics-grid {
        grid-template-columns: 1fr;
      }
      .header-actions {
        width: 100%;
        justify-content: space-between;
      }
    }
  </style>
</head>
<body>

  <div class="container">
    <!-- TOP HEADER -->
    <header>
      <div class="brand-group">
        <div class="brand-icon">🌳</div>
        <div class="brand-text">
          <h1>Rubber Business Finance Hub</h1>
          <p>
            <span id="connBadge" class="status-badge">🟢 Google Sheets Sync</span>
            <span id="periodBadge" style="font-weight: 600;">October 2026</span>
          </p>
        </div>
      </div>

      <div class="header-actions">
        <button id="btnRefresh" class="btn btn-secondary" onclick="fetchDashboardData()">
          <span>🔄</span> Refresh
        </button>
        <a id="sheetLink" href="#" target="_blank" class="btn btn-sheet">
          <span>📊</span> Google Sheet ↗
        </a>
      </div>
    </header>

    <!-- CONTROL BAR -->
    <div class="control-bar">
      <div class="period-chips">
        <button class="period-chip" data-period="today" onclick="selectPeriod('today')">⚡ Today</button>
        <button class="period-chip" data-period="yesterday" onclick="selectPeriod('yesterday')">Yesterday</button>
        <button class="period-chip" data-period="week" onclick="selectPeriod('week')">🗓️ Last 7 Days</button>
        <button class="period-chip active" data-period="month" onclick="selectPeriod('month')">📅 This Month</button>
        <button class="period-chip" data-period="all" onclick="selectPeriod('all')">🌐 All-Time</button>
      </div>

      <div class="demo-toggle-group">
        <label class="switch-label">
          <input type="checkbox" id="demoCheckbox" onchange="toggleDemoMode(this.checked)">
          ✨ Sample Preview Mode
        </label>
      </div>
    </div>

    <!-- METRICS GRID -->
    <div class="metrics-grid">
      <!-- Total Income -->
      <div class="metric-card">
        <div class="card-top">
          <span class="card-label">Total Revenue</span>
          <div class="card-icon icon-income">💰</div>
        </div>
        <div id="valIncome" class="card-value text-emerald">₹0.00</div>
        <div class="card-footer">
          <span>Gross cash inflow</span>
          <span id="tagIncome" class="tag tag-emerald">Inflow</span>
        </div>
      </div>

      <!-- Total Expenses -->
      <div class="metric-card">
        <div class="card-top">
          <span class="card-label">Total Expenses</span>
          <div class="card-icon icon-expense">💸</div>
        </div>
        <div id="valExpense" class="card-value text-rose">₹0.00</div>
        <div class="card-footer">
          <span>Gross cash outflow</span>
          <span id="tagExpense" class="tag tag-rose">Outflow</span>
        </div>
      </div>

      <!-- Net Cashflow -->
      <div id="cardNet" class="metric-card highlight">
        <div class="card-top">
          <span class="card-label">Net Cashflow</span>
          <div class="card-icon icon-net">💎</div>
        </div>
        <div id="valNet" class="card-value">₹0.00</div>
        <div class="card-footer">
          <span id="labelNetStatus">Cash surplus</span>
          <span id="tagNetMargin" class="tag tag-emerald">+0.0%</span>
        </div>
      </div>

      <!-- Goods Difference -->
      <div class="metric-card">
        <div class="card-top">
          <span class="card-label">Goods Net Margin</span>
          <div class="card-icon icon-goods">📦</div>
        </div>
        <div id="valGoodsDiff" class="card-value">₹0.00</div>
        <div class="card-footer">
          <span>Sales minus Purchases</span>
          <span id="tagGoodsMargin" class="tag tag-emerald">0.0%</span>
        </div>
      </div>

      <!-- Staff Wages -->
      <div class="metric-card">
        <div class="card-top">
          <span class="card-label">Staff Wages Paid</span>
          <div class="card-icon icon-wages">👷</div>
        </div>
        <div id="valWages" class="card-value">₹0.00</div>
        <div class="card-footer">
          <span>Daily tappers & labor</span>
          <span id="tagWageShare" class="tag" style="background: var(--purple-bg); color: var(--purple-500);">0% exp</span>
        </div>
      </div>
    </div>

    <!-- CHARTS SECTION -->
    <div class="charts-grid">
      <!-- Cashflow Trend -->
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">📈 Daily Cashflow Flow & Trend</div>
            <div class="chart-subtitle">Revenue inflows vs Operational expenditures over time</div>
          </div>
        </div>
        <div class="chart-container">
          <canvas id="trendChart"></canvas>
        </div>
      </div>

      <!-- Expense Composition -->
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">🍩 Expense Distribution</div>
            <div class="chart-subtitle">Breakdown by categories & operations</div>
          </div>
        </div>
        <div class="chart-container">
          <canvas id="categoryChart"></canvas>
        </div>
      </div>
    </div>

    <!-- RECENT TRANSACTIONS TABLE SECTION -->
    <div class="table-section">
      <div class="table-header-row">
        <div>
          <h2 style="font-size: 1.15rem; font-weight: 700;">Recent Ledger Entries</h2>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
            Showing transactions recorded in your ledger
          </p>
        </div>

        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <div class="search-input-wrap">
            <span class="search-icon">🔍</span>
            <input type="text" id="txSearch" class="search-input" placeholder="Search customer, note, worker..." oninput="filterTransactions()">
          </div>

          <div class="filter-tabs">
            <button class="filter-tab active" data-type="all" onclick="setTxTypeFilter('all')">All</button>
            <button class="filter-tab" data-type="income" onclick="setTxTypeFilter('income')">Income</button>
            <button class="filter-tab" data-type="expense" onclick="setTxTypeFilter('expense')">Expenses</button>
            <button class="filter-tab" data-type="wages" onclick="setTxTypeFilter('wages')">Wages</button>
          </div>
        </div>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Customer / Purpose</th>
              <th>Employee</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody id="txTableBody">
            <!-- Dynamically populated -->
          </tbody>
        </table>
      </div>
    </div>

    <!-- FOOTER -->
    <footer>
      <div>🌳 Rubber Business Telegram Accounting Bot • Executive Dashboard</div>
      <div>Real-time sync with Google Sheets Ledger</div>
    </footer>
  </div>

  <script>
    // Initial state injected from server
    let currentData = ${serializedData};
    let activePeriod = 'month';
    let forceDemo = currentData.isDemo || false;
    let typeFilter = 'all';

    // Chart.js instances
    let trendChartInstance = null;
    let categoryChartInstance = null;

    // Currency Formatter
    const inrFormatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    function formatINR(val) {
      return inrFormatter.format(Number(val) || 0);
    }

    // Telegram WebApp initialization
    window.addEventListener('DOMContentLoaded', () => {
      if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        try {
          tg.setHeaderColor('#0a0e17');
          tg.setBackgroundColor('#0a0e17');
        } catch (e) {}
      }

      // Sync checkbox
      const demoBox = document.getElementById('demoCheckbox');
      if (demoBox) demoBox.checked = forceDemo;

      // Render initial view
      updateDashboardUI(currentData);
    });

    function triggerHaptic() {
      if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
      }
    }

    // Switch period
    async function selectPeriod(period) {
      triggerHaptic();
      activePeriod = period;
      document.querySelectorAll('.period-chip').forEach(chip => {
        chip.classList.toggle('active', chip.getAttribute('data-period') === period);
      });
      await fetchDashboardData();
    }

    function toggleDemoMode(val) {
      triggerHaptic();
      forceDemo = val;
      fetchDashboardData();
    }

    // Fetch dashboard data via API
    async function fetchDashboardData() {
      const btn = document.getElementById('btnRefresh');
      if (btn) btn.classList.add('loading');

      try {
        const url = \`/api/dashboard/stats?period=\${encodeURIComponent(activePeriod)}&demo=\${forceDemo ? '1' : '0'}\`;
        const res = await fetch(url);
        const data = await res.json();
        if (data && data.success) {
          currentData = data;
          updateDashboardUI(data);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        if (btn) btn.classList.remove('loading');
      }
    }

    // Update UI elements with new dataset
    function updateDashboardUI(data) {
      // 1. Connection & Sheet Info
      const connBadge = document.getElementById('connBadge');
      if (connBadge) {
        if (data.isDemo) {
          connBadge.className = 'status-badge demo';
          connBadge.textContent = '✨ Sample Preview';
        } else {
          connBadge.className = 'status-badge';
          connBadge.textContent = '🟢 Google Sheets Sync';
        }
      }

      const periodBadge = document.getElementById('periodBadge');
      if (periodBadge) periodBadge.textContent = data.periodLabel || 'This Month';

      const sheetLink = document.getElementById('sheetLink');
      if (sheetLink && data.spreadsheetUrl) sheetLink.href = data.spreadsheetUrl;

      // 2. Metrics Cards
      document.getElementById('valIncome').textContent = formatINR(data.totalIncome);
      document.getElementById('valExpense').textContent = formatINR(data.totalExpenses);

      const net = data.netCashflow || 0;
      const netValElem = document.getElementById('valNet');
      const cardNet = document.getElementById('cardNet');
      const labelNetStatus = document.getElementById('labelNetStatus');
      const tagNetMargin = document.getElementById('tagNetMargin');

      netValElem.textContent = (net >= 0 ? '+' : '') + formatINR(net);

      if (net >= 0) {
        cardNet.className = 'metric-card highlight';
        netValElem.className = 'card-value text-emerald';
        labelNetStatus.textContent = 'Cash Surplus';
        tagNetMargin.className = 'tag tag-emerald';
        tagNetMargin.textContent = \`+\${data.kpis?.netMarginPercent || 0}%\`;
      } else {
        cardNet.className = 'metric-card deficit';
        netValElem.className = 'card-value text-rose';
        labelNetStatus.textContent = 'Cash Deficit';
        tagNetMargin.className = 'tag tag-rose';
        tagNetMargin.textContent = \`\${data.kpis?.netMarginPercent || 0}%\`;
      }

      const goodsDiff = data.goodsDifference || 0;
      const valGoodsDiff = document.getElementById('valGoodsDiff');
      const tagGoodsMargin = document.getElementById('tagGoodsMargin');
      valGoodsDiff.textContent = (goodsDiff >= 0 ? '+' : '') + formatINR(goodsDiff);
      valGoodsDiff.className = goodsDiff >= 0 ? 'card-value text-emerald' : 'card-value text-rose';
      tagGoodsMargin.className = goodsDiff >= 0 ? 'tag tag-emerald' : 'tag tag-rose';
      tagGoodsMargin.textContent = \`\${data.kpis?.goodsProfitMargin || 0}% margin\`;

      document.getElementById('valWages').textContent = formatINR(data.staffWages);
      document.getElementById('tagWageShare').textContent = \`\${data.kpis?.wageExpenseRatio || 0}% of exp\`;

      // 3. Render Charts
      renderCharts(data);

      // 4. Render Table
      renderTable(data.transactions || []);
    }

    // Chart.js rendering
    function renderCharts(data) {
      const series = data.chartSeries || { labels: [], income: [], expense: [] };

      // --- Chart 1: Cashflow Trend ---
      const trendCtx = document.getElementById('trendChart')?.getContext('2d');
      if (trendCtx) {
        if (trendChartInstance) trendChartInstance.destroy();

        trendChartInstance = new Chart(trendCtx, {
          type: 'bar',
          data: {
            labels: series.labels.length > 0 ? series.labels : ['No data'],
            datasets: [
              {
                label: 'Income (₹)',
                data: series.income.length > 0 ? series.income : [0],
                backgroundColor: 'rgba(16, 185, 129, 0.75)',
                borderRadius: 6,
                maxBarThickness: 32
              },
              {
                label: 'Expenses (₹)',
                data: series.expense.length > 0 ? series.expense : [0],
                backgroundColor: 'rgba(244, 63, 94, 0.75)',
                borderRadius: 6,
                maxBarThickness: 32
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 12 } }
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => \`\${ctx.dataset.label}: \${formatINR(ctx.raw)}\`
                }
              }
            },
            scales: {
              x: {
                ticks: { color: '#64748b' },
                grid: { display: false }
              },
              y: {
                ticks: {
                  color: '#64748b',
                  callback: (val) => '₹' + val.toLocaleString('en-IN')
                },
                grid: { color: 'rgba(255, 255, 255, 0.05)' }
              }
            }
          }
        });
      }

      // --- Chart 2: Category Breakdown (Doughnut) ---
      const catCtx = document.getElementById('categoryChart')?.getContext('2d');
      if (catCtx) {
        if (categoryChartInstance) categoryChartInstance.destroy();

        const expCats = data.expenseCategoryBreakdown || {};
        const labels = Object.keys(expCats);
        const values = Object.values(expCats);

        const palette = [
          '#10b981', '#f43f5e', '#3b82f6', '#f59e0b', '#a855f7', '#06b6d4', '#eab308'
        ];

        categoryChartInstance = new Chart(catCtx, {
          type: 'doughnut',
          data: {
            labels: labels.length > 0 ? labels : ['No expenses'],
            datasets: [{
              data: values.length > 0 ? values : [1],
              backgroundColor: labels.length > 0 ? palette.slice(0, labels.length) : ['#334155'],
              borderWidth: 2,
              borderColor: '#111827'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
              legend: {
                position: 'bottom',
                labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 }, boxWidth: 12 }
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => \` \${ctx.label}: \${formatINR(ctx.raw)}\`
                }
              }
            }
          }
        });
      }
    }

    // Filter transactions by type
    function setTxTypeFilter(type) {
      triggerHaptic();
      typeFilter = type;
      document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-type') === type);
      });
      filterTransactions();
    }

    // Live search & type filtering for table
    function filterTransactions() {
      const query = (document.getElementById('txSearch')?.value || '').toLowerCase().trim();
      const txs = currentData.transactions || [];

      const filtered = txs.filter(tx => {
        const matchesType = 
          typeFilter === 'all' ||
          (typeFilter === 'income' && (tx.type || '').toLowerCase() === 'income') ||
          (typeFilter === 'expense' && (tx.type || '').toLowerCase() === 'expense') ||
          (typeFilter === 'wages' && (tx.category || '').toLowerCase() === 'staff wages');

        if (!matchesType) return false;

        if (!query) return true;

        const textPool = [
          tx.date,
          tx.category,
          tx.sourceOrPurpose,
          tx.employeeName,
          tx.description,
          tx.amount
        ].join(' ').toLowerCase();

        return textPool.includes(query);
      });

      renderTable(filtered);
    }

    // Render Table rows
    function renderTable(txs) {
      const tbody = document.getElementById('txTableBody');
      if (!tbody) return;

      if (!txs || txs.length === 0) {
        tbody.innerHTML = \`
          <tr>
            <td colspan="7" style="text-align: center; padding: 36px; color: var(--text-dim);">
              No transactions found matching your criteria.
            </td>
          </tr>
        \`;
        return;
      }

      tbody.innerHTML = txs.map(tx => {
        const isIncome = (tx.type || '').toLowerCase() === 'income';
        const typeBadge = isIncome
          ? '<span class="badge-type badge-income">Income</span>'
          : '<span class="badge-type badge-expense">Expense</span>';
        const amtClass = isIncome ? 'text-emerald' : 'text-rose';
        const amtSign = isIncome ? '+' : '-';

        return \`
          <tr>
            <td style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--text-muted);">\${tx.date || '-'}</td>
            <td>\${typeBadge}</td>
            <td><span class="category-chip">\${tx.category || '-'}</span></td>
            <td class="td-amount \${amtClass}">\${amtSign}\${formatINR(tx.amount)}</td>
            <td>\${tx.sourceOrPurpose || '-'}</td>
            <td>\${tx.employeeName || '-'}</td>
            <td style="color: var(--text-muted); font-size: 0.82rem;">\${tx.description || tx.travelDetails || '-'}</td>
          </tr>
        \`;
      }).join('');
    }
  </script>
</body>
</html>`;
}

module.exports = { renderDashboardHtml };
