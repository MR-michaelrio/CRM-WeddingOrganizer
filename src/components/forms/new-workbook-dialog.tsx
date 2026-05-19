"use client";

import { useState } from "react";
import { Heart, Sparkles, Coffee, Gem, FilePlus } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/form-field";
import { apiFetch } from "@/lib/use-fetch";
import { cn } from "@/lib/utils";

const templates = [
  {
    id: "wedding-ballroom",
    name: "Wedding Ballroom",
    eventType: "Wedding",
    description: "Full wedding package — rundown, vendor, finance, checklist",
    icon: Heart,
    sheets: ["Wedding Rundown", "Vendor List", "Finance", "Checklist"],
  },
  {
    id: "sangjit",
    name: "Sangjit",
    eventType: "Sangjit",
    description: "Sangjit rundown + baki list + family PIC",
    icon: Gem,
    sheets: ["Sangjit Rundown", "Wedding Rundown", "Vendor List", "Finance"],
  },
  {
    id: "intimate",
    name: "Intimate Wedding",
    eventType: "Wedding",
    description: "Format ringkas untuk wedding kecil/intimate",
    icon: Sparkles,
    sheets: ["Rundown", "Vendor", "Guest List"],
  },
  {
    id: "tea-pai",
    name: "Tea Pai",
    eventType: "Tea Pai",
    description: "Tradisi Tea Pai dengan acara keluarga",
    icon: Coffee,
    sheets: ["Tea Pai Rundown", "Family Order", "Tea Set"],
  },
  {
    id: "custom",
    name: "Custom",
    eventType: "Wedding",
    description: "Workbook kosong — bisa di-customize sesuka hati",
    icon: FilePlus,
    sheets: [],
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function NewWorkbookDialog({ open, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<"template" | "details">("template");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep("template");
    setTemplateId(null);
    setSubmitting(false);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const selectedTemplate = templates.find((t) => t.id === templateId);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      names: String(fd.get("names") ?? "").trim(),
      eventType: selectedTemplate.eventType,
      eventDate: String(fd.get("eventDate") ?? ""),
      venue: String(fd.get("venue") ?? "") || undefined,
      template: selectedTemplate.id,
    };
    try {
      await apiFetch("/api/clients", { body: payload });
      reset();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="New Workbook"
      description={
        step === "template"
          ? "Pilih template — sistem akan auto-generate sheets sesuai jenis event"
          : `Template: ${selectedTemplate?.name} · Isi detail client`
      }
      size="lg"
      footer={
        step === "template" ? (
          <>
            <button onClick={handleClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={() => setStep("details")}
              disabled={!templateId}
              className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue →
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setStep("template")} className="btn btn-secondary">
              ← Back
            </button>
            <button
              type="submit"
              form="new-workbook-form"
              disabled={submitting}
              className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create Workbook"}
            </button>
          </>
        )
      }
    >
      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}
      {step === "template" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map((t) => {
            const Icon = t.icon;
            const active = templateId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTemplateId(t.id)}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-md border p-4 text-left transition-all",
                  active
                    ? "border-gold bg-gold/5 shadow-card"
                    : "border-line bg-card hover:border-gold/50 hover:bg-cream"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-sm",
                    active ? "bg-gold text-white" : "bg-gold-light text-gold-dark"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="font-semibold text-ink">{t.name}</div>
                <p className="text-xs text-ink-light">{t.description}</p>
                {t.sheets.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {t.sheets.map((s) => (
                      <span
                        key={s}
                        className="rounded-sm bg-cream px-1.5 py-0.5 text-[10px] font-medium text-ink-medium"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <form
          id="new-workbook-form"
          onSubmit={handleSubmit}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Field label="Couple Name" required className="sm:col-span-2">
            <Input name="names" required placeholder="e.g. Michael & Felicia" />
          </Field>
          <Field label="Event Date" required>
            <Input name="eventDate" type="date" required />
          </Field>
          <Field label="Package">
            <Select name="package" defaultValue="Standard">
              <option>Standard</option>
              <option>Premium</option>
              <option>Luxury</option>
            </Select>
          </Field>
          <Field label="Venue" className="sm:col-span-2">
            <Input name="venue" placeholder="e.g. Grand Ballroom Hotel Mulia" />
          </Field>
        </form>
      )}
    </Dialog>
  );
}
