/**
 * =========================================================================
 * RUBBER BUSINESS TELEGRAM BOT - GOOGLE APPS SCRIPT BACKEND
 * =========================================================================
 * 
 * This script serves as the permanent Google Sheets database backend for the
 * Rubber Business Telegram Income & Expense Tracker Bot.
 * 
 * Sheets Managed:
 * 1. Transactions - Complete ledger of all income and expenses
 * 2. Employees    - Staff members and active status
 * 3. Categories   - Income and expense categories with groups
 * 
 * SETUP INSTRUCTIONS (FOR MOBILE / ANDROID / LAPTOP):
 * 1. Open your Google Sheet in browser (Chrome on Android: toggle "Desktop site").
 * 2. Click "Extensions" -> "Apps Script".
 * 3. Delete any default code in Code.gs, paste this entire file.
 * 4. Set your shared secret token in SCRIPT_SECRET below (or in Script Properties).
 * 5. Run the function 'setupSheets()' once by selecting it from the dropdown and clicking 'Run'.
 *    (Authorize permissions when prompted).
 * 6. Click "Deploy" -> "New deployment" -> Select type "Web app".
 *    - Description: "Rubber Bot Web App"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 7. Click "Deploy", copy the Web App URL (ends in /exec), and save it.
 * =========================================================================
 */

// Shared secret key between your Node.js bot and Google Apps Script.
// Must match GOOGLE_SCRIPT_SECRET in your bot's .env file.
var SCRIPT_SECRET = "my_secure_rubber_bot_secret_2026";

// Sheet Names
var SHEET_TRANSACTIONS = "Transactions";
var SHEET_EMPLOYEES = "Employees";
var SHEET_CUSTOMERS = "Customers";
var SHEET_CATEGORIES = "Categories";

/**
 * Handle HTTP POST requests from the Telegram bot backend
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  // Wait up to 30 seconds for concurrent requests to avoid race conditions
  lock.tryLock(30000);

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ success: false, error: "Empty request payload" }, 400);
    }

    var requestData;
    try {
      requestData = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createJsonResponse({ success: false, error: "Invalid JSON format" }, 400);
    }

    // Verify secret token for security
    var clientSecret = requestData.secret || (e.parameter && e.parameter.secret);
    var configuredSecret = getSecretToken();

    if (!clientSecret || clientSecret !== configuredSecret) {
      return createJsonResponse({ success: false, error: "Unauthorized: Invalid secret token" }, 401);
    }

    var action = requestData.action;
    var result;

    switch (action) {
      case "init":
        result = initSheets();
        break;

      case "addTransaction":
        result = handleAddTransaction(requestData.data);
        break;

      case "getReport":
        result = handleGetReport(requestData.startDate, requestData.endDate);
        break;

      case "getRecentTransactions":
        result = handleGetRecentTransactions(requestData.limit || 10);
        break;

      case "getEmployees":
        result = handleGetEmployees(requestData.activeOnly);
        break;

      case "addEmployee":
        result = handleAddEmployee(requestData.data);
        break;

      case "toggleEmployeeStatus":
        result = handleToggleEmployeeStatus(requestData.employeeId);
        break;

      case "getEmployeeWages":
        result = handleGetEmployeeWages(requestData.employeeName, requestData.startDate, requestData.endDate);
        break;

      case "getCategories":
        result = handleGetCategories();
        break;

      case "getCustomers":
        result = handleGetCustomers(requestData.activeOnly);
        break;

      case "addCustomer":
        result = handleAddCustomer(requestData.data);
        break;

      case "toggleCustomerStatus":
        result = handleToggleCustomerStatus(requestData.customerId);
        break;

      case "getSheetInfo":
        result = handleGetSheetInfo();
        break;

      default:
        return createJsonResponse({ success: false, error: "Unknown action: " + action }, 400);
    }

    return createJsonResponse(result);

  } catch (error) {
    Logger.log("Error in doPost: " + error.toString());
    return createJsonResponse({ success: false, error: error.toString() }, 500);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Handle HTTP GET requests for health check or testing
 */
