
import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { BackButton } from '@/components/onboarding/backButton';

export default function WhyWorks2Screen() {
  const handleContinue = () => {
    router.push('/(onboarding)/whyWorks3');
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={11} totalSteps={14} />
      
      <View style={styles.content}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Real life included</Text>
          
          <Text style={styles.description}>
            Dinners out. Drinks. Weekends. They're part of the plan, not mistakes.
          </Text>

   
          <View style={styles.illustration}>
            <Image 
                source={require('@/assets/images/whyWorks/whyWorks2.png')}
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
    backgroundColor: '#fff',
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    lineHeight: 36,
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    color: '#000',
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
  continueButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});