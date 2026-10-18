const inlineKeyboards = require('../keyboards/inlineKeyboards');
const sessionStore = require('../services/sessionStore');
const sheetsService = require('../services/sheetsService');
const { formatINR, isValidDateString, formatTransactionSummary, escapeHtml } = require('../utils/formatter');
const { generateTransactionId } = require('../utils/idGenerator');
const logger = require('../utils/logger');

const FLOW = 'EXPENSE';

const EXPENSE_CATEGORY_MAP = {
  // Goods Purchases
  exp_cat_rubber_goods: 'Rubber-related goods purchases',
  exp_cat_raw_materials: 'Raw materials',
  exp_cat_supplies: 'Supplies',
  exp_cat_other_goods: 'Other goods purchases',

  // Refreshments
  exp_cat_tea: 'Tea powder',
  exp_cat_sugar: 'Sugar',
  exp_cat_coffee: 'Coffee powder',
  exp_cat_food: 'Food and refreshments',

  // Utilities & Maintenance
  exp_cat_led: 'LED bulbs and electrical items',
  exp_cat_cleaning: 'Cleaning supplies',
  exp_cat_maintenance: 'Maintenance',

  // Misc
  exp_cat_misc: 'Other miscellaneous expenses'
};

/**
 * Entry point: Start Add Expense menu
 */
async function startExpenseMenu(ctx) {
  const userId = ctx.from.id;
  sessionStore.clear(userId);

  const text = 
    `➖ <b>Record Business Expense</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Select an expense category group:`;

  if (ctx.callbackQuery) {
    try {
      return await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        ...inlineKeyboards.expenseGroups()
      });
    } catch (e) {}
  }

  return ctx.replyWithHTML(text, inlineKeyboards.expenseGroups());
}

/**
 * Submenus
 */
async function showGoodsPurchasesMenu(ctx) {
  const text = 
    `📦 <b>Goods & Business Purchases</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Select the specific goods purchase type:`;

  if (ctx.callbackQuery) {
    try {
      return await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        ...inlineKeyboards.goodsPurchaseCategories()
      });
    } catch (e) {}
  }
  return ctx.replyWithHTML(text, inlineKeyboards.goodsPurchaseCategories());
}

async function showRefreshmentsMenu(ctx) {
  const text = 
    `☕ <b>Tea, Coffee & Food Expenses</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Select the refreshment category:`;

  if (ctx.callbackQuery) {
    try {
      return await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        ...inlineKeyboards.refreshmentCategories()
      });
    } catch (e) {}
  }
  return ctx.replyWithHTML(text, inlineKeyboards.refreshmentCategories());
}

async function showUtilitiesMenu(ctx) {
  const text = 
    `💡 <b>Electrical, Cleaning & Maintenance</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Select the item category:`;

  if (ctx.callbackQuery) {
    try {
      return await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        ...inlineKeyboards.utilitiesCategories()
      });
    } catch (e) {}
  }
  return ctx.replyWithHTML(text, inlineKeyboards.utilitiesCategories());
}

/**
 * Handle category selected
 */
