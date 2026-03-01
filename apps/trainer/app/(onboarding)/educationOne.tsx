
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProgressBar } from '@/components/onboarding/progressBar';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function EducationOne() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ProgressBar currentStep={1} tealBackground />

        <View style={styles.content}>
          <Text style={styles.eyebrow}>HOW IT WORKS</Text>
          <Text style={styles.title}>Weekly budgets beat daily limits.</Text>
          <Text style={styles.subtitle}>
            Your clients have lives. Birthdays, date nights, stressful days. 
            Daily calorie targets set them up to fail.
          </Text>

          {/* Traditional Approach */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="calculator-outline" size={16} color="#a8c5c4" />
              <Text style={styles.cardLabel}>TRADITIONAL APPROACH</Text>
            </View>
            <View style={styles.daysRow}>
              {DAYS.map((day, i) => (
                <View key={i} style={styles.dayCol}>
                  <View style={[
                    styles.dayBubble,
                    i === 5 ? styles.dayBubbleRed : styles.dayBubbleMuted
                  ]} />
                  <Text style={styles.dayLabel}>{day}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.cardCaption}>Saturday = guilt + "I ruined my diet"</Text>
          </View>

          {/* HAVEN Approach */}
          <View style={[styles.card, styles.cardHaven]}>
            <View style={styles.cardHeader}>
              <Ionicons name="sparkles-outline" size={16} color="#E8823A" />
              <Text style={[styles.cardLabel, styles.cardLabelHaven]}>HAVEN APPROACH</Text>
            </View>
            <View style={styles.daysRow}>
              {DAYS.map((day, i) => (
                <View key={i} style={styles.dayCol}>
                  <View style={[styles.dayBubble, styles.dayBubbleHaven]} />
                  <Text style={styles.dayLabel}>{day}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.cardCaption, styles.cardCaptionHaven]}>
              Same weekly total = real progress
            </Text>
          </View>

          <Text style={styles.footer}>
            HAVEN tracks <Text style={styles.footerBold}>weekly budgets</Text> so your 
            clients can enjoy life without derailing their goals.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/(onboarding)/clientCount')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E5C54' },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  eyebrow: { fontSize: 12, fontWeight: '700', color: '#E8823A', letterSpacing: 1.5, marginBottom: 12 },
  title: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 16, lineHeight: 40 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.75)', lineHeight: 24, marginBottom: 28 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHaven: { backgroundColor: 'rgba(0,0,0,0.15)' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  cardLabel: { fontSize: 11, fontWeight: '700', color: '#a8c5c4', letterSpacing: 1.2 },
  cardLabelHaven: { color: '#E8823A' },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  dayCol: { alignItems: 'center', gap: 6 },
  dayBubble: { width: 36, height: 36, borderRadius: 10 },
  dayBubbleMuted: { backgroundColor: 'rgba(255,255,255,0.25)' },
  dayBubbleRed: { backgroundColor: '#B85C5C' },
  dayBubbleHaven: { backgroundColor: '#C4893A' },
  dayLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  cardCaption: { fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  cardCaptionHaven: { color: '#E8823A' },
  footer: { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 22 },
  footerBold: { fontWeight: '700', color: '#fff' },
  buttonContainer: { paddingHorizontal: 24, paddingBottom: 16 },
  button: {
    backgroundColor: '#E8823A',
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});