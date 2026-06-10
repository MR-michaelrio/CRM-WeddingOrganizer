import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
]);
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 80);
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Field 'file' tidak ditemukan" },
        { status: 400 }
      );
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `Tipe file tidak diizinkan: ${file.type}. Hanya JPG/PNG/PDF.` },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `Ukuran file melebihi batas ${MAX_SIZE / 1024 / 1024} MB` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const ts = Date.now();
    const safeName = sanitizeFilename(file.name || "bukti");
    const filename = `${ts}-${safeName}`;

    const dir = path.join(process.cwd(), "public", "uploads", "expenses");
    await mkdir(dir, { recursive: true });
    const filePath = path.join(dir, filename);
    await writeFile(filePath, buffer);

    return NextResponse.json({
      url: `/uploads/expenses/${filename}`,
      filename: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload gagal" },
      { status: 500 }
    );
  }
}