function doGet(e) {
  var clientSecret = e.parameter && e.parameter.secret;
  var configuredSecret = getSecretToken();

  if (clientSecret !== configuredSecret) {
    return ContentService.createTextOutput("Rubber Bot Apps Script Web App is LIVE. (Unauthorized for data)")
      .setMimeType(ContentService.MimeType.TEXT);
  }

  var action = e.parameter.action || "ping";
  if (action === "ping") {
    return createJsonResponse({ success: true, message: "PONG - Apps Script is ready", timestamp: new Date().toISOString() });
  }

  if (action === "init") {
    var initResult = initSheets();
    return createJsonResponse(initResult);
  }

  return createJsonResponse({ success: true, message: "Valid secret provided" });
}

/**
 * Helper to retrieve secret token from ScriptProperties or fallback to constant
 */
function getSecretToken() {
  var propSecret = PropertiesService.getScriptProperties().getProperty("RUBBER_BOT_SECRET");
  return propSecret || SCRIPT_SECRET;
}

/**
 * Helper to create standardized JSON responses
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Run this function manually in Google Apps Script editor to initialize sheets!
 */
function setupSheets() {
  var res = initSheets();
  Logger.log("Initialization result: " + JSON.stringify(res));
}

/**
 * Automatically creates and formats sheets if they do not exist
 */
function initSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Transactions Sheet
  var txSheet = ss.getSheetByName(SHEET_TRANSACTIONS);
  if (!txSheet) {
    txSheet = ss.insertSheet(SHEET_TRANSACTIONS);
    var txHeaders = [
      "Transaction ID",
      "Timestamp",
      "Transaction Date",
      "Transaction Type",
      "Category",
      "Amount",
      "Income Source or Expense Purpose",
      "Employee Name",
      "Travel Details",
      "Description",
      "Entered By",
      "Telegram User ID"
    ];
    txSheet.appendRow(txHeaders);
    var txHeaderRange = txSheet.getRange(1, 1, 1, txHeaders.length);
    txHeaderRange.setBackground("#1b5e20"); // Dark Forest Green
    txHeaderRange.setFontColor("#ffffff");
    txHeaderRange.setFontWeight("bold");
    txHeaderRange.setHorizontalAlignment("center");
    txSheet.setFrozenRows(1);
    
    // Set column format for Amount (Col F = 6)
    txSheet.getRange("F2:F").setNumberFormat("₹#,##0.00");
    txSheet.setColumnWidth(1, 180); // Tx ID
    txSheet.setColumnWidth(2, 160); // Timestamp
    txSheet.setColumnWidth(3, 130); // Date
    txSheet.setColumnWidth(4, 120); // Type
    txSheet.setColumnWidth(5, 180); // Category
    txSheet.setColumnWidth(6, 120); // Amount
    txSheet.setColumnWidth(7, 220); // Source/Purpose
    txSheet.setColumnWidth(8, 150); // Employee
    txSheet.setColumnWidth(9, 220); // Travel Details
    txSheet.setColumnWidth(10, 250); // Description
    txSheet.setColumnWidth(11, 140); // Entered By
    txSheet.setColumnWidth(12, 140); // Telegram ID
  }

  // 2. Employees Sheet
  var empSheet = ss.getSheetByName(SHEET_EMPLOYEES);
  if (!empSheet) {
    empSheet = ss.insertSheet(SHEET_EMPLOYEES);
    var empHeaders = ["Employee ID", "Employee Name", "Active Status"];
    empSheet.appendRow(empHeaders);
    var empHeaderRange = empSheet.getRange(1, 1, 1, empHeaders.length);
    empHeaderRange.setBackground("#0d47a1"); // Deep Blue
    empHeaderRange.setFontColor("#ffffff");
    empHeaderRange.setFontWeight("bold");
    empHeaderRange.setHorizontalAlignment("center");
    empSheet.setFrozenRows(1);
    empSheet.setColumnWidth(1, 130);
    empSheet.setColumnWidth(2, 200);
    empSheet.setColumnWidth(3, 120);
  }

  // 3. Customers Sheet
  var custSheet = ss.getSheetByName(SHEET_CUSTOMERS);
  if (!custSheet) {
    custSheet = ss.insertSheet(SHEET_CUSTOMERS);
    var custHeaders = ["Customer ID", "Customer Name", "Active Status"];
    custSheet.appendRow(custHeaders);
    var custHeaderRange = custSheet.getRange(1, 1, 1, custHeaders.length);
    custHeaderRange.setBackground("#4a148c"); // Deep Purple
    custHeaderRange.setFontColor("#ffffff");
    custHeaderRange.setFontWeight("bold");
    custHeaderRange.setHorizontalAlignment("center");
    custSheet.setFrozenRows(1);
    custSheet.setColumnWidth(1, 130);
    custSheet.setColumnWidth(2, 220);
    custSheet.setColumnWidth(3, 120);
  }

  // 4. Categories Sheet
  var catSheet = ss.getSheetByName(SHEET_CATEGORIES);
  if (!catSheet) {
    catSheet = ss.insertSheet(SHEET_CATEGORIES);
    var catHeaders = ["Type", "Group", "Category Name"];
    catSheet.appendRow(catHeaders);
    var catHeaderRange = catSheet.getRange(1, 1, 1, catHeaders.length);
    catHeaderRange.setBackground("#37474f"); // Slate
    catHeaderRange.setFontColor("#ffffff");
    catHeaderRange.setFontWeight("bold");
    catHeaderRange.setHorizontalAlignment("center");
    catSheet.setFrozenRows(1);
    catSheet.setColumnWidth(1, 120);
    catSheet.setColumnWidth(2, 180);
    catSheet.setColumnWidth(3, 250);

    // Populate default rubber business categories
    var defaultCategories = [
      // Income Categories
      ["Income", "Rubber Sales", "Rubber Sales"],
      ["Income", "Goods Income", "Goods Income"],
      ["Income", "Customer Payments", "Customer Payments"],
      ["Income", "Other Income", "Other Income"],

      // Goods Purchases
      ["Expense", "Goods and Business Purchases", "Rubber-related goods purchases"],
      ["Expense", "Goods and Business Purchases", "Raw materials"],
      ["Expense", "Goods and Business Purchases", "Supplies"],
      ["Expense", "Goods and Business Purchases", "Other goods purchases"],

      // Staff Wages
      ["Expense", "Staff Wages", "Staff wages"],

      // Travel Expenses
      ["Expense", "Travel Expenses", "Travel expenses"],

      // Refreshments & Daily Supplies
      ["Expense", "Other Expenses", "Tea powder"],
      ["Expense", "Other Expenses", "Sugar"],
      ["Expense", "Other Expenses", "Coffee powder"],
      ["Expense", "Other Expenses", "Food and refreshments"],

      // Utilities & Maintenance
      ["Expense", "Other Expenses", "LED bulbs and electrical items"],
      ["Expense", "Other Expenses", "Cleaning supplies"],
      ["Expense", "Other Expenses", "Maintenance"],

      // Miscellaneous
      ["Expense", "Other Expenses", "Other miscellaneous expenses"]
    ];

    catSheet.getRange(2, 1, defaultCategories.length, 3).setValues(defaultCategories);
  }

  // Remove default "Sheet1" if it is empty and other sheets exist
  var defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1 && defaultSheet.getLastRow() === 0) {
    try {
      ss.deleteSheet(defaultSheet);
    } catch (e) {
      // Ignore if cannot delete
    }
  }

  return {
    success: true,
    message: "Sheets verified and initialized successfully",
    spreadsheetUrl: ss.getUrl(),
    spreadsheetName: ss.getName(),
    sheets: [SHEET_TRANSACTIONS, SHEET_EMPLOYEES, SHEET_CUSTOMERS, SHEET_CATEGORIES]
  };
}

