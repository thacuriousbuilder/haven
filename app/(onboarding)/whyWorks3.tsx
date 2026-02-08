import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { BackButton } from '@/components/onboarding/backButton';
import { Colors } from '@/constants/colors';

export default function WhyWorks3Screen() {
  const handleContinue = () => {
    router.push('/(onboarding)/commitment');
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton 
        backgroundColor="#000"
        iconColor="#fff"
      />
      <ProgressBar 
        currentStep={13} 
        totalSteps={15}
        backgroundColor="rgba(255, 255, 255, 0.3)"
        fillColor="#fff"
      />
      
      <View style={styles.content}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        
          <Text style={styles.label}>The HAVEN Approach</Text>
          
          <Text style={styles.title}>First, we learn you</Text>
          
          <Text style={styles.description}>
            Before giving advice, HAVEN needs to understand how you normally eat.
          </Text>

          <View style={styles.illustration}>
            <Image 
              source={require('@/assets/images/whyWorks/whyWorks3.png')}
              style={styles.illustrationImage}
              resizeMode="contain"
            />
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#206E6B',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF7828', 
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff', 
    lineHeight: 36,
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
    marginBottom: 16,
  },
  illustration: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 24,
  },
  illustrationImage: {
    width: '100%',
    height: 280,
  },
  buttonContainer: {
    paddingBottom: 24,
    paddingTop: 16,
  },
  continueButton: {
    backgroundColor: '#fff', 
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonText: {
    color: Colors.graphite, 
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});