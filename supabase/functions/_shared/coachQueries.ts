

import { SupabaseClient } from '@supabase/supabase-js';

export async function getCoachDashboardData(
  supabase: SupabaseClient,
  coachId: string
) {
  // Get all clients for this coach with status calculation
  const { data: clients, error: clientsError } = await supabase
    .rpc('get_coach_clients_with_status', { coach_id: coachId });
  
  if (clientsError) throw clientsError;
  
  // Get unread message count
  const { count: unreadCount, error: messagesError } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', coachId)
    .eq('is_read', false);
  
  if (messagesError) throw messagesError;
  
  // Group clients by status
  const grouped = {
    need_followup: clients.filter((c: any) => c.status === 'need_followup'),
    on_track: clients.filter((c: any) => c.status === 'on_track'),
    in_baseline: clients.filter((c: any) => c.status === 'in_baseline'),
  };
  
  // Calculate stats
  const stats = {
    total_clients: clients.length,
    on_track_count: grouped.on_track.length,
    need_followup_count: grouped.need_followup.length,
    in_baseline_count: grouped.in_baseline.length,
    unread_messages_count: unreadCount || 0,
  };
  
  return { clients: grouped, stats };
}