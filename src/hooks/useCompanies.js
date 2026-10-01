import { useCallback, useEffect, useState } from "react";
import { backend } from "../lib/backend";

/** Shared by Dashboard.jsx (create/select) and Layout.jsx's header switcher,
 * so there's one list of companies instead of each screen fetching its own. */
export function useCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setCompanies(await backend.data.listCompanies());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const createCompany = useCallback(async (fields) => {
    const company = await backend.data.createCompany(fields);
    await reload();
    return company;
  }, [reload]);

  return { companies, loading, reload, createCompany };
}
