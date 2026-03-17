
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export type Article = {
  id: string;
  title: string;
  category: 'Science' | 'Tips' | 'Lifestyle';
  read_time: number;
  image_url: string | null;
  summary: string;
  url: string;
  sort_order: number;
};

export function useDiscoveryArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  async function fetchArticles() {
    try {
      setLoading(true);
      const { data, error: queryError } = await supabase
        .from('discovery_articles')
        .select('*')
        .eq('is_published', true)
        .order('sort_order', { ascending: true });

      if (queryError) throw queryError;
      setArticles(data ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return { articles, loading, error };
}