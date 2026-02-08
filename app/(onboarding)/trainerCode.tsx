
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { BackButton } from '@/components/onboarding/backButton';
import { ProgressBar } from '@/components/onboarding/progressBar';

export default function TrainerCodeScreen() {
  const router = useRouter();
  const [trainerCode, setTrainerCode] = useState('');
  const [loading, setLoading] = useState(false);

  const skipTrainer = () => {
    if (!loading) {
      router.push('/(onboarding)/whyWorks3');
    }
  };

  const linkToTrainer = async () => {
    const trimmedCode = trainerCode.trim();
    
    if (!trimmedCode) {
      Alert.alert('Required', 'Please enter a trainer code');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No user found. Please log in again.');
      }

      console.log('Looking for invite code:', trimmedCode.toUpperCase());

     
      const { data: invite, error: inviteError } = await supabase
        .from('trainer_invites')
        .select('trainer_id, id')
        .eq('invite_code', trimmedCode.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (inviteError) {
        console.error('Error fetching invite:', inviteError);
        throw new Error('Failed to verify trainer code. Please try again.');
      }

      if (!invite) {
        console.error('Invite not found');
        Alert.alert(
          'Invalid Code', 
          'This trainer code is not valid. Please check with your coach and try again.'
        );
        setLoading(false);
        return;
      }

      console.log('✅ Found trainer invite:', invite);

      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          trainer_id: invite.trainer_id,
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error linking trainer:', updateError);
        throw new Error('Failed to connect to coach. Please try again.');
      }

      console.log('✅ Successfully linked to trainer');
      
      
      router.push('/(onboarding)/whyWorks3');

    } catch (error: any) {
      console.error('Error linking trainer:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to connect to coach. Please try again.'
      );
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <BackButton />
          <ProgressBar currentStep={12} totalSteps={15} />
          
          <View style={styles.content}>
            <Text style={styles.title}>Do you have a coach?</Text>
            <Text style={styles.description}>
              If your coach gave you an invite code, enter it below
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={trainerCode}
                onChangeText={setTrainerCode}
                placeholder="COACH-ABC123"
                placeholderTextColor="#999"
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={linkToTrainer}
              />
            </View>

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#206E6B" />
                <Text style={styles.loadingText}>Connecting to coach...</Text>
              </View>
            )}
          </View>

          <View style={styles.buttonContainer}>
            
            <TouchableOpacity
              style={[styles.secondaryButton, loading && styles.buttonDisabled]}
              onPress={skipTrainer}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>
                Continue without coach
              </Text>
            </TouchableOpacity>

          
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (loading || !trainerCode.trim()) && styles.primaryButtonDisabled
              ]}
              onPress={linkToTrainer}
              disabled={loading || !trainerCode.trim()}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Connect to coach</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
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
    marginBottom: 32,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  loadingContainer: {
    marginTop: 24,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#206E6B',
    fontWeight: '500',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 50,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  secondaryButtonText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  primaryButton: {
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
  primaryButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});