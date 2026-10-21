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
import { signIn } from '@/lib/auth';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      const { error: authError } = await signIn(
        email.trim(),
        password
      );

      if (authError) {
        setError(authError.message);
      } else {
        router.replace('/(tabs)');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + 12,
              paddingBottom: insets.bottom + 24,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          
         <View style={styles.content}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Ionicons
                  name="qr-code"
                  size={42}
                  color={COLORS.textOnPrimary}
                />
              </View>

              <Text style={styles.brandName}>QR Attendance</Text>
              <Text style={styles.brandSubtitle}>
                Attendance made simple.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.welcomeTitle}>
                Welcome back!
              </Text>

              <Text style={styles.description}>
                Sign in to continue to your account.
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

              <Text style={styles.label}>Email address</Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={COLORS.textSecondary}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={COLORS.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
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
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!loading}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
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
                      showPassword
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
                      Signing in...
                    </Text>
                  </View>
                ) : (
                  <AppButton
                    title="Sign In"
                    icon="log-in-outline"
                    theme="primary"
                    onPress={handleLogin}
                  />
                )}
              </View>

              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.divider} />
              </View>

              <View style={styles.registerRow}>
                <Text style={styles.registerText}>
                  Don't have an account?
                </Text>

                <Link href="/register" asChild>
                  <TouchableOpacity disabled={loading}>
                    <Text style={styles.registerLink}>
                      {' '}Create one
                    </Text>
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
                Secure access to your attendance account
              </Text>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 20,
  },

  logoContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },

  logoCircle: {
    width: 82,
    height: 82,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    elevation: 4,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },

  brandName: {
    fontSize: 25,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.3,
  },

  brandSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 6,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
  },

  welcomeTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 7,
    marginBottom: 25,
    lineHeight: 21,
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 9,
  },

  inputContainer: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 20,
  },

  input: {
    flex: 1,
    height: 52,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingHorizontal: 11,
  },

  eyeButton: {
    padding: 5,
    marginLeft: 4,
  },

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },

  errorText: {
    flex: 1,
    color: COLORS.danger,
    fontSize: 13,
    lineHeight: 19,
  },

  buttonContainer: {
    marginTop: 5,
  },

  loadingContainer: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 12,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },

  dividerText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },

  registerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },

  registerText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  registerLink: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 24,
    paddingHorizontal: 8,
  },

  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});