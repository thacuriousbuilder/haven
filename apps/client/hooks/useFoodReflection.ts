
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

type ReflectionPayload = {
  eat_reason:       string[];
  satiety_response: string | null;
  is_favorite:      boolean;
};

export function useFoodReflection(foodLogId: string) {
    const [saving, setSaving]   = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError]     = useState<string | null>(null);
    const [saved, setSaved]     = useState(false);
  
    async function saveReflection(payload: ReflectionPayload) {
      try {
        setSaving(true);
        setError(null);
        setSaved(false);
  
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
  
        const { error: updateError } = await supabase
          .from('food_logs')
          .update({
            eat_reason:       payload.eat_reason,
            satiety_response: payload.satiety_response,
            is_favorite:      payload.is_favorite,
          })
          .eq('id', foodLogId)
          .eq('user_id', user.id);
  
        if (updateError) throw updateError;
        setSaved(true);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setSaving(false);
      }
    }
  
    async function deleteFoodLog() {
      try {
        setDeleting(true);
        setError(null);
  
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
  
        const { error: deleteError } = await supabase
          .from('food_logs')
          .delete()
          .eq('id', foodLogId)
          .eq('user_id', user.id);
  
        if (deleteError) throw deleteError;
      } catch (err: any) {
        setError(err.message);
      } finally {
        setDeleting(false);
      }
    }
  
    return { saveReflection, deleteFoodLog, saving, deleting, saved, error };
  }