/**
 * Append a new transaction row to the Transactions sheet
 */
function handleAddTransaction(data) {
  if (!data) {
    return { success: false, error: "Transaction data missing" };
  }

  // Required validations
  if (!data.transactionId || !data.type || !data.category || data.amount === undefined || data.amount === null) {
    return { success: false, error: "Missing required fields (transactionId, type, category, amount)" };
  }

  var numAmount = parseFloat(data.amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return { success: false, error: "Invalid amount. Must be a positive number." };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_TRANSACTIONS);
  if (!sheet) {
    initSheets();
    sheet = ss.getSheetByName(SHEET_TRANSACTIONS);
  }

  // Check for duplicate transaction ID
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var existingIds = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < existingIds.length; i++) {
      if (existingIds[i][0] === data.transactionId) {
        return { success: false, error: "Duplicate transaction ID: " + data.transactionId };
      }
    }
  }

  var timestamp = data.timestamp || Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss");
  var transactionDate = data.transactionDate || Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd");

  var row = [
    data.transactionId,
    timestamp,
    transactionDate,
    data.type,                           // "Income" or "Expense"
    data.category,                       // e.g. "Rubber Sales", "Staff wages"
    numAmount,                           // Numeric amount
    data.sourceOrPurpose || "",          // Customer name or Expense purpose
    data.employeeName || "",             // Employee name if applicable
    data.travelDetails || "",            // From -> To, purpose if travel
    data.description || "",              // Custom user notes
    data.enteredBy || "",                // Telegram name
    data.telegramUserId || ""            // Telegram numeric ID
  ];

  sheet.appendRow(row);
  var newRowIndex = sheet.getLastRow();
  
  // Apply formatting to the newly appended row
  sheet.getRange(newRowIndex, 6).setNumberFormat("₹#,##0.00");
  sheet.getRange(newRowIndex, 3).setNumberFormat("yyyy-mm-dd");

  return {
    success: true,
    transactionId: data.transactionId,
    amount: numAmount,
    type: data.type,
    category: data.category,
    date: transactionDate,
    rowNumber: newRowIndex
  };
}

