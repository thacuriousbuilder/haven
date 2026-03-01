

//@ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2'
import { validateUUID, buildValidationResponse } from '../_shared/validate.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function calculateStreakForUser(supabase: any, userId: string) {
  try {
    console.log('🔥 Calculating streak for user:', userId)

    const { data: logs, error } = await supabase
      .from('food_logs')
      .select('log_date')
      .eq('user_id', userId)
      .order('log_date', { ascending: false })

    if (error) {
      console.error('❌ Error fetching logs for user:', userId, error)
      return { success: false, error: error.message }
    }

    if (!logs || logs.length === 0) {
      await supabase
        .from('profiles')
        .update({ current_streak: 0 })
        .eq('id', userId)
      return { success: true, streak: 0 }
    }

    const uniqueDates = [...new Set(logs.map((log: any) => log.log_date))].sort().reverse()

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    let streak = 0
    let currentDate = new Date(todayStr)

    if (uniqueDates[0] === todayStr) {
      streak = 1
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      if (uniqueDates[0] === yesterdayStr) {
        streak = 1
        currentDate = new Date(yesterdayStr)
        currentDate.setDate(currentDate.getDate() - 1)
      } else {
        streak = 0
      }
    }

    if (streak > 0) {
      for (let i = 1; i < uniqueDates.length; i++) {
        const expectedDateStr = currentDate.toISOString().split('T')[0]
        if (uniqueDates[i] === expectedDateStr) {
          streak++
          currentDate.setDate(currentDate.getDate() - 1)
        } else {
          break
        }
      }
    }

    await supabase
      .from('profiles')
      .update({ current_streak: streak })
      .eq('id', userId)

    console.log(`✅ Streak for user ${userId}: ${streak} days`)
    return { success: true, streak }

  } catch (error) {
    console.error('❌ Error calculating streak:', userId, error)
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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { userId } = body

    // If single user request — verify JWT
    if (userId) {
      const userClient = createClient(
        //@ts-ignore
        Deno.env.get('SUPABASE_URL') ?? '',
        //@ts-ignore
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      )

      const { data: { user }, error: userError } = await userClient.auth.getUser()
      if (userError || !user) {
        console.error('❌ Invalid token:', userError)
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate UUID
      const validationResponse = buildValidationResponse([
        validateUUID(userId, 'userId'),
      ], corsHeaders)
      if (validationResponse) return validationResponse

      // Ensure user can only update their own streak
      if (user.id !== userId) {
        console.error('❌ User attempted to update another users streak')
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const adminClient = createClient(
        //@ts-ignore
        Deno.env.get('SUPABASE_URL') ?? '',
        //@ts-ignore
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const result = await calculateStreakForUser(adminClient, userId)
      return new Response(
        JSON.stringify({ success: result.success, streak: result.streak, userId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Batch request — verify cron secret
    //@ts-ignore
    const cronSecret = Deno.env.get('CRON_SECRET')
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ Unauthorized batch request')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminClient = createClient(
      //@ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      //@ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: users, error: usersError } = await adminClient
      .from('profiles')
      .select('id')

    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
      throw usersError
    }

    console.log(`🔥 Found ${users?.length || 0} users to process`)

    const results: Array<{ user_id: string; success: boolean; streak?: number; error?: string }> = []
    for (const user of users || []) {
      const result = await calculateStreakForUser(adminClient, user.id)
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