
//@ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function calculateStreakForUser(supabase: any, userId: string) {
  try {
    console.log('🔥 Calculating streak for user:', userId)

    // Get all food logs for this user, sorted by date descending
    const { data: logs, error } = await supabase
      .from('food_logs')
      .select('log_date')
      .eq('user_id', userId)
      .order('log_date', { ascending: false })

    if (error) {
      console.error('❌ Error fetching logs for user:', userId, error)
      return { success: false, error: error.message }
    }

    // If no logs at all, streak is 0
    if (!logs || logs.length === 0) {
      await supabase
        .from('profiles')
        .update({ current_streak: 0 })
        .eq('id', userId)
      
      console.log('✅ User has no logs, streak set to 0')
      return { success: true, streak: 0 }
    }

    // Get unique dates (user might have multiple meals per day)
    const uniqueDates = [...new Set(logs.map((log: any) => log.log_date))].sort().reverse()

    // Get today's date in YYYY-MM-DD format
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    // Start counting streak from today backwards
    let streak = 0
    let currentDate = new Date(todayStr)

    // Check if user logged today
    if (uniqueDates[0] === todayStr) {
      streak = 1
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      // User didn't log today, check if they logged yesterday
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      if (uniqueDates[0] === yesterdayStr) {
        // They logged yesterday, streak is still alive
        streak = 1
        currentDate = new Date(yesterdayStr)
        currentDate.setDate(currentDate.getDate() - 1)
      } else {
        // They missed yesterday, streak is broken
        streak = 0
      }
    }

    // Count consecutive days backwards
    if (streak > 0) {
      for (let i = (uniqueDates[0] === todayStr ? 1 : 1); i < uniqueDates.length; i++) {
        const expectedDateStr = currentDate.toISOString().split('T')[0]
        
        if (uniqueDates[i] === expectedDateStr) {
          streak++
          currentDate.setDate(currentDate.getDate() - 1)
        } else {
          // Gap found, stop counting
          break
        }
      }
    }

    // Update profile with new streak
    await supabase
      .from('profiles')
      .update({ current_streak: streak })
      .eq('id', userId)

    console.log(`✅ Streak calculated for user ${userId}: ${streak} days`)
    return { success: true, streak }

  } catch (error) {
    console.error('❌ Error calculating streak for user:', userId, error)
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
    console.log('🚀 Streak calculation started at:', new Date().toISOString())

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

    // Check if this is a single-user request (real-time) or batch (cron)
    const body = await req.json().catch(() => ({}))
    const singleUserId = body.userId

    if (singleUserId) {
      // Real-time update for single user
      console.log(`🎯 Single user request for: ${singleUserId}`)
      const result = await calculateStreakForUser(supabase, singleUserId)
      
      return new Response(
        JSON.stringify({
          success: result.success,
          streak: result.streak,
          userId: singleUserId,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Batch processing for all users (cron job)
    console.log('📅 Batch processing for all users (cron)')
    
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id')

    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
      throw usersError
    }

    console.log(`🔥 Found ${users?.length || 0} users to process`)

    // Calculate streaks for each user
    const results = []
    for (const user of users || []) {
      const result = await calculateStreakForUser(supabase, user.id)
      results.push({ user_id: user.id, ...result })
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
    console.error('❌ Streak calculation job error:', error)
    return new Response(
      //@ts-ignore
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})