/**
 * Utility function to find column index by header text
 * Can search for multiple possible header texts
 */
function findColumnIndex(headers, searchTexts) {
  if (!Array.isArray(searchTexts)) {
    searchTexts = [searchTexts];
  }
  
  for (var i = 0; i < headers.length; i++) {
    var headerText = (headers[i] || "").toString().toLowerCase();
    
    for (var j = 0; j < searchTexts.length; j++) {
      var searchText = searchTexts[j].toLowerCase();
      if (headerText === searchText || headerText.indexOf(searchText) >= 0) {
        return i + 1; // Convert to 1-based index
      }
    }
  }
  
  return -1; // Not found
}

/**
 * Utility function to extract preparation time in minutes
 */
function extractPrepTime(prepTimeRaw) {
  var prepTimeMinutes = 0;
  
  if (typeof prepTimeRaw === 'string') {
    // Check for specific test patterns like "test5" or "test 5"
    var testMatch = prepTimeRaw.match(/test\s*(\d+)/i);
    if (testMatch && testMatch.length > 1) {
      // Extract the number after "test"
      prepTimeMinutes = parseInt(testMatch[1], 10);
      Logger.log("Found test pattern: " + prepTimeRaw + " -> " + prepTimeMinutes + " minutes");
    } else if (prepTimeRaw.toLowerCase() === "t") {
      // Special case for "t" - 15 minutes
      prepTimeMinutes = 15;
      Logger.log("Found 't' -> 15 minutes");
    } else if (prepTimeRaw.toLowerCase() === "te") {
      // Special case for "te" - 15 minutes
      prepTimeMinutes = 15;
      Logger.log("Found 'te' -> 15 minutes");
    } else {
      // Try to extract any numeric value from string
      var matches = prepTimeRaw.match(/\d+/);
      if (matches && matches.length > 0) {
        prepTimeMinutes = parseInt(matches[0], 10);
        Logger.log("Extracted number from: " + prepTimeRaw + " -> " + prepTimeMinutes + " minutes");
      } else {
        // Default to 15 minutes if no number found
        prepTimeMinutes = 15;
        Logger.log("No number found in: " + prepTimeRaw + ", using default 15 minutes");
      }
    }
  } else if (typeof prepTimeRaw === 'number') {
    prepTimeMinutes = prepTimeRaw;
    Logger.log("Numeric prep time: " + prepTimeMinutes + " minutes");
  } else {
    // Default to 15 minutes if prep time is not a string or number
    prepTimeMinutes = 15;
    Logger.log("Invalid prep time format: " + typeof prepTimeRaw + ", using default 15 minutes");
  }
  
  // If prep time is still 0 or invalid, use default
  if (isNaN(prepTimeMinutes) || prepTimeMinutes <= 0) {
    prepTimeMinutes = 15; // Default to 15 minutes
    Logger.log("Invalid prep time value, using default 15 minutes");
  }
  
  // Add additional logging
  Logger.log("Final prep time calculation: " + prepTimeMinutes + " minutes");
  
  return prepTimeMinutes;
}
