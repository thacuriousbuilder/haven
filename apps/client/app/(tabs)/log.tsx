import React from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FoodLogSheet } from '@/components/foodLogSheet';
import { Colors } from '@/constants/colors';
import { Animated } from 'react-native';
import { useRef, useEffect } from 'react';

export default function LogScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleSuccess = () => {
    if (params.returnTo === 'weekly') {
      router.replace({
        pathname: '/(tabs)/weekly',
        params: { showEveningRecap: 'true' },
      });
    } else if (router.canDismiss()) {
      router.dismissAll();
    } else {
      router.push('/(tabs)/home');
    }
  };
  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FoodLogSheet
          onSuccess={handleSuccess}
          initialMethod={params.method as 'camera' | 'photo' | 'manual' | 'barcode' | null}
          initialImageBase64={params.imageBase64 as string | null}
          userNote={params.userNote as string | null}
          barcodeData={params.barcodeData as string | null}
          logDate={params.targetDate as string | undefined} 
          initialMealType={params.mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack' | null}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightCream,
  },
  keyboardView: {
    flex: 1,
  },
});