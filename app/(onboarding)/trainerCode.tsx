

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { BackButton } from '@/components/onboarding/backButton';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { ContinueButton } from '@/components/onboarding/continueButton';

export default function TrainerCodeScreen() {
  const router = useRouter();
  const [trainerCode, setTrainerCode] = useState('');
  const [loading, setLoading] = useState(false);

  const skipTrainer = () => {
    // Continue to gender screen (existing onboarding)
    router.push('/(onboarding)/gender');
  };

  const linkToTrainer = async () => {
    if (!trainerCode.trim()) {
      alert('Please enter a trainer code');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No user found');
      }

      console.log('Looking for invite code:', trainerCode.toUpperCase());

      // Find the invite code
      const { data: invite, error: inviteError } = await supabase
        .from('trainer_invites')
        .select('trainer_id, id')
        .eq('invite_code', trainerCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (inviteError || !invite) {
        console.error('Invite not found:', inviteError);
        alert('Invalid trainer code. Please check and try again.');
        setLoading(false);
        return;
      }

      console.log('✅ Found trainer invite:', invite);

      // Link client to trainer
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          trainer_id: invite.trainer_id,
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error linking trainer:', updateError);
        throw updateError;
      }

      console.log('✅ Successfully linked to trainer');

      // Continue to gender screen
      router.push('/(onboarding)/gender');

    } catch (error) {
      console.error('Error linking trainer:', error);
      alert('Failed to link trainer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={2} totalSteps={16} />
      
      <View style={styles.content}>
        <Text style={styles.title}>Do you have a coach?</Text>
        <Text style={styles.description}>
          If your coach gave you an invite code, enter it below
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Trainer Code (Optional)</Text>
          <TextInput
            style={styles.input}
            value={trainerCode}
            onChangeText={setTrainerCode}
            placeholder="COACH-ABC123"
            placeholderTextColor="#999"
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!loading}
          />
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.secondaryButton, loading && styles.buttonDisabled]}
          onPress={skipTrainer}
          disabled={loading}
        >
          <Text style={styles.secondaryButtonText}>
            Continue Without Coach
          </Text>
        </TouchableOpacity>

        <ContinueButton
          onPress={linkToTrainer}
          disabled={loading || !trainerCode.trim()}
          text={loading ? 'Connecting...' : 'Connect to Coach'}
        />
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
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#3D5A5C',
    paddingLeft: 20,
  },
  input: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 50,
    fontSize: 16,
    color: '#3D5A5C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#3D5A5C',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#3D5A5C',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});