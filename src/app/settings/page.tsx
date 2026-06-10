"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoader } from "@/components/ui/page-loader";
import { Field, Input, Textarea } from "@/components/ui/form-field";
import { GoogleAccountCard } from "@/components/settings/google-card";
import { PackagesCard } from "@/components/settings/packages-card";
import { apiFetch, useFetch } from "@/lib/use-fetch";

type SettingDTO = {
  id: number;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string | null;
  brandName: string;
  brandTagline: string;
  brandLogoUrl: string | null;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  signatoryName: string;
  signatureUrl: string | null;
  thankYouMessage: string;
  contractTerms: string | null;
  contractCancellation: string | null;
  contractPaymentTerms: string | null;
  emailNotifications: boolean;
  autoBackup: boolean;
  smsReminders: boolean;
  twoFactorAuth: boolean;
};

function Toggle({
  active,
  onChange,
}: {
  active: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors ${
        active ? "bg-gold" : "bg-line"
      }`}
    >
      <div
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-soft transition-transform ${
          active ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { data, loading, error, refresh } = useFetch<SettingDTO>("/api/settings");
  const [form, setForm] = useState<SettingDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (data && !form) setForm(data);
  }, [data, form]);

  const updateField = <K extends keyof SettingDTO>(key: K, value: SettingDTO[K]) => {
    if (!form) return;
    setForm({ ...form, [key]: value });
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setSaveError(null);
    try {
      await apiFetch("/api/settings", {
        method: "PATCH",
        body: {
          companyName: form.companyName,
          companyEmail: form.companyEmail,
          companyPhone: form.companyPhone,
          companyAddress: form.companyAddress,
          brandName: form.brandName,
          brandTagline: form.brandTagline,
          brandLogoUrl: form.brandLogoUrl,
          bankName: form.bankName,
          bankAccount: form.bankAccount,
          bankAccountName: form.bankAccountName,
          signatoryName: form.signatoryName,
          signatureUrl: form.signatureUrl,
          thankYouMessage: form.thankYouMessage,
          contractTerms: form.contractTerms,
          contractCancellation: form.contractCancellation,
          contractPaymentTerms: form.contractPaymentTerms,
          emailNotifications: form.emailNotifications,
          autoBackup: form.autoBackup,
          smsReminders: form.smsReminders,
          twoFactorAuth: form.twoFactorAuth,
        },
      });
      setSavedAt(Date.now());
      refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return (
      <div className="p-8">
        <PageHeader title="Settings" subtitle="System configuration" />
        <PageLoader label="Loading settings…" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <PageHeader title="Settings" subtitle="System configuration" />

      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}
      {saveError && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {saveError}
        </div>
      )}

      <div className="mb-5">
        <GoogleAccountCard />
      </div>

      <div className="mb-5">
        <PackagesCard />
      </div>

      <div className="card-base mb-5 p-6">
        <h3 className="mb-1 text-lg font-semibold text-ink">Invoice Branding</h3>
        <p className="mb-5 text-[13px] text-ink-light">
          Info ini dipakai di header & footer invoice yang di-print.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Brand Name">
            <Input
              value={form.brandName}
              onChange={(e) => updateField("brandName", e.target.value)}
              placeholder="eclipse.sangjit"
            />
          </Field>
          <Field label="Tagline">
            <Input
              value={form.brandTagline}
              onChange={(e) => updateField("brandTagline", e.target.value)}
              placeholder="JA BO DE TA BEK"
            />
          </Field>
          <Field
            label="Logo URL"
            hint="Opsional. URL gambar logo (jika kosong, pakai brand name sebagai teks)."
            className="sm:col-span-2"
          >
            <Input
              value={form.brandLogoUrl ?? ""}
              onChange={(e) => updateField("brandLogoUrl", e.target.value || null)}
              placeholder="https://..."
            />
          </Field>
          <Field label="Bank Name">
            <Input
              value={form.bankName}
              onChange={(e) => updateField("bankName", e.target.value)}
              placeholder="BCA"
            />
          </Field>
          <Field label="No Rekening">
            <Input
              value={form.bankAccount}
              onChange={(e) => updateField("bankAccount", e.target.value)}
              placeholder="7015466197"
            />
          </Field>
          <Field label="Atas Nama" className="sm:col-span-2">
            <Input
              value={form.bankAccountName}
              onChange={(e) => updateField("bankAccountName", e.target.value)}
              placeholder="Michael Rio Agustino Tan"
            />
          </Field>
          <Field label="Signatory Name">
            <Input
              value={form.signatoryName}
              onChange={(e) => updateField("signatoryName", e.target.value)}
              placeholder="Michael Rio Agustino Tan"
            />
          </Field>
          <Field
            label="Signature Image URL"
            hint="Opsional. URL gambar tanda tangan (PNG transparan)."
          >
            <Input
              value={form.signatureUrl ?? ""}
              onChange={(e) => updateField("signatureUrl", e.target.value || null)}
              placeholder="https://..."
            />
          </Field>
          <Field label="Thank You Message" className="sm:col-span-2">
            <Input
              value={form.thankYouMessage}
              onChange={(e) => updateField("thankYouMessage", e.target.value)}
              placeholder="TERIMAKASIH ATAS KEPERCAYAAN ANDA"
            />
          </Field>
        </div>
      </div>

      <div className="card-base p-6">
        <h3 className="mb-1 text-lg font-semibold text-ink">Kontrak Kerja Sama</h3>
        <p className="mb-5 text-[13px] text-ink-light">
          Teks default untuk dokumen kontrak. Pisahkan paragraf dengan baris kosong, atau gunakan
          baris yang diawali "- " untuk bullet list.
        </p>
        <div className="flex flex-col gap-4">
          <Field
            label="Hak & Kewajiban / Ketentuan Umum"
            hint="Klausul utama kontrak. Bisa multi-paragraf."
          >
            <Textarea
              value={form.contractTerms ?? ""}
              onChange={(e) => updateField("contractTerms", e.target.value)}
              placeholder={
                "PIHAK PERTAMA (Vendor) berkewajiban menyediakan jasa sesuai paket yang disepakati.\n" +
                "PIHAK KEDUA (Client) berkewajiban melakukan pembayaran sesuai timeline yang tertera.\n" +
                "..."
              }
              rows={8}
            />
          </Field>
          <Field
            label="Timeline Pembayaran"
            hint="Penjelasan tahapan pembayaran (DP, pelunasan, dll.)."
          >
            <Textarea
              value={form.contractPaymentTerms ?? ""}
              onChange={(e) => updateField("contractPaymentTerms", e.target.value)}
              placeholder={
                "- DP minimal 30% dibayarkan pada saat kontrak ditandatangani.\n" +
                "- Pelunasan paling lambat H-7 sebelum tanggal acara.\n" +
                "- Pembayaran via transfer ke rekening yang tertera."
              }
              rows={5}
            />
          </Field>
          <Field
            label="Pembatalan / Perubahan Jadwal"
            hint="Klausul cancellation & reschedule."
          >
            <Textarea
              value={form.contractCancellation ?? ""}
              onChange={(e) => updateField("contractCancellation", e.target.value)}
              placeholder={
                "- Pembatalan dari PIHAK KEDUA: DP tidak dapat dikembalikan.\n" +
                "- Perubahan jadwal: hanya dapat dilakukan 1 (satu) kali dengan konfirmasi minimal H-30."
              }
              rows={5}
            />
          </Field>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card-base p-6">
          <h3 className="mb-5 text-lg font-semibold text-ink">Company Profile</h3>
          <div className="flex flex-col gap-4">
            <Field label="Company Name">
              <Input
                value={form.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
                placeholder="WO Premium"
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.companyEmail}
                onChange={(e) => updateField("companyEmail", e.target.value)}
                placeholder="hello@wopremium.com"
              />
            </Field>
            <Field label="Phone">
              <Input
                type="tel"
                value={form.companyPhone}
                onChange={(e) => updateField("companyPhone", e.target.value)}
                placeholder="+62 812-3456-7890"
              />
            </Field>
            <Field label="Address">
              <Textarea
                value={form.companyAddress ?? ""}
                onChange={(e) => updateField("companyAddress", e.target.value)}
                placeholder="Jl. Sudirman No. 1, Jakarta"
              />
            </Field>
          </div>
        </div>

        <div className="card-base p-6">
          <h3 className="mb-5 text-lg font-semibold text-ink">Preferences</h3>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <div className="font-semibold text-ink">Email Notifications</div>
                <div className="text-[13px] text-ink-light">Receive updates via email</div>
              </div>
              <Toggle
                active={form.emailNotifications}
                onChange={(v) => updateField("emailNotifications", v)}
              />
            </div>
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <div className="font-semibold text-ink">Auto Backup</div>
                <div className="text-[13px] text-ink-light">Daily automatic backup</div>
              </div>
              <Toggle
                active={form.autoBackup}
                onChange={(v) => updateField("autoBackup", v)}
              />
            </div>
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <div className="font-semibold text-ink">SMS Reminders</div>
                <div className="text-[13px] text-ink-light">
                  Send SMS reminders to crew before events
                </div>
              </div>
              <Toggle
                active={form.smsReminders}
                onChange={(v) => updateField("smsReminders", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-ink">Two-factor Auth</div>
                <div className="text-[13px] text-ink-light">Enhanced login security</div>
              </div>
              <Toggle
                active={form.twoFactorAuth}
                onChange={(v) => updateField("twoFactorAuth", v)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
        {savedAt && Date.now() - savedAt < 4000 && (
          <span className="text-sm text-success">✓ Saved successfully</span>
        )}
      </div>
    </div>
  );
}
