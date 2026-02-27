import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";

// Enums
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "none",
  "active",
  "canceled",
  "past_due",
]);
export const integrationProviderEnum = pgEnum("integration_provider", [
  "gmail",
  "google_calendar",
]);
export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "completed",
  "cancelled",
]);
export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
]);
export const agentRunStatusEnum = pgEnum("agent_run_status", [
  "running",
  "success",
  "failed",
]);

// Users table
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status")
    .default("none")
    .notNull(),
  subscriptionId: text("subscription_id"),
  agentEnabled: boolean("agent_enabled").default(true).notNull(),
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  preferences: jsonb("preferences").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Integrations table (OAuth tokens)
export const integrations = pgTable("integrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  provider: integrationProviderEnum("provider").notNull(),
  accessToken: text("access_token").notNull(), // Encrypted
  refreshToken: text("refresh_token").notNull(), // Encrypted
  expiresAt: timestamp("expires_at").notNull(),
  scope: text("scope").array().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").default("pending").notNull(),
  priority: taskPriorityEnum("priority").default("medium").notNull(),
  dueDate: timestamp("due_date"),
  createdByAgent: boolean("created_by_agent").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// Shape of each entry in agentRuns.actionsLog (jsonb)
export interface ActionLogEntry {
  emailId: string;
  subject: string;
  from: string;
  date: string;
  status: "success" | "error";
  summary?: string;
  priority?: string;
  category?: string;
  needsReply?: boolean;
  draftReply?: string | null;
  actionItems?: {
    title: string;
    description: string;
    dueDate: string | null;
  }[];
  tasksCreated?: number;
  draftCreated?: boolean;
  eventsCreated?: number;
  error?: string;
}

// Agent runs table (execution history)
export const agentRuns = pgTable("agent_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  status: agentRunStatusEnum("status").default("running").notNull(),
  summary: text("summary"),
  actionsLog: jsonb("actions_log")
    .$type<ActionLogEntry[]>()
    .default([])
    .notNull(),
  emailsProcessed: integer("emails_processed").default(0).notNull(),
  tasksCreated: integer("tasks_created").default(0).notNull(),
  draftsCreated: integer("drafts_created").default(0).notNull(),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  durationMs: integer("duration_ms"),
});

// TypeScript types inferred from Drizzle schema
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Integration = typeof integrations.$inferSelect;
export type NewIntegration = typeof integrations.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type AgentRun = typeof agentRuns.$inferSelect;
export type NewAgentRun = typeof agentRuns.$inferInsert;

export type ProcessedEmail = ActionLogEntry & { processedAt: Date };
