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

    // Fetch active customers from Google Sheets
    let customers = [];
    try {
      const res = await sheetsService.getCustomers(true);
      if (res && res.success && Array.isArray(res.customers)) {
        customers = res.customers;
      }
    } catch (e) {
      logger.warn('Could not fetch active customers for income flow:', e.message);
    }

    sessionStore.update(userId, {
      step: 'AWAITING_SOURCE',
      data: {
        amount,
        _availableCustomers: customers
      }
    });

    if (customers.length > 0) {
      return ctx.replyWithHTML(
        `✅ Amount: <b>${formatINR(amount)}</b>\n\n` +
        `👤 <b>Select or Enter Customer / Buyer Name:</b>\n` +
        `<i>(Tap a customer below, or type the name directly in chat)</i>`,
        inlineKeyboards.customerSelection(customers)
      );
    }

    return ctx.replyWithHTML(
      `✅ Amount: <b>${formatINR(amount)}</b>\n\n` +
      `👤 <b>Enter the Income Source or Customer Name:</b>\n` +
      `<i>(e.g., 'Kottayam Rubber Traders', 'Suresh Kumar', 'Direct Sale')\n` +
      `New customer names will be auto-saved to your Customer Directory.</i>`,
      inlineKeyboards.cancelOnly()
    );
  }

  // 2. Source / Customer step
  if (session.step === 'AWAITING_SOURCE') {
    if (!text) {
      return ctx.reply('Please enter a valid customer name or income source:');
    }

    sessionStore.update(userId, {
      step: 'AWAITING_PAYMENT_STATUS',
      data: {
        sourceOrPurpose: text,
        customerName: text
      }
    });

    const totalAmt = session.data?.amount || 0;
    return ctx.replyWithHTML(
      `👤 Customer: <b>${escapeHtml(text)}</b>\n` +
      `💰 Total Amount: <b>${formatINR(totalAmt)}</b>\n\n` +
      `💳 <b>Select Payment Status:</b>\n` +
      `• <b>Fully Paid:</b> Customer paid entire amount\n` +
      `• <b>Not Paid (Unpaid):</b> Pending payment / parcel due\n` +
      `• <b>Partial / Parcel Paid:</b> Partial amount received now`,
      inlineKeyboards.paymentStatusSelection()
    );
  }

  // 2b. Partial / Parcel payment amount input step
  if (session.step === 'AWAITING_PARTIAL_AMOUNT') {
    const cleaned = text.replace(/,/g, '').replace(/₹/g, '').replace(/rs\.?/gi, '').replace(/\/[-]/g, '').trim();
    const partialAmt = parseFloat(cleaned);
    const totalAmt = session.data?.amount || 0;

    if (isNaN(partialAmt) || partialAmt <= 0) {
      return ctx.replyWithHTML(
        `⚠️ <b>Invalid Amount!</b>\n` +
        `Please enter a valid positive number for the partial amount received in Rupees:`,
        inlineKeyboards.cancelOnly()
      );
    }

    if (partialAmt >= totalAmt) {
      return ctx.replyWithHTML(
        `⚠️ <b>Amount exceeds or equals total!</b>\n` +
        `The entered amount (<b>${formatINR(partialAmt)}</b>) is equal to or greater than the total bill (<b>${formatINR(totalAmt)}</b>).\n\n` +
        `If the entire amount was received, please select <b>Fully Paid</b>. Otherwise enter the partial amount:`,
        inlineKeyboards.cancelOnly()
      );
    }

    const balDue = totalAmt - partialAmt;
    sessionStore.update(userId, {
      step: 'AWAITING_DATE',
      data: {
        paymentStatus: 'Partial Paid',
        paidAmount: partialAmt,
        balanceDue: balDue
      }
    });

    return ctx.replyWithHTML(
      `📦 <b>Partial / Parcel Payment Set:</b>\n` +
      `• Received Now: <b>${formatINR(partialAmt)}</b>\n` +
      `• Customer Balance Due: 🔴 <b>${formatINR(balDue)}</b>\n\n` +
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
 * Handle customer selected from quick button or custom prompt
 */
async function handleCustomerSelection(ctx, callbackData) {
  const userId = ctx.from.id;
  const session = sessionStore.get(userId);

  if (!session || session.flow !== FLOW) return false;

  if (callbackData === 'inc_cust_custom') {
    sessionStore.update(userId, {
      step: 'AWAITING_SOURCE'
    });

    const text = 
      `✍️ <b>Enter Customer / Buyer Name</b>\n` +
      `Please reply with the customer name:`;

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

  // Format: inc_cust_<id>_<shortName>
  const parts = callbackData.replace('inc_cust_', '').split('_');
  const custId = parts[0];
  let customerName = parts.slice(1).join('_');

  // If available in cached customer list, use full name
  const available = session.data?._availableCustomers || [];
  const found = available.find(c => c.id === custId);
  if (found && found.name) {
    customerName = found.name;
  }

  sessionStore.update(userId, {
    step: 'AWAITING_PAYMENT_STATUS',
    data: {
      sourceOrPurpose: customerName,
      customerName: customerName
    }
  });

  const totalAmt = session.data?.amount || 0;
  const text = 
    `👤 Customer: <b>${escapeHtml(customerName)}</b>\n` +
    `💰 Total Amount: <b>${formatINR(totalAmt)}</b>\n\n` +
    `💳 <b>Select Payment Status:</b>\n` +
    `• <b>Fully Paid:</b> Customer paid entire amount\n` +
    `• <b>Not Paid (Unpaid):</b> Pending payment / parcel due\n` +
    `• <b>Partial / Parcel Paid:</b> Partial amount received now`;

  if (ctx.callbackQuery) {
    try {
      return await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        ...inlineKeyboards.paymentStatusSelection()
      });
    } catch (e) {}
  }

  return ctx.replyWithHTML(text, inlineKeyboards.paymentStatusSelection());
}

/**
 * Handle payment status selection (Paid, Not Paid, Partial Paid)
 */
async function handlePaymentStatusSelection(ctx, callbackData) {
  const userId = ctx.from.id;
  const session = sessionStore.get(userId);

  if (!session || session.flow !== FLOW) return false;

  const totalAmt = session.data?.amount || 0;

  if (callbackData === 'inc_pay_paid') {
    sessionStore.update(userId, {
      step: 'AWAITING_DATE',
      data: {
        paymentStatus: 'Paid',
        paidAmount: totalAmt,
        balanceDue: 0
      }
    });

    const text = 
      `💳 Status: <b>✅ Fully Paid (${formatINR(totalAmt)})</b>\n\n` +
      `📅 <b>Select Transaction Date:</b>\n` +
      `Choose today, yesterday, or type a custom date:`;

    if (ctx.callbackQuery) {
      try {
        return await ctx.editMessageText(text, {
          parse_mode: 'HTML',
          ...inlineKeyboards.dateSelection()
        });
      } catch (e) {}
    }
    return ctx.replyWithHTML(text, inlineKeyboards.dateSelection());
  }

  if (callbackData === 'inc_pay_unpaid') {
    sessionStore.update(userId, {
      step: 'AWAITING_DATE',
      data: {
        paymentStatus: 'Not Paid',
        paidAmount: 0,
        balanceDue: totalAmt
      }
    });

    const text = 
      `💳 Status: ⏳ <b>Not Paid (Unpaid)</b>\n` +
      `• Customer Balance Due: 🔴 <b>${formatINR(totalAmt)}</b>\n\n` +
      `📅 <b>Select Transaction Date:</b>\n` +
      `Choose today, yesterday, or type a custom date:`;

    if (ctx.callbackQuery) {
      try {
        return await ctx.editMessageText(text, {
          parse_mode: 'HTML',
          ...inlineKeyboards.dateSelection()
        });
      } catch (e) {}
    }
    return ctx.replyWithHTML(text, inlineKeyboards.dateSelection());
  }

  if (callbackData === 'inc_pay_partial') {
    sessionStore.update(userId, {
      step: 'AWAITING_PARTIAL_AMOUNT',
      data: {
        paymentStatus: 'Partial Paid'
      }
    });

    const text = 
      `📦 <b>Partial / Parcel Payment</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `Total Bill: <b>${formatINR(totalAmt)}</b>\n\n` +
      `💵 <b>Enter the amount received now in Indian Rupees (₹):</b>\n` +
      `<i>(e.g., <code>15000</code>. Remaining will be recorded as customer due)</i>`;

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

  return false;
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
      telegramUserId: String(userId),
      paymentStatus: session.data.paymentStatus || 'Paid',
      paidAmount: session.data.paidAmount !== undefined ? session.data.paidAmount : session.data.amount,
      balanceDue: session.data.balanceDue !== undefined ? session.data.balanceDue : 0
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

    // Auto-register customer in Customers sheet if not already registered
    const custName = session.data.customerName || session.data.sourceOrPurpose;
    if (custName && custName.length >= 2) {
      sheetsService.addCustomer(custName).catch(err => {
        logger.warn(`Could not auto-add customer "${custName}":`, err.message);
      });
    }

    // Successfully saved
    sessionStore.clear(userId);

    let payStatusStr = '✅ Fully Paid';
    if ((session.data.paymentStatus || '').toLowerCase() === 'not paid') {
      payStatusStr = `⏳ <b>Not Paid</b> (Due: 🔴 ${formatINR(session.data.balanceDue !== undefined ? session.data.balanceDue : session.data.amount)})`;
    } else if ((session.data.paymentStatus || '').toLowerCase() === 'partial paid') {
      payStatusStr = `📦 <b>Partial Paid</b> (Received: ${formatINR(session.data.paidAmount || 0)} | Due: 🔴 ${formatINR(session.data.balanceDue || 0)})`;
    }

    const successText = 
      `✅ <b>Income Recorded Successfully!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 <b>Tx ID:</b> <code>${txId}</code>\n` +
      `💰 <b>Total Amount:</b> <b>${formatINR(session.data.amount)}</b>\n` +
      `💳 <b>Payment:</b> ${payStatusStr}\n` +
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
  handleCustomerSelection,
  handlePaymentStatusSelection,
  handleIncomeTextInput,
  handleDateSelection,
  handleSkipNote,
  handleConfirmSave
};
