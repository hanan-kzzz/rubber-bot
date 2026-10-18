const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Checks if a given Telegram numeric user ID is the business owner
 */
function isOwner(userId) {
  if (!config.ownerId) return false;
  return Number(userId) === Number(config.ownerId);
}

/**
 * Checks if a given Telegram numeric user ID is authorized (either owner or staff)
 */
function isAuthorized(userId) {
  const numId = Number(userId);
  if (isOwner(numId)) return true;
  return config.allowedStaffIds.includes(numId);
}

/**
 * Telegraf middleware to enforce authentication for all messages & callbacks
 */
function authMiddleware() {
  return async (ctx, next) => {
    const userId = ctx.from?.id;

    if (!userId) {
      return; // Ignore updates without user info
    }

    if (!isAuthorized(userId)) {
      const name = ctx.from?.first_name || 'User';
      logger.warn(`Unauthorized access attempt from user: ${name} (ID: ${userId})`);

      const unauthorizedMsg = 
        `⛔ <b>Access Denied</b>\n\n` +
        `Hello ${name}, you are not authorized to access this Rubber Business Accounting Bot.\n\n` +
        `🔑 <b>Your Telegram User ID:</b> <code>${userId}</code>\n\n` +
        `<i>Please forward your User ID to the business owner to request access.</i>`;

      if (ctx.callbackQuery) {
        await ctx.answerCbQuery('⛔ Access Denied. Contact owner.', { show_alert: true });
        return ctx.replyWithHTML(unauthorizedMsg);
      }

      return ctx.replyWithHTML(unauthorizedMsg);
    }

    // Attach role flags to context for easy use in handlers
    ctx.state.isOwner = isOwner(userId);
    ctx.state.isStaff = !ctx.state.isOwner;

    return next();
  };
}

/**
 * Guard middleware for Owner-only actions (e.g. employee management)
 */
function requireOwner(ctx) {
  if (!isOwner(ctx.from?.id)) {
    const msg = `🔒 <b>Admin Restricted</b>\n\nOnly the Business Owner can manage employees and system settings.`;
    if (ctx.callbackQuery) {
      ctx.answerCbQuery('🔒 Owner only action.', { show_alert: true });
    }
    ctx.replyWithHTML(msg);
    return false;
  }
  return true;
}

module.exports = {
  isOwner,
  isAuthorized,
  authMiddleware,
  requireOwner
};
