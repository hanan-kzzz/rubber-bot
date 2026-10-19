const { test, describe } = require('node:test');
const assert = require('node:assert');

const {
  formatINR,
  getTodayIST,
  getYesterdayIST,
  isValidDateString,
  formatTransactionSummary,
  formatReportSummary,
  formatGoodsSummary
} = require('../src/utils/formatter');

const { generateTransactionId } = require('../src/utils/idGenerator');
const sessionStore = require('../src/services/sessionStore');
const config = require('../src/config/config');

describe('Formatting & Validation Utilities', () => {
  test('formatINR correctly formats currency in Indian Rupees', () => {
    const formatted = formatINR(125000);
    assert.match(formatted, /1,25,000/);
    assert.match(formatted, /₹/);
  });

  test('formatINR handles decimals and zero', () => {
    assert.match(formatINR(0), /0\.00/);
    assert.match(formatINR(450.5), /450\.50/);
  });

  test('isValidDateString validates YYYY-MM-DD properly', () => {
    assert.strictEqual(isValidDateString('2026-10-18'), true);
    assert.strictEqual(isValidDateString('2026-02-28'), true);
    assert.strictEqual(isValidDateString('2026-13-01'), false); // Invalid month
    assert.strictEqual(isValidDateString('2026-04-31'), false); // Invalid day (April has 30 days)
    assert.strictEqual(isValidDateString('18-10-2026'), false); // Wrong format
    assert.strictEqual(isValidDateString('invalid'), false);
  });

  test('getTodayIST and getYesterdayIST return valid dates', () => {
    const today = getTodayIST();
    const yesterday = getYesterdayIST();
    assert.strictEqual(isValidDateString(today), true);
    assert.strictEqual(isValidDateString(yesterday), true);
    assert.notStrictEqual(today, yesterday);
  });
});

describe('ID Generator', () => {
  test('generateTransactionId creates valid unique IDs', () => {
    const incomeId = generateTransactionId('income');
    const expenseId = generateTransactionId('expense');

    assert.match(incomeId, /^TXN-INC-\d{8}-\d{4}$/);
    assert.match(expenseId, /^TXN-EXP-\d{8}-\d{4}$/);
    assert.notStrictEqual(incomeId, generateTransactionId('income'));
  });
});

describe('Session Store', () => {
  test('set, get, update, and clear operations', () => {
    const userId = 99999999;
    sessionStore.set(userId, 'INCOME', 'AWAITING_AMOUNT', { category: 'Rubber Sales' });

    let s = sessionStore.get(userId);
    assert.strictEqual(s.flow, 'INCOME');
    assert.strictEqual(s.step, 'AWAITING_AMOUNT');
    assert.strictEqual(s.data.category, 'Rubber Sales');

    sessionStore.update(userId, { step: 'AWAITING_SOURCE', data: { amount: 50000 } });
    s = sessionStore.get(userId);
    assert.strictEqual(s.step, 'AWAITING_SOURCE');
    assert.strictEqual(s.data.amount, 50000);
    assert.strictEqual(s.data.category, 'Rubber Sales');

    sessionStore.clear(userId);
    assert.strictEqual(sessionStore.get(userId), null);
  });
});

describe('Report and Summary Formatting', () => {
  test('formatReportSummary computes net cashflow and formats report', () => {
    const mockReport = {
      startDate: '2026-10-01',
      endDate: '2026-10-18',
      totalIncome: 100000,
      totalExpenses: 40000,
      netCashflow: 60000,
      goodsIncome: 25000,
      goodsPurchases: 15000,
      goodsDifference: 10000,
      staffWages: 15000,
      travelExpenses: 5000,
      otherExpenses: 5000,
      transactionCount: 12
    };

    const formatted = formatReportSummary(mockReport, 'Monthly Report');
    assert.match(formatted, /Total Income/);
    assert.match(formatted, /1,00,000/);
    assert.match(formatted, /40,000/);
    assert.match(formatted, /Net Cashflow/);
    assert.match(formatted, /60,000/);
    assert.match(formatted, /Goods Difference/);
  });

  test('formatGoodsSummary displays goods income, purchase and difference', () => {
    const mockReport = {
      goodsIncome: 50000,
      goodsPurchases: 20000,
      goodsDifference: 30000
    };

    const formatted = formatGoodsSummary(mockReport, 'October 2026');
    assert.match(formatted, /Goods Transactions Summary/);
    assert.match(formatted, /50,000/);
    assert.match(formatted, /20,000/);
    assert.match(formatted, /30,000/);
  });
});

