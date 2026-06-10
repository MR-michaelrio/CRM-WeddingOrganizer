"use client";

import { useEffect, useRef, useState } from "react";
import "@univerjs/preset-sheets-core/lib/index.css";
import type { WorkbookSheetData } from "@/app/rundown/[id]/workbook-client";

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
};

type CellPayload = { v?: string; f?: string };

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
  const onReadyRef = useRef(onReady);
  const onSaveStatusChangeRef = useRef(onSaveStatusChange);
  const [ready, setReady] = useState(false);

  // Keep latest callbacks in refs (so we don't re-init Univer on prop change)
  useEffect(() => {
    onReadyRef.current = onReady;
    onSaveStatusChangeRef.current = onSaveStatusChange;
  });

  // Initialize lastSavedRows with the initial server state
  useEffect(() => {
    sheets.forEach((s) => lastSavedRows.current.set(s.id, s.rows));
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
    return sheets.map((s) => {
      const sheetData = sheetsMap[s.slug];
      const cellData = (sheetData?.cellData ?? {}) as Record<
        string,
        Record<string, { v?: unknown }>
      >;
      const rows = cellDataToRows(cellData, s.columns);
      return {
        sheetId: s.id,
        slug: s.slug,
        name: s.name,
        columns: s.columns,
        rows,
      };
    });
  }

  async function saveAll(force = false): Promise<void> {
    const snaps = readSnapshots();
    if (snaps.length === 0) return;

    const dirty = snaps.filter((s) => {
      const last = lastSavedRows.current.get(s.sheetId) ?? [];
      return !rowsEqual(last, s.rows);
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
            body: JSON.stringify({ rows: s.rows }),
          }).then((res) => {
            if (!res.ok) throw new Error(`Save failed (${res.status})`);
            lastSavedRows.current.set(s.sheetId, s.rows);
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

      sheets.forEach((sheet) => {
        sheetOrder.push(sheet.slug);
        const maxColumns = Math.max(sheet.columns.length + 2, 26);
        const maxRows = Math.max(sheet.rows.length + 20, 100);

        const columnData: Record<number, { w: number }> = {};
        sheet.columns.forEach((_, idx) => {
          columnData[idx] = { w: 160 };
        });

        sheetsConfig[sheet.slug] = {
          id: sheet.slug,
          name: sheet.name,
          cellData: buildCellData(sheet),
          rowCount: maxRows,
          columnCount: maxColumns,
          columnData,
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
        styles: {},
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
        const last = lastSavedRows.current.get(s.sheetId) ?? [];
        return !rowsEqual(last, s.rows);
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
