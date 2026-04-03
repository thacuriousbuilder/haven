

import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { signInWithApple, signInWithGoogle } from '../../lib/auth';
import { BackButton } from '../../components/onboarding/backButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useOnboarding } from '@/contexts/onboardingContext';

export default function Signup() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const { data, updateData } = useOnboarding();

  const getPostSignupRoute = () => {
    if (data.planPath === 'estimate') {
      return '/newflow/manualPlan';
    }
    return '/newflow/interstitial3';
  };

  async function handleGoogleSignIn() {
    try {
      setGoogleLoading(true);
      const authData = await signInWithGoogle();
      
     
      const fullName = authData.user?.user_metadata?.full_name || 
                       authData.user?.user_metadata?.name || '';
      const firstName = authData.user?.user_metadata?.given_name || 
                        fullName.split(' ')[0] || '';
      const lastName = authData.user?.user_metadata?.family_name || 
                       fullName.split(' ').slice(1).join(' ') || '';
  
      updateData({ firstName, lastName });
      router.replace(getPostSignupRoute());
    } catch (error: any) {
      if (error.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert('Error', error.message || 'Google sign-in failed');
      }
    } finally {
      setGoogleLoading(false);
    }
  }
  

  async function handleAppleSignIn() {
    try {
      setAppleLoading(true);
      const authData = await signInWithApple();

      const firstName = authData.user?.user_metadata?.given_name || 
                        authData.user?.user_metadata?.first_name || '';
      const lastName = authData.user?.user_metadata?.family_name || 
                       authData.user?.user_metadata?.last_name || '';
  
      updateData({ firstName, lastName });
      router.replace(getPostSignupRoute());
    } catch (error: any) {
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Error', error.message || 'Apple sign-in failed');
      }
    } finally {
      setAppleLoading(false);
    }
  }

  const handleEmailSignup = () => {
    // Pass the post-signup route so email signup knows where to go
    router.push({
      pathname: '/(auth)/emailSignup',
      params: { returnTo: getPostSignupRoute() },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <BackButton />

      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Get started with your plan!</Text>
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleEmailSignup}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Continue with Email</Text>
          </TouchableOpacity>

          <Text style={styles.divider}>OR</Text>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
            activeOpacity={0.8}
          >
            {googleLoading ? (
              <ActivityIndicator color={Colors.vividTeal} />
            ) : (
              <View style={styles.buttonContent}>
                <Ionicons name="logo-google" size={20} color={Colors.vividTeal} />
                <Text style={styles.socialButtonText}>Continue with Google</Text>
              </View>
            )}
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.socialButton}
              onPress={handleAppleSignIn}
              disabled={appleLoading}
              activeOpacity={0.8}
            >
              {appleLoading ? (
                <ActivityIndicator color={Colors.vividTeal} />
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="logo-apple" size={20} color={Colors.vividTeal} />
                  <Text style={styles.socialButtonText}>Continue with Apple</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={styles.disclaimer}>
        We will collect personal information from and about you and use it for various purposes, including customize your HAVEN experience. Read more about your rights in our Privacy Policy.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131311',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 48,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 36,
  },
  buttonsContainer: {
    gap: 16,
  },
  primaryButton: {
    backgroundColor: Colors.vividTeal,
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  divider: {
    textAlign: 'center',
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginVertical: 4,
  },
  socialButton: {
    backgroundColor: '#fff',
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  socialButtonText: {
    color: Colors.vividTeal,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  disclaimer: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 10,
  },
});


