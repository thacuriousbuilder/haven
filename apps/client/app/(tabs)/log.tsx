import React from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FoodLogSheet } from '@/components/foodLogSheet';
import { Colors } from '@/constants/colors';

export default function LogScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();


const handleSuccess = () => {
  if (router.canDismiss()) {
    router.dismissAll();
  } else {
    router.push('/(tabs)/home') 
  }
};
  return (
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
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
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