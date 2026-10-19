const { Markup } = require('telegraf');
const inlineKeyboards = require('../keyboards/inlineKeyboards');
const sessionStore = require('../services/sessionStore');
const sheetsService = require('../services/sheetsService');
const { requireOwner } = require('../middleware/auth');
const { escapeHtml } = require('../utils/formatter');
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

    let text = `📋 <b>Customer Directory (${customers.length})</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
    customers.forEach(c => {
      const statusIcon = c.status.toLowerCase() === 'active' ? '🟢' : '🔴';
      text += `• <b>${escapeHtml(c.name)}</b> [<code>${c.id}</code>]\n`;
      text += `  Status: ${statusIcon} <i>${c.status}</i>\n\n`;
    });

    return ctx.replyWithHTML(text, inlineKeyboards.customerManagement());
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

module.exports = {
  showCustomerMenu,
  startAddCustomer,
  showCustomerList,
  showToggleCustomerStatusMenu,
  handleToggleCustomerStatusAction,
  handleCustomerTextInput
};
