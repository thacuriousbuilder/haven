// apps/client/app/dailyCheckin.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@haven/shared-utils';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { getLocalDateString } from '@haven/shared-utils';
import { getYesterdayDateString } from '@/utils/timezone';
import { resetCheckInModal } from '@/hooks/useDailyCheckin';

export default function DailyCheckInScreen() {
  const [hasUnloggedFood, setHasUnloggedFood] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);

  useEffect(() => {
    checkIfAlreadyCheckedIn();
    return () => resetCheckInModal();
  }, []);

  const checkIfAlreadyCheckedIn = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('check_ins')
        .select('id, has_unlogged_food')
        .eq('user_id', user.id)
        .eq('check_in_date', getLocalDateString())
        .maybeSingle();

      if (error) {
        console.error('Error checking check-in status:', error);
        return;
      }

      if (data) {
        setHasCheckedIn(true);
        setHasUnloggedFood(data.has_unlogged_food);
      }
    } catch (error) {
      console.error('Error in checkIfAlreadyCheckedIn:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (hasUnloggedFood === null) return;
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Not authenticated');
        return;
      }

      const { error } = await supabase
        .from('check_ins')
        .upsert({
          user_id: user.id,
          check_in_date: getLocalDateString(),
          skipped: false,
          has_unlogged_food: hasUnloggedFood,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,check_in_date' });

      if (error) {
        console.error('Error saving check-in:', error);
        Alert.alert('Error', 'Failed to save check-in');
        return;
      }

      if (hasUnloggedFood) {
        Alert.alert('Got it!', "Let's log that food now.", [{
          text: 'OK',
          onPress: () => router.push({
            pathname: '/log',
            params: {
              targetDate: getYesterdayDateString(),
              returnTo: 'home',
            },
          }),
        }]);
      } else {
        router.back();
      }
    } catch (error) {
      console.error('Error in handleSave:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('check_ins').upsert({
          user_id: user.id,
          check_in_date: getLocalDateString(),
          skipped: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,check_in_date' });
      }
    } catch (error) {
      console.error('Error saving skip:', error);
    } finally {
      router.back();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.vividTeal} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.graphite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Check-in</Text>
        <View style={styles.headerSpacer} />
      </View>

      {hasCheckedIn && (
        <View style={styles.alreadyCheckedInBanner}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.vividTeal} />
          <Text style={styles.bannerText}>
            Already checked in today • You can update below
          </Text>
        </View>
      )}

      {/* Centered content */}
      <View style={styles.content}>
        {/* Question card */}
        <View style={styles.questionCard}>
          <View style={styles.iconWrapper}>
            <Ionicons name="restaurant" size={26} color={Colors.vividTeal} />
          </View>
          <Text style={styles.question}>
            Did you have any late-night snacks or food you forgot to log yesterday?
          </Text>
          <Text style={styles.subtitle}>
            Helps us keep your tracking accurate
          </Text>
        </View>

        {/* Tiles */}
        <View style={styles.tilesCol}>
          <TouchableOpacity
            style={[styles.tile, hasUnloggedFood === true && styles.tileSelected]}
            onPress={() => setHasUnloggedFood(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, hasUnloggedFood === true && styles.iconCircleSelected]}>
              <Ionicons
                name="fast-food"
                size={22}
                color={hasUnloggedFood === true ? '#FFFFFF' : Colors.vividTeal}
              />
            </View>
            <View style={styles.tileText}>
              <Text style={[styles.tileLabel, hasUnloggedFood === true && styles.tileLabelSelected]}>
                Yes
              </Text>
              <Text style={styles.tileSubtext}>I had unlogged food</Text>
            </View>
            {hasUnloggedFood === true && (
              <Ionicons name="checkmark-circle" size={20} color={Colors.vividTeal} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tile, hasUnloggedFood === false && styles.tileSelected]}
            onPress={() => setHasUnloggedFood(false)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, hasUnloggedFood === false && styles.iconCircleSelected]}>
              <Ionicons
                name="checkmark-circle"
                size={22}
                color={hasUnloggedFood === false ? '#FFFFFF' : Colors.vividTeal}
              />
            </View>
            <View style={styles.tileText}>
              <Text style={[styles.tileLabel, hasUnloggedFood === false && styles.tileLabelSelected]}>
                No
              </Text>
              <Text style={styles.tileSubtext}>Everything was logged</Text>
            </View>
            {hasUnloggedFood === false && (
              <Ionicons name="checkmark-circle" size={20} color={Colors.vividTeal} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.doneButton, hasUnloggedFood === null && styles.doneButtonDisabled]}
          onPress={handleSave}
          disabled={hasUnloggedFood === null || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.doneButtonText}>
              {hasCheckedIn ? 'Update' : 'Done'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightCream,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.graphite,
  },
  headerSpacer: {
    width: 40,
  },
  alreadyCheckedInBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9F8',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  bannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.vividTeal,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 16,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F9F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  question: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.graphite,
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.steelBlue,
    textAlign: 'center',
  },
  tilesCol: {
    gap: 10,
  },
  tile: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tileSelected: {
    borderColor: Colors.vividTeal,
    backgroundColor: '#F0F9F8',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F9F8',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconCircleSelected: {
    backgroundColor: Colors.vividTeal,
  },
  tileText: {
    flex: 1,
  },
  tileLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.graphite,
    marginBottom: 2,
  },
  tileLabelSelected: {
    color: Colors.vividTeal,
  },
  tileSubtext: {
    fontSize: 12,
    color: Colors.steelBlue,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  doneButton: {
    backgroundColor: Colors.vividTeal,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonDisabled: {
    opacity: 0.4,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.steelBlue,
  },
});