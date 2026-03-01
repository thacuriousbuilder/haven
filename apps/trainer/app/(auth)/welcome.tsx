import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/colors';

const WELCOME_COMPLETED_KEY = '@haven_trainer_welcome_completed';

export default function TrainerWelcome() {
  // UNCOMMENT TO RESET WELCOME 
  useEffect(() => {
    AsyncStorage.removeItem(WELCOME_COMPLETED_KEY);
  }, []);

  const [isLoading, setIsLoading] = useState(true);
  
  // Animation values for staggered entrance
  const headerTranslateY = useRef(new Animated.Value(30)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const messageTranslateY = useRef(new Animated.Value(30)).current;
  const messageOpacity = useRef(new Animated.Value(0)).current;
  const ctaTranslateY = useRef(new Animated.Value(30)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkWelcomeStatus();
  }, []);

  useEffect(() => {
    // Staggered entrance animation
    Animated.stagger(150, [
      // Header animation
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(headerTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      // Message animation
      Animated.parallel([
        Animated.timing(messageOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(messageTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      // CTA animation
      Animated.parallel([
        Animated.timing(ctaOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(ctaTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [isLoading]);

  const checkWelcomeStatus = async () => {
    try {
      const hasCompleted = await AsyncStorage.getItem(WELCOME_COMPLETED_KEY);
      if (hasCompleted === 'true') {
        router.replace('/(auth)/login');
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error checking welcome status:', error);
      setIsLoading(false);
    }
  };

  const markWelcomeCompleted = async () => {
    try {
      await AsyncStorage.setItem(WELCOME_COMPLETED_KEY, 'true');
    } catch (error) {
      console.error('Error saving welcome completion:', error);
    }
  };

  const handleGetStarted = async () => {
    await markWelcomeCompleted();
    router.push('/(auth)/signup');
  };

  const handleSignIn = async () => {
    await markWelcomeCompleted();
    router.push('/(auth)/login');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer} />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Header - Animated */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: headerOpacity,
              transform: [{ translateY: headerTranslateY }],
            },
          ]}
        >
          <Text style={styles.welcomeToText}>Welcome to</Text>
          <Text style={styles.havenText}>HAVEN</Text>
          <Text style={styles.taglineText}>Your Client's Sanctuary</Text>
        </Animated.View>

        {/* Main Message - Animated */}
        <Animated.View 
          style={[
            styles.mainMessage,
            {
              opacity: messageOpacity,
              transform: [{ translateY: messageTranslateY }],
            },
          ]}
        >
          <Text style={styles.messageText}>
            Your clients aren't failing{'\n'} <Text style={{color:Colors.energyOrange, fontSize:36, lineHeight:40, paddingHorizontal:20}}>Their plans are.</Text>
          </Text>
        </Animated.View>

        {/* CTAs - Animated */}
        <Animated.View 
          style={[
            styles.ctaContainer,
            {
              opacity: ctaOpacity,
              transform: [{ translateY: ctaTranslateY }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <Text style={styles.getStartedButtonText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleSignIn}
            activeOpacity={0.6}
          >
            <Text style={styles.signInText}>
              Already have an account? <Text style={styles.signInLink}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.vividTeal,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.vividTeal,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeToText: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '400',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  havenText: {
    fontSize: 64,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 4,
    marginBottom: 12,
  },
  taglineText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '400',
  },
  mainMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  messageText: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 40,
    paddingHorizontal: 20,
  },
  ctaContainer: {
    gap: 16,
    paddingBottom: 20,
  },
  getStartedButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    borderRadius: 100,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  getStartedButtonText: {
    color: Colors.vividTeal,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  signInText: {
    textAlign: 'center',
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '400',
  },
  signInLink: {
    fontWeight: '700',
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
});
