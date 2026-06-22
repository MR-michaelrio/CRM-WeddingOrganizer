"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/form-field";
import type { WorkbookSheetData } from "@/app/rundown/[id]/workbook-client";

type Props = {
  open: boolean;
  onClose: () => void;
  clientId: number;
  sheets: WorkbookSheetData[];
  /** Simpan edit Univer yang sedang berjalan sebelum mutasi (agar tidak hilang saat reload). */
  saveCurrent: () => Promise<void>;
  /** Muat ulang data server (router.refresh) setelah perubahan. */
  refresh: () => void;
};

const DEFAULT_COLUMNS = "No, Keterangan, Jumlah, Catatan";

export function ManageSheetsDialog({
  open,
  onClose,
  clientId,
  sheets,
  saveCurrent,
  refresh,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newColumns, setNewColumns] = useState(DEFAULT_COLUMNS);

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await saveCurrent();
      await fn();
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses");
    } finally {
      setBusy(false);
    }
  };

  const handleRename = (sheet: WorkbookSheetData, name: string) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === sheet.name) return;
    void run(async () => {
      const res = await fetch(`/api/sheets/${sheet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error(`Rename gagal (${res.status})`);
    });
  };

  const handleDelete = (sheet: WorkbookSheetData) => {
    if (sheets.length <= 1) {
      setError("Tidak bisa menghapus sheet terakhir.");
      return;
    }
    if (!window.confirm(`Hapus sheet "${sheet.name}"? Data di sheet ini akan hilang.`)) {
      return;
    }
    void run(async () => {
      const res = await fetch(`/api/sheets/${sheet.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Hapus gagal (${res.status})`);
    });
  };

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) {
      setError("Nama sheet baru wajib diisi.");
      return;
    }
    const columns = newColumns
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    void run(async () => {
      const res = await fetch(`/api/workbooks/${clientId}/sheets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, columns: columns.length ? columns : ["Kolom 1"] }),
      });
      if (!res.ok) throw new Error(`Tambah sheet gagal (${res.status})`);
      setNewName("");
      setNewColumns(DEFAULT_COLUMNS);
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Kelola Sheet"
      description="Tambah, ganti nama, atau hapus sheet pada workbook ini."
      size="md"
      footer={
        <button onClick={onClose} className="btn btn-secondary" disabled={busy}>
          Tutup
        </button>
      }
    >
      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {sheets.map((sheet) => (
          <SheetRow
            key={sheet.id}
            sheet={sheet}
            disabled={busy}
            canDelete={sheets.length > 1}
            onRename={(name) => handleRename(sheet, name)}
            onDelete={() => handleDelete(sheet)}
          />
        ))}
      </div>

      <div className="mt-6 border-t border-line pt-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-light">
          Tambah Sheet Baru
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nama Sheet">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Susunan Acara"
              disabled={busy}
            />
          </Field>
          <Field label="Kolom" hint="Pisahkan dengan koma">
            <Input
              value={newColumns}
              onChange={(e) => setNewColumns(e.target.value)}
              placeholder={DEFAULT_COLUMNS}
              disabled={busy}
            />
          </Field>
        </div>
        <button
          onClick={handleAdd}
          disabled={busy}
          className="btn btn-primary mt-3 !py-2 text-sm disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Tambah Sheet
        </button>
      </div>
    </Dialog>
  );
}

function SheetRow({
  sheet,
  disabled,
  canDelete,
  onRename,
  onDelete,
}: {
  sheet: WorkbookSheetData;
  disabled: boolean;
  canDelete: boolean;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(sheet.name);
  const dirty = name.trim() !== sheet.name && name.trim() !== "";

  return (
    <div className="flex items-center gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={disabled}
        onBlur={() => dirty && onRename(name)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (dirty) onRename(name);
          }
        }}
      />
      {dirty && (
        <button
          onClick={() => onRename(name)}
          disabled={disabled}
          className="btn btn-secondary !py-2 text-xs disabled:opacity-50"
        >
          Simpan
        </button>
      )}
      <button
        onClick={onDelete}
        disabled={disabled || !canDelete}
        title={canDelete ? "Hapus sheet" : "Tidak bisa menghapus sheet terakhir"}
        className="rounded-sm p-2 text-ink-light transition-colors hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
