const { Markup } = require('telegraf');
const inlineKeyboards = require('../keyboards/inlineKeyboards');
const sessionStore = require('../services/sessionStore');
const sheetsService = require('../services/sheetsService');
const { requireOwner } = require('../middleware/auth');
const { formatINR, escapeHtml } = require('../utils/formatter');
const logger = require('../utils/logger');

const FLOW = 'EMPLOYEE_MGMT';

/**
 * Show Admin Employee Management Menu
 */
async function showEmployeeMenu(ctx) {
  if (!requireOwner(ctx)) return;

  const text = 
    `👥 <b>Employee Management (Admin)</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Manage your rubber estate workers and review their recorded wage history:`;

  if (ctx.callbackQuery) {
    try {
      return await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        ...inlineKeyboards.employeeManagement()
      });
    } catch (e) {}
  }

  return ctx.replyWithHTML(text, inlineKeyboards.employeeManagement());
}

/**
 * Start Add Employee
 */
async function startAddEmployee(ctx) {
  if (!requireOwner(ctx)) return;

  const userId = ctx.from.id;
  sessionStore.set(userId, FLOW, 'AWAITING_ADD_NAME');

  const text = 
    `➕ <b>Add New Employee</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Please reply with the employee's full name:`;

  if (ctx.callbackQuery) {
    try {
      return await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        ...inlineKeyboards.cancelOnly()
      });
    } catch (e) {}
  }

  return ctx.replyWithHTML(text, inlineKeyboards.cancelOnly());
}

/**
 * View Employee List
 */
async function showEmployeeList(ctx) {
  if (!requireOwner(ctx)) return;

  if (ctx.callbackQuery) {
    try {
      await ctx.answerCbQuery('📋 Loading employees...');
    } catch (e) {}
  }

  try {
    const res = await sheetsService.getEmployees(false);
    if (!res.success) {
      return ctx.replyWithHTML(`❌ Failed to fetch employees: ${escapeHtml(res.error)}`, inlineKeyboards.returnToMainMenu());
    }

    const employees = res.employees || [];
    if (employees.length === 0) {
      return ctx.replyWithHTML(
        `📋 <b>Employee Directory</b>\n━━━━━━━━━━━━━━━━━━━━━\n<i>No employees recorded yet. Click "Add New Employee" to register workers.</i>`,
        inlineKeyboards.employeeManagement()
      );
    }

    let text = `📋 <b>Employee Directory (${employees.length})</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
    employees.forEach(emp => {
      const statusIcon = emp.status.toLowerCase() === 'active' ? '🟢' : '🔴';
      text += `• <b>${escapeHtml(emp.name)}</b> [<code>${emp.id}</code>]\n`;
      text += `  Status: ${statusIcon} <i>${emp.status}</i>\n\n`;
    });

    return ctx.replyWithHTML(text, inlineKeyboards.employeeManagement());
  } catch (err) {
    logger.error('Error fetching employee list:', err);
    return ctx.replyWithHTML(`❌ Error: ${escapeHtml(err.message)}`, inlineKeyboards.returnToMainMenu());
  }
}

/**
 * Show Toggle Active Status buttons
 */
async function showToggleStatusMenu(ctx) {
  if (!requireOwner(ctx)) return;

  try {
    const res = await sheetsService.getEmployees(false);
    const employees = res.employees || [];

    if (employees.length === 0) {
      return ctx.replyWithHTML('No employees found to update.', inlineKeyboards.employeeManagement());
    }

    const buttons = [];
    employees.forEach(emp => {
      const isAct = emp.status.toLowerCase() === 'active';
      const label = isAct ? `🔴 Deactivate ${emp.name}` : `🟢 Activate ${emp.name}`;
      buttons.push([Markup.button.callback(label, `emp_toggle_${emp.id}`)]);
    });
    buttons.push([Markup.button.callback('⬅️ Back to Employee Menu', 'menu_employees')]);

    const keyboard = Markup.inlineKeyboard(buttons);
    const text = `🔄 <b>Toggle Employee Active Status:</b>\n<i>Tap an employee below to change status:</i>`;

    if (ctx.callbackQuery) {
      try {
        return await ctx.editMessageText(text, {
          parse_mode: 'HTML',
          ...keyboard
        });
      } catch (e) {}
    }

    return ctx.replyWithHTML(text, keyboard);
  } catch (err) {
    logger.error('Error in toggle status menu:', err);
    return ctx.replyWithHTML(`❌ Error: ${escapeHtml(err.message)}`, inlineKeyboards.employeeManagement());
  }
}

/**
 * Execute Toggle Status
 */
async function handleToggleStatusAction(ctx, empId) {
  if (!requireOwner(ctx)) return;

  await ctx.answerCbQuery('🔄 Updating status...');
  try {
    const res = await sheetsService.toggleEmployeeStatus(empId);
    if (!res.success) {
      return ctx.replyWithHTML(`❌ Failed to update employee: ${escapeHtml(res.error)}`, inlineKeyboards.employeeManagement());
    }

    const newStatusIcon = res.newStatus.toLowerCase() === 'active' ? '🟢' : '🔴';
    const text = `✅ <b>Employee Updated:</b>\n<b>${escapeHtml(res.name)}</b> status changed to ${newStatusIcon} <b>${res.newStatus}</b>.`;

    await ctx.replyWithHTML(text);
    return showToggleStatusMenu(ctx);
  } catch (err) {
    logger.error('Error updating employee status:', err);
    return ctx.replyWithHTML(`❌ Error: ${escapeHtml(err.message)}`, inlineKeyboards.employeeManagement());
  }
}

/**
 * View wage summary per employee
 */
async function showWageSummaryMenu(ctx) {
  if (!requireOwner(ctx)) return;

  try {
    const res = await sheetsService.getEmployees(false);
    const employees = res.employees || [];

    const buttons = [
      [Markup.button.callback('📊 All Employees (Total)', 'emp_wages_all')]
    ];

    for (let i = 0; i < employees.length; i += 2) {
      const row = [Markup.button.callback(`👤 ${employees[i].name}`, `emp_wages_${employees[i].name}`)];
      if (employees[i + 1]) {
        row.push(Markup.button.callback(`👤 ${employees[i + 1].name}`, `emp_wages_${employees[i + 1].name}`));
      }
      buttons.push(row);
    }

    buttons.push([Markup.button.callback('⬅️ Back to Employee Menu', 'menu_employees')]);

    const text = `💰 <b>View Recorded Wage History</b>\nSelect an employee or view totals for all workers:`;

    if (ctx.callbackQuery) {
      try {
        return await ctx.editMessageText(text, {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard(buttons)
        });
      } catch (e) {}
    }

    return ctx.replyWithHTML(text, Markup.inlineKeyboard(buttons));
  } catch (err) {
    logger.error('Error loading wage breakdown menu:', err);
    return ctx.replyWithHTML(`❌ Error: ${escapeHtml(err.message)}`, inlineKeyboards.employeeManagement());
  }
}

/**
 * Display Wage Records for selected employee
 */
async function handleShowEmployeeWages(ctx, target) {
  if (!requireOwner(ctx)) return;

  const empName = target === 'all' ? null : target;
  await ctx.answerCbQuery('📊 Calculating wages...');

  try {
    const res = await sheetsService.getEmployeeWages(empName);
    if (!res.success) {
      return ctx.replyWithHTML(`❌ Failed to fetch wage records: ${escapeHtml(res.error)}`, inlineKeyboards.employeeManagement());
    }

    const title = empName ? `Wage History: ${empName}` : `Total Wage Payments (All Workers)`;
    let text = `💰 <b>${escapeHtml(title)}</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `💵 <b>Total Wages Paid:</b> <b>${formatINR(res.totalWages)}</b>\n`;
    text += `🔢 <b>Total Wage Payments:</b> ${res.count}\n\n`;

    if (res.records && res.records.length > 0) {
      text += `<b>Recent Wage Payments:</b>\n`;
      // Show latest 5 records
      const recent = res.records.slice(-5).reverse();
      recent.forEach(r => {
        text += `• <b>${r.date}</b>: ${formatINR(r.amount)} (${escapeHtml(r.employeeName)})\n`;
        if (r.description) text += `   <i>${escapeHtml(r.description)}</i>\n`;
      });
    } else {
      text += `<i>No wage records found.</i>\n`;
    }

    return ctx.replyWithHTML(text, inlineKeyboards.employeeManagement());
  } catch (err) {
    logger.error('Error fetching employee wages:', err);
    return ctx.replyWithHTML(`❌ Error: ${escapeHtml(err.message)}`, inlineKeyboards.employeeManagement());
  }
}

