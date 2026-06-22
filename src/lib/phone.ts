/**
 * Normalisasi nomor telepon Indonesia ke format WhatsApp `628...`.
 *
 * Aturan:
 *  - `08xxxx`        → `628xxxx`   (ganti 0 depan jadi 62)
 *  - `+628xxxx`      → `628xxxx`   (buang +)
 *  - `0062 8xxxx`    → `628xxxx`   (buang prefix internasional 00)
 *  - `628xxxx`       → tetap
 *  - `8xxxx` / `899-000-000` → `628xxxx` (tambah 62 di depan)
 *  - pemisah (spasi, -, (), .) diabaikan
 */
export function normalizeWhatsAppPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  // Sisakan digit saja (buang +, spasi, -, (), ., dll.)
  let s = String(raw).replace(/\D/g, "");
  if (!s) return "";

  // Buang prefix internasional "00" (mis. 0062...)
  if (s.startsWith("00")) s = s.slice(2);

  if (s.startsWith("62")) return s;
  if (s.startsWith("0")) return `62${s.slice(1)}`;
  if (s.startsWith("8")) return `62${s}`;
  // Fallback: nomor lain (mis. fixed line "21...") tetap diberi kode negara.
  return `62${s}`;
}
