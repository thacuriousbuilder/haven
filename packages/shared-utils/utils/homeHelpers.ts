import { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons'
import {Colors} from '../../../apps/trainer/constants/colors'



/**
 * Map meal type to appropriate Ionicons name
 */
export function getMealIcon(mealType: string): string {
  const iconMap: Record<string, string> = {
    breakfast: 'sunny',      // Morning sun
    lunch: 'partly-sunny',   // Afternoon sun
    dinner: 'moon',          // Evening moon
    snack: 'cafe',           // Coffee/snack
  };
  
  return iconMap[mealType.toLowerCase()] || 'restaurant';
}

/**
 * Get meal icon based on time of day (for "not logged yet" placeholders)
 * @param hour - Hour in 24h format (0-23)
 */
export function getTimeBasedMealIcon(hour: number): string {
  if (hour >= 5 && hour < 11) return 'sunny';        // Morning
  if (hour >= 11 && hour < 15) return 'partly-sunny'; // Afternoon
  if (hour >= 15 && hour < 20) return 'restaurant';   // Evening
  return 'moon';                                       // Night
}

/**
 * Format timestamp to display time (e.g., "8:30 AM")
 */
export function formatMealTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
}

/**
 * Format date to display format (e.g., "Mon, Jan 20")
 */
export function formatDisplayDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get time since last log in human-readable format
 */
export function getTimeSinceLog(timestamp: string | null): string {
  if (!timestamp) return 'No logs today';
  
  const now = new Date();
  const logTime = new Date(timestamp);
  const diffMs = now.getTime() - logTime.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}


/**
 * Get color for macro type
 */
export function getMacroColor(macroType: 'protein' | 'carbs' | 'fat'): string {
  const colorMap = {
    protein: Colors.proteinOrange,
    carbs: Colors.carbsTeal,
    fat: Colors.fatSteel,
  };
  
  return colorMap[macroType];
}

/**
 * Get background color for macro circle (lighter tint)
 */
export function getMacroBackgroundColor(macroType: 'protein' | 'carbs' | 'fat'): string {
  const colorMap = {
    protein: Colors.orangeOverlay,
    carbs: Colors.tealOverlay,
    fat: 'rgba(104, 124, 136, 0.1)',
  };
  
  return colorMap[macroType];
}

/**
 * Get icon name for macro type
 */
type IoniconsName = ComponentProps<typeof Ionicons>['name'];
export function getMacroIcon(type: 'protein' | 'carbs' | 'fat'): IoniconsName {
  switch (type) {
    case 'protein':
      return 'barbell';  // Dumbbell for protein/muscle
    case 'carbs':
      return 'nutrition'; // Grain/wheat symbol for carbs
    case 'fat':
      return 'water';              // Solid leaf for avocado/healthy fats
    default:
      return 'ellipse';
  }
}

/**
 * Capitalize first letter of string
 */
export function capitalizeFirst(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Format number with commas (e.g., 1823 → "1,823")
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Get status color based on progress
 */
export function getStatusColor(status: 'on_track' | 'needs_attention' | 'over_budget'): string {
  const colorMap = {
    on_track: Colors.success,
    needs_attention: Colors.warning,
    over_budget: Colors.error,
  };
  
  return colorMap[status];
}

/**
 * Get day abbreviation (M, T, W, T, F, S, S)
 */
export function getDayAbbreviation(dayIndex: number): string {
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return days[dayIndex];
}

/**
 * Get day name abbreviation starting from Monday (M, T, W, T, F, S, S)
 */
export function getWeekdayAbbreviation(dayIndex: number): string {
  // dayIndex: 0 = Monday, 6 = Sunday
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return days[dayIndex];
}

/**
 * Calculate percentage (used for progress rings)
 */
export function calculatePercentage(value: number, max: number): number {
  if (max === 0) return 0;
  return Math.min(Math.round((value / max) * 100), 100);
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}