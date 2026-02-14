import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle() {
  // Use useProxy: true for development
  const redirectUrl = makeRedirectUri({
    scheme: 'haven',
    path: 'auth/callback',
  });

  console.log('Redirect URL:', redirectUrl);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) throw error;

  const res = await WebBrowser.openAuthSessionAsync(
    data.url ?? '',
    redirectUrl
  );

  if (res.type === 'success') {
    const { url } = res;
    
    // Parse URL for access token
    let access_token = null;
    let refresh_token = null;

    // Try hash format first (#access_token=...)
    if (url.includes('#')) {
      const hash = url.split('#')[1];
      const params = new URLSearchParams(hash);
      access_token = params.get('access_token');
      refresh_token = params.get('refresh_token');
    }
    
    // Try query format (?access_token=...)
    if (!access_token && url.includes('?')) {
      const query = url.split('?')[1]?.split('#')[0];
      const params = new URLSearchParams(query);
      access_token = params.get('access_token');
      refresh_token = params.get('refresh_token');
    }

    console.log('Access token found:', !!access_token);
    console.log('Refresh token found:', !!refresh_token);

    if (access_token && refresh_token) {
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (sessionError) throw sessionError;
      return sessionData;
    }
  }

  return null;
}