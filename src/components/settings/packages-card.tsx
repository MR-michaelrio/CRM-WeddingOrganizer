"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Field, Input, Textarea } from "@/components/ui/form-field";
import { apiFetch, useFetch } from "@/lib/use-fetch";
import { formatIDR } from "@/lib/format";

type PackageDTO = {
  id: number;
  name: string;
  price: string;
  description: string | null;
  position: number;
};

type DraftPackage = {
  id: number | null;
  name: string;
  price: string;
  description: string;
};

const EMPTY_DRAFT: DraftPackage = { id: null, name: "", price: "", description: "" };

export function PackagesCard() {
  const { data, loading, error, refresh } = useFetch<PackageDTO[]>("/api/packages");
  const [draft, setDraft] = useState<DraftPackage | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const startCreate = () => {
    setActionError(null);
    setDraft({ ...EMPTY_DRAFT });
  };

  const startEdit = (pkg: PackageDTO) => {
    setActionError(null);
    setDraft({
      id: pkg.id,
      name: pkg.name,
      price: String(Math.round(Number(pkg.price))),
      description: pkg.description ?? "",
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!draft) return;
    const name = draft.name.trim();
    const priceNum = Number(draft.price.replace(/\D/g, ""));
    if (!name) {
      setActionError("Nama paket wajib diisi");
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setActionError("Harga harus angka > 0");
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      const body = {
        name,
        price: priceNum,
        description: draft.description.trim() || null,
      };
      if (draft.id == null) {
        await apiFetch("/api/packages", { body });
      } else {
        await apiFetch(`/api/packages/${draft.id}`, { method: "PATCH", body });
      }
      setDraft(null);
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (pkg: PackageDTO) => {
    if (!confirm(`Hapus paket "${pkg.name}"?`)) return;
    setActionError(null);
    try {
      await apiFetch(`/api/packages/${pkg.id}`, { method: "DELETE" });
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <div className="card-base p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-ink">Packages</h3>
          <p className="text-[13px] text-ink-light">
            Daftar paket dan harganya. Digunakan saat membuat / mengedit client.
          </p>
        </div>
        {!draft && (
          <button onClick={startCreate} className="btn btn-primary !py-2 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Add Package
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}
      {actionError && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {actionError}
        </div>
      )}

      {draft && (
        <form
          onSubmit={handleSubmit}
          className="mb-5 grid gap-4 rounded-md border border-line bg-cream p-4 sm:grid-cols-2"
        >
          <Field label="Nama Paket" required>
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g. Premium"
              required
            />
          </Field>
          <Field label="Harga (Rp)" required>
            <Input
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: e.target.value })}
              placeholder="85000000"
              required
            />
          </Field>
          <Field label="Deskripsi" className="sm:col-span-2">
            <Textarea
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
              placeholder="Apa saja yang termasuk di paket ini..."
            />
          </Field>
          <div className="flex items-center gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary disabled:opacity-50"
            >
              {submitting
                ? "Saving…"
                : draft.id == null
                  ? "Save Package"
                  : "Update Package"}
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && <div className="text-sm text-ink-light">Loading packages…</div>}

      {!loading && (data?.length ?? 0) === 0 && !draft && (
        <div className="rounded-md border border-dashed border-line bg-cream/60 px-6 py-10 text-center">
          <div className="mb-2 text-sm font-semibold text-ink">Belum ada paket</div>
          <div className="text-[13px] text-ink-light">
            Klik &quot;Add Package&quot; untuk membuat paket pertama.
          </div>
        </div>
      )}

      {!loading && (data?.length ?? 0) > 0 && (
        <div className="overflow-hidden rounded-md border border-line">
          <table className="w-full text-sm">
            <thead className="bg-cream text-[11px] uppercase tracking-wider text-ink-light">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Nama</th>
                <th className="px-4 py-2 text-left font-semibold">Harga</th>
                <th className="px-4 py-2 text-left font-semibold">Deskripsi</th>
                <th className="w-24 px-4 py-2 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data!.map((pkg) => (
                <tr key={pkg.id} className="border-t border-line">
                  <td className="px-4 py-2.5 font-semibold text-ink">{pkg.name}</td>
                  <td className="px-4 py-2.5 text-ink">{formatIDR(pkg.price)}</td>
                  <td className="px-4 py-2.5 text-ink-medium">
                    {pkg.description ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => startEdit(pkg)}
                        className="rounded-sm p-1.5 text-ink-medium transition-colors hover:bg-beige hover:text-ink"
                        aria-label="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(pkg)}
                        className="rounded-sm p-1.5 text-ink-medium transition-colors hover:bg-danger/10 hover:text-danger"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
