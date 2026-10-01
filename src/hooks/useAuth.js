import { useEffect, useState } from "react";
import { backend } from "../lib/backend";
import { clearAll } from "../lib/localStore";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    backend.auth.getSession().then((u) => { setUser(u); setLoading(false); });
    const unsubscribe = backend.auth.onAuthChange((u) => setUser(u));
    return unsubscribe;
  }, []);

  return {
    user,
    loading,
    signOut: async () => {
      await backend.auth.signOut();
      await clearAll(); // wipe cached rows so the next sign-in on this device starts clean
      localStorage.removeItem("corix:company");
    }
  };
}
