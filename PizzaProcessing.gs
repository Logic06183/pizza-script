/**
 * Processes pizza orders for ingredient usage
 */
function processPizzaOrders() {
  Logger.log("Starting processPizzaOrders function");
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var pastOrdersSheet = ss.getSheetByName('Past Orders');
  var lookupSheet = ss.getSheetByName('Lookup');
  var resultSheetName = 'Daily Ingredient Usage';
  var resultSheet = ss.getSheetByName(resultSheetName) || ss.insertSheet(resultSheetName);

  if (!pastOrdersSheet || !lookupSheet) {
    Logger.log("Required sheets not found!");
    return;
  }

  var pastOrdersData = pastOrdersSheet.getDataRange().getValues();
  var lookupData = lookupSheet.getDataRange().getValues();
  var totalIngredients = {};

  // Helper function to normalize pizza names for comparison
  function normalizePizzaName(name) {
    if (!name) return "";
    return (name + '').trim().toLowerCase().replace(/'s| in | the | pizza/g, "");
  }

  // Create a map for efficient lookup of ingredients by pizza name
  var lookupMap = {};
  lookupData.slice(1).forEach(function(row) { // Skip header row
    var pizzaName = normalizePizzaName(row[0]);
    if (!lookupMap[pizzaName]) {
      lookupMap[pizzaName] = [];
    }
    lookupMap[pizzaName].push({ 
      ingredient: row[1], 
      quantity: parseFloat(row[2] || 0), 
      cost: parseFloat(row[3] || 0) 
    });
  });

  // Determine yesterday's date
  var today = new Date();
  var yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0); // Start of yesterday

  // Filter past orders to include only those from yesterday
  var filteredOrdersData = pastOrdersData.slice(1).filter(function(order) { // Skip header row
    var orderDate = new Date(order[0]);
    return orderDate >= yesterday && orderDate < today;
  });

  // Process filtered orders
  filteredOrdersData.forEach(function(order) {
    // Process each pizza entry from the past orders sheet
    for (var i = 0; i < order.length; i++) {
      // The first columns are metadata, then we have individual pizzas in columns after the original data
      // Usually starting from column index 10+
      if (i >= pastOrdersData[0].length) { // If we're beyond the original columns (in the pizza columns area)
        var pizzaCellContent = order[i];
        if (pizzaCellContent && typeof pizzaCellContent === 'string') {
          var pizzaName = normalizePizzaName(pizzaCellContent);
          
          if (lookupMap[pizzaName]) {
            lookupMap[pizzaName].forEach(function(lookupRow) {
              var ingredient = lookupRow.ingredient;
              var quantity = lookupRow.quantity;
              if (!totalIngredients[ingredient]) {
                totalIngredients[ingredient] = { totalQuantity: 0, totalCost: 0 };
              }
              totalIngredients[ingredient].totalQuantity += quantity;
              totalIngredients[ingredient].totalCost += lookupRow.cost;
            });
          } else {
            Logger.log("Warning: Pizza not found in lookup: " + pizzaName);
          }
        }
      }
    }
  });

  // Prepare and write the data to the 'Daily Ingredient Usage' sheet
  var resultData = [["Ingredient", "Total Quantity", "Total Cost"]];
  Object.keys(totalIngredients).forEach(function(ingredient) {
    resultData.push([
      ingredient,
      totalIngredients[ingredient].totalQuantity,
      totalIngredients[ingredient].totalCost.toFixed(2) // Round to 2 decimal places for cost
    ]);
  });

  resultSheet.clear();
  resultSheet.getRange(1, 1, resultData.length, 3).setValues(resultData);
  
  Logger.log("processPizzaOrders function completed");
}

/**
 * Summarizes all pizza orders
 */
