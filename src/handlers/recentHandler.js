const inlineKeyboards = require('../keyboards/inlineKeyboards');
const sheetsService = require('../services/sheetsService');
const { formatINR, escapeHtml } = require('../utils/formatter');
const logger = require('../utils/logger');

/**
 * Show latest 10 transactions
 */
async function showRecentTransactions(ctx) {
  if (ctx.callbackQuery) {
    try {
      await ctx.answerCbQuery('📄 Loading recent transactions...');
    } catch (e) {}
  }

  try {
    const res = await sheetsService.getRecentTransactions(10);
    if (!res.success) {
      return ctx.replyWithHTML(`❌ Failed to fetch recent transactions: ${escapeHtml(res.error)}`, inlineKeyboards.returnToMainMenu());
    }

    const txs = res.transactions || [];
    if (txs.length === 0) {
      return ctx.replyWithHTML(
        `📄 <b>Recent Transactions</b>\n━━━━━━━━━━━━━━━━━━━━━\n<i>No transactions found in Google Sheets yet.</i>`,
        inlineKeyboards.returnToMainMenu()
      );
    }

    let text = `📄 <b>Latest ${txs.length} Transactions</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n`;

    txs.forEach((tx, idx) => {
      const isIncome = (tx.type || '').toLowerCase() === 'income';
      const icon = isIncome ? '➕' : '➖';
      const typeLabel = isIncome ? 'INCOME' : 'EXPENSE';

      text += `<b>${idx + 1}. ${icon} ${formatINR(tx.amount)}</b> [${typeLabel}]\n`;
      text += `   📁 <b>Cat:</b> ${escapeHtml(tx.category || '-')}\n`;
      text += `   📅 <b>Date:</b> ${tx.date || '-'}\n`;

      if (tx.employeeName) {
        text += `   👷 <b>Staff:</b> ${escapeHtml(tx.employeeName)}\n`;
      } else if (tx.sourceOrPurpose) {
        text += `   🏢 <b>Party:</b> ${escapeHtml(tx.sourceOrPurpose)}\n`;
      }

      if (tx.travelDetails) {
        text += `   🚗 <b>Route:</b> ${escapeHtml(tx.travelDetails)}\n`;
      }

      if (tx.description) {
        text += `   📝 <b>Note:</b> <i>${escapeHtml(tx.description)}</i>\n`;
      }

      text += `   🆔 <code>${tx.id || '-'}</code>\n\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━\n<i>Stored permanently in Google Sheets ledger.</i>`;

    return ctx.replyWithHTML(text, inlineKeyboards.returnToMainMenu());
  } catch (err) {
    logger.error('Error fetching recent transactions:', err);
    return ctx.replyWithHTML(`❌ Error: ${escapeHtml(err.message)}`, inlineKeyboards.returnToMainMenu());
  }
}

module.exports = {
  showRecentTransactions
};
