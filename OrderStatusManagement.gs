/**
 * Updates order statuses based on current time
 */
function updateOrderStatuses() {
  Logger.log("Starting updateOrderStatuses function");
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName('Form responses 1') || spreadsheet.getSheetByName('Form Responses 1') || spreadsheet.getActiveSheet();
  var lastRow = sheet.getLastRow();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var currentTime = new Date();
  
  Logger.log("Current time: " + currentTime.toTimeString());
  
  var dueTimeColIndex = findColumnIndex(headers, "Due time");
  var statusColIndex = findColumnIndex(headers, ["status", "Status"]);
  var completedColIndex = findColumnIndex(headers, ["Completed", "Done", "finished"]);
  
  // If Due time column exists but Status doesn't, add Status column
  if (dueTimeColIndex !== -1 && statusColIndex === -1) {
    statusColIndex = dueTimeColIndex + 1;
    sheet.getRange(1, statusColIndex).setValue("Status");
  }
  
  // If Status column exists but Completed doesn't, add Completed column with checkboxes
  if (statusColIndex !== -1 && completedColIndex === -1) {
    completedColIndex = statusColIndex + 1;
    sheet.getRange(1, completedColIndex).setValue("Completed");
    var rule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
    sheet.getRange(2, completedColIndex, sheet.getMaxRows() - 1, 1).setDataValidation(rule);
  }
  
  // Default column positions if not found
  if (dueTimeColIndex === -1) dueTimeColIndex = 8; // Default to column H
  if (statusColIndex === -1) statusColIndex = 9;   // Default to column I
  if (completedColIndex === -1) completedColIndex = 10; // Default to column J
  
  // Get all relevant data
  var data = sheet.getRange(2, 1, lastRow - 1, Math.max(completedColIndex, dueTimeColIndex) + 1).getValues();
  
  Logger.log("Processing " + data.length + " rows for status updates");
  
  for (var i = 0; i < data.length; i++) {
    var row = i + 2; // Adjust for header row
    var timestamp = data[i][0]; // Column A
    var dueTime = data[i][dueTimeColIndex - 1];
    var isCompleted = data[i][completedColIndex - 1]; // Checkbox column
    
    // If order is marked as done, set status to Done and apply light green background
    if (isCompleted === true) {
      Logger.log("Row " + row + " is completed, setting to Done with green background");
      var statusCell = sheet.getRange(row, statusColIndex);
      statusCell.setValue("Done");
      statusCell.setFontColor("green");
      sheet.getRange(row, 1, 1, sheet.getLastColumn()).setBackground('#d9ead3'); // Light green
      continue;
    }
    
    // Skip if no due time
    if (!dueTime) {
      Logger.log("Row " + row + " has no due time, skipping");
      continue;
    }
    
    var statusCell = sheet.getRange(row, statusColIndex);
    var entireRow = sheet.getRange(row, 1, 1, sheet.getLastColumn());
    
    // Convert time string to Date object for comparison
    var dueDateTime;
    var today = new Date();
    
    if (typeof dueTime === 'string' && dueTime.match(/^\d{1,2}:\d{2}$/)) {
      // We have a string in the format "HH:MM"
      var [hours, minutes] = dueTime.split(':').map(Number);
      
      // Create dueDateTime based on today
      dueDateTime = new Date();
      dueDateTime.setHours(hours, minutes, 0, 0);
      
      // Calculate time difference in minutes
      var timeDiffMinutes = (dueDateTime.getTime() - currentTime.getTime()) / (1000 * 60);
      
      Logger.log("Row " + row + " due at " + dueTime + ", diff: " + timeDiffMinutes.toFixed(2) + " minutes");
      
      // If the due time appears to be in the future but the order is from yesterday,
      // adjust the due time to yesterday
      if (timeDiffMinutes > 0 && timestamp instanceof Date) {
        var orderDate = new Date(timestamp);
        var orderDay = orderDate.getDate();
        var todayDay = today.getDate();
        
        if (orderDay !== todayDay) {
          // Order is from a different day, adjust due time accordingly
          dueDateTime.setDate(orderDay);
          dueDateTime.setMonth(orderDate.getMonth());
          dueDateTime.setFullYear(orderDate.getFullYear());
          
          // Recalculate time difference
          timeDiffMinutes = (dueDateTime.getTime() - currentTime.getTime()) / (1000 * 60);
          Logger.log("Adjusted due time for different day order, new diff: " + timeDiffMinutes.toFixed(2) + " minutes");
        }
      }
      
      // Update status and row highlighting based on time difference
      if (timeDiffMinutes < 0) {
        // Order is late
        statusCell.setValue('Late');
        statusCell.setFontColor('red');
        entireRow.setBackground('#ffcccc'); // Light red background for the entire row
        Logger.log("Row " + row + " is LATE, setting red background");
      } else if (timeDiffMinutes < 5) {
        // Order is due soon (less than 5 minutes away)
        statusCell.setValue('Due Soon');
        statusCell.setFontColor('orange');
        entireRow.setBackground('#fff2cc'); // Light yellow background
        Logger.log("Row " + row + " is DUE SOON, setting yellow background");
      } else {
        // Order is on time
        statusCell.setValue('On Time');
        statusCell.setFontColor('black');
        entireRow.setBackground(null); // Clear any background color
        Logger.log("Row " + row + " is ON TIME, clearing background");
      }
    } else if (dueTime instanceof Date && !isNaN(dueTime.getTime())) {
      // We have an actual Date object
      dueDateTime = dueTime;
      
      // Calculate time difference in minutes
      var timeDiffMinutes = (dueDateTime.getTime() - currentTime.getTime()) / (1000 * 60);
      
      Logger.log("Row " + row + " due at " + dueDateTime.toTimeString() + ", diff: " + timeDiffMinutes.toFixed(2) + " minutes");
      
      // Update status based on time difference
      if (timeDiffMinutes < 0) {
        // Order is late
        statusCell.setValue('Late');
        statusCell.setFontColor('red');
        entireRow.setBackground('#ffcccc'); // Light red background for the entire row
        Logger.log("Row " + row + " is LATE, setting red background");
      } else if (timeDiffMinutes < 5) {
        // Order is due soon (less than 5 minutes away)
        statusCell.setValue('Due Soon');
        statusCell.setFontColor('orange');
        entireRow.setBackground('#fff2cc'); // Light yellow background
        Logger.log("Row " + row + " is DUE SOON, setting yellow background");
      } else {
        // Order is on time
        statusCell.setValue('On Time');
        statusCell.setFontColor('black');
        entireRow.setBackground(null); // Clear any background color
        Logger.log("Row " + row + " is ON TIME, clearing background");
      }
      
      // Also fix the format of the due time while we're here
      var formattedTime = Utilities.formatDate(dueDateTime, Session.getScriptTimeZone(), "HH:mm");
      sheet.getRange(row, dueTimeColIndex).setValue(formattedTime);
      Logger.log("Fixed date object in row " + row + " to formatted time: " + formattedTime);
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
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form responses 1') || 
              SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1') || 
              SpreadsheetApp.getActiveSheet();
  
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
  
  // Find status and completed column indexes
  var statusColIndex = -1;
  var completedColIndex = -1;
  for (var i = 0; i < header.length; i++) {
    var headerText = String(header[i] || '').toLowerCase();
    if (headerText === 'status' || headerText.indexOf('status') >= 0) {
      statusColIndex = i;
    }
    if (headerText === 'completed' || headerText === 'done') {
      completedColIndex = i;
    }
  }
  
  if (statusColIndex === -1) statusColIndex = 9; // Default to column I (index 8)
  if (completedColIndex === -1) completedColIndex = 10; // Default to column J (index 9)
  
  // Create a copy of the original data with row indices
  var indexedData = data.map(function(row, index) {
    return { row: row, index: index };
  });
  
  // Find all completed orders
  var completedOrders = indexedData.filter(function(item) {
    return item.row[completedColIndex] === true;
  });
  
  // Find all non-completed orders
  var activeOrders = indexedData.filter(function(item) {
    return item.row[completedColIndex] !== true;
  });
  
  // Sort active orders by urgency and time
  activeOrders.sort(function(a, b) {
    var aRow = a.row;
    var bRow = b.row;
    
    var aStatus = aRow[statusColIndex] ? String(aRow[statusColIndex]).toLowerCase() : '';
    var bStatus = bRow[statusColIndex] ? String(bRow[statusColIndex]).toLowerCase() : '';
    
    // Sort by urgency (Late > Due Soon > On Time)
    var aUrgency = (aStatus === 'late' ? 0 : (aStatus === 'due soon' ? 1 : 2));
    var bUrgency = (bStatus === 'late' ? 0 : (bStatus === 'due soon' ? 1 : 2));
    
    if (aUrgency !== bUrgency) {
      return aUrgency - bUrgency;
    }
    
    // For entries with same urgency, sort by time
    var aMinutes = timeToMinutes(aRow[7]);
    var bMinutes = timeToMinutes(bRow[7]);
    
    return aMinutes - bMinutes;
  });
  
  // Combine sorted active orders with unsorted completed orders, preserving original order
  var sortedData = [];
  var completedIndices = completedOrders.map(function(item) { return item.index; });
  
  // Loop through original data indices
  for (var i = 0; i < data.length; i++) {
    if (completedIndices.indexOf(i) !== -1) {
      // This was a completed order - add it in its original position
      sortedData.push(data[i]);
    } else {
      // This was an active order - get the next sorted active order
      if (activeOrders.length > 0) {
        sortedData.push(activeOrders.shift().row);
      }
    }
  }
  
  // Put the header back
  sortedData.unshift(header);
  
  // Write the data back to the sheet
  range.setValues(sortedData);
  
  // After sorting, make sure all completed orders have green status
  for (var i = 0; i < completedOrders.length; i++) {
    var rowIndex = completedOrders[i].index + 2; // +2 for header and 0-based index
    var statusCell = sheet.getRange(rowIndex, statusColIndex + 1);
    statusCell.setValue("Done");
    statusCell.setFontColor("green");
    
    // Apply light green background to completed orders
    sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).setBackground('#d9ead3');
  }
  
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
