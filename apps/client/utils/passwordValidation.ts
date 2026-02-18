
export interface PasswordStrength {
    isValid: boolean
    score: number // 0-4
    errors: string[]
    label: 'Weak' | 'Fair' | 'Good' | 'Strong'
    color: string
  }
  
  export function validatePassword(password: string): PasswordStrength {
    const errors: string[] = []
  
    if (password.length < 8) errors.push('At least 8 characters')
    if (!/[A-Z]/.test(password)) errors.push('One uppercase letter')
    if (!/[0-9]/.test(password)) errors.push('One number')
    if (!/[^A-Za-z0-9]/.test(password)) errors.push('One special character (!@#$...)')
  
    const score = 4 - errors.length
  
    const labelMap: Record<number, 'Weak' | 'Fair' | 'Good' | 'Strong'> = {
      0: 'Weak',
      1: 'Weak',
      2: 'Fair',
      3: 'Good',
      4: 'Strong',
    }
  
    const colorMap: Record<number, string> = {
      0: '#EF4444',
      1: '#EF4444',
      2: '#F59E0B',
      3: '#10B981',
      4: '#206E6B',
    }
  
    return {
      isValid: errors.length === 0,
      score,
      errors,
      label: labelMap[score],
      color: colorMap[score],
    }
  }