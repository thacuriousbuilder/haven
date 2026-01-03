
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

    console.log('✅ Auth header present')

    // Create client with Authorization header in global config
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

    console.log('🔵 Getting user (no token arg)')
    
    // Call getUser() with NO arguments - it reads from headers
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('❌ Auth failed:', userError?.message)
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          details: userError?.message 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ User:', user.id)

    const userId = user.id

    // Get baseline data
    const { data: dailySummaries, error: summariesError } = await supabaseClient
      .from('daily_summaries')
      .select('summary_date, calories_consumed')
      .eq('user_id', userId)
      .order('summary_date', { ascending: true })
      .limit(7)

    if (summariesError) {
      console.error('❌ Query error:', summariesError)
      throw new Error(summariesError.message)
    }

    console.log('📊 Summaries:', dailySummaries?.length)

    if (!dailySummaries || dailySummaries.length < 7) {
      return new Response(
        JSON.stringify({
          error: 'Need 7 days',
          found: dailySummaries?.length || 0,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    //@ts-ignore
    const totalCalories = dailySummaries.reduce((sum: any, day: any) => sum + day.calories_consumed, 0)
    const averageDailyCalories = Math.round(totalCalories / 7)
    const weeklyBudget = averageDailyCalories * 7

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

    const { data: weeklyPeriod, error: periodError } = await supabaseClient
      .from('weekly_periods')
      .upsert({
        user_id: userId,
        week_start_date: weekStartDate,
        week_end_date: weekEndDate,
        baseline_average_daily: averageDailyCalories,
        weekly_budget: weeklyBudget,
      }, { onConflict: 'user_id,week_start_date' })
      .select()
      .single()

    if (periodError) throw new Error(periodError.message)

    await supabaseClient
      .from('profiles')
      .update({
        baseline_complete: true,
        baseline_avg_daily_calories: averageDailyCalories,
        weekly_calorie_bank: weeklyBudget,
      })
      .eq('id', userId)

    console.log('✅ Success!')

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
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Error:', error)
    return new Response(
      //@ts-ignore
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})