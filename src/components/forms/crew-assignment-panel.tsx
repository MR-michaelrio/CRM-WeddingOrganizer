"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, Users } from "lucide-react";
import { apiFetch, useFetch } from "@/lib/use-fetch";
import type { CrewDTO } from "@/lib/types";
import { formatIDR } from "@/lib/format";
import { initials } from "@/lib/utils";
import { Field, Input, Select } from "@/components/ui/form-field";

type Assignment = {
  id: number;
  crewId: number;
  clientId: number;
  role: string | null;
  fee: string | null;
  startTime: string | null;
  endTime: string | null;
  attendance: string;
  crew: {
    id: number;
    name: string;
    role: string;
    defaultFee: string | null;
    status: string;
  };
};

type Props = {
  clientId: number;
};

export function CrewAssignmentPanel({ clientId }: Props) {
  const { data: assignments, refresh } =
    useFetch<Assignment[]>(`/api/clients/${clientId}/crew`);
  const { data: allCrew } = useFetch<CrewDTO[]>("/api/crew");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For form
  const [crewId, setCrewId] = useState<number | "">("");
  const [role, setRole] = useState("");
  const [fee, setFee] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const availableCrew =
    allCrew?.filter(
      (c) => !assignments?.some((a) => a.crewId === c.id) || c.id === editing?.crewId
    ) ?? [];

  const reset = () => {
    setCrewId("");
    setRole("");
    setFee("");
    setStartTime("");
    setEndTime("");
    setEditing(null);
    setShowForm(false);
    setError(null);
  };

  const openCreate = () => {
    reset();
    setShowForm(true);
  };

  const openEdit = (a: Assignment) => {
    setEditing(a);
    setCrewId(a.crewId);
    setRole(a.role ?? a.crew.role);
    setFee(a.fee ? String(Math.round(Number(a.fee))) : "");
    setStartTime(a.startTime ?? "");
    setEndTime(a.endTime ?? "");
    setShowForm(true);
  };

  const handleCrewPick = (id: number) => {
    setCrewId(id);
    // Pre-fill role + fee from defaults
    const c = allCrew?.find((x) => x.id === id);
    if (c && !editing) {
      setRole(c.role);
      if (c.defaultFee) setFee(String(Math.round(Number(c.defaultFee))));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crewId) {
      setError("Pilih crew dulu");
      return;
    }
    setBusy(true);
    setError(null);
    const payload = {
      crewId: Number(crewId),
      role: role || undefined,
      fee: fee ? Number(fee.replace(/\D/g, "")) : undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
    };
    try {
      if (editing) {
        await apiFetch(`/api/crew-assignments/${editing.id}`, {
          method: "PATCH",
          body: payload,
        });
      } else {
        await apiFetch(`/api/clients/${clientId}/crew`, { body: payload });
      }
      reset();
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (a: Assignment) => {
    if (!confirm(`Lepas ${a.crew.name} dari assignment?`)) return;
    try {
      await apiFetch(`/api/crew-assignments/${a.id}`, { method: "DELETE" });
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  };

  const totalFee =
    assignments?.reduce((s, a) => s + Number(a.fee ?? a.crew.defaultFee ?? 0), 0) ?? 0;

  return (
    <div className="rounded-md border border-line bg-cream/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gold-dark" />
          <h4 className="text-sm font-semibold text-ink">Assigned Crew</h4>
          {assignments && assignments.length > 0 && (
            <span className="rounded-full bg-gold-light px-2 py-0.5 text-[10px] font-bold text-gold-dark">
              {assignments.length}
            </span>
          )}
        </div>
        {!showForm && (
          <button onClick={openCreate} className="btn btn-secondary !py-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Assign Crew
          </button>
        )}
      </div>

      {assignments && assignments.length === 0 && !showForm && (
        <p className="text-xs text-ink-light">
          Belum ada crew yang di-assign. Klik &quot;Assign Crew&quot; untuk menambahkan.
        </p>
      )}

      {assignments && assignments.length > 0 && (
        <div className="mb-3 flex flex-col gap-2">
          {assignments.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-md border border-line bg-card p-3"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-light text-xs font-semibold text-gold-dark">
                {initials(a.crew.name)}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="truncate text-sm font-semibold text-ink">
                  {a.crew.name}
                </div>
                <div className="truncate text-xs text-ink-light">
                  {a.role ?? a.crew.role}
                  {a.startTime && a.endTime && ` · ${a.startTime}–${a.endTime}`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-ink">
                  {formatIDR(a.fee ?? a.crew.defaultFee ?? 0)}
                </div>
                <div className="mt-0.5 flex gap-1">
                  <button
                    onClick={() => openEdit(a)}
                    className="rounded-sm p-1 text-ink-light hover:bg-beige hover:text-ink"
                    aria-label="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(a)}
                    className="rounded-sm p-1 text-ink-light hover:bg-danger/10 hover:text-danger"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          <div className="mt-1 flex justify-between border-t border-line pt-2 text-xs">
            <span className="text-ink-light">Total crew cost</span>
            <span className="font-semibold text-ink">{formatIDR(totalFee)}</span>
          </div>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 rounded-md border border-gold/40 bg-gold/5 p-3"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-gold-dark">
            {editing ? "Edit Assignment" : "Assign Crew to Event"}
          </div>
          {error && (
            <div className="rounded-md border border-danger/30 bg-danger/10 p-2 text-xs text-danger">
              {error}
            </div>
          )}
          <Field label="Crew Member" required>
            <Select
              value={crewId}
              onChange={(e) => handleCrewPick(Number(e.target.value))}
              required
              disabled={Boolean(editing)}
            >
              <option value="">— Pilih crew —</option>
              {availableCrew.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.role}
                  {c.defaultFee
                    ? ` (default ${formatIDR(c.defaultFee)})`
                    : ""}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Role for this event">
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Decoration Lead"
              />
            </Field>
            <Field label="Fee (Rp)">
              <Input
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="750000"
              />
            </Field>
            <Field label="Start Time">
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </Field>
            <Field label="End Time">
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </Field>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="btn btn-secondary !py-1.5 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="btn btn-primary !py-1.5 text-xs disabled:opacity-50"
            >
              {busy ? "Saving…" : editing ? "Update" : "Assign"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
