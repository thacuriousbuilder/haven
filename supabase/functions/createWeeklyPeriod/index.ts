

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

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function createPeriodForUser(supabase: any, userId: string) {
  try {
    console.log('📅 Creating weekly period for user:', userId)

    const today = new Date()
    const todayStr = formatDate(today)
    const thisMonday = getMonday(today)
    const thisSunday = getSunday(thisMonday)
    const weekStartDate = formatDate(thisMonday)
    const weekEndDate = formatDate(thisSunday)

    const { data: existingPeriods } = await supabase
      .from('weekly_periods')
      .select('*')
      .eq('user_id', userId)
      .or(`and(week_start_date.lte.${weekEndDate},week_end_date.gte.${weekStartDate})`)

    if (existingPeriods && existingPeriods.length > 0) {
      console.log('⏭️ Period already exists:', userId)
      return { success: true, reason: 'already_exists' }
    }

    const { data: lastPeriod } = await supabase
      .from('weekly_periods')
      .select('*')
      .eq('user_id', userId)
      .eq('period_type', 'active')
      .order('week_start_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    let weeklyBudget
    let baselineAvg

    if (!lastPeriod) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('baseline_avg_daily_calories')
        .eq('id', userId)
        .single()

      if (profileError || !profile?.baseline_avg_daily_calories) {
        console.error('❌ No baseline data for user:', userId)
        return { success: false, reason: 'no_baseline_data' }
      }

      baselineAvg = profile.baseline_avg_daily_calories
      weeklyBudget = baselineAvg * 7
    } else {
      weeklyBudget = lastPeriod.weekly_budget
      baselineAvg = lastPeriod.baseline_average_daily

      if (lastPeriod.status === 'active' && lastPeriod.week_end_date < todayStr) {
        await supabase
          .from('weekly_periods')
          .update({ status: 'completed' })
          .eq('id', lastPeriod.id)
        console.log('✅ Marked previous period as completed:', lastPeriod.id)
      }
    }

    const { data: newPeriod, error: insertError } = await supabase
      .from('weekly_periods')
      .insert({
        user_id: userId,
        week_start_date: weekStartDate,
        week_end_date: weekEndDate,
        period_type: 'active',
        status: 'active',
        weekly_budget: weeklyBudget,
        baseline_average_daily: baselineAvg,
      })
      .select()
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return { success: true, reason: 'already_exists' }
      }
      console.error('❌ Failed to create period:', insertError)
      throw insertError
    }

    console.log('✅ Created period for user:', userId)
    return { success: true, period_id: newPeriod.id }

  } catch (error) {
    console.error('❌ Error for user:', userId, error)
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
    console.log('🚀 Weekly period creation job started at:', new Date().toISOString())

    // Verify cron secret
    const authHeader = req.headers.get('Authorization')
    //@ts-ignore
    const cronSecret = Deno.env.get('CRON_SECRET')

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ Unauthorized cron request')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      //@ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      //@ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id')
      .eq('baseline_complete', true)

    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
      throw usersError
    }

    console.log(`📊 Found ${users?.length || 0} users with completed baseline`)

    const results: Array<{ user_id: string; success: boolean; period_id?: any; reason?: string; error?: any }> = []
    for (const user of users || []) {
      const result = await createPeriodForUser(supabase, user.id)
      results.push({ user_id: user.id, ...result })
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length
    const alreadyExists = results.filter(r => r.reason === 'already_exists').length
    const created = successCount - alreadyExists

    console.log(`✅ Completed: ${created} created, ${alreadyExists} already existed, ${failCount} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        created,
        already_existed: alreadyExists,
        failed: failCount,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Weekly period creation job error:', error)
    return new Response(
      //@ts-ignore
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})