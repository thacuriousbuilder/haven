
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DailySummary {
  summary_date: string;
  calories_consumed: number;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with user's JWT
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

    // Step 1: Get baseline week daily summaries (7 days)
    const { data: dailySummaries, error: summariesError } = await supabaseClient
      .from('daily_summaries')
      .select('summary_date, calories_consumed')
      .eq('user_id', userId)
      .order('summary_date', { ascending: true })
      .limit(7);

    if (summariesError || !dailySummaries || dailySummaries.length < 7) {
      return new Response(
        JSON.stringify({ 
          error: 'Baseline week incomplete. Need 7 days of data.',
          found: dailySummaries?.length || 0
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Calculate average daily calories
    const totalCalories = dailySummaries.reduce(
      (sum: number, day: DailySummary) => sum + day.calories_consumed,
      0
    );
    const averageDailyCalories = Math.round(totalCalories / 7);

    // Step 3: Calculate weekly budget (avg × 7)
    const weeklyBudget = averageDailyCalories * 7;

    // Step 4: Get current Monday (start of this week)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ...
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Monday start
    const monday = new Date(today);
    monday.setDate(today.getDate() + daysToMonday);
    monday.setHours(0, 0, 0, 0);

    // Step 5: Calculate Sunday (end of this week)
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const weekStartDate = monday.toISOString().split('T')[0];
    const weekEndDate = sunday.toISOString().split('T')[0];

    // Step 6: Insert weekly_period record
    const { data: weeklyPeriod, error: periodError } = await supabaseClient
      .from('weekly_periods')
      .insert({
        user_id: userId,
        week_start_date: weekStartDate,
        week_end_date: weekEndDate,
        baseline_average_daily: averageDailyCalories,
        weekly_budget: weeklyBudget,
      })
      .select()
      .single();

    if (periodError) {
      return new Response(
        JSON.stringify({ error: 'Failed to create weekly period', details: periodError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 7: Update user profile
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({
        baseline_complete: true,
        baseline_avg_daily_calories: averageDailyCalories,
        weekly_calorie_bank: weeklyBudget,
      })
      .eq('id', userId);

    if (profileError) {
      return new Response(
        JSON.stringify({ error: 'Failed to update profile', details: profileError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Success response
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
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});