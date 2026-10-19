const { Markup } = require('telegraf');
const inlineKeyboards = require('../keyboards/inlineKeyboards');
const sessionStore = require('../services/sessionStore');
const sheetsService = require('../services/sheetsService');
const { requireOwner } = require('../middleware/auth');
const { formatINR, escapeHtml } = require('../utils/formatter');
const logger = require('../utils/logger');

const FLOW = 'CUSTOMER_MGMT';

/**
 * Show Admin Customer Management Menu
 */
async function showCustomerMenu(ctx) {
  if (!requireOwner(ctx)) return;

  const text = 
    `🤝 <b>Customer Directory (Admin)</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Manage your rubber buyers and customers:\n\n` +
    `• Registered customers appear as quick one-tap buttons when recording income.\n` +
    `• Tracks paid amounts and pending dues / unpaid parcels per customer.\n` +
    `• New customers entered during income recording are also auto-saved here.`;

  if (ctx.callbackQuery) {
    try {
      return await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        ...inlineKeyboards.customerManagement()
      });
    } catch (e) {}
  }

  return ctx.replyWithHTML(text, inlineKeyboards.customerManagement());
}

/**
 * Start Add Customer
 */
async function startAddCustomer(ctx) {
  if (!requireOwner(ctx)) return;

  const userId = ctx.from.id;
  sessionStore.set(userId, FLOW, 'AWAITING_ADD_NAME');

  const text = 
    `➕ <b>Add New Customer</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Please reply with the customer or buyer's name / company name:\n\n` +
    `<i>(e.g., 'Kottayam Rubber Traders', 'Suresh Kumar', 'Apex Latex')</i>`;

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
 * View Customer List
 */
async function showCustomerList(ctx) {
  if (!requireOwner(ctx)) return;

  if (ctx.callbackQuery) {
    try {
      await ctx.answerCbQuery('📋 Loading customers...');
    } catch (e) {}
  }

  try {
    const res = await sheetsService.getCustomers(false);
    if (!res.success) {
      return ctx.replyWithHTML(`❌ Failed to fetch customers: ${escapeHtml(res.error)}`, inlineKeyboards.returnToMainMenu());
    }

    const customers = res.customers || [];
    if (customers.length === 0) {
      return ctx.replyWithHTML(
        `📋 <b>Customer Directory</b>\n━━━━━━━━━━━━━━━━━━━━━\n<i>No customers registered yet. Click "Add New Customer" or record an income transaction.</i>`,
        inlineKeyboards.customerManagement()
      );
    }

    let text = `📋 <b>Customer Directory (${customers.length})</b>\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `👇 <i>Tap any customer name button below to view their individual payment history & statement:</i>\n\n`;

    customers.forEach(c => {
      const statusIcon = c.status.toLowerCase() === 'active' ? '🟢' : '🔴';
      text += `• <b>${escapeHtml(c.name)}</b> [<code>${c.id}</code>]\n`;
      text += `  Status: ${statusIcon} <i>${c.status}</i>\n`;

      if (c.totalIncome !== undefined && c.totalIncome > 0) {
        text += `  💰 Total Billed: ${formatINR(c.totalIncome)}\n`;
        text += `  💵 Received: ${formatINR(c.totalPaid || 0)}\n`;
        if (c.balanceDue > 0) {
          text += `  ⚠️ <b>Pending Due:</b> 🔴 <b>${formatINR(c.balanceDue)}</b>\n`;
        } else {
          text += `  ✅ <b>Balance:</b> <i>All Cleared</i>\n`;
        }
      }
      text += `\n`;
    });

    const keyboard = inlineKeyboards.customerListWithActions(customers);

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
    logger.error('Error fetching customer list:', err);
    return ctx.replyWithHTML(`❌ Error: ${escapeHtml(err.message)}`, inlineKeyboards.returnToMainMenu());
  }
}

/**
 * Show Toggle Active Status buttons
 */
async function showToggleCustomerStatusMenu(ctx) {
  if (!requireOwner(ctx)) return;

  try {
    const res = await sheetsService.getCustomers(false);
    const customers = res.customers || [];

    if (customers.length === 0) {
      return ctx.replyWithHTML('No customers found to update.', inlineKeyboards.customerManagement());
    }

    const buttons = [];
    customers.forEach(c => {
      const isAct = c.status.toLowerCase() === 'active';
      const label = isAct ? `🔴 Deactivate ${c.name}` : `🟢 Activate ${c.name}`;
      buttons.push([Markup.button.callback(label, `cust_toggle_${c.id}`)]);
    });
    buttons.push([Markup.button.callback('⬅️ Back to Customer Menu', 'menu_customers')]);

    const keyboard = Markup.inlineKeyboard(buttons);
    const text = `🔄 <b>Toggle Customer Active Status:</b>\n<i>Tap a customer below to change status:</i>`;

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
    logger.error('Error in customer toggle status menu:', err);
    return ctx.replyWithHTML(`❌ Error: ${escapeHtml(err.message)}`, inlineKeyboards.customerManagement());
  }
}

/**
 * Execute Toggle Status
 */
async function handleToggleCustomerStatusAction(ctx, custId) {
  if (!requireOwner(ctx)) return;

  await ctx.answerCbQuery('🔄 Updating status...');
  try {
    const res = await sheetsService.toggleCustomerStatus(custId);
    if (!res.success) {
      return ctx.replyWithHTML(`❌ Failed to update customer: ${escapeHtml(res.error)}`, inlineKeyboards.customerManagement());
    }

    const newStatusIcon = res.newStatus.toLowerCase() === 'active' ? '🟢' : '🔴';
    const text = `✅ <b>Customer Updated:</b>\n<b>${escapeHtml(res.name)}</b> status changed to ${newStatusIcon} <b>${res.newStatus}</b>.`;

    await ctx.replyWithHTML(text);
    return showToggleCustomerStatusMenu(ctx);
  } catch (err) {
    logger.error('Error updating customer status:', err);
    return ctx.replyWithHTML(`❌ Error: ${escapeHtml(err.message)}`, inlineKeyboards.customerManagement());
  }
}

/**
 * Handle text input during Customer management flow
 */
async function handleCustomerTextInput(ctx) {
  const userId = ctx.from.id;
  const session = sessionStore.get(userId);

  if (!session || session.flow !== FLOW) return false;

  const text = ctx.message.text.trim();

  if (session.step === 'AWAITING_ADD_NAME') {
    if (!text || text.length < 2) {
      return ctx.reply('Please enter a valid customer name (at least 2 characters):');
    }

    sessionStore.clear(userId);
    await ctx.reply(`⏳ Registering "${text}" in Google Sheets...`);

    try {
      const res = await sheetsService.addCustomer(text, 'Active');
      if (!res.success) {
        return ctx.replyWithHTML(
          `❌ <b>Could not add customer:</b>\n${escapeHtml(res.error)}`,
          inlineKeyboards.customerManagement()
        );
      }

      const isExisting = res.alreadyExists;
      const successText = 
        `✅ <b>Customer ${isExisting ? 'Already Exists' : 'Registered Successfully'}!</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `🆔 <b>ID:</b> <code>${res.customer.id}</code>\n` +
        `👤 <b>Name:</b> <b>${escapeHtml(res.customer.name)}</b>\n` +
        `🟢 <b>Status:</b> ${res.customer.status}\n\n` +
        `<i>Customer is now available in the Income quick selection menu.</i>`;

      return ctx.replyWithHTML(successText, inlineKeyboards.customerManagement());
    } catch (err) {
      logger.error('Error adding customer:', err);
      return ctx.replyWithHTML(`❌ Error: ${escapeHtml(err.message)}`, inlineKeyboards.customerManagement());
    }
  }

  return false;
}