describe('Customer Keyboards & Services', () => {
  const inlineKeyboards = require('../src/keyboards/inlineKeyboards');
  const sheetsService = require('../src/services/sheetsService');

  test('mainMenu includes customer management button for owner', () => {
    const ownerMenu = inlineKeyboards.mainMenu(true);
    const buttonsFlat = ownerMenu.reply_markup.inline_keyboard.flat();
    const custBtn = buttonsFlat.find(b => b.callback_data === 'menu_customers');
    assert.ok(custBtn, 'Customer management button should be in owner main menu');
    assert.match(custBtn.text, /Customers/);
  });

  test('customerManagement keyboard renders management options', () => {
    const kb = inlineKeyboards.customerManagement();
    const buttonsFlat = kb.reply_markup.inline_keyboard.flat();
    assert.ok(buttonsFlat.some(b => b.callback_data === 'cust_action_add'));
    assert.ok(buttonsFlat.some(b => b.callback_data === 'cust_action_list'));
    assert.ok(buttonsFlat.some(b => b.callback_data === 'cust_action_toggle'));
  });

  test('customerSelection keyboard builds buttons and stays under 64 bytes limit', () => {
    const mockCustomers = [
      { id: 'CUST-001', name: 'Very Long Customer Company Name International Private Limited' },
      { id: 'CUST-002', name: 'Kottayam Rubber' }
    ];

    const kb = inlineKeyboards.customerSelection(mockCustomers);
    const buttonsFlat = kb.reply_markup.inline_keyboard.flat();

    // Verify callback data length for each button
    buttonsFlat.forEach(btn => {
      assert.ok(
        Buffer.byteLength(btn.callback_data, 'utf8') <= 64,
        `Callback data "${btn.callback_data}" exceeds 64-byte Telegram limit!`
      );
    });

    assert.ok(buttonsFlat.some(b => b.callback_data.startsWith('inc_cust_CUST-001')));
    assert.ok(buttonsFlat.some(b => b.callback_data === 'inc_cust_custom'));
  });

  test('sheetsService exposes customer methods', () => {
    assert.strictEqual(typeof sheetsService.getCustomers, 'function');
    assert.strictEqual(typeof sheetsService.addCustomer, 'function');
    assert.strictEqual(typeof sheetsService.toggleCustomerStatus, 'function');
  });
});

