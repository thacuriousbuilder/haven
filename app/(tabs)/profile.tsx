
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
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ProfileHeader } from '@/components/profile/profileHeader';
import { MyCoachCard } from '@/components/profile/myCoachCard';
import { Card } from '@/components/profile/ui/card';
import { SectionHeader } from '@/components/profile/ui/sectionHeader';
import { ToggleRow } from '@/components/profile/ui/toggleRow';
import { SettingsRow } from '@/components/profile/ui/settingsRow';
import { Ionicons } from '@expo/vector-icons'; 
import { Colors } from '@/constants/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';


interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  current_streak: number;
  push_notifications_enabled: boolean;
  meal_reminders_enabled: boolean;
  created_at: string;
  trainer_id: string | null;
  weight_kg: number | null;
  weight_lbs: number | null;
  target_weight_kg: number | null;
  target_weight_lbs: number | null;
  unit_system: 'imperial' | 'metric';
  goal: 'lose' | 'maintain' | 'gain' | null;
  user_type: 'client' | 'trainer';
}

interface CoachData {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [coach, setCoach] = useState<CoachData | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs');
  const [targetWeight, setTargetWeight] = useState<number | null>(null);
  const [userGoal, setUserGoal] = useState<'lose' | 'maintain' | 'gain' | null>(null);
  const [totalClients, setTotalClients] = useState(0);

  useEffect(() => {
    fetchProfileData();
  }, []);


  const fetchProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      setUserEmail(user.email || '');

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Calculate current weight based on unit system
      if (profileData.unit_system === 'imperial' && profileData.weight_lbs) {
        setCurrentWeight(profileData.weight_lbs);
        setWeightUnit('lbs');
      } else if (profileData.unit_system === 'metric' && profileData.weight_kg) {
        setCurrentWeight(profileData.weight_kg);
        setWeightUnit('kg');
      } else {
        setCurrentWeight(null);
      }

      // Calculate target weight based on unit system
      if (profileData.unit_system === 'imperial' && profileData.target_weight_lbs) {
        setTargetWeight(profileData.target_weight_lbs);
      } else if (profileData.unit_system === 'metric' && profileData.target_weight_kg) {
        setTargetWeight(profileData.target_weight_kg);
      } else {
        setTargetWeight(null);
      }
      //set profile
      setProfile(profileData);

      // Set user goal
      setUserGoal(profileData.goal || null);

