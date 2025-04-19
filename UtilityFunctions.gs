/**
 * Pizza Order Management System
 * A simplified system to handle pizza orders, calculate due times, and manage order statuses
 */

/**
 * Sets up all necessary triggers for the script
 */
function setupTriggers() {
  Logger.log("Setting up triggers");
  
  // Clear existing triggers
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  
  // Create form submit trigger
  ScriptApp.newTrigger('onFormSubmit')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onFormSubmit()
    .create();
  
  // Create edit trigger
  ScriptApp.newTrigger('onEdit')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
  
  // Create time-based triggers
  
  // Sort orders every minute
  ScriptApp.newTrigger('sortOrdersByDueTime')
    .timeBased()
    .everyMinutes(1)
    .create();
  
  // Update order statuses every minute
  ScriptApp.newTrigger('updateOrderStatuses')
    .timeBased()
    .everyMinutes(1)
    .create();
  
  Logger.log("All triggers set up successfully");
}

/**
 * Completely reset and rebuild the system
 * This will clear all due times and recalculate them from scratch
 */
function resetAndRebuild() {
  Logger.log("Starting complete system reset and rebuild");
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Form responses 1') || ss.getSheetByName('Form Responses 1');
  
  if (!sheet) {
    Logger.log("Form responses sheet not found!");
    return;
  }
  
  var lastRow = sheet.getLastRow();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Find column indices
  var timestampCol = 1; // Always column A
  var dueTimeCol = findColumnIndex(headers, "Due time");
  var prepTimeCol = findColumnIndex(headers, ["Preparation time", "Prep time", "Prep Time"]);
  var statusCol = findColumnIndex(headers, "status");
  var completedCol = findColumnIndex(headers, "Completed");
  
  // Create missing columns if needed
  if (dueTimeCol === -1) {
    dueTimeCol = headers.length + 1;
    sheet.getRange(1, dueTimeCol).setValue("Due time");
    Logger.log("Created Due time column at position " + dueTimeCol);
  }
  
  if (prepTimeCol === -1) {
    prepTimeCol = headers.length + 2;
    sheet.getRange(1, prepTimeCol).setValue("Preparation time");
    Logger.log("Created Preparation time column at position " + prepTimeCol);
  }
  
  if (statusCol === -1) {
    statusCol = headers.length + 3;
    sheet.getRange(1, statusCol).setValue("status");
    Logger.log("Created status column at position " + statusCol);
  }
  
  if (completedCol === -1) {
    completedCol = headers.length + 4;
    sheet.getRange(1, completedCol).setValue("Completed");
    Logger.log("Created Completed column at position " + completedCol);
  }
  
  // Clear all due times to force recalculation
  if (lastRow > 1 && dueTimeCol > 0) {
    sheet.getRange(2, dueTimeCol, lastRow - 1, 1).clearContent();
    Logger.log("Cleared all due times to force recalculation");
  }
  
  // Process each row
  for (var row = 2; row <= lastRow; row++) {
    // Get the timestamp
    var timestamp = sheet.getRange(row, timestampCol).getValue();
    if (!(timestamp instanceof Date) || isNaN(timestamp.getTime())) {
      Logger.log("Row " + row + ": Invalid timestamp, skipping");
      continue;
    }
    
    // Get preparation time
    var prepTimeValue = sheet.getRange(row, prepTimeCol).getValue();
    
    // Determine prep time
    var prepTimeMinutes = 15; // Default
    
    if (prepTimeValue && (typeof prepTimeValue === 'number' || typeof prepTimeValue === 'string')) {
      // Use existing prep time
      prepTimeMinutes = parseInt(prepTimeValue) || 15;
      Logger.log("Row " + row + ": Using existing prep time: " + prepTimeMinutes);
    }
    
    // Calculate the due time
    var timeZone = "Africa/Johannesburg";
    var dueTime = new Date(timestamp.getTime() + (prepTimeMinutes * 60 * 1000));
    var formattedDueTime = Utilities.formatDate(dueTime, timeZone, "HH:mm");
    
    // Set the due time as a string
    sheet.getRange(row, dueTimeCol).setValue(formattedDueTime);
    
    var timestampFormatted = Utilities.formatDate(timestamp, timeZone, "HH:mm");
    Logger.log("Row " + row + ": Set due time to: " + formattedDueTime + " (timestamp: " + timestampFormatted + " + " + prepTimeMinutes + " minutes)");
  }
  
  // Add checkboxes to all rows in the Completed column
  if (lastRow > 1 && completedCol > 0) {
    var checkboxRange = sheet.getRange(2, completedCol, lastRow - 1, 1);
    checkboxRange.insertCheckboxes();
    Logger.log("Added checkboxes to all rows in the Completed column");
  }
  
  // Update order statuses
  updateOrderStatuses();
  
  // Sort orders by due time
  sortOrdersByDueTime();
  
  Logger.log("System reset and rebuild completed");
}

