
//@ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2'

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
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      //@ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      //@ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('Auth failed:', userError)
      return new Response(
        JSON.stringify({ error: 'Authentication failed', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ User:', user.id)

    const userId = user.id

    // Get calculation date (YYYY-MM-DD format)
    const requestBody = await req.json().catch(() => ({}))
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const calculatedDate = requestBody.calculation_date || `${year}-${month}-${day}`
    
    console.log('📅 Calculation date:', calculatedDate)

    // Find the active weekly period that contains today's date
    const { data: weeklyPeriod, error: periodError } = await supabaseClient
      .from('weekly_periods')
      .select('*')
      .eq('user_id', userId)
      .eq('period_type', 'active')
      .eq('status', 'active')
      .lte('week_start_date', calculatedDate)
      .gte('week_end_date', calculatedDate)
      .single()

    if (periodError || !weeklyPeriod) {
      console.error('No active weekly period found for date:', calculatedDate)
      return new Response(
        JSON.stringify({ 
          error: 'No active weekly period found',
          hint: 'Create a weekly period that includes today\'s date'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const weekStartDate = weeklyPeriod.week_start_date
    const weekEndDate = weeklyPeriod.week_end_date

    console.log('📅 Using period:', weekStartDate, 'to', weekEndDate)

    // Get all daily summaries for this week up to today
    const { data: weekSummaries } = await supabaseClient
      .from('daily_summaries')
      .select('*')
      .eq('user_id', userId)
      .gte('summary_date', weekStartDate)
      .lte('summary_date', calculatedDate)
      .order('summary_date', { ascending: true })

    // Calculate total consumed this week
    //@ts-ignore
    const totalConsumed = weekSummaries?.reduce((sum, day) => sum + (day.calories_consumed || 0), 0) || 0

    // Get all cheat days for this week
    const { data: cheatDays } = await supabaseClient
      .from('planned_cheat_days')
      .select('*')
      .eq('user_id', userId)
      .gte('cheat_date', weekStartDate)
      .lte('cheat_date', weekEndDate)

    // Calculate calories reserved for upcoming cheat days
    //@ts-ignore
    const upcomingCheatDays = cheatDays?.filter(cd => cd.cheat_date > calculatedDate) || []
    //@ts-ignore
    const caloriesReserved = upcomingCheatDays.reduce((sum, cd) => sum + (cd.planned_calories || 0), 0)

    // Calculate total remaining
    const totalRemaining = weeklyPeriod.weekly_budget - totalConsumed

    // Upsert metrics (remove scores)
    await supabaseClient
      .from('weekly_metrics')
      .upsert({
        user_id: userId,
        weekly_period_id: weeklyPeriod.id,
        calculated_date: calculatedDate,
        total_consumed: totalConsumed,
        total_remaining: totalRemaining,
        calories_reserved: caloriesReserved,
      }, { onConflict: 'user_id,weekly_period_id,calculated_date' })

    console.log('✅ Metrics calculated!')

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          total_consumed: totalConsumed,
          total_remaining: totalRemaining,
          calories_reserved: caloriesReserved,
          weekly_budget: weeklyPeriod.weekly_budget,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      //@ts-ignore
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})