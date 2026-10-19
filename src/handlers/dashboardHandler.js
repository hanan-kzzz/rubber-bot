const inlineKeyboards = require('../keyboards/inlineKeyboards');
const dashboardService = require('../services/dashboardService');
const {
  formatTelegramDashboard,
  formatDashboardGoodsView,
  formatDashboardWagesView,
  escapeHtml
} = require('../utils/formatter');
const logger = require('../utils/logger');

/**
 * Display or update the In-Telegram Executive Dashboard
 */
async function showDashboard(ctx, period = 'month', isEdit = false) {
  if (ctx.callbackQuery) {
    try {
      await ctx.answerCbQuery('📊 Loading Dashboard...');
    } catch (e) {}
  }

  try {
    const data = await dashboardService.getDashboardData(period);
    const text = formatTelegramDashboard(data, data.periodLabel);
    const dashboardUrl = dashboardService.getDashboardUrl();
    const keyboard = inlineKeyboards.dashboard(period, dashboardUrl);

    if (isEdit && ctx.callbackQuery) {
      try {
        return await ctx.editMessageText(text, {
          parse_mode: 'HTML',
          ...keyboard
        });
      } catch (err) {
        // Fallback to reply if edit fails
      }
    }

    return await ctx.replyWithHTML(text, keyboard);
  } catch (err) {
    logger.error('Error in showDashboard:', err);
    return ctx.replyWithHTML(
      `❌ <b>Failed to load dashboard:</b>\n${escapeHtml(err.message)}`,
      inlineKeyboards.returnToMainMenu()
    );
  }
}

/**
 * Show deep dive sub-views for Goods or Wages in Telegram
 */
async function showDashboardSubView(ctx, subViewType, period = 'month') {
  if (ctx.callbackQuery) {
    try {
      await ctx.answerCbQuery();
    } catch (e) {}
  }

  try {
    const data = await dashboardService.getDashboardData(period);
    let text = '';

    if (subViewType === 'goods') {
      text = formatDashboardGoodsView(data, data.periodLabel);
    } else if (subViewType === 'wages') {
      text = formatDashboardWagesView(data, data.periodLabel);
    }

    const keyboard = inlineKeyboards.dashboardSubView(period);

    if (ctx.callbackQuery) {
      try {
        return await ctx.editMessageText(text, {
          parse_mode: 'HTML',
          ...keyboard
        });
      } catch (e) {}
    }

    return await ctx.replyWithHTML(text, keyboard);
  } catch (err) {
    logger.error(`Error in showDashboardSubView (${subViewType}):`, err);
    return ctx.replyWithHTML(
      `❌ <b>Failed to load view:</b>\n${escapeHtml(err.message)}`,
      inlineKeyboards.returnToMainMenu()
    );
  }
}

/**
 * Routes all dashboard-related callback queries
 */
async function handleDashboardCallback(ctx) {
  const data = ctx.callbackQuery?.data;
  if (!data) return false;

  logger.debug(`Dashboard callback query received: ${data}`);

  // 1. Main Dashboard menu entry
  if (data === 'menu_dashboard') {
    return showDashboard(ctx, 'month', true);
  }

  // 2. Period Switchers
  if (data === 'dash_p_today') return showDashboard(ctx, 'today', true);
  if (data === 'dash_p_week') return showDashboard(ctx, 'week', true);
  if (data === 'dash_p_month') return showDashboard(ctx, 'month', true);
  if (data === 'dash_p_all') return showDashboard(ctx, 'all', true);

  // 3. Refresh Action
  if (data.startsWith('dash_refresh_')) {
    const period = data.replace('dash_refresh_', '') || 'month';
    return showDashboard(ctx, period, true);
  }

  // 4. Sub-view Deep Dives
  if (data.startsWith('dash_sub_goods_')) {
    const period = data.replace('dash_sub_goods_', '') || 'month';
    return showDashboardSubView(ctx, 'goods', period);
  }

  if (data.startsWith('dash_sub_wages_')) {
    const period = data.replace('dash_sub_wages_', '') || 'month';
    return showDashboardSubView(ctx, 'wages', period);
  }

  return false;
}

module.exports = {
  showDashboard,
  showDashboardSubView,
  handleDashboardCallback
};
