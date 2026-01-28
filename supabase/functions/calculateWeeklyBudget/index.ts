
//@ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to get Monday of CURRENT week in YYYY-MM-DD format
function getCurrentMonday(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysFromMonday);
  
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const day = String(monday.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// Helper to get NEXT Monday in YYYY-MM-DD format
function getNextMonday(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysToNextMonday);
  
  const year = nextMonday.getFullYear();
  const month = String(nextMonday.getMonth() + 1).padStart(2, '0');
  const day = String(nextMonday.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// Helper to get Sunday (6 days after Monday)
function getSunday(mondayStr: string): string {
  const [year, month, day] = mondayStr.split('-').map(Number);
  const monday = new Date(year, month - 1, day);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const sYear = sunday.getFullYear();
  const sMonth = String(sunday.getMonth() + 1).padStart(2, '0');
  const sDay = String(sunday.getDate()).padStart(2, '0');
  
  return `${sYear}-${sMonth}-${sDay}`;
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

    // Check if manual budget is provided
    const requestBody = await req.json().catch(() => ({}))
    const manualWeeklyBudget = requestBody.manual_weekly_budget

    let weeklyBudget: number
    let averageDailyCalories: number
    let isManual = false
    let weekStartDate: string
    let weekEndDate: string

    // MANUAL BUDGET PATH
    if (manualWeeklyBudget) {
      console.log('📝 Using manual weekly budget:', manualWeeklyBudget)
      
      if (typeof manualWeeklyBudget !== 'number' || manualWeeklyBudget <= 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid manual_weekly_budget. Must be a positive number.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      weeklyBudget = manualWeeklyBudget
      averageDailyCalories = Math.round(weeklyBudget / 7)
      isManual = true

      // Manual users start in CURRENT week
      weekStartDate = getCurrentMonday()
      weekEndDate = getSunday(weekStartDate)
      console.log('📅 Manual user - creating period for CURRENT week:', weekStartDate, 'to', weekEndDate)

    // BASELINE CALCULATION PATH
    } else {
      console.log('📊 Calculating from baseline...')

      // Get user profile to validate baseline
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('baseline_start_date, baseline_complete')
        .eq('id', userId)
        .single()

      if (profileError || !profile) {
        throw new Error('Profile not found')
      }

      // Validate user has baseline_start_date
      if (!profile.baseline_start_date) {
        return new Response(
          JSON.stringify({ error: 'No baseline_start_date found. Use manual_weekly_budget to skip baseline.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate baseline isn't already complete
      if (profile.baseline_complete) {
        return new Response(
          JSON.stringify({ error: 'Baseline already completed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const baselineStartDate = profile.baseline_start_date

      // Calculate the 7th day (end of baseline)
      const startDate = new Date(baselineStartDate + 'T00:00:00')
      const endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
      const year = endDate.getFullYear()
      const month = String(endDate.getMonth() + 1).padStart(2, '0')
      const day = String(endDate.getDate()).padStart(2, '0')
      const baselineEndDate = `${year}-${month}-${day}`

      console.log('📅 Baseline period:', baselineStartDate, 'to', baselineEndDate)

      // Get baseline summaries (7 consecutive days)
      const { data: dailySummaries, error: summariesError } = await supabaseClient
        .from('daily_summaries')
        .select('summary_date, calories_consumed')
        .eq('user_id', userId)
        .gte('summary_date', baselineStartDate)
        .lte('summary_date', baselineEndDate)
        .order('summary_date', { ascending: true })

      if (summariesError) {
        throw new Error(summariesError.message)
      }

      console.log('📊 Summaries found:', dailySummaries?.length)

      if (!dailySummaries || dailySummaries.length < 7) {
        return new Response(
          JSON.stringify({
            error: 'Need 7 days of baseline data',
            found: dailySummaries?.length || 0,
            required: 7,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Calculate baseline metrics
      //@ts-ignore
      const totalCalories = dailySummaries.reduce((sum, day) => sum + day.calories_consumed, 0)
      averageDailyCalories = Math.round(totalCalories / 7)
      weeklyBudget = averageDailyCalories * 7

      console.log('📊 Baseline avg:', averageDailyCalories, 'Weekly budget:', weeklyBudget)

      // Baseline users start NEXT week (fresh start after baseline)
      weekStartDate = getNextMonday()
      weekEndDate = getSunday(weekStartDate)
      console.log('📅 Baseline user - creating period for NEXT week:', weekStartDate, 'to', weekEndDate)
    }

    // Check if period already exists
    const { data: existingPeriod } = await supabaseClient
      .from('weekly_periods')
      .select('id')
      .eq('user_id', userId)
      .eq('week_start_date', weekStartDate)
      .single()

    if (existingPeriod) {
      console.log('⏭️  Period already exists')
      return new Response(
        JSON.stringify({
          success: true,
          data: { already_exists: true },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create weekly period
    const { data: weeklyPeriod, error: periodError } = await supabaseClient
      .from('weekly_periods')
      .insert({
        user_id: userId,
        week_start_date: weekStartDate,
        week_end_date: weekEndDate,
        baseline_average_daily: averageDailyCalories,
        weekly_budget: weeklyBudget,
        period_type: 'active',
        status: 'active',
      })
      .select()
      .single()

    if (periodError) throw new Error(periodError.message)

    // Update profile
    await supabaseClient
      .from('profiles')
      .update({
        baseline_complete: true,
        baseline_avg_daily_calories: averageDailyCalories,
        weekly_calorie_bank: weeklyBudget,
      })
      .eq('id', userId)

    console.log('✅ Success!', isManual ? '(Manual)' : '(Baseline)')

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          baseline_average_daily: averageDailyCalories,
          weekly_budget: weeklyBudget,
          week_start_date: weekStartDate,
          week_end_date: weekEndDate,
          weekly_period_id: weeklyPeriod.id,
          is_manual: isManual,
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