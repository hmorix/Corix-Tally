import { useState } from "react";
import { Link } from "react-router-dom";
import { backend } from "../lib/backend";
import { isApiMode } from "../lib/backendMode";
import { AuthShell, Field } from "./Login";

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { error } = await backend.auth.signUp({ email, password, fullName });
      if (error) throw error;
      setDone(true);
    } catch (err) {
      setError(err.message || "Could not create account.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AuthShell title={isApiMode ? "Account created" : "Check your email"}>
        {isApiMode ? (
          <p className="text-sm text-inkfade">
            You're signed in — <Link to="/" className="text-brass underline">go to your dashboard</Link>.
          </p>
        ) : (
          <p className="text-sm text-inkfade">
            We sent a confirmation link to <strong>{email}</strong>. Confirm it, then{" "}
            <Link to="/login" className="text-brass underline">sign in</Link>.
          </p>
        )}
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create your account">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Field label="Full name" value={fullName} onChange={setFullName} autoComplete="name" />
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
        {error && <p className="text-seal text-sm">{error}</p>}
        <button disabled={busy} className="mt-2 bg-ink text-paper rounded-sm py-2.5 font-medium">
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-5 text-sm text-inkfade">
        Already have an account? <Link to="/login" className="text-brass underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}
