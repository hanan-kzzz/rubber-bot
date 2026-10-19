const inlineKeyboards = require('../keyboards/inlineKeyboards');
const sessionStore = require('../services/sessionStore');
const sheetsService = require('../services/sheetsService');
const logger = require('../utils/logger');

const AI_PROMPTS = {
  ai_prompt_profit: {
    title: '📊 Full Business Health & Net Profit Audit',
    desc: 'Deep audit of revenue, operating expenses, daily net cashflow, and overall profit margin.',
    prompt: (sheetUrl) =>
      `Act as an expert Chief Financial Officer (CFO) and accounting analyst for my rubber production and trading business.\n\n` +
      `Here is my live Google Sheets ledger link:\n` +
      `${sheetUrl}\n\n` +
      `Please analyze the 'Transactions' and financial data and provide a structured report covering:\n` +
      `1. Executive Summary: Total Income, Total Expenses, and Net Profit (in INR ₹).\n` +
      `2. Revenue Stream Analysis: Rubber Sales vs. Goods Income vs. Customer Payments.\n` +
      `3. Operating Expense Breakdown: Staff daily wages, travel costs, purchases, refreshments, and utilities.\n` +
      `4. Daily Cashflow Volatility: Peak cashflow days vs slow periods.\n` +
      `5. Actionable Recommendations: 3 specific steps I should take immediately to improve net profit margin.`
  },

  ai_prompt_customer: {
    title: '👥 Customer & Rubber Sales Performance',
    desc: 'Ranks top rubber buyers, repeat customer frequency, and revenue concentration.',
    prompt: (sheetUrl) =>
      `Act as a commercial sales analyst specializing in agricultural commodities and rubber trading.\n\n` +
      `Review my Google Sheet accounting data:\n` +
      `${sheetUrl}\n\n` +
      `Please evaluate the 'Transactions' (Income) and 'Customers' sheets and provide:\n` +
      `1. Top 5 Buyers / Customers ranked by total purchase volume and rupee value (₹).\n` +
      `2. Customer Concentration Risk: What percentage of total revenue comes from the top 3 buyers?\n` +
      `3. Purchase Frequency: Average order size, frequency of transactions, and repeat order patterns.\n` +
      `4. Sales Growth Strategy: How to retain top buyers and negotiate better pricing based on order frequency.`
  },

  ai_prompt_wages: {
    title: '👷 Staff Daily Wages & Labor Cost Analysis',
    desc: 'Analyzes daily worker wages, tapping/maintenance labor costs, and variance.',
    prompt: (sheetUrl) =>
      `Act as an operational labor and estate cost management consultant.\n\n` +
      `Review the staff wages recorded in my rubber business ledger:\n` +
      `${sheetUrl}\n\n` +
      `Analyze the 'Employees' sheet and 'Staff wages' category in the 'Transactions' sheet:\n` +
      `1. Total wages paid per worker during the recorded period.\n` +
      `2. Daily wage trends: Average wage paid per day and detection of any abnormal cost spikes.\n` +
      `3. Labor Cost Percentage: What percentage of total business expenses consists of staff wages?\n` +
      `4. Recommendations to optimize labor efficiency and budget daily estate operations effectively.`
  },

  ai_prompt_goods: {
    title: '📦 Goods Trade Margin & Merchandise Profitability',
    desc: 'Compares Goods Income vs. Goods Purchases, net trade margin, and profitability.',
    prompt: (sheetUrl) =>
      `Act as a retail merchandise and trade margin specialist.\n\n` +
      `Review my rubber business ledger data:\n` +
      `${sheetUrl}\n\n` +
      `Examine all transactions under 'Goods Income' and 'Goods and Business Purchases':\n` +
      `1. Total Goods Income earned vs Total Goods Purchases spent.\n` +
      `2. Net Trade Difference / Gross Margin (in ₹ and percentage %).\n` +
      `3. High-cost purchase categories (Raw materials, Supplies, Rubber-related goods).\n` +
      `4. Pricing and inventory recommendations to increase gross margins on goods sales.`
  },

  ai_prompt_expenses: {
    title: '✂️ Expense Optimization & Cost Leakage Detection',
    desc: 'Pinpoints unnecessary expenses, travel cost leaks, and utility spending.',
    prompt: (sheetUrl) =>
      `Act as a business cost-reduction expert and auditor.\n\n` +
      `Review the expense records in my rubber business ledger:\n` +
      `${sheetUrl}\n\n` +
      `Audit all expenses including Travel Expenses, Refreshments (tea/sugar/coffee), Utilities (electrical/cleaning), and Maintenance:\n` +
      `1. Full breakdown of non-wage overhead expenses by category.\n` +
      `2. Travel Cost Audit: Frequent routes, average expense per trip, and potential route optimizations.\n` +
      `3. Micro-expense leakages: Routine spending on refreshments and daily supplies.\n` +
      `4. Concrete checklist of 5 areas where overhead can be trimmed by 10-20% without impacting operations.`
  }
};