describe('AI Analysis & Google Sheet Hub', () => {
  const inlineKeyboards = require('../src/keyboards/inlineKeyboards');
  const sheetsService = require('../src/services/sheetsService');
  const { AI_PROMPTS } = require('../src/handlers/aiAnalysisHandler');

  test('mainMenu includes AI Analysis button', () => {
    const menu = inlineKeyboards.mainMenu(false);
    const buttonsFlat = menu.reply_markup.inline_keyboard.flat();
    assert.ok(buttonsFlat.some(b => b.callback_data === 'menu_ai_analysis'));
  });

  test('aiAnalysisMenu includes download excel button and prompts', () => {
    const menu = inlineKeyboards.aiAnalysisMenu();
    const buttonsFlat = menu.reply_markup.inline_keyboard.flat();

    assert.ok(buttonsFlat.some(b => b.callback_data === 'action_download_excel'), 'Should have Excel download button');
    assert.ok(buttonsFlat.some(b => b.callback_data === 'ai_prompt_profit'));
    assert.ok(buttonsFlat.some(b => b.callback_data === 'ai_prompt_customer'));
    assert.ok(buttonsFlat.some(b => b.callback_data === 'ai_prompt_wages'));
    assert.ok(buttonsFlat.some(b => b.callback_data === 'ai_prompt_goods'));
    assert.ok(buttonsFlat.some(b => b.callback_data === 'ai_prompt_expenses'));
  });

  test('aiPromptDetail includes copy_text button and Excel download button', () => {
    const samplePrompt = 'Act as an expert CFO...';
    const detail = inlineKeyboards.aiPromptDetail(samplePrompt, 'ai_prompt_profit');
    const buttonsFlat = detail.reply_markup.inline_keyboard.flat();

    const copyBtn = buttonsFlat.find(b => b.copy_text && b.copy_text.text === samplePrompt);
    assert.ok(copyBtn, 'Should have native copy_text button with prompt text');
    assert.match(copyBtn.text, /Copy Prompt/);

    assert.ok(buttonsFlat.some(b => b.callback_data === 'action_download_excel'), 'Should have Excel download button');
    assert.ok(buttonsFlat.some(b => b.callback_data === 'send_raw_prompt_ai_prompt_profit'), 'Should have clean text button');
  });

  test('AI_PROMPTS generate valid prompts tailored for Excel file', () => {
    const promptKeys = Object.keys(AI_PROMPTS);
    assert.strictEqual(promptKeys.length, 5);

    promptKeys.forEach(key => {
      const p = AI_PROMPTS[key];
      assert.ok(p.title);
      assert.ok(p.desc);
      assert.strictEqual(typeof p.prompt, 'function');

      const text = p.prompt();
      assert.ok(text.includes('Rubber_Business_Ledger.xlsx'), `Prompt ${key} should reference the Excel ledger file`);
      assert.ok(text.length > 50, `Prompt ${key} should be descriptive`);
    });
  });

  test('sheetsService generateExcelBuffer creates valid .xlsx buffer', async () => {
    const originalGetAllData = sheetsService.getAllData;
    sheetsService.getAllData = async () => ({
      success: true,
      sheets: {
        Transactions: [
          ['Transaction ID', 'Date', 'Type', 'Category', 'Amount (₹)', 'Party', 'Staff', 'Route', 'Note'],
          ['TXN-INC-20261019-0001', '2026-10-19', 'Income', 'Rubber Sales', 45000, 'ABC Rubber', '', '', 'Lot 1']
        ],
        Employees: [
          ['Employee ID', 'Employee Name', 'Status'],
          ['EMP-001', 'Suresh', 'Active']
        ],
        Customers: [
          ['Customer ID', 'Customer Name', 'Status'],
          ['CUST-001', 'ABC Rubber', 'Active']
        ],
        Categories: [
          ['Type', 'Group', 'Category Name'],
          ['Income', 'Rubber Sales', 'Rubber Sales']
        ]
      }
    });

    try {
      const buffer = await sheetsService.generateExcelBuffer();
      assert.ok(Buffer.isBuffer(buffer), 'Should return a valid Buffer');
      assert.ok(buffer.length > 1000, 'Excel file buffer should not be empty');
    } finally {
      sheetsService.getAllData = originalGetAllData;
    }
  });
});

