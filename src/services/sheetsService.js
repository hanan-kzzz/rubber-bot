const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Client for Google Apps Script Web App API
 */
class SheetsService {
  constructor() {
    this.client = axios.create({
      timeout: 30000, // 30s timeout for Google Apps Script execution
      maxRedirects: 5,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  }

  isConfigured() {
    return Boolean(config.googleScriptUrl && config.googleScriptUrl.startsWith('https://script.google.com/'));
  }

  /**
   * Generic dispatcher to Google Apps Script Web App
   */
  async request(action, payload = {}) {
    if (!this.isConfigured()) {
      logger.warn(`Google Apps Script URL is not configured. Action "${action}" was skipped.`);
      return {
        success: false,
        error: 'Google Apps Script URL is not configured. Please deploy Code.gs and set GOOGLE_SCRIPT_URL in .env or Render settings.'
      };
    }

    try {
      const body = {
        secret: config.googleScriptSecret,
        action: action,
        ...payload
      };

      logger.debug(`Sending "${action}" request to Google Apps Script...`);
      const response = await this.client.post(config.googleScriptUrl, body);

      if (response.data && typeof response.data === 'object') {
        return response.data;
      }

      // If response is text, try parsing JSON
      if (typeof response.data === 'string') {
        try {
          return JSON.parse(response.data);
        } catch (e) {
          return { success: false, error: 'Unexpected response from Google Apps Script: ' + response.data.substring(0, 150) };
        }
      }

      return { success: false, error: 'Unknown response format from Google Apps Script' };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Network request failed';
      logger.error(`Google Apps Script request "${action}" failed: ${errorMsg}`);
      return {
        success: false,
        error: `Google Sheets integration error: ${errorMsg}`
      };
    }
  }

  /**
   * Initialize or verify spreadsheet sheets & categories
   */
  async init() {
    return this.request('init');
  }

  /**
   * Append a transaction to Google Sheets
   */
  async addTransaction(transactionData) {
    return this.request('addTransaction', { data: transactionData });
  }

  /**
   * Delete a transaction from Google Sheets by ID
   */
  async deleteTransaction(transactionId) {
    return this.request('deleteTransaction', { transactionId });
  }

  /**
   * Get report summary for a date range (inclusive, YYYY-MM-DD)
   */
  async getReport(startDate, endDate) {
    return this.request('getReport', { startDate, endDate });
  }

  /**
   * Get recent transactions
   */
  async getRecentTransactions(limit = 10) {
    return this.request('getRecentTransactions', { limit });
  }

  /**
   * Get list of employees
   */
  async getEmployees(activeOnly = false) {
    return this.request('getEmployees', { activeOnly });
  }

  /**
   * Add a new employee
   */
  async addEmployee(name, status = 'Active') {
    return this.request('addEmployee', { data: { name, status } });
  }

  /**
   * Toggle employee active/inactive status
   */
  async toggleEmployeeStatus(employeeId) {
    return this.request('toggleEmployeeStatus', { employeeId });
  }

  /**
   * Get wage payments for specific employee or all employees
   */
  async getEmployeeWages(employeeName = null, startDate = null, endDate = null) {
    return this.request('getEmployeeWages', { employeeName, startDate, endDate });
  }

  /**
   * Get list of customers
   */
  async getCustomers(activeOnly = false) {
    return this.request('getCustomers', { activeOnly });
  }

  /**
   * Get transactions and individual payments for a specific customer
   */
  async getCustomerTransactions(customerName = null, customerId = null) {
    const res = await this.request('getCustomerTransactions', { customerName, customerId });
    if (res && res.success && Array.isArray(res.transactions)) {
      return res;
    }

    // Resilient fallback: If Apps Script hasn't been redeployed yet with getCustomerTransactions,
    // fetch ledger data and extract customer transactions locally
    try {
      const allDataRes = await this.getAllData();
      if (allDataRes && allDataRes.success && allDataRes.sheets && allDataRes.sheets.Transactions) {
        const txRows = allDataRes.sheets.Transactions;
        if (txRows.length > 1) {
          const records = [];
          let totalBilled = 0;
          let totalPaid = 0;
          let balanceDue = 0;
          const searchName = (customerName || '').toLowerCase().trim();

          for (let i = txRows.length - 1; i >= 1; i--) {
            const r = txRows[i];
            const party = String(r[6] || '').toLowerCase().trim();
            if (searchName && party !== searchName) continue;

            const amt = parseFloat(r[5]) || 0;
            const status = r[12] ? String(r[12]).trim() : 'Paid';
            const paid = r[13] !== undefined && r[13] !== '' ? parseFloat(r[13]) : (status.toLowerCase() === 'not paid' ? 0 : amt);
            const due = r[14] !== undefined && r[14] !== '' ? parseFloat(r[14]) : (status.toLowerCase() === 'not paid' ? amt : (status.toLowerCase() === 'partial paid' ? Math.max(0, amt - paid) : 0));
            const type = String(r[3] || '').trim();

            if (type.toLowerCase() === 'income') {
              totalBilled += amt;
              totalPaid += (isNaN(paid) ? amt : paid);
              balanceDue += (isNaN(due) ? 0 : due);
            }

            records.push({
              id: r[0],
              date: r[2],
              type: type,
              category: r[4],
              amount: amt,
              paymentStatus: status,
              paidAmount: isNaN(paid) ? amt : paid,
              balanceDue: isNaN(due) ? 0 : due,
              description: r[9],
              enteredBy: r[10]
            });
          }

          return {
            success: true,
            customer: { id: customerId || 'CUST', name: customerName, status: 'Active' },
            totalBilled: Math.round(totalBilled * 100) / 100,
            totalPaid: Math.round(totalPaid * 100) / 100,
            balanceDue: Math.round(balanceDue * 100) / 100,
            count: records.length,
            transactions: records
          };
        }
      }
    } catch (fallbackErr) {
      logger.warn('Local fallback for customer transactions failed:', fallbackErr.message);
    }

    return res;
  }

  /**
   * Add a new customer
   */
  async addCustomer(name, status = 'Active') {
    return this.request('addCustomer', { data: { name, status } });
  }

  /**
   * Toggle customer active/inactive status
   */
  async toggleCustomerStatus(customerId) {
    return this.request('toggleCustomerStatus', { customerId });
  }

  /**
   * Get income and expense categories
   */
  async getCategories() {
    return this.request('getCategories');
  }

  /**
   * Get spreadsheet metadata and web URL
   */
  async getSheetInfo() {
    const res = await this.request('getSheetInfo');
    if (res && res.success && res.spreadsheetUrl) {
      this.cachedSpreadsheetUrl = res.spreadsheetUrl;
    }
    return res;
  }

  /**
   * Returns Google Spreadsheet URL (from config, cache, or fallback)
   */
  getSpreadsheetUrl() {
    return config.googleSheetUrl || this.cachedSpreadsheetUrl || 'https://docs.google.com/spreadsheets/d/1qRVPKZ5W_Y6_VLQxLLL2FRrjijWIRdkQbl0TOA_y6xc/edit';
  }

  /**
   * Fetch all raw data from Google Sheets
   */
  async getAllData() {
    return this.request('getAllData');
  }

  /**
   * Generates a complete .xlsx Excel workbook Buffer with all ledger sheets
   */
  async generateExcelBuffer() {
    const XLSX = require('xlsx');
    const wb = XLSX.utils.book_new();

    let rawData = null;
    try {
      rawData = await this.getAllData();
    } catch (e) {
      logger.warn('Could not fetch getAllData from Apps Script:', e.message);
    }

    if (rawData && rawData.success && rawData.sheets && Object.keys(rawData.sheets).length > 0) {
      const sheetNames = ['Transactions', 'Employees', 'Customers', 'Categories'];
      sheetNames.forEach(name => {
        if (Array.isArray(rawData.sheets[name]) && rawData.sheets[name].length > 0) {
          const ws = XLSX.utils.aoa_to_sheet(rawData.sheets[name]);
          XLSX.utils.book_append_sheet(wb, ws, name);
        }
      });
    }

    // Fallback if sheets could not be loaded via getAllData
    if (wb.SheetNames.length === 0) {
      logger.info('Using individual service calls for Excel workbook generation...');
      const [txRes, empRes, custRes] = await Promise.all([
        this.getRecentTransactions(1000).catch(() => ({ success: false })),
        this.getEmployees(false).catch(() => ({ success: false })),
        this.getCustomers(false).catch(() => ({ success: false }))
      ]);

      const txHeaders = ['Transaction ID', 'Date', 'Type', 'Category', 'Amount (₹)', 'Party / Source', 'Staff Name', 'Route', 'Description'];
      const txRows = [txHeaders];
      if (txRes && txRes.success && Array.isArray(txRes.transactions)) {
        txRes.transactions.forEach(t => {
          txRows.push([
            t.id || '',
            t.date || '',
            t.type || '',
            t.category || '',
            t.amount || 0,
            t.sourceOrPurpose || '',
            t.employeeName || '',
            t.travelDetails || '',
            t.description || ''
          ]);
        });
      }
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(txRows), 'Transactions');

      const empRows = [['Employee ID', 'Employee Name', 'Status']];
      if (empRes && empRes.success && Array.isArray(empRes.employees)) {
        empRes.employees.forEach(e => empRows.push([e.id, e.name, e.status]));
      }
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(empRows), 'Employees');

      const custRows = [['Customer ID', 'Customer Name', 'Status']];
      if (custRes && custRes.success && Array.isArray(custRes.customers)) {
        custRes.customers.forEach(c => custRows.push([c.id, c.name, c.status]));
      }
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(custRows), 'Customers');
    }

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}

const sheetsService = new SheetsService();
module.exports = sheetsService;
