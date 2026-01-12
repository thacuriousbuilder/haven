
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity,
  Alert 
} from 'react-native';
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

  const handleSelectType = (type: 'client' | 'trainer') => {
    if (!loading) {
      setSelectedType(type);
    }
  };

  const handleContinue = async () => {
    if (!selectedType) {
      Alert.alert('Selection Required', 'Please select an account type to continue');
      return;
    }

    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No user found. Please log in again.');
      }
  
      console.log('Setting user type:', selectedType, 'for user:', user.id);
  
     
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
  
      if (!existingProfile) {
        
        console.log('Creating profile for user:', user.id);
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            user_type: selectedType,
            gender: 'other',
            unit_system: 'imperial',
            goal: 'lose'
          });
  
        if (insertError) {
          console.error('Error creating profile:', insertError);
          throw new Error('Failed to create profile. Please try again.');
        }
        
        console.log('✅ Profile created with user type:', selectedType);
      } else {
       
        console.log('Updating existing profile');
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ user_type: selectedType })
          .eq('id', user.id);
  
        if (updateError) {
          console.error('Error updating profile:', updateError);
          throw new Error('Failed to update profile. Please try again.');
        }
        
        console.log('✅ Profile updated with user type:', selectedType);
      }
  
     
      if (selectedType === 'trainer') {
        await generateTrainerInviteCode(user.id);
        router.replace('/(tabs)/home');
      } else {
        router.push('/(onboarding)/trainerCode');
      }
    } catch (error: any) {
      console.error('Error setting account type:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to set account type. Please try again.'
      );
      setLoading(false);
    }
  };

  const generateTrainerInviteCode = async (trainerId: string) => {
    try {
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
        throw new Error('Failed to generate trainer invite code');
      } else {
        console.log('✅ Trainer invite code created:', inviteCode);
      }
    } catch (error) {
      console.error('Error generating invite code:', error);
      
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton/>
      <ProgressBar currentStep={1} totalSteps={14} />
      
      <View style={styles.content}>
        <View style={styles.topSection}>
          <Text style={styles.title}>Choose your account type</Text>
          <Text style={styles.description}>
            How will you be using HAVEN?
          </Text>

          <View style={styles.options}>
            <OptionCard
              title="I'm here for myself"
              description="Track my nutrition and get optional coaching"
              selected={selectedType === 'client'}
              onPress={() => handleSelectType('client')}
            />
            <OptionCard
              title="I'm a Coach"
              description="Manage my clients' nutrition tracking"
              selected={selectedType === 'trainer'}
              onPress={() => handleSelectType('trainer')}
            />
          </View>

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#206E6B" />
              <Text style={styles.loadingText}>Setting up your account...</Text>
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              (!selectedType || loading) && styles.continueButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={!selectedType || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.continueButtonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    justifyContent: 'space-between',
  },
  topSection: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  options: {
    marginTop: 8,
    gap: 16,
  },
  loadingContainer: {
    marginTop: 32,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#206E6B',
    fontWeight: '500',
  },
  buttonContainer: {
    paddingBottom: 24,
  },
  continueButton: {
    backgroundColor: '#206E6B',
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});