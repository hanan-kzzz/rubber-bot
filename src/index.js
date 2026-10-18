const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { Telegraf } = require('telegraf');
const express = require('express');
const config = require('./config/config');
const logger = require('./utils/logger');
const { authMiddleware } = require('./middleware/auth');
const sessionStore = require('./services/sessionStore');
const inlineKeyboards = require('./keyboards/inlineKeyboards');

// Import Handlers
const { showMainMenu, showHelp } = require('./handlers/menuHandler');
const {
  startIncomeFlow,
  handleCategorySelection,
  handleIncomeTextInput,
  handleDateSelection: handleIncomeDate,
  handleSkipNote: handleIncomeSkipNote,
  handleConfirmSave: handleIncomeConfirmSave
} = require('./handlers/incomeHandler');

const {
  startExpenseMenu,
  showGoodsPurchasesMenu,
  showRefreshmentsMenu,
  showUtilitiesMenu,
  handleExpenseCategorySelection,
  handleExpenseTextInput,
  handleExpenseDateSelection,
  handleExpenseSkipNote,
  handleExpenseConfirmSave
} = require('./handlers/expenseHandler');

const {
  startWagesFlow,
  handleEmployeeSelection,
  handleWagesTextInput,
  handleWagesDateSelection,
  handleWagesSkipNote,
  handleWagesConfirmSave
} = require('./handlers/wagesHandler');

const {
  startTravelFlow,
  handlePersonSelection,
  handleTravelTextInput,
  handleTravelDateSelection,
  handleTravelSkipNote,
  handleTravelConfirmSave
} = require('./handlers/travelHandler');

const { showGoodsSummary } = require('./handlers/goodsHandler');
const {
  handleDailyReport,
  handleMonthlyReport,
  startCustomReportFlow,
  handleCustomReportTextInput
} = require('./handlers/reportHandler');

const {
  showEmployeeMenu,
  startAddEmployee,
  showEmployeeList,
  showToggleStatusMenu,
  handleToggleStatusAction,
  showWageSummaryMenu,
  handleShowEmployeeWages,
  handleEmployeeTextInput
} = require('./handlers/employeeHandler');

const { showRecentTransactions } = require('./handlers/recentHandler');

// Validate minimum required setup
if (!config.botToken) {
  logger.error('CRITICAL: BOT_TOKEN is missing! Please configure it in .env or Render dashboard.');
}

const https = require('https');

// Resilient HTTPS agent to handle Windows/ISP DNS edge cases
const telegramAgent = new https.Agent({
  keepAlive: true,
  lookup: (hostname, options, cb) => {
    if (typeof options === 'function') {
      cb = options;
      options = {};
    }
    if (hostname === 'api.telegram.org') {
      dns.resolve4('api.telegram.org', (err, addresses) => {
        if (!err && addresses && addresses.length > 0) {
          if (options && options.all) {
            return cb(null, addresses.map(addr => ({ address: addr, family: 4 })));
          }
          return cb(null, addresses[0], 4);
        }
        if (options && options.all) {
          return cb(null, [{ address: '149.154.166.110', family: 4 }]);
        }
        return cb(null, '149.154.166.110', 4);
      });
      return;
    }
    return dns.lookup(hostname, options, cb);
  }
});

const bot = new Telegraf(config.botToken || 'dummy_token', {
  telegram: { agent: telegramAgent }
});

// Global error handler for Telegraf
bot.catch((err, ctx) => {
  logger.error(`Telegraf error occurred in update ${ctx.updateType}:`, err);
  try {
    ctx.reply('⚠️ An unexpected error occurred. Please try again or return to /start.');
  } catch (e) {}
});

// Log all incoming updates for debugging
bot.use((ctx, next) => {
  const from = ctx.from;
  const userStr = from ? `${from.first_name || ''} (ID: ${from.id})` : 'System';
  const detail = ctx.message?.text || ctx.callbackQuery?.data || '';
  logger.info(`Received update [${ctx.updateType}] from ${userStr} ${detail ? '-> ' + detail : ''}`);
  return next();
});

// Enforce authentication for every update
bot.use(authMiddleware());

// ==========================================
// 1. COMMAND HANDLERS
// ==========================================
bot.command(['start', 'menu'], async (ctx) => showMainMenu(ctx, false));
bot.command('help', async (ctx) => showHelp(ctx));
bot.command('income', async (ctx) => startIncomeFlow(ctx));
bot.command('expense', async (ctx) => startExpenseMenu(ctx));
bot.command('wages', async (ctx) => startWagesFlow(ctx));
bot.command('travel', async (ctx) => startTravelFlow(ctx));
bot.command('report', async (ctx) => handleDailyReport(ctx));
bot.command('goods', async (ctx) => showGoodsSummary(ctx, 'month'));
bot.command('recent', async (ctx) => showRecentTransactions(ctx));