      // Fetch coach data if trainer_id exists
      // Coach is also in profiles, just with account_type = 'trainer'
      if (profileData.trainer_id) {
        const { data: coachData, error: coachError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', profileData.trainer_id)
          .single();

        if (!coachError && coachData) {
          setCoach(coachData);
        }
      }
       // If trainer, fetch total clients
    if (profileData.user_type === 'trainer') {
      const { count, error: clientsError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('trainer_id', profileData.id);

      if (!clientsError) {
        setTotalClients(count || 0);
      }
    }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

    //handlers

    //avatar commented out for now
    // const handleAvatarPress = async () => {
    //   console.log('Starting avatar upload for user:', profile!.id);
    //   const result = await uploadAvatar(profile!.id);
      
    //   console.log('Upload result:', result);
      
    //   if (result.success && result.avatarUrl) {
    //     console.log('New avatar URL:', result.avatarUrl);
        
    //     // Update local state to show new avatar immediately
    //     setProfile(prev => {
    //       const updated = prev ? { ...prev, avatar_url: result.avatarUrl! } : null;
    //       console.log('Updated profile state:', updated);
    //       return updated;
    //     });
        
    //     Alert.alert('Success', 'Profile photo updated!');
    //   } else if (result.error) {
    //     console.log('Upload error:', result.error);
    //     Alert.alert('Error', result.error);
    //   }
    // };
    //notifications
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

    //meal reminders
    const handleToggleMealReminders = async (value: boolean) => {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ meal_reminders_enabled: value })
          .eq('id', profile!.id);
    
        if (error) throw error;
        
        setProfile(prev => prev ? { ...prev, meal_reminders_enabled: value } : null);
      } catch (error) {
        console.error('Error updating meal reminders:', error);
        Alert.alert('Error', 'Failed to update notification settings');
      }
    };

    //send message to coach
    const handleCoachMessage = () => {
      // Navigate to messages with coach
      router.push(`/messages/${coach?.id}`);
    };

    const handleCoachCardPress = () => {
      // Navigate to coach profile/details
      Alert.alert('Coach Profile', 'Coach profile screen coming soon!');
    };
    
    const handleWeightGoals = () => {
      router.push('/weightGoal');
    };
    
    const handleEditProfile = () => {
      router.push('/editProfile');
    };
    
    // const handlePrivacySecurity = () => {
    //   Alert.alert('Privacy & Security', 'Privacy settings screen coming soon!');
    // };
    
    const handleHelpCenter = async () => {
      const email = 'tryhaven01@gmail.com';
      const subject = 'Help Request - HAVEN App';
      const body = `Hi HAVEN Support Team,\n\nI need help with:\n\n[Please describe your issue here]\n\n---\nUser ID: ${profile?.id}\nApp Version: 1.0.0`;
      
      const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      try {
        const canOpen = await Linking.canOpenURL(mailtoUrl);
        
        if (canOpen) {
          await Linking.openURL(mailtoUrl);
        } else {
          // Fallback if no email client is available
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
        Alert.alert(
          'Contact Support',
          `Please email us at:\n\n${email}`
        );
      }
    };
    
    const handleTermsPrivacy = async () => {
      const url = 'https://www.tryhaven.co/'; // Change to /privacy when ready
      
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
      fullName={profile.full_name}
      email={userEmail}
      currentStreak={profile.current_streak}
      currentWeight={currentWeight}
      weightUnit={weightUnit}
      goal={userGoal}
      userType={profile.user_type}
      targetWeight={targetWeight}
    />

    {/* My Coach Section - Only show if trainer_id exists */}
    {coach && (
      <MyCoachCard
        coach={coach}
        onMessagePress={handleCoachMessage}
        onCardPress={handleCoachCardPress}
      />
    )}

    {/* Notifications */}
    <SectionHeader title="Notifications" />
      <Card style={styles.card}>
        <ToggleRow
          icon="phone-portrait"
          label="Push Notifications"
          description={profile.user_type === 'trainer' 
            ? "Get notified about client activity" 
            : "Coach messages & reminders"}
          value={profile.push_notifications_enabled}
          onValueChange={handleTogglePushNotifications}
        />
        
        {/* Only show Meal Reminders for clients */}
        {profile.user_type === 'client' && (
          <>
            <View style={styles.divider} />
            <ToggleRow
              icon="restaurant"
              iconColor="#EF7828"
              iconBgColor="#FEF3E8"
              label="Meal Reminders"
              description="Breakfast, lunch & dinner"
              value={profile.meal_reminders_enabled}
              onValueChange={handleToggleMealReminders}
            />
          </>
        )}
      </Card>

    {/* Goals & Preferences */}
    {profile.user_type === 'client' && (
      <>
    <SectionHeader title="Goals & Preferences" />
    <Card style={styles.card}>
      <SettingsRow
        icon="scale"
        label="Weight Goals"
        onPress={handleWeightGoals}
      />
    </Card>
    </>
    )}
    
    {/* Account */}
    <SectionHeader title="Account" />
    <Card style={styles.card}>
      <SettingsRow
        icon="person"
        label="Edit Profile"
        onPress={handleEditProfile}
      />
      <View style={styles.divider} />
      {/* <SettingsRow
        icon="shield-checkmark"
        label="Privacy & Security"
        onPress={handlePrivacySecurity}
      /> */}
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

    {/* Member Since & Sign Out */}
    <View style={styles.footer}>
      <Text style={styles.memberSince}>
        Member since {formatMemberSince(profile.created_at)}
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