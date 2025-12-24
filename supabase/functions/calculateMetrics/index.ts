// @ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log('Function "calculateMetrics" up and running!')

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

function getSunday(monday: Date): Date {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return sunday
}
// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    const token = authHeader.replace('Bearer ', '')

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      throw new Error('Authentication failed: ' + (userError?.message || 'User not found'))
    }

    const userId = user.id
    const today = new Date()
    const monday = getMonday(today)
    const sunday = getSunday(monday)

    const weekStartDate = monday.toISOString().split('T')[0]
    const weekEndDate = sunday.toISOString().split('T')[0]
    const calculatedDate = today.toISOString().split('T')[0]

    const { data: weeklyPeriod, error: periodError } = await supabaseClient
      .from('weekly_periods')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start_date', weekStartDate)
      .single()

    if (periodError || !weeklyPeriod) {
      return new Response(
        JSON.stringify({
          error: 'No weekly period found for current week',
          details: 'Weekly period does not exist. Please complete baseline week first.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    const { data: weekSummaries, error: summariesError } = await supabaseClient
      .from('daily_summaries')
      .select('*')
      .eq('user_id', userId)
      .gte('summary_date', weekStartDate)
      .lte('summary_date', calculatedDate)
      .order('summary_date', { ascending: true })

    if (summariesError) {
      throw new Error('Failed to fetch daily summaries: ' + summariesError.message)
    }

    const totalConsumed = weekSummaries?.reduce(
      // @ts-ignore
      (sum, day) => sum + (day.calories_consumed || 0),
      0
    ) || 0

    const { data: cheatDays, error: cheatError } = await supabaseClient
      .from('planned_cheat_days')
      .select('*')
      .eq('user_id', userId)
      .gte('cheat_date', weekStartDate)
      .lte('cheat_date', weekEndDate)

    if (cheatError) {
      throw new Error('Failed to fetch cheat days: ' + cheatError.message)
    }

    const upcomingCheatDays = cheatDays?.filter(
      // @ts-ignore
      (cd) => new Date(cd.cheat_date) > today
    ) || []

    const caloriesReserved = upcomingCheatDays.reduce(
      // @ts-ignore
      (sum, cd) => sum + (cd.planned_calories || 0),
      0
    )

    const totalRemaining = weeklyPeriod.weekly_budget - totalConsumed

    const daysLeftInWeek = Math.max(
      1,
      Math.ceil((sunday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1
    )

    const dailyBudgetRemaining = totalRemaining / daysLeftInWeek
    const baselineAvg = weeklyPeriod.baseline_average_daily

    let balanceScore = 0
    if (dailyBudgetRemaining >= baselineAvg) {
      balanceScore = 100
    } else if (dailyBudgetRemaining >= baselineAvg * 0.7) {
      balanceScore = 65
    } else {
      balanceScore = 30
    }

    let consistencyScore = 50

    if (weekSummaries && weekSummaries.length >= 3) {
      // @ts-ignore
      const calories = weekSummaries.map(s => s.calories_consumed || 0)
      // @ts-ignore
      const mean = calories.reduce((a, b) => a + b, 0) / calories.length
      // @ts-ignore
      const squareDiffs = calories.map(value => Math.pow(value - mean, 2))
      // @ts-ignore
      const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length
      const stdDev = Math.sqrt(avgSquareDiff)

      const coefficientOfVariation = (stdDev / mean) * 100

      if (coefficientOfVariation < 15) {
        consistencyScore = 85
      } else if (coefficientOfVariation < 30) {
        consistencyScore = 55
      } else {
        consistencyScore = 25
      }
    }

    let driftScore = 50

    const pastCheatDays = cheatDays?.filter(
      // @ts-ignore
      (cd) => new Date(cd.cheat_date) <= today
    ) || []

    if (pastCheatDays.length > 0) {
      let totalDrift = 0

      for (const cheatDay of pastCheatDays) {
        const summary = weekSummaries?.find(
          // @ts-ignore
          s => s.summary_date === cheatDay.cheat_date
        )

        if (summary) {
          const overage = summary.calories_consumed - cheatDay.planned_calories
          totalDrift += Math.max(0, overage)
        }
      }

      const avgDrift = totalDrift / pastCheatDays.length

      if (avgDrift < 200) {
        driftScore = 80
      } else if (avgDrift < 500) {
        driftScore = 50
      } else {
        driftScore = 20
      }
    }

    const { error: metricsError } = await supabaseClient
      .from('weekly_metrics')
      .upsert(
        {
          user_id: userId,
          weekly_period_id: weeklyPeriod.id,
          calculated_date: calculatedDate,
          balance_score: balanceScore,
          consistency_score: consistencyScore,
          drift_score: driftScore,
          total_consumed: totalConsumed,
          total_remaining: totalRemaining,
          calories_reserved: caloriesReserved,
        },
        {
          onConflict: 'user_id,weekly_period_id,calculated_date',
        }
      )

    if (metricsError) {
      throw new Error('Failed to save metrics: ' + metricsError.message)
    }

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
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      // @ts-ignore
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})