/**
 * Handle text input during Employee management flow
 */
async function handleEmployeeTextInput(ctx) {
  const userId = ctx.from.id;
  const session = sessionStore.get(userId);

  if (!session || session.flow !== FLOW) return false;

  const text = ctx.message.text.trim();

  if (session.step === 'AWAITING_ADD_NAME') {
    if (!text || text.length < 2) {
      return ctx.reply('Please enter a valid employee name (at least 2 characters):');
    }

    sessionStore.clear(userId);
    await ctx.reply(`⏳ Registering ${text} in Google Sheets...`);

    try {
      const res = await sheetsService.addEmployee(text, 'Active');
      if (!res.success) {
        return ctx.replyWithHTML(
          `❌ <b>Could not add employee:</b>\n${escapeHtml(res.error)}`,
          inlineKeyboards.employeeManagement()
        );
      }

      const successText = 
        `✅ <b>Employee Registered Successfully!</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `🆔 <b>ID:</b> <code>${res.employee.id}</code>\n` +
        `👤 <b>Name:</b> <b>${escapeHtml(res.employee.name)}</b>\n` +
        `🟢 <b>Status:</b> ${res.employee.status}\n\n` +
        `<i>Worker is now available in the Staff Wages quick selection menu.</i>`;

      return ctx.replyWithHTML(successText, inlineKeyboards.employeeManagement());
    } catch (err) {
      logger.error('Error adding employee:', err);
      return ctx.replyWithHTML(`❌ Error: ${escapeHtml(err.message)}`, inlineKeyboards.employeeManagement());
    }
  }

  return false;
}

module.exports = {
  showEmployeeMenu,
  startAddEmployee,
  showEmployeeList,
  showToggleStatusMenu,
  handleToggleStatusAction,
  showWageSummaryMenu,
  handleShowEmployeeWages,
  handleEmployeeTextInput
};