/**
 * Updates the status of all orders based on their due time
 */
function updateOrderStatuses() {
  Logger.log("Starting updateOrderStatuses function");
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Form responses 1') || ss.getSheetByName('Form Responses 1');
  
  if (!sheet) {
    Logger.log("Form responses sheet not found!");
    return;
  }
  
  var lastRow = sheet.getLastRow();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Find column indices
  var dueTimeCol = findColumnIndex(headers, "Due time");
  var statusCol = findColumnIndex(headers, "status");
  var completedCol = findColumnIndex(headers, "Completed");
  
  // If columns don't exist, exit
  if (dueTimeCol === -1 || statusCol === -1) {
    Logger.log("Required columns not found, exiting");
    return;
  }
  
  // Get current time in South Africa
  var now = new Date();
  var timeZone = "Africa/Johannesburg";
  var currentTime = Utilities.formatDate(now, timeZone, "HH:mm");
  Logger.log("Current time (South Africa): " + currentTime);
  
  // Process each row
  for (var row = 2; row <= lastRow; row++) {
    // Check if completed
    var completed = false;
    if (completedCol !== -1) {
      completed = sheet.getRange(row, completedCol).getValue() === true;
    }
    
    // Get due time
    var dueTimeValue = sheet.getRange(row, dueTimeCol).getValue();
    
    // Skip if no due time
    if (!dueTimeValue) {
      Logger.log("Row " + row + " has no due time, skipping");
      continue;
    }
    
    // Set status and background color
    var status;
    var bgColor;
    
    if (completed) {
      // Completed orders
      status = "Completed";
      bgColor = "#d9ead3"; // Light green
      Logger.log("Row " + row + " is COMPLETED, setting green background");
    } else {
      // Calculate time difference
      var dueTimeParts = String(dueTimeValue).split(":");
      if (dueTimeParts.length !== 2) {
        Logger.log("Row " + row + " has invalid due time format: " + dueTimeValue);
        continue;
      }
      
      var dueHour = parseInt(dueTimeParts[0]);
      var dueMinute = parseInt(dueTimeParts[1]);
      
      var currentTimeParts = currentTime.split(":");
      var currentHour = parseInt(currentTimeParts[0]);
      var currentMinute = parseInt(currentTimeParts[1]);
      
      // Convert to minutes since midnight
      var dueTimeMinutes = dueHour * 60 + dueMinute;
      var currentTimeMinutes = currentHour * 60 + currentMinute;
      
      // Handle day boundary (if due time is from yesterday)
      if (dueTimeMinutes > currentTimeMinutes + 720) { // More than 12 hours ahead
        dueTimeMinutes -= 1440; // Subtract 24 hours
      } else if (currentTimeMinutes > dueTimeMinutes + 720) { // More than 12 hours behind
        dueTimeMinutes += 1440; // Add 24 hours
      }
      
      var timeDiff = dueTimeMinutes - currentTimeMinutes;
      Logger.log("Row " + row + " due at " + dueTimeValue + ", current time: " + currentTime + ", diff: " + timeDiff + " minutes");
      
      if (timeDiff < 0) {
        // Late
        status = "Late";
        bgColor = "#ffcccc"; // Light red
        Logger.log("Row " + row + " is LATE, setting red background");
      } else if (timeDiff <= 5) {
        // Due soon (5 minutes or less)
        status = "Due Soon";
        bgColor = "#ffffcc"; // Light yellow
        Logger.log("Row " + row + " is DUE SOON, setting yellow background");
      } else {
        // On time
        status = "On Time";
        bgColor = null; // Clear background
        Logger.log("Row " + row + " is ON TIME, clearing background");
      }
    }
    
    // Update status
    sheet.getRange(row, statusCol).setValue(status);
    
    // Set background color for the entire row
    if (bgColor) {
      sheet.getRange(row, 1, 1, sheet.getLastColumn()).setBackground(bgColor);
    } else {
      sheet.getRange(row, 1, 1, sheet.getLastColumn()).setBackground(null);
    }
  }
  
  Logger.log("updateOrderStatuses function completed");
}

