/** Parse string comma-separated jadi array opsi jenis baki yang bersih. */
export function parseJenisBakiList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
