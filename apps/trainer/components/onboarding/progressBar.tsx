
import { View, StyleSheet } from 'react-native';
interface ProgressBarProps {
  currentStep: number; // 1-5
  totalSteps?: number;
  tealBackground?: boolean; // switches color for teal screens
}

export function ProgressBar({ 
  currentStep, 
  totalSteps = 5,
  tealBackground = false 
}: ProgressBarProps) {
  const progress = currentStep / totalSteps;

  return (
    <View style={styles.container}>
      <View style={[
        styles.track,
        tealBackground ? styles.trackTeal : styles.trackDark
      ]}>
        <View style={[
          styles.fill,
          tealBackground ? styles.fillTeal : styles.fillDark,
          { width: `${progress * 100}%` }
        ]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  trackDark: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  trackTeal: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  fillDark: {
    backgroundColor: '#fff',
  },
  fillTeal: {
    backgroundColor: '#fff',
  },
});