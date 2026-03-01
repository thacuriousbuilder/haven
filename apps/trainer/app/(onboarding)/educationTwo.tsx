
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProgressBar } from '@/components/onboarding/progressBar';

const MOCK_CLIENTS = [
  { initials: 'AM', name: 'Alex M.', status: 'Crushing it this week', dot: '#4CAF50' },
  { initials: 'JK', name: 'Jordan K.', status: 'Day 3 of baseline', dot: '#E8823A' },
  { initials: 'ST', name: 'Sam T.', status: 'Missed 2 days', dot: '#E05252' },
];

export default function EducationTwo() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ProgressBar currentStep={4} tealBackground />

        <View style={styles.content}>
          <Text style={styles.eyebrow}>YOUR COMMAND CENTER</Text>
          <Text style={styles.title}>One dashboard.{'\n'}Every client.</Text>
          <Text style={styles.subtitle}>
            See who's on track, who needs help, and intervene before they struggle.
          </Text>

          {/* Mock Dashboard Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>ACTIVE CLIENTS</Text>
              <Text style={styles.viewAll}>View all</Text>
            </View>

            {MOCK_CLIENTS.map((client, i) => (
              <View key={i} style={styles.clientRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{client.initials}</Text>
                </View>
                <View style={styles.clientInfo}>
                  <View style={styles.clientNameRow}>
                    <Text style={styles.clientName}>{client.name}</Text>
                    <View style={[styles.statusDot, { backgroundColor: client.dot }]} />
                  </View>
                  <Text style={styles.clientStatus}>{client.status}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
              </View>
            ))}

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Ionicons name="people-outline" size={20} color="#E8823A" />
                <Text style={styles.statNumber}>12</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
              <View style={styles.statBox}>
                <Ionicons name="trending-up-outline" size={20} color="#E8823A" />
                <Text style={styles.statNumber}>83%</Text>
                <Text style={styles.statLabel}>On track</Text>
              </View>
              <View style={styles.statBox}>
                <Ionicons name="notifications-outline" size={20} color="#E8823A" />
                <Text style={styles.statNumber}>2</Text>
                <Text style={styles.statLabel}>Need help</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/(onboarding)/complete')}
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
    borderRadius: 20,
    padding: 16,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 1.2 },
  viewAll: { fontSize: 13, fontWeight: '600', color: '#E8823A' },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  clientInfo: { flex: 1 },
  clientNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  clientName: { color: '#fff', fontWeight: '600', fontSize: 14 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  clientStatus: { color: 'rgba(255,255,255,0.55)', fontSize: 12 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  statNumber: { color: '#fff', fontWeight: '800', fontSize: 18 },
  statLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 11 },
  buttonContainer: { paddingHorizontal: 24, paddingBottom: 16 },
  button: {
    backgroundColor: '#E8823A',
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});