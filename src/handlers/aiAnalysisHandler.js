const fs = require('fs');
const path = require('path');
const os = require('os');
const inlineKeyboards = require('../keyboards/inlineKeyboards');
const sessionStore = require('../services/sessionStore');
const sheetsService = require('../services/sheetsService');
const { getTodayIST, escapeHtml } = require('../utils/formatter');
const logger = require('../utils/logger');

const AI_PROMPTS = {
  ai_prompt_profit: {
    title: '📊 Full Business Health & Net Profit Audit',
    desc: 'Deep audit of revenue, operating expenses, daily net cashflow, and overall profit margin.',
    prompt: () =>
      `Act as an expert Chief Financial Officer (CFO) and accounting analyst for my rubber production and trading business.\n\n` +
      `I have attached my complete business ledger Excel workbook ('Rubber_Business_Ledger.xlsx').\n\n` +
      `Please analyze the 'Transactions', 'Employees', and 'Customers' sheets and provide a structured financial report covering:\n` +
      `1. Executive Summary: Total Income, Total Expenses, and Net Profit Margin (in INR ₹).\n` +
      `2. Revenue Stream Analysis: Rubber Sales vs Goods Income vs Customer Payments.\n` +
      `3. Operating Expense Breakdown: Staff daily wages, travel costs, purchases, refreshments, and utilities.\n` +
      `4. Daily Cashflow Volatility: Peak cashflow days vs slow periods.\n` +
      `5. Actionable Recommendations: 3 specific steps I should take immediately to improve my net profit margin.`
  },

  ai_prompt_customer: {
    title: '👥 Customer & Rubber Sales Performance',
    desc: 'Ranks top rubber buyers, repeat customer frequency, and revenue concentration.',
    prompt: () =>
      `Act as a commercial sales analyst specializing in agricultural commodities and rubber trading.\n\n` +
      `I have attached my rubber business ledger Excel file ('Rubber_Business_Ledger.xlsx').\n\n` +
      `Please evaluate the 'Transactions' (Income) and 'Customers' sheets and provide:\n` +
      `1. Top 5 Buyers / Customers ranked by total purchase volume and rupee value (₹).\n` +
      `2. Customer Concentration Risk: What percentage of total revenue comes from the top 3 buyers?\n` +
      `3. Purchase Frequency: Average order size, frequency of transactions, and repeat order patterns.\n` +
      `4. Sales Growth Strategy: How to retain top buyers and negotiate better pricing based on order frequency.`
  },

  ai_prompt_wages: {
    title: '👷 Staff Daily Wages & Labor Cost Analysis',
    desc: 'Analyzes daily worker wages, tapping/maintenance labor costs, and variance.',
    prompt: () =>
      `Act as an operational labor and estate cost management consultant.\n\n` +
      `I have attached my rubber estate ledger Excel file ('Rubber_Business_Ledger.xlsx').\n\n` +
      `Please analyze the 'Employees' sheet and 'Staff wages' records in the 'Transactions' sheet:\n` +
      `1. Total wages paid per worker during the recorded period.\n` +
      `2. Daily wage trends: Average wage paid per day and detection of any abnormal cost spikes.\n` +
      `3. Labor Cost Percentage: What percentage of total business expenses consists of staff wages?\n` +
      `4. Recommendations to optimize labor efficiency and budget daily estate operations effectively.`
  },

  ai_prompt_goods: {
    title: '📦 Goods Trade Margin & Merchandise Profitability',
    desc: 'Compares Goods Income vs. Goods Purchases, net trade margin, and profitability.',
    prompt: () =>
      `Act as a retail merchandise and trade margin specialist.\n\n` +
      `I have attached my rubber business ledger Excel file ('Rubber_Business_Ledger.xlsx').\n\n` +
      `Please examine all transactions under 'Goods Income' and 'Goods and Business Purchases':\n` +
      `1. Total Goods Income earned vs Total Goods Purchases spent.\n` +
      `2. Net Trade Difference / Gross Margin (in ₹ and percentage %).\n` +
      `3. High-cost purchase categories (Raw materials, Supplies, Rubber-related goods).\n` +
      `4. Pricing and inventory recommendations to increase gross margins on goods sales.`
  },

  ai_prompt_expenses: {
    title: '✂️ Expense Optimization & Cost Leakage Detection',
    desc: 'Pinpoints unnecessary expenses, travel cost leaks, and utility spending.',
    prompt: () =>
      `Act as a business cost-reduction expert and auditor.\n\n` +
      `I have attached my rubber business ledger Excel file ('Rubber_Business_Ledger.xlsx').\n\n` +
      `Audit all expenses including Travel Expenses, Refreshments (tea/sugar/coffee), Utilities (electrical/cleaning), and Maintenance:\n` +
      `1. Full breakdown of non-wage overhead expenses by category.\n` +
      `2. Travel Cost Audit: Frequent routes, average expense per trip, and potential route optimizations.\n` +
      `3. Micro-expense leakages: Routine spending on refreshments and daily supplies.\n` +
      `4. Concrete checklist of 5 areas where overhead can be trimmed by 10-20% without impacting operations.`
  }
};

/**
 * Display the AI Analysis and Excel Download Hub
 */