/**
 * Handles form submissions
 */
function onFormSubmit(e) {
  Logger.log("Form submitted, processing submission");
  Logger.log("Form event data: " + JSON.stringify(e));
  
  // Process the form submission directly
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Form responses 1') || ss.getSheetByName('Form Responses 1');
  
  if (!sheet) {
    Logger.log("Form responses sheet not found!");
    return;
  }
  
  // Get the last row (most recent submission)
  var lastRow = sheet.getLastRow();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Log all headers for debugging
  Logger.log("Form headers: " + headers.join(", "));
  
  // Find column indices
  var timestampCol = 1; // Always column A
  var dueTimeCol = -1;
  var prepTimeCol = -1;
  var statusCol = -1;
  var completedCol = -1;
  
  // Find or create columns
  for (var i = 0; i < headers.length; i++) {
    var header = headers[i].toString().toLowerCase();
    if (header === "due time") {
      dueTimeCol = i + 1;
    } else if (header === "preparation time" || header === "prep time" || header.includes("preparation")) {
      prepTimeCol = i + 1;
      Logger.log("Found preparation time column at position " + prepTimeCol);
    } else if (header === "status") {
      statusCol = i + 1;
    } else if (header === "completed") {
      completedCol = i + 1;
    }
  }
  
  // Create missing columns
  if (dueTimeCol === -1) {
    dueTimeCol = headers.length + 1;
    sheet.getRange(1, dueTimeCol).setValue("Due time");
  }
  
  if (prepTimeCol === -1) {
    prepTimeCol = headers.length + 2;
    sheet.getRange(1, prepTimeCol).setValue("Preparation time");
  }
  
  if (statusCol === -1) {
    statusCol = headers.length + 3;
    sheet.getRange(1, statusCol).setValue("status");
  }
  
  if (completedCol === -1) {
    completedCol = headers.length + 4;
    sheet.getRange(1, completedCol).setValue("Completed");
  }
  
  // Get the timestamp
  var timestamp = sheet.getRange(lastRow, timestampCol).getValue();
  
  // Get preparation time from form data
  var prepTimeMinutes = 15; // Default
  
  // First check if it's in the form event data
  if (e && e.namedValues) {
    Logger.log("Form named values: " + JSON.stringify(e.namedValues));
    
    // Try to find preparation time in form fields
    for (var field in e.namedValues) {
      Logger.log("Checking form field: " + field);
      
      if (field.toLowerCase().includes("prep") || field.toLowerCase().includes("time")) {
        var value = e.namedValues[field][0];
        Logger.log("Found potential prep time field: " + field + " with value: " + value);
        
        // Try to extract a number
        var numValue = extractNumber(value);
        if (numValue !== null) {
          prepTimeMinutes = numValue;
          Logger.log("Extracted prep time: " + prepTimeMinutes);
          break;
        }
      }
    }
  }
  
  // If not found in event data, check the spreadsheet
  if (prepTimeMinutes === 15 && prepTimeCol > 0) {
    var prepTimeValue = sheet.getRange(lastRow, prepTimeCol).getValue();
    Logger.log("Checking spreadsheet cell for prep time: " + prepTimeValue);
    
    var numValue = extractNumber(prepTimeValue);
    if (numValue !== null) {
      prepTimeMinutes = numValue;
      Logger.log("Extracted prep time from spreadsheet: " + prepTimeMinutes);
    }
  }
  
  // Save the prep time
  sheet.getRange(lastRow, prepTimeCol).setValue(prepTimeMinutes);
  Logger.log("Saved prep time to column " + prepTimeCol + ": " + prepTimeMinutes);
  
  // Calculate due time
  var timeZone = "Africa/Johannesburg";
  var dueTime = new Date(timestamp.getTime() + (prepTimeMinutes * 60 * 1000));
  var formattedDueTime = Utilities.formatDate(dueTime, timeZone, "HH:mm");
  
  // Save the due time
  sheet.getRange(lastRow, dueTimeCol).setValue(formattedDueTime);
  
  // Set initial status to "On Time"
  sheet.getRange(lastRow, statusCol).setValue("On Time");
  
  // Add checkbox
  sheet.getRange(lastRow, completedCol).insertCheckboxes();
  
  // Update all statuses
  completeRebuild();
}

