# ExecOS

This project is part of the series on [Youtube](https://youtu.be/WG_5HSq-Tt4)

Your autonomous AI assistant for email and calendar management. ExecOS uses Claude AI to analyze incoming emails, draft replies, extract action items, and create calendar events — all running on autopilot.

Huge shoutout to [Clerk](https://go.clerk.com/rDCSPyr) for sponsoring this video.

## Features

- **AI Email Analysis** — Processes unread emails using Claude Sonnet 4, extracting summaries, priorities, action items, and categories
- **Smart Draft Replies** — Automatically generates context-aware email drafts in Gmail
- **Calendar Integration** — Detects meeting requests and time references in emails, creates Google Calendar events automatically
- **Task Extraction** — Pulls action items from emails and creates prioritized tasks with due dates
- **Autonomous Agent** — Runs on a 15-minute cron schedule via Vercel, processing emails without manual intervention
- **Monitoring Dashboard** — View agent run history, email processing details, and performance metrics
- **Secure OAuth** — AES-256-GCM encrypted token storage for all Google integrations

## Tech Stack

| Layer        | Technology                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Framework    | [Next.js 16](https://nextjs.org/) (App Router)                                                                           |
| Language     | TypeScript 5                                                                                                             |
| Auth         | [Clerk](https://go.clerk.com/rDCSPyr)                                                                                    |
| AI           | [Anthropic Claude](https://docs.anthropic.com/) (Sonnet 4)                                                               |
| Database     | PostgreSQL + [Drizzle ORM](https://orm.drizzle.team/)                                                                    |
| Integrations | Gmail API, Google Calendar API                                                                                           |
| UI           | [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/) |
| Deployment   | [Vercel](https://vercel.com/)                                                                                            |

## Project Structure

```
app/
├── (auth)/                     # Sign-in / sign-up pages (Clerk)
├── (main)/                     # Protected app pages
│   ├── dashboard/              # Onboarding, stats, agent status
│   ├── monitoring/             # Agent run history & email details
│   └── settings/               # Integration management
├── api/
│   ├── agents/run/             # Agent execution endpoint (manual + cron)
│   └── auth/google/            # OAuth initiation & callback
├── layout.tsx                  # Root layout with ClerkProvider
└── page.tsx                    # Landing page

lib/
├── agent.ts                    # Agent orchestration logic
├── agents/
│   ├── gmail.ts                # Gmail API operations
│   ├── calendar.ts             # Google Calendar operations
│   └── process-email.ts        # AI email analysis with Claude
├── encryption.ts               # AES-256-GCM token encryption
├── google-client.ts            # OAuth client & token refresh
└── google.ts                   # Google scopes & auth URLs

db/
├── schema.ts                   # Database schema (users, integrations, tasks, agent_runs)
├── queries.ts                  # Database query functions
└── index.ts                    # Drizzle client instance

components/
├── agents/                     # Agent-specific components
└── ui/                         # shadcn/ui component library
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ (or [Bun](https://bun.sh/))
- PostgreSQL database
- [Clerk](https://clerk.com/) account
- [Google Cloud](https://console.cloud.google.com/) project with Gmail and Calendar APIs enabled
- [Anthropic](https://console.anthropic.com/) API key

### 1. Clone the repository

```bash
git clone <repo-url>
cd exec-os
```

### 2. Install dependencies

```bash
bun install
# or
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the project root:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard

# Database
DATABASE_URL=postgresql://user:password@host:5432/exec_os

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Encryption (32-byte hex string for AES-256-GCM)
ENCRYPTION_KEY=your-64-char-hex-string

# AI
AI_GATEWAY_API_KEY=your-anthropic-api-key

# Cron (used to authenticate scheduled agent runs)
CRON_SECRET=your-cron-secret
```

### 4. Set up the database

```bash
npx drizzle-kit push
```

### 5. Run the development server

```bash
bun dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database Schema

| Table          | Purpose                                                           |
| -------------- | ----------------------------------------------------------------- |
| `users`        | User profiles synced from Clerk, subscription status, preferences |
| `integrations` | Encrypted OAuth tokens for Gmail and Google Calendar              |
| `tasks`        | Action items extracted from emails by the AI agent                |
| `agent_runs`   | Execution history with per-email action logs and metrics          |

## How the Agent Works

1. **Trigger** — Runs via Vercel cron (every 15 min) or manual button press
2. **Fetch Emails** — Retrieves unread emails from Gmail (last 7 days, max 10 per run)
3. **Load Context** — Fetches upcoming calendar events (next 24 hours) for scheduling awareness
4. **AI Analysis** — Each email is processed by Claude Sonnet 4, producing:
   - Summary, priority level, and category
   - Action items with descriptions and due dates
   - Whether a reply is needed + draft reply text
   - Calendar events to create
5. **Take Actions** — Creates tasks, drafts replies in Gmail, adds calendar events
6. **Mark Read** — Processed emails are marked as read
7. **Log Results** — Full execution details stored in `agent_runs` for monitoring

## API Routes

| Method | Route                       | Description                                               |
| ------ | --------------------------- | --------------------------------------------------------- |
| `POST` | `/api/agents/run`           | Execute agent (auth required, or cron with `CRON_SECRET`) |
| `GET`  | `/api/auth/google`          | Initiate Google OAuth flow                                |
| `GET`  | `/api/auth/google/callback` | Handle OAuth callback and store tokens                    |

## Scripts

```bash
bun dev          # Start development server
bun run build    # Production build
bun start        # Start production server
bun run lint     # Run ESLint
```

## Deployment

The app is configured for Vercel with a cron job that triggers the agent every 15 minutes:

```json
{
  "crons": [
    {
      "path": "/api/agents/run",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

Set all environment variables in your Vercel project settings, and ensure `CRON_SECRET` is configured for secure cron execution.

## Security

- **Token encryption** — All OAuth tokens encrypted at rest with AES-256-GCM
- **Automatic refresh** — Tokens refreshed before expiry with a 5-minute buffer
- **CSRF protection** — OAuth flow uses state parameter stored in HTTP-only cookies
- **Route protection** — Clerk middleware secures all app routes
- **Cron authentication** — Bearer token validation on scheduled agent runs
