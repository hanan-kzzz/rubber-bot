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