/**
 * Helper function to extract a number from various value types
 */
function extractNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }
  
  // If it's already a number
  if (typeof value === 'number') {
    return value;
  }
  
  // If it's a string, try to parse it
  if (typeof value === 'string') {
    // Remove any non-numeric characters except decimal point
    var cleaned = value.replace(/[^\d.]/g, '');
    
    // Try to parse as number
    var parsed = parseFloat(cleaned);
    
    if (!isNaN(parsed)) {
      return Math.round(parsed); // Round to nearest integer
    }
  }
  
  return null;
}

/**
 * Handles edits to the spreadsheet
 */
function onEdit(e) {
  if (!e || !e.range) return;
  
  // Check if the edit was in the "Completed" column
  var sheet = e.range.getSheet();
  var sheetName = sheet.getName();
  
  if (sheetName === 'Form responses 1' || sheetName === 'Form Responses 1') {
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var completedColIndex = -1;
    
    for (var i = 0; i < headers.length; i++) {
      if (headers[i].toString().toLowerCase() === "completed") {
        completedColIndex = i + 1;
        break;
      }
    }
    
    if (completedColIndex !== -1 && e.range.getColumn() === completedColIndex) {
      Logger.log("Completed checkbox changed, updating statuses");
      completeRebuild();
    }
  }
}

/**
 * Sorts orders by due time
 */
function sortOrdersByDueTime() {
  Logger.log("Starting sortOrdersByDueTime function");
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Form responses 1') || ss.getSheetByName('Form Responses 1');
  
  if (!sheet) {
    Logger.log("Form responses sheet not found!");
    return;
  }
  
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    Logger.log("No data to sort");
    return;
  }
  
  Logger.log("Total rows to sort: " + lastRow);
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var dueTimeCol = findColumnIndex(headers, "Due time");
  var completedCol = findColumnIndex(headers, "Completed");
  
  if (dueTimeCol === -1) {
    Logger.log("Due time column not found, cannot sort");
    return;
  }
  
  // Sort by:
  // 1. Completed status (uncompleted first)
  // 2. Due time (earliest first)
  var sortCriteria = [];
  
  if (completedCol !== -1) {
    sortCriteria.push({column: completedCol, ascending: true});
  }
  
  sortCriteria.push({column: dueTimeCol, ascending: true});
  
  // Sort the data
  var range = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
  range.sort(sortCriteria);
  
  Logger.log("sortOrdersByDueTime function completed");
}

/**
 * Helper function to find column index by header name
 */
function findColumnIndex(headers, nameOptions) {
  if (!Array.isArray(nameOptions)) {
    nameOptions = [nameOptions];
  }
  
  for (var i = 0; i < headers.length; i++) {
    var header = headers[i].toString().toLowerCase();
    for (var j = 0; j < nameOptions.length; j++) {
      if (header === nameOptions[j].toString().toLowerCase()) {
        return i + 1; // Convert to 1-based index
      }
    }
  }
  
  return -1; // Not found
}

/**
 * Helper function to check if a string is in time format (HH:MM)
 */
function isTimeFormat(str) {
  if (typeof str !== 'string') return false;
  return /^\d{1,2}:\d{2}$/.test(str);
}

/**
 * Function to manually test all key functions
 */
function testAllFunctions() {
  Logger.log("===== TESTING ALL FUNCTIONS =====");
  
  // Complete rebuild
  completeRebuild();
  
  Logger.log("===== ALL FUNCTIONS TESTED =====");
}

/**
 * Complete system rebuild with improved preparation time handling
 */
