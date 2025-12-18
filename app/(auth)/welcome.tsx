import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';

export default function Welcome() {
  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle} />
        <Text style={styles.logoText}>HAVEN</Text>
        <Text style={styles.tagline}>Enjoy Food. Hit Your Goals</Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.headline}>Progress without{'\n'}punishment</Text>
        
        {/* Placeholder for image/illustration */}
        <View style={styles.imagePlaceholder} />
      </View>

      {/* CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/(auth)/signup')}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.signInText}>
            Already have an account? <Text style={styles.signInLink}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: '#2C4A52',
    marginBottom: 12,
    // You can add segments here later or use an actual logo
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#E89278',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 14,
    color: '#2C4A52',
    marginTop: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  headline: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C4A52',
    marginBottom: 32,
    lineHeight: 40,
  },
  imagePlaceholder: {
    width: '100%',
    height: 280,
    backgroundColor: '#E89278',
    borderRadius: 20,
  },
  footer: {
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signInText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#2C4A52',
  },
  signInLink: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});