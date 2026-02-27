import type { calendar_v3 } from 'googleapis';

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
}

export async function fetchUpcomingEvents(
  calendar: calendar_v3.Calendar,
  hoursAhead = 24
): Promise<CalendarEvent[]> {
  const now = new Date();
  const future = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 20,
  });

  return (response.data.items ?? []).map((event) => ({
    id: event.id ?? '',
    summary: event.summary ?? 'No title',
    start: event.start?.dateTime ?? event.start?.date ?? '',
    end: event.end?.dateTime ?? event.end?.date ?? '',
    location: event.location ?? undefined,
    description: event.description ?? undefined,
  }));
}

export async function createCalendarEvent(
  calendar: calendar_v3.Calendar,
  event: {
    title: string;
    description: string;
    date: string;
    startTime: string | null;
    endTime: string | null;
  }
): Promise<string> {
  const isAllDay = !event.startTime;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const eventBody: calendar_v3.Schema$Event = {
    summary: event.title,
    description: event.description,
    start: isAllDay
      ? { date: event.date.split('T')[0] }
      : { dateTime: event.startTime!, timeZone },
    end: isAllDay
      ? { date: event.date.split('T')[0] }
      : { dateTime: event.endTime ?? new Date(new Date(event.startTime!).getTime() + 60 * 60 * 1000).toISOString(), timeZone },
    reminders: {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: 30 }],
    },
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: eventBody,
  });

  console.log(`[Agent] Created calendar event: "${event.title}"`);
  return response.data.id ?? '';
}
