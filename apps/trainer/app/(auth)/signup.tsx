
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { BackButton } from '../../components/backButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';

export default function Signup() {
  // const [googleLoading, setGoogleLoading] = useState(false);

  // async function handleGoogleSignIn() {
  //   try {
  //     setGoogleLoading(true);
  //     const session = await signInWithGoogle();
      
  //     if (session) {
  //       router.replace('/(tabs)/home');
  //     }
  //   } catch (error: any) {
  //     Alert.alert('Error', error.message || 'Google sign-in failed');
  //   } finally {
  //     setGoogleLoading(false);
  //   }
  // }

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom']}>
      <BackButton />
      
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Create your account</Text>
          
          <Text style={styles.headline}>
            Your goals shouldn't ruin your{' '}
            <Text style={styles.highlightText}>Saturday night.</Text>
          </Text>
          
          <Text style={styles.bodyText}>
            That's why HAVEN plans calories weekly
          </Text>
        </View>

        <View style={styles.buttonsContainer}>
       
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(auth)/emailSignup')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </TouchableOpacity>

          <Text style={styles.divider}>OR</Text>

         
          <TouchableOpacity
            style={styles.socialButton}
            onPress={()=> console.log('pressed')}
            disabled
            activeOpacity={0.8}
          >
            {1==1 ? (
              <ActivityIndicator color={Colors.vividTeal}/>
            ) : (
              <View style={styles.buttonContent}>
                <Ionicons name="logo-google" size={20} color={Colors.vividTeal}/>
                <Text style={styles.socialButtonText}>Continue with Google</Text>
              </View>
            )}
          </TouchableOpacity>

 
          <TouchableOpacity
            style={styles.socialButton}
            disabled
            activeOpacity={1}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="logo-apple" size={20} color={Colors.vividTeal}/>
              <Text style={styles.socialButtonText}>Continue with Apple</Text>
            </View>
          </TouchableOpacity>
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
    gap: 16,
    alignItems:"center"
  },
  title: {
    fontSize: 20,
    fontWeight: '400',
    color: '#fff',
    marginBottom: 8,
  },
  headline: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: 36,
  },
  highlightText: {
    color: '#206E6B', 
  },
  bodyText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
    marginTop: 8,
    alignItems:"center"
  },
  

  buttonsContainer: {
    gap: 16,
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
  
  disabledButton: {
    opacity: 0.5,
  },
  
  disclaimer: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
    opacity: 0.8,
    marginTop: 10
  },
});