import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import AppButton from '@/components/AppButton';
import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { signUp } from '@/lib/auth';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async () => {
    setError(null);

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const { error: authError } = await signUp(
        email.trim(),
        password,
        {
          full_name: fullName.trim(),
          role,
        }
      );

      if (authError) {
        setError(authError.message);
        return;
      }

      router.replace('/login');
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 28 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

            <View style={styles.intro}>
              <View style={styles.iconCircle}>
                <Ionicons
                  name="person-add-outline"
                  size={32}
                  color={COLORS.textOnPrimary}
                />
              </View>

              <Text style={styles.title}>Create Account</Text>

              <Text style={styles.subtitle}>
                Join QR Attendance and make recording attendance easier.
              </Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <Text style={styles.sectionSubtitle}>
                Enter your details to get started.
              </Text>

              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={20}
                    color={COLORS.danger}
                  />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Text style={styles.label}>Full Name</Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={COLORS.textSecondary}
                />
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your full name"
                  placeholderTextColor={COLORS.textSecondary}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!loading}
                  returnKeyType="next"
                />
              </View>

              <Text style={styles.label}>I am a...</Text>

              <View style={styles.roleRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.roleCard,
                    role === 'student' && styles.roleCardActive,
                  ]}
                  onPress={() => setRole('student')}
                  disabled={loading}
                >
                  <View
                    style={[
                      styles.roleIcon,
                      role === 'student' && styles.roleIconActive,
                    ]}
                  >
                    <Ionicons
                      name="school-outline"
                      size={23}
                      color={
                        role === 'student'
                          ? COLORS.textOnPrimary
                          : COLORS.textSecondary
                      }
                    />
                  </View>

                  <Text
                    style={[
                      styles.roleTitle,
                      role === 'student' && styles.roleTitleActive,
                    ]}
                  >
                    Student
                  </Text>

                  <Text style={styles.roleDescription}>
                    Record attendance
                  </Text>

                  {role === 'student' ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={19}
                      color={COLORS.primary}
                      style={styles.roleCheck}
                    />
                  ) : null}
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.roleCard,
                    role === 'teacher' && styles.roleCardActive,
                  ]}
                  onPress={() => setRole('teacher')}
                  disabled={loading}
                >
                  <View
                    style={[
                      styles.roleIcon,
                      role === 'teacher' && styles.roleIconActive,
                    ]}
                  >
                    <Ionicons
                      name="easel-outline"
                      size={23}
                      color={
                        role === 'teacher'
                          ? COLORS.textOnPrimary
                          : COLORS.textSecondary
                      }
                    />
                  </View>

                  <Text
                    style={[
                      styles.roleTitle,
                      role === 'teacher' && styles.roleTitleActive,
                    ]}
                  >
                    Teacher
                  </Text>

                  <Text style={styles.roleDescription}>
                    Manage attendance
                  </Text>

                  {role === 'teacher' ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={19}
                      color={COLORS.primary}
                      style={styles.roleCheck}
                    />
                  ) : null}
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Email Address</Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={COLORS.textSecondary}
                />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your.email@school.edu"
                  placeholderTextColor={COLORS.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!loading}
                  returnKeyType="next"
                />
              </View>

              <Text style={styles.label}>Password</Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={COLORS.textSecondary}
                />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor={COLORS.textSecondary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  returnKeyType="next"
                />
                <TouchableOpacity
                  onPress={() =>
                    setShowPassword((previous) => !previous)
                  }
                  disabled={loading}
                  style={styles.eyeButton}
                  accessibilityLabel={
                    showPassword ? 'Hide password' : 'Show password'
                  }
                >
                  <Ionicons
                    name={
                      showPassword ? 'eye-off-outline' : 'eye-outline'
                    }
                    size={21}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Confirm Password</Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={COLORS.textSecondary}
                />
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter your password"
                  placeholderTextColor={COLORS.textSecondary}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                />
                <TouchableOpacity
                  onPress={() =>
                    setShowConfirmPassword((previous) => !previous)
                  }
                  disabled={loading}
                  style={styles.eyeButton}
                  accessibilityLabel={
                    showConfirmPassword
                      ? 'Hide confirm password'
                      : 'Show confirm password'
                  }
                >
                  <Ionicons
                    name={
                      showConfirmPassword
                        ? 'eye-off-outline'
                        : 'eye-outline'
                    }
                    size={21}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.buttonContainer}>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator
                      size="small"
                      color={COLORS.primary}
                    />
                    <Text style={styles.loadingText}>
                      Creating your account...
                    </Text>
                  </View>
                ) : (
                  <AppButton
                    theme="primary"
                    title="Create Account"
                    icon="person-add-outline"
                    onPress={handleRegister}
                  />
                )}
              </View>

              <View style={styles.loginRow}>
                <Text style={styles.loginText}>
                  Already have an account?
                </Text>
                <Link href="/login" asChild>
                  <TouchableOpacity disabled={loading}>
                    <Text style={styles.loginLink}> Sign In</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>

            <View style={styles.footer}>
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color={COLORS.textSecondary}
              />
              <Text style={styles.footerText}>
                Your account details are handled securely.
              </Text>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingBottom: 28,
    paddingTop:20,
  },

  headerContainer: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 22,
  },

  intro: {
    alignItems: 'center',
    marginBottom: 25,
  },

  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 23,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },

  title: {
    fontSize: 27,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
  },

  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 21,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    marginTop: 5,
    marginBottom: 17,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    marginTop: 15,
  },

  inputContainer: {
    minHeight: 53,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
  },

  input: {
    flex: 1,
    height: 51,
    paddingHorizontal: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
  },

  eyeButton: {
    padding: 5,
    marginLeft: 3,
  },

  roleRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },

  roleCard: {
    flex: 1,
    minHeight: 137,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 7,
    position: 'relative',
  },

  roleCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '14',
    borderWidth: 1.5,
  },

  roleIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.border,
    marginBottom: 9,
  },

  roleIconActive: {
    backgroundColor: COLORS.primary,
  },

  roleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },

  roleTitleActive: {
    color: COLORS.textPrimary,
  },

  roleDescription: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },

  roleCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },

  errorText: {
    flex: 1,
    color: COLORS.danger,
    fontSize: 13,
    lineHeight: 19,
  },

  buttonContainer: {
    marginTop: 25,
  },

  loadingContainer: {
    minHeight: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },

  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },

  loginRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },

  loginText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  loginLink: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 22,
    paddingHorizontal: 8,
  },

  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});