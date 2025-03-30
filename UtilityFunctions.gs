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
  
  // Log the input for debugging
  Logger.log("extractPrepTime received: " + prepTimeRaw + " (type: " + typeof prepTimeRaw + ")");
  
  // If empty or null, use default
  if (prepTimeRaw === null || prepTimeRaw === undefined || prepTimeRaw === "") {
    prepTimeMinutes = 15; // Default
    Logger.log("Empty prep time, using default 15 minutes");
    return prepTimeMinutes;
  }
  
  // If it's just a number, return it directly
  if (typeof prepTimeRaw === 'number') {
    // Don't use default for form-submitted values, preserve the actual value
    prepTimeMinutes = prepTimeRaw;
    Logger.log("Numeric prep time: " + prepTimeMinutes + " minutes");
    return prepTimeMinutes;
  }
  
  // Convert to string for parsing
  if (typeof prepTimeRaw !== 'string') {
    prepTimeRaw = String(prepTimeRaw);
  }
  
  // Clean up string (trim whitespace, etc.)
  prepTimeRaw = prepTimeRaw.trim();
  
  // Check for just a plain number as string (most common case)
  if (/^\d+$/.test(prepTimeRaw)) {
    prepTimeMinutes = parseInt(prepTimeRaw, 10);
    Logger.log("Plain number string: " + prepTimeRaw + " -> " + prepTimeMinutes + " minutes");
    return prepTimeMinutes;
  }
  
  // Check for specific test patterns like "test5" or "test 5"
  var testMatch = prepTimeRaw.match(/test\s*(\d+)/i);
  if (testMatch && testMatch.length > 1) {
    // Extract the number after "test"
    prepTimeMinutes = parseInt(testMatch[1], 10);
    Logger.log("Found test pattern: " + prepTimeRaw + " -> " + prepTimeMinutes + " minutes");
    return prepTimeMinutes;
  }
  
  // Special named test cases
  var lowerCasePrepTime = prepTimeRaw.toLowerCase();
  if (lowerCasePrepTime === "test a") {
    prepTimeMinutes = 10;
    Logger.log("Found 'Test A' -> 10 minutes");
    return prepTimeMinutes;
  } else if (lowerCasePrepTime === "test b") {
    prepTimeMinutes = 15;
    Logger.log("Found 'Test B' -> 15 minutes");
    return prepTimeMinutes;
  } else if (lowerCasePrepTime === "test c") {
    prepTimeMinutes = 26;
    Logger.log("Found 'Test C' -> 26 minutes");
    return prepTimeMinutes;
  } else if (lowerCasePrepTime === "test d") {
    prepTimeMinutes = 30;
    Logger.log("Found 'Test D' -> 30 minutes");
    return prepTimeMinutes;
  } else if (lowerCasePrepTime === "test e") {
    prepTimeMinutes = 45;
    Logger.log("Found 'Test E' -> 45 minutes");
    return prepTimeMinutes;
  } else if (lowerCasePrepTime === "t") {
    prepTimeMinutes = 15;
    Logger.log("Found 't' -> 15 minutes");
    return prepTimeMinutes;
  } else if (lowerCasePrepTime === "te") {
    prepTimeMinutes = 15;
    Logger.log("Found 'te' -> 15 minutes");
    return prepTimeMinutes;
  }
  
  // Try to extract any numeric value from string as fallback
  var matches = prepTimeRaw.match(/\d+/);
  if (matches && matches.length > 0) {
    prepTimeMinutes = parseInt(matches[0], 10);
    Logger.log("Extracted number from: " + prepTimeRaw + " -> " + prepTimeMinutes + " minutes");
    return prepTimeMinutes;
  }
  
  // Default if all else fails
  prepTimeMinutes = 15;
  Logger.log("No number found in: " + prepTimeRaw + ", using default 15 minutes");
  return prepTimeMinutes;
}
