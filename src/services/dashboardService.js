const sheetsService = require('./sheetsService');
const config = require('../config/config');
const logger = require('../utils/logger');
const {
  getTodayIST,
  getYesterdayIST,
  getDaysAgoIST,
  getMonthStartIST,
  getCurrentMonthNameIST,
  getPeriodDatesIST
} = require('../utils/formatter');

/**
 * Service to aggregate financial metrics, daily series, and category breakdowns
 * for the Executive Dashboard (both in Telegram and Web App).
 */
class DashboardService {
  /**
   * Resolves the public or local Web Dashboard URL
   */
  getDashboardUrl() {
    if (config.webhookDomain) {
      const cleanDomain = config.webhookDomain.replace(/\/+$/, '');
      return `${cleanDomain}/dashboard`;
    }
    return `http://localhost:${config.port}/dashboard`;
  }

  /**
   * Generates realistic demo data for the rubber business
   */
  generateDemoData(period = 'month', startDate = null, endDate = null) {
    const today = getTodayIST();
    const range = startDate && endDate ? { startDate, endDate, label: `${startDate} to ${endDate}` } : getPeriodDatesIST(period);

    const demoTransactions = [
      {
        id: 'TXN-INC-20261019-1001',
        date: today,
        type: 'Income',
        category: 'Rubber Sales',
        amount: 85000,
        sourceOrPurpose: 'Kottayam Rubber Traders',
        employeeName: '',
        travelDetails: '',
        description: 'Grade RSS-4 Rubber Sheets lot (450 kg)',
        enteredBy: 'Manager'
      },
      {
        id: 'TXN-EXP-20261019-1002',
        date: today,
        type: 'Expense',
        category: 'Staff Wages',
        amount: 4500,
        sourceOrPurpose: '',
        employeeName: 'Raju (Tapper)',
        travelDetails: '',
        description: 'Morning tapping & latex collection wages',
        enteredBy: 'Manager'
      },
      {
        id: 'TXN-EXP-20261018-1003',
        date: getDaysAgoIST(1),
        type: 'Expense',
        category: 'Rubber-related goods purchases',
        amount: 14500,
        sourceOrPurpose: 'Agro Chemicals Depot',
        employeeName: '',
        travelDetails: '',
        description: 'Formic acid & coagulation dishes',
        enteredBy: 'Manager'
      },
      {
        id: 'TXN-INC-20261017-1004',
        date: getDaysAgoIST(2),
        type: 'Income',
        category: 'Goods Income',
        amount: 32000,
        sourceOrPurpose: 'National Tyre Retreaders',
        employeeName: '',
        travelDetails: '',
        description: 'Rubber scrap & off-grade sheets resale',
        enteredBy: 'Manager'
      },
      {
        id: 'TXN-EXP-20261016-1005',
        date: getDaysAgoIST(3),
        type: 'Expense',
        category: 'Travel Expenses',
        amount: 2800,
        sourceOrPurpose: 'Indian Oil Fuel Pump',
        employeeName: 'Babu',
        travelDetails: 'Estate to Central Godown & back',
        description: 'Pickup van diesel & toll charges',
        enteredBy: 'Manager'
      },
      {
        id: 'TXN-INC-20261015-1006',
        date: getDaysAgoIST(4),
        type: 'Income',
        category: 'Rubber Sales',
        amount: 62000,
        sourceOrPurpose: 'Apex Rubber Industries',
        employeeName: '',
        travelDetails: '',
        description: 'Latex concentrate drums batch #12',
        enteredBy: 'Manager'
      },
      {
        id: 'TXN-EXP-20261014-1007',
        date: getDaysAgoIST(5),
        type: 'Expense',
        category: 'Staff Wages',
        amount: 5200,
        sourceOrPurpose: '',
        employeeName: 'Vijayan',
        travelDetails: '',
        description: 'Smokehouse curing & sheet drying wages',
        enteredBy: 'Manager'
      },
      {
        id: 'TXN-EXP-20261013-1008',
        date: getDaysAgoIST(6),
        type: 'Expense',
        category: 'LED bulbs and electrical items',
        amount: 1950,
        sourceOrPurpose: 'City Electricals',
        employeeName: '',
        travelDetails: '',
        description: 'Replacement smokehouse heat lamps & wiring',
        enteredBy: 'Manager'
      },
      {
        id: 'TXN-INC-20261012-1009',
        date: getDaysAgoIST(7),
        type: 'Income',
        category: 'Customer Payments',
        amount: 40000,
        sourceOrPurpose: 'Highland Polymers',
        employeeName: '',
        travelDetails: '',
        description: 'Settlement for September sheet consignment',
        enteredBy: 'Manager'
      },
      {
        id: 'TXN-EXP-20261011-1010',
        date: getDaysAgoIST(8),
        type: 'Expense',
        category: 'Tea powder',
        amount: 650,
        sourceOrPurpose: 'Local Groceries',
        employeeName: '',
        travelDetails: '',
        description: 'Tea powder & sugar for estate staff',
        enteredBy: 'Manager'
      }
    ];

    // Compute totals
    let totalIncome = 0;
    let totalExpenses = 0;
    let goodsIncome = 0;
    let goodsPurchases = 0;
    let staffWages = 0;
    let travelExpenses = 0;
    let otherExpenses = 0;

    demoTransactions.forEach(tx => {
      if (tx.type === 'Income') {
        totalIncome += tx.amount;
        if (tx.category === 'Goods Income') goodsIncome += tx.amount;
      } else {
        totalExpenses += tx.amount;
        if (tx.category.includes('goods') || tx.category.includes('materials')) {
          goodsPurchases += tx.amount;
        } else if (tx.category === 'Staff Wages') {
          staffWages += tx.amount;
        } else if (tx.category === 'Travel Expenses') {
          travelExpenses += tx.amount;
        } else {
          otherExpenses += tx.amount;
        }
      }
    });

    const netCashflow = totalIncome - totalExpenses;
    const goodsDifference = goodsIncome - goodsPurchases;

    return {
      success: true,
      isDemo: true,
      isConfigured: sheetsService.isConfigured(),
      spreadsheetUrl: sheetsService.getSpreadsheetUrl(),
      startDate: range.startDate,
      endDate: range.endDate,
      periodLabel: range.label,
      totalIncome,
      totalExpenses,
      netCashflow,
      goodsIncome,
      goodsPurchases,
      goodsDifference,
      staffWages,
      travelExpenses,
      otherExpenses,
      transactionCount: demoTransactions.length,
      transactions: demoTransactions
    };
  }

