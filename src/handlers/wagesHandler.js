const { Markup } = require('telegraf');
const inlineKeyboards = require('../keyboards/inlineKeyboards');
const sessionStore = require('../services/sessionStore');
const sheetsService = require('../services/sheetsService');
const { formatINR, isValidDateString, formatTransactionSummary, escapeHtml } = require('../utils/formatter');
const { generateTransactionId } = require('../utils/idGenerator');
const logger = require('../utils/logger');

const FLOW = 'WAGES';

/**
 * Start Staff Wages flow
 */
async function startWagesFlow(ctx) {
  const userId = ctx.from.id;
  sessionStore.set(userId, FLOW, 'SELECT_EMPLOYEE');

  // Fetch active employees from Google Sheets
  let employees = [];
  try {
    const res = await sheetsService.getEmployees(true);
    if (res.success && Array.isArray(res.employees)) {
      employees = res.employees;
    }
  } catch (e) {
    logger.warn('Could not fetch active employees for wages flow:', e.message);
  }

  const buttons = [];
  // Add buttons 2 per row
  for (let i = 0; i < employees.length; i += 2) {
    const row = [];
    row.push(Markup.button.callback(`👤 ${employees[i].name}`, `wage_emp_${employees[i].id}_${employees[i].name}`));
    if (employees[i + 1]) {
      row.push(Markup.button.callback(`👤 ${employees[i + 1].name}`, `wage_emp_${employees[i + 1].id}_${employees[i + 1].name}`));
    }
    buttons.push(row);
  }

  buttons.push([Markup.button.callback('✍️ Enter Other Name', 'wage_emp_custom')]);
  buttons.push([Markup.button.callback('❌ Cancel', 'action_cancel')]);

  const keyboard = Markup.inlineKeyboard(buttons);
  const text = 
    `👷 <b>Record Staff Daily Wage Payment</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Select the worker/employee who received payment:`;

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
 * Handle employee selected from list
 */
async function handleEmployeeSelection(ctx, callbackData) {
  const userId = ctx.from.id;

  if (callbackData === 'wage_emp_custom') {
    sessionStore.update(userId, {
      flow: FLOW,
      step: 'AWAITING_EMPLOYEE_NAME',
      data: { type: 'Expense', category: 'Staff wages' }
    });

    const text = 
      `✍️ <b>Enter Employee Name</b>\n` +
      `Please reply with the worker's name:`;

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

  // Format: wage_emp_<id>_<name>
  const parts = callbackData.replace('wage_emp_', '').split('_');
  const empName = parts.slice(1).join('_') || parts[0];

  sessionStore.update(userId, {
    flow: FLOW,
    step: 'AWAITING_WAGE_AMOUNT',
    data: {
      type: 'Expense',
      category: 'Staff wages',
      employeeName: empName,
      sourceOrPurpose: `Daily Wage: ${empName}`
    }
  });

  const text = 
    `👷 <b>Employee: ${escapeHtml(empName)}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `💵 <b>Enter the actual daily wage amount paid in ₹:</b>\n\n` +
    `<i>(Record whatever was actually paid today, e.g. <code>900</code> or <code>1200</code>. No fixed salary restrictions)</i>`;

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
 * Handle text input during Wages flow
 */
async function handleWagesTextInput(ctx) {
  const userId = ctx.from.id;
  const session = sessionStore.get(userId);

  if (!session || session.flow !== FLOW) return false;

  const text = ctx.message.text.trim();

  // 1. Employee name if custom entered or typed directly
  if (session.step === 'AWAITING_EMPLOYEE_NAME' || session.step === 'SELECT_EMPLOYEE') {
    if (!text) {
      return ctx.reply('Please enter a valid employee name:');
    }

    sessionStore.update(userId, {
      flow: FLOW,
      step: 'AWAITING_WAGE_AMOUNT',
      data: {
        type: 'Expense',
        category: 'Staff wages',
        employeeName: text,
        sourceOrPurpose: `Daily Wage: ${text}`
      }
    });

    return ctx.replyWithHTML(
      `👷 Employee: <b>${escapeHtml(text)}</b>\n\n` +
      `💵 <b>Enter the actual daily wage amount paid in ₹:</b>\n` +
      `<i>(e.g., <code>950</code> or <code>1200</code>)</i>`,
      inlineKeyboards.cancelOnly()
    );
  }

  // 2. Wage Amount
  if (session.step === 'AWAITING_WAGE_AMOUNT') {
    const cleaned = text.replace(/,/g, '').replace(/₹/g, '').replace(/rs\.?/gi, '').replace(/\/[-]/g, '').trim();
    const amount = parseFloat(cleaned);

    if (isNaN(amount) || amount <= 0) {
      return ctx.replyWithHTML(
        `⚠️ <b>Invalid Wage Amount!</b>\n` +
        `Please enter a valid positive number in Rupees (e.g. <code>900</code>):`,
        inlineKeyboards.cancelOnly()
      );
    }

    sessionStore.update(userId, {
      step: 'AWAITING_DATE',
      data: { amount }
    });

    return ctx.replyWithHTML(
      `✅ Wage Amount: <b>${formatINR(amount)}</b> for <b>${escapeHtml(session.data.employeeName)}</b>\n\n` +
      `📅 <b>Select Payment Date:</b>`,
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
      `📝 <b>Optional: Add a note or work details</b>\n` +
      `<i>(e.g., 'Tapping work - 300 trees', 'Morning shift', or press Skip)</i>`,
      inlineKeyboards.skipOptionalNote()
    );
  }

  // 4. Note
  if (session.step === 'AWAITING_NOTE') {
    sessionStore.update(userId, {
      step: 'CONFIRMATION',
      data: { description: text }
    });

    return showWagesConfirmation(ctx);
  }

  return false;
}

/**
 * Handle date selection callback
 */
async function handleWagesDateSelection(ctx, dateVal) {
  const userId = ctx.from.id;
  const session = sessionStore.get(userId);

  if (!session || session.flow !== FLOW) return false;

  if (dateVal === 'date_custom') {
    sessionStore.update(userId, { step: 'AWAITING_CUSTOM_DATE' });
    const text = 
      `✍️ <b>Enter Custom Payment Date</b>\n` +
      `Please reply with date in <code>YYYY-MM-DD</code> format:`;

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
    `📝 <b>Optional: Add a note or work details:</b>\n` +
    `<i>(e.g., 'Late evening tapping', 'Bonus included', or press Skip)</i>`;

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
 * Skip note
 */
async function handleWagesSkipNote(ctx) {
  const userId = ctx.from.id;
  const session = sessionStore.get(userId);
  if (!session || session.flow !== FLOW) return false;

  sessionStore.update(userId, {
    step: 'CONFIRMATION',
    data: { description: '' }
  });

  return showWagesConfirmation(ctx);
}

/**
 * Confirmation card
 */
async function showWagesConfirmation(ctx) {
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
 * Save wages transaction
 */
async function handleWagesConfirmSave(ctx) {
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
      category: 'Staff wages',
      amount: session.data.amount,
      sourceOrPurpose: `Staff Wage: ${session.data.employeeName}`,
      employeeName: session.data.employeeName,
      travelDetails: '',
      description: session.data.description || '',
      enteredBy: senderName,
      telegramUserId: String(userId)
    };

    const res = await sheetsService.addTransaction(payload);

    if (!res.success) {
      sessionStore.update(userId, { isSubmitting: false });
      return ctx.replyWithHTML(
        `❌ <b>Error Saving Wage Payment:</b>\n${escapeHtml(res.error || 'Unknown error')}\n\n` +
        `<i>Please verify your Google Apps Script setup.</i>`,
        inlineKeyboards.confirmTransaction()
      );
    }

    sessionStore.clear(userId);

    const successText = 
      `✅ <b>Staff Wage Payment Recorded!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 <b>Tx ID:</b> <code>${txId}</code>\n` +
      `👷 <b>Employee:</b> <b>${escapeHtml(session.data.employeeName)}</b>\n` +
      `💸 <b>Actual Wage Paid:</b> <b>${formatINR(session.data.amount)}</b>\n` +
      `📅 <b>Date:</b> ${session.data.transactionDate}\n` +
      (session.data.description ? `📝 <b>Note:</b> ${escapeHtml(session.data.description)}\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `<i>Saved to Google Sheets ledger.</i>`;

    return ctx.replyWithHTML(successText, inlineKeyboards.afterSave('menu_wages'));

  } catch (err) {
    logger.error('Error saving wages transaction:', err);
    sessionStore.update(userId, { isSubmitting: false });
    return ctx.replyWithHTML(`❌ Failed to save wage payment: ${escapeHtml(err.message)}`, inlineKeyboards.confirmTransaction());
  }
}

module.exports = {
  startWagesFlow,
  handleEmployeeSelection,
  handleWagesTextInput,
  handleWagesDateSelection,
  handleWagesSkipNote,
  handleWagesConfirmSave
};
