const { Markup } = require('telegraf');
const { getTodayIST, getYesterdayIST } = require('../utils/formatter');
const config = require('../config/config');

const inlineKeyboards = {
  /**
   * Main menu inline keyboard
   */
  mainMenu: (isOwner = false) => {
    const buttons = [
      [
        Markup.button.callback('➕ Add Income', 'menu_income'),
        Markup.button.callback('➖ Add Expense', 'menu_expense')
      ],
      [
        Markup.button.callback('👷 Staff Wages', 'menu_wages'),
        Markup.button.callback('🚗 Travel Expenses', 'menu_travel')
      ],
      [
        Markup.button.callback('📦 Goods Transactions', 'menu_goods'),
        Markup.button.callback('📄 Recent Records', 'menu_recent')
      ],
      [
        Markup.button.callback('📊 Daily Report', 'report_daily'),
        Markup.button.callback('📅 Monthly Report', 'report_monthly')
      ],
      [
        Markup.button.callback('📋 Custom Date Report', 'report_custom'),
        Markup.button.callback('❓ Help', 'menu_help')
      ],
      [
        Markup.button.callback('🤖 AI Analysis & Sheet Link', 'menu_ai_analysis')
      ]
    ];

    if (isOwner) {
      buttons.push([
        Markup.button.callback('👥 Employees (Admin)', 'menu_employees'),
        Markup.button.callback('🤝 Customers (Admin)', 'menu_customers')
      ]);
    }

    return Markup.inlineKeyboard(buttons);
  },

  /**
   * Income categories keyboard
   */
  incomeCategories: () => {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('🌳 Rubber Sales', 'inc_cat_rubber_sales'),
        Markup.button.callback('📦 Goods Income', 'inc_cat_goods_income')
      ],
      [
        Markup.button.callback('👥 Customer Payments', 'inc_cat_cust_payment'),
        Markup.button.callback('💰 Other Income', 'inc_cat_other_income')
      ],
      [
        Markup.button.callback('❌ Cancel', 'action_cancel')
      ]
    ]);
  },

  /**
   * Expense main category groups keyboard
   */
  expenseGroups: () => {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('📦 Goods & Purchases', 'exp_grp_goods'),
        Markup.button.callback('👷 Staff Wages', 'menu_wages')
      ],
      [
        Markup.button.callback('🚗 Travel Expenses', 'menu_travel'),
        Markup.button.callback('☕ Tea, Coffee & Food', 'exp_grp_refresh')
      ],
      [
        Markup.button.callback('💡 Electrical & Cleaning', 'exp_grp_utilities'),
        Markup.button.callback('📌 Other Misc', 'exp_cat_misc')
      ],
      [
        Markup.button.callback('❌ Cancel', 'action_cancel')
      ]
    ]);
  },

  /**
   * Goods & Business purchases sub-categories
   */
  goodsPurchaseCategories: () => {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('Rubber-related purchases', 'exp_cat_rubber_goods'),
        Markup.button.callback('Raw materials', 'exp_cat_raw_materials')
      ],
      [
        Markup.button.callback('Supplies', 'exp_cat_supplies'),
        Markup.button.callback('Other goods purchases', 'exp_cat_other_goods')
      ],
      [
        Markup.button.callback('⬅️ Back', 'menu_expense'),
        Markup.button.callback('❌ Cancel', 'action_cancel')
      ]
    ]);
  },

  /**
   * Refreshments sub-categories
   */
  refreshmentCategories: () => {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('☕ Tea powder', 'exp_cat_tea'),
        Markup.button.callback('🍬 Sugar', 'exp_cat_sugar')
      ],
      [
        Markup.button.callback('☕ Coffee powder', 'exp_cat_coffee'),
        Markup.button.callback('🍲 Food & refreshments', 'exp_cat_food')
      ],
      [
        Markup.button.callback('⬅️ Back', 'menu_expense'),
        Markup.button.callback('❌ Cancel', 'action_cancel')
      ]
    ]);
  },

  /**
   * Utilities & maintenance sub-categories
   */
  utilitiesCategories: () => {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('💡 LED & Electrical', 'exp_cat_led'),
        Markup.button.callback('🧹 Cleaning supplies', 'exp_cat_cleaning')
      ],
      [
        Markup.button.callback('🔧 Maintenance', 'exp_cat_maintenance')
      ],
      [
        Markup.button.callback('⬅️ Back', 'menu_expense'),
        Markup.button.callback('❌ Cancel', 'action_cancel')
      ]
    ]);
  },

  /**
   * Date selection inline keyboard
   */
  dateSelection: () => {
    const today = getTodayIST();
    const yesterday = getYesterdayIST();

    return Markup.inlineKeyboard([
      [
        Markup.button.callback(`📅 Today (${today})`, `date_val_${today}`)
      ],
      [
        Markup.button.callback(`📅 Yesterday (${yesterday})`, `date_val_${yesterday}`)
      ],
      [
        Markup.button.callback('✍️ Enter Custom Date (YYYY-MM-DD)', 'date_custom')
      ],
      [
        Markup.button.callback('❌ Cancel', 'action_cancel')
      ]
    ]);
  },

  /**
   * Skip optional field keyboard
   */
  skipOptionalNote: () => {
    return Markup.inlineKeyboard([
      [Markup.button.callback('⏭️ Skip Description / Note', 'action_skip_note')],
      [Markup.button.callback('❌ Cancel', 'action_cancel')]
    ]);
  },

  /**
   * Transaction final confirmation keyboard
   */
  confirmTransaction: () => {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Confirm & Save', 'action_confirm_save'),
        Markup.button.callback('❌ Cancel', 'action_cancel')
      ]
    ]);
  },

  /**
   * Return to menu or add another after saving
   */
  afterSave: (anotherActionCallback = 'menu_income') => {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('➕ Record Another', anotherActionCallback),
        Markup.button.callback('🏠 Main Menu', 'action_main_menu')
      ]
    ]);
  },

  /**
   * Return to main menu only
   */
  returnToMainMenu: () => {
    return Markup.inlineKeyboard([
      [Markup.button.callback('🏠 Back to Main Menu', 'action_main_menu')]
    ]);
  },

  /**
   * Action buttons shown after viewing a report
   */
  reportActions: () => {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('🤖 AI Sheet Analysis', 'menu_ai_analysis'),
        Markup.button.callback('🏠 Main Menu', 'action_main_menu')
      ]
    ]);
  },

  /**
   * Goods Transactions Hub keyboard
   */
  goodsHub: () => {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('➕ Add Goods Income', 'goods_add_income'),
        Markup.button.callback('➖ Add Goods Purchase', 'goods_add_purchase')
      ],
      [
        Markup.button.callback('📅 View Today', 'goods_view_today'),
        Markup.button.callback('📅 View This Month', 'goods_view_month')
      ],
      [
        Markup.button.callback('🏠 Main Menu', 'action_main_menu')
      ]
    ]);
  },

  /**
   * Employee management hub (Admin/Owner only)
   */
  employeeManagement: () => {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('➕ Add New Employee', 'emp_action_add'),
        Markup.button.callback('📋 View Employee List', 'emp_action_list')
      ],
      [
        Markup.button.callback('🔄 Toggle Active Status', 'emp_action_toggle'),
        Markup.button.callback('💰 Wage Breakdown', 'emp_action_wages')
      ],
      [
        Markup.button.callback('🏠 Main Menu', 'action_main_menu')
      ]
    ]);
  },

  /**
   * Customer management hub (Admin/Owner only)
   */
  customerManagement: () => {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('➕ Add New Customer', 'cust_action_add'),
        Markup.button.callback('📋 View Customer List', 'cust_action_list')
      ],
      [
        Markup.button.callback('🔄 Toggle Active Status', 'cust_action_toggle')
      ],
      [
        Markup.button.callback('🏠 Main Menu', 'action_main_menu')
      ]
    ]);
  },

  /**
   * Customer selection inline keyboard for Income flow
   */
  customerSelection: (customers = []) => {
    const buttons = [];
    for (let i = 0; i < customers.length; i += 2) {
      const row = [];
      const c1 = customers[i];
      const c1Short = c1.name.slice(0, 25);
      row.push(Markup.button.callback(`👤 ${c1.name}`, `inc_cust_${c1.id}_${c1Short}`));
      if (customers[i + 1]) {
        const c2 = customers[i + 1];
        const c2Short = c2.name.slice(0, 25);
        row.push(Markup.button.callback(`👤 ${c2.name}`, `inc_cust_${c2.id}_${c2Short}`));
      }
      buttons.push(row);
    }
    buttons.push([Markup.button.callback('✍️ Enter Other Customer', 'inc_cust_custom')]);
    buttons.push([Markup.button.callback('❌ Cancel', 'action_cancel')]);
    return Markup.inlineKeyboard(buttons);
  },

  /**
   * Cancel confirmation keyboard
   */
  cancelConfirmation: () => {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('❌ Yes, Cancel Entry', 'action_cancel_confirmed'),
        Markup.button.callback('↩️ No, Keep Going', 'action_cancel_resume')
      ]
    ]);
  },

  /**
   * Cancelled notice keyboard
   */
  cancelledNotice: () => {
    return Markup.inlineKeyboard([
      [Markup.button.callback('🏠 Back to Main Menu', 'action_main_menu')]
    ]);
  },

  /**
   * Cancel button only
   */
  cancelOnly: () => {
    return Markup.inlineKeyboard([
      [Markup.button.callback('❌ Cancel', 'action_cancel')]
    ]);
  },

  /**
   * AI Analysis and Google Sheet Hub keyboard
   */
  aiAnalysisMenu: (sheetUrl) => {
    const buttons = [];
    if (sheetUrl && sheetUrl.startsWith('http')) {
      buttons.push([Markup.button.url('📊 Open Google Sheet ↗️', sheetUrl)]);
    }
    buttons.push([
      Markup.button.callback('📊 1. Full Business & Profit Audit', 'ai_prompt_profit')
    ]);
    buttons.push([
      Markup.button.callback('👥 2. Customer & Sales Report', 'ai_prompt_customer'),
      Markup.button.callback('👷 3. Wages & Labor Analysis', 'ai_prompt_wages')
    ]);
    buttons.push([
      Markup.button.callback('📦 4. Goods Trade Margins', 'ai_prompt_goods'),
      Markup.button.callback('✂️ 5. Expense Optimization', 'ai_prompt_expenses')
    ]);
    buttons.push([
      Markup.button.callback('🏠 Back to Main Menu', 'action_main_menu')
    ]);
    return Markup.inlineKeyboard(buttons);
  },

  /**
   * Individual AI prompt detail keyboard
   */
  aiPromptDetail: (sheetUrl, currentKey) => {
    const buttons = [];
    if (sheetUrl && sheetUrl.startsWith('http')) {
      buttons.push([Markup.button.url('📊 Open Google Sheet ↗️', sheetUrl)]);
    }
    const prompts = [
      { key: 'ai_prompt_profit', label: '📊 Profit Audit' },
      { key: 'ai_prompt_customer', label: '👥 Customers' },
      { key: 'ai_prompt_wages', label: '👷 Wages' },
      { key: 'ai_prompt_goods', label: '📦 Goods Margins' },
      { key: 'ai_prompt_expenses', label: '✂️ Expenses' }
    ].filter(p => p.key !== currentKey);

    for (let i = 0; i < prompts.length; i += 2) {
      const row = [Markup.button.callback(prompts[i].label, prompts[i].key)];
      if (prompts[i + 1]) {
        row.push(Markup.button.callback(prompts[i + 1].label, prompts[i + 1].key));
      }
      buttons.push(row);
    }

    buttons.push([
      Markup.button.callback('⬅️ All AI Prompts', 'menu_ai_analysis'),
      Markup.button.callback('🏠 Main Menu', 'action_main_menu')
    ]);
    return Markup.inlineKeyboard(buttons);
  }
};

module.exports = inlineKeyboards;
