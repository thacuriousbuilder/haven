import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { signInWithGoogle } from '../../lib/auth';
import { BackButton } from '../../components/onboarding/backButton';

export default function Signup() {
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleSignIn() {
    try {
      setGoogleLoading(true);
      const session = await signInWithGoogle();
      
      if (session) {
        // TODO: Check if profile exists, if not go to onboarding
        router.replace('/(tabs)/home');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <View style={styles.container}>
     <BackButton/>
      <View style={styles.content}>
        <Text style={styles.headline}>
          No spam. No judgment.{'\n'}Just your data, your pace.
        </Text>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(auth)/emailSignup')}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </TouchableOpacity>

          <Text style={styles.divider}>OR</Text>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#2C4A52" />
            ) : (
              <View style={styles.buttonContent}>
                <Ionicons name="logo-google" size={20} color="#2C4A52" />
                <Text style={styles.secondaryButtonText}>Continue with Google</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton]}
            disabled
          >
            <View style={styles.buttonContent}>
              <Ionicons name="logo-apple" size={20} color="#2C4A52" />
              <Text style={[styles.secondaryButtonText]}>
                Continue with Apple
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.disclaimer}>
        We will collect personal information from and about you and use it for various purposes, including customize your HAVEN experience. Read more about your rights in our Privacy Policy.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  headline: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C4A52',
    marginBottom: 48,
    lineHeight: 36,
  },
  buttonsContainer: {
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    textAlign: 'center',
    fontSize: 14,
    color: '#2C4A52',
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 50,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#2C4A52',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.7,
  },
  disclaimer: {
    fontSize: 11,
    color: '#2C4A52',
    textAlign: 'center',
    lineHeight: 16,
    opacity: 0.7,
  },
});
