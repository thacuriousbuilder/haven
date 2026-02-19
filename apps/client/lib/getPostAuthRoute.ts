
import { supabase } from './supabase';

export async function getPostAuthRoute(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return '/(auth)/welcome';

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.onboarding_completed) return '/(onboarding)/gender';
  return '/(tabs)/home';
}