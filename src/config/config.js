require('dotenv').config();

const parseNumber = (val, fallback = null) => {
  if (!val) return fallback;
  const num = parseInt(String(val).trim(), 10);
  return isNaN(num) ? fallback : num;
};

const parseNumberArray = (val) => {
  if (!val) return [];
  return String(val)
    .split(',')
    .map(id => parseNumber(id))
    .filter(id => id !== null);
};

const getWebhookDomain = () => {
  if (process.env.WEBHOOK_DOMAIN) {
    const val = process.env.WEBHOOK_DOMAIN.trim();
    return val.startsWith('http') ? val : `https://${val}`;
  }
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL.trim();
  }
  if (process.env.RENDER_EXTERNAL_HOSTNAME) {
    return `https://${process.env.RENDER_EXTERNAL_HOSTNAME.trim()}`;
  }
  return '';
};

const config = {
  // Telegram Bot Token
  botToken: process.env.BOT_TOKEN || '',

  // Access Control: numeric IDs only
  ownerId: parseNumber(process.env.OWNER_ID),
  allowedStaffIds: parseNumberArray(process.env.ALLOWED_STAFF_IDS),

  // Google Apps Script Web App
  googleScriptUrl: process.env.GOOGLE_SCRIPT_URL || '',
  googleScriptSecret: process.env.GOOGLE_SCRIPT_SECRET || 'my_secure_rubber_bot_secret_2026',

  // Server & Webhook (auto-detects Render external URL or hostname)
  port: parseNumber(process.env.PORT, 3000),
  webhookDomain: getWebhookDomain(),

  // Business Category Definitions
  categories: {
    income: [
      { id: 'rubber_sales', name: 'Rubber Sales', icon: '🌳', group: 'Income' },
      { id: 'goods_income', name: 'Goods Income', icon: '📦', group: 'Goods' },
      { id: 'customer_payments', name: 'Customer Payments', icon: '👥', group: 'Income' },
      { id: 'other_income', name: 'Other Income', icon: '💰', group: 'Income' }
    ],
    expenseGroups: [
      {
        id: 'group_goods',
        name: 'Goods & Business Purchases',
        icon: '📦',
        categories: [
          'Rubber-related goods purchases',
          'Raw materials',
          'Supplies',
          'Other goods purchases'
        ]
      },
      {
        id: 'group_refreshments',
        name: 'Tea, Coffee & Food',
        icon: '☕',
        categories: [
          'Tea powder',
          'Sugar',
          'Coffee powder',
          'Food and refreshments'
        ]
      },
      {
        id: 'group_utilities',
        name: 'Electrical, Cleaning & Maintenance',
        icon: '💡',
        categories: [
          'LED bulbs and electrical items',
          'Cleaning supplies',
          'Maintenance'
        ]
      },
      {
        id: 'group_misc',
        name: 'Other Miscellaneous Expenses',
        icon: '📌',
        categories: [
          'Other miscellaneous expenses'
        ]
      }
    ],
    goodsPurchaseCategories: [
      'Rubber-related goods purchases',
      'Raw materials',
      'Supplies',
      'Other goods purchases'
    ]
  }
};

module.exports = config;
