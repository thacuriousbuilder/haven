
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper: Get Monday of current week
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday
  return new Date(d.setDate(diff));
}

// Helper: Get Sunday of current week
function getSunday(monday: Date): Date {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    const today = new Date();
    const monday = getMonday(today);
    const sunday = getSunday(monday);
    
    const weekStartDate = monday.toISOString().split('T')[0];
    const weekEndDate = sunday.toISOString().split('T')[0];
    const calculatedDate = today.toISOString().split('T')[0];

    // Step 1: Get current weekly period
    const { data: weeklyPeriod, error: periodError } = await supabaseClient
      .from('weekly_periods')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start_date', weekStartDate)
      .single();

    if (periodError || !weeklyPeriod) {
      return new Response(
        JSON.stringify({ error: 'No weekly period found for current week' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Get this week's daily summaries
    const { data: weekSummaries, error: summariesError } = await supabaseClient
      .from('daily_summaries')
      .select('*')
      .eq('user_id', userId)
      .gte('summary_date', weekStartDate)
      .lte('summary_date', calculatedDate)
      .order('summary_date', { ascending: true });

    if (summariesError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch daily summaries' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Calculate total consumed this week
    const totalConsumed = weekSummaries?.reduce(
     // @ts-ignore
      (sum, day) => sum + (day.calories_consumed || 0),
      0
    ) || 0;

    // Step 4: Get planned cheat days for this week
    const { data: cheatDays, error: cheatError } = await supabaseClient
      .from('planned_cheat_days')
      .select('*')
      .eq('user_id', userId)
      .gte('cheat_date', weekStartDate)
      .lte('cheat_date', weekEndDate);

    if (cheatError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch cheat days' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 5: Calculate calories reserved for upcoming cheat days
    const upcomingCheatDays = cheatDays?.filter(
    // @ts-ignore
      (cd) => new Date(cd.cheat_date) > today
    ) || [];
    
    const caloriesReserved = upcomingCheatDays.reduce(
    // @ts-ignore
      (sum, cd) => sum + (cd.planned_calories || 0),
      0
    );

    // Step 6: Calculate remaining calories
    const totalRemaining = weeklyPeriod.weekly_budget - totalConsumed;

   
    // METRIC 1: BALANCE (Simplified)
   
    const daysLeftInWeek = Math.max(
      1,
      Math.ceil((sunday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
    
    const dailyBudgetRemaining = totalRemaining / daysLeftInWeek;
    const baselineAvg = weeklyPeriod.baseline_average_daily;
    
    let balanceScore = 0;
    if (dailyBudgetRemaining >= baselineAvg) {
      balanceScore = 100; // High - plenty of room
    } else if (dailyBudgetRemaining >= baselineAvg * 0.7) {
      balanceScore = 65; // Medium - manageable
    } else {
      balanceScore = 30; // Low - tight
    }

   
    // METRIC 2: CONSISTENCY (Simplified)
   
    let consistencyScore = 50; // Default medium
    
    if (weekSummaries && weekSummaries.length >= 3) {
    // @ts-ignore
      const calories = weekSummaries.map(s => s.calories_consumed || 0);
      // @ts-ignore
      const mean = calories.reduce((a, b) => a + b, 0) / calories.length;
      
      // Calculate standard deviation
      // @ts-ignore
      const squareDiffs = calories.map(value => Math.pow(value - mean, 2));
      // @ts-ignore
      const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
      const stdDev = Math.sqrt(avgSquareDiff);
      
      // Convert to percentage (lower stdDev = higher consistency)
      const coefficientOfVariation = (stdDev / mean) * 100;
      
      if (coefficientOfVariation < 15) {
        consistencyScore = 85; // High consistency
      } else if (coefficientOfVariation < 30) {
        consistencyScore = 55; // Medium consistency
      } else {
        consistencyScore = 25; // Low consistency
      }
    }

   
    // METRIC 3: DRIFT (Simplified)
   
    let driftScore = 50; // Default medium
    
    // Get cheat days that have already happened this week
    const pastCheatDays = cheatDays?.filter(
    // @ts-ignore
      (cd) => new Date(cd.cheat_date) <= today
    ) || [];
    
    if (pastCheatDays.length > 0) {
      let totalDrift = 0;
      
      for (const cheatDay of pastCheatDays) {
        const summary = weekSummaries?.find(
        // @ts-ignore
          s => s.summary_date === cheatDay.cheat_date
        );
        
        if (summary) {
          const overage = summary.calories_consumed - cheatDay.planned_calories;
          totalDrift += Math.max(0, overage); // Only count positive overages
        }
      }
      
      const avgDrift = totalDrift / pastCheatDays.length;
      
      if (avgDrift < 200) {
        driftScore = 80; // Low drift - good control
      } else if (avgDrift < 500) {
        driftScore = 50; // Moderate drift
      } else {
        driftScore = 20; // High drift
      }
    }

    // Step 7: Insert or update weekly_metrics
    const { data: metrics, error: metricsError } = await supabaseClient
      .from('weekly_metrics')
      .upsert({
        user_id: userId,
        weekly_period_id: weeklyPeriod.id,
        calculated_date: calculatedDate,
        balance_score: balanceScore,
        consistency_score: consistencyScore,
        drift_score: driftScore,
        total_consumed: totalConsumed,
        total_remaining: totalRemaining,
        calories_reserved: caloriesReserved,
      }, {
        onConflict: 'user_id,weekly_period_id,calculated_date'
      })
      .select()
      .single();

    if (metricsError) {
      return new Response(
        JSON.stringify({ error: 'Failed to save metrics', details: metricsError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Success response
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
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
    // @ts-ignore
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});