
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { BackButton } from '@/components/onboarding/backButton';
import { ScenarioCard } from '@/components/onboarding/scenarioCard';
import { WeeklyTotalCard } from '@/components/onboarding/weeklyTotalCard';
import { Colors } from '@/constants/colors';

export default function WhyWorks2Screen() {
  const handleContinue = () => {
    router.push('/(onboarding)/workouts');
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton 
        backgroundColor="#000"
        iconColor="#fff"
      />
      <ProgressBar 
        currentStep={8} 
        totalSteps={14}
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
          <Text style={styles.label}>Your Life, Your plan</Text>
          
          {/* Main Title */}
          <Text style={styles.title}>
            Saturday night shouldn't feel like cheating.
          </Text>

          {/* Scenario Cards */}
          <View style={styles.scenariosContainer}>
            <ScenarioCard
              icon="restaurant-outline"
              iconBackgroundColor="rgba(255, 255, 255, 0.2)"
              iconColor="#fff"
              title="Birthday dinner with friends"
              calories="ate 2,800 cal"
              badgeText="Planned"
              badgeColor={Colors.energyOrange}
            />

            <ScenarioCard
              icon="nutrition-outline"
              iconBackgroundColor="rgba(255, 255, 255, 0.2)"
              iconColor="#fff"
              title="Light lunch to balance it out"
              calories="ate 1,600 cal"
              badgeText="Light"
              badgeColor="#FF6B6B"
            />

            <ScenarioCard
              icon="checkmark-circle"
              iconBackgroundColor="rgba(76, 175, 80, 0.2)"
              iconColor="#4CAF50"
              title="Normal day, back on track"
              calories="ate 1,800 cal"
              badgeText="Normal"
              badgeColor="#4CAF50"
            />
          </View>

          {/* Weekly Total Card */}
          <WeeklyTotalCard
            totalCalories="12,600 Cal"
            statusText="Exactly as planned"
            statusColor="#4CAF50"
          />

          {/* Bottom Description */}
          <Text style={styles.description}>
            Dinners out. Snacks. Weekends. <Text style={styles.descriptionBold}>They're part of the plan, not mistakes.</Text>
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
    marginBottom: 24,
  },
  scenariosContainer: {
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