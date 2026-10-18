const { Markup } = require('telegraf');
const inlineKeyboards = require('../keyboards/inlineKeyboards');
const sessionStore = require('../services/sessionStore');
const sheetsService = require('../services/sheetsService');
const { formatINR, isValidDateString, formatTransactionSummary, escapeHtml } = require('../utils/formatter');
const { generateTransactionId } = require('../utils/idGenerator');
const logger = require('../utils/logger');

const FLOW = 'TRAVEL';

/**
 * Start Travel Expenses flow
 */
async function startTravelFlow(ctx) {
  const userId = ctx.from.id;
  sessionStore.set(userId, FLOW, 'SELECT_PERSON');

  let employees = [];
  try {
    const res = await sheetsService.getEmployees(true);
    if (res.success && Array.isArray(res.employees)) {
      employees = res.employees;
    }
  } catch (e) {
    logger.warn('Could not fetch employees for travel flow:', e.message);
  }

  const buttons = [];
  for (let i = 0; i < employees.length; i += 2) {
    const row = [];
    row.push(Markup.button.callback(`👤 ${employees[i].name}`, `trv_person_${employees[i].name}`));
    if (employees[i + 1]) {
      row.push(Markup.button.callback(`👤 ${employees[i + 1].name}`, `trv_person_${employees[i + 1].name}`));
    }
    buttons.push(row);
  }

  buttons.push([Markup.button.callback('✍️ Enter Other Name', 'trv_person_custom')]);
  buttons.push([Markup.button.callback('❌ Cancel', 'action_cancel')]);

  const keyboard = Markup.inlineKeyboard(buttons);
  const text = 
    `🚗 <b>Record Travel Expense</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Select or enter who travelled:`;

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
 * Handle person selection callback
 */
async function handlePersonSelection(ctx, callbackData) {
  const userId = ctx.from.id;

  if (callbackData === 'trv_person_custom') {
    sessionStore.update(userId, {
      flow: FLOW,
      step: 'AWAITING_PERSON_NAME',
      data: { type: 'Expense', category: 'Travel expenses' }
    });

    const text = 
      `✍️ <b>Enter Person Name</b>\n` +
      `Please reply with the name of the person who travelled:`;

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

  const personName = callbackData.replace('trv_person_', '');
  sessionStore.update(userId, {
    flow: FLOW,
    step: 'AWAITING_ROUTE',
    data: {
      type: 'Expense',
      category: 'Travel expenses',
      employeeName: personName
    }
  });

  const text = 
    `🚗 Traveller: <b>${escapeHtml(personName)}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `📍 <b>Enter starting location and destination:</b>\n` +
    `<i>(e.g., 'Kottayam to Kochi' or 'Estate to Rubber Board')</i>`;

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
 * Handle text input during Travel flow
 */
async function handleTravelTextInput(ctx) {
  const userId = ctx.from.id;
  const session = sessionStore.get(userId);

  if (!session || session.flow !== FLOW) return false;

  const text = ctx.message.text.trim();

  // 1. Custom person name or typed directly
  if (session.step === 'AWAITING_PERSON_NAME' || session.step === 'SELECT_PERSON') {
    if (!text) return ctx.reply('Please enter a valid name:');

    sessionStore.update(userId, {
      flow: FLOW,
      step: 'AWAITING_ROUTE',
      data: {
        type: 'Expense',
        category: 'Travel expenses',
        employeeName: text
      }
    });

    return ctx.replyWithHTML(
      `🚗 Traveller: <b>${escapeHtml(text)}</b>\n\n` +
      `📍 <b>Enter starting location and destination:</b>\n` +
      `<i>(e.g., 'Kottayam to Kochi')</i>`,
      inlineKeyboards.cancelOnly()
    );
  }

  // 2. Travel Route
  if (session.step === 'AWAITING_ROUTE') {
    if (!text) return ctx.reply('Please enter a valid route:');

    sessionStore.update(userId, {
      step: 'AWAITING_PURPOSE',
      data: { travelDetails: text }
    });

    return ctx.replyWithHTML(
      `📍 Route: <b>${escapeHtml(text)}</b>\n\n` +
      `🎯 <b>Enter the purpose of travel:</b>\n` +
      `<i>(e.g., 'Deliver sheet rubber lot', 'Buy machinery spare parts')</i>`,
      inlineKeyboards.cancelOnly()
    );
  }

  // 3. Travel Purpose
  if (session.step === 'AWAITING_PURPOSE') {
    if (!text) return ctx.reply('Please enter travel purpose:');

    sessionStore.update(userId, {
      step: 'AWAITING_AMOUNT',
      data: { sourceOrPurpose: text }
    });

    return ctx.replyWithHTML(
      `🎯 Purpose: <b>${escapeHtml(text)}</b>\n\n` +
      `💵 <b>Enter travel expense amount in Indian Rupees (₹):</b>\n` +
      `<i>(Fuel, bus, train, auto/taxi fare - e.g. <code>450</code>)</i>`,
      inlineKeyboards.cancelOnly()
    );
  }

  // 4. Travel Amount
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
      step: 'AWAITING_DATE',
      data: { amount }
    });

    return ctx.replyWithHTML(
      `✅ Travel Amount: <b>${formatINR(amount)}</b>\n\n` +
      `📅 <b>Select Travel Date:</b>`,
      inlineKeyboards.dateSelection()
    );
  }

  // 5. Custom Date
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
      `📝 <b>Optional: Add a note or vehicle details</b>\n` +
      `<i>(e.g., 'Petrol bill', 'Toll charges included', or press Skip)</i>`,
      inlineKeyboards.skipOptionalNote()
    );
  }

  // 6. Note
  if (session.step === 'AWAITING_NOTE') {
    sessionStore.update(userId, {
      step: 'CONFIRMATION',
      data: { description: text }
    });

    return showTravelConfirmation(ctx);
  }

  return false;
}

/**
 * Handle date callback
 */
async function handleTravelDateSelection(ctx, dateVal) {
  const userId = ctx.from.id;
  const session = sessionStore.get(userId);

  if (!session || session.flow !== FLOW) return false;

  if (dateVal === 'date_custom') {
    sessionStore.update(userId, { step: 'AWAITING_CUSTOM_DATE' });
    const text = 
      `✍️ <b>Enter Custom Travel Date</b>\n` +
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
    `📝 <b>Optional: Add a note or vehicle details:</b>\n` +
    `<i>(e.g., 'Pickup van fuel', or press Skip)</i>`;

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
async function handleTravelSkipNote(ctx) {
  const userId = ctx.from.id;
  const session = sessionStore.get(userId);
  if (!session || session.flow !== FLOW) return false;

  sessionStore.update(userId, {
    step: 'CONFIRMATION',
    data: { description: '' }
  });

  return showTravelConfirmation(ctx);
}

/**
 * Show Review Card
 */
async function showTravelConfirmation(ctx) {
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
 * Save travel transaction
 */
async function handleTravelConfirmSave(ctx) {
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
      category: 'Travel expenses',
      amount: session.data.amount,
      sourceOrPurpose: session.data.sourceOrPurpose,
      employeeName: session.data.employeeName,
      travelDetails: session.data.travelDetails,
      description: session.data.description || '',
      enteredBy: senderName,
      telegramUserId: String(userId)
    };

    const res = await sheetsService.addTransaction(payload);

    if (!res.success) {
      sessionStore.update(userId, { isSubmitting: false });
      return ctx.replyWithHTML(
        `❌ <b>Error Saving Travel Expense:</b>\n${escapeHtml(res.error || 'Unknown error')}\n\n` +
        `<i>Please verify your Google Apps Script setup.</i>`,
        inlineKeyboards.confirmTransaction()
      );
    }

    sessionStore.clear(userId);

    const successText = 
      `✅ <b>Travel Expense Recorded!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 <b>Tx ID:</b> <code>${txId}</code>\n` +
      `🚗 <b>Traveller:</b> ${escapeHtml(session.data.employeeName)}\n` +
      `📍 <b>Route:</b> ${escapeHtml(session.data.travelDetails)}\n` +
      `🎯 <b>Purpose:</b> ${escapeHtml(session.data.sourceOrPurpose)}\n` +
      `💸 <b>Amount:</b> <b>${formatINR(session.data.amount)}</b>\n` +
      `📅 <b>Date:</b> ${session.data.transactionDate}\n` +
      (session.data.description ? `📝 <b>Note:</b> ${escapeHtml(session.data.description)}\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `<i>Saved to Google Sheets ledger.</i>`;

    return ctx.replyWithHTML(successText, inlineKeyboards.afterSave('menu_travel'));

  } catch (err) {
    logger.error('Error saving travel expense:', err);
    sessionStore.update(userId, { isSubmitting: false });
    return ctx.replyWithHTML(`❌ Failed to save travel expense: ${escapeHtml(err.message)}`, inlineKeyboards.confirmTransaction());
  }
}

module.exports = {
  startTravelFlow,
  handlePersonSelection,
  handleTravelTextInput,
  handleTravelDateSelection,
  handleTravelSkipNote,
  handleTravelConfirmSave
};
