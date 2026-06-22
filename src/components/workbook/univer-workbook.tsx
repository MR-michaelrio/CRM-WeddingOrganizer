"use client";

import { useEffect, useRef, useState } from "react";
import "@univerjs/preset-sheets-core/lib/index.css";
import type {
  SheetLayout,
  SheetSnapshotData,
  WorkbookSheetData,
} from "@/app/rundown/[id]/workbook-client";

type UniverWorkbookProps = {
  workbookId: string;
  sheets: WorkbookSheetData[];
  title: string;
  onSaveStatusChange?: (status: SaveStatus) => void;
  onReady?: (handle: UniverWorkbookHandle) => void;
  // Mode read-only: sembunyikan toolbar/footer/formula bar untuk shared view.
  // Rumus tetap dikomputasi oleh engine Univer (yang relevan untuk display).
  readonly?: boolean;
};

export type SaveStatus =
  | { state: "idle" }
  | { state: "dirty" }
  | { state: "saving" }
  | { state: "saved"; at: number }
  | { state: "error"; message: string };

export type UniverWorkbookHandle = {
  save: () => Promise<void>;
};

type SheetSnapshot = {
  sheetId: number;
  slug: string;
  name: string;
  columns: string[];
  rows: Record<string, string>[];
  layout: SheetLayout;
  snapshot: SheetSnapshotData;
};