function summarizeOrders() {
  Logger.log("Starting summarizeOrders function");
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ordersSheet = ss.getSheetByName('Past Orders');
  var summarySheet = ss.getSheetByName('Inventory Summary') || ss.insertSheet('Inventory Summary');

  if (!ordersSheet) {
    Logger.log("Past Orders sheet not found!");
    return;
  }

  // Clear the previous summary
  summarySheet.clear();

  // Retrieve all orders
  var ordersData = ordersSheet.getDataRange().getValues();
  var pizzaSummary = {};

  // Process each row in the past orders
  ordersData.slice(1).forEach(function(row) { // Skip header row
    // Process each pizza entry from the past orders sheet
    for (var i = 0; i < row.length; i++) {
      // The first columns are metadata, then we have individual pizzas in columns after the original data
      if (i >= ordersData[0].length) { // If we're beyond the original columns (in the pizza columns area)
        var cellContent = row[i];
        // Check if the cell content is a non-empty string before processing
        if (cellContent && typeof cellContent === 'string') {
          var pizzaName = cellContent.trim().toLowerCase();
          pizzaSummary[pizzaName] = (pizzaSummary[pizzaName] || 0) + 1;
        }
      }
    }
  });

  // Convert the summary object to an array suitable for the spreadsheet
  var summaryArray = [["Pizza Name", "Total Count"]];
  Object.keys(pizzaSummary).forEach(function(name) {
    summaryArray.push([name, pizzaSummary[name]]);
  });

  // Write the summary to the sheet
  summarySheet.getRange(1, 1, summaryArray.length, 2).setValues(summaryArray);
  
  Logger.log("summarizeOrders function completed");
}

/**
 * Summarizes pizza orders within a date range specified in the Dashboard sheet
 */
function summarizeOrdersWithDateFilter() {
  Logger.log("Starting summarizeOrdersWithDateFilter function");
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dashboardSheet = ss.getSheetByName('Dashboard');
  
  if (!dashboardSheet) {
    Logger.log("Error: Dashboard sheet not found");
    return;
  }
  
  var startDateCell = dashboardSheet.getRange('A1').getValue();
  var endDateCell = dashboardSheet.getRange('A2').getValue();
  
  if (!startDateCell || !endDateCell) {
    Logger.log("Error: Start date or end date missing in Dashboard");
    return;
  }
  
  var startDate = new Date(startDateCell);
  var endDate = new Date(endDateCell);
  
  // Set end date to end of day for inclusive comparison
  endDate.setHours(23, 59, 59, 999);
  
  Logger.log("Date range: " + startDate.toDateString() + " to " + endDate.toDateString());
  
  var ordersSheet = ss.getSheetByName('Past Orders');
  var summarySheet = ss.getSheetByName('Inventory Summary') || ss.insertSheet('Inventory Summary');

  // Clear the previous summary
  summarySheet.clear();

  // Retrieve all orders
  var ordersData = ordersSheet.getDataRange().getValues();
  var pizzaSummary = {};

  ordersData.slice(1).forEach(function(row) { // Skip header row
    var orderDate = new Date(row[0]);
    
    if (orderDate >= startDate && orderDate <= endDate) {
      // Process each pizza entry from the past orders sheet
      for (var i = 0; i < row.length; i++) {
        // The first columns are metadata, then we have individual pizzas in columns after the original data
        if (i >= ordersData[0].length) { // If we're beyond the original columns (in the pizza columns area)
          var cellContent = row[i];
          // Check if the cell content is a non-empty string before processing
          if (cellContent && typeof cellContent === 'string') {
            var pizzaName = cellContent.trim().toLowerCase();
            pizzaSummary[pizzaName] = (pizzaSummary[pizzaName] || 0) + 1;
          }
        }
      }
    }
  });

  // Convert the summary object to an array suitable for the spreadsheet
  var summaryArray = [["Pizza Name", "Total Count"]];
  Object.keys(pizzaSummary).forEach(function(name) {
    summaryArray.push([name, pizzaSummary[name]]);
  });

  // Write the summary to the sheet
  summarySheet.getRange(1, 1, summaryArray.length, 2).setValues(summaryArray);
  
  Logger.log("summarizeOrdersWithDateFilter function completed");
}
