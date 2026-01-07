//@ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

//@ts-ignore
Deno.serve(async (req:Request) => {
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

    // Get calculation date from request body, or use server UTC as fallback
    const requestBody = await req.json().catch(() => ({}))
    const calculatedDate = requestBody.calculation_date || new Date().toISOString().split('T')[0]
    
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

    console.log('Period error:', periodError)
    console.log('Period found:', !!weeklyPeriod)

    if (periodError || !weeklyPeriod) {
      console.error('No active weekly period found for today')
      return new Response(
        JSON.stringify({ 
          error: 'No active weekly period found',
          hint: 'Create a weekly period that includes today\'s date'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use the period's actual dates
    const weekStartDate = weeklyPeriod.week_start_date
    const weekEndDate = weeklyPeriod.week_end_date

    console.log('📅 Using period:', weekStartDate, 'to', weekEndDate)

    const { data: weekSummaries } = await supabaseClient
      .from('daily_summaries')
      .select('*')
      .eq('user_id', userId)
      .gte('summary_date', weekStartDate)
      .lte('summary_date', calculatedDate)
      .order('summary_date', { ascending: true })

    //@ts-ignore
    const totalConsumed = weekSummaries?.reduce((sum: any, day: any) => sum + (day.calories_consumed || 0), 0) || 0

    const { data: cheatDays } = await supabaseClient
      .from('planned_cheat_days')
      .select('*')
      .eq('user_id', userId)
      .gte('cheat_date', weekStartDate)
      .lte('cheat_date', weekEndDate)

    //@ts-ignore
    const upcomingCheatDays = cheatDays?.filter((cd: any) => cd.cheat_date > calculatedDate) || []
    //@ts-ignore
    const caloriesReserved = upcomingCheatDays.reduce((sum: any, cd: any) => sum + (cd.planned_calories || 0), 0)
    const totalRemaining = weeklyPeriod.weekly_budget - totalConsumed

    // Calculate days left using the period's end date
    const todayDate = new Date(calculatedDate + 'T00:00:00')
    const sunday = new Date(weekEndDate + 'T23:59:59')
    const daysLeftInWeek = Math.max(1, Math.ceil((sunday.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    const dailyBudgetRemaining = totalRemaining / daysLeftInWeek
    const baselineAvg = weeklyPeriod.baseline_average_daily

    let balanceScore = dailyBudgetRemaining >= baselineAvg ? 100 : dailyBudgetRemaining >= baselineAvg * 0.7 ? 65 : 30

    let consistencyScore = 50
    if (weekSummaries && weekSummaries.length >= 3) {
      //@ts-ignore
      const calories = weekSummaries.map((s: any) => s.calories_consumed || 0)
      //@ts-ignore
      const mean = calories.reduce((a, b) => a + b, 0) / calories.length
      //@ts-ignore
      const stdDev = Math.sqrt(calories.map(v => Math.pow(v - mean, 2)).reduce((a, b) => a + b, 0) / calories.length)
      const cv = (stdDev / mean) * 100
      consistencyScore = cv < 15 ? 85 : cv < 30 ? 55 : 25
    }

    let driftScore = 50
    //@ts-ignore
    const pastCheatDays = cheatDays?.filter((cd: any) => cd.cheat_date <= calculatedDate) || []
    if (pastCheatDays.length > 0) {
      let totalDrift = 0
      for (const cheatDay of pastCheatDays) {
        //@ts-ignore
        const summary = weekSummaries?.find(s => s.summary_date === cheatDay.cheat_date)
        if (summary) totalDrift += Math.max(0, summary.calories_consumed - cheatDay.planned_calories)
      }
      const avgDrift = totalDrift / pastCheatDays.length
      driftScore = avgDrift < 200 ? 80 : avgDrift < 500 ? 50 : 20
    }

    await supabaseClient
      .from('weekly_metrics')
      .upsert({
        user_id: userId,
        weekly_period_id: weeklyPeriod.id,
        calculated_date: calculatedDate,
        balance_score: balanceScore,
        consistency_score: consistencyScore,
        drift_score: driftScore,
        total_consumed: totalConsumed,
        total_remaining: totalRemaining,
        calories_reserved: caloriesReserved,
      }, { onConflict: 'user_id,weekly_period_id,calculated_date' })

    console.log('✅ Metrics calculated!')

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          balance_score: balanceScore,
          consistency_score: consistencyScore,
          drift_score: driftScore,
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