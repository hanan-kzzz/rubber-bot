/**
 * Indian Rupee (INR) and Date formatting utilities
 */

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

/**
 * Format numeric value as Indian Rupees (e.g., ₹1,25,000.00)
 */
function formatINR(amount) {
  const num = parseFloat(amount) || 0;
  return inrFormatter.format(num);
}

/**
 * Get current date in IST formatted as YYYY-MM-DD
 */
function getTodayIST() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
  return parts; // 'YYYY-MM-DD'
}

/**
 * Get yesterday's date in IST formatted as YYYY-MM-DD
 */
function getYesterdayIST() {
  const date = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
  return parts;
}

/**
 * Get current month start date in IST formatted as YYYY-MM-01
 */
function getMonthStartIST() {
  const today = getTodayIST();
  return today.substring(0, 7) + '-01';
}

/**
 * Get current month name in IST (e.g. "October 2026")
 */
function getCurrentMonthNameIST() {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    month: 'long',
    year: 'numeric'
  }).format(new Date());
}

/**
 * Validates whether a string is a valid YYYY-MM-DD date
 */
function isValidDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (year < 2000 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

/**
 * Formats a transaction review card for user confirmation
 */
function formatTransactionSummary(tx) {
  const isIncome = (tx.type || '').toLowerCase() === 'income';
  const typeIcon = isIncome ? '➕' : '➖';
  const typeText = isIncome ? 'Income' : 'Expense';

  let text = `<b>${typeIcon} Review Transaction Details:</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🔹 <b>Type:</b> ${typeText}\n`;
  text += `🔹 <b>Category:</b> ${escapeHtml(tx.category || '-')}\n`;
  text += `🔹 <b>Amount:</b> <b>${formatINR(tx.amount)}</b>\n`;
  text += `🔹 <b>Date:</b> ${tx.transactionDate || getTodayIST()}\n`;

  if (tx.sourceOrPurpose) {
    const label = isIncome ? 'Customer / Source' : 'Purpose / Vendor';
    text += `🔹 <b>${label}:</b> ${escapeHtml(tx.sourceOrPurpose)}\n`;
  }

  if (tx.employeeName) {
    text += `🔹 <b>Employee:</b> ${escapeHtml(tx.employeeName)}\n`;
  }

  if (tx.travelDetails) {
    text += `🔹 <b>Travel Route:</b> ${escapeHtml(tx.travelDetails)}\n`;
  }

  if (tx.description) {
    text += `🔹 <b>Note:</b> ${escapeHtml(tx.description)}\n`;
  }

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `<i>Please review carefully. Press Confirm to save to Google Sheets ledger.</i>`;

  return text;
}

/**
 * Formats a financial report into Telegram HTML message
 */
function formatReportSummary(report, title) {
  const totalIncome = report.totalIncome || 0;
  const totalExpenses = report.totalExpenses || 0;
  const netCashflow = report.netCashflow || (totalIncome - totalExpenses);
  const goodsIncome = report.goodsIncome || 0;
  const goodsPurchases = report.goodsPurchases || 0;
  const goodsDiff = report.goodsDifference !== undefined ? report.goodsDifference : (goodsIncome - goodsPurchases);
  const staffWages = report.staffWages || 0;
  const travelExp = report.travelExpenses || 0;
  const otherExp = report.otherExpenses || 0;
  const count = report.transactionCount || 0;

  const cashflowSymbol = netCashflow >= 0 ? '🟢' : '🔴';

  let text = `<b>📊 ${escapeHtml(title)}</b>\n`;
  if (report.startDate && report.endDate) {
    text += `📅 <i>Period: ${report.startDate} to ${report.endDate}</i>\n`;
  } else if (report.startDate) {
    text += `📅 <i>Date: ${report.startDate}</i>\n`;
  }
  text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  text += `💰 <b>Total Income:</b> ${formatINR(totalIncome)}\n`;
  text += `💸 <b>Total Expenses:</b> ${formatINR(totalExpenses)}\n`;
  text += `${cashflowSymbol} <b>Net Cashflow:</b> <b>${formatINR(netCashflow)}</b>\n`;
  text += `<i>(Total Income − Total Expenses; actual cash movement)</i>\n\n`;

  text += `<b>📦 Goods Transactions:</b>\n`;
  text += `   • Goods Income: ${formatINR(goodsIncome)}\n`;
  text += `   • Goods Purchases: ${formatINR(goodsPurchases)}\n`;
  text += `   • Goods Difference: <b>${formatINR(goodsDiff)}</b>\n\n`;

  text += `<b>📋 Expense Breakdown:</b>\n`;
  text += `   • Goods Purchases: ${formatINR(goodsPurchases)}\n`;
  text += `   • Staff Wages: ${formatINR(staffWages)}\n`;
  text += `   • Travel Expenses: ${formatINR(travelExp)}\n`;
  text += `   • Other Expenses: ${formatINR(otherExp)}\n\n`;

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🔢 <b>Total Transactions Recorded:</b> ${count}\n`;
  text += `🕒 <i>Generated: ${new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</i>`;

  return text;
}

/**
 * Formats Goods Transactions Summary
 */
function formatGoodsSummary(report, periodName) {
  const goodsIncome = report.goodsIncome || 0;
  const goodsPurchases = report.goodsPurchases || 0;
  const goodsDiff = report.goodsDifference !== undefined ? report.goodsDifference : (goodsIncome - goodsPurchases);
  const diffIcon = goodsDiff >= 0 ? '🟢' : '🔴';

  let text = `<b>📦 Goods Transactions Summary</b>\n`;
  text += `<i>Period: ${escapeHtml(periodName)}</i>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  text += `💵 <b>Total Goods Income:</b> ${formatINR(goodsIncome)}\n`;
  text += `🛒 <b>Total Goods Purchases:</b> ${formatINR(goodsPurchases)}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `${diffIcon} <b>Goods Difference:</b> <b>${formatINR(goodsDiff)}</b>\n`;
  text += `<i>(Goods Income − Goods Purchase Expenses)</i>\n\n`;
  text += `<i>Note: This tracks cash spent and received on goods, not stock/inventory.</i>`;

  return text;
}

/**
 * Simple HTML escaping for Telegram messages
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports = {
  formatINR,
  getTodayIST,
  getYesterdayIST,
  getMonthStartIST,
  getCurrentMonthNameIST,
  isValidDateString,
  formatTransactionSummary,
  formatReportSummary,
  formatGoodsSummary,
  escapeHtml
};
