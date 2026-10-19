const inlineKeyboards = require('../keyboards/inlineKeyboards');
const sessionStore = require('../services/sessionStore');
const sheetsService = require('../services/sheetsService');
const { formatINR, escapeHtml } = require('../utils/formatter');
const logger = require('../utils/logger');

const FLOW = 'DELETE_TX';

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

      if (isIncome && tx.paymentStatus) {
        let pStat = '✅ Paid';
        if (tx.paymentStatus.toLowerCase() === 'not paid') {
          pStat = `⏳ Not Paid (Due: 🔴 ${formatINR(tx.balanceDue !== undefined ? tx.balanceDue : tx.amount)})`;
        } else if (tx.paymentStatus.toLowerCase() === 'partial paid') {
          pStat = `📦 Partial Paid (Paid: ${formatINR(tx.paidAmount || 0)}, Due: 🔴 ${formatINR(tx.balanceDue || 0)})`;
        }
        text += `   💳 <b>Status:</b> ${pStat}\n`;
      }

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

    const keyboard = inlineKeyboards.recentActions(txs.length > 0);

    if (ctx.callbackQuery) {
      try {
        return await ctx.editMessageText(text, {
          parse_mode: 'HTML',
          ...keyboard
        });
      } catch (e) {}
    }

    return ctx.replyWithHTML(text, keyboard);
  } catch (err) {
    logger.error('Error fetching recent transactions:', err);
    return ctx.replyWithHTML(`❌ Error: ${escapeHtml(err.message)}`, inlineKeyboards.returnToMainMenu());
  }
}

/**
 * Show list of recent transactions to pick from for deletion
 */
async function showDeletePrompt(ctx) {
  if (ctx.callbackQuery) {
    try {
      await ctx.answerCbQuery('🗑️ Loading...');
    } catch (e) {}
  }

  try {
    const res = await sheetsService.getRecentTransactions(8);
    const txs = res.transactions || [];

    const text = 
      `🗑️ <b>Delete / Remove a Transaction</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `Select a transaction below to delete, or type the Transaction ID manually:\n\n` +
      `⚠️ <i>Deleting will permanently remove the entry from your Google Sheet ledger.</i>`;

    const keyboard = inlineKeyboards.deletePickFromRecent(txs);

    if (ctx.callbackQuery) {
      try {
        return await ctx.editMessageText(text, {
          parse_mode: 'HTML',
          ...keyboard
        });
      } catch (e) {}
    }

    return ctx.replyWithHTML(text, keyboard);
  } catch (err) {
    logger.error('Error showing delete prompt:', err);
    return ctx.replyWithHTML(`❌ Error: ${escapeHtml(err.message)}`, inlineKeyboards.returnToMainMenu());
  }
}

/**
 * Show confirmation before deleting a transaction
 */
async function showDeleteConfirmation(ctx, txId) {
  if (!txId) return;

  const text = 
    `⚠️ <b>Confirm Transaction Deletion</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Are you sure you want to permanently delete this transaction?\n\n` +
    `🆔 <b>Transaction ID:</b> <code>${txId}</code>\n\n` +
    `<i>This action will delete the row from your Google Sheet ledger and cannot be undone.</i>`;

  const keyboard = inlineKeyboards.deleteConfirm(txId);

  if (ctx.callbackQuery) {
    try {
      return await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        ...keyboard
      });
    } catch (e) {}
  }

  return ctx.replyWithHTML(text, keyboard);
}

/**
 * Prompt user to enter Transaction ID manually
 */
async function startManualDeleteFlow(ctx) {
  const userId = ctx.from.id;
  sessionStore.set(userId, FLOW, 'AWAITING_TX_ID');

  const text = 
    `✍️ <b>Delete Transaction by ID</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Please reply with the exact <b>Transaction ID</b> you want to delete:\n\n` +
    `<i>(e.g., <code>TXN-INC-20261019-0001</code> or <code>TXN-EXP-20261018-0003</code>)</i>`;

  if (ctx.callbackQuery) {
    try {
      return await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        ...inlineKeyboards.cancelOnly()
      });
    } catch (e) {}
  }

  return ctx.replyWithHTML(text, inlineKeyboards.cancelOnly());
}

/**
 * Handle manual Transaction ID text input
 */
async function handleDeleteTextInput(ctx) {
  const userId = ctx.from.id;
  const session = sessionStore.get(userId);

  if (!session || session.flow !== FLOW) return false;

  const text = ctx.message.text.trim();
  if (session.step === 'AWAITING_TX_ID') {
    if (!text || text.length < 5) {
      return ctx.replyWithHTML(
        `⚠️ Please enter a valid Transaction ID (e.g. <code>TXN-INC-20261019-0001</code>):`,
        inlineKeyboards.cancelOnly()
      );
    }

    sessionStore.clear(userId);
    return showDeleteConfirmation(ctx, text);
  }

  return false;
}

/**
 * Execute final deletion from Google Sheets
 */
async function executeDeleteTransaction(ctx, txId) {
  if (ctx.callbackQuery) {
    try {
      await ctx.answerCbQuery('🗑️ Deleting from Google Sheets...');
    } catch (e) {}
  }

  try {
    const res = await sheetsService.deleteTransaction(txId);

    if (!res.success) {
      return ctx.replyWithHTML(
        `❌ <b>Deletion Failed:</b>\n${escapeHtml(res.error || 'Transaction not found')}\n\n` +
        `<i>Please verify the Transaction ID and try again.</i>`,
        inlineKeyboards.returnToMainMenu()
      );
    }

    const successText = 
      `🗑️ <b>Transaction Deleted Successfully!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 <b>ID:</b> <code>${txId}</code>\n` +
      `Permanently removed from your Google Sheets ledger.`;

    const keyboard = inlineKeyboards.afterSave('menu_recent');

    if (ctx.callbackQuery) {
      try {
        return await ctx.editMessageText(successText, {
          parse_mode: 'HTML',
          ...keyboard
        });
      } catch (e) {}
    }

    return ctx.replyWithHTML(successText, keyboard);
  } catch (err) {
    logger.error('Error deleting transaction:', err);
    return ctx.replyWithHTML(`❌ Error: ${escapeHtml(err.message)}`, inlineKeyboards.returnToMainMenu());
  }
}

module.exports = {
  showRecentTransactions,
  showDeletePrompt,
  showDeleteConfirmation,
  startManualDeleteFlow,
  handleDeleteTextInput,
  executeDeleteTransaction
};
