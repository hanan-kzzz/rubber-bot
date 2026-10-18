const { getTodayIST } = require('./formatter');

/**
 * Generates unique transaction ID
 * Example: TXN-INC-20261018-9481 or TXN-EXP-20261018-3294
 */
function generateTransactionId(type = 'income') {
  const isIncome = type.toLowerCase() === 'income';
  const prefix = isIncome ? 'TXN-INC' : 'TXN-EXP';
  const dateStr = getTodayIST().replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${dateStr}-${randomSuffix}`;
}

module.exports = {
  generateTransactionId
};
