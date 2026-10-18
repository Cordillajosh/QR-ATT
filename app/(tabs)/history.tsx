
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import {
  getAttendanceHistory,
  getTeacherEventAttendance,
  type AttendanceRecord,
  type TeacherEventAttendance,
} from '@/lib/attendance';
import { getProfile, type Role } from '@/lib/profile';

type Filter = 'all' | 'today' | 'month';

function formatDate(value: string | null | undefined) {
  if (!value) return 'Date unavailable';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function shortId(id: string) {
  return id ? `…${id.slice(-8)}` : 'Unknown student';
}

function matchesDate(value: string, filter: Filter) {
  if (filter === 'all') return true;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();

  if (filter === 'today') {
    return date.toDateString() === now.toDateString();
  }

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

export default function HistoryScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [teacherEvents, setTeacherEvents] = useState<
    TeacherEventAttendance[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [expandedEvents, setExpandedEvents] = useState<string[]>([]);

  const loadHistory = useCallback(async () => {
    if (!user?.id) {
      setRecords([]);
      setTeacherEvents([]);
      setRole(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    try {
      const profile = await getProfile(user.id);
      const currentRole = profile?.role ?? 'student';

      setRole(currentRole);

      if (currentRole === 'teacher') {
        const result = await getTeacherEventAttendance(user.id);
        setTeacherEvents(result);
        setRecords([]);
      } else {
        const result = await getAttendanceHistory(user.id);
        setRecords(result);
        setTeacherEvents([]);
      }
    } catch (err) {
      console.error('History loading error:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const run = async () => {
        if (!user?.id) {
          setRecords([]);
          setTeacherEvents([]);
          setRole(null);
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(false);

        try {
          const profile = await getProfile(user.id);
          if (!active) return;

          const currentRole = profile?.role ?? 'student';
          setRole(currentRole);

          if (currentRole === 'teacher') {
            const result = await getTeacherEventAttendance(user.id);
            if (active) {
              setTeacherEvents(result);
              setRecords([]);
            }
          } else {
            const result = await getAttendanceHistory(user.id);
            if (active) {
              setRecords(result);
              setTeacherEvents([]);
            }
          }
        } catch (err) {
          console.error('History loading error:', err);
          if (active) setError(true);
        } finally {
          if (active) setLoading(false);
        }
      };

      void run();

      return () => {
        active = false;
      };
    }, [user?.id])
  );

  const normalizedSearch = search.trim().toLowerCase();

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesSearch =
        record.eventTitle.toLowerCase().includes(normalizedSearch) ||
        record.eventId.toLowerCase().includes(normalizedSearch);

      return matchesSearch && matchesDate(record.scannedAt, filter);
    });
  }, [records, normalizedSearch, filter]);

  const filteredEvents = useMemo(() => {
    return teacherEvents.filter((event) => {
      const matchesSearch =
        event.title.toLowerCase().includes(normalizedSearch) ||
        event.eventCode.toLowerCase().includes(normalizedSearch) ||
        event.attendees.some((attendee) =>
          (attendee.studentName ?? '')
            .toLowerCase()
            .includes(normalizedSearch)
        );

      const matchesEventDate =
        filter === 'all' ||
        event.attendees.some((attendee) =>
          matchesDate(attendee.scannedAt, filter)
        );

      return matchesSearch && matchesEventDate;
    });
  }, [teacherEvents, normalizedSearch, filter]);

  const totalRecords =
    role === 'teacher'
      ? teacherEvents.reduce(
          (sum, event) => sum + event.attendeeCount,
          0
        )
      : records.length;

  const toggleEvent = (eventId: string) => {
    setExpandedEvents((previous) =>
      previous.includes(eventId)
        ? previous.filter((id) => id !== eventId)
        : [...previous, eventId]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.helperText}>Loading attendance...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>
              {role === 'teacher' ? 'TEACHER PORTAL' : 'STUDENT PORTAL'}
            </Text>
            <Text style={styles.title}>Attendance History</Text>
            <Text style={styles.subtitle}>
              {role === 'teacher'
                ? 'Review your events and see who attended.'
                : 'Keep track of the school events you attended.'}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh attendance history"
            onPress={() => void loadHistory()}
            style={styles.refreshButton}
          >
            <Ionicons
              name="refresh-outline"
              size={22}
              color={COLORS.primary}
            />
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons
              name="checkmark-done-outline"
              size={25}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.summaryText}>
            <Text style={styles.summaryLabel}>
              {role === 'teacher'
                ? 'Total recorded attendance'
                : 'Events attended'}
            </Text>
            <Text style={styles.summaryNumber}>{totalRecords}</Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Ionicons
            name="search-outline"
            size={20}
            color={COLORS.textSecondary}
          />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={
              role === 'teacher'
                ? 'Search event or student name...'
                : 'Search event name or code...'
            }
            placeholderTextColor={COLORS.textSecondary}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable
              onPress={() => setSearch('')}
              accessibilityLabel="Clear search"
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={COLORS.textSecondary}
              />
            </Pressable>
          )}
        </View>

        <Text style={styles.filterHeading}>Filter by scan date</Text>

        <View style={styles.filterRow}>
          {([
            ['all', 'All time'],
            ['today', 'Today'],
            ['month', 'This month'],
          ] as const).map(([value, label]) => {
            const active = filter === value;

            return (
              <Pressable
                key={value}
                onPress={() => setFilter(value)}
                style={[
                  styles.filterChip,
                  active && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    active && styles.filterTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {error ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="cloud-offline-outline"
              size={37}
              color={COLORS.textSecondary}
            />
            <Text style={styles.emptyTitle}>
              Unable to load records
            </Text>
            <Text style={styles.helperText}>
              Check your internet connection and try again.
            </Text>
            <Pressable
              onPress={() => void loadHistory()}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : role === 'teacher' ? (
          filteredEvents.length === 0 ? (
            <EmptyState
              message={
                teacherEvents.length === 0
                  ? 'Events you create will appear here with their attendance lists.'
                  : 'Try a different search or date filter.'
              }
            />
          ) : (
            <View style={styles.list}>
              {filteredEvents.map((event) => {
                const expanded = expandedEvents.includes(event.eventId);

                const visibleAttendees = event.attendees.filter(
                  (attendee) =>
                    matchesDate(attendee.scannedAt, filter) &&
                    (
                      !normalizedSearch ||
                      event.title.toLowerCase().includes(normalizedSearch) ||
                      event.eventCode.toLowerCase().includes(normalizedSearch) ||
                      (attendee.studentName ?? '')
                        .toLowerCase()
                        .includes(normalizedSearch) ||
                      attendee.studentId.toLowerCase().includes(normalizedSearch)
                    )
                );

                return (
                  <View key={event.eventId} style={styles.eventCard}>
                    <Pressable
                      onPress={() => toggleEvent(event.eventId)}
                      style={styles.eventHeader}
                    >
                      <View style={styles.eventIcon}>
                        <Ionicons
                          name="calendar-outline"
                          size={22}
                          color={COLORS.primary}
                        />
                      </View>

                      <View style={styles.eventInfo}>
                        <Text style={styles.eventTitle}>
                          {event.title}
                        </Text>
                        <Text style={styles.eventCode}>
                          {event.eventCode}
                        </Text>
                        <Text style={styles.eventDate}>
                          Starts: {formatDate(event.startTime)}
                        </Text>
                      </View>

                      <View style={styles.countBadge}>
                        <Text style={styles.countNumber}>
                          {event.attendeeCount}
                        </Text>
                        <Text style={styles.countLabel}>attended</Text>
                      </View>
                    </Pressable>

                    <View style={styles.cardDivider} />

                    <Pressable
                      onPress={() => toggleEvent(event.eventId)}
                      style={styles.attendeesToggle}
                    >
                      <Text style={styles.attendeesToggleText}>
                        {expanded ? 'Hide attendees' : 'View attendees'}
                      </Text>
                      <Ionicons
                        name={expanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={COLORS.primary}
                      />
                    </Pressable>

                    {expanded && (
                      <View style={styles.attendeeList}>
                        {visibleAttendees.length === 0 ? (
                          <Text style={styles.helperText}>
                            No attendees match this filter.
                          </Text>
                        ) : (
                          visibleAttendees.map((attendee, index) => (
                            <View
                              key={`${attendee.studentId}-${attendee.scannedAt}-${index}`}
                              style={styles.attendeeRow}
                            >
                              <View style={styles.avatar}>
                                <Ionicons
                                  name="person-outline"
                                  size={17}
                                  color={COLORS.primary}
                                />
                              </View>

                              <View style={styles.attendeeInfo}>
                                <Text style={styles.attendeeName}>
                                  {attendee.studentName ||
                                    shortId(attendee.studentId)}
                                </Text>
                                <Text style={styles.attendeeDate}>
                                  {formatDate(attendee.scannedAt)}
                                </Text>
                              </View>

                              <Ionicons
                                name="checkmark-circle"
                                size={21}
                                color="#3C8054"
                              />
                            </View>
                          ))
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )
        ) : filteredRecords.length === 0 ? (
          <EmptyState
            message={
              records.length === 0
                ? 'Your attendance records will appear after you scan a school event QR code.'
                : 'No records match your search or date filter.'
            }
          />
        ) : (
          <View style={styles.list}>
            {filteredRecords.map((record) => (
              <View key={record.id} style={styles.recordCard}>
                <View style={styles.recordIcon}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={24}
                    color="#3C8054"
                  />
                </View>

                <View style={styles.recordInfo}>
                  <Text style={styles.recordTitle}>
                    {record.eventTitle || 'School event'}
                  </Text>
                  <Text style={styles.recordCode}>
                    {record.eventId}
                  </Text>
                  <View style={styles.recordDateRow}>
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={COLORS.textSecondary}
                    />
                    <Text style={styles.recordDate}>
                      {formatDate(record.scannedAt)}
                    </Text>
                  </View>
                </View>

                <View style={styles.presentBadge}>
                  <Text style={styles.presentText}>Present</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer}>
          QR Attendance · CCTC
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name="document-text-outline"
          size={29}
          color={COLORS.textSecondary}
        />
      </View>
      <Text style={styles.emptyTitle}>No records found</Text>
      <Text style={styles.helperText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    paddingBottom: 35,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  headerText: {
    flex: 1,
    paddingRight: 12,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 25,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  refreshButton: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0E2D9',
    borderRadius: 19,
    padding: 17,
    marginBottom: 19,
  },
  summaryIcon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    backgroundColor: '#FFF9F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    marginLeft: 13,
    flex: 1,
  },
  summaryLabel: {
    color: '#65544D',
    fontSize: 11,
  },
  summaryNumber: {
    color: COLORS.primary,
    fontSize: 27,
    fontWeight: '800',
    marginTop: 3,
  },
  searchBox: {
    minHeight: 49,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 13,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  filterHeading: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 22,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  list: {
    gap: 12,
  },
  eventCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 14,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  eventIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#F0E2D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  eventCode: {
    color: COLORS.primary,
    fontSize: 10,
    marginTop: 4,
  },
  eventDate: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 6,
  },
  countBadge: {
    minWidth: 57,
    backgroundColor: '#E0EFE5',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 7,
    alignItems: 'center',
  },
  countNumber: {
    color: '#2E7047',
    fontSize: 19,
    fontWeight: '800',
  },
  countLabel: {
    color: '#2E7047',
    fontSize: 9,
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginTop: 14,
  },
  attendeesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 13,
    paddingBottom: 2,
  },
  attendeesToggleText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  attendeeList: {
    marginTop: 9,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#F0E2D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeName: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  attendeeDate: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 4,
  },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    padding: 13,
    gap: 11,
  },
  recordIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#E0EFE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordInfo: {
    flex: 1,
  },
  recordTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  recordCode: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 4,
  },
  recordDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  recordDate: {
    color: COLORS.textSecondary,
    fontSize: 10,
    flexShrink: 1,
  },
  presentBadge: {
    backgroundColor: '#E0EFE5',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 9,
  },
  presentText: {
    color: '#2E7047',
    fontSize: 9,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 25,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
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
  helperText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 7,
  },
  retryButton: {
    backgroundColor: '#F0E2D9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 11,
    marginTop: 14,
  },
  retryText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  footer: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 25,
  },
});
