

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

async function createPeriodForUser(supabase: any, userId: string) {
  try {
    console.log('📅 Creating weekly period for user:', userId)

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const thisMonday = getMonday(today)
    const thisSunday = getSunday(thisMonday)
    const weekStartDate = thisMonday.toISOString().split('T')[0]
    const weekEndDate = thisSunday.toISOString().split('T')[0]

    // Check if an active period already contains today's date
    const { data: existingPeriod } = await supabase
      .from('weekly_periods')
      .select('*')
      .eq('user_id', userId)
      .eq('period_type', 'active')
      .eq('status', 'active')
      .lte('week_start_date', todayStr)
      .gte('week_end_date', todayStr)
      .single()

    if (existingPeriod) {
      console.log('⏭️  Active period already exists for this week:', userId)
      return { success: true, reason: 'already_exists' }
    }

    // Get the user's most recent period to copy settings
    const { data: lastPeriod } = await supabase
      .from('weekly_periods')
      .select('*')
      .eq('user_id', userId)
      .eq('period_type', 'active')
      .order('week_start_date', { ascending: false })
      .limit(1)
      .single()

    if (!lastPeriod) {
      console.log('⏭️  No previous period found for user:', userId)
      return { success: false, reason: 'no_previous_period' }
    }

    // Mark last week's period as completed if it's still active and ended before today
    if (lastPeriod.status === 'active' && lastPeriod.week_end_date < todayStr) {
      await supabase
        .from('weekly_periods')
        .update({ status: 'completed' })
        .eq('id', lastPeriod.id)
      
      console.log('✅ Marked previous period as completed:', lastPeriod.id)
    }

    // Create new period for this week
    const { data: newPeriod, error: insertError } = await supabase
      .from('weekly_periods')
      .insert({
        user_id: userId,
        week_start_date: weekStartDate,
        week_end_date: weekEndDate,
        period_type: 'active',
        status: 'active',
        weekly_budget: lastPeriod.weekly_budget,
        baseline_average_daily: lastPeriod.baseline_average_daily,
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Failed to create period:', insertError)
      throw insertError
    }

    console.log('✅ Created new period for user:', userId, 'Week:', weekStartDate, 'to', weekEndDate)
    return { success: true, period_id: newPeriod.id }

  } catch (error) {
    console.error('❌ Error creating period for user:', userId, error)
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

    // Verify authorization
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

    // Get all users who have completed baseline
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id')
      .eq('baseline_complete', true)

    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
      throw usersError
    }

    console.log(`📊 Found ${users?.length || 0} users with completed baseline`)

    // Create periods for each user
    const results = []
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
        created: created,
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