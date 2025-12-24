// @ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log('Function "calculateWeeklyBudget" up and running!')
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

    // Get baseline week daily summaries (7 days)
    const { data: dailySummaries, error: summariesError } = await supabaseClient
      .from('daily_summaries')
      .select('summary_date, calories_consumed')
      .eq('user_id', userId)
      .order('summary_date', { ascending: true })
      .limit(7)

    if (summariesError) {
      throw new Error('Failed to fetch daily summaries: ' + summariesError.message)
    }

    if (!dailySummaries || dailySummaries.length < 7) {
      return new Response(
        JSON.stringify({
          error: 'Baseline week incomplete. Need 7 days of data.',
          found: dailySummaries?.length || 0,
          message: 'Please complete 7 days of food logging before calculating weekly budget.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Calculate average daily calories
    const totalCalories = dailySummaries.reduce(
      // @ts-ignore
      (sum, day) => sum + day.calories_consumed,
      0
    )
    const averageDailyCalories = Math.round(totalCalories / 7)
    const weeklyBudget = averageDailyCalories * 7

    // Get current week's Monday-Sunday
    const today = new Date()
    const dayOfWeek = today.getDay()
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(today)
    monday.setDate(today.getDate() + daysToMonday)
    monday.setHours(0, 0, 0, 0)

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    const weekStartDate = monday.toISOString().split('T')[0]
    const weekEndDate = sunday.toISOString().split('T')[0]

    // Insert or update weekly_period
    const { data: weeklyPeriod, error: periodError } = await supabaseClient
      .from('weekly_periods')
      .upsert(
        {
          user_id: userId,
          week_start_date: weekStartDate,
          week_end_date: weekEndDate,
          baseline_average_daily: averageDailyCalories,
          weekly_budget: weeklyBudget,
        },
        {
          onConflict: 'user_id,week_start_date',
        }
      )
      .select()
      .single()

    if (periodError) {
      throw new Error('Failed to create weekly period: ' + periodError.message)
    }

    // Update user profile
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({
        baseline_complete: true,
        baseline_avg_daily_calories: averageDailyCalories,
        weekly_calorie_bank: weeklyBudget,
      })
      .eq('id', userId)

    if (profileError) {
      throw new Error('Failed to update profile: ' + profileError.message)
    }

    // Success
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          baseline_average_daily: averageDailyCalories,
          weekly_budget: weeklyBudget,
          week_start_date: weekStartDate,
          week_end_date: weekEndDate,
          weekly_period_id: weeklyPeriod.id,
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