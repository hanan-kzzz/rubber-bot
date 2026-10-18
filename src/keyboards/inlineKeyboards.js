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
      ]
    ];

    if (isOwner) {
      buttons.push([
        Markup.button.callback('👥 Manage Employees (Admin)', 'menu_employees')
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
  }
};

module.exports = inlineKeyboards;
