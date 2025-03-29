/**
 * Sets up all necessary triggers for the script
 * Including a 1-minute trigger for sorting orders
 */
function setupTriggers() {
  Logger.log("Setting up triggers");
  
  // Clear existing triggers
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  
  Logger.log("Deleted " + triggers.length + " existing triggers");
  
  // Create form submit trigger
  ScriptApp.newTrigger('onFormSubmit')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onFormSubmit()
    .create();
  Logger.log("Created onFormSubmit trigger");
  
  // Create edit trigger
  ScriptApp.newTrigger('onEdit')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
  Logger.log("Created onEdit trigger");
  
  // Create time-based triggers
  
  // Sort orders EVERY MINUTE for maximum responsiveness
  ScriptApp.newTrigger('sortOrdersByDueTime')
    .timeBased()
    .everyMinutes(1) // Set to 1 minute as requested
    .create();
  Logger.log("Created sortOrdersByDueTime trigger (every 1 minute)");
  
  // Update order statuses every minute (changed from 5 minutes)
  ScriptApp.newTrigger('updateOrderStatuses')
    .timeBased()
    .everyMinutes(1)
    .create();
  Logger.log("Created updateOrderStatuses trigger (every 1 minute)");
  
  // Move past orders daily at midnight
  ScriptApp.newTrigger('movePastOrders')
    .timeBased()
    .atHour(0)
    .everyDays(1)
    .create();
  Logger.log("Created movePastOrders trigger (daily at midnight)");
  
  // Process pizza ingredients daily at 1 AM
  ScriptApp.newTrigger('processPizzaOrders')
    .timeBased()
    .atHour(1)
    .everyDays(1)
    .create();
  Logger.log("Created processPizzaOrders trigger (daily at 1 AM)");
  
  Logger.log("All triggers set up successfully");
}

/**
 * Fix time formats in column H if they're not in proper format
 */
function fixTimeFormats() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName('Form responses 1') || spreadsheet.getSheetByName('Form Responses 1') || spreadsheet.getActiveSheet();
  if (!sheet) return;
  
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  
  // Get all values in column H (Due time)
  var range = sheet.getRange(2, 8, lastRow - 1, 1);
  var values = range.getValues();
  
  for (var i = 0; i < values.length; i++) {
    var value = values[i][0];
    var row = i + 2; // Adjust for header row
    
    // Skip if value is already in correct format
    if (typeof value === 'string' && value.match(/^\d{1,2}:\d{2}$/)) {
      continue;
    }
    
    // Try to extract time if it's a string but not in the right format
    if (typeof value === 'string' && value.trim() !== '') {
      var match = value.match(/(\d{1,2})[: ](\d{2})/);
      if (match) {
        var hours = parseInt(match[1], 10);
        var minutes = parseInt(match[2], 10);
        var formattedTime = (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes;
        sheet.getRange(row, 8).setValue(formattedTime);
        Logger.log("Fixed string in row " + row + " to format: " + formattedTime);
      }
    }
  }
  
  // Sort after fixing formats
  sortOrdersByDueTime();
  
  Logger.log("Time formats fixed");
}

/**
 * Fix date-time objects in due time column
 * This will convert all date-time objects to HH:mm string format
 */
function fixDateObjects() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName('Form responses 1') || spreadsheet.getSheetByName('Form Responses 1') || spreadsheet.getActiveSheet();
  if (!sheet) return;
  
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  
  Logger.log("Starting date object fix process");
  
  // Find the Due time column
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var dueTimeColIndex = findColumnIndex(headers, "Due time");
  
  if (dueTimeColIndex === -1) {
    Logger.log("Due time column not found");
    dueTimeColIndex = 8; // Default to column H
  }
  
  // Get all values in the Due time column
  var range = sheet.getRange(2, dueTimeColIndex, lastRow - 1, 1);
  var values = range.getValues();
  
  var fixedCount = 0;
  
  for (var i = 0; i < values.length; i++) {
    var value = values[i][0];
    var row = i + 2; // Adjust for header row
    
    // If it's a date object, convert it to HH:mm string
    if (value instanceof Date && !isNaN(value.getTime())) {
      var formattedTime = Utilities.formatDate(value, Session.getScriptTimeZone(), "HH:mm");
      sheet.getRange(row, dueTimeColIndex).setValue(formattedTime);
      Logger.log("Converted date object in row " + row + " to time string: " + formattedTime);
      fixedCount++;
    } else if (typeof value === 'string' && value.includes('1899')) {
      // Handle cases where the date might be a string representation of a date
      try {
        var dateObj = new Date(value);
        if (!isNaN(dateObj.getTime())) {
          var formattedTime = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "HH:mm");
          sheet.getRange(row, dueTimeColIndex).setValue(formattedTime);
          Logger.log("Converted date string in row " + row + " to time string: " + formattedTime);
          fixedCount++;
        }
      } catch (e) {
        Logger.log("Error processing date string in row " + row + ": " + e.message);
      }
    }
  }
  
  Logger.log("Fixed " + fixedCount + " date objects in the Due time column");
  
  // Update order statuses after fixing date formats
  updateOrderStatuses();
}

/**
 * Run this function once to set up the entire system
 */
function setupPizzaOrderSystem() {
  // Set up all necessary triggers
  setupTriggers();
  
  // Do an initial sort of orders
  sortOrdersByDueTime();
  
  // Update all order statuses
  updateOrderStatuses();
  
  // Process any past orders that need to be moved
  movePastOrders();
  
  Logger.log("Pizza order system setup complete!");
}

/**
 * Function to manually test all key functions
 */
function testAllFunctions() {
  Logger.log("===== TESTING ALL FUNCTIONS =====");
  
  // First fix any time format issues
  fixTimeFormats();
  fixDateObjects();
  
  // Sort orders
  sortOrdersByDueTime();
  
  // Update order statuses
  updateOrderStatuses();
  
  // Test diagnose function
  diagnoseTimeColumn();
  
  Logger.log("===== ALL FUNCTIONS TESTED =====");
}
