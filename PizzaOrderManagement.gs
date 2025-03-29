/**
 * Pizza Order Management System
 * This script manages pizza orders, sorts them by urgency, and tracks ingredient usage
 */

/**
 * Moves past orders to a separate sheet
 */
function movePastOrders() {
  Logger.log("Starting movePastOrders function");
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName('Form Responses 1');
  var pastOrdersSheet = spreadsheet.getSheetByName("Past Orders");

  if (!pastOrdersSheet) {
    Logger.log("Creating Past Orders sheet as it doesn't exist");
    pastOrdersSheet = spreadsheet.insertSheet("Past Orders");
    
    // Copy headers from the form responses sheet
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    pastOrdersSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  var rows = sheet.getDataRange().getValues();
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  
  Logger.log("Current date (for comparison): " + today.toISOString());
  Logger.log("Total rows to process: " + (rows.length - 1));

  // Starting from the last row to avoid index issues when deleting rows
  for (var r = rows.length - 1; r >= 1; r--) {
    // Safely handle the timestamp
    var timestampRaw = rows[r][0];
    var timestamp;
    
    try {
      // Make sure we have a valid date object
      timestamp = new Date(timestampRaw);
      // Check if the date is valid before using toISOString()
      if (isNaN(timestamp.getTime())) {
        Logger.log("Processing row " + (r+1) + " with invalid timestamp: " + timestampRaw);
        timestamp = null;
      } else {
        Logger.log("Processing row " + (r+1) + " with timestamp: " + timestamp.toISOString());
      }
    } catch(e) {
      Logger.log("Error processing timestamp in row " + (r+1) + ": " + e.message);
      timestamp = null;
    }
    
    if (timestamp && timestamp < today) {
      Logger.log("Row " + (r+1) + " is a past order, moving to Past Orders sheet");
      
      // This is a past order, so move it to the past orders sheet
      var rowRange = sheet.getRange(r + 1, 1, 1, sheet.getLastColumn());
      var rowData = rowRange.getValues()[0];

      // Handle the comma-separated pizza lists in "Pizzas [Row X]" columns
      var combinedPizzas = [];
      var headerRow = rows[0]; // Get header row to identify pizza columns
      
      // Find pizza columns by looking for headers containing "Pizzas"
      for (var i = 0; i < headerRow.length; i++) {
        var headerText = String(headerRow[i] || '');
        if (headerText.includes('Pizzas')) {
          // Get the pizza list from this column, if any
          var pizzaValue = rowData[i];
          if (pizzaValue && typeof pizzaValue === 'string' && pizzaValue.trim() !== '') {
            // Split by comma and add each pizza to the combined list
            var pizzasInCell = pizzaValue.split(',');
            pizzasInCell.forEach(function(pizza) {
              var trimmedPizza = pizza.trim();
              if (trimmedPizza) {
                combinedPizzas.push(trimmedPizza);
              }
            });
          }
        }
      }

      Logger.log("Combined pizzas for row " + (r+1) + ": " + combinedPizzas.join(", "));

      // Insert a new row at the bottom of the past orders sheet
      var lastRow = pastOrdersSheet.getLastRow() + 1;
      
      // Copy all columns from the original data
      pastOrdersSheet.getRange(lastRow, 1, 1, rowData.length).setValues([rowData]);
      
      // Set the combined pizzas into their own columns, starting after the original data columns
      combinedPizzas.forEach(function(pizza, index) {
        pastOrdersSheet.getRange(lastRow, rowData.length + index + 1).setValue(pizza);
      });

      // Delete the original row from the 'Form Responses 1' sheet
      sheet.deleteRow(r + 1);
      Logger.log("Deleted row " + (r+1) + " from Form Responses 1 sheet");
    }
  }
  
  Logger.log("movePastOrders function completed");
}

/**
 * Handles new form submissions
 */
function onFormSubmit(e) {
  Logger.log("onFormSubmit function started");
  
  try {
    // For form submissions, the event structure is different
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName('Form responses 1') || spreadsheet.getSheetByName('Form Responses 1') || spreadsheet.getActiveSheet();
    var row;
    
    if (e && e.range) {
      // This is triggered from spreadsheet
      row = e.range.getRow();
      Logger.log("Triggered from spreadsheet, processing row: " + row);
    } else if (e && e.values) {
      // This is triggered from form submission
      row = sheet.getLastRow();
      Logger.log("Triggered from form submission, processing last row: " + row);
    } else {
      // Manual execution or unknown trigger type
      row = sheet.getLastRow();
      Logger.log("Manual execution or unknown trigger, processing last row: " + row);
    }
    
    // Get all column headers to find the right columns
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Find important columns by header names
    var dueTimeColIndex = findColumnIndex(headers, "Due time");
    var prepTimeColIndex = findColumnIndex(headers, ["prep time", "preparation time", "Preparation time"]);
    var statusColIndex = findColumnIndex(headers, ["status", "Status"]);
    
    // If we couldn't find due time column, add it after Extra Toppings
    if (dueTimeColIndex === -1) {
      var extraToppingsIndex = findColumnIndex(headers, ["Extra Toppings", "toppings"]);
      if (extraToppingsIndex !== -1) {
        dueTimeColIndex = extraToppingsIndex + 1;
        
        // Add Due time column if it doesn't exist
        if (sheet.getRange(1, dueTimeColIndex).getValue() === "") {
          sheet.getRange(1, dueTimeColIndex).setValue("Due time");
        }
      } else {
        // If Extra Toppings not found, look for Preparation time
        var prepIndex = findColumnIndex(headers, ["Preparation time", "prep time"]);
        if (prepIndex !== -1) {
          dueTimeColIndex = prepIndex + 1;
          
          // Add Due time column if it doesn't exist
          if (sheet.getRange(1, dueTimeColIndex).getValue() === "") {
            sheet.getRange(1, dueTimeColIndex).setValue("Due time");
          }
        } else {
          dueTimeColIndex = headers.length + 1; // Add to the end if other columns not found
          sheet.getRange(1, dueTimeColIndex).setValue("Due time");
        }
      }
    }
    
    // If prep time column is found, use it, otherwise look for it by name in the form
    if (prepTimeColIndex === -1) {
      prepTimeColIndex = findColumnIndex(headers, ["Preparation time", "prep time"]);
      if (prepTimeColIndex === -1) {
        // If still not found, default to column before due time
        prepTimeColIndex = dueTimeColIndex - 1;
        if (prepTimeColIndex < 1) prepTimeColIndex = headers.length + 1; // Add to the end
        sheet.getRange(1, prepTimeColIndex).setValue("Preparation time");
      }
    }
    
    // If status column is not found, add it after due time
    if (statusColIndex === -1) {
      statusColIndex = dueTimeColIndex + 1;
      
      // Add Status column if it doesn't exist
      if (sheet.getRange(1, statusColIndex).getValue() === "") {
        sheet.getRange(1, statusColIndex).setValue("Status");
      }
    }
    
    // Add Completed column if it doesn't exist
    var completedColIndex = findColumnIndex(headers, ["Completed", "Done", "finished"]);
    if (completedColIndex === -1) {
      completedColIndex = statusColIndex + 1;
      
      // Add Completed column with checkboxes if it doesn't exist
      if (sheet.getRange(1, completedColIndex).getValue() === "") {
        sheet.getRange(1, completedColIndex).setValue("Completed");
        
        // Set checkbox data validation for the column
        var rule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
        sheet.getRange(2, completedColIndex, sheet.getMaxRows() - 1, 1).setDataValidation(rule);
      }
    }
    
    // Get the timestamp from column A
    var timestamp = sheet.getRange(row, 1).getValue();
    if (!timestamp || !(timestamp instanceof Date)) {
      timestamp = new Date(); // Use current time if no valid timestamp
      Logger.log("No valid timestamp found, using current time: " + timestamp);
    }
    
    // Format and log the order time for debugging
    var orderTimeFormatted = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "HH:mm:ss");
    Logger.log("Order time: " + orderTimeFormatted);
    
    // Get preparation time, accounting for the form's structure
    var prepTimeRaw = sheet.getRange(row, prepTimeColIndex).getValue();
    Logger.log("Raw preparation time: " + prepTimeRaw);
    
    // Get cells for due time and status
    var dueTimeCell = sheet.getRange(row, dueTimeColIndex);
    var statusCell = sheet.getRange(row, statusColIndex);
    
    // Convert prep time to number
    var prepTimeMinutes = extractPrepTime(prepTimeRaw);
    Logger.log("Preparation time: " + prepTimeMinutes + " minutes");
    
    // Calculate due time
    var orderTime = new Date(timestamp);
    var dueTime = new Date(orderTime.getTime() + (prepTimeMinutes * 60000));
    
    // Format time as HH:mm
    var formattedTime = Utilities.formatDate(dueTime, Session.getScriptTimeZone(), "HH:mm");
    Logger.log("Calculated due time: " + formattedTime + " (from order time: " + orderTime + ")");
    
    // Also log the calculation breakdown
    Logger.log("Due time calculation: Order time (" + 
               Utilities.formatDate(orderTime, Session.getScriptTimeZone(), "HH:mm:ss") + 
               ") + " + prepTimeMinutes + " minutes = " + 
               Utilities.formatDate(dueTime, Session.getScriptTimeZone(), "HH:mm:ss"));
    
    // Set the due time
    dueTimeCell.setValue(formattedTime);
    
    // Set initial status
    var currentTime = new Date();
    if (currentTime > dueTime) {
      statusCell.setValue('Late');
      statusCell.setFontColor('red');
      
      // Highlight the entire row for late orders
      sheet.getRange(row, 1, 1, sheet.getLastColumn()).setBackground('#ffcccc');
      
      Logger.log("Order is LATE, setting status to Late");
    } else if ((dueTime.getTime() - currentTime.getTime()) < 300000) { // Less than 5 minutes
      statusCell.setValue('Due Soon');
      statusCell.setFontColor('orange');
      
      // Highlight with yellow for orders due soon
      sheet.getRange(row, 1, 1, sheet.getLastColumn()).setBackground('#fff2cc');
      
      Logger.log("Order is DUE SOON, setting status to Due Soon");
    } else {
      statusCell.setValue('On Time');
      statusCell.setFontColor('black');
      
      // Clear any highlighting
      sheet.getRange(row, 1, 1, sheet.getLastColumn()).setBackground(null);
      
      Logger.log("Order is ON TIME, setting status to On Time");
    }
    
    // Sort immediately after adding a new order
    sortOrdersByDueTime();
    
  } catch (error) {
    Logger.log("Error in onFormSubmit: " + error.message);
    Logger.log("Stack trace: " + error.stack);
  }
  
  Logger.log("onFormSubmit function completed");
}