// ==========================================
// 2. CALLBACK QUERY ROUTING
// ==========================================
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery?.data;
  const userId = ctx.from?.id;

  if (!data) return;

  logger.debug(`User ${userId} clicked callback: ${data}`);

  // Global Cancel Action
  if (data === 'action_cancel') {
    sessionStore.clear(userId);
    try {
      await ctx.answerCbQuery('Action cancelled');
    } catch (e) {}
    return showMainMenu(ctx, true);
  }

  // Global Main Menu Action
  if (data === 'action_main_menu') {
    try {
      await ctx.answerCbQuery();
    } catch (e) {}
    return showMainMenu(ctx, true);
  }

  // Main Menu Shortcuts
  if (data === 'menu_income') return startIncomeFlow(ctx);
  if (data === 'menu_expense') return startExpenseMenu(ctx);
  if (data === 'menu_wages') return startWagesFlow(ctx);
  if (data === 'menu_travel') return startTravelFlow(ctx);
  if (data === 'menu_goods') return showGoodsSummary(ctx, 'month');
  if (data === 'menu_recent') return showRecentTransactions(ctx);
  if (data === 'menu_help') return showHelp(ctx);
  if (data === 'menu_employees') return showEmployeeMenu(ctx);

  // Income Category Selection
  if (data.startsWith('inc_cat_')) {
    return handleCategorySelection(ctx, data);
  }

  // Expense Groups and Categories
  if (data === 'exp_grp_goods') return showGoodsPurchasesMenu(ctx);
  if (data === 'exp_grp_refresh') return showRefreshmentsMenu(ctx);
  if (data === 'exp_grp_utilities') return showUtilitiesMenu(ctx);
  if (data.startsWith('exp_cat_')) {
    return handleExpenseCategorySelection(ctx, data);
  }

  // Staff Wages Selection
  if (data.startsWith('wage_emp_')) {
    return handleEmployeeSelection(ctx, data);
  }

  // Travel Selection
  if (data.startsWith('trv_person_')) {
    return handlePersonSelection(ctx, data);
  }

  // Goods Transaction Hub Actions
  if (data === 'goods_add_income') {
    return handleCategorySelection(ctx, 'inc_cat_goods_income');
  }
  if (data === 'goods_add_purchase') {
    return showGoodsPurchasesMenu(ctx);
  }
  if (data === 'goods_view_today') {
    return showGoodsSummary(ctx, 'today');
  }
  if (data === 'goods_view_month') {
    return showGoodsSummary(ctx, 'month');
  }

  // Reports Actions
  if (data === 'report_daily') return handleDailyReport(ctx);
  if (data === 'report_monthly') return handleMonthlyReport(ctx);
  if (data === 'report_custom') return startCustomReportFlow(ctx);

  // Employee Management Actions (Admin)
  if (data === 'emp_action_add') return startAddEmployee(ctx);
  if (data === 'emp_action_list') return showEmployeeList(ctx);
  if (data === 'emp_action_toggle') return showToggleStatusMenu(ctx);
  if (data === 'emp_action_wages') return showWageSummaryMenu(ctx);
  if (data.startsWith('emp_toggle_')) {
    const empId = data.replace('emp_toggle_', '');
    return handleToggleStatusAction(ctx, empId);
  }
  if (data.startsWith('emp_wages_')) {
    const target = data.replace('emp_wages_', '');
    return handleShowEmployeeWages(ctx, target);
  }

  // Date Selection Routing (routes to active wizard flow)
  if (data.startsWith('date_val_') || data === 'date_custom') {
    const session = sessionStore.get(userId);
    if (!session) return ctx.answerCbQuery('Session expired', { show_alert: true });

    if (session.flow === 'INCOME') return handleIncomeDate(ctx, data);
    if (session.flow === 'EXPENSE') return handleExpenseDateSelection(ctx, data);
    if (session.flow === 'WAGES') return handleWagesDateSelection(ctx, data);
    if (session.flow === 'TRAVEL') return handleTravelDateSelection(ctx, data);
  }

  // Skip Note Routing
  if (data === 'action_skip_note') {
    const session = sessionStore.get(userId);
    if (!session) return ctx.answerCbQuery('Session expired', { show_alert: true });

    if (session.flow === 'INCOME') return handleIncomeSkipNote(ctx);
    if (session.flow === 'EXPENSE') return handleExpenseSkipNote(ctx);
    if (session.flow === 'WAGES') return handleWagesSkipNote(ctx);
    if (session.flow === 'TRAVEL') return handleTravelSkipNote(ctx);
  }

  // Confirm Save Routing
  if (data === 'action_confirm_save') {
    const session = sessionStore.get(userId);
    if (!session) return ctx.answerCbQuery('Session expired', { show_alert: true });

    if (session.flow === 'INCOME') return handleIncomeConfirmSave(ctx);
    if (session.flow === 'EXPENSE') return handleExpenseConfirmSave(ctx);
    if (session.flow === 'WAGES') return handleWagesConfirmSave(ctx);
    if (session.flow === 'TRAVEL') return handleTravelConfirmSave(ctx);
  }

  return ctx.answerCbQuery();
});

