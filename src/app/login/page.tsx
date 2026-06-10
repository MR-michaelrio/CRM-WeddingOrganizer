"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, User as UserIcon, ShieldCheck } from "lucide-react";
import { Field, Input } from "@/components/ui/form-field";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [mode, setMode] = useState<"loading" | "login" | "setup">("loading");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cek apakah app butuh setup.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/setup")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setMode(d?.data?.needsSetup ? "setup" : "login");
      })
      .catch(() => {
        if (!cancelled) setMode("login");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (mode === "setup") {
      if (password !== confirm) {
        setError("Konfirmasi password tidak cocok");
        return;
      }
    }
    setSubmitting(true);
    try {
      const url = mode === "setup" ? "/api/auth/setup" : "/api/auth/login";
      const body =
        mode === "setup"
          ? { name: name.trim(), username: username.trim(), password }
          : { username: username.trim(), password };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Gagal");
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="text-sm text-ink-light">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm rounded-lg border border-line bg-card p-8 shadow-pop">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 text-gold-dark">
            {mode === "setup" ? (
              <ShieldCheck className="h-6 w-6" />
            ) : (
              <Lock className="h-6 w-6" />
            )}
          </div>
          <h1 className="font-serif text-2xl font-semibold text-ink">
            {mode === "setup" ? "Setup Admin" : "Masuk"}
          </h1>
          <p className="mt-1 text-sm text-ink-light">
            {mode === "setup"
              ? "Buat akun admin pertama untuk mengamankan sistem."
              : "Login untuk mengakses sistem manajemen."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "setup" && (
            <Field label="Nama Lengkap" required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Michael Rio"
                autoFocus
                required
              />
            </Field>
          )}
          <Field label="Username" required>
            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-light" />
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                autoComplete="username"
                autoFocus={mode === "login"}
                required
                className="pl-9"
              />
            </div>
          </Field>
          <Field
            label="Password"
            hint={mode === "setup" ? "Minimal 6 karakter." : undefined}
            required
          >
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-light" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                autoComplete={mode === "setup" ? "new-password" : "current-password"}
                required
                className="pl-9"
              />
            </div>
          </Field>
          {mode === "setup" && (
            <Field label="Konfirmasi Password" required>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••"
                autoComplete="new-password"
                required
              />
            </Field>
          )}
          {error && (
            <div className="rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary w-full justify-center"
          >
            {submitting
              ? mode === "setup"
                ? "Membuat akun..."
                : "Masuk..."
              : mode === "setup"
                ? "Buat Akun & Masuk"
                : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
