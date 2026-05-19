"use client";

import { useEffect, useState } from "react";
import { Calendar, CheckCircle2, LogOut, Video } from "lucide-react";
import { apiFetch, useFetch } from "@/lib/use-fetch";

type GoogleStatus = {
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
};

export function GoogleAccountCard() {
  const { data, refresh } = useFetch<GoogleStatus>("/api/auth/google/status");
  const [banner, setBanner] = useState<
    { kind: "success" | "error"; message: string } | null
  >(null);
  const [disconnecting, setDisconnecting] = useState(false);

  // Read query string after OAuth redirect (?google_connected=email OR ?google_error=msg)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("google_connected");
    const errorMsg = params.get("google_error");
    if (connected) {
      setBanner({
        kind: "success",
        message: `Google account ${connected} connected.`,
      });
      window.history.replaceState({}, "", window.location.pathname);
      refresh();
    } else if (errorMsg) {
      setBanner({ kind: "error", message: errorMsg });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [refresh]);

  const handleConnect = () => {
    window.location.href = "/api/auth/google/start";
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Google account? Meet links existing tetap valid.")) return;
    setDisconnecting(true);
    try {
      await apiFetch("/api/auth/google/disconnect", { method: "POST" });
      setBanner({ kind: "success", message: "Google account disconnected." });
      refresh();
    } catch (err) {
      setBanner({
        kind: "error",
        message: err instanceof Error ? err.message : "Failed",
      });
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="card-base p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gold-light text-gold-dark">
          <Video className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-ink">Google Calendar & Meet</h3>
          <p className="text-[13px] text-ink-light">
            Connect untuk auto-create Google Calendar event & Google Meet link saat
            bikin event di Calendar page.
          </p>
        </div>
      </div>

      {banner && (
        <div
          className={`mb-4 rounded-md border p-3 text-sm ${
            banner.kind === "success"
              ? "border-success/30 bg-success/10 text-success"
              : "border-danger/30 bg-danger/10 text-danger"
          }`}
        >
          {banner.message}
        </div>
      )}

      {data?.connected ? (
        <div className="rounded-md border border-success/30 bg-success/5 p-4">
          <div className="mb-3 flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            <div className="flex-1">
              <div className="font-semibold text-ink">{data.email}</div>
              <div className="text-xs text-ink-light">
                Connected
                {data.connectedAt
                  ? ` · ${new Date(data.connectedAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}`
                  : ""}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-sm bg-card px-2 py-0.5 text-[11px] font-medium text-ink-medium">
                  <Calendar className="-mt-0.5 mr-1 inline h-3 w-3" />
                  Calendar events
                </span>
                <span className="rounded-sm bg-card px-2 py-0.5 text-[11px] font-medium text-ink-medium">
                  <Video className="-mt-0.5 mr-1 inline h-3 w-3" />
                  Meet auto-generate
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="btn btn-secondary text-danger disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </button>
        </div>
      ) : (
        <button onClick={handleConnect} className="btn btn-primary">
          <Video className="h-4 w-4" />
          Connect Google Account
        </button>
      )}
    </div>
  );
}
