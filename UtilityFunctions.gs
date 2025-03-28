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
    // Try to extract numeric value from string
    var matches = prepTimeRaw.match(/\d+/);
    if (matches && matches.length > 0) {
      prepTimeMinutes = parseInt(matches[0], 10);
    } else {
      // Default to 15 minutes if no number found
      prepTimeMinutes = 15;
    }
  } else if (typeof prepTimeRaw === 'number') {
    prepTimeMinutes = prepTimeRaw;
  } else {
    // Default to 15 minutes if prep time is not a string or number
    prepTimeMinutes = 15;
  }
  
  // If prep time is still 0 or invalid, use default
  if (isNaN(prepTimeMinutes) || prepTimeMinutes <= 0) {
    prepTimeMinutes = 15; // Default to 15 minutes
  }
  
  return prepTimeMinutes;
}
