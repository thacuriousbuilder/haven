import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@haven/shared-utils';
import { ProfileHeader } from '@/components/cards/profileHeader';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/sectionHeader';
import { ToggleRow } from '@/components/ui/toggleRow';
import { SettingsRow } from '@/components/ui/settingsRow';
import { Ionicons } from '@expo/vector-icons'; 
import { Colors } from '@/constants/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  current_streak: number;
  push_notifications_enabled: boolean;
  created_at: string;
}

export default function TrainerProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [totalClients, setTotalClients] = useState(0);

  useEffect(() => {
    fetchProfileData();
  }, []);
  
  useFocusEffect(
    React.useCallback(() => {
      fetchProfileData();
    }, [])
  );

  const fetchProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      setUserEmail(user.email || '');

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch total clients
      const { count, error: clientsError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('trainer_id', profileData.id);

      if (!clientsError) {
        setTotalClients(count || 0);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePushNotifications = async (value: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ push_notifications_enabled: value })
        .eq('id', profile!.id);
  
      if (error) throw error;
      
      setProfile(prev => prev ? { ...prev, push_notifications_enabled: value } : null);
    } catch (error) {
      console.error('Error updating push notifications:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };
  
  const handleEditProfile = () => {
    router.push('/editProfile');
  };
  
  const handleHelpCenter = async () => {
    const email = 'tryhaven01@gmail.com';
    const subject = 'Help Request - HAVEN Trainer App';
    const body = `Hi HAVEN Support Team,\n\nI need help with:\n\n[Please describe your issue here]\n\n---\nUser ID: ${profile?.id}\nApp Version: 1.0.0`;
    
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert(
          'Contact Support',
          `Please send an email to:\n\n${email}`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Copy Email',
              onPress: async () => {
                await Clipboard.setStringAsync(email);
                Alert.alert('Copied', 'Email address copied to clipboard');
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error opening email:', error);
      Alert.alert('Contact Support', `Please email us at:\n\n${email}`);
    }
  };
  
  const handleTermsPrivacy = async () => {
    const url = 'https://www.tryhaven.co/privacy';
    
    try {
      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open the link');
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert('Error', 'Unable to open the link');
    }
  };
  
  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const formatMemberSince = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#206E6B" />
      </View>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <ProfileHeader
          fullName={`${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Coach'}
          email={userEmail}
          currentStreak={0}
          currentWeight={null}
          weightUnit="lbs"
          goal={null}
          userType="trainer"
          targetWeight={null}
          totalClients={totalClients}
        />

        {/* Coaching Stats */}
        <SectionHeader title="Coaching" />
        <Card style={styles.statsCard}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Ionicons name="people" size={24} color={Colors.vividTeal} />
              <Text style={styles.statNumber}>{totalClients}</Text>
              <Text style={styles.statLabel}>Active Clients</Text>
            </View>
          </View>
        </Card>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <Card style={styles.card}>
          <ToggleRow
            icon="phone-portrait"
            label="Push Notifications"
            description="Get notified about client activity"
            value={profile.push_notifications_enabled}
            onValueChange={handleTogglePushNotifications}
          />
        </Card>
        
        {/* Account */}
        <SectionHeader title="Account" />
        <Card style={styles.card}>
          <SettingsRow
            icon="person"
            label="Edit Profile"
            onPress={handleEditProfile}
          />
        </Card>

        {/* Support */}
        <SectionHeader title="Support" />
        <Card style={styles.card}>
          <SettingsRow
            icon="help-circle"
            label="Help Center"
            onPress={handleHelpCenter}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="document-text"
            label="Terms & Privacy"
            onPress={handleTermsPrivacy}
          />
        </Card>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.memberSince}>
            Coaching since {formatMemberSince(profile.created_at)}
          </Text>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out" size={20} color="#EF4444" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#206E6B',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.lightCream,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  card: {
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  statsCard: {
    paddingVertical: 20,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.graphite,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.steelBlue,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginLeft: 72,
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  memberSince: {
    fontSize: 14,
    color: Colors.fatSteel,
    marginBottom: 16,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  bottomPadding: {
    height: 100,
  },
});