async function handleExpenseCategorySelection(ctx, categoryKey) {
  const userId = ctx.from.id;
  const categoryName = EXPENSE_CATEGORY_MAP[categoryKey] || 'Other miscellaneous expenses';

  sessionStore.set(userId, FLOW, 'AWAITING_AMOUNT', {
    type: 'Expense',
    category: categoryName
  });

  const text = 
    `➖ <b>Expense: ${escapeHtml(categoryName)}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `💵 <b>Enter the expense amount in Indian Rupees (₹):</b>\n\n` +
    `<i>(Type the number, e.g. <code>450</code> or <code>3200</code>)</i>`;

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
 * Handle text input during Expense flow
 */
async function handleExpenseTextInput(ctx) {
  const userId = ctx.from.id;
  const session = sessionStore.get(userId);

  if (!session || session.flow !== FLOW) return false;

  const text = ctx.message.text.trim();

  // 1. Amount
  if (session.step === 'AWAITING_AMOUNT') {
    const cleaned = text.replace(/,/g, '').replace(/₹/g, '').replace(/rs\.?/gi, '').replace(/\/[-]/g, '').trim();
    const amount = parseFloat(cleaned);

    if (isNaN(amount) || amount <= 0) {
      return ctx.replyWithHTML(
        `⚠️ <b>Invalid Amount!</b>\n` +
        `Please enter a valid positive number in Rupees (e.g. <code>450</code>):`,
        inlineKeyboards.cancelOnly()
      );
    }

    sessionStore.update(userId, {
      step: 'AWAITING_PURPOSE',
      data: { amount }
    });

    return ctx.replyWithHTML(
      `✅ Amount: <b>${formatINR(amount)}</b>\n\n` +
      `🏢 <b>Enter Expense Purpose or Vendor/Shop Name:</b>\n` +
      `<i>(e.g., 'Local Grocery Store', 'Kottayam Electricals', 'Hardware Depot')</i>`,
      inlineKeyboards.cancelOnly()
    );
  }

  // 2. Purpose / Vendor
  if (session.step === 'AWAITING_PURPOSE') {
    if (!text) {
      return ctx.reply('Please enter a valid purpose or vendor name:');
    }

    sessionStore.update(userId, {
      step: 'AWAITING_DATE',
      data: { sourceOrPurpose: text }
    });

    return ctx.replyWithHTML(
      `📅 <b>Select Transaction Date:</b>\n` +
      `Choose today, yesterday, or type a custom date:`,
      inlineKeyboards.dateSelection()
    );
  }

  // 3. Custom Date
  if (session.step === 'AWAITING_CUSTOM_DATE') {
    if (!isValidDateString(text)) {
      return ctx.replyWithHTML(
        `⚠️ <b>Invalid Date Format!</b>\n` +
        `Please enter the date strictly in <code>YYYY-MM-DD</code> format (e.g., <code>2026-10-15</code>):`,
        inlineKeyboards.cancelOnly()
      );
    }

    sessionStore.update(userId, {
      step: 'AWAITING_NOTE',
      data: { transactionDate: text }
    });

    return ctx.replyWithHTML(
      `📝 <b>Optional: Add a description or note</b>\n` +
      `<i>(e.g., '10 LED bulbs for shed #2', or press Skip)</i>`,
      inlineKeyboards.skipOptionalNote()
    );
  }

  // 4. Note
  if (session.step === 'AWAITING_NOTE') {
    sessionStore.update(userId, {
      step: 'CONFIRMATION',
      data: { description: text }
    });

    return showExpenseConfirmation(ctx);
  }

  return false;
}

/**
 * Handle date selection callback
 */
async function handleExpenseDateSelection(ctx, dateVal) {
  const userId = ctx.from.id;
  const session = sessionStore.get(userId);

  if (!session || session.flow !== FLOW) return false;

  if (dateVal === 'date_custom') {
    sessionStore.update(userId, { step: 'AWAITING_CUSTOM_DATE' });
    const text = 
      `✍️ <b>Enter Custom Date</b>\n` +
      `Please reply with the transaction date in <code>YYYY-MM-DD</code> format (e.g. <code>2026-10-15</code>):`;
    
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

  const actualDate = dateVal.replace('date_val_', '');
  sessionStore.update(userId, {
    step: 'AWAITING_NOTE',
    data: { transactionDate: actualDate }
  });

  const text = 
    `📅 Date set to: <b>${actualDate}</b>\n\n` +
    `📝 <b>Optional: Add a description or note:</b>\n` +
    `<i>(e.g., 'Bought from town center', or press Skip)</i>`;

  if (ctx.callbackQuery) {
    try {
      return await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        ...inlineKeyboards.skipOptionalNote()
      });
    } catch (e) {}
  }
  return ctx.replyWithHTML(text, inlineKeyboards.skipOptionalNote());
}

/**
 * Handle skip note
 */
async function handleExpenseSkipNote(ctx) {
  const userId = ctx.from.id;
  const session = sessionStore.get(userId);
  if (!session || session.flow !== FLOW) return false;

  sessionStore.update(userId, {
    step: 'CONFIRMATION',
    data: { description: '' }
  });

  return showExpenseConfirmation(ctx);
}

/**
 * Show Confirmation Card
 */
async function showExpenseConfirmation(ctx) {
  const userId = ctx.from.id;
  const session = sessionStore.get(userId);
  if (!session) return;

  const cardHtml = formatTransactionSummary(session.data);

  if (ctx.callbackQuery) {
    try {
      return await ctx.editMessageText(cardHtml, {
        parse_mode: 'HTML',
        ...inlineKeyboards.confirmTransaction()
      });
    } catch (e) {}
  }

  return ctx.replyWithHTML(cardHtml, inlineKeyboards.confirmTransaction());
}

/**
 * Confirm and save to Google Sheets
 */
async function handleExpenseConfirmSave(ctx) {
  const userId = ctx.from.id;
  const session = sessionStore.get(userId);

  if (!session || session.flow !== FLOW) {
    return ctx.reply('⚠️ No pending transaction found or session expired.', inlineKeyboards.returnToMainMenu());
  }

  if (session.isSubmitting) {
    return ctx.answerCbQuery('⏳ Already saving, please wait...', { show_alert: true });
  }

  sessionStore.update(userId, { isSubmitting: true });
  await ctx.answerCbQuery('💾 Saving to Google Sheets...');

  try {
    const txId = generateTransactionId('expense');
    const senderName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || ctx.from.username || 'Staff';

    const payload = {
      transactionId: txId,
      transactionDate: session.data.transactionDate,
      type: 'Expense',
      category: session.data.category,
      amount: session.data.amount,
      sourceOrPurpose: session.data.sourceOrPurpose,
      employeeName: '',
      travelDetails: '',
      description: session.data.description || '',
      enteredBy: senderName,
      telegramUserId: String(userId)
    };

    const res = await sheetsService.addTransaction(payload);

    if (!res.success) {
      sessionStore.update(userId, { isSubmitting: false });
      return ctx.replyWithHTML(
        `❌ <b>Error Saving Expense:</b>\n${escapeHtml(res.error || 'Unknown error')}\n\n` +
        `<i>Please verify your Google Apps Script setup.</i>`,
        inlineKeyboards.confirmTransaction()
      );
    }

    sessionStore.clear(userId);

    const successText = 
      `✅ <b>Expense Recorded Successfully!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 <b>Tx ID:</b> <code>${txId}</code>\n` +
      `💸 <b>Amount:</b> <b>${formatINR(session.data.amount)}</b>\n` +
      `📁 <b>Category:</b> ${escapeHtml(session.data.category)}\n` +
      `🏢 <b>Purpose/Vendor:</b> ${escapeHtml(session.data.sourceOrPurpose)}\n` +
      `📅 <b>Date:</b> ${session.data.transactionDate}\n` +
      (session.data.description ? `📝 <b>Note:</b> ${escapeHtml(session.data.description)}\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `<i>Saved to Google Sheets ledger.</i>`;

    return ctx.replyWithHTML(successText, inlineKeyboards.afterSave('menu_expense'));

  } catch (err) {
    logger.error('Error saving expense transaction:', err);
    sessionStore.update(userId, { isSubmitting: false });
    return ctx.replyWithHTML(`❌ Failed to save expense: ${escapeHtml(err.message)}`, inlineKeyboards.confirmTransaction());
  }
}

module.exports = {
  startExpenseMenu,
  showGoodsPurchasesMenu,
  showRefreshmentsMenu,
  showUtilitiesMenu,
  handleExpenseCategorySelection,
  handleExpenseTextInput,
  handleExpenseDateSelection,
  handleExpenseSkipNote,
  handleExpenseConfirmSave
};
