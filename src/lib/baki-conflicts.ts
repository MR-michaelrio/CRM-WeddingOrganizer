import { prisma } from "@/lib/prisma";
import { parseJenisBakiList } from "@/lib/jenis-baki";

export type BakiConflict = {
  jenisBaki: string;
  clientId: number;
  clientName: string;
  date: string; // YYYY-MM-DD
  diffDays: number; // 0 = hari sama, +1 = hari berikutnya, -1 = hari sebelumnya
};

export type BakiConflictResult = {
  // Bentrok di hari yang sama → harus diblokir.
  sameDay: BakiConflict[];
  // Selisih 1 hari → boleh tapi admin diberi peringatan.
  adjacent: BakiConflict[];
};

/** Pesan error untuk bentrok di hari yang sama (dipakai server & UI). */
export function formatSameDayError(conflicts: BakiConflict[]): string {
  const detail = conflicts
    .map((c) => `${c.jenisBaki} (sudah dipakai ${c.clientName})`)
    .join(", ");
  return `Jenis baki tidak bisa dipakai di hari sangjit yang sama: ${detail}.`;
}

/** Pesan peringatan untuk pemakaian baki berselisih 1 hari. */
export function formatAdjacentWarning(conflicts: BakiConflict[]): string {
  const detail = conflicts
    .map((c) => {
      const when = c.diffDays > 0 ? "hari berikutnya" : "hari sebelumnya";
      return `${c.jenisBaki} juga dipakai ${when} oleh ${c.clientName} (${c.date})`;
    })
    .join("; ");
  return `Peringatan: ${detail}. Lanjutkan?`;
}

/** Kunci tanggal (YYYY-MM-DD) berbasis UTC, konsisten dgn cara eventDate disimpan. */
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function diffInDays(aKey: string, bKey: string): number {
  const a = Date.parse(`${aKey}T00:00:00Z`);
  const b = Date.parse(`${bKey}T00:00:00Z`);
  return Math.round((a - b) / 86_400_000);
}

function isSangjit(eventType: string): boolean {
  return eventType.toLowerCase().includes("sangjit");
}

/**
 * Cek pemakaian jenis baki yang sama pada hari sangjit yang sama (blokir)
 * atau berselisih 1 hari (peringatan).
 *
 * Hanya membandingkan terhadap event yang mengandung "sangjit", karena baki
 * dipakai saat sangjit.
 */
export async function checkBakiConflicts(opts: {
  date: string; // YYYY-MM-DD atau ISO
  jenisBaki: string[];
  eventType?: string; // tipe event client yg sedang dibuat/diedit
  excludeId?: number; // abaikan client ini sendiri (saat edit)
}): Promise<BakiConflictResult> {
  const wanted = opts.jenisBaki
    .map((s) => s.trim())
    .filter(Boolean);

  const empty: BakiConflictResult = { sameDay: [], adjacent: [] };
  if (wanted.length === 0) return empty;

  // Jika tipe event diketahui dan bukan sangjit, baki tidak dipakai → no-op.
  if (opts.eventType && !isSangjit(opts.eventType)) return empty;

  const targetKey = dayKey(new Date(opts.date));
  const wantedLower = new Set(wanted.map((w) => w.toLowerCase()));

  // Ambil semua client sangjit lain yang punya jenisBaki. Jumlah client kecil,
  // jadi filter & hitung selisih hari di JS lebih sederhana & bebas bug timezone.
  const candidates = await prisma.client.findMany({
    where: {
      jenisBaki: { not: null },
      ...(opts.excludeId ? { id: { not: opts.excludeId } } : {}),
    },
    select: { id: true, names: true, eventType: true, eventDate: true, jenisBaki: true },
  });

  const sameDay: BakiConflict[] = [];
  const adjacent: BakiConflict[] = [];

  for (const c of candidates) {
    if (!isSangjit(c.eventType)) continue;
    const cKey = dayKey(c.eventDate);
    const diff = diffInDays(cKey, targetKey);
    if (diff !== 0 && Math.abs(diff) !== 1) continue;

    for (const baki of parseJenisBakiList(c.jenisBaki)) {
      if (!wantedLower.has(baki.toLowerCase())) continue;
      const entry: BakiConflict = {
        jenisBaki: baki,
        clientId: c.id,
        clientName: c.names,
        date: cKey,
        diffDays: diff,
      };
      if (diff === 0) sameDay.push(entry);
      else adjacent.push(entry);
    }
  }

  return { sameDay, adjacent };
}
