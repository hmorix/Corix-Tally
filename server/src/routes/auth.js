import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";
import { signToken, requireAuth } from "../middleware/auth.js";
import { verifyGoogleIdToken } from "../lib/googleVerify.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { sendWelcomeEmail, sendPasswordResetEmail } from "../lib/mailer.js";

const router = Router();

router.post("/signup", asyncHandler(async (req, res) => {
  const { email, password, fullName } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "An account with that email already exists" });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, passwordHash, fullName: fullName || "" } });

  // Send welcome / confirmation email (non-blocking — never fails the signup)
  sendWelcomeEmail({ to: email, fullName: user.fullName }).catch((err) =>
    console.error("[mailer] welcome email failed:", err.message)
  );

  res.json({ token: signToken(user.id), user: publicUser(user) });
}));

router.post("/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) return res.status(401).json({ error: "Invalid email or password" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });
  res.json({ token: signToken(user.id), user: publicUser(user) });
}));

// Frontend gets a Google ID token from Google Identity Services' Sign-In
// button and posts it here; we verify it server-side and find-or-create
// the matching user. No client secret ever touches the frontend.
router.post("/google", asyncHandler(async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: "Missing idToken" });
  try {
    const { email, name, googleId } = await verifyGoogleIdToken(idToken);
    let user = await prisma.user.findUnique({ where: { email } });
    const isNew = !user;
    if (!user) user = await prisma.user.create({ data: { email, fullName: name || "", googleId } });
    else if (!user.googleId) user = await prisma.user.update({ where: { id: user.id }, data: { googleId } });
    // Send welcome email only on first sign-in
    if (isNew) {
      sendWelcomeEmail({ to: email, fullName: user.fullName }).catch((err) =>
        console.error("[mailer] welcome email failed:", err.message)
      );
    }
    res.json({ token: signToken(user.id), user: publicUser(user) });
  } catch (e) {
    res.status(401).json({ error: "Google sign-in failed: " + e.message });
  }
}));

// Sends a real password-reset link via SMTP (if configured).
// The reset token is a short-lived JWT (30 min). If SMTP is not configured,
// the link is logged to the server console so the operator can pass it on.
router.post("/forgot-password", asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    // Short-lived token for password reset (30 minutes)
    const resetToken = jwt.sign(
      { sub: user.id, purpose: "reset" },
      process.env.JWT_SECRET,
      { expiresIn: "30m" }
    );
    sendPasswordResetEmail({ to: email, resetToken }).catch((err) =>
      console.error("[mailer] reset email failed:", err.message)
    );
  }
  // Always respond the same way whether or not the email exists, so this
  // endpoint can't be used to check which emails have accounts.
  res.json({ ok: true });
}));

// Reset password endpoint — validates the short-lived token and sets a new password.
router.post("/reset-password", asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: "Token and password are required" });
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(400).json({ error: "Reset link has expired or is invalid. Please request a new one." });
  }
  if (payload.purpose !== "reset") return res.status(400).json({ error: "Invalid reset token" });
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: payload.sub }, data: { passwordHash } });
  res.json({ ok: true });
}));

router.get("/me", requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json({ user: publicUser(user) });
}));

// Used by Settings.jsx (Google Sheets connect) and DayBook.jsx (token
// refresh on a 401) — stores which Sheet a user has connected and their
// current OAuth access token for it. Unrelated to the app's own login;
// this is a second, separate Google integration (Sheets API scope) that
// works the same way regardless of which database is backing the app.
router.patch("/me", requireAuth, asyncHandler(async (req, res) => {
  const { google_sheet_id, google_access_token } = req.body;
  const data = {};
  if (google_sheet_id !== undefined) data.googleSheetId = google_sheet_id;
  if (google_access_token !== undefined) data.googleAccessToken = google_access_token;
  const user = await prisma.user.update({ where: { id: req.userId }, data });
  res.json({ user: publicUser(user) });
}));

// snake_case on the wire everywhere (entry_limit, not entryLimit) so the
// frontend can treat API-mode and Supabase-mode profile objects identically.
function publicUser(user) {
  return {
    id: user.id, email: user.email, full_name: user.fullName, entry_limit: user.entryLimit,
    google_sheet_id: user.googleSheetId || null, google_access_token: user.googleAccessToken || null
  };
}

export default router;
