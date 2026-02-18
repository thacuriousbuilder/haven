
//@ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2'
import { validateUUID, buildValidationResponse } from '../_shared/validate.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const daysFromMonday = day === 0 ? 6 : day - 1
  const monday = new Date(d)
  monday.setDate(d.getDate() - daysFromMonday)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function getSunday(monday: Date): Date {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return sunday
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

//@ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🎯 Create user period request received')

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
      console.error('❌ Invalid token:', userError)
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Use user_id from JWT — ignore any user_id in body
    const user_id = user.id
    console.log('✅ Authenticated user:', user_id)

    // 3. Validate user_id just to be safe
    const validationResponse = buildValidationResponse([
      validateUUID(user_id, 'user_id'),
    ], corsHeaders)
    if (validationResponse) return validationResponse

    // 4. Admin client for DB operations
    const adminClient = createClient(
      //@ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      //@ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const today = new Date()
    const thisMonday = getMonday(today)
    const thisSunday = getSunday(thisMonday)
    const weekStartDate = formatDate(thisMonday)
    const weekEndDate = formatDate(thisSunday)

    console.log('📅 Creating period for:', weekStartDate, 'to', weekEndDate)

    // Check if period already exists
    const { data: existingPeriods } = await adminClient
      .from('weekly_periods')
      .select('*')
      .eq('user_id', user_id)
      .or(`and(week_start_date.lte.${weekEndDate},week_end_date.gte.${weekStartDate})`)

    if (existingPeriods && existingPeriods.length > 0) {
      console.log('⏭️ Period already exists for this week')
      return new Response(
        JSON.stringify({
          success: true,
          reason: 'already_exists',
          period_id: existingPeriods[0].id,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user profile
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('baseline_avg_daily_calories, weekly_budget, baseline_complete')
      .eq('id', user_id)
      .single()

    if (profileError || !profile) {
      console.error('❌ Error loading profile:', profileError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to load user profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!profile.weekly_budget) {
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'no_baseline_data',
          error: 'Complete onboarding or baseline week first',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const weeklyBudget = profile.weekly_budget
    const baselineAvg = profile.baseline_avg_daily_calories || (weeklyBudget / 7)

    console.log('💰 Budget:', weeklyBudget, '(', baselineAvg, 'cal/day)')

    const { data: newPeriod, error: insertError } = await adminClient
      .from('weekly_periods')
      .insert({
        user_id,
        week_start_date: weekStartDate,
        week_end_date: weekEndDate,
        period_type: 'active',
        status: 'active',
        weekly_budget: weeklyBudget,
        baseline_average_daily: baselineAvg || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Failed to create period:', insertError)
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Created period:', newPeriod.id)

    return new Response(
      JSON.stringify({
        success: true,
        reason: 'created',
        period_id: newPeriod.id,
        week_start_date: weekStartDate,
        week_end_date: weekEndDate,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in createUserPeriod:', error)
    return new Response(
      //@ts-ignore
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})