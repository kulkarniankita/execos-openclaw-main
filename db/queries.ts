import { and, count, desc, eq } from "drizzle-orm";
import { db } from "./";
import {
  ActionLogEntry,
  agentRuns,
  integrations,
  tasks,
  users,
} from "./schema";
import { GoogleProvider } from "@/lib/google";

export async function getUserByClerkId(clerkId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  return user ?? null;
}

export async function getOrCreateUser(
  clerkId: string,
  email: string,
  name?: string,
) {
  const existing = await getUserByClerkId(clerkId);
  if (existing) {
    return existing;
  }

  const [user] = await db
    .insert(users)
    .values({ clerkId, email, name: name ?? null })
    .returning();

  return user;
}

export async function getIntegration(userId: string, provider: GoogleProvider) {
  const [integration] = await db
    .select()
    .from(integrations)
    .where(
      and(eq(integrations.userId, userId), eq(integrations.provider, provider)),
    )
    .limit(1);
  return integration ?? null;
}

export async function upsertIntegration(data: {
  userId: string;
  provider: GoogleProvider;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string[];
}) {
  const existing = await getIntegration(data.userId, data.provider);
  if (existing) {
    await db
      .update(integrations)
      .set({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        scope: data.scope,
      })
      .where(eq(integrations.id, existing.id));
    return existing;
  }

  const [result] = await db
    .insert(integrations)
    .values(data)
    .returning({ id: integrations.id });
  return result.id;
}

export async function getUserIntegrations(userId: string) {
  const results = await db
    .select()
    .from(integrations)
    .where(eq(integrations.userId, userId));
  return results ?? [];
}

export async function createAgentRun(userId: string) {
  const [result] = await db
    .insert(agentRuns)
    .values({ userId, status: "running" })
    .returning();
  return result ?? null;
}

export async function completeAgentRun(
  agentRunId: string,
  data: {
    status: "success" | "failed";
    summary: string;
    actionsLog: ActionLogEntry[];
    emailsProcessed: number;
    tasksCreated: number;
    draftsCreated: number;
    errorMessage?: string;
    durationMs: number;
  },
) {
  const [run] = await db
    .update(agentRuns)
    .set({ ...data, completedAt: new Date() })
    .where(eq(agentRuns.id, agentRunId))
    .returning();
  return run;
}

export async function createTask(data: {
  userId: string;
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  dueDate?: Date | null;
  createdByAgent?: boolean;
}) {
  const [task] = await db
    .insert(tasks)
    .values({
      userId: data.userId,
      title: data.title,
      description: data.description ?? null,
      priority: data.priority ?? "medium",
      dueDate: data.dueDate ?? null,
      createdByAgent: data.createdByAgent ?? false,
    })
    .returning();
  return task;
}

export async function getLatestAgentRun(userId: string) {
  const [run] = await db
    .select()
    .from(agentRuns)
    .where(eq(agentRuns.userId, userId))
    .orderBy(desc(agentRuns.startedAt))
    .limit(1);
  return run ?? null;
}

export async function getUnreadEmails(userId: string) {
  const [result] = await db
    .select()
    .from(agentRuns)
    .where(and(eq(agentRuns.userId, userId), eq(agentRuns.status, "success")))
    .orderBy(desc(agentRuns.startedAt))
    .limit(1);
  return {
    emailsProcessed: result?.emailsProcessed ?? 0,
    draftsCreated: result?.draftsCreated ?? 0,
    tasksCreated: result?.tasksCreated ?? 0,
  };
}

export async function getAgentRuns(userId: string) {
  const results = await db
    .select()
    .from(agentRuns)
    .where(eq(agentRuns.userId, userId))
    .orderBy(desc(agentRuns.startedAt))
    .limit(20);
  return results ?? [];
}

export async function getUsersWithAgentEnabled() {
  return db
    .select({ userId: users.id, clerkId: users.clerkId })
    .from(users)
    .innerJoin(integrations, eq(users.id, integrations.userId))
    .where(
      and(eq(users.agentEnabled, true), eq(integrations.provider, "gmail")),
    );
}
