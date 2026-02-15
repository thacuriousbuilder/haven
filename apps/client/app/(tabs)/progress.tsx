
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

export default function ProgressScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      
        {/* Greeting */}
        <View style={styles.greetingSection}>
          <Text style={styles.greeting}>Your Progress</Text>
          <Text style={styles.subGreeting}>Track your journey to better health</Text>
        </View>

        {/* Placeholder Card */}
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="analytics" size={48} color={Colors.vividTeal} />
          </View>
          <Text style={styles.placeholderTitle}>Progress tracking coming soon</Text>
          <Text style={styles.placeholderText}>
            View your weekly trends, weight goals, and nutrition insights
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightCream,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  brandName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.vividTeal,
    letterSpacing: 0.5,
  },
  greetingSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 16,
    color: '#6B7280',
  },
  card: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E6F4F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});