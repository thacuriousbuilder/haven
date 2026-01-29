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
    console.log('🚀 calculateWeeklyBudget called')
    
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader) {
      console.error('❌ No auth header')
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔑 Creating Supabase client...')
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

    console.log('👤 Getting user...')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('❌ Auth failed:', userError)
      return new Response(
        JSON.stringify({ error: 'Authentication failed', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ User:', user.id)

    const userId = user.id

    console.log('📦 Parsing request body...')
    let requestBody = {}
    try {
      const text = await req.text()
      console.log('📝 Request body text:', text)
      if (text) {
        requestBody = JSON.parse(text)
      }
    } catch (e) {
      console.log('⚠️ No request body or invalid JSON, using empty object')
    }

    console.log('📊 Request body parsed:', JSON.stringify(requestBody))
    //@ts-ignore
    const manualWeeklyBudget = requestBody.manual_weekly_budget

    let weeklyBudget: number
    let averageDailyCalories: number
    let daysUsed = 7
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

      // Get user profile
      console.log('👤 Fetching profile...')
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('baseline_start_date, baseline_complete')
        .eq('id', userId)
        .single()
    
      if (profileError || !profile) {
        console.error('❌ Profile error:', profileError)
        return new Response(
          JSON.stringify({ error: 'Profile not found', details: profileError?.message }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('✅ Profile found:', JSON.stringify(profile))
    
      if (profile.baseline_complete) {
        console.error('❌ Baseline already complete')
        return new Response(
          JSON.stringify({ error: 'Baseline already complete' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    
      if (!profile.baseline_start_date) {
        console.error('❌ No baseline start date')
        return new Response(
          JSON.stringify({ error: 'No baseline start date found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    
      const baselineStartDate = profile.baseline_start_date
      console.log('📅 Baseline start date:', baselineStartDate)
    
      // Calculate end date (7 days from start)
      const startDate = new Date(baselineStartDate + 'T00:00:00')
      const endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
      const eYear = endDate.getFullYear()
      const eMonth = String(endDate.getMonth() + 1).padStart(2, '0')
      const eDay = String(endDate.getDate()).padStart(2, '0')
      const baselineEndDate = `${eYear}-${eMonth}-${eDay}`
    
      console.log('📅 Baseline period:', baselineStartDate, 'to', baselineEndDate)
    
      // Get baseline data
      console.log('📊 Querying daily_summaries...')
      const { data: dailySummaries, error: summariesError } = await supabaseClient
        .from('daily_summaries')
        .select('summary_date, calories_consumed')
        .eq('user_id', userId)
        .gte('summary_date', baselineStartDate)
        .lte('summary_date', baselineEndDate)
        .order('summary_date', { ascending: true })
    
      if (summariesError) {
        console.error('❌ Query error:', summariesError)
        return new Response(
          JSON.stringify({ error: 'Database error', details: summariesError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    
      console.log('📊 Summaries found:', dailySummaries?.length)
      console.log('📋 Summaries data:', JSON.stringify(dailySummaries))
    
      if (!dailySummaries || dailySummaries.length < 3) {
        console.error('❌ Not enough data:', dailySummaries?.length || 0)
        return new Response(
          JSON.stringify({
            error: 'Need at least 3 days of data',
            found: dailySummaries?.length || 0,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    
      // Calculate averages
      console.log('🧮 Calculating averages...')
      const totalCalories = dailySummaries.reduce((sum: number, day: any) => sum + (day.calories_consumed || 0), 0)
      const daysLogged = dailySummaries.length
      averageDailyCalories = Math.round(totalCalories / daysLogged)
      weeklyBudget = averageDailyCalories * 7
      daysUsed = daysLogged
    
      console.log(`📊 Calculated from ${daysLogged} days:`)
      console.log(`   Total: ${totalCalories} cal`)
      console.log(`   Average: ${averageDailyCalories} cal/day`)
      console.log(`   Weekly budget: ${weeklyBudget} cal`)

      // Smart week assignment based on days remaining
      const today = new Date()
      const dayOfWeek = today.getDay() // 0 = Sunday, 6 = Saturday
      const daysLeftInWeek = dayOfWeek === 0 ? 0 : 7 - dayOfWeek

      if (daysLeftInWeek < 3) {
        // Less than 3 days left → fresh start next Monday
        weekStartDate = getNextMonday()
        weekEndDate = getSunday(weekStartDate)
        console.log(`📅 Only ${daysLeftInWeek} day(s) left this week - giving full week starting ${weekStartDate}`)
      } else {
        // 3+ days left → start tracking remainder of this week
        weekStartDate = getCurrentMonday()
        weekEndDate = getSunday(weekStartDate)
        console.log(`📅 ${daysLeftInWeek} days remaining - starting this week from ${weekStartDate}`)
      }
    }

    // Create weekly period (common for both paths)
    console.log('📝 Creating weekly period...')
    const { data: weeklyPeriod, error: periodError } = await supabaseClient
      .from('weekly_periods')
      .upsert({
        user_id: userId,
        week_start_date: weekStartDate,
        week_end_date: weekEndDate,
        baseline_average_daily: averageDailyCalories,
        weekly_budget: weeklyBudget,
        period_type: 'active',
        status: 'active',
      }, {
        onConflict: 'user_id,week_start_date'
      })
      .select()
      .single()

    if (periodError) {
      console.error('❌ Period creation error:', periodError)
      return new Response(
        JSON.stringify({ error: 'Failed to create period', details: periodError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Weekly period created:', weeklyPeriod.id)

    // Update profile
    console.log('📝 Updating profile...')
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        baseline_complete: true,
        baseline_avg_daily_calories: averageDailyCalories,
        weekly_calorie_bank: weeklyBudget,
      })
      .eq('id', userId)

    if (updateError) {
      console.error('❌ Profile update error:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update profile', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Profile updated - baseline complete!')

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          baseline_average_daily: averageDailyCalories,
          weekly_budget: weeklyBudget,
          week_start_date: weekStartDate,
          week_end_date: weekEndDate,
          weekly_period_id: weeklyPeriod.id,
          days_used: daysUsed,
          is_manual: isManual,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Unhandled error:', error)
    //@ts-ignore
    console.error('💥 Error stack:', error.stack)
    return new Response(
      //@ts-ignore
      JSON.stringify({ error: 'Internal server error', details: error.message, stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})