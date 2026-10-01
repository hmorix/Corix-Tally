import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/** Verifies a Google ID token (from the frontend's Google Sign-In button)
 * and returns { email, name, googleId }. Throws if invalid/expired. */
export async function verifyGoogleIdToken(idToken) {
  const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  return { email: payload.email, name: payload.name, googleId: payload.sub };
}