/**
 * Display the AI Analysis and Google Sheet Hub
 */
async function showAiAnalysisMenu(ctx) {
  const userId = ctx.from?.id;
  sessionStore.clear(userId);

  const sheetUrl = sheetsService.getSpreadsheetUrl();

  const text =
    `🤖 <b>AI Business Analysis & Sheet Link</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔗 <b>Your Google Spreadsheet:</b>\n` +
    `<code>${sheetUrl}</code>\n\n` +
    `💡 <b>How to analyze your business with AI:</b>\n` +
    `1. Tap any analysis option below to get a specialized AI prompt.\n` +
    `2. Tap the prompt code block to <b>copy it in 1 tap</b>.\n` +
    `3. Open <b>ChatGPT, Gemini, or Claude</b>.\n` +
    `4. Paste the prompt along with your Sheet link (or downloaded Sheet CSV/Excel).\n` +
    `5. The AI will immediately deliver deep financial insights, charts, and recommendations!\n\n` +
    `<i>Select an analysis focus below:</i>`;

  if (ctx.callbackQuery) {
    try {
      return await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...inlineKeyboards.aiAnalysisMenu(sheetUrl)
      });
    } catch (e) {}
  }

  return ctx.replyWithHTML(text, {
    disable_web_page_preview: true,
    ...inlineKeyboards.aiAnalysisMenu(sheetUrl)
  });
}

/**
 * Display a specific AI prompt with 1-tap copy
 */
async function showAiPromptDetail(ctx, promptKey) {
  const promptData = AI_PROMPTS[promptKey];
  if (!promptData) {
    return showAiAnalysisMenu(ctx);
  }

  const sheetUrl = sheetsService.getSpreadsheetUrl();
  const generatedPrompt = promptData.prompt(sheetUrl);

  const text =
    `${promptData.title}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `ℹ️ <i>${promptData.desc}</i>\n\n` +
    `📋 <b>AI Prompt (Tap the text block below to copy):</b>\n\n` +
    `<code>${generatedPrompt}</code>\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔗 <b>Sheet Link:</b> <code>${sheetUrl}</code>\n\n` +
    `🚀 <b>Next Step:</b> Open <b>Gemini, ChatGPT, or Claude</b> on your phone, paste the copied prompt, and hit send!`;

  if (ctx.callbackQuery) {
    try {
      await ctx.answerCbQuery('📋 Prompt ready to copy!');
      return await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...inlineKeyboards.aiPromptDetail(sheetUrl, promptKey)
      });
    } catch (e) {}
  }

  return ctx.replyWithHTML(text, {
    disable_web_page_preview: true,
    ...inlineKeyboards.aiPromptDetail(sheetUrl, promptKey)
  });
}

module.exports = {
  AI_PROMPTS,
  showAiAnalysisMenu,
  showAiPromptDetail
};