function completeRebuild() {
  Logger.log("Starting complete system rebuild with improved prep time handling");
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Form responses 1') || ss.getSheetByName('Form Responses 1');
  
  if (!sheet) {
    Logger.log("Form responses sheet not found!");
    return;
  }
  
  var lastRow = sheet.getLastRow();
  var allData = sheet.getDataRange().getValues();
  var headers = allData[0];
  
  // Log all headers for debugging
  Logger.log("All headers: " + headers.join(", "));
  
  // Find column indices
  var timestampCol = 1; // Always column A
  var dueTimeCol = -1;
  var prepTimeCol = -1;
  var statusCol = -1;
  var completedCol = -1;
  
  // Look for preparation time in any column
  var possiblePrepTimeCol = -1;
  
  for (var i = 0; i < headers.length; i++) {
    var header = headers[i].toString().toLowerCase();
    Logger.log("Checking header: " + header);
    
    if (header === "due time") {
      dueTimeCol = i + 1;
    } else if (header === "preparation time" || header === "prep time" || header === "preparation time (minutes)") {
      prepTimeCol = i + 1;
    } else if (header.includes("prep") && header.includes("time")) {
      prepTimeCol = i + 1;
    } else if (header === "status") {
      statusCol = i + 1;
    } else if (header === "completed") {
      completedCol = i + 1;
    }
    
    // Check for any column that might contain minutes
    else if (header.includes("min") || (header.includes("time") && !header.includes("timestamp"))) {
      possiblePrepTimeCol = i + 1;
      Logger.log("Found possible prep time column: " + header + " at position " + possiblePrepTimeCol);
    }
  }
  
  // If prep time column not found, but we found a possible one, use it
  if (prepTimeCol === -1 && possiblePrepTimeCol !== -1) {
    prepTimeCol = possiblePrepTimeCol;
    Logger.log("Using possible prep time column at position " + prepTimeCol);
  }
  
  // Create missing columns
  if (dueTimeCol === -1) {
    dueTimeCol = headers.length + 1;
    sheet.getRange(1, dueTimeCol).setValue("Due time");
    Logger.log("Created Due time column at position " + dueTimeCol);
  }
  
  if (prepTimeCol === -1) {
    prepTimeCol = headers.length + 2;
    sheet.getRange(1, prepTimeCol).setValue("Preparation time");
    Logger.log("Created Preparation time column at position " + prepTimeCol);
  }
  
  if (statusCol === -1) {
    statusCol = headers.length + 3;
    sheet.getRange(1, statusCol).setValue("status");
    Logger.log("Created status column at position " + statusCol);
  }
  
  if (completedCol === -1) {
    completedCol = headers.length + 4;
    sheet.getRange(1, completedCol).setValue("Completed");
    Logger.log("Created Completed column at position " + completedCol);
  }
  
  // Get current time in South Africa
  var now = new Date();
  var timeZone = "Africa/Johannesburg";
  var currentTime = Utilities.formatDate(now, timeZone, "HH:mm");
  Logger.log("Current time (South Africa): " + currentTime);
  var currentTimeParts = currentTime.split(":");
  var currentHour = parseInt(currentTimeParts[0]);
  var currentMinute = parseInt(currentTimeParts[1]);
  var currentTimeMinutes = currentHour * 60 + currentMinute;
  
  // Process each row
  for (var row = 2; row <= lastRow; row++) {
    // Get the timestamp
    var timestamp = sheet.getRange(row, timestampCol).getValue();
    if (!(timestamp instanceof Date) || isNaN(timestamp.getTime())) {
      Logger.log("Row " + row + ": Invalid timestamp, skipping");
      continue;
    }
    
    // Search every cell in the row for a preparation time
    var rowData = allData[row-1];
    var prepTimeMinutes = null;
    
    // First check in the prep time column if it exists
    if (prepTimeCol > 0 && prepTimeCol <= rowData.length) {
      var prepTimeValue = rowData[prepTimeCol-1];
      if (prepTimeValue && (typeof prepTimeValue === 'number' || typeof prepTimeValue === 'string')) {
        prepTimeMinutes = parseInt(prepTimeValue);
        Logger.log("Row " + row + ": Found prep time in column " + prepTimeCol + ": " + prepTimeMinutes);
      }
    }
    
    // If not found, search all columns
    if (prepTimeMinutes === null || isNaN(prepTimeMinutes)) {
      for (var col = 0; col < rowData.length; col++) {
        var value = rowData[col];
        var header = headers[col].toString().toLowerCase();
        
        // Skip timestamp, due time, status and completed columns
        if (col+1 === timestampCol || col+1 === dueTimeCol || 
            col+1 === statusCol || col+1 === completedCol) {
          continue;
        }
        
        // Check if it's a number that could be minutes
        if (typeof value === 'number' && value > 0 && value < 120) {
          prepTimeMinutes = value;
          Logger.log("Row " + row + ": Found numeric value that could be prep time in column " + (col+1) + 
                    " (" + header + "): " + prepTimeMinutes);
          break;
        }
        
        // Check if it's a string that could be converted to minutes
        if (typeof value === 'string' && value.trim() !== '') {
          var numValue = parseInt(value);
          if (!isNaN(numValue) && numValue > 0 && numValue < 120) {
            prepTimeMinutes = numValue;
            Logger.log("Row " + row + ": Found string value that could be prep time in column " + (col+1) + 
                      " (" + header + "): " + prepTimeMinutes);
            break;
          }
        }
      }
    }
    
    // If still not found, use default
    if (prepTimeMinutes === null || isNaN(prepTimeMinutes)) {
      prepTimeMinutes = 15; // Default
      Logger.log("Row " + row + ": No prep time found, using default: " + prepTimeMinutes);
    }
    
    // Ensure prep time is set
    sheet.getRange(row, prepTimeCol).setValue(prepTimeMinutes);
    Logger.log("Row " + row + ": Set prep time to: " + prepTimeMinutes);
    
    // Calculate the due time
    var dueTime = new Date(timestamp.getTime() + (prepTimeMinutes * 60 * 1000));
    var formattedDueTime = Utilities.formatDate(dueTime, timeZone, "HH:mm");
    
    // Set the due time as a string
    sheet.getRange(row, dueTimeCol).setValue(formattedDueTime);
    
    var timestampFormatted = Utilities.formatDate(timestamp, timeZone, "HH:mm");
    Logger.log("Row " + row + ": Set due time to: " + formattedDueTime + " (timestamp: " + timestampFormatted + " + " + prepTimeMinutes + " minutes)");
    
    // Calculate status
    var completed = sheet.getRange(row, completedCol).getValue() === true;
    var status;
    var bgColor;
    
    if (completed) {
      // Completed orders
      status = "Completed";
      bgColor = "#d9ead3"; // Light green
      Logger.log("Row " + row + " is COMPLETED, setting green background");
    } else {
      // Calculate time difference
      var dueTimeParts = formattedDueTime.split(":");
      var dueHour = parseInt(dueTimeParts[0]);
      var dueMinute = parseInt(dueTimeParts[1]);
      var dueTimeMinutes = dueHour * 60 + dueMinute;
      
      // Handle day boundary
      if (dueTimeMinutes > currentTimeMinutes + 720) {
        dueTimeMinutes -= 1440;
      } else if (currentTimeMinutes > dueTimeMinutes + 720) {
        dueTimeMinutes += 1440;
      }
      
      var timeDiff = dueTimeMinutes - currentTimeMinutes;
      Logger.log("Row " + row + " due at " + formattedDueTime + ", current time: " + currentTime + ", diff: " + timeDiff + " minutes");
      
      if (timeDiff < 0) {
        // Late
        status = "Late";
        bgColor = "#ffcccc"; // Light red
        Logger.log("Row " + row + " is LATE, setting red background");
      } else if (timeDiff <= 5) {
        // Due soon (5 minutes or less)
        status = "Due Soon";
        bgColor = "#ffffcc"; // Light yellow
        Logger.log("Row " + row + " is DUE SOON, setting yellow background");
      } else {
        // On time
        status = "On Time";
        bgColor = null; // Clear background
        Logger.log("Row " + row + " is ON TIME, clearing background");
      }
    }
    
    // Update status
    sheet.getRange(row, statusCol).setValue(status);
    
    // Set background color for the entire row
    if (bgColor) {
      sheet.getRange(row, 1, 1, sheet.getLastColumn()).setBackground(bgColor);
    } else {
      sheet.getRange(row, 1, 1, sheet.getLastColumn()).setBackground(null);
    }
    
    // Ensure checkbox is present
    sheet.getRange(row, completedCol).insertCheckboxes();
  }
  
  // Sort orders by due time
  sortOrdersByDueTime();
  
  Logger.log("Complete system rebuild finished");
}

