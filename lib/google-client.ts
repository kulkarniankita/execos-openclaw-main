import { google } from "googleapis";
import { createOAuth2Client, type GoogleProvider } from "@/lib/google";
import { encrypt, decrypt } from "@/lib/encryption";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getIntegration } from "@/db/queries";

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

export async function getGoogleClient(
  userId: string,
  provider: GoogleProvider,
) {
  const integration = await getIntegration(userId, provider);

  if (!integration) {
    return null;
  }

  const oauth2Client = createOAuth2Client();

  const accessToken = decrypt(integration.accessToken);
  const refreshToken = decrypt(integration.refreshToken);

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: integration.expiresAt.getTime(),
  });

  // Refresh if token is within 5 minutes of expiry
  const now = Date.now();
  const expiresAt = integration.expiresAt.getTime();

  if (expiresAt - now < TOKEN_REFRESH_BUFFER_MS) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();

      await db
        .update(integrations)
        .set({
          accessToken: encrypt(credentials.access_token!),
          ...(credentials.refresh_token && {
            refreshToken: encrypt(credentials.refresh_token),
          }),
          expiresAt: new Date(
            credentials.expiry_date ?? Date.now() + 3600 * 1000,
          ),
        })
        .where(eq(integrations.id, integration.id));

      oauth2Client.setCredentials(credentials);
    } catch (error) {
      console.error(`Token refresh failed for ${provider}:`, error);

      // Token was likely revoked — remove the integration
      await db.delete(integrations).where(eq(integrations.id, integration.id));

      return null;
    }
  }

  return oauth2Client;
}

export async function getGmailClient(userId: string) {
  const auth = await getGoogleClient(userId, "gmail");
  if (!auth) return null;
  return google.gmail({ version: "v1", auth });
}

export async function getCalendarClient(userId: string) {
  const auth = await getGoogleClient(userId, "google_calendar");
  if (!auth) return null;
  return google.calendar({ version: "v3", auth });
}
