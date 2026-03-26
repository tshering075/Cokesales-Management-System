/**
 * Utility functions for managing order numbers
 */

const ORDER_NUMBER_KEY = "coke_order_counter";

/**
 * Get the next order number (sequential, persistent, 4-digit)
 * Returns numbers from 1000 to 9999, then wraps around
 */
export function getNextOrderNumber() {
  try {
    const stored = localStorage.getItem(ORDER_NUMBER_KEY);
    let counter = stored ? parseInt(stored, 10) : 1000;
    
    // Increment counter
    counter++;
    
    // Wrap around to 1000 if exceeds 9999 (keep it 4-digit)
    if (counter > 9999) {
      counter = 1000;
    }
    
    // Save updated counter
    localStorage.setItem(ORDER_NUMBER_KEY, counter.toString());
    
    // Format as 4-digit string with leading zeros if needed
    return counter.toString().padStart(4, '0');
  } catch (error) {
    // Fallback to timestamp-based 4-digit number if localStorage fails
    const fallback = Math.floor(Date.now() / 1000) % 10000;
    return fallback.toString().padStart(4, '0');
  }
}

/**
 * Get current order number without incrementing (4-digit format)
 */
export function getCurrentOrderNumber() {
  try {
    const stored = localStorage.getItem(ORDER_NUMBER_KEY);
    const counter = stored ? parseInt(stored, 10) : 1000;
    return counter.toString().padStart(4, '0');
  } catch (error) {
    return '1000';
  }
}

/**
 * Reset order number counter (for testing/admin purposes)
 */
export function resetOrderNumber(startFrom = 1000) {
  try {
    localStorage.setItem(ORDER_NUMBER_KEY, startFrom.toString());
    return true;
  } catch (error) {
    return false;
  }
}
