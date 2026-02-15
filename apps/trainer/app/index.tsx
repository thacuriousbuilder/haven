import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '@haven/shared-utils';
import type { UserProfile } from '@haven/shared-types';

export default function TrainerHome() {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Trainer app - Session:', session?.user?.email);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>HAVEN Trainer App</Text>
      <Text style={styles.subtitle}>Using Shared Packages ✅</Text>
      <Text style={styles.info}>Supabase: Connected</Text>
      <Text style={styles.info}>Types: Imported</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#206E6B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  info: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
});
