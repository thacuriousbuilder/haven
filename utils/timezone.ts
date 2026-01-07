/**
 * Timezone utility functions for HAVEN
 * 
 * RULE: Always store dates in UTC, only convert to local for display
 */

/**
 * Get the current date in the user's local timezone as YYYY-MM-DD
 * Use this for: log_date, summary_date, cheat_date
 */
export function getLocalDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  /**
   * Get UTC timestamp for "now"
   * Use this for: created_at, updated_at
   */
  export function getUTCTimestamp(): string {
    return new Date().toISOString();
  }
  
  /**
   * Convert a UTC timestamp to local date string (YYYY-MM-DD)
   * Use this for: displaying dates to users
   */
  export function utcToLocalDateString(utcTimestamp: string): string {
    const date = new Date(utcTimestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  /**
   * Get start of day in UTC for a given local date
   * Use this for: querying records by date
   */
  export function getStartOfDayUTC(localDateString: string): string {
    const date = new Date(localDateString);
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  }
  
  /**
   * Get end of day in UTC for a given local date
   * Use this for: querying records by date
   */
  export function getEndOfDayUTC(localDateString: string): string {
    const date = new Date(localDateString);
    date.setHours(23, 59, 59, 999);
    return date.toISOString();
  }
  
  /**
   * Check if two dates are the same day in local timezone
   */
  export function isSameLocalDay(date1: Date | string, date2: Date | string): boolean {
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
    
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }
  
  /**
   * Get days difference between two local dates
   */
  export function getDaysDifference(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - start.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }
  
  /**
   * Format time for display (e.g., "2:30 PM")
   */
  export function formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
  
  /**
 * Format date for display (e.g., "Today", "Yesterday", "Jan 6")
 * @param dateString - Date in YYYY-MM-DD format OR ISO timestamp
 */
export function formatDateDisplay(dateString: string): string {
  // Handle YYYY-MM-DD format (date string) - simple string comparison
  if (dateString.length === 10 && !dateString.includes('T')) {
    const today = getLocalDateString();
    
    if (dateString === today) {
      return 'Today';
    }
    
    // Calculate yesterday's date string
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const year = yesterdayDate.getFullYear();
    const month = String(yesterdayDate.getMonth() + 1).padStart(2, '0');
    const day = String(yesterdayDate.getDate()).padStart(2, '0');
    const yesterdayStr = `${year}-${month}-${day}`;
    
    if (dateString === yesterdayStr) {
      return 'Yesterday';
    }
    
    // Format other dates
    const [yearNum, monthNum, dayNum] = dateString.split('-').map(Number);
    const date = new Date(yearNum, monthNum - 1, dayNum);
    const currentYear = new Date().getFullYear();
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: yearNum !== currentYear ? 'numeric' : undefined,
    });
  }
  
  // Handle ISO timestamp format (fallback for message timestamps)
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const messageDay = new Date(date);
  messageDay.setHours(0, 0, 0, 0);
  
  if (messageDay.getTime() === today.getTime()) {
    return 'Today';
  } else if (messageDay.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  }
}