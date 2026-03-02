
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/colors';



const WELCOME_COMPLETED_KEY = '@haven_welcome_completed';


const WELCOME_SCREENS = [
  {
    id: 1,
    lines: [
      { text: "You've tried", style: 'subtitle' as const },
      { text: 'counting calories', style: 'title' as const },
    ],
  },
  {
    id: 2,
    lines: [
      { text: 'The Restriction.', style: 'subtitle' as const },
      { text: 'The guilt.', style: 'title' as const },
      { text: 'The starting over on Monday.', style: 'subtitle' as const },
    ],
  },
  {
    id: 3,
    lines: [
      { text: 'What if the problem', style: 'subtitle' as const },
      { text: 'was never you?', style: 'title' as const },
    ],
  },
  {
    id: 4,
    lines: [
      { text: 'It was', style: 'subtitle' as const },
      { text: 'the plan.', style: 'titleTeal' as const },
    ],
  },
];

// Animated Progress Dot Component
function AnimatedProgressDot({ index, currentIndex }: { index: number; currentIndex: number }) {
  const scale = useRef(new Animated.Value(index === 0 ? 1 : 0.8)).current;
  const opacity = useRef(new Animated.Value(index === 0 ? 1 : 0.4)).current;

  useEffect(() => {
    const isActive = index <= currentIndex;
    
    Animated.parallel([
      Animated.spring(scale, {
        toValue: isActive ? 1 : 0.8,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: isActive ? 1 : 0.4,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentIndex, index]);

  return (
    <Animated.View
      style={[
        styles.progressDot,
        index <= currentIndex ? styles.progressDotActive : styles.progressDotInactive,
        {
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  );
}

export default function Welcome() {
    // UNCOMMENT TO RESET WELCOME 
  // useEffect(() => {
  //   AsyncStorage.removeItem('@haven_welcome_completed');
  // }, []);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Animation value for screen transitions
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Animation values for final screen staggered entrance
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
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [currentIndex]);


  useEffect(() => {
    if (currentIndex === 4) {
      // Reset values
      headerTranslateY.setValue(30);
      headerOpacity.setValue(0);
      messageTranslateY.setValue(30);
      messageOpacity.setValue(0);
      ctaTranslateY.setValue(30);
      ctaOpacity.setValue(0);

      // Staggered entrance
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
    }
  }, [currentIndex]);

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

  const handleContinue = () => {
    if (currentIndex < 4) {
      
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
       
        setCurrentIndex(currentIndex + 1);
        
      });
    }
  };

 
  if (isLoading) {
    return (
      <View style={styles.loadingContainer} />
    );
  }

 
  if (currentIndex < 4) {
    const screen = WELCOME_SCREENS[currentIndex];
    
    return (
      <TouchableOpacity 
        style={styles.darkContainer} 
        activeOpacity={1}
        onPress={handleContinue}
      >
        <SafeAreaView style={styles.darkContainer} edges={['top', 'bottom']}>
         
          <View style={styles.progressContainer}>
            {[0, 1, 2, 3].map((index) => (
              <AnimatedProgressDot 
                key={index} 
                index={index} 
                currentIndex={currentIndex} 
              />
            ))}
          </View>

        
          <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
            {screen.lines.map((line, index) => (
              <Text
                key={index}
                style={[
                  styles.text,
                  line.style === 'title' && styles.titleText,
                  line.style === 'subtitle' && styles.subtitleText,
                  line.style === 'titleTeal' && styles.titleTealText,
                ]}
              >
                {line.text}
              </Text>
            ))}
          </Animated.View>

          
          <Animated.View style={[styles.tapPrompt, { opacity: fadeAnim }]}>
            <Text style={styles.tapPromptText}>Tap to continue</Text>
          </Animated.View>
        </SafeAreaView>
      </TouchableOpacity>
    );
  }


  return (
    <SafeAreaView style={styles.tealContainer} edges={['top', 'bottom']}>
      <View style={styles.tealContent}>

        <Animated.View 
          style={[
            styles.welcomeHeader,
            {
              opacity: headerOpacity,
              transform: [{ translateY: headerTranslateY }],
            },
          ]}
        >
          <Text style={styles.welcomeToText}>Welcome to</Text>
          <Text style={styles.havenText}>HAVEN</Text>
          <Text style={styles.taglineText}>Enjoy Food. Hit Your Goals</Text>
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
          <Text style={styles.treatText}>
            TREAT{' '}
            <Text style={styles.cheatStrikethrough}>"Cheat"</Text>{' '}
            days are{'\n'}part of the plan
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
    backgroundColor: '#131311',
  },

  darkContainer: {
    flex: 1,
    backgroundColor: '#131311',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingTop: 20,
    paddingBottom: 40,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  progressDotActive: {
    backgroundColor: Colors.vividTeal,
  },
  progressDotInactive: {
    backgroundColor: '#404040',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  text: {
    textAlign: 'center',
    fontSize: 32,
    lineHeight: 42,
    marginBottom:40,
  },
  subtitleText: {
    color: '#999999',
    fontWeight: '300',
  },
  titleText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  titleTealText: {
    color: Colors.vividTeal,
    fontWeight: '700',
  },
  tapPrompt: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  tapPromptText: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '400',
  },

  // Teal screen (5)
  tealContainer: {
    flex: 1,
    backgroundColor: Colors.vividTeal,
  },
  tealContent: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 40,
  },
  welcomeHeader: {
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
    flex:1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  treatText: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 44,
    paddingHorizontal: 20,
  },
  cheatStrikethrough: {
    color: Colors.energyOrange,
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
    textDecorationColor: Colors.energyOrange,
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
    textDecorationLine: 'underline'
  },
});