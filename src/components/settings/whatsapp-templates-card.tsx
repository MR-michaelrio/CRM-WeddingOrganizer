"use client";

import { useEffect, useState } from "react";
import { MessageSquareText, RotateCcw } from "lucide-react";
import { Field, Textarea } from "@/components/ui/form-field";
import { apiFetch, useFetch } from "@/lib/use-fetch";
import {
  DEFAULT_WA_TEMPLATES,
  WA_TEMPLATE_META,
  type WaTemplateKey,
} from "@/lib/whatsapp-templates";

// Map key template → nama kolom Setting.
function fieldName(key: WaTemplateKey): string {
  return `waTemplate${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

type SettingTemplates = Record<string, string | null>;

export function WhatsAppTemplatesCard() {
  const { data, refresh } = useFetch<SettingTemplates>("/api/settings");
  const [form, setForm] = useState<Record<WaTemplateKey, string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data && !form) {
      const next = {} as Record<WaTemplateKey, string>;
      for (const meta of WA_TEMPLATE_META) {
        const val = data[fieldName(meta.key)];
        next[meta.key] = (val ?? "") || DEFAULT_WA_TEMPLATES[meta.key];
      }
      setForm(next);
    }
  }, [data, form]);

  const update = (key: WaTemplateKey, value: string) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, string> = {};
      for (const meta of WA_TEMPLATE_META) {
        body[fieldName(meta.key)] = form[meta.key];
      }
      await apiFetch("/api/settings", { method: "PATCH", body });
      setSavedAt(Date.now());
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card-base p-6">
      <div className="mb-1 flex items-center gap-2">
        <MessageSquareText className="h-5 w-5 text-gold-dark" />
        <h3 className="text-lg font-semibold text-ink">Template WhatsApp</h3>
      </div>
      <p className="mb-5 text-[13px] text-ink-light">
        Atur isi pesan WhatsApp. Gunakan token seperti{" "}
        <code className="rounded bg-beige px-1">{"{clientNames}"}</code> yang akan
        diganti otomatis saat dikirim. Klik token untuk menyalin.
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {!form ? (
        <div className="text-sm text-ink-light">Memuat…</div>
      ) : (
        <div className="flex flex-col gap-5">
          {WA_TEMPLATE_META.map((meta) => (
            <Field key={meta.key} label={meta.label} hint={meta.description}>
              <div className="mb-1.5 flex flex-wrap gap-1">
                {meta.tokens.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(`{${t}}`)}
                    title="Klik untuk menyalin token"
                    className="rounded bg-beige px-1.5 py-0.5 text-[11px] text-ink-light transition-colors hover:bg-gold/20 hover:text-ink"
                  >
                    {`{${t}}`}
                  </button>
                ))}
              </div>
              <Textarea
                value={form[meta.key]}
                onChange={(e) => update(meta.key, e.target.value)}
                rows={meta.key === "invoice" || meta.key === "reminder" ? 12 : 6}
                className="font-mono text-[13px]"
              />
              <button
                type="button"
                onClick={() => update(meta.key, DEFAULT_WA_TEMPLATES[meta.key])}
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-ink-light hover:text-ink"
              >
                <RotateCcw className="h-3 w-3" />
                Reset ke default
              </button>
            </Field>
          ))}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary disabled:opacity-50"
            >
              {saving ? "Menyimpan…" : "Simpan Template"}
            </button>
            {savedAt && !saving && (
              <span className="text-xs text-success">Tersimpan ✓</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
