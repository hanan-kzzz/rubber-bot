const inlineKeyboards = require('../keyboards/inlineKeyboards');
const sessionStore = require('../services/sessionStore');
const sheetsService = require('../services/sheetsService');
const { getTodayIST, getMonthStartIST, getCurrentMonthNameIST, isValidDateString, formatReportSummary, escapeHtml } = require('../utils/formatter');
const logger = require('../utils/logger');

const FLOW = 'CUSTOM_REPORT';

/**
 * Generate Today's Financial Report
 */
async function handleDailyReport(ctx) {
  const today = getTodayIST();

  if (ctx.callbackQuery) {
    try {
      await ctx.answerCbQuery('📊 Fetching daily report...');
    } catch (e) {}
  }

  try {
    const report = await sheetsService.getReport(today, today);
    const htmlText = formatReportSummary(report, `Daily Financial Report (${today})`);

    return ctx.replyWithHTML(htmlText, inlineKeyboards.returnToMainMenu());
  } catch (err) {
    logger.error('Error generating daily report:', err);
    return ctx.replyWithHTML(`❌ <b>Failed to load daily report:</b>\n${escapeHtml(err.message)}`, inlineKeyboards.returnToMainMenu());
  }
}

/**
 * Generate Current Month's Financial Report
 */
async function handleMonthlyReport(ctx) {
  const startDate = getMonthStartIST();
  const endDate = getTodayIST();
  const monthName = getCurrentMonthNameIST();

  if (ctx.callbackQuery) {
    try {
      await ctx.answerCbQuery('📊 Fetching monthly report...');
    } catch (e) {}
  }

  try {
    const report = await sheetsService.getReport(startDate, endDate);
    const htmlText = formatReportSummary(report, `Monthly Financial Report - ${monthName}`);

    return ctx.replyWithHTML(htmlText, inlineKeyboards.returnToMainMenu());
  } catch (err) {
    logger.error('Error generating monthly report:', err);
    return ctx.replyWithHTML(`❌ <b>Failed to load monthly report:</b>\n${escapeHtml(err.message)}`, inlineKeyboards.returnToMainMenu());
  }
}

/**
 * Start Custom Date Report Flow
 */
async function startCustomReportFlow(ctx) {
  const userId = ctx.from.id;
  sessionStore.set(userId, FLOW, 'AWAITING_START_DATE');

  const text = 
    `📋 <b>Custom Date Financial Report</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `📅 <b>Enter the START date in <code>YYYY-MM-DD</code> format:</b>\n\n` +
    `<i>(Example: <code>2026-10-01</code>)</i>`;

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
 * Handle text input during Custom Date Report flow
 */
async function handleCustomReportTextInput(ctx) {
  const userId = ctx.from.id;
  const session = sessionStore.get(userId);

  if (!session || session.flow !== FLOW) return false;

  const text = ctx.message.text.trim();

  // 1. Start Date
  if (session.step === 'AWAITING_START_DATE') {
    if (!isValidDateString(text)) {
      return ctx.replyWithHTML(
        `⚠️ <b>Invalid Date Format!</b>\n` +
        `Please enter the START date in <code>YYYY-MM-DD</code> format (e.g., <code>2026-10-01</code>):`,
        inlineKeyboards.cancelOnly()
      );
    }

    sessionStore.update(userId, {
      step: 'AWAITING_END_DATE',
      data: { startDate: text }
    });

    return ctx.replyWithHTML(
      `📅 Start Date: <b>${text}</b>\n\n` +
      `📅 <b>Now enter the END date in <code>YYYY-MM-DD</code> format:</b>\n` +
      `<i>(Example: <code>2026-10-18</code>)</i>`,
      inlineKeyboards.cancelOnly()
    );
  }

  // 2. End Date
  if (session.step === 'AWAITING_END_DATE') {
    if (!isValidDateString(text)) {
      return ctx.replyWithHTML(
        `⚠️ <b>Invalid Date Format!</b>\n` +
        `Please enter the END date in <code>YYYY-MM-DD</code> format (e.g., <code>2026-10-18</code>):`,
        inlineKeyboards.cancelOnly()
      );
    }

    const startDate = session.data.startDate;
    const endDate = text;

    if (startDate > endDate) {
      return ctx.replyWithHTML(
        `⚠️ <b>Start date cannot be after end date!</b>\n` +
        `Start: <code>${startDate}</code>\n` +
        `Please enter a valid END date on or after <code>${startDate}</code>:`,
        inlineKeyboards.cancelOnly()
      );
    }

    sessionStore.clear(userId);
    await ctx.reply(`⏳ Generating financial report from ${startDate} to ${endDate}...`);

    try {
      const report = await sheetsService.getReport(startDate, endDate);
      const htmlText = formatReportSummary(report, `Custom Period Report (${startDate} to ${endDate})`);

      return ctx.replyWithHTML(htmlText, inlineKeyboards.returnToMainMenu());
    } catch (err) {
      logger.error('Error generating custom report:', err);
      return ctx.replyWithHTML(`❌ <b>Failed to load report:</b>\n${escapeHtml(err.message)}`, inlineKeyboards.returnToMainMenu());
    }
  }

  return false;
}

module.exports = {
  handleDailyReport,
  handleMonthlyReport,
  startCustomReportFlow,
  handleCustomReportTextInput
};
