/**
 * Updates order statuses based on current time
 */
function updateOrderStatuses() {
  Logger.log("Starting updateOrderStatuses function");
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  var lastRow = sheet.getLastRow();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var currentTime = new Date();
  
  var dueTimeColIndex = findColumnIndex(headers, "Due time");
  var statusColIndex = findColumnIndex(headers, "status");
  var completedColIndex = findColumnIndex(headers, ["Completed", "Done", "finished"]);
  
  if (dueTimeColIndex === -1) dueTimeColIndex = 8; // Default to column H
  if (statusColIndex === -1) statusColIndex = 9;   // Default to column I
  if (completedColIndex === -1) completedColIndex = 10; // Default to column J
  
  // Get all relevant data
  var data = sheet.getRange(2, 1, lastRow - 1, completedColIndex + 1).getValues();
  
  for (var i = 0; i < data.length; i++) {
    var row = i + 2; // Adjust for header row
    var timestamp = data[i][0]; // Column A
    var dueTime = data[i][dueTimeColIndex - 1];
    var isCompleted = data[i][completedColIndex - 1]; // Checkbox column
    
    // Skip if order is marked as done
    if (isCompleted === true) {
      continue;
    }
    
    // Skip if no due time
    if (!dueTime) {
      continue;
    }
    
    var statusCell = sheet.getRange(row, statusColIndex);
    
    // Parse due time and create comparison date
    if (typeof dueTime === 'string' && dueTime.match(/^\d{1,2}:\d{2}$/)) {
      var [hours, minutes] = dueTime.split(':').map(Number);
      
      // Create dueDateTime based on today (for orders from today)
      var dueDateTime = new Date();
      dueDateTime.setHours(hours, minutes, 0, 0);
      
      // If dueDateTime is in the future but order timestamp is from yesterday,
      // adjust dueDateTime to yesterday
      var orderDate = new Date(timestamp);
      if (dueDateTime > currentTime && orderDate.getDate() !== currentTime.getDate()) {
        dueDateTime.setDate(dueDateTime.getDate() - 1);
      }
      
      if (currentTime > dueDateTime) {
        statusCell.setValue('Late');
        statusCell.setFontColor('red');
      } else {
        statusCell.setValue('On Time');
        statusCell.setFontColor('black');
      }
    }
  }
  
  // Sort orders after updating statuses
  sortOrdersByDueTime();
  
  Logger.log("updateOrderStatuses function completed");
}

/**
 * Sort orders by due time (column H) - FIXED VERSION
 * This function explicitly sorts by time with no assumptions about headers
 */
function sortOrdersByDueTime() {
  Logger.log("Starting sortOrdersByDueTime function");
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  
  if (!sheet) {
    // Try to find the active sheet if Form Responses 1 isn't found
    sheet = SpreadsheetApp.getActiveSheet();
    Logger.log("Form Responses 1 sheet not found, using active sheet: " + sheet.getName());
  }
  
  // Skip header row
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    Logger.log("No data to sort");
    return;
  }
  
  var lastCol = sheet.getLastColumn();
  
  // Get all data including header
  var range = sheet.getRange(1, 1, lastRow, lastCol);
  var data = range.getValues();
  
  // Extract the header
  var header = data.shift();
  
  Logger.log("Total rows to sort: " + data.length);
  
  // Convert HH:MM string to minutes for comparison
  function timeToMinutes(timeStr) {
    // If not a proper time string, return a very large number (to sort to end)
    if (!timeStr || typeof timeStr !== 'string' || !timeStr.match(/^\d{1,2}:\d{2}$/)) {
      return 99999;
    }
    
    var parts = timeStr.split(':');
    var hours = parseInt(parts[0], 10);
    var minutes = parseInt(parts[1], 10);
    return hours * 60 + minutes;
  }
  
  // Sort the data rows (not header) by column H (index 7)
  data.sort(function(a, b) {
    // Check if there's a checkbox in column J (index 9) that's checked
    var aIsCompleted = a[9] === true;
    var bIsCompleted = b[9] === true;
    
    // First sort by completion status (incomplete first)
    if (aIsCompleted && !bIsCompleted) return 1;
    if (!aIsCompleted && bIsCompleted) return -1;
    
    // Then sort by time in column H (index 7)
    var aMinutes = timeToMinutes(a[7]);
    var bMinutes = timeToMinutes(b[7]);
    
    return aMinutes - bMinutes;
  });
  
  // Put the header back
  data.unshift(header);
  
  // Write the data back to the sheet
  range.setValues(data);
  
  Logger.log("sortOrdersByDueTime function completed");
}

/**
 * Diagnose issues with time column format
 */
function diagnoseTimeColumn() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1') || SpreadsheetApp.getActiveSheet();
  var lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    Logger.log("No data to analyze");
    return;
  }
  
  // Get all values in column H
  var timeRange = sheet.getRange(2, 8, lastRow - 1, 1); // Column H (8) starting from row 2
  var timeValues = timeRange.getValues();
  
  Logger.log("Analyzing " + timeValues.length + " time values in column H:");
  
  for (var i = 0; i < timeValues.length; i++) {
    var value = timeValues[i][0];
    var rowNum = i + 2; // Adjust for 1-based rows and header
    var valueType = typeof value;
    var isValidFormat = false;
    
    if (valueType === 'string') {
      isValidFormat = value.match(/^\d{1,2}:\d{2}$/);
    } else if (valueType === 'object' && value instanceof Date) {
      isValidFormat = true;
    }
    
    Logger.log("Row " + rowNum + ": " + value + 
              " (Type: " + valueType + 
              ", Valid format: " + isValidFormat + ")");
  }
  
  Logger.log("Diagnosis complete");
}

/**
 * Update status for a single order
 */
function updateSingleOrderStatus(sheet, row, statusColIndex) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var timestampColIndex = 1; // Timestamp is always in column A
  var dueTimeColIndex = findColumnIndex(headers, "Due time");
  
  if (dueTimeColIndex === -1) dueTimeColIndex = 8; // Default to column H
  
  var currentTime = new Date();
  var statusCell = sheet.getRange(row, statusColIndex);
  var dueTimeCell = sheet.getRange(row, dueTimeColIndex);
  var timestampCell = sheet.getRange(row, timestampColIndex);
  
  var dueTime = dueTimeCell.getValue();
  var timestamp = timestampCell.getValue();
  
  if (dueTime && typeof dueTime === 'string' && dueTime.match(/^\d{1,2}:\d{2}$/)) {
    var [hours, minutes] = dueTime.split(':').map(Number);
    
    // Use the order's timestamp as the base date for the due time
    var dueDateTime = new Date(timestamp);
    dueDateTime.setHours(hours, minutes, 0, 0);
    
    if (currentTime > dueDateTime) {
      statusCell.setValue('Late');
      statusCell.setFontColor('red');
    } else {
      statusCell.setValue('On Time');
      statusCell.setFontColor('black');
    }
  } else {
    statusCell.setValue('Pending');
    statusCell.setFontColor('orange');
  }
}
