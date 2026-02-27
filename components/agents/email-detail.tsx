"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ProcessedEmail } from "@/db/schema";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  ListTodo,
  User,
} from "lucide-react";
import { useState } from "react";

const priorityColors: Record<string, string> = {
  high: "bg-destructive",
  medium: "bg-primary/70",
  low: "bg-primary",
};

const categoryColors: Record<string, string> = {
  work: "bg-muted text-muted-foreground",
  personal: "bg-muted text-muted-foreground",
  newsletter: "bg-muted text-muted-foreground",
  notification: "bg-muted text-muted-foreground",
  spam: "bg-destructive/20 text-destructive",
  other: "bg-muted text-muted-foreground",
};

export function EmailDetail({ email }: { email: ProcessedEmail }) {
  const [expanded, setExpanded] = useState(false);

  const senderName =
    email.from?.split("<")[0]?.trim().replace(/"/g, "") || email.from;

  return (
    <Card className="email-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="email-card-button"
      >
        <CardContent className="p-4">
          <div className="email-card-content">
            <div className="email-card-body">
              {/* Subject + badges */}
              <div className="email-subject-row">
                <h3 className="email-subject">
                  {email.subject || "(No subject)"}
                </h3>
                {email.priority && (
                  <Badge
                    variant="default"
                    className={priorityColors[email.priority] ?? "bg-muted"}
                  >
                    {email.priority}
                  </Badge>
                )}
                {email.category && (
                  <Badge
                    variant="outline"
                    className={categoryColors[email.category] ?? ""}
                  >
                    {email.category}
                  </Badge>
                )}
                {email.draftCreated && (
                  <Badge
                    variant="outline"
                    className="bg-muted text-muted-foreground"
                  >
                    <FileText className="email-badge-icon" />
                    Draft
                  </Badge>
                )}
                {(email.tasksCreated ?? 0) > 0 && (
                  <Badge
                    variant="outline"
                    className="bg-muted text-muted-foreground"
                  >
                    <ListTodo className="email-badge-icon" />
                    {email.tasksCreated} task
                    {email.tasksCreated !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>

              {/* From + date */}
              <div className="email-meta">
                <span className="email-meta-item">
                  <User className="email-meta-icon" />
                  {senderName}
                </span>
                <span className="email-meta-item">
                  <Clock className="email-meta-icon" />
                  {new Date(email.processedAt).toLocaleString()}
                </span>
              </div>

              {/* Summary */}
              {email.summary && (
                <p className="email-summary">{email.summary}</p>
              )}
            </div>

            <div className="email-chevron">
              {expanded ? (
                <ChevronUp className="email-chevron-icon" />
              ) : (
                <ChevronDown className="email-chevron-icon" />
              )}
            </div>
          </div>
        </CardContent>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="email-expanded">
          <div className="email-expanded-grid">
            {/* Action Items */}
            {email.actionItems && email.actionItems.length > 0 && (
              <div>
                <h4 className="email-section-title">
                  <ListTodo className="stat-icon" />
                  Action Items
                </h4>
                <ul className="space-y-2">
                  {email.actionItems.map((item, i) => (
                    <li key={i} className="email-action-item">
                      <p className="email-item-title">{item.title}</p>
                      <p className="email-item-description">
                        {item.description}
                      </p>
                      {item.dueDate && (
                        <p className="email-item-due">
                          Due: {new Date(item.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Draft Reply */}
            {email.draftReply && (
              <div>
                <h4 className="email-section-title">
                  <FileText className="stat-icon" />
                  Draft Reply
                </h4>
                <div className="email-action-item">
                  <p className="email-draft-text">{email.draftReply}</p>
                </div>
              </div>
            )}

            {/* No details */}
            {(!email.actionItems || email.actionItems.length === 0) &&
              !email.draftReply && (
                <div className="email-no-details">
                  <p className="status-label">
                    No action items or draft reply for this email.
                  </p>
                </div>
              )}
          </div>

          {/* Error state */}
          {email.status === "error" && email.error && (
            <div className="email-error">
              <p className="email-error-text">Error: {email.error}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