/**
 * View Customer Balances & Pending Dues
 */
async function showCustomerDues(ctx) {
  if (!requireOwner(ctx)) return;

  if (ctx.callbackQuery) {
    try {
      await ctx.answerCbQuery('💰 Loading customer dues...');
    } catch (e) {}
  }

  try {
    const res = await sheetsService.getCustomers(false);
    if (!res.success) {
      return ctx.replyWithHTML(`❌ Failed to fetch customers: ${escapeHtml(res.error)}`, inlineKeyboards.customerManagement());
    }

    const customers = res.customers || [];
    const withDues = customers.filter(c => (c.balanceDue || 0) > 0);

    if (withDues.length === 0) {
      const allClearedText = 
        `💰 <b>Customer Balances & Dues</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `🎉 <b>All Customer Accounts Are Cleared!</b>\n` +
        `There are currently no unpaid parcels or pending customer balances.\n\n` +
        `<i>Total registered customers: ${customers.length}</i>`;

      return ctx.replyWithHTML(allClearedText, inlineKeyboards.customerManagement());
    }

    let totalPending = 0;
    let text = `💰 <b>Customer Outstanding Dues / Pending Parcels</b>\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `👇 <i>Tap any customer button below to inspect their individual unpaid payments:</i>\n\n`;

    withDues.forEach((c, idx) => {
      totalPending += (c.balanceDue || 0);
      text += `<b>${idx + 1}. ${escapeHtml(c.name)}</b> [<code>${c.id}</code>]\n`;
      text += `   ⚠️ <b>Due Amount:</b> 🔴 <b>${formatINR(c.balanceDue)}</b>\n`;
      text += `   💰 Total Billed: ${formatINR(c.totalIncome || 0)}\n`;
      text += `   💵 Paid so far: ${formatINR(c.totalPaid || 0)}\n`;
      if (c.unpaidCount) {
        text += `   📦 Unpaid Transactions: ${c.unpaidCount}\n`;
      }
      text += `\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🔴 <b>Total Pending Receivables:</b> <b>${formatINR(totalPending)}</b>\n`;
    text += `<i>Total ${withDues.length} customer(s) with pending balance.</i>`;

    const keyboard = inlineKeyboards.customerDuesListWithActions(withDues);

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
    logger.error('Error fetching customer dues:', err);
    return ctx.replyWithHTML(`❌ Error: ${escapeHtml(err.message)}`, inlineKeyboards.customerManagement());
  }
}

/**
 * Show individual payments and invoices statement for a specific customer
 */
async function showCustomerStatement(ctx, custIdOrName) {
  if (!requireOwner(ctx)) return;

  if (ctx.callbackQuery) {
    try {
      await ctx.answerCbQuery('📄 Loading payments...');
    } catch (e) {}
  }

  try {
    let custId = custIdOrName;
    let custName = custIdOrName;

    const custRes = await sheetsService.getCustomers(false);
    const customers = custRes.customers || [];
    const found = customers.find(c => 
      c.id.toLowerCase() === String(custIdOrName).toLowerCase() || 
      c.name.toLowerCase() === String(custIdOrName).toLowerCase()
    );

    if (found) {
      custId = found.id;
      custName = found.name;
    }

    const res = await sheetsService.getCustomerTransactions(custName, custId);
    if (!res.success) {
      return ctx.replyWithHTML(`❌ Failed to fetch customer payments: ${escapeHtml(res.error)}`, inlineKeyboards.returnToMainMenu());
    }

    const customer = res.customer || { id: custId, name: custName, status: 'Active' };
    const txs = res.transactions || [];
    const totalBilled = res.totalBilled || 0;
    const totalPaid = res.totalPaid || 0;
    const balanceDue = res.balanceDue || 0;

    const statusIcon = (customer.status || '').toLowerCase() === 'active' ? '🟢' : '🔴';
    const dueIcon = balanceDue > 0 ? '🔴' : '🟢';

    let text = `👤 <b>Customer Statement: ${escapeHtml(customer.name)}</b>\n`;
    text += `🆔 ID: <code>${customer.id}</code> | Status: ${statusIcon} <i>${customer.status}</i>\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💰 <b>Total Billed:</b> ${formatINR(totalBilled)}\n`;
    text += `💵 <b>Total Received:</b> ${formatINR(totalPaid)}\n`;
    text += `${dueIcon} <b>Outstanding Balance Due:</b> <b>${formatINR(balanceDue)}</b>\n`;
    text += `🔢 <b>Recorded Transactions:</b> ${txs.length}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (txs.length === 0) {
      text += `<i>No transactions or payments recorded for this customer yet.</i>\n\n`;
      text += `<i>Tap "Record Income for Customer" below to add a transaction.</i>`;
    } else {
      text += `<b>📋 Individual Payments & Invoices (${txs.length}):</b>\n\n`;
      txs.forEach((tx, idx) => {
        const isInc = (tx.type || '').toLowerCase() === 'income';
        const typeIcon = isInc ? '➕' : '➖';

        let pStat = '✅ Fully Paid';
        if ((tx.paymentStatus || '').toLowerCase() === 'not paid') {
          pStat = `⏳ <b>Not Paid</b> (Due: 🔴 ${formatINR(tx.balanceDue !== undefined ? tx.balanceDue : tx.amount)})`;
        } else if ((tx.paymentStatus || '').toLowerCase() === 'partial paid') {
          pStat = `📦 <b>Partial Paid</b> (Received: ${formatINR(tx.paidAmount || 0)} | Due: 🔴 ${formatINR(tx.balanceDue || 0)})`;
        }

        text += `<b>${idx + 1}. ${typeIcon} ${formatINR(tx.amount)}</b> [${escapeHtml(tx.category || 'Income')}]\n`;
        text += `   📅 <b>Date:</b> ${tx.date || '-'}\n`;
        text += `   💳 <b>Payment:</b> ${pStat}\n`;

        if (tx.description) {
          text += `   📝 <b>Note:</b> <i>${escapeHtml(tx.description)}</i>\n`;
        }
        text += `   🆔 <code>${tx.id || '-'}</code>\n\n`;
      });
      text += `━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `<i>Live from Google Sheets ledger.</i>`;
    }

    const keyboard = inlineKeyboards.customerStatementActions(customer.id);

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
    logger.error('Error in showCustomerStatement:', err);
    return ctx.replyWithHTML(`❌ Error: ${escapeHtml(err.message)}`, inlineKeyboards.returnToMainMenu());
  }
}

/**
 * Direct shortcut to start recording income for a specific customer
 */
async function startIncomeForCustomer(ctx, custId) {
  const userId = ctx.from.id;
  const custRes = await sheetsService.getCustomers(false);
  const customers = custRes.customers || [];
  const found = customers.find(c => c.id.toLowerCase() === String(custId).toLowerCase());
  const custName = found ? found.name : 'Customer';

  sessionStore.set(userId, 'INCOME', 'AWAITING_AMOUNT', {
    type: 'Income',
    category: 'Rubber Sales',
    sourceOrPurpose: custName,
    customerName: custName
  });

  const text = 
    `➕ <b>Income for: ${escapeHtml(custName)}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `📁 Category: <b>Rubber Sales</b>\n\n` +
    `💵 <b>Enter the income amount in Indian Rupees (₹):</b>\n\n` +
    `<i>(Type the number, e.g. <code>50000</code> or <code>125000.50</code>)</i>`;

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

module.exports = {
  showCustomerMenu,
  startAddCustomer,
  showCustomerList,
  showCustomerDues,
  showCustomerStatement,
  startIncomeForCustomer,
  showToggleCustomerStatusMenu,
  handleToggleCustomerStatusAction,
  handleCustomerTextInput
};
