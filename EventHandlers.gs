/**
 * Handles checkbox edits
 */
function onEdit(e) {
  var range = e.range;
  var sheet = range.getSheet();
  
  // Only process edits on the Form Responses sheet
  if (sheet.getName() !== 'Form Responses 1') {
    return;
  }
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var completedColIndex = findColumnIndex(headers, ["Completed", "Done", "finished"]);
  var statusColIndex = findColumnIndex(headers, "status");
  
  if (completedColIndex === -1) completedColIndex = 10; // Default to column J
  if (statusColIndex === -1) statusColIndex = 9; // Default to column I
  
  // Check if the edit was made in the completed column
  if (range.getColumn() === completedColIndex) {
    var row = range.getRow();
    if (row === 1) return; // Skip if editing the header
    
    var checkboxChecked = range.getValue() === true;
    var statusCell = sheet.getRange(row, statusColIndex);
    
    if (checkboxChecked) {
      statusCell.setValue('Done');
      statusCell.setFontColor('green');
    } else {
      // Revert to appropriate status
      updateSingleOrderStatus(sheet, row, statusColIndex);
    }
    
    // Sort orders after editing checkbox
    sortOrdersByDueTime();
  }
}
