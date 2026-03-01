

export interface ValidationError {
    field: string
    message: string
  }

  export interface RateLimitConfig {
    maxRequests: number  // max requests allowed
    windowMinutes: number  // per this many minutes
  }
  
  export function validateString(
    value: unknown,
    field: string,
    options?: { minLength?: number; maxLength?: number }
  ): ValidationError | null {
    if (typeof value !== 'string' || !value.trim()) {
      return { field, message: `${field} is required and must be a string` }
    }
    if (options?.minLength && value.trim().length < options.minLength) {
      return { field, message: `${field} must be at least ${options.minLength} characters` }
    }
    if (options?.maxLength && value.trim().length > options.maxLength) {
      return { field, message: `${field} must be less than ${options.maxLength} characters` }
    }
    return null
  }
  
  export function validateNumber(
    value: unknown,
    field: string,
    options?: { min?: number; max?: number }
  ): ValidationError | null {
    if (typeof value !== 'number' || isNaN(value)) {
      return { field, message: `${field} must be a valid number` }
    }
    if (options?.min !== undefined && value < options.min) {
      return { field, message: `${field} must be at least ${options.min}` }
    }
    if (options?.max !== undefined && value > options.max) {
      return { field, message: `${field} must be less than ${options.max}` }
    }
    return null
  }
  
  export function validateUUID(value: unknown, field: string): ValidationError | null {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (typeof value !== 'string' || !uuidRegex.test(value)) {
      return { field, message: `${field} must be a valid UUID` }
    }
    return null
  }
  
  export function sanitizeString(value: string): string {
    return value
      .trim()
      .replace(/[<>]/g, '') // strip basic XSS chars
      .slice(0, 1000)        // hard cap length
  }
  
  export function buildValidationResponse(
    errors: (ValidationError | null)[],
    corsHeaders: Record<string, string>
  ): Response | null {
    const actual = errors.filter(Boolean) as ValidationError[]
    if (actual.length === 0) return null
  
    return new Response(
      JSON.stringify({ success: false, errors: actual }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  export async function checkRateLimit(
    supabase: any,
    userId: string,
    functionName: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; remaining: number }> {
    const windowStart = new Date(Date.now() - config.windowMinutes * 60 * 1000).toISOString()
  
    const { data, error } = await supabase
      .from('rate_limits')
      .select('request_count, window_start')
      .eq('user_id', userId)
      .eq('function_name', functionName)
      .single()
  
    // No record yet — first request, allow it
    if (error || !data) {
      await supabase.from('rate_limits').upsert({
        user_id: userId,
        function_name: functionName,
        request_count: 1,
        window_start: new Date().toISOString(),
      }, { onConflict: 'user_id,function_name' })
      return { allowed: true, remaining: config.maxRequests - 1 }
    }
  
    // Window expired — reset count
    if (data.window_start < windowStart) {
      await supabase.from('rate_limits').update({
        request_count: 1,
        window_start: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('function_name', functionName)
      return { allowed: true, remaining: config.maxRequests - 1 }
    }
  
    // Within window — check count
    if (data.request_count >= config.maxRequests) {
      return { allowed: false, remaining: 0 }
    }
  
    // Increment count
    await supabase.from('rate_limits').update({
      request_count: data.request_count + 1,
    })
    .eq('user_id', userId)
    .eq('function_name', functionName)
  
    return { allowed: true, remaining: config.maxRequests - data.request_count - 1 }
  }
  
  export function rateLimitResponse(corsHeaders: Record<string, string>): Response {
    return new Response(
      JSON.stringify({ success: false, error: 'Too many requests. Please slow down.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }