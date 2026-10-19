const inlineKeyboards = require('../keyboards/inlineKeyboards');
const replyKeyboards = require('../keyboards/replyKeyboards');
const sessionStore = require('../services/sessionStore');
const { isOwner } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * Sends or edits message to display the Main Menu
 */
async function showMainMenu(ctx, isEdit = false) {
  const userId = ctx.from?.id;
  sessionStore.clear(userId);

  const owner = isOwner(userId);
  const name = ctx.from?.first_name || 'Partner';

  const welcomeText = 
    `🌳 <b>Rubber Business Accounting Tracker</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Hello <b>${name}</b>! Welcome to your accounting bot.\n\n` +
    `Tap any pinned button below to record daily transactions, view financial reports, or launch the interactive dashboard:\n` +
    `• <b>👑 Executive Hub:</b> Interactive KPIs, charts & visual Web App\n` +
    `• <b>Income / Expense:</b> Record rubber sales & daily expenses\n` +
    `• <b>Staff Wages:</b> Record actual daily wages paid\n` +
    `• <b>Goods Transactions:</b> Track goods income vs purchases\n` +
    `• <b>Reports:</b> Instant Daily, Monthly & Custom cashflow\n` +
    `• <b>AI Analysis:</b> Full Excel download & ready-to-use AI prompts\n\n` +
    `<i>All entries are saved securely in your Google Sheet ledger.</i>`;

  const keyboard = inlineKeyboards.mainMenu(owner);
  const persistentKb = replyKeyboards.mainMenu(owner);

  if (isEdit && ctx.callbackQuery) {
    try {
      await ctx.editMessageText(welcomeText, {
        parse_mode: 'HTML',
        ...keyboard
      });
      return;
    } catch (e) {
      // If message cannot be edited (e.g. content identical), send reply
    }
  }

  return ctx.replyWithHTML(welcomeText, persistentKb);
}

/**
 * Displays Help information
 */
async function showHelp(ctx) {
  const helpText = 
    `❓ <b>How to Use This Bot:</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `<b>0. 👑 Executive Dashboard (/dashboard):</b>\n` +
    `Instant visual dashboard with period switchers (Today, 7 Days, Month, All-Time), visual cashflow bars, profit margins, and a 1-tap launch button for the visual Web App / Mini App with interactive charts.\n\n` +
    `<b>1. ➕ Add Income:</b>\n` +
    `Record rubber sales, goods sales, customer payments, or other income.\n\n` +
    `<b>2. ➖ Add Expense:</b>\n` +
    `Record business purchases, tea/coffee, maintenance, utilities, or misc expenses.\n\n` +
    `<b>3. 👷 Staff Wages:</b>\n` +
    `Pick a worker and enter the actual daily wage paid today (no fixed salary restrictions).\n\n` +
    `<b>4. 🚗 Travel Expenses:</b>\n` +
    `Record vehicle/travel costs, including driver/worker, route, and purpose.\n\n` +
    `<b>5. 📦 Goods Transactions:</b>\n` +
    `Shows total goods sold vs total goods bought, and the exact difference.\n\n` +
    `<b>6. 📊 Reports:</b>\n` +
    `• <b>Daily Report:</b> Today's income, expenses & net cashflow\n` +
    `• <b>Monthly Report:</b> Current month summary\n` +
    `• <b>Custom Date:</b> Summary between any two dates\n\n` +
    `<b>7. 📄 Recent Records:</b>\n` +
    `Shows the latest 10 transactions recorded in your Google Sheet.\n\n` +
    `<b>8. 🤝 Customer Directory (Admin):</b>\n` +
    `Manage registered rubber buyers and customers. New customer names entered during Income recording are automatically added here for quick one-tap access.\n\n` +
    `<b>9. 🤖 AI Sheet Analysis & Prompts:</b>\n` +
    `Direct link to your Google Spreadsheet with ready-to-copy AI prompts to analyze profitability, customer concentration, labor wage variances, and cost leakages in ChatGPT, Gemini, or Claude.\n\n` +
    `💡 <i>Tip: You can press ❌ Cancel anytime to abort an in-progress entry.</i>`;

  return ctx.replyWithHTML(helpText, inlineKeyboards.returnToMainMenu());
}

module.exports = {
  showMainMenu,
  showHelp
};
