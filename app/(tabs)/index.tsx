
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile, type Profile } from '@/lib/profile';

type ActionCardProps = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  primary?: boolean;
};

function ActionCard({
  title,
  description,
  icon,
  onPress,
  primary = false,
}: ActionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.actionCard,
        primary && styles.primaryAction,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.actionIcon,
          primary && styles.primaryActionIcon,
        ]}
      >
        <Ionicons
          name={icon}
          size={24}
          color={primary ? COLORS.textOnPrimary : COLORS.primary}
        />
      </View>

      <View style={styles.actionTextContainer}>
        <Text
          style={[
            styles.actionTitle,
            primary && styles.primaryActionTitle,
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.actionDescription,
            primary && styles.primaryActionDescription,
          ]}
        >
          {description}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={primary ? COLORS.textOnPrimary : COLORS.textSecondary}
      />
    </Pressable>
  );
}

export default function Index() {
  const router = useRouter();
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadDashboard() {
        if (!user) {
          setProfile(null);
          setLoading(false);
          return;
        }

        setLoading(true);

        try {
          const result = await getProfile(user.id);

          if (active) {
            setProfile(result);
          }
        } catch (error) {
          console.error('Failed to load dashboard profile:', error);
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }

      loadDashboard();

      return () => {
        active = false;
      };
    }, [user])
  );

  const isTeacher = profile?.role === 'teacher';
  const firstName =
    profile?.full_name?.trim().split(/\s+/)[0] || 'there';

  const today = new Date().toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <View>
            <Text style={styles.brand}>QR ATTENDANCE</Text>
            <Text style={styles.date}>{today}</Text>
          </View>

          <Pressable
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            style={({ pressed }) => [
              styles.profileButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="person-circle-outline"
              size={31}
              color={COLORS.primary}
            />
          </Pressable>
        </View>

        <View style={styles.welcomeCard}>
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeEyebrow}>
              YOUR ATTENDANCE, SIMPLIFIED
            </Text>

            <Text style={styles.welcomeTitle}>
              Hello, {loading ? '...' : firstName}!
            </Text>

            <Text style={styles.welcomeDescription}>
              {isTeacher
                ? 'Manage your school events and keep track of attendance.'
                : 'Ready for your next school activity? Record and check your attendance here.'}
            </Text>

            {!loading && profile && (
              <View style={styles.roleBadge}>
                <Ionicons
                  name={isTeacher ? 'school-outline' : 'person-outline'}
                  size={14}
                  color={COLORS.textOnPrimary}
                />
                <Text style={styles.roleBadgeText}>
                  {isTeacher ? 'Teacher Account' : 'Student Account'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.welcomeIllustration}>
            <Ionicons
              name="qr-code"
              size={55}
              color={COLORS.textOnPrimary}
            />
            <Ionicons
              name="checkmark-circle"
              size={23}
              color="#F3D5A6"
              style={styles.checkIcon}
            />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Text style={styles.sectionSubtitle}>
            Choose what you want to do
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>
              Loading your account...
            </Text>
          </View>
        ) : (
          <>
            {isTeacher && (
              <ActionCard
                title="Manage Events"
                description="Create events and display attendance QR codes"
                icon="calendar-outline"
                onPress={() => router.push('/teacher')}
                primary
              />
            )}

            {!isTeacher && (
              <ActionCard
                title="Scan QR Code"
                description="Record your attendance at a school event"
                icon="qr-code-outline"
                onPress={() => router.push('/scan')}
                primary
              />
            )}

            <ActionCard
              title="Attendance History"
              description={
                isTeacher
                  ? 'Review event attendance and attendee lists'
                  : 'Check the events you have attended'
              }
              icon="time-outline"
              onPress={() => router.push('/history')}
            />

            {isTeacher && (
              <ActionCard
                title="Scan QR Code"
                description="Open the scanner if you need to record attendance"
                icon="scan-outline"
                onPress={() => router.push('/scan')}
              />
            )}

            <ActionCard
              title="My Profile"
              description="View your account information and edit your name"
              icon="person-outline"
              onPress={() => router.push('/profile')}
            />
          </>
        )}

        <View style={styles.reminderCard}>
          <Ionicons
            name="information-circle-outline"
            size={22}
            color={COLORS.primary}
          />

          <View style={styles.reminderTextContainer}>
            <Text style={styles.reminderTitle}>Attendance Reminder</Text>
            <Text style={styles.reminderText}>
              {isTeacher
                ? 'Check your event details before displaying a QR code to students.'
                : 'Scan the official QR code for your event and make sure your attendance is recorded successfully.'}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          QR Attendance App · School Event Management
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  brand: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    color: COLORS.primary,
  },
  date: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  profileButton: {
    width: 47,
    height: 47,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
  },
  welcomeCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 23,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    overflow: 'hidden',
  },
  welcomeTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  welcomeEyebrow: {
    color: '#F3D5A6',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 10,
  },
  welcomeTitle: {
    color: COLORS.textOnPrimary,
    fontSize: 27,
    fontWeight: '900',
    marginBottom: 9,
  },
  welcomeDescription: {
    color: '#F8EAE4',
    fontSize: 12,
    lineHeight: 19,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#744C3C',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 15,
  },
  roleBadgeText: {
    color: COLORS.textOnPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  welcomeIllustration: {
    width: 76,
    height: 76,
    borderRadius: 23,
    backgroundColor: '#744C3C',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
  },
  checkIcon: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },
  sectionHeader: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    padding: 15,
    marginBottom: 12,
    minHeight: 91,
  },
  primaryAction: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  actionIcon: {
    width: 47,
    height: 47,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    marginRight: 13,
  },
  primaryActionIcon: {
    backgroundColor: '#744C3C',
  },
  actionTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  primaryActionTitle: {
    color: COLORS.textOnPrimary,
  },
  actionDescription: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginTop: 5,
  },
  primaryActionDescription: {
    color: '#F8EAE4',
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    marginTop: 13,
  },
  reminderTextContainer: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 5,
  },
  reminderText: {
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.textSecondary,
  },
  loadingCard: {
    minHeight: 90,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  footer: {
    textAlign: 'center',
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 24,
  },
  pressed: {
    opacity: 0.75,
  },
});
