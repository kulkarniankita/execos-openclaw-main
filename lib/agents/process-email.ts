import { CalendarEvent } from "./calendar";
import { ParsedEmail } from "./gmail";
import { generateText, Output } from "ai";

import { z } from "zod";

const emailAnalysisSchema = z.object({
  summary: z.string().describe("A 1-2 sentence summary of the email"),
  priority: z
    .enum(["low", "medium", "high"])
    .describe(
      "Priority level: high = urgent/time-sensitive, medium = requires action soon, low = informational",
    ),
  actionItems: z
    .array(
      z.object({
        title: z.string().describe("Short task title"),
        description: z
          .string()
          .describe("More detail about what needs to be done"),
        dueDate: z
          .string()
          .nullable()
          .describe(
            "ISO date string if a deadline is mentioned, otherwise null",
          ),
      }),
    )
    .describe("Concrete action items extracted from the email"),
  needsReply: z.boolean().describe("Whether this email requires a response"),
  draftReply: z
    .string()
    .nullable()
    .describe(
      "A professional draft reply if needsReply is true, otherwise null",
    ),
  calendarEvents: z
    .array(
      z.object({
        title: z
          .string()
          .describe(
            'Short event title, e.g. "Review proposal" or "Meeting with Sarah"',
          ),
        description: z
          .string()
          .describe("Brief event description with context from the email"),
        date: z
          .string()
          .describe(
            "ISO date string for the event (e.g. deadline day or meeting day)",
          ),
        startTime: z
          .string()
          .nullable()
          .describe(
            "ISO datetime string if a specific time is mentioned, otherwise null for all-day event",
          ),
        endTime: z
          .string()
          .nullable()
          .describe("ISO datetime string for event end, otherwise null"),
      }),
    )
    .describe(
      'Calendar events to create from this email. Create events for deadlines, meetings, reminders, or any time-sensitive items mentioned. If someone says "by Friday", create a reminder event on that day.',
    ),
  category: z
    .enum(["work", "personal", "newsletter", "notification", "spam", "other"])
    .describe("Email category for organization"),
});

export type EmailAnalysis = z.infer<typeof emailAnalysisSchema>;

export async function anaylzeWithAI(
  email: ParsedEmail,
  upcomingEvents: CalendarEvent[],
): Promise<EmailAnalysis> {
  let calendarContext = "";
  const today = new Date().toISOString().split("T")[0];
  if (upcomingEvents.length > 0) {
    const eventsList = upcomingEvents
      .map(
        (e) =>
          `- ${e.summary} (${e.start} to ${e.end}${e.location ? `, at ${e.location}` : ""})`,
      )
      .join("\n");
    calendarContext = `\n\nUpcoming calendar events (next 24 hours):\n${eventsList}\n\nUse these events to inform your analysis. For example, if the email mentions a meeting that's already on the calendar, don't create a duplicate task. If someone proposes a time that conflicts with an existing event, note the conflict in the draft reply.`;
  }
  const result = await generateText({
    model: "anthropic/claude-sonnet-4",
    prompt: `You are an AI assistant analyzing emails. Today's date is ${today}.

Analyze the following email and extract structured information:

From: ${email.from}
To: ${email.to}
Subject: ${email.subject}
Date: ${email.date}

Body:
${email.body}${calendarContext}

Instructions:
- Extract action items for any tasks or requests mentioned.
- If the email mentions ANY deadline, meeting, or time-sensitive event (e.g. "by Friday", "next Tuesday", "schedule a call"), you MUST create a calendar event for it. Convert relative dates like "Friday" to actual ISO dates based on today's date (${today}).
- If a reply is needed, draft a professional response.
- Categorize the email and set priority based on urgency.`,
    output: Output.object({ schema: emailAnalysisSchema }),
  });
  return result.output;
}
