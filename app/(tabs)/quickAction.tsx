

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import * as Clipboard from 'expo-clipboard';

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
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
  
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

  const copyToClipboard = async () => {
    if (!inviteCode) return;

    await Clipboard.setStringAsync(inviteCode.invite_code);
    Alert.alert('Copied!', 'Invite code copied to clipboard');
  };

  const shareInviteCode = async () => {
    if (!inviteCode) return;

    try {
      await Share.share({
        message: `Join me on HAVEN for nutrition coaching! Use my invite code: ${inviteCode.invite_code}`,
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
          <ActivityIndicator size="large" color={Colors.vividTeal} />
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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Quick Actions</Text>
            <Text style={styles.subtitle}>Manage your coaching tools</Text>
          </View>

          {/* Invite Code Card */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="link" size={24} color={Colors.graphite} />
              <Text style={styles.sectionTitle}>Invite Code</Text>
            </View>

            <View style={styles.inviteCard}>
              <Text style={styles.inviteLabel}>Your Personal Code</Text>
              
              <View style={styles.codeContainer}>
                <Text style={styles.codeText}>
                  {inviteCode?.invite_code || 'Loading...'}
                </Text>
              </View>

              <Text style={styles.inviteDescription}>
                Share this code with new clients to connect them to your coaching account
              </Text>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={copyToClipboard}
                  activeOpacity={0.8}
                >
                  <Ionicons name="copy-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Copy Code</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.secondaryButton}
                  onPress={shareInviteCode}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-outline" size={20} color={Colors.vividTeal} />
                  <Text style={styles.secondaryButtonText}>Share</Text>
                </TouchableOpacity>
              </View>

              {/* Regenerate Link */}
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

          {/* How it Works Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle-outline" size={24} color={Colors.graphite} />
              <Text style={styles.sectionTitle}>How It Works</Text>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoStep}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Share Your Code</Text>
                  <Text style={styles.stepDescription}>
                    Send your invite code to new clients via text, email, or in person
                  </Text>
                </View>
              </View>

              <View style={styles.infoStep}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Client Signs Up</Text>
                  <Text style={styles.stepDescription}>
                    They'll enter your code during registration to link their account
                  </Text>
                </View>
              </View>

              <View style={styles.infoStep}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Start Coaching</Text>
                  <Text style={styles.stepDescription}>
                    Track their progress, send messages, and support their journey
                  </Text>
                </View>
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
    backgroundColor: Colors.lightCream,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.graphite,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.graphite,
    marginTop: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.graphite,
  },
  inviteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  inviteLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  codeContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.vividTeal,
    letterSpacing: 2,
  },
  inviteDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.vividTeal,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 2,
    borderColor: Colors.vividTeal,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.vividTeal,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  regenerateText: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  infoStep: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0F2F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.vividTeal,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.graphite,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});