import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/apiClient";
import { AuthShell, Field } from "./Login";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password !== confirm) return setError("Passwords do not match.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    try {
      await apiFetch("/api/auth/reset-password", { method: "POST", body: { token, password } });
      setDone(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.message || "Reset failed. The link may have expired.");
    }
  }

  if (!token) {
    return (
      <AuthShell title="Invalid link">
        <p className="text-sm text-inkfade">This reset link is missing a token. Please request a new one from the <a href="/forgot-password" className="text-brass underline">forgot password</a> page.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set a new password">
      {done ? (
        <p className="text-sm text-inkfade">
          Password updated! Redirecting to login…
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field label="New password" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
          <Field label="Confirm password" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
          {error && <p className="text-seal text-sm">{error}</p>}
          <button className="mt-2 bg-ink text-paper rounded-sm py-2.5 font-medium">Set new password</button>
        </form>
      )}
    </AuthShell>
  );
}
