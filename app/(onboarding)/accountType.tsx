
import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { BackButton } from '@/components/onboarding/backButton';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { OptionCard } from '@/components/onboarding/optionCard';

export default function AccountTypeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<'client' | 'trainer' | null>(null);

  const selectAccountType = async (type: 'client' | 'trainer') => {
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No user found');
      }
  
      console.log('Setting user type:', type, 'for user:', user.id);
  
      // First, check if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle(); // Use maybeSingle instead of single to avoid error if not found
  
      if (!existingProfile) {
        // Create profile if it doesn't exist
        console.log('Creating profile for user:', user.id);
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            user_type: type,
            gender:'other',
            unit_system: 'imperial',
            goal:'lose'
          });
  
        if (insertError) {
          console.error('Error creating profile:', insertError);
          throw insertError;
        }
        
        console.log('✅ Profile created with user type:', type);
      } else {
        // Update existing profile
        console.log('Updating existing profile');
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ user_type: type })
          .eq('id', user.id);
  
        if (updateError) {
          console.error('Error updating profile:', updateError);
          throw updateError;
        }
        
        console.log('✅ Profile updated with user type:', type);
      }
  
      // Generate invite code for trainers
      if (type === 'trainer') {
        await generateTrainerInviteCode(user.id);
        router.replace('/(tabs)/home');
      } else {
        // Clients continue to trainer code screen
        router.push('/onboarding/trainerCode');
      }
    } catch (error) {
      console.error('Error setting account type:', error);
      alert('Failed to set account type. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateTrainerInviteCode = async (trainerId: string) => {
    try {
      // Generate a random code
      const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const inviteCode = `COACH-${randomCode}`;

      const { error } = await supabase
        .from('trainer_invites')
        .insert({
          trainer_id: trainerId,
          invite_code: inviteCode,
        });

      if (error) {
        console.error('Error creating invite code:', error);
      } else {
        console.log('✅ Trainer invite code created:', inviteCode);
      }
    } catch (error) {
      console.error('Error generating invite code:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={1} totalSteps={16} />
      
      <View style={styles.content}>
        <Text style={styles.title}>Choose Your Account Type</Text>
        <Text style={styles.description}>
          How will you be using HAVEN?
        </Text>

        <View style={styles.options}>
          <OptionCard
            title="I'm a Client"
            description="Track my nutrition and work with a coach"
            selected={selectedType === 'client'}
            onPress={() => selectAccountType('client')}
          />
          <OptionCard
            title="I'm a Coach"
            description="Manage my clients' nutrition tracking"
            selected={selectedType === 'trainer'}
            onPress={() => selectAccountType('trainer')}
          />
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3D5A5C" />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3D5A5C',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  options: {
    marginTop: 8,
  },
  loadingContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
});