/**
 * Fix triggers and set proper formatting for preparation time
 * This includes the functionality of fixAllPrepTimes
 */
function fixTriggersAndFormatting() {
  Logger.log("Starting trigger and formatting fix");
  
  // First, let's list all existing triggers to inspect
  var allTriggers = ScriptApp.getProjectTriggers();
  Logger.log("Found " + allTriggers.length + " triggers in the project");
  
  for (var i = 0; i < allTriggers.length; i++) {
    var trigger = allTriggers[i];
    var handlerFunction = trigger.getHandlerFunction();
    var eventType = trigger.getEventType();
    var triggerSource = trigger.getTriggerSource();
    
    Logger.log("Trigger #" + (i+1) + ": " + handlerFunction + 
              " (Event: " + eventType + ", Source: " + triggerSource + ")");
    
    // If there are any problematic triggers, delete them
    // For example, if there are multiple onFormSubmit triggers, keep only one
    if (handlerFunction === "onFormSubmit" && i > 0 && 
        eventType === ScriptApp.EventType.ON_FORM_SUBMIT) {
      ScriptApp.deleteTrigger(trigger);
      Logger.log("Deleted duplicate onFormSubmit trigger");
    }
  }
  
  // Now set up the spreadsheet formatting
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Form responses 1') || ss.getSheetByName('Form Responses 1');
  
  if (!sheet) {
    Logger.log("Form responses sheet not found!");
    return;
  }
  
  var lastRow = sheet.getLastRow();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Find preparation time column
  var prepTimeCol = -1;
  for (var i = 0; i < headers.length; i++) {
    var header = headers[i].toString().toLowerCase();
    if (header === "preparation time" || header === "prep time" || header.includes("preparation")) {
      prepTimeCol = i + 1;
      break;
    }
  }
  
  if (prepTimeCol === -1) {
    Logger.log("Preparation time column not found!");
    return;
  }
  
  Logger.log("Found preparation time column at position " + prepTimeCol);
  
  // Set number formatting for the entire column
  var prepTimeRange = sheet.getRange(2, prepTimeCol, Math.max(1, lastRow - 1), 1);
  prepTimeRange.setNumberFormat("0");
  Logger.log("Set number format for preparation time column");
  
  // Fix all preparation times (inlined from fixAllPrepTimes)
  Logger.log("Starting preparation time fix for all rows");
  
  // Process each row
  for (var row = 2; row <= lastRow; row++) {
    var rawValue = sheet.getRange(row, prepTimeCol).getValue();
    Logger.log("Row " + row + ": Raw prep time value: " + rawValue);
    
    // Extract a proper number
    var prepTimeMinutes = extractNumber(rawValue);
    
    // Set as plain number with explicit formatting
    var cell = sheet.getRange(row, prepTimeCol);
    cell.setValue(prepTimeMinutes);
    cell.setNumberFormat("0");
    Logger.log("Row " + row + ": Fixed prep time to: " + prepTimeMinutes);
  }
  
  Logger.log("Preparation time fix completed");
  
  // Set up a proper onFormSubmit trigger if it doesn't exist
  var hasFormSubmitTrigger = false;
  for (var i = 0; i < allTriggers.length; i++) {
    if (allTriggers[i].getHandlerFunction() === "onFormSubmit" &&
        allTriggers[i].getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT) {
      hasFormSubmitTrigger = true;
      break;
    }
  }
  
  if (!hasFormSubmitTrigger) {
    Logger.log("Creating new onFormSubmit trigger");
    ScriptApp.newTrigger("onFormSubmit")
      .forSpreadsheet(ss)
      .onFormSubmit()
      .create();
  }
  
  // Now update all order statuses and sort
  updateOrderStatuses();
  sortOrdersByDueTime();
  
  Logger.log("Trigger and formatting fix completed");
}