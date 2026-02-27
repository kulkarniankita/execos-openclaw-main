import type { gmail_v1 } from 'googleapis';

export interface ParsedEmail {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: string;
  snippet: string;
}

export async function fetchUnreadEmails(
  gmail: gmail_v1.Gmail,
  maxResults = 10
): Promise<ParsedEmail[]> {
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: 'is:unread newer_than:7d',
    maxResults,
  });

  console.log(`Gmail: found ${response.data.messages?.length ?? 0} unread emails`);

  const messageIds = response.data.messages ?? [];
  if (messageIds.length === 0) return [];

  const emails = await Promise.all(
    messageIds.map(async (msg) => {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'full',
      });
      return parseGmailMessage(detail.data);
    })
  );

  return emails;
}

function parseGmailMessage(message: gmail_v1.Schema$Message): ParsedEmail {
  const headers = message.payload?.headers ?? [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';

  let body = '';
  const payload = message.payload;

  if (payload?.body?.data) {
    body = Buffer.from(payload.body.data, 'base64url').toString('utf-8');
  } else if (payload?.parts) {
    const textPart = payload.parts.find((p) => p.mimeType === 'text/plain');
    const htmlPart = payload.parts.find((p) => p.mimeType === 'text/html');
    const part = textPart ?? htmlPart;
    if (part?.body?.data) {
      body = Buffer.from(part.body.data, 'base64url').toString('utf-8');
    }
  }

  // Truncate long emails to stay within token limits
  if (body.length > 5000) {
    body = body.substring(0, 5000) + '\n\n[Email truncated for processing]';
  }

  return {
    id: message.id ?? '',
    threadId: message.threadId ?? '',
    from: getHeader('From'),
    to: getHeader('To'),
    subject: getHeader('Subject'),
    body,
    date: getHeader('Date'),
    snippet: message.snippet ?? '',
  };
}

export async function markAsRead(
  gmail: gmail_v1.Gmail,
  messageId: string
): Promise<void> {
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      removeLabelIds: ['UNREAD'],
    },
  });
}

export async function createDraft(
  gmail: gmail_v1.Gmail,
  to: string,
  subject: string,
  body: string,
  threadId: string
): Promise<string> {
  const rawEmail = [
    `To: ${to}`,
    `Subject: Re: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    '',
    body,
  ].join('\r\n');

  const encodedMessage = Buffer.from(rawEmail).toString('base64url');

  const response = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: {
      message: {
        raw: encodedMessage,
        threadId,
      },
    },
  });

  return response.data.id ?? '';
}
