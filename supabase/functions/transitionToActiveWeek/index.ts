

//@ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2'

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

//@ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 transitionToActiveWeek called!')

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create client WITH the authorization header from the start
    const supabaseClient = createClient(
      //@ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      //@ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    // Now verify the user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ User:', user.id)

    // DEBUG: First, let's see ALL periods for this user
    const { data: allPeriods } = await supabaseClient
      .from('weekly_periods')
      .select('*')
      .eq('user_id', user.id)

    console.log('📊 All periods for this user:', JSON.stringify(allPeriods, null, 2))

    // Get the completed baseline period
    const { data: baselinePeriod, error: baselineError } = await supabaseClient
      .from('weekly_periods')
      .select('*')
      .eq('user_id', user.id)
      .eq('period_type', 'baseline')
      .eq('status', 'active')
      .single()

    console.log('🔍 Baseline query error:', baselineError)
    console.log('🔍 Baseline period found:', baselinePeriod)

    if (baselineError || !baselinePeriod) {
      console.error('❌ No active baseline period found')
      console.error('❌ Error details:', JSON.stringify(baselineError, null, 2))
      return new Response(
        JSON.stringify({ 
          error: 'No baseline period found to transition',
          debug: {
            all_periods: allPeriods,
            baseline_error: baselineError
          }
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('📊 Baseline period found:', baselinePeriod.id)

    // Calculate baseline average from daily summaries
    const baselineStart = baselinePeriod.week_start_date
    const baselineEnd = baselinePeriod.week_end_date

    console.log('📅 Baseline date range:', baselineStart, 'to', baselineEnd)

    const { data: baselineSummaries } = await supabaseClient
      .from('daily_summaries')
      .select('calories_consumed')
      .eq('user_id', user.id)
      .gte('summary_date', baselineStart)
      .lte('summary_date', baselineEnd)

    console.log('📊 Baseline summaries:', JSON.stringify(baselineSummaries, null, 2))

    //@ts-ignore
    const totalCalories = baselineSummaries?.reduce((sum: any, day: any) => sum + (day.calories_consumed || 0), 0) || 0
    const daysLogged = baselineSummaries?.length || 7
    const baselineAverage = Math.round(totalCalories / daysLogged)

    console.log('📈 Baseline average:', baselineAverage, 'cal/day from', daysLogged, 'days')

    // Calculate weekly budget (same as baseline average * 7 for now)
    const weeklyBudget = baselineAverage * 7

    // Mark baseline period as completed
    await supabaseClient
      .from('weekly_periods')
      .update({ 
        status: 'completed',
        baseline_average_daily: baselineAverage,
        weekly_budget: weeklyBudget
      })
      .eq('id', baselinePeriod.id)

    console.log('✅ Baseline marked as completed')

    // Update profile to mark baseline complete
    await supabaseClient
      .from('profiles')
      .update({ baseline_complete: true })
      .eq('id', user.id)

    console.log('✅ Profile updated')

    // Create first active weekly period
    const today = new Date()
    const monday = getMonday(today)
    const sunday = getSunday(monday)
    const weekStartDate = monday.toISOString().split('T')[0]
    const weekEndDate = sunday.toISOString().split('T')[0]

    console.log('📅 Creating new active period:', weekStartDate, 'to', weekEndDate)

    const { data: newPeriod, error: insertError } = await supabaseClient
      .from('weekly_periods')
      .insert({
        user_id: user.id,
        week_start_date: weekStartDate,
        week_end_date: weekEndDate,
        period_type: 'active',
        status: 'active',
        weekly_budget: weeklyBudget,
        baseline_average_daily: baselineAverage,
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Failed to create active period:', insertError)
      throw insertError
    }

    console.log('✅ New active period created:', newPeriod.id)

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          baseline_average_daily: baselineAverage,
          weekly_budget: weeklyBudget,
          new_period: newPeriod,
          message: 'Successfully transitioned to active weekly tracking!'
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      //@ts-ignore
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})