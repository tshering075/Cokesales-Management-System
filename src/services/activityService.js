/**
 * Activity Logging Service
 * Tracks all user activities in the app
 */

import { getCurrentUser } from './supabaseService';

const ACTIVITY_TYPES = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  ORDER_CREATED: 'order_created',
  SALES_DATA_UPDATED: 'sales_data_updated',
  TARGET_UPDATED: 'target_updated',
  DISTRIBUTOR_ADDED: 'distributor_added',
  DISTRIBUTOR_UPDATED: 'distributor_updated',
  DISTRIBUTOR_DELETED: 'distributor_deleted',
  PHYSICAL_STOCK_UPDATED: 'physical_stock_updated',
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DELETED: 'user_deleted',
};

/**
 * Log an activity
 * @param {string} type - Activity type (from ACTIVITY_TYPES)
 * @param {string} description - Human-readable description
 * @param {Object} metadata - Additional data (user, distributor, etc.)
 */
export async function logActivity(type, description, metadata = {}) {
  try {
    const currentUser = await getCurrentUser();
    const userEmail = currentUser?.email || metadata.userEmail || 'Unknown';
    const userId = currentUser?.id || metadata.userId || 'Unknown';
    const userName = metadata.userName || userEmail;

    // Clean metadata: remove undefined values and redundant fields
    const cleanMetadata = {};
    for (const [key, value] of Object.entries(metadata)) {
      // Skip undefined values and redundant fields
      if (value !== undefined && key !== 'userId' && key !== 'userEmail' && key !== 'userName') {
        cleanMetadata[key] = value;
      }
    }

    const activity = {
      type,
      description,
      userId,
      userEmail,
      userName,
      timestamp: new Date().toISOString(), // Use regular timestamp for localStorage only
      metadata: cleanMetadata, // Use cleaned metadata without undefined values
    };

    // DO NOT save to Firestore - only save to localStorage
    // Activities are stored locally only to avoid Firestore costs

    // Save to localStorage only (NOT to Firestore)
    try {
      const stored = localStorage.getItem('activities') || '[]';
      const activities = JSON.parse(stored);
      
      const localActivity = {
        ...activity,
        id: Date.now().toString(),
      };
      
      activities.unshift(localActivity); // Add to beginning
      
      // Keep only last 1000 activities
      if (activities.length > 1000) {
        activities.splice(1000);
      }
      
      localStorage.setItem('activities', JSON.stringify(activities));
      console.log('✅ Activity saved to localStorage:', description);
    } catch (localStorageError) {
      console.error('Error saving activity to localStorage:', localStorageError);
    }
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw - activity logging shouldn't break the app
  }
}

/**
 * Get activities from localStorage (NOT from Firestore)
 * @param {number} maxResults - Maximum number of activities to return
 * @returns {Promise<Array>} Array of activities
 */
export async function getActivities(maxResults = 100) {
  try {
    // Activities are stored in localStorage only (NOT in Firestore)
    const stored = localStorage.getItem('activities') || '[]';
    const activities = JSON.parse(stored);
    
    return activities
      .map(activity => ({
        ...activity,
        timestamp: new Date(activity.timestamp),
      }))
      .slice(0, maxResults);
  } catch (localStorageError) {
    console.error('Error loading activities from localStorage:', localStorageError);
    return [];
  }
}

/**
 * Format activity for display
 * @param {Object} activity - Activity object
 * @returns {Object} Formatted activity with icon and color
 */
export function formatActivity(activity) {
  // Ensure activity has required fields with defaults
  const { 
    type = 'unknown', 
    description = 'No description', 
    userName = 'Unknown', 
    userEmail = 'Unknown', 
    timestamp, 
    metadata = {} 
  } = activity || {};
  
  const icons = {
    [ACTIVITY_TYPES.LOGIN]: '🔐',
    [ACTIVITY_TYPES.LOGOUT]: '🚪',
    [ACTIVITY_TYPES.ORDER_CREATED]: '📦',
    [ACTIVITY_TYPES.SALES_DATA_UPDATED]: '📊',
    [ACTIVITY_TYPES.TARGET_UPDATED]: '🎯',
    [ACTIVITY_TYPES.DISTRIBUTOR_ADDED]: '➕',
    [ACTIVITY_TYPES.DISTRIBUTOR_UPDATED]: '✏️',
    [ACTIVITY_TYPES.DISTRIBUTOR_DELETED]: '🗑️',
    [ACTIVITY_TYPES.PHYSICAL_STOCK_UPDATED]: '📦',
    [ACTIVITY_TYPES.USER_CREATED]: '👤',
    [ACTIVITY_TYPES.USER_UPDATED]: '👥',
    [ACTIVITY_TYPES.USER_DELETED]: '❌',
  };

  const colors = {
    [ACTIVITY_TYPES.LOGIN]: 'success',
    [ACTIVITY_TYPES.LOGOUT]: 'default',
    [ACTIVITY_TYPES.ORDER_CREATED]: 'info',
    [ACTIVITY_TYPES.SALES_DATA_UPDATED]: 'primary',
    [ACTIVITY_TYPES.TARGET_UPDATED]: 'warning',
    [ACTIVITY_TYPES.DISTRIBUTOR_ADDED]: 'success',
    [ACTIVITY_TYPES.DISTRIBUTOR_UPDATED]: 'info',
    [ACTIVITY_TYPES.DISTRIBUTOR_DELETED]: 'error',
    [ACTIVITY_TYPES.PHYSICAL_STOCK_UPDATED]: 'info',
    [ACTIVITY_TYPES.USER_CREATED]: 'success',
    [ACTIVITY_TYPES.USER_UPDATED]: 'info',
    [ACTIVITY_TYPES.USER_DELETED]: 'error',
  };

  return {
    ...activity,
    type, // Ensure type is always set
    description,
    userName,
    userEmail,
    metadata,
    icon: icons[type] || '📝',
    color: colors[type] || 'default',
    formattedTime: formatTimestamp(timestamp),
  };
}

/**
 * Format timestamp for display
 * @param {Date|string} timestamp - Timestamp to format
 * @returns {string} Formatted time string
 */
function formatTimestamp(timestamp) {
  if (!timestamp) return 'Unknown time';
  
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleString();
}

// Export activity types for use in other files
export { ACTIVITY_TYPES };
