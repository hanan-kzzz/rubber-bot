const inlineKeyboards = require('../keyboards/inlineKeyboards');
const sessionStore = require('../services/sessionStore');
const sheetsService = require('../services/sheetsService');
const { formatINR, isValidDateString, formatTransactionSummary, escapeHtml } = require('../utils/formatter');
const { generateTransactionId } = require('../utils/idGenerator');
const logger = require('../utils/logger');

const FLOW = 'INCOME';

const CATEGORY_MAP = {
  inc_cat_rubber_sales: 'Rubber Sales',
  inc_cat_goods_income: 'Goods Income',
  inc_cat_cust_payment: 'Customer Payments',
  inc_cat_other_income: 'Other Income'
};

/**
 * Entry point: Start Add Income flow
 */
async function startIncomeFlow(ctx) {
  const userId = ctx.from.id;
  sessionStore.set(userId, FLOW, 'SELECT_CATEGORY');

  const text = 
    `➕ <b>Record Business Income</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Select the income category:`;

  if (ctx.callbackQuery) {
    try {
      return await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        ...inlineKeyboards.incomeCategories()
      });
    } catch (e) {}
  }

  return ctx.replyWithHTML(text, inlineKeyboards.incomeCategories());
}

/**
 * Handle category button selection
 */
async function handleCategorySelection(ctx, categoryKey) {
  const userId = ctx.from.id;
  const categoryName = CATEGORY_MAP[categoryKey] || 'Rubber Sales';

  sessionStore.update(userId, {
    flow: FLOW,
    step: 'AWAITING_AMOUNT',
    data: {
      type: 'Income',
      category: categoryName
    }
  });

  const text = 
    `➕ <b>Income: ${escapeHtml(categoryName)}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `💵 <b>Enter the income amount in Indian Rupees (₹):</b>\n\n` +
    `<i>(Type the number, e.g. <code>5000</code> or <code>25450.50</code>)</i>`;

  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        ...inlineKeyboards.cancelOnly()
      });
      return;
    } catch (e) {}
  }

  return ctx.replyWithHTML(text, inlineKeyboards.cancelOnly());
}

/**
 * Handle text input during Income flow
 */
async function handleIncomeTextInput(ctx) {
  const userId = ctx.from.id;
  const session = sessionStore.get(userId);

  if (!session || session.flow !== FLOW) return false;

  const text = ctx.message.text.trim();

  // 1. Amount input step
  if (session.step === 'AWAITING_AMOUNT') {
    const cleaned = text.replace(/,/g, '').replace(/₹/g, '').replace(/rs\.?/gi, '').replace(/\/[-]/g, '').trim();
    const amount = parseFloat(cleaned);

    if (isNaN(amount) || amount <= 0) {
      return ctx.replyWithHTML(
        `⚠️ <b>Invalid Amount!</b>\n` +
        `Please enter a valid positive number in Rupees (e.g. <code>15000</code>):`,
        inlineKeyboards.cancelOnly()
      );
    }

    sessionStore.update(userId, {
      step: 'AWAITING_SOURCE',
      data: { amount }
    });

    return ctx.replyWithHTML(
      `✅ Amount: <b>${formatINR(amount)}</b>\n\n` +
      `👤 <b>Enter the Income Source or Customer Name:</b>\n` +
      `<i>(e.g., 'Kottayam Rubber Traders', 'Suresh Kumar', 'Direct Sale')</i>`,
      inlineKeyboards.cancelOnly()
    );
  }

  // 2. Source / Customer step
  if (session.step === 'AWAITING_SOURCE') {
    if (!text) {
      return ctx.reply('Please enter a valid customer name or income source:');
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

  // 3. Custom Date input step
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
      `<i>(e.g., 'Sheet rubber 200 kg @ 180/kg', or press Skip)</i>`,
      inlineKeyboards.skipOptionalNote()
    );
  }

  // 4. Description / Note step
  if (session.step === 'AWAITING_NOTE') {
    sessionStore.update(userId, {
      step: 'CONFIRMATION',
      data: { description: text }
    });

    return showIncomeConfirmation(ctx);
  }

  return false;
}

/**
 * Handle date selection callback (Today, Yesterday, Custom)
 */
async function handleDateSelection(ctx, dateVal) {
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

  // Selected Today or Yesterday
  const actualDate = dateVal.replace('date_val_', '');
  sessionStore.update(userId, {
    step: 'AWAITING_NOTE',
    data: { transactionDate: actualDate }
  });

  const text = 
    `📅 Date set to: <b>${actualDate}</b>\n\n` +
    `📝 <b>Optional: Add a description or note:</b>\n` +
    `<i>(e.g., 'Grade 1 sheet rubber, Lot #4', or press Skip)</i>`;

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
 * Handle Skip Note callback
 */
async function handleSkipNote(ctx) {
  const userId = ctx.from.id;
  const session = sessionStore.get(userId);
  if (!session || session.flow !== FLOW) return false;

  sessionStore.update(userId, {
    step: 'CONFIRMATION',
    data: { description: '' }
  });

  return showIncomeConfirmation(ctx);
}

/**
 * Displays summary card before saving
 */
async function showIncomeConfirmation(ctx) {
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
 * Handle final save confirmation
 */
async function handleConfirmSave(ctx) {
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
    const txId = generateTransactionId('income');
    const senderName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || ctx.from.username || 'Staff';

    const payload = {
      transactionId: txId,
      transactionDate: session.data.transactionDate,
      type: 'Income',
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
        `❌ <b>Error Saving Transaction:</b>\n${escapeHtml(res.error || 'Unknown error')}\n\n` +
        `<i>Please verify your Google Apps Script setup.</i>`,
        inlineKeyboards.confirmTransaction()
      );
    }

    // Successfully saved
    sessionStore.clear(userId);

    const successText = 
      `✅ <b>Income Recorded Successfully!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 <b>Tx ID:</b> <code>${txId}</code>\n` +
      `💰 <b>Amount:</b> <b>${formatINR(session.data.amount)}</b>\n` +
      `📁 <b>Category:</b> ${escapeHtml(session.data.category)}\n` +
      `👤 <b>Customer/Source:</b> ${escapeHtml(session.data.sourceOrPurpose)}\n` +
      `📅 <b>Date:</b> ${session.data.transactionDate}\n` +
      (session.data.description ? `📝 <b>Note:</b> ${escapeHtml(session.data.description)}\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `<i>Saved to Google Sheets ledger.</i>`;

    return ctx.replyWithHTML(successText, inlineKeyboards.afterSave('menu_income'));

  } catch (err) {
    logger.error('Error saving income transaction:', err);
    sessionStore.update(userId, { isSubmitting: false });
    return ctx.replyWithHTML(`❌ Failed to save transaction: ${escapeHtml(err.message)}`, inlineKeyboards.confirmTransaction());
  }
}

module.exports = {
  startIncomeFlow,
  handleCategorySelection,
  handleIncomeTextInput,
  handleDateSelection,
  handleSkipNote,
  handleConfirmSave
};