async function showAiAnalysisMenu(ctx) {
  const userId = ctx.from?.id;
  sessionStore.clear(userId);

  const text =
    `🤖 <b>AI Business Analysis & Excel Hub</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `📥 <b>Instant Excel File (.xlsx):</b>\n` +
    `Download your complete multi-sheet accounting workbook directly to your phone.\n\n` +
    `💡 <b>How to analyze with AI (ChatGPT, Claude, Gemini):</b>\n` +
    `1. Tap <b>📥 Download Excel File (.xlsx)</b> below to receive your ledger file.\n` +
    `2. Pick an analysis prompt and tap <b>📋 Copy Prompt</b>.\n` +
    `3. Open <b>ChatGPT, Claude, or Gemini</b>, upload the downloaded Excel file, and paste the prompt!\n\n` +
    `<i>Choose an action below:</i>`;

  if (ctx.callbackQuery) {
    try {
      return await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        ...inlineKeyboards.aiAnalysisMenu()
      });
    } catch (e) {}
  }

  return ctx.replyWithHTML(text, inlineKeyboards.aiAnalysisMenu());
}

/**
 * Display a specific AI prompt with 1-tap copy button
 */
async function showAiPromptDetail(ctx, promptKey) {
  const promptData = AI_PROMPTS[promptKey];
  if (!promptData) {
    return showAiAnalysisMenu(ctx);
  }

  const generatedPrompt = promptData.prompt();

  const text =
    `${promptData.title}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `ℹ️ <i>${promptData.desc}</i>\n\n` +
    `📋 <b>AI Prompt (Tap the button below to copy, or tap the text block):</b>\n\n` +
    `<code>${escapeHtml(generatedPrompt)}</code>\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `🚀 <b>Next Step:</b> Tap <b>📋 Copy Prompt to Clipboard</b>, then tap <b>📥 Download Excel File</b> and upload both into <b>ChatGPT, Claude, or Gemini</b>!`;

  if (ctx.callbackQuery) {
    try {
      await ctx.answerCbQuery('📋 Prompt ready!');
      return await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        ...inlineKeyboards.aiPromptDetail(generatedPrompt, promptKey)
      });
    } catch (e) {}
  }

  return ctx.replyWithHTML(text, inlineKeyboards.aiPromptDetail(generatedPrompt, promptKey));
}

/**
 * Generates and sends the complete Excel (.xlsx) file to the user in Telegram
 */
async function handleDownloadExcel(ctx) {
  if (ctx.callbackQuery) {
    try {
      await ctx.answerCbQuery('📊 Generating your Excel file...');
    } catch (e) {}
  }

  const statusMsg = await ctx.replyWithHTML(`⏳ <i>Generating your complete Excel ledger (.xlsx)... Please wait a moment.</i>`);

  let tempFilePath = null;
  try {
    const buffer = await sheetsService.generateExcelBuffer();
    const today = getTodayIST();
    const filename = `Rubber_Business_Ledger_${today}.xlsx`;
    const defaultPrompt = AI_PROMPTS.ai_prompt_profit.prompt();

    // Stream from clean temporary file to avoid keeping large multipart payload in memory
    tempFilePath = path.join(os.tmpdir(), `Rubber_Ledger_${Date.now()}_${Math.floor(Math.random() * 10000)}.xlsx`);
    fs.writeFileSync(tempFilePath, buffer);

    const caption =
      `📊 <b>Rubber Business Ledger (.xlsx)</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📅 <b>Date:</b> ${today}\n` +
      `📑 <b>Worksheets:</b> <i>Transactions, Employees, Customers, Categories</i>\n\n` +
      `💡 <b>How to analyze with AI:</b>\n` +
      `1. Save this Excel file to your phone.\n` +
      `2. Tap <b>📋 Copy Profit Audit Prompt</b> below.\n` +
      `3. Open <b>ChatGPT, Claude, or Gemini</b>, attach this file, and paste the prompt!`;

    // Attempt upload with automatic retry if network socket hiccups
    let delivered = null;
    let lastErr = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        delivered = await ctx.replyWithDocument({
          source: tempFilePath,
          filename: filename
        }, {
          caption: caption,
          parse_mode: 'HTML',
          ...inlineKeyboards.excelFileDelivered(defaultPrompt)
        });
        break;
      } catch (err) {
        lastErr = err;
        logger.warn(`Excel upload attempt ${attempt} failed: ${err.message}`);
        if (attempt === 1) {
          await new Promise(r => setTimeout(r, 1500));
        }
      }
    }

    if (!delivered) {
      throw lastErr || new Error('Upload failed after retries');
    }

    // Clean up loading message after successful delivery
    try {
      await ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id);
    } catch (e) {}

    return delivered;

  } catch (err) {
    logger.error('Error generating Excel file:', err);
    try {
      await ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id);
    } catch (e) {}
    return ctx.replyWithHTML(
      `❌ <b>Could not generate Excel file:</b>\n${escapeHtml(err.message)}`,
      inlineKeyboards.returnToMainMenu()
    );
  } finally {
    // Safely remove temporary file
    if (tempFilePath) {
      try {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      } catch (e) {}
    }
  }
}

/**
 * Sends the prompt as a clean raw text message for easy copying/forwarding
 */
async function handleSendRawPrompt(ctx, promptKey) {
  const promptData = AI_PROMPTS[promptKey];
  if (!promptData) return;

  if (ctx.callbackQuery) {
    try {
      await ctx.answerCbQuery('💬 Prompt sent as clean text!');
    } catch (e) {}
  }

  const rawText = promptData.prompt();
  return ctx.reply(rawText);
}

module.exports = {
  AI_PROMPTS,
  showAiAnalysisMenu,
  showAiPromptDetail,
  handleDownloadExcel,
  handleSendRawPrompt
};
