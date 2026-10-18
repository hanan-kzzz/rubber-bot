const inlineKeyboards = require('../keyboards/inlineKeyboards');
const sheetsService = require('../services/sheetsService');
const { getTodayIST, getMonthStartIST, getCurrentMonthNameIST, formatGoodsSummary } = require('../utils/formatter');
const logger = require('../utils/logger');

/**
 * Show Goods Transactions summary
 */
async function showGoodsSummary(ctx, period = 'month') {
  let startDate;
  let endDate = getTodayIST();
  let periodTitle;

  if (period === 'today') {
    startDate = getTodayIST();
    periodTitle = `Today (${startDate})`;
  } else {
    startDate = getMonthStartIST();
    periodTitle = `This Month (${getCurrentMonthNameIST()})`;
  }

  if (ctx.callbackQuery) {
    try {
      await ctx.answerCbQuery('📊 Calculating goods totals...');
    } catch (e) {}
  }

  try {
    const report = await sheetsService.getReport(startDate, endDate);
    const htmlText = formatGoodsSummary(report, periodTitle);

    if (ctx.callbackQuery) {
      try {
        return await ctx.editMessageText(htmlText, {
          parse_mode: 'HTML',
          ...inlineKeyboards.goodsHub()
        });
      } catch (e) {}
    }

    return ctx.replyWithHTML(htmlText, inlineKeyboards.goodsHub());
  } catch (err) {
    logger.error('Error fetching goods summary:', err);
    const errorMsg = `❌ <b>Failed to load goods summary:</b>\n${err.message}`;
    return ctx.replyWithHTML(errorMsg, inlineKeyboards.returnToMainMenu());
  }
}

module.exports = {
  showGoodsSummary
};
