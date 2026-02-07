/**
 * OpenClaw Google Workspace OAuth helpers.
 * Uses google-auth-library OAuth2Client. Client credentials and tokens stored in vault.
 */

import { OAuth2Client } from "google-auth-library";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/presentations",
];

export interface GoogleOAuthClientConfig {
  client_id: string;
  client_secret: string;
}

/** Generate authorization URL for Google OAuth */
export function getGoogleAuthUrl(
  clientId: string,
  clientSecret: string,
  redirectUri: string
): string {
  const oauth = new OAuth2Client(clientId, clientSecret, redirectUri);
  return oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
  });
}

/** Exchange authorization code for tokens; returns tokens including refresh_token */
export async function exchangeGoogleCode(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  code: string
): Promise<{ refresh_token?: string; access_token?: string; expiry_date?: number }> {
  const oauth = new OAuth2Client(clientId, clientSecret, redirectUri);
  const { tokens } = await oauth.getToken(code);
  return {
    refresh_token: tokens.refresh_token ?? undefined,
    access_token: tokens.access_token ?? undefined,
    expiry_date: tokens.expiry_date ?? undefined,
  };
}
