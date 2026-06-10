"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { Check, CloudUpload, Download, Loader2, Printer, Save, Share2 } from "lucide-react";
import type { SaveStatus, UniverWorkbookHandle } from "@/components/workbook/univer-workbook";

export type WorkbookSheetData = {
  id: number;
  slug: string;
  name: string;
  position: number;
  columns: string[];
  rows: Record<string, string>[];
};

const UniverWorkbook = dynamic(
  () => import("@/components/workbook/univer-workbook").then((m) => m.UniverWorkbook),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="mb-3 text-4xl">📊</div>
          <p className="text-sm text-ink-light">Loading workbook…</p>
        </div>
      </div>
    ),
  }
);

type WorkbookClientProps = {
  clientId: number;
  workbookId: string;
  sheets: WorkbookSheetData[];
  title: string;
  clientName: string;
};

function StatusBadge({ status }: { status: SaveStatus }) {
  if (status.state === "saving") {
    return (
      <span className="flex items-center gap-1 text-xs text-ink-light">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Saving…
      </span>
    );
  }
  if (status.state === "dirty") {
    return (
      <span className="flex items-center gap-1 text-xs text-warning">
        <CloudUpload className="h-3.5 w-3.5" />
        Unsaved changes
      </span>
    );
  }
  if (status.state === "saved") {
    const secAgo = Math.round((Date.now() - status.at) / 1000);
    return (
      <span className="flex items-center gap-1 text-xs text-success">
        <Check className="h-3.5 w-3.5" />
        Saved {secAgo < 5 ? "just now" : `${secAgo}s ago`}
      </span>
    );
  }
  if (status.state === "error") {
    return (
      <span className="flex items-center gap-1 text-xs text-danger" title={status.message}>
        ⚠ Save failed
      </span>
    );
  }
  return <span className="text-xs text-ink-light">Auto-save on</span>;
}

export function WorkbookClient({
  clientId,
  workbookId,
  sheets,
  title,
  clientName,
}: WorkbookClientProps) {
  const [handle, setHandle] = useState<UniverWorkbookHandle | null>(null);
  const [status, setStatus] = useState<SaveStatus>({ state: "idle" });
  const [exporting, setExporting] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const handleReady = useCallback((h: UniverWorkbookHandle) => {
    setHandle(h);
  }, []);

  const handleSave = async () => {
    if (!handle) return;
    try {
      await handle.save();
    } catch {
      /* status already reported */
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      try {
        await handle?.save();
      } catch {
        /* ignore — export still uses last-saved DB state */
      }
      const res = await fetch(`/api/workbooks/${clientId}`);
      const wb: { sheets: WorkbookSheetData[] } = await res.json();
      const XLSX = await import("xlsx");
      const book = XLSX.utils.book_new();
      wb.sheets.forEach((sheet) => {
        const aoa = [
          sheet.columns,
          ...sheet.rows.map((r) => sheet.columns.map((c) => r[c] ?? "")),
        ];
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        const safeName = sheet.name.slice(0, 31).replace(/[\\/:*?[\]]/g, "_");
        XLSX.utils.book_append_sheet(book, ws, safeName);
      });
      const filename = `${clientName.replace(/[^a-zA-Z0-9]+/g, "_")}_workbook.xlsx`;
      XLSX.writeFile(book, filename);
    } catch (err) {
      console.error("[export] failed", err);
      alert(
        "Export gagal: " + (err instanceof Error ? err.message : "unknown error")
      );
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = async () => {
    try {
      await handle?.save();
    } catch {
      /* proceed with last saved */
    }
    window.open(`/workbooks/${clientId}/print`, "_blank", "noopener,noreferrer");
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/share/workbook/${clientId}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } catch {
      window.prompt("Copy link:", url);
    }
    // Catatan: link butuh PIN 6 digit yang di-set di Client detail.
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-cream px-8 py-3">
        <StatusBadge status={status} />
        <span className="text-ink-light">·</span>
        <button
          onClick={handleSave}
          disabled={!handle || status.state === "saving"}
          className="btn btn-secondary !py-1.5 text-xs disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          Save now
        </button>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="btn btn-secondary !py-1.5 text-xs disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          {exporting ? "Exporting…" : "Export XLSX"}
        </button>
        <button onClick={handlePrint} className="btn btn-secondary !py-1.5 text-xs">
          <Printer className="h-3.5 w-3.5" />
          Print
        </button>
        <button
          onClick={handleShare}
          className="btn btn-secondary !py-1.5 text-xs"
          title="Copy public share link (butuh PIN dari Client detail)"
        >
          <Share2 className="h-3.5 w-3.5" />
          {shareCopied ? "Link copied! Jangan lupa PIN" : "Share link"}
        </button>
      </div>
      <div className="flex-1 overflow-hidden bg-card">
        <UniverWorkbook
          workbookId={workbookId}
          sheets={sheets}
          title={title}
          onSaveStatusChange={setStatus}
          onReady={handleReady}
        />
      </div>
    </>
  );
}
