
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { BackButton } from '@/components/onboarding/backButton';
import { ApproachComparisonCard } from '@/components/onboarding/approachComparisonCard';
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
          {/* Label */}
          <Text style={styles.label}>The HAVEN Approach</Text>
          
          {/* Main Title */}
          <Text style={styles.title}>
            Most apps guess. HAVEN listens
          </Text>
          
          {/* Subheading */}
          <Text style={styles.subheading}>
            Other apps plug your stats into a formula and call it a day. That number could be off by <Text style={styles.subheadingBold}>hundreds of calories</Text>
          </Text>

          {/* Comparison Cards */}
          <View style={styles.comparisonContainer}>
            <ApproachComparisonCard
              icon="close-circle"
              iconColor={Colors.energyOrange}
              title="OTHER APPS"
              titleColor="rgba(255, 255, 255, 0.5)"
              calories="2,200"
              badge="Estimated"
              badgeColor={Colors.energyOrange}
              description="Age + Height + Weight"
              descriptionHighlight="= generic estimate"
              backgroundColor="rgba(255, 255, 255, 0.12)"
            />

            <ApproachComparisonCard
              icon="checkmark-circle"
              iconColor="#4CAF50"
              title="HAVEN"
              titleColor="#4CAF50"
              calories="2,450"
              badge="PERSONAL"
              badgeColor="#4CAF50"
              description="7 days of your"
              descriptionHighlight="real eating + movement = your actual maintenance"
              backgroundColor="rgba(0, 0, 0, 0.25)"
            />
          </View>

          {/* Bottom Description */}
          <Text style={styles.description}>
            That 250 calorie difference is everything. It's the reason diets feel impossible. <Text style={styles.descriptionBold}>HAVEN gets it right from the start.</Text>
          </Text>
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
    backgroundColor: Colors.vividTeal,
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
    color: Colors.energyOrange,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 32,
    marginBottom: 16,
  },
  subheading: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 22,
    marginBottom: 24,
  },
  subheadingBold: {
    fontWeight: '700',
    color: '#fff',
  },
  comparisonContainer: {
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 24,
    marginTop: 16,
    marginBottom: 16,
  },
  descriptionBold: {
    fontWeight: '700',
    color: '#fff',
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