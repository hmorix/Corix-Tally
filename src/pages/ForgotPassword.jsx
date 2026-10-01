import { useState } from "react";
import { backend } from "../lib/backend";
import { isApiMode } from "../lib/backendMode";
import { AuthShell, Field } from "./Login";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const { error } = await backend.auth.resetPassword(email);
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err.message || "Could not send reset link.");
    }
  }

  return (
    <AuthShell title="Reset your password">
      {sent ? (
        <p className="text-sm text-inkfade">
          {isApiMode
            ? "If that email has an account, the server operator now has a reset link for it (self-hosted mode has no email sending yet — see server/README.md)."
            : <>Check <strong>{email}</strong> for a reset link.</>}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
          {error && <p className="text-seal text-sm">{error}</p>}
          <button className="mt-2 bg-ink text-paper rounded-sm py-2.5 font-medium">Send reset link</button>
        </form>
      )}
    </AuthShell>
  );
}