/**
 * Compute report totals for a specific date range [startDate, endDate] (Inclusive)
 * Date format: "yyyy-MM-dd"
 */
function handleGetReport(startDate, endDate) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_TRANSACTIONS);
  if (!sheet || sheet.getLastRow() <= 1) {
    return {
      success: true,
      startDate: startDate,
      endDate: endDate,
      totalIncome: 0,
      totalExpenses: 0,
      netCashflow: 0,
      goodsIncome: 0,
      goodsPurchases: 0,
      goodsDifference: 0,
      staffWages: 0,
      travelExpenses: 0,
      otherExpenses: 0,
      transactionCount: 0,
      transactions: []
    };
  }

  var lastRow = sheet.getLastRow();
  var values = sheet.getRange(2, 1, lastRow - 1, 12).getValues();

  var totalIncome = 0;
  var totalExpenses = 0;
  var goodsIncome = 0;
  var goodsPurchases = 0;
  var staffWages = 0;
  var travelExpenses = 0;
  var otherExpenses = 0;
  var transactionCount = 0;
  var matchingTransactions = [];

  var goodsPurchaseCategories = [
    "Rubber-related goods purchases",
    "Raw materials",
    "Supplies",
    "Other goods purchases"
  ];

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var txDateVal = row[2];
    var formattedTxDate = "";

    if (txDateVal instanceof Date) {
      formattedTxDate = Utilities.formatDate(txDateVal, "Asia/Kolkata", "yyyy-MM-dd");
    } else {
      formattedTxDate = String(txDateVal).trim();
    }

    // Filter by date range if provided
    if (startDate && formattedTxDate < startDate) continue;
    if (endDate && formattedTxDate > endDate) continue;

    var type = String(row[3]).trim();
    var category = String(row[4]).trim();
    var amount = parseFloat(row[5]) || 0;

    transactionCount++;

    if (type.toLowerCase() === "income") {
      totalIncome += amount;
      if (category.toLowerCase() === "goods income") {
        goodsIncome += amount;
      }
    } else if (type.toLowerCase() === "expense") {
      totalExpenses += amount;

      // Check sub-types of expenses
      var isGoodsPurchase = goodsPurchaseCategories.some(function(cat) {
        return cat.toLowerCase() === category.toLowerCase();
      });

      if (isGoodsPurchase) {
        goodsPurchases += amount;
      } else if (category.toLowerCase() === "staff wages") {
        staffWages += amount;
      } else if (category.toLowerCase() === "travel expenses") {
        travelExpenses += amount;
      } else {
        otherExpenses += amount;
      }
    }

    matchingTransactions.push({
      id: row[0],
      date: formattedTxDate,
      type: type,
      category: category,
      amount: amount,
      sourceOrPurpose: row[6],
      employeeName: row[7],
      travelDetails: row[8],
      description: row[9],
      enteredBy: row[10]
    });
  }

  // Formal calculation rules
  var netCashflow = totalIncome - totalExpenses;
  var goodsDifference = goodsIncome - goodsPurchases;

  return {
    success: true,
    startDate: startDate,
    endDate: endDate,
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    netCashflow: Math.round(netCashflow * 100) / 100,
    goodsIncome: Math.round(goodsIncome * 100) / 100,
    goodsPurchases: Math.round(goodsPurchases * 100) / 100,
    goodsDifference: Math.round(goodsDifference * 100) / 100,
    staffWages: Math.round(staffWages * 100) / 100,
    travelExpenses: Math.round(travelExpenses * 100) / 100,
    otherExpenses: Math.round(otherExpenses * 100) / 100,
    transactionCount: transactionCount,
    transactions: matchingTransactions
  };
}

