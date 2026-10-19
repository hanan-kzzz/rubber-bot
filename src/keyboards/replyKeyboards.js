const { Markup } = require('telegraf');

/**
 * Persistent bottom Reply Keyboards (ReplyKeyboardMarkup)
 * Pinned at the bottom of the chat under the message bar, matching Telegram Desktop/Mobile docked layout.
 */
const replyKeyboards = {
  /**
   * Main Navigation persistent bottom keyboard
   * @param {boolean} isOwner - Whether the user is the bot owner
   */
  mainMenu: (isOwner = false) => {
    const rows = [
      // Row 1: Primary Transaction Actions (2 wide buttons)
      ['➕ Add Income', '➖ Add Expense'],

      // Row 2: Core Business Operations (3 buttons)
      ['👷 Staff Wages', '🚗 Travel Expenses', '📦 Goods Summary'],

      // Row 3: Reports & Ledger Records (3 buttons)
      ['📊 Daily Report', '📅 Monthly Report', '📄 Recent Records'],

      // Row 4: Financial Hub & Customer Directory (3 buttons)
      ['📥 Excel & AI Prompts', '👑 Executive Hub', '👥 Customers']
    ];

    if (isOwner) {
      // Row 5: Admin Management & Reset Controls (3 buttons)
      rows.push(['👷 Employees', '❓ Help', '❌ Cancel / Reset']);
    } else {
      // Staff view: Help and Reset Controls
      rows.push(['❓ Help', '❌ Cancel / Reset']);
    }

    return Markup.keyboard(rows)
      .resize()
      .persistent()
      .placeholder('Tap an action or type a message...');
  },

  /**
   * Remove persistent keyboard if ever needed
   */
  remove: () => Markup.removeKeyboard()
};

module.exports = replyKeyboards;
