import { useCallback, useEffect, useState } from "react";
import { authClient } from "./auth-client";
import { API_URL } from "./config";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Appel à l'API REST du site (/api/v1/…) avec le cookie de session. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "omit",
    headers: { "Content-Type": "application/json", Cookie: authClient.getCookie(), ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((body as { error?: string }).error ?? "Erreur réseau", res.status);
  return body as T;
}

/** Petit hook de chargement avec rafraîchissement. */
export function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api<T>(path));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, error, loading, reload };
}

export type Me = {
  member: { id: string; number: string; lastName: string; firstNames: string; categoryLabel: string; joinedAt: string; phone: string | null; skills: string[] };
  roles: string[];
  dues: { unpaidCount: number; unpaidTotal: number };
};

export type Cotisations = {
  dues: { id: string; label: string; amount: number; status: "A_PAYER" | "PAYEE" }[];
  payments: { id: string; amount: number; provider: string; status: string; receiptNumber: string | null; createdAt: string }[];
};

export type Post = { id: string; type: string; title: string; excerpt: string; visibility: "PUBLIC" | "MEMBRES"; eventAt: string | null; location: string | null; publishedAt: string };