  /**
   * Main data fetcher: queries Google Sheets with fallback to demo data
   */
  async getDashboardData(period = 'month', customStart = null, customEnd = null, forceDemo = false) {
    const range = (customStart && customEnd)
      ? { startDate: customStart, endDate: customEnd, label: `${customStart} to ${customEnd}` }
      : getPeriodDatesIST(period);

    if (forceDemo) {
      return this.enrichDashboardData(this.generateDemoData(period, range.startDate, range.endDate));
    }

    if (!sheetsService.isConfigured()) {
      logger.info('Google Sheets not configured. Serving rich demo data for dashboard.');
      return this.enrichDashboardData(this.generateDemoData(period, range.startDate, range.endDate));
    }

    try {
      const report = await sheetsService.getReport(range.startDate, range.endDate);

      if (!report || report.success === false) {
        logger.warn(`Google Apps Script getReport returned error: ${report?.error || 'unknown'}. Falling back to demo data.`);
        const demo = this.generateDemoData(period, range.startDate, range.endDate);
        demo.fetchError = report?.error || 'Could not connect to Google Apps Script';
        return this.enrichDashboardData(demo);
      }

      // If sheet has 0 transactions, provide demo data with a clear banner
      if (!report.transactionCount || report.transactionCount === 0) {
        logger.info('Spreadsheet ledger is currently empty. Serving demo data preview.');
        const demo = this.generateDemoData(period, range.startDate, range.endDate);
        demo.emptySheet = true;
        return this.enrichDashboardData(demo);
      }

      report.isDemo = false;
      report.isConfigured = true;
      report.periodLabel = range.label;
      report.spreadsheetUrl = sheetsService.getSpreadsheetUrl();

      return this.enrichDashboardData(report);
    } catch (err) {
      logger.error('Error in getDashboardData:', err);
      const demo = this.generateDemoData(period, range.startDate, range.endDate);
      demo.fetchError = err.message;
      return this.enrichDashboardData(demo);
    }
  }