describe('Executive Dashboard Hub (Telegram & Web)', () => {
  const {
    getPeriodDatesIST,
    formatTelegramDashboard,
    formatDashboardGoodsView,
    formatDashboardWagesView
  } = require('../src/utils/formatter');
  const inlineKeyboards = require('../src/keyboards/inlineKeyboards');
  const dashboardService = require('../src/services/dashboardService');
  const { renderDashboardHtml } = require('../src/web/dashboardHtml');

  test('mainMenu includes Executive Dashboard button', () => {
    const menu = inlineKeyboards.mainMenu(false);
    const buttonsFlat = menu.reply_markup.inline_keyboard.flat();
    assert.ok(buttonsFlat.some(b => b.callback_data === 'menu_dashboard'), 'Main menu should have menu_dashboard button');
  });

  test('getPeriodDatesIST resolves valid date ranges', () => {
    const today = getPeriodDatesIST('today');
    assert.strictEqual(today.startDate, today.endDate);
    assert.match(today.startDate, /^\d{4}-\d{2}-\d{2}$/);

    const week = getPeriodDatesIST('week');
    assert.ok(week.startDate < week.endDate);

    const month = getPeriodDatesIST('month');
    assert.ok(month.startDate.endsWith('-01'));

    const all = getPeriodDatesIST('all');
    assert.strictEqual(all.startDate, '');
    assert.strictEqual(all.endDate, '');
  });

  test('formatTelegramDashboard renders rich visual KPIs, balance bar and margin', () => {
    const mockReport = {
      startDate: '2026-10-01',
      endDate: '2026-10-19',
      totalIncome: 250000,
      totalExpenses: 100000,
      netCashflow: 150000,
      goodsIncome: 120000,
      goodsPurchases: 50000,
      goodsDifference: 70000,
      staffWages: 30000,
      travelExpenses: 10000,
      otherExpenses: 10000,
      transactionCount: 20
    };

    const text = formatTelegramDashboard(mockReport, 'October 2026');
    assert.match(text, /RUBBER EXECUTIVE DASHBOARD/);
    assert.match(text, /Total Inflow:/);
    assert.match(text, /2,50,000/);
    assert.match(text, /Net Cashflow:/);
    assert.match(text, /1,50,000/);
    assert.match(text, /Surplus/);
    assert.match(text, /🟩/); // Visual bar
    assert.match(text, /Goods Difference:/);
    assert.match(text, /Staff Wages:/);
  });

  test('inlineKeyboards.dashboard creates period toggles and webapp button', () => {
    const kbHttps = inlineKeyboards.dashboard('month', 'https://example.com/dashboard');
    const flatHttps = kbHttps.reply_markup.inline_keyboard.flat();

    // Check period buttons
    assert.ok(flatHttps.some(b => b.callback_data === 'dash_p_today'));
    assert.ok(flatHttps.some(b => b.callback_data === 'dash_p_week'));
    assert.ok(flatHttps.some(b => b.callback_data === 'dash_p_month'));
    assert.ok(flatHttps.some(b => b.callback_data === 'dash_p_all'));

    // Check subview buttons
    assert.ok(flatHttps.some(b => b.callback_data === 'dash_sub_goods_month'));
    assert.ok(flatHttps.some(b => b.callback_data === 'dash_sub_wages_month'));

    // Check web_app button for HTTPS
    const webAppBtn = flatHttps.find(b => b.web_app && b.web_app.url === 'https://example.com/dashboard');
    assert.ok(webAppBtn, 'Should render web_app button for HTTPS URL');

    // Check URL button for HTTP
    const kbHttp = inlineKeyboards.dashboard('today', 'http://localhost:3000/dashboard');
    const flatHttp = kbHttp.reply_markup.inline_keyboard.flat();
    const urlBtn = flatHttp.find(b => b.url === 'http://localhost:3000/dashboard');
    assert.ok(urlBtn, 'Should render URL button for non-HTTPS URL');
  });

  test('dashboardService.getDashboardData computes KPIs and time-series', async () => {
    const data = await dashboardService.getDashboardData('month', null, null, true);
    assert.strictEqual(data.success, true);
    assert.ok(data.totalIncome > 0);
    assert.ok(data.totalExpenses > 0);
    assert.ok(data.kpis);
    assert.ok(typeof data.kpis.netMarginPercent === 'number');
    assert.ok(data.chartSeries);
    assert.ok(Array.isArray(data.chartSeries.labels));
    assert.ok(Array.isArray(data.chartSeries.income));
    assert.ok(Array.isArray(data.chartSeries.expense));
    assert.ok(Array.isArray(data.transactions));
  });

  test('renderDashboardHtml returns valid responsive HTML with Chart.js and Telegram SDK', () => {
    const sampleData = {
      success: true,
      totalIncome: 100000,
      totalExpenses: 50000,
      netCashflow: 50000,
      goodsDifference: 20000,
      staffWages: 15000,
      transactions: []
    };

    const html = renderDashboardHtml(sampleData);
    assert.ok(html.includes('<!DOCTYPE html>'));
    assert.ok(html.includes('chart.umd.min.js'));
    assert.ok(html.includes('telegram-web-app.js'));
    assert.ok(html.includes('Rubber Business Finance Hub'));
    assert.ok(html.includes('trendChart'));
    assert.ok(html.includes('categoryChart'));
  });
});