/**
 * Fetch the last N transactions recorded
 */
function handleGetRecentTransactions(limit) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_TRANSACTIONS);
  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, count: 0, transactions: [] };
  }

  var lastRow = sheet.getLastRow();
  var startRow = Math.max(2, lastRow - limit + 1);
  var numRows = lastRow - startRow + 1;

  var values = sheet.getRange(startRow, 1, numRows, 12).getValues();
  var list = [];

  for (var i = values.length - 1; i >= 0; i--) { // Reverse order: most recent first
    var row = values[i];
    var txDateVal = row[2];
    var formattedTxDate = "";

    if (txDateVal instanceof Date) {
      formattedTxDate = Utilities.formatDate(txDateVal, "Asia/Kolkata", "yyyy-MM-dd");
    } else {
      formattedTxDate = String(txDateVal).trim();
    }

    list.push({
      id: row[0],
      timestamp: row[1],
      date: formattedTxDate,
      type: row[3],
      category: row[4],
      amount: parseFloat(row[5]) || 0,
      sourceOrPurpose: row[6],
      employeeName: row[7],
      travelDetails: row[8],
      description: row[9],
      enteredBy: row[10]
    });
  }

  return { success: true, count: list.length, transactions: list };
}

/**
 * Get list of employees
 */
function handleGetEmployees(activeOnly) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_EMPLOYEES);
  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, employees: [] };
  }

  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
  var employees = [];

  for (var i = 0; i < values.length; i++) {
    var id = String(values[i][0]).trim();
    var name = String(values[i][1]).trim();
    var status = String(values[i][2]).trim();

    if (!name) continue;

    if (activeOnly && status.toLowerCase() !== "active") {
      continue;
    }

    employees.push({
      id: id,
      name: name,
      status: status || "Active"
    });
  }

  return { success: true, employees: employees };
}

/**
 * Add a new employee
 */
function handleAddEmployee(data) {
  if (!data || !data.name || !data.name.trim()) {
    return { success: false, error: "Employee name is required" };
  }

  var name = data.name.trim();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_EMPLOYEES);
  if (!sheet) {
    initSheets();
    sheet = ss.getSheetByName(SHEET_EMPLOYEES);
  }

  // Check if name already exists
  var lastRow = sheet.getLastRow();
  var nextNum = 1;

  if (lastRow > 1) {
    var values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (var i = 0; i < values.length; i++) {
      if (String(values[i][1]).trim().toLowerCase() === name.toLowerCase()) {
        return { success: false, error: "An employee named '" + name + "' already exists" };
      }
    }
    nextNum = lastRow; // Auto increment ID
  }

  var empId = "EMP-" + ("00" + nextNum).slice(-3);
  var status = data.status || "Active";

  sheet.appendRow([empId, name, status]);

  return {
    success: true,
    employee: {
      id: empId,
      name: name,
      status: status
    }
  };
}

/**
 * Toggle employee active/inactive status
 */
function handleToggleEmployeeStatus(employeeId) {
  if (!employeeId) {
    return { success: false, error: "Employee ID is required" };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_EMPLOYEES);
  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: false, error: "No employees found" };
  }

  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === employeeId) {
      var currentStatus = String(values[i][2]).trim();
      var newStatus = (currentStatus.toLowerCase() === "active") ? "Inactive" : "Active";
      var rowToUpdate = i + 2;
      sheet.getRange(rowToUpdate, 3).setValue(newStatus);

      return {
        success: true,
        employeeId: employeeId,
        name: values[i][1],
        newStatus: newStatus
      };
    }
  }

  return { success: false, error: "Employee with ID " + employeeId + " not found" };
}

/**
 * Get list of customers
 */
function handleGetCustomers(activeOnly) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_CUSTOMERS);
  if (!sheet) {
    initSheets();
    sheet = ss.getSheetByName(SHEET_CUSTOMERS);
  }
  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, customers: [] };
  }

  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
  var customers = [];

  for (var i = 0; i < values.length; i++) {
    var id = String(values[i][0]).trim();
    var name = String(values[i][1]).trim();
    var status = String(values[i][2]).trim();

    if (!name) continue;

    if (activeOnly && status.toLowerCase() !== "active") {
      continue;
    }

    customers.push({
      id: id,
      name: name,
      status: status || "Active"
    });
  }

  return { success: true, customers: customers };
}

