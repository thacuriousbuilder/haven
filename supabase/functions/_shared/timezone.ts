

/**
 * Convert UTC time to user's local time using their IANA timezone
 * Returns { hour, minute, dateString } in user's local time
 */
export function getUserLocalTime(
    utcNow: Date,
    timezone: string
  ): { hour: number; minute: number; dateString: string } {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
  
      const parts = formatter.formatToParts(utcNow)
      const hourStr = parts.find(p => p.type === 'hour')?.value ?? '0'
      const minuteStr = parts.find(p => p.type === 'minute')?.value ?? '0'
      const year = parts.find(p => p.type === 'year')?.value ?? '2026'
      const month = parts.find(p => p.type === 'month')?.value ?? '01'
      const day = parts.find(p => p.type === 'day')?.value ?? '01'
  
      // Handle midnight edge case — Intl returns '24' for midnight in some locales
      let hour = parseInt(hourStr)
      if (hour === 24) hour = 0
  
      return {
        hour,
        minute: parseInt(minuteStr),
        dateString: `${year}-${month}-${day}`,
      }
    } catch {
      // Fallback to EST if timezone is invalid
      const estNow = new Date(utcNow.getTime() + (-5 * 60) * 60 * 1000)
      return {
        hour: estNow.getUTCHours(),
        minute: estNow.getUTCMinutes(),
        dateString: estNow.toISOString().split('T')[0],
      }
    }
  }
  
  /**
   * Get window of HH:MM values for the current 15-min block
   * e.g. if time is 8:07 → ['08:00', '08:01', ..., '08:14']
   */
  export function getWindowMinutes(hour: number, minute: number): string[] {
    const start = Math.floor(minute / 15) * 15
    const times: string[] = []
    for (let m = start; m < start + 15; m++) {
      times.push(
        `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      )
    }
    return times
  }
  
  /**
   * Get EST time (UTC-5, no DST for MVP)
   * Used by sendDailyNotifications for fixed-time slots
   */
  export function getESTTime(): { hour: number; minute: number; dateString: string } {
    const now = new Date()
    const estNow = new Date(now.getTime() + (-5 * 60) * 60 * 1000)
    return {
      hour: estNow.getUTCHours(),
      minute: estNow.getUTCMinutes(),
      dateString: estNow.toISOString().split('T')[0],
    }
  }
  
  /**
   * Check if a given EST date is Monday
   */
  export function isMonday(dateString: string): boolean {
    const date = new Date(dateString + 'T00:00:00Z')
    return date.getUTCDay() === 1
  }
  
  /**
   * Check if a given EST date is Wednesday
   */
  export function isWednesday(dateString: string): boolean {
    const date = new Date(dateString + 'T00:00:00Z')
    return date.getUTCDay() === 3
  }