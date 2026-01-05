

//@ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function calculateMetricsForUser(supabase: any, userId: string) {
  try {
    console.log('📊 Calculating metrics for user:', userId)

    const today = new Date()
    const calculatedDate = today.toISOString().split('T')[0]

    // Find the active weekly period that contains today's date
    const { data: weeklyPeriod, error: periodError } = await supabase
      .from('weekly_periods')
      .select('*')
      .eq('user_id', userId)
      .eq('period_type', 'active')
      .eq('status', 'active')
      .lte('week_start_date', calculatedDate)
      .gte('week_end_date', calculatedDate)
      .single()

    if (periodError || !weeklyPeriod) {
      console.log('⏭️  No active period for user:', userId)
      return { success: false, reason: 'no_active_period' }
    }

    const weekStartDate = weeklyPeriod.week_start_date
    const weekEndDate = weeklyPeriod.week_end_date

    // Get daily summaries for the week
    const { data: weekSummaries } = await supabase
      .from('daily_summaries')
      .select('*')
      .eq('user_id', userId)
      .gte('summary_date', weekStartDate)
      .lte('summary_date', calculatedDate)
      .order('summary_date', { ascending: true })

    //@ts-ignore
    const totalConsumed = weekSummaries?.reduce((sum: any, day: any) => sum + (day.calories_consumed || 0), 0) || 0

    // Get cheat days
    const { data: cheatDays } = await supabase
      .from('planned_cheat_days')
      .select('*')
      .eq('user_id', userId)
      .gte('cheat_date', weekStartDate)
      .lte('cheat_date', weekEndDate)

    //@ts-ignore
    const upcomingCheatDays = cheatDays?.filter((cd: any) => new Date(cd.cheat_date) > today) || []
    //@ts-ignore
    const caloriesReserved = upcomingCheatDays.reduce((sum: any, cd: any) => sum + (cd.planned_calories || 0), 0)
    const totalRemaining = weeklyPeriod.weekly_budget - totalConsumed

    // Calculate Balance Score
    const sunday = new Date(weekEndDate)
    const daysLeftInWeek = Math.max(1, Math.ceil((sunday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    const dailyBudgetRemaining = totalRemaining / daysLeftInWeek
    const baselineAvg = weeklyPeriod.baseline_average_daily

    let balanceScore = dailyBudgetRemaining >= baselineAvg ? 100 : dailyBudgetRemaining >= baselineAvg * 0.7 ? 65 : 30

    // Calculate Consistency Score
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

    // Calculate Drift Score
    let driftScore = 50
    //@ts-ignore
    const pastCheatDays = cheatDays?.filter((cd: any) => new Date(cd.cheat_date) <= today) || []
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

    // Upsert metrics
    await supabase
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

    console.log('✅ Metrics calculated for user:', userId)
    return { success: true }

  } catch (error) {
    console.error('❌ Error calculating metrics for user:', userId, error)
    //@ts-ignore
    return { success: false, error: error.message }
  }
}

//@ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Daily metrics job started at:', new Date().toISOString())

    // Verify this is a cron job or authorized request
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing auth header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client
    const supabase = createClient(
      //@ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      //@ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all users with active weekly periods that include today
    const today = new Date()
    const calculatedDate = today.toISOString().split('T')[0]

    const { data: activePeriods, error: periodsError } = await supabase
      .from('weekly_periods')
      .select('user_id')
      .eq('period_type', 'active')
      .eq('status', 'active')
      .lte('week_start_date', calculatedDate)
      .gte('week_end_date', calculatedDate)

    if (periodsError) {
      console.error('❌ Error fetching active periods:', periodsError)
      throw periodsError
    }

    console.log(`📊 Found ${activePeriods?.length || 0} users with active periods`)

    // Calculate metrics for each user
    const results = []
    for (const period of activePeriods || []) {
      const result = await calculateMetricsForUser(supabase, period.user_id)
      results.push({ user_id: period.user_id, ...result })
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    console.log(`✅ Completed: ${successCount} successful, ${failCount} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        successful: successCount,
        failed: failCount,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Daily metrics job error:', error)
    return new Response(
      //@ts-ignore
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})