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
}

const sheetsService = new SheetsService();
module.exports = sheetsService;
