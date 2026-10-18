import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import {
  createEvent,
  getEventsByTeacher,
  type CloudEvent,
} from '@/lib/events';
import { getProfile, type Role } from '@/lib/profile';
import { buildQRPayload } from '@/lib/qr';

type EditTarget = 'start' | 'end';

function toLocalISO(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00`
  );
}

function formatDateTime(value: string | null) {
  if (!value) return 'Not set';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Invalid date';

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getEventStatus(event: CloudEvent) {
  const now = Date.now();
  const start = event.start_time
    ? new Date(event.start_time).getTime()
    : null;
  const end = event.end_time
    ? new Date(event.end_time).getTime()
    : null;

  if (start !== null && !Number.isFinite(start)) return 'Upcoming';
  if (end !== null && !Number.isFinite(end)) return 'Upcoming';

  if (start !== null && now < start) return 'Upcoming';

  if (
    start !== null &&
    end !== null &&
    now >= start &&
    now <= end
  ) {
    return 'Ongoing';
  }

  if (end !== null && now > end) return 'Ended';

  return 'Upcoming';
}

const QUICK_END_OPTIONS = [
  { label: '+30 min', ms: 30 * 60 * 1000 },
  { label: '+1 hour', ms: 60 * 60 * 1000 },
  { label: '+2 hours', ms: 2 * 60 * 60 * 1000 },
];

export default function TeacherScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [events, setEvents] = useState<CloudEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [title, setTitle] = useState('');
  const [eventId, setEventId] = useState('');
  const [startDate, setStartDate] = useState(() => new Date());
  const [endDate, setEndDate] = useState(
    () => new Date(Date.now() + 60 * 60 * 1000)
  );

  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editingPart, setEditingPart] = useState<'date' | 'time'>('date');

  const [payload, setPayload] = useState<string | null>(null);
  const [selectedEventTitle, setSelectedEventTitle] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isAndroid = Platform.OS === 'android';

  const loadEvents = useCallback(async () => {
    if (!user?.id) {
      setEvents([]);
      setEventsLoading(false);
      return;
    }

    setEventsLoading(true);

    try {
      const result = await getEventsByTeacher(user.id);
      setEvents(result);
    } catch (error) {
      console.error('Unable to load teacher events:', error);
      Alert.alert(
        'Unable to load events',
        'Please check your connection and try again.'
      );
    } finally {
      setEventsLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadScreen() {
        setRoleLoading(true);

        if (!user?.id) {
          setRole('student');
          setRoleLoading(false);
          setEvents([]);
          return;
        }

        try {
          const profile = await getProfile(user.id);

          if (!active) return;

          const currentRole = profile?.role ?? 'student';
          setRole(currentRole);

          if (currentRole === 'teacher') {
            setEventsLoading(true);

            try {
              const result = await getEventsByTeacher(user.id);
              if (active) setEvents(result);
            } catch (error) {
              console.error('Unable to load events:', error);
              if (active) setEvents([]);
            } finally {
              if (active) setEventsLoading(false);
            }
          } else {
            setEvents([]);
            setEventsLoading(false);
          }
        } catch (error) {
          console.error('Unable to verify teacher role:', error);

          if (active) {
            setRole(null);
            setEvents([]);
            setEventsLoading(false);
          }
        } finally {
          if (active) setRoleLoading(false);
        }
      }

      void loadScreen();

      return () => {
        active = false;
      };
    }, [user?.id])
  );

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await loadEvents();
    } finally {
      setRefreshing(false);
    }
  };

  const openPicker = (target: EditTarget) => {
    setMessage(null);
    setEditTarget(target);
    setEditingPart('date');
  };

  const onPickerChange = (
    event: DateTimePickerEvent,
    selected?: Date
  ) => {
    if (!editTarget) return;

    if (event.type === 'dismissed' || !selected) {
      setEditTarget(null);
      setEditingPart('date');
      return;
    }

    const current = editTarget === 'start' ? startDate : endDate;
    const next = new Date(current);

    next.setFullYear(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate()
    );
    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);

    if (editTarget === 'start') {
      setStartDate(next);
    } else {
      setEndDate(next);
    }

    if (isAndroid && editingPart === 'date') {
      setEditingPart('time');
    } else {
      setEditTarget(null);
      setEditingPart('date');
    }
  };

  const handleQuickEnd = (ms: number) => {
    setMessage(null);
    setEndDate(new Date(startDate.getTime() + ms));
  };

  const handleCreateEvent = async () => {
    const cleanTitle = title.trim();
    const cleanCode = eventId.trim().toUpperCase();

    if (!cleanTitle || !cleanCode) {
      setMessage('Please enter both the event title and event code.');
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      setMessage('The end time must be later than the start time.');
      return;
    }

    if (!user?.id) {
      setMessage('Your session has expired. Please sign in again.');
      return;
    }

    setSaving(true);
    setMessage(null);
    setPayload(null);

    const event = {
      eventId: cleanCode,
      title: cleanTitle,
      start: toLocalISO(startDate),
      end: toLocalISO(endDate),
    };

    try {
      const { error } = await createEvent(event);

      if (error) {
        setMessage(`Could not save the event: ${error}`);
        return;
      }

      setSelectedEventTitle(cleanTitle);
      setPayload(buildQRPayload(event));
      setMessage('Event saved successfully. Your QR code is ready.');

      await loadEvents();
    } catch (error) {
      console.error('Create event failed:', error);
      setMessage('Something went wrong while saving the event.');
    } finally {
      setSaving(false);
    }
  };

  const showEventQR = (event: CloudEvent) => {
    setSelectedEventTitle(event.title);

    setPayload(
      buildQRPayload({
        eventId: event.event_code,
        title: event.title,
        start: event.start_time ?? undefined,
        end: event.end_time ?? undefined,
      })
    );

    setMessage(null);
  };

  const clearForm = () => {
    setTitle('');
    setEventId('');
    setStartDate(new Date());
    setEndDate(new Date(Date.now() + 60 * 60 * 1000));
    setPayload(null);
    setSelectedEventTitle('');
    setMessage(null);
    setEditTarget(null);
  };

  const upcomingCount = events.filter(
    (event) => getEventStatus(event) === 'Upcoming'
  ).length;

  const ongoingCount = events.filter(
    (event) => getEventStatus(event) === 'Ongoing'
  ).length;

  const endedCount = events.filter(
    (event) => getEventStatus(event) === 'Ended'
  ).length;

  if (roleLoading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Checking your account...</Text>
      </View>
    );
  }

  if (role !== 'teacher') {
    return (
      <View style={styles.centerScreen}>
        <View style={styles.lockIcon}>
          <Ionicons
            name="lock-closed-outline"
            size={42}
            color={COLORS.primary}
          />
        </View>

        <Text style={styles.pageTitle}>Teachers Only</Text>

        <Text style={styles.pageSubtitle}>
          Only authorized teacher accounts can create and manage events.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>TEACHER PORTAL</Text>
          <Text style={styles.pageTitle}>Event Management</Text>
          <Text style={styles.pageSubtitle}>
            Create events, display QR codes, and manage your activities.
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Ionicons
            name="calendar-outline"
            size={27}
            color={COLORS.textOnPrimary}
          />
        </View>
      </View>

      {/* Statistics */}
      <Text style={styles.sectionTitle}>Your overview</Text>

      <View style={styles.statsRow}>
        <StatCard
          icon="layers-outline"
          label="Total events"
          value={events.length}
          color="#F0E2D9"
          iconColor={COLORS.primary}
        />

        <StatCard
          icon="time-outline"
          label="Upcoming"
          value={upcomingCount}
          color="#FFF0D8"
          iconColor="#94631D"
        />
      </View>

      <View style={styles.statsRow}>
        <StatCard
          icon="radio-button-on-outline"
          label="Ongoing"
          value={ongoingCount}
          color="#E0EFE5"
          iconColor="#2E7047"
        />

        <StatCard
          icon="checkmark-done-outline"
          label="Ended"
          value={endedCount}
          color="#E9E9EF"
          iconColor="#5E6274"
        />
      </View>

      {/* Create event */}
      <View style={styles.formCard}>
        <View style={styles.cardHeadingRow}>
          <View style={styles.cardHeadingIcon}>
            <Ionicons
              name="add-circle-outline"
              size={23}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.cardHeadingText}>
            <Text style={styles.cardTitle}>Create a new event</Text>
            <Text style={styles.cardSubtitle}>
              Enter the event information below.
            </Text>
          </View>
        </View>

        <Text style={styles.label}>Event title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Founders Day Assembly"
          placeholderTextColor={COLORS.textSecondary}
          editable={!saving}
          maxLength={120}
        />

        <Text style={styles.label}>Event code</Text>
        <TextInput
          style={styles.input}
          value={eventId}
          onChangeText={setEventId}
          placeholder="e.g. EVT-2026-0002"
          placeholderTextColor={COLORS.textSecondary}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!saving}
          maxLength={40}
        />

        <Text style={styles.label}>Start date and time</Text>
        <PickerField
          value={formatDateTime(toLocalISO(startDate))}
          icon="sunny-outline"
          onPress={() => openPicker('start')}
        />

        <Text style={styles.label}>End date and time</Text>
        <PickerField
          value={formatDateTime(toLocalISO(endDate))}
          icon="moon-outline"
          onPress={() => openPicker('end')}
        />

        <Text style={styles.quickLabel}>Quick end time</Text>

        <View style={styles.chipRow}>
          {QUICK_END_OPTIONS.map((option) => (
            <Pressable
              key={option.label}
              disabled={saving}
              style={({ pressed }) => [
                styles.chip,
                pressed && styles.pressed,
              ]}
              onPress={() => handleQuickEnd(option.ms)}
            >
              <Text style={styles.chipText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        {editTarget && (
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={editTarget === 'start' ? startDate : endDate}
              mode={isAndroid ? editingPart : 'datetime'}
              display={isAndroid ? 'default' : 'spinner'}
              onChange={onPickerChange}
            />
          </View>
        )}

        {message && (
          <View
            style={[
              styles.messageBox,
              message.startsWith('Event saved')
                ? styles.successMessage
                : styles.errorMessage,
            ]}
          >
            <Ionicons
              name={
                message.startsWith('Event saved')
                  ? 'checkmark-circle-outline'
                  : 'information-circle-outline'
              }
              size={20}
              color={
                message.startsWith('Event saved')
                  ? '#2E7047'
                  : COLORS.danger
              }
            />

            <Text style={styles.messageText}>{message}</Text>
          </View>
        )}

        <View style={styles.createButton}>
          <AppButton
            theme="primary"
            title={saving ? 'Saving event...' : 'Create event and QR'}
            icon="qr-code-outline"
            onPress={handleCreateEvent}
            disabled={saving}
          />
        </View>

        <Pressable
          disabled={saving}
          onPress={clearForm}
          style={styles.clearButton}
        >
          <Text style={styles.clearButtonText}>Clear form</Text>
        </Pressable>
      </View>

      {/* Generated QR */}
      {payload && (
        <View style={styles.qrCard}>
          <View style={styles.qrHeading}>
            <Ionicons
              name="qr-code-outline"
              size={24}
              color={COLORS.primary}
            />

            <View style={styles.qrHeadingText}>
              <Text style={styles.cardTitle}>Event QR code</Text>
              <Text style={styles.cardSubtitle}>
                {selectedEventTitle}
              </Text>
            </View>
          </View>

          <View style={styles.qrBox}>
            <QRCode value={payload} size={210} />
          </View>

          <Text style={styles.qrInstructions}>
            Let students scan this QR code using the Scan tab.
          </Text>

          <View style={styles.qrInfoRow}>
            <Ionicons
              name="time-outline"
              size={17}
              color={COLORS.textSecondary}
            />
            <Text style={styles.qrInfoText}>
              Use this QR for the event's scheduled time.
            </Text>
          </View>

          <Pressable
            onPress={() => {
              Alert.alert(
                'Event QR code',
                'This QR contains the event code and schedule. Only share it with the intended participants.'
              );
            }}
            style={styles.qrDetailsButton}
          >
            <Ionicons
              name="information-circle-outline"
              size={17}
              color={COLORS.primary}
            />
            <Text style={styles.qrDetailsText}>QR code information</Text>
          </Pressable>
        </View>
      )}

      {/* Events list */}
      <View style={styles.eventsHeading}>
        <View>
          <Text style={styles.sectionTitle}>Your events</Text>
          <Text style={styles.sectionSubtitle}>
            Events created by your account
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh events"
          onPress={handleRefresh}
          disabled={refreshing || eventsLoading}
          style={styles.refreshButton}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Ionicons
              name="refresh-outline"
              size={21}
              color={COLORS.primary}
            />
          )}
        </Pressable>
      </View>

      {eventsLoading ? (
        <View style={styles.listState}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.stateText}>Loading your events...</Text>
        </View>
      ) : events.length === 0 ? (
        <View style={styles.listState}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="calendar-clear-outline"
              size={28}
              color={COLORS.textSecondary}
            />
          </View>

          <Text style={styles.emptyTitle}>No events yet</Text>

          <Text style={styles.stateText}>
            Your saved events will appear here after you create one.
          </Text>
        </View>
      ) : (
        events.map((event) => {
          const status = getEventStatus(event);

          return (
            <View key={event.id} style={styles.eventCard}>
              <View style={styles.eventTopRow}>
                <View style={styles.eventIcon}>
                  <Ionicons
                    name="calendar-outline"
                    size={22}
                    color={COLORS.primary}
                  />
                </View>

                <View style={styles.eventMain}>
                  <Text style={styles.eventTitle} numberOfLines={2}>
                    {event.title}
                  </Text>

                  <Text style={styles.eventCode}>
                    {event.event_code}
                  </Text>
                </View>

                <StatusLabel status={status} />
              </View>

              <View style={styles.eventDateRow}>
                <Ionicons
                  name="play-circle-outline"
                  size={17}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.eventDateText}>
                  {formatDateTime(event.start_time)}
                </Text>
              </View>

              <View style={styles.eventDateRow}>
                <Ionicons
                  name="stop-circle-outline"
                  size={17}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.eventDateText}>
                  {formatDateTime(event.end_time)}
                </Text>
              </View>

              <View style={styles.eventFooter}>
                <Text style={styles.eventStatusText}>
                  {status === 'Ongoing'
                    ? 'Attendance window is active'
                    : status === 'Ended'
                      ? 'Scheduled event has ended'
                      : 'Scheduled for a future time'}
                </Text>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => showEventQR(event)}
                  style={({ pressed }) => [
                    styles.showQRButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons
                    name="qr-code-outline"
                    size={17}
                    color="#FFFFFF"
                  />
                  <Text style={styles.showQRText}>Show QR</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}

      <Text style={styles.footerText}>
        QR Attendance · Teacher Portal
      </Text>
    </ScrollView>
  );
}

type StatCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  color: string;
  iconColor: string;
};

function StatCard({
  icon,
  label,
  value,
  color,
  iconColor,
}: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={21} color={iconColor} />
      </View>

      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

type StatusLabelProps = {
  status: string;
};

function StatusLabel({ status }: StatusLabelProps) {
  const background =
    status === 'Ongoing'
      ? '#E0EFE5'
      : status === 'Ended'
        ? '#E9E9EF'
        : '#FFF0D8';

  const foreground =
    status === 'Ongoing'
      ? '#2E7047'
      : status === 'Ended'
        ? '#5E6274'
        : '#94631D';

  return (
    <View style={[styles.statusLabel, { backgroundColor: background }]}>
      <View style={[styles.statusDot, { backgroundColor: foreground }]} />
      <Text style={[styles.statusText, { color: foreground }]}>
        {status}
      </Text>
    </View>
  );
}

type PickerFieldProps = {
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

function PickerField({ value, icon, onPress }: PickerFieldProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.pickerField,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={20} color={COLORS.primary} />

      <Text style={styles.pickerValue}>{value}</Text>

      <Ionicons
        name="calendar-outline"
        size={18}
        color={COLORS.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  centerScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  lockIcon: {
    width: 78,
    height: 78,
    borderRadius: 25,
    backgroundColor: '#F0E2D9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  headerText: {
    flex: 1,
    paddingRight: 10,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 7,
  },
  pageTitle: {
    color: COLORS.textPrimary,
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 5,
  },
  pageSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 19,
  },
  headerIcon: {
    width: 57,
    height: 57,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  statCard: {
    flex: 1,
    minHeight: 118,
    backgroundColor: COLORS.card,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 13,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 3,
  },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 25,
  },
  cardHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardHeadingIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#F0E2D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeadingText: {
    flex: 1,
    marginLeft: 11,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  cardSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 7,
    marginTop: 13,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    paddingVertical: 13,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  pickerField: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerValue: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginHorizontal: 10,
  },
  quickLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 15,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 9,
  },
  chip: {
    backgroundColor: '#F0E2D9',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  pickerContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    padding: 12,
    marginTop: 15,
  },
  successMessage: {
    backgroundColor: '#EAF4ED',
  },
  errorMessage: {
    backgroundColor: '#FAECEA',
  },
  messageText: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 12,
    lineHeight: 18,
  },
  createButton: {
    marginTop: 18,
  },
  clearButton: {
    alignItems: 'center',
    paddingVertical: 13,
    marginTop: 2,
  },
  clearButtonText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  qrCard: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    marginTop: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qrHeading: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 17,
  },
  qrHeadingText: {
    flex: 1,
  },
  qrBox: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qrInstructions: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 15,
  },
  qrInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 12,
  },
  qrInfoText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    flexShrink: 1,
  },
  qrDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 15,
    padding: 8,
  },
  qrDetailsText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  eventsHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
    marginBottom: 13,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listState: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 55,
    height: 55,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 5,
  },
  stateText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 8,
  },
  eventCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 15,
    marginBottom: 12,
  },
  eventTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  eventIcon: {
    width: 41,
    height: 41,
    borderRadius: 13,
    backgroundColor: '#F0E2D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventMain: {
    flex: 1,
    paddingTop: 2,
  },
  eventTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  eventCode: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 4,
  },
  statusLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  eventDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 13,
  },
  eventDateText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    flex: 1,
  },
  eventFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 14,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  eventStatusText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 10,
    lineHeight: 15,
  },
  showQRButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  showQRText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 20,
  },
  pressed: {
    opacity: 0.75,
  },
});