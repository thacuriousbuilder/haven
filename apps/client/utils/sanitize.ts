// apps/client/utils/sanitize.ts

export function sanitizeInput(value: string, maxLength: number = 500): string {
    return value
      .trim()
      .replace(/[<>]/g, '')     // strip XSS chars
      .replace(/\s+/g, ' ')     // collapse multiple spaces
      .slice(0, maxLength)
  }
  
  export function sanitizeFoodName(value: string): string {
    return sanitizeInput(value, 200)
  }