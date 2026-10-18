const logger = require('../utils/logger');

// In-memory store: userId -> { flow, step, data, updatedAt, isSubmitting }
const sessions = new Map();

// Session timeout: 15 minutes
const SESSION_TTL_MS = 15 * 60 * 1000;

// Periodic cleanup of expired sessions
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [userId, session] of sessions.entries()) {
    if (now - session.updatedAt > SESSION_TTL_MS) {
      sessions.delete(userId);
      logger.debug(`Session expired and cleared for user ${userId}`);
    }
  }
}, 5 * 60 * 1000);
cleanupTimer.unref();

const sessionStore = {
  /**
   * Get current session for user, or null if none
   */
  get: (userId) => {
    const session = sessions.get(String(userId));
    if (!session) return null;
    if (Date.now() - session.updatedAt > SESSION_TTL_MS) {
      sessions.delete(String(userId));
      return null;
    }
    return session;
  },

  /**
   * Set or initialize a session for user
   */
  set: (userId, flow, step, data = {}) => {
    const entry = {
      flow,
      step,
      data: { ...data },
      updatedAt: Date.now(),
      isSubmitting: false
    };
    sessions.set(String(userId), entry);
    return entry;
  },

  /**
   * Update existing session step and/or merge data
   */
  update: (userId, updateFields = {}) => {
    const existing = sessionStore.get(userId);
    if (!existing) return null;

    if (updateFields.flow) existing.flow = updateFields.flow;
    if (updateFields.step) existing.step = updateFields.step;
    if (updateFields.data) {
      existing.data = { ...existing.data, ...updateFields.data };
    }
    if (typeof updateFields.isSubmitting === 'boolean') {
      existing.isSubmitting = updateFields.isSubmitting;
    }
    existing.updatedAt = Date.now();
    sessions.set(String(userId), existing);
    return existing;
  },

  /**
   * Clear session for user
   */
  clear: (userId) => {
    sessions.delete(String(userId));
  }
};

module.exports = sessionStore;
