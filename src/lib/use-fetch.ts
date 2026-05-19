"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  const refresh = useCallback(() => {
    const myReq = ++reqId.current;
    setLoading(true);
    setError(null);
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      })
      .then((d: T) => {
        if (reqId.current === myReq) setData(d);
      })
      .catch((e: Error) => {
        if (reqId.current === myReq) setError(e.message);
      })
      .finally(() => {
        if (reqId.current === myReq) setLoading(false);
      });
  }, [url]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export async function apiFetch<T>(
  url: string,
  options: { method?: "POST" | "PATCH" | "DELETE"; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(url, {
    method: options.method ?? "POST",
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* noop */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}
