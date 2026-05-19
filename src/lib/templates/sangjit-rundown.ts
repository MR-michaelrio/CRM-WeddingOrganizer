export const SANGJIT_RUNDOWN_COLUMNS = [
  "Start",
  "End",
  "Durations",
  "Susunan Acara",
  "Keterangan",
];

export const DAFTAR_BAKI_COLUMNS = [
  "List Baki",
  "Penyerahan: Pembawa (CO)",
  "Penyerahan: Penerima (CE)",
  "Pengembalian: Pembawa (CE)",
  "Pengembalian: Penerima (CO)",
];

type RundownItem = {
  dur: string;
  acara: string;
  ket: string;
  // "none" — no start/end; "literal" — first row, literal start; "prev" — start = prev row's End
  startMode: "none" | "literal" | "prev";
};

const ITEMS: RundownItem[] = [
  { dur: "", acara: "Persiapan acara (set up baki)", ket: "", startMode: "none" },
  {
    dur: "",
    acara: "Semua tiba di ruangan. Keluarga CE & CO didalam, tempat duduk bebas",
    ket: "",
    startMode: "none",
  },
  {
    dur: "10 menit",
    acara: "Briefing pada keluarga yg membawa & menerima baki",
    ket: "",
    startMode: "none",
  },
  { dur: "5 menit", acara: "Opening MC", ket: "", startMode: "literal" },
  {
    dur: "15 menit",
    acara: "Penyerahan baki dari pihak CO kepada pihak CE",
    ket: "Pembawa dan penerima baki stand by",
    startMode: "prev",
  },
  {
    dur: "5 menit",
    acara: "Orangtua CE menuju ke depan stage",
    ket: "",
    startMode: "prev",
  },
  {
    dur: "5 menit",
    acara: "Orangtua CO dan CO menyusul ke stage\nPaipai/ gong xi sebanyak 3x",
    ket: "Paipai dari pihak CO > CE",
    startMode: "prev",
  },
  {
    dur: "5 menit",
    acara: "Penyampaian tujuan dari pihak CO\nSekalian perkenalan keluarga",
    ket: "Speech by:",
    startMode: "prev",
  },
  {
    dur: "5 menit",
    acara: "Kata sambutan dari pihak CE\nSekalian perkenalan keluarga",
    ket: "Speech by:....",
    startMode: "prev",
  },
  {
    dur: "5 menit",
    acara:
      "Orang tua CE menjemput pengantin CE, lalu berjalan ke stage\nPaipai/ gong xi sebanyak 3x",
    ket: "Paipai dari pihak CE > CO",
    startMode: "prev",
  },
  {
    dur: "5 menit",
    acara: "Pemakaian kalung kepada pengantin CE",
    ket: "oleh Mama CO - posisi kalung dari baki 1",
    startMode: "prev",
  },
  {
    dur: "5 menit",
    acara: "Kata sambutan dari pengantin CO",
    ket: "Menyampaikan terimakasih dan info tgl pernikahan",
    startMode: "prev",
  },
  {
    dur: "5 menit",
    acara:
      "Pengambilan Uang Susu dan Uang Antaran (dari baki 1)\n\nUang susu diambil semua\nUang antaran diambil 1 lembar atas, 1 lembar bawah",
    ket: "",
    startMode: "prev",
  },
  {
    dur: "15 menit",
    acara:
      "Sesi foto:\n1. Bride & Groom - all ortu\n2. Bride & Groom - ortu CO\n3. Bride & Groom - ortu CE\n4. Bride & Groom - keluarga CO\n5. Bride & Groom - keluarga CE\n6. Bride & Groom - penerima/pembawa baki",
    ket: "before lunch",
    startMode: "prev",
  },
  {
    dur: "5 menit",
    acara: "Doa makan dipimpin oleh....",
    ket: "",
    startMode: "prev",
  },
  {
    dur: "60 menit",
    acara: "Makan bersama & acara bebas",
    ket: "Beauty Shoot",
    startMode: "prev",
  },
  {
    dur: "10 menit",
    acara: "Pembagian isian baki menjadi 2",
    ket: "",
    startMode: "prev",
  },
  {
    dur: "5 menit",
    acara:
      "Foto Bersama dengan pembawa baki dan penyerahan tanda terima kasih kepada pembawa baki",
    ket: "CE memberi angpao ke kel. CO & sebaliknya",
    startMode: "prev",
  },
  {
    dur: "15 menit",
    acara: "Pengembalian Baki dari keluarga CE kepada CO",
    ket: "",
    startMode: "prev",
  },
  { dur: "5 menit", acara: "Closing MC", ket: "", startMode: "prev" },
];

const FIRST_TIME = "11:00";

// End-time formula. Avoids TIMEVALUE/TIME because Univer stores "11:00" as a
// plain string, not a time-typed value — so we do pure arithmetic on parsed
// HH and MM components instead. Duration is parsed as the number before the
// first space in col C ("5 menit" → 5).
function endFormula(n: number): string {
  const totalMin = `(VALUE(LEFT(A${n},2))*60+VALUE(RIGHT(A${n},2))+VALUE(LEFT(C${n},FIND(" ",C${n})-1)))`;
  return `=TEXT(INT(${totalMin}/60),"00")&":"&TEXT(MOD(${totalMin},60),"00")`;
}

export function buildSangjitRundownRows(): Record<string, string>[] {
  return ITEMS.map((it, k) => {
    const rowN = k + 2; // header is A1 row 1, data starts at row 2
    let start = "";
    if (it.startMode === "literal") start = FIRST_TIME;
    else if (it.startMode === "prev") start = `=B${rowN - 1}`;
    const end = it.startMode === "none" ? "" : endFormula(rowN);
    return {
      Start: start,
      End: end,
      Durations: it.dur,
      "Susunan Acara": it.acara,
      Keterangan: it.ket,
    };
  });
}

// Evaluate the Sangjit time formulas server-side (for print/export, where the
// spreadsheet engine isn't available). Walks rows in order, resolving
// Start = previous End and End = Start + Durations(min). Non-formula cells
// are returned unchanged.
export function resolveSangjitTimes(
  columns: string[],
  rows: Record<string, string>[]
): Record<string, string>[] {
  if (
    !columns.includes("Start") ||
    !columns.includes("End") ||
    !columns.includes("Durations")
  ) {
    return rows;
  }

  const timeRe = /^(\d{1,2}):(\d{2})$/;
  const durRe = /^(\d+)\s/;
  let prevEnd = "";

  return rows.map((row) => {
    const out = { ...row };
    let start = out.Start ?? "";
    if (start.startsWith("=")) start = prevEnd;
    out.Start = start;

    const endRaw = out.End ?? "";
    if (endRaw.startsWith("=")) {
      const sm = timeRe.exec(start);
      const dm = durRe.exec(out.Durations ?? "");
      if (sm && dm) {
        const total = Number(sm[1]) * 60 + Number(sm[2]) + Number(dm[1]);
        const h = Math.floor(total / 60);
        const m = total % 60;
        out.End = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      } else {
        out.End = "";
      }
    }
    prevEnd = out.End ?? "";
    return out;
  });
}

export function buildDaftarBakiRows(count = 8): Record<string, string>[] {
  return Array.from({ length: count }, (_, i) => ({
    "List Baki": `Baki ${i + 1}`,
    "Penyerahan: Pembawa (CO)": "",
    "Penyerahan: Penerima (CE)": "",
    "Pengembalian: Pembawa (CE)": "",
    "Pengembalian: Penerima (CO)": "",
  }));
}
