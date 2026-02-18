// apps/client/app/(auth)/emailSignup.tsx

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { supabase } from '@haven/shared-utils';
import { BackButton } from '../../components/onboarding/backButton';
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '@/contexts/onboardingContext';
import { validatePassword } from '@/utils/passwordValidation';
import { sanitizeInput } from '@/utils/sanitize';

export default function EmailSignup() {
  const { updateData } = useOnboarding();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordStrength = validatePassword(password);

  async function handleSignUp() {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (fullName.trim().length < 2) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    // Use new password validation
    if (!passwordStrength.isValid) {
      Alert.alert('Weak Password', 'Please meet all password requirements');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
      options: {
        data: {
          full_name: sanitizeInput(fullName.trim(), 100),
        }
      }
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    if (data.user || data.session) {
      updateData({ fullName: fullName.trim() });
      router.replace('/(onboarding)/gender');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <BackButton />

        <View style={styles.content}>
          <Text style={styles.title}>Create your account</Text>

          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              placeholder="Full Name"
              placeholderTextColor="#999"
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Email Address"
              placeholderTextColor="#999"
              editable={!loading}
            />

            <View>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  textContentType="newPassword"
                  autoComplete="off"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  editable={!loading}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>

              {/* Password strength indicator */}
              {password.length > 0 && (
                <View style={styles.strengthContainer}>
                  {/* Strength bar */}
                  <View style={styles.strengthBarRow}>
                    {[0, 1, 2, 3].map(i => (
                      <View
                        key={i}
                        style={[
                          styles.strengthBarSegment,
                          {
                            backgroundColor:
                              i < passwordStrength.score
                                ? passwordStrength.color
                                : '#E5E7EB',
                          },
                        ]}
                      />
                    ))}
                    <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                      {passwordStrength.label}
                    </Text>
                  </View>

                  {/* Remaining requirements */}
                  {passwordStrength.errors.map((err, i) => (
                    <View key={i} style={styles.errorRow}>
                      <Ionicons name="close-circle" size={14} color="#EF4444" />
                      <Text style={styles.errorText}>{err}</Text>
                    </View>
                  ))}

                  {/* All good */}
                  {passwordStrength.isValid && (
                    <View style={styles.errorRow}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                      <Text style={[styles.errorText, { color: '#10B981' }]}>
                        Password looks good!
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={confirmPassword}
                textContentType="newPassword"
                autoComplete="off"
                onChangeText={setConfirmPassword}
                placeholder="Re-enter password"
                placeholderTextColor="#999"
                editable={!loading}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            {/* Passwords match indicator */}
            {confirmPassword.length > 0 && (
              <View style={styles.errorRow}>
                {password === confirmPassword ? (
                  <>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={[styles.errorText, { color: '#10B981' }]}>Passwords match</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="close-circle" size={14} color="#EF4444" />
                    <Text style={styles.errorText}>Passwords do not match</Text>
                  </>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Already have an account?{' '}
                <Text
                  style={styles.footerLink}
                  onPress={() => !loading && router.push('/(auth)/login')}
                >
                  Sign in
                </Text>
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131311',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 40,
    textAlign: 'center',
  },
  formContainer: {
    gap: 16,
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  primaryButton: {
    backgroundColor: '#206E6B',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
  },
  footerLink: {
    fontWeight: '700',
    color: '#fff',
    textDecorationLine: 'underline',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 24,
    paddingRight: 56,
    borderRadius: 16,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  eyeIcon: {
    position: 'absolute',
    right: 20,
    top: 20,
    padding: 4,
  },
  strengthContainer: {
    marginTop: 8,
    gap: 4,
    paddingHorizontal: 4,
  },
  strengthBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  strengthBarSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
    width: 40,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});