  /**
   * Enriches report data with daily chart series, category distributions, and metrics
   */
  enrichDashboardData(report) {
    const txs = Array.isArray(report.transactions) ? report.transactions : [];

    // 1. Group daily time series for Chart.js
    const dailyMap = {};
    txs.forEach(t => {
      const date = t.date || 'Unknown';
      if (!dailyMap[date]) {
        dailyMap[date] = { date, income: 0, expense: 0, net: 0 };
      }
      if ((t.type || '').toLowerCase() === 'income') {
        dailyMap[date].income += Number(t.amount) || 0;
      } else {
        dailyMap[date].expense += Number(t.amount) || 0;
      }
      dailyMap[date].net = dailyMap[date].income - dailyMap[date].expense;
    });

    const sortedDates = Object.keys(dailyMap).sort();
    const chartSeries = {
      labels: sortedDates,
      income: sortedDates.map(d => dailyMap[d].income),
      expense: sortedDates.map(d => dailyMap[d].expense),
      net: sortedDates.map(d => dailyMap[d].net)
    };

    // 2. Category distribution
    const categoryBreakdown = {};
    const incomeCategoryBreakdown = {};
    const expenseCategoryBreakdown = {};

    txs.forEach(t => {
      const cat = t.category || 'Other';
      const amt = Number(t.amount) || 0;
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + amt;

      if ((t.type || '').toLowerCase() === 'income') {
        incomeCategoryBreakdown[cat] = (incomeCategoryBreakdown[cat] || 0) + amt;
      } else {
        expenseCategoryBreakdown[cat] = (expenseCategoryBreakdown[cat] || 0) + amt;
      }
    });

    // 3. Employee wages breakdown
    const employeeWages = {};
    txs.forEach(t => {
      if ((t.category || '').toLowerCase() === 'staff wages') {
        const emp = t.employeeName || 'Unspecified Worker';
        employeeWages[emp] = (employeeWages[emp] || 0) + (Number(t.amount) || 0);
      }
    });

    // 4. Key Performance Ratios
    const totalTurnover = (report.totalIncome || 0) + (report.totalExpenses || 0);
    const netMarginPercent = report.totalIncome > 0
      ? Number(((report.netCashflow / report.totalIncome) * 100).toFixed(1))
      : 0;

    const goodsProfitMargin = report.goodsIncome > 0
      ? Number((((report.goodsIncome - report.goodsPurchases) / report.goodsIncome) * 100).toFixed(1))
      : 0;

    const wageExpenseRatio = report.totalExpenses > 0
      ? Number(((report.staffWages / report.totalExpenses) * 100).toFixed(1))
      : 0;

    return {
      ...report,
      dashboardUrl: this.getDashboardUrl(),
      chartSeries,
      categoryBreakdown,
      incomeCategoryBreakdown,
      expenseCategoryBreakdown,
      employeeWages,
      kpis: {
        totalTurnover,
        netMarginPercent,
        goodsProfitMargin,
        wageExpenseRatio,
        isSurplus: (report.netCashflow || 0) >= 0
      }
    };
  }
}

const dashboardService = new DashboardService();
module.exports = dashboardService;
