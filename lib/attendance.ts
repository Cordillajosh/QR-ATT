
import { supabase } from './supabase';
import { parseQRPayload } from './qr';
import { getEventByCode } from './events';

export type TeacherEventAttendance = {
  eventId: string;
  eventCode: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  attendeeCount: number;
  attendees: {
    studentId: string;
    scannedAt: string;
    studentName: string | null;
    studentEmail: string | null;
  }[];
};

export async function getTeacherEventAttendance(
  teacherId: string
): Promise<TeacherEventAttendance[]> {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title, start_time, end_time')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError || !events) return [];

  const eventIds = events.map((e: any) => e.id);

  if (eventIds.length === 0) return [];

  const { data: attendance, error: attError } = await supabase
    .from('attendance')
    .select('student_id, scanned_at, event_id')
    .in('event_id', eventIds)
    .order('scanned_at', { ascending: false });

  if (attError || !attendance) return [];

  const studentIds = [
    ...new Set(attendance.map((a: any) => a.student_id)),
  ];

  let profiles: any[] = [];

  if (studentIds.length > 0) {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', studentIds);

    if (!profileError && profileData) {
      profiles = profileData;
    }
  }

  return events.map((e: any) => {
    const rows = attendance.filter((a: any) => a.event_id === e.id);

    return {
      eventId: e.id,
      eventCode: e.event_code,
      title: e.title,
      startTime: e.start_time,
      endTime: e.end_time,
      attendeeCount: rows.length,
      attendees: rows.map((a: any) => {
        const profile = profiles.find((p: any) => p.id === a.student_id);

        return {
          studentId: a.student_id,
          scannedAt: a.scanned_at,
          studentName: profile?.full_name ?? null,
          studentEmail: profile?.email ?? null,
        };
      }),
    };
  });
}

export type AttendanceRecord = {
  id: string;
  eventId: string;
  eventTitle: string;
  scannedAt: string;
};

export type RegisterResult = {
  success: boolean;
  message: string;
  eventTitle?: string;
};

export async function registerAttendance(
  rawPayload: string,
  studentId: string
): Promise<RegisterResult> {
  // 1. Make sure a student ID was provided.
  if (!studentId || studentId === 'unknown') {
    return {
      success: false,
      message: 'Please log in before scanning.',
    };
  }

  // 2. Validate the QR code format.
  const result = parseQRPayload(rawPayload);

  if (!result.ok) {
    return {
      success: false,
      message: result.message,
    };
  }

  const payload = result.payload;

  // 3. Find an existing event in Supabase.
  // Unknown QR codes must not automatically create events.
  let foundEvent: Awaited<ReturnType<typeof getEventByCode>>;

  try {
    foundEvent = await getEventByCode(payload.event);
  } catch {
    return {
      success: false,
      message: 'Could not check the event. Please try again.',
    };
  }

  if (!foundEvent) {
    return {
      success: false,
      message:
        'Event not found. Please ask your teacher for a valid QR code.',
    };
  }

  const event = foundEvent;

  // 4. Check the event's official schedule from Supabase.
  const now = Date.now();

  if (event.start_time) {
    const startTime = Date.parse(event.start_time);

    if (!Number.isFinite(startTime)) {
      return {
        success: false,
        message: 'The event start time is invalid.',
        eventTitle: event.title,
      };
    }

    if (now < startTime) {
      return {
        success: false,
        message: 'Event has not started yet.',
        eventTitle: event.title,
      };
    }
  }

  if (event.end_time) {
    const endTime = Date.parse(event.end_time);

    if (!Number.isFinite(endTime)) {
      return {
        success: false,
        message: 'The event end time is invalid.',
        eventTitle: event.title,
      };
    }

    if (now > endTime) {
      return {
        success: false,
        message: 'Event has already ended.',
        eventTitle: event.title,
      };
    }
  }

  // 5. Save the attendance record.
  const { error: attError } = await supabase
    .from('attendance')
    .insert([
      {
        student_id: studentId,
        event_id: event.id,
      },
    ]);

  if (attError) {
    if (attError.code === '23505') {
      return {
        success: false,
        message: 'Already registered for this event.',
        eventTitle: event.title,
      };
    }

    return {
      success: false,
      message: 'Could not record attendance. Please try again.',
      eventTitle: event.title,
    };
  }

  return {
    success: true,
    message: 'Attendance recorded!',
    eventTitle: event.title,
  };
}

export async function getAttendanceHistory(
  studentId: string
): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, scanned_at, events ( event_code, title )')
    .eq('student_id', studentId)
    .order('scanned_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    eventId: row.events?.event_code ?? '',
    eventTitle: row.events?.title ?? '',
    scannedAt: row.scanned_at,
  }));
}

export type TeacherEventSummary = {
  eventId: string;
  eventCode: string;
  title: string;
  attendeeCount: number;
};

export async function getTeacherEventSummary(
  teacherId: string
): Promise<TeacherEventSummary[]> {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError || !events) return [];

  const eventIds = events.map((e: any) => e.id);

  if (eventIds.length === 0) return [];

  const { data: attRows, error: attError } = await supabase
    .from('attendance')
    .select('event_id')
    .in('event_id', eventIds);

  if (attError || !attRows) return [];

  const counts: Record<string, number> = {};

  attRows.forEach((r: any) => {
    counts[r.event_id] = (counts[r.event_id] ?? 0) + 1;
  });

  return events.map((e: any) => ({
    eventId: e.id,
    eventCode: e.event_code,
    title: e.title,
    attendeeCount: counts[e.id] ?? 0,
  }));
}