/**
 * Add a new customer
 */
function handleAddCustomer(data) {
  if (!data || !data.name || !data.name.trim()) {
    return { success: false, error: "Customer name is required" };
  }

  var name = data.name.trim();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_CUSTOMERS);
  if (!sheet) {
    initSheets();
    sheet = ss.getSheetByName(SHEET_CUSTOMERS);
  }

  var lastRow = sheet.getLastRow();
  var nextNum = 1;

  if (lastRow > 1) {
    var values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (var i = 0; i < values.length; i++) {
      if (String(values[i][1]).trim().toLowerCase() === name.toLowerCase()) {
        return {
          success: true,
          alreadyExists: true,
          customer: { id: values[i][0], name: values[i][1], status: "Active" }
        };
      }
    }
    nextNum = lastRow;
  }

  var custId = "CUST-" + ("00" + nextNum).slice(-3);
  var status = data.status || "Active";

  sheet.appendRow([custId, name, status]);

  return {
    success: true,
    customer: {
      id: custId,
      name: name,
      status: status
    }
  };
}

/**
 * Toggle customer active/inactive status
 */
function handleToggleCustomerStatus(customerId) {
  if (!customerId) {
    return { success: false, error: "Customer ID is required" };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_CUSTOMERS);
  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: false, error: "No customers found" };
  }

  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === customerId) {
      var currentStatus = String(values[i][2]).trim();
      var newStatus = (currentStatus.toLowerCase() === "active") ? "Inactive" : "Active";
      var rowToUpdate = i + 2;
      sheet.getRange(rowToUpdate, 3).setValue(newStatus);

      return {
        success: true,
        customerId: customerId,
        name: values[i][1],
        newStatus: newStatus
      };
    }
  }

  return { success: false, error: "Customer with ID " + customerId + " not found" };
}

/**
 * Returns spreadsheet metadata and web URL
 */
function handleGetSheetInfo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    success: true,
    spreadsheetId: ss.getId(),
    spreadsheetName: ss.getName(),
    spreadsheetUrl: ss.getUrl()
  };
}

/**
 * Get wages paid to a specific employee or all employees in a date range
 */
function handleGetEmployeeWages(employeeName, startDate, endDate) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_TRANSACTIONS);
  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, employeeName: employeeName, totalWages: 0, count: 0, records: [] };
  }

  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 12).getValues();
  var totalWages = 0;
  var records = [];

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var category = String(row[4]).trim();
    if (category.toLowerCase() !== "staff wages") continue;

    var empNameInRow = String(row[7]).trim();
    if (employeeName && empNameInRow.toLowerCase() !== employeeName.toLowerCase()) {
      continue;
    }

    var txDateVal = row[2];
    var formattedTxDate = (txDateVal instanceof Date)
      ? Utilities.formatDate(txDateVal, "Asia/Kolkata", "yyyy-MM-dd")
      : String(txDateVal).trim();

    if (startDate && formattedTxDate < startDate) continue;
    if (endDate && formattedTxDate > endDate) continue;

    var amount = parseFloat(row[5]) || 0;
    totalWages += amount;

    records.push({
      id: row[0],
      date: formattedTxDate,
      employeeName: empNameInRow,
      amount: amount,
      description: row[9],
      enteredBy: row[10]
    });
  }

  return {
    success: true,
    employeeName: employeeName || "All Employees",
    startDate: startDate,
    endDate: endDate,
    totalWages: Math.round(totalWages * 100) / 100,
    count: records.length,
    records: records
  };
}

/**
 * Get active categories list
 */
function handleGetCategories() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_CATEGORIES);
  if (!sheet || sheet.getLastRow() <= 1) {
    initSheets();
    sheet = ss.getSheetByName(SHEET_CATEGORIES);
  }

  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
  var income = [];
  var expense = [];

  for (var i = 0; i < values.length; i++) {
    var type = String(values[i][0]).trim();
    var group = String(values[i][1]).trim();
    var name = String(values[i][2]).trim();

    var item = { group: group, name: name };
    if (type.toLowerCase() === "income") {
      income.push(item);
    } else {
      expense.push(item);
    }
  }

  return { success: true, income: income, expense: expense };
}
