import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Clipboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

interface InviteCode {
  id: string;
  invite_code: string;
  created_at: string;
}

export default function QuickActionsScreen() {
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState<InviteCode | null>(null);
  const [clientCount, setClientCount] = useState(0);

  useEffect(() => {
    fetchInviteCode();
    fetchClientCount();
  }, []);

  const fetchInviteCode = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;
  
      const { data, error } = await supabase
        .from('trainer_invites')
        .select('*')
        .eq('trainer_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })  // Get most recent first
        .limit(1)
        .maybeSingle();  // Use maybeSingle instead of single
  
      if (error) {
        console.error('Error fetching invite code:', error);
      } else if (data) {
        setInviteCode(data);
      } else {
        console.log('No active invite code found');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('trainer_id', user.id);

      if (error) {
        console.error('Error fetching client count:', error);
      } else {
        setClientCount(count || 0);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const copyToClipboard = () => {
    if (!inviteCode) return;

    Clipboard.setString(inviteCode.invite_code);
    Alert.alert('Copied!', 'Invite code copied to clipboard');
  };

  const shareInviteCode = async () => {
    if (!inviteCode) return;

    try {
      await Share.share({
        message: `Join me on HAVEN! Use my code: ${inviteCode.invite_code}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const regenerateCode = async () => {
    Alert.alert(
      'Regenerate Code?',
      'This will deactivate your current code and create a new one. Existing clients will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const { data: { user } } = await supabase.auth.getUser();
              
              if (!user) return;

              // Deactivate old code
              if (inviteCode) {
                await supabase
                  .from('trainer_invites')
                  .update({ is_active: false })
                  .eq('id', inviteCode.id);
              }

              // Create new code
              const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
              const newInviteCode = `COACH-${randomCode}`;

              const { data, error } = await supabase
                .from('trainer_invites')
                .insert({
                  trainer_id: user.id,
                  invite_code: newInviteCode,
                })
                .select()
                .single();

              if (error) {
                throw error;
              }

              setInviteCode(data);
              Alert.alert('Success', 'New invite code generated!');
            } catch (error) {
              console.error('Error regenerating code:', error);
              Alert.alert('Error', 'Failed to regenerate code');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3D5A5C" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.greetingSection}>
            <Text style={styles.greeting}>Quick Actions</Text>
            <Text style={styles.subGreeting}>Manage your invite code and client tools</Text>
          </View>

          {/* Invite Code Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add New Client</Text>
            
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Your Invite Code</Text>
              
              <View style={styles.codeContainer}>
                <Text style={styles.code}>{inviteCode?.invite_code || 'Loading...'}</Text>
              </View>

              <Text style={styles.cardDescription}>
                Share this code with new clients to connect them to your account
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={copyToClipboard}
                  activeOpacity={0.8}
                >
                  <Ionicons name="copy-outline" size={20} color="#fff" />
                  <Text style={styles.primaryButtonText}>Copy Code</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.secondaryButton}
                  onPress={shareInviteCode}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-outline" size={20} color="#3D5A5C" />
                  <Text style={styles.secondaryButtonText}>Share</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.regenerateButton}
                onPress={regenerateCode}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={16} color="#6B7280" />
                <Text style={styles.regenerateText}>Regenerate Code</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Stats</Text>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{clientCount}</Text>
                <Text style={styles.statLabel}>Active Clients</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statNumber}>-</Text>
                <Text style={styles.statLabel}>On Track</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statNumber}>-</Text>
                <Text style={styles.statLabel}>Need Follow-up</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statNumber}>-</Text>
                <Text style={styles.statLabel}>In Baseline</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  greetingSection: {
    marginBottom: 32,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3D5A5C',
    marginBottom: 8,
  },
  subGreeting: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3D5A5C',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  codeContainer: {
    backgroundColor: '#F5F1E8',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#3D5A5C',
    borderStyle: 'dashed',
  },
  code: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3D5A5C',
    letterSpacing: 3,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#3D5A5C',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#3D5A5C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryButtonText: {
    color: '#3D5A5C',
    fontSize: 16,
    fontWeight: '700',
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  regenerateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#3D5A5C',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});