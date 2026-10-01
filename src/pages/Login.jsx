import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { backend } from "../lib/backend";
import Logo from "../components/Logo";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { error } = await backend.auth.signIn({ email, password });
      if (error) throw error;
      navigate("/");
    } catch (err) {
      setError(err.message || "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError("");
    try {
      await backend.auth.signInWithGoogle();
      navigate("/"); // no-op if this mode redirects away before resolving (Supabase mode)
    } catch (err) {
      setError(err.message || "Google sign-in failed.");
    }
  }

  return (
    <AuthShell title="Welcome back">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
        {error && <p className="text-seal text-sm">{error}</p>}
        <button disabled={busy} className="mt-2 bg-ink text-paper rounded-sm py-2.5 font-medium">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <div className="my-4 flex items-center gap-3 text-inkfade text-xs">
        <div className="h-px bg-rule flex-1" /> or <div className="h-px bg-rule flex-1" />
      </div>
      <button onClick={handleGoogle} className="w-full border border-ink rounded-sm py-2.5 font-medium">
        Continue with Google
      </button>
      <p className="mt-5 text-sm text-inkfade">
        No account? <Link to="/signup" className="text-brass underline">Create one</Link>
      </p>
      <p className="mt-1 text-sm text-inkfade">
        <Link to="/forgot-password" className="text-brass underline">Forgot password?</Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, children }) {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <Logo size={30} />
          <span className="font-display text-2xl">Corix Tally</span>
        </div>
        <h1 className="font-display text-xl mb-5">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, type = "text", value, onChange, autoComplete }) {
  return (
    <label className="text-sm">
      <span className="block mb-1 text-inkfade">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full rounded-sm border border-rule bg-white/40 px-3 py-2.5 focus:border-brass"
      />
    </label>
  );
}
