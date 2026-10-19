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
 * Get date N days ago in IST formatted as YYYY-MM-DD
 */
function getDaysAgoIST(days = 7) {
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
  return parts;
}

/**
 * Standardized date range resolver for periods
 */
function getPeriodDatesIST(period = 'month') {
  const today = getTodayIST();
  switch (period) {
    case 'today':
      return { startDate: today, endDate: today, label: `Today (${today})` };
    case 'yesterday': {
      const yesterday = getYesterdayIST();
      return { startDate: yesterday, endDate: yesterday, label: `Yesterday (${yesterday})` };
    }
    case 'week': {
      const weekStart = getDaysAgoIST(6);
      return { startDate: weekStart, endDate: today, label: 'Last 7 Days' };
    }
    case 'month':
      return { startDate: getMonthStartIST(), endDate: today, label: `This Month (${getCurrentMonthNameIST()})` };
    case 'all':
      return { startDate: '', endDate: '', label: 'All-Time Cumulative' };
    default:
      return { startDate: getMonthStartIST(), endDate: today, label: `This Month (${getCurrentMonthNameIST()})` };
  }
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

  if (isIncome && tx.paymentStatus) {
    let statusLabel = '✅ Paid';
    if (tx.paymentStatus.toLowerCase() === 'not paid') {
      statusLabel = '⏳ Not Paid (Unpaid)';
    } else if (tx.paymentStatus.toLowerCase() === 'partial paid') {
      statusLabel = '📦 Partial / Parcel Paid';
    }
    text += `🔹 <b>Payment Status:</b> ${statusLabel}\n`;
    if (tx.paymentStatus.toLowerCase() === 'partial paid') {
      text += `🔹 <b>Amount Received:</b> ${formatINR(tx.paidAmount || 0)}\n`;
      text += `🔹 <b>Customer Balance Due:</b> 🔴 <b>${formatINR(tx.balanceDue || 0)}</b>\n`;
    } else if (tx.paymentStatus.toLowerCase() === 'not paid') {
      text += `🔹 <b>Customer Balance Due:</b> 🔴 <b>${formatINR(tx.balanceDue !== undefined ? tx.balanceDue : tx.amount)}</b>\n`;
    }
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
 * Formats a high-impact executive visual dashboard for Telegram
 */
function formatTelegramDashboard(report, periodLabel = 'This Month') {
  const totalIncome = Math.round((report.totalIncome || 0) * 100) / 100;
  const totalExpenses = Math.round((report.totalExpenses || 0) * 100) / 100;
  const netCashflow = Math.round((report.netCashflow !== undefined ? report.netCashflow : (totalIncome - totalExpenses)) * 100) / 100;
  const goodsIncome = Math.round((report.goodsIncome || 0) * 100) / 100;
  const goodsPurchases = Math.round((report.goodsPurchases || 0) * 100) / 100;
  const goodsDiff = Math.round((report.goodsDifference !== undefined ? report.goodsDifference : (goodsIncome - goodsPurchases)) * 100) / 100;
  const staffWages = Math.round((report.staffWages || 0) * 100) / 100;
  const travelExp = Math.round((report.travelExpenses || 0) * 100) / 100;
  const otherExp = Math.round((report.otherExpenses || 0) * 100) / 100;
  const count = report.transactionCount || 0;

  // Percentage calculations
  const totalTurnover = totalIncome + totalExpenses;
  let incomeRatio = 5;
  if (totalTurnover > 0) {
    incomeRatio = Math.max(1, Math.min(9, Math.round((totalIncome / totalTurnover) * 10)));
  }
  const expenseRatio = 10 - incomeRatio;
  const balanceBar = totalTurnover > 0
    ? '🟩'.repeat(incomeRatio) + '🟥'.repeat(expenseRatio)
    : '⬜'.repeat(10);
  const incomePercent = totalTurnover > 0 ? Math.round((totalIncome / totalTurnover) * 100) : 0;

  // Net Margin %
  const netMargin = totalIncome > 0 ? ((netCashflow / totalIncome) * 100).toFixed(1) : '0.0';
  const netSign = netCashflow > 0 ? '+' : '';
  const netBadge = netCashflow > 0 ? '🟢 Surplus' : (netCashflow < 0 ? '🔴 Deficit' : '⚪ Balanced');

  // Goods Margin %
  const goodsMargin = goodsIncome > 0 ? (((goodsIncome - goodsPurchases) / goodsIncome) * 100).toFixed(1) : '0.0';
  const goodsBadge = goodsDiff >= 0 ? '🟢 Profit' : '🔴 Deficit';

  // Expense breakdown percentages
  const wagePct = totalExpenses > 0 ? Math.round((staffWages / totalExpenses) * 100) : 0;
  const goodsBuyPct = totalExpenses > 0 ? Math.round((goodsPurchases / totalExpenses) * 100) : 0;
  const travelPct = totalExpenses > 0 ? Math.round((travelExp / totalExpenses) * 100) : 0;
  const otherPct = totalExpenses > 0 ? Math.round((otherExp / totalExpenses) * 100) : 0;

  let text = `🌳 <b>RUBBER EXECUTIVE DASHBOARD</b> 📊\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📅 <b>Period:</b> <b>${escapeHtml(periodLabel)}</b>\n`;
  if (report.startDate && report.endDate) {
    text += `⏱️ <code>${report.startDate}</code> ➔ <code>${report.endDate}</code>\n`;
  }
  text += `🔢 <b>Volume:</b> <b>${count}</b> transactions recorded\n\n`;

  text += `💰 <b>FINANCIAL HIGHLIGHTS</b>\n`;
  text += `┌─────────────────────\n`;
  text += `│ 🟢 <b>Total Inflow:</b>  <b>${formatINR(totalIncome)}</b>\n`;
  text += `│ 🔴 <b>Total Outflow:</b> <b>${formatINR(totalExpenses)}</b>\n`;
  text += `├─────────────────────\n`;
  text += `│ 💎 <b>Net Cashflow:</b>  <b>${netSign}${formatINR(netCashflow)}</b>\n`;
  text += `│ 🏷️ <b>Status:</b> ${netBadge} (${netSign}${netMargin}%)\n`;
  text += `└─────────────────────\n`;
  text += `Ratio: [${balanceBar}] <b>${incomePercent}%</b> Inflow\n\n`;

  text += `📦 <b>RUBBER & GOODS SECTOR</b>\n`;
  text += `• Goods Revenue:   <b>${formatINR(goodsIncome)}</b>\n`;
  text += `• Goods Purchases: <b>${formatINR(goodsPurchases)}</b>\n`;
  text += `• Goods Difference: <b>${goodsDiff >= 0 ? '+' : ''}${formatINR(goodsDiff)}</b> (${goodsBadge} ${goodsMargin}%)\n\n`;

  text += `⚡ <b>EXPENSE ALLOCATION</b>\n`;
  text += `• 📦 Goods Bought:   <b>${formatINR(goodsPurchases)}</b> <i>(${goodsBuyPct}%)</i>\n`;
  text += `• 👷 Staff Wages:    <b>${formatINR(staffWages)}</b> <i>(${wagePct}%)</i>\n`;
  text += `• 🚗 Travel & Fuel:  <b>${formatINR(travelExp)}</b> <i>(${travelPct}%)</i>\n`;
  text += `• 💡 Utilities/Misc: <b>${formatINR(otherExp)}</b> <i>(${otherPct}%)</i>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🕒 <i>Live Sync: ${new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</i>`;

  return text;
}

/**
 * Formats dedicated sub-view for Goods & Rubber trades
 */
function formatDashboardGoodsView(report, periodLabel = 'This Month') {
  const goodsIncome = report.goodsIncome || 0;
  const goodsPurchases = report.goodsPurchases || 0;
  const goodsDiff = report.goodsDifference !== undefined ? report.goodsDifference : (goodsIncome - goodsPurchases);
  const diffIcon = goodsDiff >= 0 ? '🟢' : '🔴';
  const margin = goodsIncome > 0 ? (((goodsIncome - goodsPurchases) / goodsIncome) * 100).toFixed(1) : '0.0';

  let text = `📦 <b>RUBBER & GOODS TRADE DEEP DIVE</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📅 <b>Period:</b> <b>${escapeHtml(periodLabel)}</b>\n\n`;

  text += `💵 <b>Goods Income (Sales):</b> <b>${formatINR(goodsIncome)}</b>\n`;
  text += `🛒 <b>Goods Purchases (Cost):</b> <b>${formatINR(goodsPurchases)}</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `${diffIcon} <b>Net Trade Difference:</b> <b>${goodsDiff >= 0 ? '+' : ''}${formatINR(goodsDiff)}</b>\n`;
  text += `📊 <b>Goods Profit Margin:</b> <b>${margin}%</b>\n\n`;

  text += `💡 <i>Note: This measures actual liquid cash spent vs cash collected on goods trades.</i>`;
  return text;
}

/**
 * Formats dedicated sub-view for Staff Wages
 */
function formatDashboardWagesView(report, periodLabel = 'This Month') {
  const staffWages = report.staffWages || 0;
  const totalExpenses = report.totalExpenses || 0;
  const wageShare = totalExpenses > 0 ? ((staffWages / totalExpenses) * 100).toFixed(1) : '0.0';

  let text = `👷 <b>LABOR & WAGES OVERVIEW</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📅 <b>Period:</b> <b>${escapeHtml(periodLabel)}</b>\n\n`;

  text += `💵 <b>Total Wages Paid:</b> <b>${formatINR(staffWages)}</b>\n`;
  text += `📊 <b>Share of Total Expenses:</b> <b>${wageShare}%</b>\n\n`;

  const txs = Array.isArray(report.transactions) ? report.transactions : [];
  const wageTxs = txs.filter(t => (t.category || '').toLowerCase() === 'staff wages');
  if (wageTxs.length > 0) {
    text += `<b>📋 Recorded Wage Entries (${wageTxs.length}):</b>\n`;
    wageTxs.slice(0, 10).forEach(w => {
      const emp = w.employeeName || 'Worker';
      text += `• ${w.date || ''} - <b>${escapeHtml(emp)}</b>: ${formatINR(w.amount)}\n`;
    });
    if (wageTxs.length > 10) {
      text += `<i>...and ${wageTxs.length - 10} more entries.</i>\n`;
    }
  } else {
    text += `<i>No individual wage entries found in this period.</i>\n`;
  }
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
  getDaysAgoIST,
  getMonthStartIST,
  getCurrentMonthNameIST,
  getPeriodDatesIST,
  isValidDateString,
  formatTransactionSummary,
  formatReportSummary,
  formatGoodsSummary,
  formatTelegramDashboard,
  formatDashboardGoodsView,
  formatDashboardWagesView,
  escapeHtml
};
