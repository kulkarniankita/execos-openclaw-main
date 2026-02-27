import { completeAgentRun, createAgentRun, createTask } from "@/db/queries";
import { getCalendarClient, getGmailClient } from "./google-client";
import { createDraft, fetchUnreadEmails, markAsRead } from "./agents/gmail";
import {
  CalendarEvent,
  createCalendarEvent,
  fetchUpcomingEvents,
} from "./agents/calendar";
import { ActionLogEntry } from "@/db/schema";
import { anaylzeWithAI } from "./agents/process-email";

export async function runAgent(userId: string) {
  const startTime = Date.now();
  const agentRun = await createAgentRun(userId);

  try {
    //1. create agent run by user id

    //2. get gmail client
    const gmailClient = await getGmailClient(userId);
    if (!gmailClient) {
      const run = await completeAgentRun(agentRun.id, {
        status: "failed",
        summary: "Gmail not connected",
        actionsLog: [],
        emailsProcessed: 0,
        tasksCreated: 0,
        draftsCreated: 0,
        errorMessage: "Gmail integration not found or token expired",
        durationMs: Date.now() - startTime,
      });
      return {
        runId: run.id,
        status: "failed" as const,
        summary: "Gmail not connected",
      };
    }
    //3. fetch unread emails
    const emails = await fetchUnreadEmails(gmailClient, 10);
    if (emails.length === 0) {
      const run = await completeAgentRun(agentRun.id, {
        status: "success",
        summary: "No unread emails to process",
        actionsLog: [],
        emailsProcessed: 0,
        tasksCreated: 0,
        draftsCreated: 0,
        durationMs: Date.now() - startTime,
      });
      return {
        runId: run.id,
        status: "success" as const,
        summary: "No unread emails to process",
      };
    }
    //4. fetch calendar events (if connected)
    const calendarClient = await getCalendarClient(userId);

    let upcomingEvents: CalendarEvent[] = [];
    if (calendarClient) {
      try {
        upcomingEvents = await fetchUpcomingEvents(calendarClient, 24);
      } catch (error) {
        console.error("Calendar fetch failed (non-fatal):", error);
      }
    }
    //5. process each email with AI
    const actionsLog: ActionLogEntry[] = [];
    let totalTasksCreated = 0;
    let totalDraftsCreated = 0;
    let totalEventsCreated = 0;

    const results = await Promise.allSettled(
      emails.map(async (email) => {
        try {
          const analysis = await anaylzeWithAI(email, upcomingEvents);
          //create tasks from action items
          let emailTasksCreated = 0;

          for (const item of analysis.actionItems) {
            await createTask({
              userId,
              title: item.title,
              description: item.description,
              priority: analysis.priority,
              dueDate: item.dueDate ? new Date(item.dueDate) : null,
              createdByAgent: true,
            });
            emailTasksCreated++;
          }

          //6. create gmail draft if reply is needed
          let draftCreated = false;
          if (analysis.needsReply && analysis.draftReply) {
            await createDraft(
              gmailClient,
              email.from,
              email.subject,
              analysis.draftReply,
              email.threadId,
            );
            draftCreated = true;
          }
          //7. create calendar events if needed
          let emailEventsCreated = 0;
          if (calendarClient && analysis.calendarEvents?.length > 0) {
            for (const event of analysis.calendarEvents) {
              try {
                await createCalendarEvent(calendarClient, event);
                emailEventsCreated++;
              } catch (err) {
                console.error(
                  `[Agent] Failed to create calendar event "${event.title}":`,
                  err,
                );
              }
            }
          }
          //8. mark email as read
          await markAsRead(gmailClient, email.id);

          return {
            emailId: email.id,
            subject: email.subject,
            from: email.from,
            date: email.date,
            status: "success",
            summary: analysis.summary,
            priority: analysis.priority,
            category: analysis.category,
            needsReply: analysis.needsReply,
            draftReply: analysis.draftReply,
            actionItems: analysis.actionItems,
            calendarEvents: analysis.calendarEvents,
            tasksCreated: emailTasksCreated,
            draftCreated: draftCreated,
            eventsCreated: emailEventsCreated,
          };
        } catch (error) {
          console.error("Email processing failed:", error);
          return {
            emailId: email.id,
            subject: email.subject,
            from: email.from,
            date: email.date,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }),
    );

    //9. Aggregate the results
    for (const result of results) {
      if (result.status === "fulfilled") {
        const entry = result.value;
        actionsLog.push({
          emailId: entry.emailId,
          subject: entry.subject,
          from: entry.from,
          date: entry.date,
          status: entry.status as "success" | "error",
          summary: entry.summary,
          priority: entry.priority,
          category: entry.category,
          needsReply: entry.needsReply,
          draftReply: entry.draftReply,
          actionItems: entry.actionItems,
          tasksCreated: entry.tasksCreated,
          draftCreated: entry.draftCreated,
          eventsCreated: entry.eventsCreated,
        });
        if (entry.status === "success") {
          totalTasksCreated += entry.tasksCreated ?? 0;
          totalDraftsCreated += entry.draftCreated ? 1 : 0;
          totalEventsCreated += entry.eventsCreated ?? 0;
        }
      }
    }
    const successCount = actionsLog.filter(
      (entry) => entry.status === "success",
    ).length;
    const errorCount = actionsLog.filter(
      (entry) => entry.status === "error",
    ).length;
    const overallStatus = successCount > 0 ? "success" : "failed";

    const summary = [
      `Processed ${successCount} email${successCount !== 1 ? "s" : ""}`,
      totalTasksCreated > 0
        ? `created ${totalTasksCreated} task${totalTasksCreated !== 1 ? "s" : ""}`
        : null,
      totalDraftsCreated > 0
        ? `drafted ${totalDraftsCreated} repl${totalDraftsCreated !== 1 ? "ies" : "y"}`
        : null,
      totalEventsCreated > 0
        ? `created ${totalEventsCreated} calendar event${totalEventsCreated !== 1 ? "s" : ""}`
        : null,
      errorCount > 0
        ? `${errorCount} error${errorCount !== 1 ? "s" : ""}`
        : null,
      upcomingEvents.length > 0
        ? `${upcomingEvents.length} upcoming event${upcomingEvents.length !== 1 ? "s" : ""}`
        : null,
    ]
      .filter(Boolean)
      .join(", ");

    //10. log completed Agent run
    const run = await completeAgentRun(agentRun.id, {
      status: overallStatus,
      summary: summary,
      actionsLog: actionsLog,
      emailsProcessed: successCount,
      tasksCreated: totalTasksCreated,
      draftsCreated: totalDraftsCreated,
      durationMs: Date.now() - startTime,
      errorMessage:
        errorCount > 0 ? `${errorCount} email(s) failed to process` : undefined,
    });
    // 11. and return the result
    return {
      runId: run.id,
      status: overallStatus,
      summary,
    };
  } catch (error) {
    console.error("Agent run error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const run = await completeAgentRun(agentRun.id, {
      status: "failed",
      summary: "Agent run failed",
      actionsLog: [],
      emailsProcessed: 0,
      tasksCreated: 0,
      draftsCreated: 0,
      durationMs: Date.now() - startTime,
    });
    return {
      runId: run.id,
      status: "failed",
      summary: errorMessage,
    };
  }
  //run the agent
}
