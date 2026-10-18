
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '@/constants/colors';
import { useAuth, signOut } from '@/lib/auth';
import { getProfile, updateProfile, type Profile } from '@/lib/profile';

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftName, setDraftName] = useState('');
  const [editing, setEditing] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);

    try {
      const result = await getProfile(user.id);
      setProfile(result);
      setDraftName(result?.full_name ?? '');
    } catch {
      Alert.alert('Unable to load profile', 'Please try again.');
    } finally {
      setLoadingProfile(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleSaveName = async () => {
    if (!user || saving) return;

    const cleanedName = draftName.trim();

    if (!cleanedName) {
      Alert.alert('Name required', 'Please enter your name before saving.');
      return;
    }

    if (cleanedName.length > 80) {
      Alert.alert('Name too long', 'Please use 80 characters or fewer.');
      return;
    }

    setSaving(true);

    try {
      const { error } = await updateProfile(user.id, {
        full_name: cleanedName,
      });

      if (error) {
        Alert.alert('Unable to save', error);
        return;
      }

      setProfile((current) =>
        current ? { ...current, full_name: cleanedName } : current
      );
      setDraftName(cleanedName);
      setEditing(false);
      Alert.alert('Success', 'Your name has been updated.');
    } catch {
      Alert.alert('Error', 'Something went wrong while saving your name.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setDraftName(profile?.full_name ?? '');
    setEditing(false);
  };

  const handleSignOut = () => {
    if (signingOut) return;

    Alert.alert(
      'Sign out?',
      'Are you sure you want to sign out of your account?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);

            try {
              const { error } = await signOut();

              if (error) {
                Alert.alert(
                  'Sign-out issue',
                  error.message || 'Unable to sign out. Please try again.'
                );
                return;
              }

              router.replace('/login');
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : 'Please try again.';

              Alert.alert('Unable to sign out', message);
            } finally {
              setSigningOut(false);
            }
          },
        },
      ]
    );
  };

  const fullName = profile?.full_name?.trim() || 'Your Name';
  const initials =
    fullName === 'Your Name'
      ? '?'
      : fullName
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part.charAt(0).toUpperCase())
          .join('');

  const roleLabel =
    profile?.role === 'teacher' ? 'Teacher' : 'Student';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headingRow}>
        <View>
          <Text style={styles.title}>My Profile</Text>
          <Text style={styles.subtitle}>
            Manage your account information
          </Text>
        </View>

        <View style={styles.headingIcon}>
          <Ionicons
            name="person-outline"
            size={23}
            color={COLORS.primary}
          />
        </View>
      </View>

      {loadingProfile ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      ) : !user ? (
        <View style={styles.infoCard}>
          <Text style={styles.value}>No account is currently signed in.</Text>
        </View>
      ) : (
        <>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>

            <Text style={styles.profileName}>{fullName}</Text>

            <View
              style={[
                styles.roleBadge,
                profile?.role === 'teacher'
                  ? styles.teacherBadge
                  : styles.studentBadge,
              ]}
            >
              <Ionicons
                name={
                  profile?.role === 'teacher'
                    ? 'school-outline'
                    : 'person-outline'
                }
                size={14}
                color={COLORS.textOnPrimary}
              />
              <Text style={styles.roleText}>{roleLabel}</Text>
            </View>

            <Text style={styles.profileCaption}>
              QR Attendance Account
            </Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.sectionHeading}>
              <Ionicons
                name="person-circle-outline"
                size={21}
                color={COLORS.primary}
              />
              <Text style={styles.sectionTitle}>Personal Information</Text>
            </View>

            <View style={styles.divider} />

            <Text style={styles.label}>Full Name</Text>

            {editing ? (
              <>
                <TextInput
                  value={draftName}
                  onChangeText={setDraftName}
                  style={styles.nameInput}
                  placeholder="Enter your full name"
                  placeholderTextColor={COLORS.textSecondary}
                  autoCapitalize="words"
                  maxLength={80}
                  editable={!saving}
                  returnKeyType="done"
                  onSubmitEditing={handleSaveName}
                />

                <View style={styles.editActions}>
                  <Pressable
                    onPress={handleCancelEdit}
                    disabled={saving}
                    style={({ pressed }) => [
                      styles.cancelButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleSaveName}
                    disabled={saving}
                    style={({ pressed }) => [
                      styles.saveButton,
                      (pressed || saving) && styles.pressed,
                    ]}
                  >
                    {saving ? (
                      <ActivityIndicator
                        size="small"
                        color={COLORS.textOnPrimary}
                      />
                    ) : (
                      <Ionicons
                        name="checkmark"
                        size={17}
                        color={COLORS.textOnPrimary}
                      />
                    )}
                    <Text style={styles.saveButtonText}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <View style={styles.nameRow}>
                <Text style={styles.value}>{fullName}</Text>

                <Pressable
                  onPress={() => setEditing(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Edit your name"
                  style={({ pressed }) => [
                    styles.editButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons
                    name="create-outline"
                    size={17}
                    color={COLORS.primary}
                  />
                  <Text style={styles.editButtonText}>Edit</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.fieldSpacing} />

            <Text style={styles.label}>Account Role</Text>
            <Text style={styles.value}>{roleLabel}</Text>
          </View>

          <View style={styles.tipCard}>
            <Ionicons
              name="shield-checkmark-outline"
              size={23}
              color={COLORS.primary}
            />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Account Privacy</Text>
              <Text style={styles.tipText}>
                Your profile screen displays your name and role without
                showing your email address or internal user ID.
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleSignOut}
            disabled={signingOut}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.signOutButton,
              (pressed || signingOut) && styles.pressed,
            ]}
          >
            {signingOut ? (
              <ActivityIndicator
                size="small"
                color={COLORS.danger}
              />
            ) : (
              <Ionicons
                name="log-out-outline"
                size={21}
                color={COLORS.danger}
              />
            )}

            <Text style={styles.signOutText}>
              {signingOut ? 'Signing out...' : 'Sign Out'}
            </Text>
          </Pressable>

          <Text style={styles.footerText}>QR Attendance App</Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    marginTop: 5,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  headingIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    paddingVertical: 27,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 18,
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarText: {
    fontSize: 27,
    fontWeight: '800',
    color: COLORS.primary,
  },
  profileName: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.textOnPrimary,
    textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
  },
  teacherBadge: {
    backgroundColor: '#744C3C',
  },
  studentBadge: {
    backgroundColor: '#744C3C',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  profileCaption: {
    color: '#F0DFD8',
    fontSize: 12,
    marginTop: 12,
  },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginTop: 15,
    marginBottom: 17,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 7,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 9,
    backgroundColor: COLORS.surface,
  },
  editButtonText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  nameInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    paddingHorizontal: 13,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
    fontSize: 15,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 9,
    marginTop: 12,
  },
  cancelButton: {
    minHeight: 42,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  saveButton: {
    minHeight: 42,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    color: COLORS.textOnPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  fieldSpacing: {
    height: 19,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
    marginBottom: 20,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 5,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  signOutButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: '#E8C7C4',
    borderRadius: 14,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.danger,
  },
  pressed: {
    opacity: 0.7,
  },
  loadingCard: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    gap: 12,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  footerText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});