// ==========================================
// 3. TEXT MESSAGE ROUTING
// ==========================================
bot.on('text', async (ctx) => {
  const userId = ctx.from?.id;
  const session = sessionStore.get(userId);

  if (!session) {
    // No active flow: guide user to main menu
    return ctx.replyWithHTML(
      `👋 Please use the clickable buttons below to record transactions or generate reports:`,
      inlineKeyboards.mainMenu(ctx.state?.isOwner)
    );
  }

  // Route text input based on active conversational flow
  if (session.flow === 'INCOME') {
    const handled = await handleIncomeTextInput(ctx);
    if (handled !== false) return;
  }

  if (session.flow === 'EXPENSE') {
    const handled = await handleExpenseTextInput(ctx);
    if (handled !== false) return;
  }

  if (session.flow === 'WAGES') {
    const handled = await handleWagesTextInput(ctx);
    if (handled !== false) return;
  }

  if (session.flow === 'TRAVEL') {
    const handled = await handleTravelTextInput(ctx);
    if (handled !== false) return;
  }

  if (session.flow === 'CUSTOM_REPORT') {
    const handled = await handleCustomReportTextInput(ctx);
    if (handled !== false) return;
  }

  if (session.flow === 'EMPLOYEE_MGMT') {
    const handled = await handleEmployeeTextInput(ctx);
    if (handled !== false) return;
  }
});

// ==========================================
// 4. SERVER & WEBHOOK / POLLING LIFECYCLE
// ==========================================
const app = express();
app.use(express.json());

// Health Check Endpoint (Render checks this to ensure app is alive)
app.get('/', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'Rubber Business Telegram Bot',
    timestamp: new Date().toISOString(),
    ownerConfigured: Boolean(config.ownerId),
    googleScriptConfigured: Boolean(config.googleScriptUrl)
  });
});

async function startServer() {
  const port = config.port;

  // Determine webhook vs polling
  const webhookUrl = config.webhookDomain
    ? `${config.webhookDomain.replace(/\/+$/, '')}/webhook`
    : null;

  if (webhookUrl && config.botToken) {
    try {
      logger.info(`Configuring Telegram webhook at: ${webhookUrl}`);
      app.use(bot.webhookCallback('/webhook'));
      await bot.telegram.setWebhook(webhookUrl);
      logger.info('Telegram webhook registered successfully.');
    } catch (whErr) {
      logger.error('Failed to set webhook:', whErr);
    }
  } else if (config.botToken) {
    logger.info('No webhook URL specified. Running bot in Long Polling mode...');
    try {
      await bot.telegram.deleteWebhook({ drop_pending_updates: false });
      logger.info('Checked and reset webhooks.');
    } catch (e) {
      logger.warn('Could not reset webhook:', e.message);
    }
    const launchPolling = () => {
      logger.info('Telegram Bot polling started. Listening for updates...');
      bot.launch({
        polling: { timeout: 10, limit: 50 },
        allowedUpdates: ['message', 'callback_query']
      }).catch(pollErr => {
        logger.warn('Polling interrupted, reconnecting in 3 seconds: ' + pollErr.message);
        setTimeout(launchPolling, 3000);
      });
    };
    launchPolling();
  }

  app.listen(port, () => {
    logger.info(`HTTP server is running on port ${port}`);
    logger.info(`Owner Telegram ID: ${config.ownerId || 'NOT SET'}`);
    logger.info(`Authorized Staff IDs: ${config.allowedStaffIds.length > 0 ? config.allowedStaffIds.join(', ') : 'None'}`);
  });
}

// Graceful termination handling
process.once('SIGINT', () => {
  logger.info('SIGINT received. Stopping bot...');
  bot.stop('SIGINT');
  process.exit(0);
});

process.once('SIGTERM', () => {
  logger.info('SIGTERM received. Stopping bot...');
  bot.stop('SIGTERM');
  process.exit(0);
});

startServer();
