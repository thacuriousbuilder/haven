

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useOnboarding } from '@/contexts/onboardingContext';
import { Colors } from '@/constants/colors';

export default function AllowNotificationScreen() {
  const { updateData } = useOnboarding();
  const [loading, setLoading] = useState(false);

  const requestPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'HAVEN Updates',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: Colors.vividTeal,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  };

  const handleAllow = async () => {
    setLoading(true);
    const granted = await requestPermission();
    updateData({ notificationsEnabled: granted });
    setLoading(false);
    router.push('/newflow/mealTimes');
  };

  const handleDontAllow = () => {
    updateData({ notificationsEnabled: false });
    router.push('/newflow/mealTimes');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="notifications-outline" size={40} color={Colors.vividTeal} />
          </View>
        </View>

        <Text style={styles.title}>
          Don't miss out on important updates to hit your goals
        </Text>

        <View style={styles.permissionCard}>
          <Text style={styles.permissionTitle}>
            HAVEN would like to send you notifications
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.denyButton}
              onPress={handleDontAllow}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.denyButtonText}>Don't Allow</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.allowButton}
              onPress={handleAllow}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.allowButtonText}>Allow</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131311',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 32,
  },
  iconContainer: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E6F3F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 30,
    paddingHorizontal: 8,
  },
  permissionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.graphite,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  denyButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  denyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.graphite,
  },
  allowButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: Colors.vividTeal,
    alignItems: 'center',
  },
  allowButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});