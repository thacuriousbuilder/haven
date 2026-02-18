
//@ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  validateNumber,
  validateUUID,
  buildValidationResponse,
  checkRateLimit,
  rateLimitResponse,
} from '../_shared/validate.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

//@ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('⚠️ Weekly limit warning check started')

    // 1. Verify JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userClient = createClient(
      //@ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      //@ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Validate inputs
    const { user_id, calories_consumed, weekly_budget } = await req.json()

    const validationResponse = buildValidationResponse([
      validateUUID(user_id, 'user_id'),
      validateNumber(calories_consumed, 'calories_consumed', { min: 0, max: 100000 }),
      validateNumber(weekly_budget, 'weekly_budget', { min: 1, max: 100000 }),
    ], corsHeaders)
    if (validationResponse) return validationResponse

    // 3. Ensure user can only trigger warning for themselves
    if (user.id !== user_id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminClient = createClient(
      //@ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      //@ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 4. Rate limit — 5 requests per hour
    const { allowed } = await checkRateLimit(
      adminClient,
      user.id,
      'sendWeeklyLimitWarning',
      { maxRequests: 5, windowMinutes: 60 }
    )

    if (!allowed) {
      console.warn('🚫 Rate limit exceeded for user:', user.id)
      return rateLimitResponse(corsHeaders)
    }

    // 5. Check threshold
    const percentage = calories_consumed / weekly_budget
    if (percentage < 0.80) {
      console.log(`✅ User ${user_id} at ${Math.round(percentage * 100)}% — no warning needed`)
      return new Response(
        JSON.stringify({ success: true, warned: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('expo_push_token, weekly_limit_warned')
      .eq('id', user_id)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (profile.weekly_limit_warned) {
      return new Response(
        JSON.stringify({ success: true, warned: false, reason: 'already_warned' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!profile.expo_push_token) {
      return new Response(
        JSON.stringify({ success: false, error: 'No push token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        to: profile.expo_push_token,
        title: 'Heads up! ⚠️',
        body: `You've used ${Math.round(percentage * 100)}% of your weekly calorie budget.`,
        sound: 'default',
        channelId: 'default',
      }),
    })

    const result = await response.json()
    console.log('📤 Notification sent')

    await adminClient
      .from('profiles')
      .update({
        weekly_limit_warned: true,
        weekly_limit_warned_at: new Date().toISOString(),
      })
      .eq('id', user_id)

    return new Response(
      JSON.stringify({ success: true, warned: true, result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in sendWeeklyLimitWarning:', error)
    return new Response(
      //@ts-ignore
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})