type CellPayload = { v?: string; f?: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

/**
 * Ambil snapshot lengkap satu worksheet beserta subset style yang dirujuk
 * sel-selnya. Menyimpan ini berarti SEMUA format (wrap text, bold, warna,
 * alignment, number format, merge cell, ukuran) ikut tersimpan & dipulihkan.
 */
function extractSheetSnapshot(
  worksheet: AnyRecord | undefined,
  stylesMap: AnyRecord
): SheetSnapshotData {
  const sheet = JSON.parse(JSON.stringify(worksheet ?? {})) as AnyRecord;
  const styles: AnyRecord = {};
  const cellData = (sheet.cellData ?? {}) as AnyRecord;
  for (const r of Object.keys(cellData)) {
    const row = cellData[r] as AnyRecord;
    if (!row) continue;
    for (const c of Object.keys(row)) {
      const s = row[c]?.s;
      if (typeof s === "string" && stylesMap[s] !== undefined) {
        styles[s] = stylesMap[s];
      }
    }
  }
  return { sheet, styles };
}

function buildCellData(sheet: WorkbookSheetData) {
  const cellData: Record<number, Record<number, CellPayload>> = { 0: {} };

  sheet.columns.forEach((col, idx) => {
    cellData[0]![idx] = { v: col };
  });

  sheet.rows.forEach((row, rowIdx) => {
    const rowCells: Record<number, CellPayload> = {};
    sheet.columns.forEach((col, colIdx) => {
      const value = row[col];
      if (value !== undefined && value !== "") {
        rowCells[colIdx] = value.startsWith("=") ? { f: value } : { v: value };
      }
    });
    cellData[rowIdx + 1] = rowCells;
  });

  return cellData;
}

function cellDataToRows(
  cellData: Record<string, Record<string, { v?: unknown; f?: unknown }>>,
  columns: string[]
): Record<string, string>[] {
  const rowIndices = Object.keys(cellData)
    .map((k) => Number(k))
    .filter((n) => !Number.isNaN(n) && n > 0)
    .sort((a, b) => a - b);
  const maxRow = rowIndices.length > 0 ? rowIndices[rowIndices.length - 1]! : 0;

  const rows: Record<string, string>[] = [];
  for (let r = 1; r <= maxRow; r++) {
    const rowCells = cellData[String(r)];
    if (!rowCells) {
      rows.push({});
      continue;
    }
    const obj: Record<string, string> = {};
    columns.forEach((col, idx) => {
      const cell = rowCells[String(idx)];
      // Preserve formulas — store "=..." back to DB instead of the computed value.
      const f = cell?.f;
      if (typeof f === "string" && f.length > 0) {
        obj[col] = f;
        return;
      }
      const v = cell?.v;
      obj[col] = v === undefined || v === null ? "" : String(v);
    });
    rows.push(obj);
  }
  while (rows.length > 0 && Object.values(rows[rows.length - 1]!).every((v) => v === "")) {
    rows.pop();
  }
  return rows;
}

function columnsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function recordEqual(
  a: Record<string, number> = {},
  b: Record<string, number> = {}
): boolean {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

function layoutEqual(a?: SheetLayout, b?: SheetLayout): boolean {
  return (
    recordEqual(a?.columnWidths, b?.columnWidths) &&
    recordEqual(a?.rowHeights, b?.rowHeights)
  );
}

function rowsEqual(a: Record<string, string>[], b: Record<string, string>[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ra = a[i]!;
    const rb = b[i]!;
    const allKeys = Object.keys(ra).concat(Object.keys(rb));
    const seen: Record<string, true> = {};
    for (const k of allKeys) {
      if (seen[k]) continue;
      seen[k] = true;
      if ((ra[k] ?? "") !== (rb[k] ?? "")) return false;
    }
  }
  return true;
}

export function UniverWorkbook({
  workbookId,
  sheets,
  title,
  onSaveStatusChange,
  onReady,
  readonly,
}: UniverWorkbookProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const univerRef = useRef<{ univer: { dispose: () => void } } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiRef = useRef<any>(null);
  const lastSavedRows = useRef<Map<number, Record<string, string>[]>>(new Map());
  const lastSavedColumns = useRef<Map<number, string[]>>(new Map());
  const lastSavedLayout = useRef<Map<number, SheetLayout>>(new Map());
  // JSON string snapshot per sheet untuk deteksi perubahan format/struktur.
  const lastSavedSnapshot = useRef<Map<number, string>>(new Map());
  const onReadyRef = useRef(onReady);
  const onSaveStatusChangeRef = useRef(onSaveStatusChange);
  const [ready, setReady] = useState(false);

  // Keep latest callbacks in refs (so we don't re-init Univer on prop change)
  useEffect(() => {
    onReadyRef.current = onReady;
    onSaveStatusChangeRef.current = onSaveStatusChange;
  });

  // Initialize lastSaved* with the initial server state
  useEffect(() => {
    sheets.forEach((s) => {
      lastSavedRows.current.set(s.id, s.rows);
      lastSavedColumns.current.set(s.id, s.columns);
    });
  }, [sheets]);

  function readSnapshots(): SheetSnapshot[] {
    const api = apiRef.current;
    if (!api) return [];
    const wb = api.getActiveWorkbook?.();
    if (!wb) return [];
    // Univer Facade: `save()` returns IWorkbookData (replaces deprecated getSnapshot)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wbSnap = (wb.save ? wb.save() : wb.getSnapshot?.()) as any;
    const sheetsMap = wbSnap?.sheets ?? {};
    const stylesMap = (wbSnap?.styles ?? {}) as AnyRecord;
    return sheets.map((s) => {
      const sheetData = sheetsMap[s.slug];
      const cellData = (sheetData?.cellData ?? {}) as Record<
        string,
        Record<string, { v?: unknown }>
      >;
      // Baris 0 = header. Baca label kolom yang sudah diedit user; kalau sel
      // dikosongkan, fallback ke nama kolom lama supaya tidak jadi string kosong.
      const headerRow = cellData["0"] ?? {};
      const columns = s.columns.map((orig, idx) => {
        const v = headerRow[String(idx)]?.v;
        const label = v === undefined || v === null ? "" : String(v).trim();
        return label || orig;
      });
      const rows = cellDataToRows(cellData, columns);

      // Baca lebar kolom & tinggi baris dari snapshot Univer.
      const colData = (sheetData?.columnData ?? {}) as Record<string, { w?: unknown }>;
      const rowData = (sheetData?.rowData ?? {}) as Record<string, { h?: unknown }>;
      const columnWidths: Record<string, number> = {};
      Object.entries(colData).forEach(([idx, c]) => {
        if (typeof c?.w === "number") columnWidths[idx] = c.w;
      });
      const rowHeights: Record<string, number> = {};
      Object.entries(rowData).forEach(([idx, r]) => {
        if (typeof r?.h === "number") rowHeights[idx] = r.h;
      });

      return {
        sheetId: s.id,
        slug: s.slug,
        name: s.name,
        columns,
        rows,
        layout: { columnWidths, rowHeights },
        snapshot: extractSheetSnapshot(sheetData, stylesMap),
      };
    });
  }

  async function saveAll(force = false): Promise<void> {
    const snaps = readSnapshots();
    if (snaps.length === 0) return;

    const dirty = snaps.filter((s) => {
      const lastRows = lastSavedRows.current.get(s.sheetId) ?? [];
      const lastCols = lastSavedColumns.current.get(s.sheetId) ?? s.columns;
      const lastLayout = lastSavedLayout.current.get(s.sheetId);
      const lastSnap = lastSavedSnapshot.current.get(s.sheetId);
      return (
        !rowsEqual(lastRows, s.rows) ||
        !columnsEqual(lastCols, s.columns) ||
        !layoutEqual(lastLayout, s.layout) ||
        lastSnap !== JSON.stringify(s.snapshot)
      );
    });
    if (!force && dirty.length === 0) return;

    // Safety: block save only if a sheet that *had* data now reads as empty.
    // That's the smoking gun for a broken read pipeline — never silently wipe.
    // All other cases (sheet went from empty → data, or data → different data) save normally.
    const blocked: string[] = [];
    const targets = (force ? snaps : dirty).filter((s) => {
      const last = lastSavedRows.current.get(s.sheetId) ?? [];
      if (last.length > 0 && s.rows.length === 0) {
        blocked.push(s.name);
        return false;
      }
      return true;
    });

    if (blocked.length > 0) {
      console.warn(
        `[Univer save] BLOCKED ${blocked.length} sheet(s) (read returned empty but had data): ${blocked.join(", ")}`
      );
    }

    if (targets.length === 0) {
      if (force) {
        onSaveStatusChangeRef.current?.({
          state: "error",
          message:
            blocked.length > 0
              ? `Read returned empty for ${blocked.join(", ")} — refresh halaman lalu coba lagi.`
              : "Tidak ada perubahan untuk disimpan.",
        });
      }
      return;
    }
    console.log(
      "[Univer save] saving",
      targets.length,
      "sheet(s):",
      targets.map((t) => `${t.name} (${t.rows.length} rows)`).join(", ")
    );

    onSaveStatusChangeRef.current?.({ state: "saving" });
    try {
      await Promise.all(
        targets.map((s) =>
          fetch(`/api/sheets/${s.sheetId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              rows: s.rows,
              columns: s.columns,
              layout: s.layout,
              snapshot: s.snapshot,
            }),
          }).then((res) => {
            if (!res.ok) throw new Error(`Save failed (${res.status})`);
            lastSavedRows.current.set(s.sheetId, s.rows);
            lastSavedColumns.current.set(s.sheetId, s.columns);
            lastSavedLayout.current.set(s.sheetId, s.layout);
            lastSavedSnapshot.current.set(s.sheetId, JSON.stringify(s.snapshot));
          })
        )
      );
      onSaveStatusChangeRef.current?.({ state: "saved", at: Date.now() });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      onSaveStatusChangeRef.current?.({ state: "error", message });
      throw err;
    }
  }

  // Expose the save handle to the parent once Univer is ready.
  useEffect(() => {
    if (!ready) return;
    // Tetapkan baseline dari state awal Univer (termasuk lebar/tinggi default
    // yang dirender) supaya perubahan terdeteksi relatif ke tampilan awal —
    // mencegah auto-save palsu saat halaman baru dibuka.
    readSnapshots().forEach((s) => {
      lastSavedRows.current.set(s.sheetId, s.rows);
      lastSavedColumns.current.set(s.sheetId, s.columns);
      lastSavedLayout.current.set(s.sheetId, s.layout);
      lastSavedSnapshot.current.set(s.sheetId, JSON.stringify(s.snapshot));
    });
    onReadyRef.current?.({ save: () => saveAll(true) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    let disposed = false;

    async function boot() {
      if (!containerRef.current) return;

      const [{ createUniver, LocaleType, mergeLocales }, sheetsCore, locale] =
        await Promise.all([
          import("@univerjs/presets"),
          import("@univerjs/preset-sheets-core"),
          import("@univerjs/preset-sheets-core/locales/en-US"),
        ]);

      if (disposed || !containerRef.current) return;

      const { univer, univerAPI } = createUniver({
        locale: LocaleType.EN_US,
        locales: {
          [LocaleType.EN_US]: mergeLocales(locale.default),
        },
        presets: [
          sheetsCore.UniverSheetsCorePreset({
            container: containerRef.current,
            header: !readonly,
            toolbar: !readonly,
            footer: readonly
              ? {
                  sheetBar: true,
                  statisticBar: false,
                  menus: false,
                  zoomSlider: false,
                }
              : {
                  sheetBar: true,
                  statisticBar: true,
                  menus: true,
                  zoomSlider: true,
                },
            formulaBar: !readonly,
          }),
        ],
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sheetsConfig: Record<string, any> = {};
      const sheetOrder: string[] = [];
      // Style map gabungan dari semua snapshot sheet (preserve format sel).
      const mergedStyles: AnyRecord = {};

      sheets.forEach((sheet) => {
        sheetOrder.push(sheet.slug);

        // Jika ada snapshot tersimpan, pulihkan sheet persis seperti terakhir
        // (lengkap dgn wrap text, bold, warna, alignment, number format, merge,
        // ukuran kolom/baris). Override id & name supaya konsisten dgn DB.
        if (sheet.snapshot?.sheet) {
          sheetsConfig[sheet.slug] = {
            ...sheet.snapshot.sheet,
            id: sheet.slug,
            name: sheet.name,
          };
          Object.assign(mergedStyles, sheet.snapshot.styles ?? {});
          return;
        }

        // Tanpa snapshot (sheet lama/baru): bangun dari columns/rows + layout.
        const maxColumns = Math.max(sheet.columns.length + 2, 26);
        const maxRows = Math.max(sheet.rows.length + 20, 100);

        const savedWidths = sheet.layout?.columnWidths ?? {};
        const columnData: Record<number, { w: number }> = {};
        sheet.columns.forEach((_, idx) => {
          columnData[idx] = { w: 160 };
        });
        Object.entries(savedWidths).forEach(([idx, w]) => {
          if (typeof w === "number") columnData[Number(idx)] = { w };
        });

        const savedHeights = sheet.layout?.rowHeights ?? {};
        const rowData: Record<number, { h: number }> = {};
        Object.entries(savedHeights).forEach(([idx, h]) => {
          if (typeof h === "number") rowData[Number(idx)] = { h };
        });

        sheetsConfig[sheet.slug] = {
          id: sheet.slug,
          name: sheet.name,
          cellData: buildCellData(sheet),
          rowCount: maxRows,
          columnCount: maxColumns,
          columnData,
          rowData,
          defaultColumnWidth: 120,
          defaultRowHeight: 28,
          freeze: { startRow: 1, startColumn: 0, ySplit: 1, xSplit: 0 },
        };
      });

      univerAPI.createWorkbook({
        id: workbookId,
        name: title,
        appVersion: "1.0.0",
        locale: LocaleType.EN_US,
        styles: mergedStyles,
        sheetOrder,
        sheets: sheetsConfig,
      });

      apiRef.current = univerAPI;
      univerRef.current = { univer };
      setReady(true);
    }

    boot().catch((err) => {
      console.error("[Univer] failed to load", err);
      onSaveStatusChangeRef.current?.({
        state: "error",
        message: err instanceof Error ? err.message : "Load failed",
      });
    });

    return () => {
      disposed = true;
      const u = univerRef.current?.univer;
      univerRef.current = null;
      apiRef.current = null;
      // Defer dispose so React can finish its current render/unmount cycle
      // before Univer tears down its own React root (avoids "synchronously
      // unmount a root while React was already rendering" warning).
      if (u) {
        setTimeout(() => {
          try {
            u.dispose();
          } catch (err) {
            console.warn("[Univer] dispose error (ignored):", err);
          }
        }, 0);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save polling
  useEffect(() => {
    if (!ready) return;
    const timer = setInterval(() => {
      const snaps = readSnapshots();
      const anyDirty = snaps.some((s) => {
        const lastRows = lastSavedRows.current.get(s.sheetId) ?? [];
        const lastCols = lastSavedColumns.current.get(s.sheetId) ?? s.columns;
        const lastLayout = lastSavedLayout.current.get(s.sheetId);
        const lastSnap = lastSavedSnapshot.current.get(s.sheetId);
        return (
          !rowsEqual(lastRows, s.rows) ||
          !columnsEqual(lastCols, s.columns) ||
          !layoutEqual(lastLayout, s.layout) ||
          lastSnap !== JSON.stringify(s.snapshot)
        );
      });
      if (anyDirty) {
        onSaveStatusChangeRef.current?.({ state: "dirty" });
        saveAll().catch(() => {
          /* status already reported */
        });
      }
    }, 3000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {!ready && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-cream/95 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-gold-dark" />
            <div className="font-serif text-base font-semibold text-ink">
              Loading workbook…
            </div>
            <div className="text-xs text-ink-light">
              Menyiapkan sheet & formula
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
