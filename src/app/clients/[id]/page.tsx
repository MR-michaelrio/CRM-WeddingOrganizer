import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Box,
  Calendar,
  CheckSquare,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Mail,
  MapPin,
  MessageCircle,
  Palette,
  Phone,
  Receipt,
  StickyNote,
  Users,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/ui/page-header";
import { formatDateID, formatIDR } from "@/lib/format";
import {
  computeTransactionStatus,
  transactionStatusLabel,
  transactionStatusTone,
} from "@/lib/transaction-status";
import { WorkbookPinCard } from "@/components/forms/workbook-pin-card";
import { CrewAssignmentPanel } from "@/components/forms/crew-assignment-panel";
import { WhatsAppActions } from "@/components/forms/whatsapp-actions";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

function statusTone(s: string) {
  if (s === "completed" || s === "paid" || s === "approved" || s === "done")
    return "success" as const;
  if (s === "active" || s === "in_progress" || s === "sent") return "warning" as const;
  if (s === "overdue") return "danger" as const;
  return "neutral" as const;
}

function txStatusBadgeTone(
  s: string
): "neutral" | "gold" | "warning" | "success" | "danger" {
  switch (s) {
    case "success":
    case "gold":
    case "warning":
    case "danger":
      return s;
    default:
      return "neutral";
  }
}

function SectionCard({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card-base p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gold-dark" />
          <h3 className="font-serif text-lg font-semibold text-ink">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-line bg-cream/50 px-4 py-8 text-center text-sm italic text-ink-light">
      {text}
    </div>
  );
}

export default async function ClientDetailPage({ params }: Params) {
  const id = Number(params.id);
  if (Number.isNaN(id)) notFound();

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      pic: true,
      workbook: {
        include: {
          sheets: {
            orderBy: { position: "asc" },
            select: { id: true, slug: true, name: true, position: true },
          },
        },
      },
      tasks: { orderBy: [{ status: "asc" }, { position: "asc" }] },
      payments: { orderBy: { paymentDate: "desc" } },
      invoices: { orderBy: { issuedDate: "desc" } },
      designs: { orderBy: { uploadedAt: "desc" } },
      events: { orderBy: { startAt: "asc" } },
    },
  });

  if (!client) notFound();

  const settings = await prisma.setting.findFirst();

  const totalPaid = client.payments
    .filter((p) => p.type !== "expense" && p.type !== "vendor")
    .reduce((s, p) => s + Number(p.amount), 0);
  const totalInvoiced = client.invoices.reduce((s, i) => s + Number(i.amount), 0);
  const contractValue = client.contractValue ? Number(client.contractValue) : 0;
  const outstanding = Math.max(contractValue - totalPaid, 0);

  // ---- Transaction status (per-client) ----
  const dpInvoice = client.invoices.find((i) => i.type === "dp");
  const pelunasanInvoice = client.invoices.find((i) => i.type === "pelunasan");
  const txStatus = computeTransactionStatus(
    client.invoices.map((i) => ({
      type: i.type,
      status: i.status,
      amount: Number(i.amount),
      dueDate: i.dueDate,
      paidAt: i.paidAt,
    }))
  );
  const txLabel = transactionStatusLabel(txStatus);
  const txTone = txStatusBadgeTone(transactionStatusTone(txStatus));
  const showInvoiceDp = txStatus === "draft" || txStatus === "sent";
  const showInvoicePelunasan =
    txStatus === "paid_dp" || txStatus === "overdue";
  const showKwitansiDp =
    txStatus === "paid_dp" ||
    txStatus === "overdue" ||
    txStatus === "paid_lunas";
  const showKwitansiPelunasan = txStatus === "paid_lunas";
  const showKontrak =
    txStatus === "paid_dp" ||
    txStatus === "paid_lunas" ||
    txStatus === "overdue";

  // ---- Data untuk tombol WhatsApp ----
  // Tombol "Kirim Invoice" mengirim invoice DP (utama); tombol Pelunasan
  // mengirim invoice pelunasan secara terpisah.
  const waInvoiceSrc = dpInvoice ?? client.invoices[0] ?? null;
  const waInvoice = waInvoiceSrc
    ? {
        id: waInvoiceSrc.id,
        number: waInvoiceSrc.number,
        amount: Number(waInvoiceSrc.amount),
        type: waInvoiceSrc.type,
        dueDate: waInvoiceSrc.dueDate ? waInvoiceSrc.dueDate.toISOString() : null,
      }
    : null;
  const waCtx = {
    clientNames: client.names,
    eventType: client.eventType,
    eventDate: client.eventDate.toISOString(),
    brandName: settings?.brandName ?? settings?.companyName ?? "Eclipse",
    bank: {
      name: settings?.bankName ?? "",
      account: settings?.bankAccount ?? "",
      accountName: settings?.bankAccountName ?? "",
    },
  };

  return (
    <div className="p-8">
      <Link
        href="/clients"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-ink-light transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to clients
      </Link>

      <PageHeader
        title={client.names}
        subtitle={`${client.eventType} · ${formatDateID(client.eventDate)}${client.jenisBaki ? ` · ${client.jenisBaki}` : ""}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href={`/rundown/${client.id}`} className="btn btn-secondary">
              <FileText className="h-4 w-4" />
              Open Workbook
            </Link>
            {client.galleryUrl && (
              <a
                href={client.galleryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                <ImageIcon className="h-4 w-4" />
                Open Gallery
              </a>
            )}
          </div>
        }
      />

      {/* ----- Status Transaksi & Dokumen ----- */}
      <div className="mb-6 card-base p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-ink-light">
              Status Transaksi
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <Badge tone={txTone}>{txLabel}</Badge>
              {pelunasanInvoice?.dueDate && (
                <span className="text-xs text-ink-light">
                  Pelunasan due {formatDateID(pelunasanInvoice.dueDate)}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {showInvoiceDp && dpInvoice && (
              <a
                href={`/invoices/${dpInvoice.id}/print`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary text-sm"
              >
                <FileText className="h-4 w-4" /> Invoice DP
              </a>
            )}
            {showInvoiceDp && !dpInvoice && (
              <span className="text-xs italic text-ink-light">
                Belum ada invoice DP — buat dari halaman Invoices.
              </span>
            )}
            {showInvoicePelunasan && pelunasanInvoice && (
              <a
                href={`/invoices/${pelunasanInvoice.id}/print`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary text-sm"
              >
                <FileText className="h-4 w-4" /> Invoice Pelunasan
              </a>
            )}
            {showKwitansiDp && dpInvoice?.status === "paid" && (
              <a
                href={`/invoices/${dpInvoice.id}/receipt`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary text-sm"
              >
                <Receipt className="h-4 w-4" /> Kwitansi DP
              </a>
            )}
            {showKwitansiPelunasan && pelunasanInvoice?.status === "paid" && (
              <a
                href={`/invoices/${pelunasanInvoice.id}/receipt`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary text-sm"
              >
                <Receipt className="h-4 w-4" /> Kwitansi Pelunasan
              </a>
            )}
            {showKontrak && (
              <a
                href={`/clients/${client.id}/contract`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary text-sm"
              >
                <FileText className="h-4 w-4" /> Kontrak Kerja Sama
              </a>
            )}
          </div>
        </div>
        {txStatus === "overdue" && pelunasanInvoice?.dueDate && (
          <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            Pelunasan sudah lewat jatuh tempo (
            {formatDateID(pelunasanInvoice.dueDate)}). Segera tindak lanjuti.
          </div>
        )}
        {txStatus === "batal" && (
          <div className="mt-3 rounded border border-line bg-cream/40 px-3 py-2 text-xs text-ink-light">
            Transaksi dibatalkan. Dokumen tidak dapat dicetak ulang.
          </div>
        )}
      </div>

      {/* ----- Top summary ----- */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-base p-4">
          <div className="text-xs text-ink-light">Contract Value</div>
          <div className="mt-1 font-serif text-xl font-bold text-ink">
            {client.contractValue ? formatIDR(String(client.contractValue)) : "—"}
          </div>
        </div>
        <div className="card-base p-4">
          <div className="text-xs text-ink-light">Total Paid</div>
          <div className="mt-1 font-serif text-xl font-bold text-success">
            {formatIDR(totalPaid)}
          </div>
        </div>
        <div className="card-base p-4">
          <div className="text-xs text-ink-light">Outstanding</div>
          <div className="mt-1 font-serif text-xl font-bold text-warning">
            {formatIDR(outstanding)}
          </div>
        </div>
        <div className="card-base p-4">
          <div className="text-xs text-ink-light">Progress</div>
          <div className="mt-2 flex items-center gap-3">
            <Progress value={client.progress} className="flex-1" />
            <span className="font-serif text-base font-bold text-ink">
              {client.progress}%
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ----- LEFT COLUMN: Profile + Gallery + Notes ----- */}
        <div className="flex flex-col gap-6">
          <SectionCard title="Customer Profile" icon={Users}>
            <div className="flex flex-col gap-3 text-sm">
              <Row icon={Mail} label="Email" value={client.email ?? "—"} />
              <Row icon={Phone} label="Phone" value={client.phone ?? "—"} />
              <Row icon={MapPin} label="Venue" value={client.venue ?? "—"} />
              <Row icon={Box} label="Jenis Baki" value={client.jenisBaki ?? "—"} />
              <Row
                icon={Calendar}
                label="Event date"
                value={formatDateID(client.eventDate)}
              />
              <Row
                icon={Users}
                label="PIC"
                value={client.pic?.name ?? "Unassigned"}
              />
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge tone="gold">{client.package ?? "No package"}</Badge>
                <Badge tone={statusTone(client.status)}>{client.status}</Badge>
                <Badge
                  tone={
                    client.eventStatus === "confirmed"
                      ? "success"
                      : client.eventStatus === "pending"
                        ? "warning"
                        : "gold"
                  }
                >
                  {client.eventStatus}
                </Badge>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Kirim via WhatsApp" icon={MessageCircle}>
            <WhatsAppActions
              phone={client.phone}
              ctx={waCtx}
              clientId={client.id}
              invoice={waInvoice}
              pelunasanInvoiceId={pelunasanInvoice?.id ?? null}
              outstanding={outstanding}
              pelunasanDue={
                pelunasanInvoice?.dueDate
                  ? pelunasanInvoice.dueDate.toISOString()
                  : null
              }
              workbookPin={client.workbookPin}
              dpReceiptId={dpInvoice?.status === "paid" ? dpInvoice.id : null}
              pelunasanReceiptId={
                pelunasanInvoice?.status === "paid" ? pelunasanInvoice.id : null
              }
            />
          </SectionCard>

          <SectionCard title="Gallery" icon={ImageIcon}>
            {client.galleryUrl ? (
              <a
                href={client.galleryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 break-all text-sm text-ink hover:text-gold-dark"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{client.galleryUrl}</span>
              </a>
            ) : (
              <Empty text="Belum ada link gallery. Tambah dari halaman Gallery." />
            )}
          </SectionCard>

          {client.notes && (
            <SectionCard title="Internal Notes" icon={StickyNote}>
              <p className="whitespace-pre-wrap text-sm text-ink">{client.notes}</p>
            </SectionCard>
          )}
        </div>

        {/* ----- MIDDLE COLUMN: Workbook + Tasks + Designs ----- */}
        <div className="flex flex-col gap-6">
          <SectionCard
            title="Workbook Sheets"
            icon={FileText}
            action={
              <Link
                href={`/rundown/${client.id}`}
                className="text-xs font-semibold text-gold-dark hover:underline"
              >
                Open →
              </Link>
            }
          >
            {client.workbook?.sheets.length ? (
              <ul className="flex flex-col gap-1.5">
                {client.workbook.sheets.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-sm border border-line bg-cream/40 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-ink">{s.name}</span>
                    <span className="text-xs text-ink-light">#{s.position + 1}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty text="Workbook belum dibuat." />
            )}
          </SectionCard>

          <WorkbookPinCard
            clientId={client.id}
            initialPin={client.workbookPin}
          />

          <SectionCard
            title="Checklist / Tasks"
            icon={CheckSquare}
            action={
              <Link
                href="/checklist"
                className="text-xs font-semibold text-gold-dark hover:underline"
              >
                Manage →
              </Link>
            }
          >
            {client.tasks.length ? (
              <ul className="flex flex-col gap-2">
                {client.tasks.slice(0, 8).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-start justify-between gap-2 rounded-sm border border-line bg-cream/40 px-3 py-2"
                  >
                    <div>
                      <div className="text-sm font-medium text-ink">{t.title}</div>
                      <div className="text-xs text-ink-light">
                        {t.category}
                        {t.dueDate && ` · Due ${formatDateID(t.dueDate)}`}
                      </div>
                    </div>
                    <Badge tone={statusTone(t.status)}>{t.status}</Badge>
                  </li>
                ))}
                {client.tasks.length > 8 && (
                  <li className="text-center text-xs text-ink-light">
                    +{client.tasks.length - 8} more
                  </li>
                )}
              </ul>
            ) : (
              <Empty text="Belum ada task / checklist." />
            )}
          </SectionCard>

          <SectionCard
            title="Designs"
            icon={Palette}
            action={
              <Link
                href="/design"
                className="text-xs font-semibold text-gold-dark hover:underline"
              >
                Upload →
              </Link>
            }
          >
            {client.designs.length ? (
              <ul className="flex flex-col gap-2">
                {client.designs.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-start justify-between gap-2 rounded-sm border border-line bg-cream/40 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-ink">
                        {d.name}
                      </div>
                      <div className="text-xs text-ink-light">{d.category}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={statusTone(d.status)}>{d.status}</Badge>
                      {d.fileUrl && (
                        <a
                          href={d.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ink-light hover:text-gold-dark"
                          aria-label="Open file"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty text="Belum ada desain di-upload." />
            )}
          </SectionCard>
        </div>

        {/* ----- RIGHT COLUMN: Invoices + Payments + Crew + Events ----- */}
        <div className="flex flex-col gap-6">
          <SectionCard
            title="Invoices"
            icon={Receipt}
            action={
              <Link
                href="/invoices"
                className="text-xs font-semibold text-gold-dark hover:underline"
              >
                Manage →
              </Link>
            }
          >
            {client.invoices.length ? (
              <ul className="flex flex-col gap-2">
                {client.invoices.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-start justify-between gap-2 rounded-sm border border-line bg-cream/40 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs text-ink-light">{inv.number}</div>
                      <div className="text-sm font-semibold text-ink">
                        {formatIDR(String(inv.amount))}
                      </div>
                      <div className="text-xs text-ink-light">
                        {inv.type === "dp" ? "DP" : "Pelunasan"} ·{" "}
                        {inv.dueDate ? `Due ${formatDateID(inv.dueDate)}` : "No due date"}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                        <a
                          href={`/invoices/${inv.id}/print`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-sm border border-line bg-white px-2 py-0.5 font-semibold text-ink hover:bg-beige"
                        >
                          Invoice
                        </a>
                        {inv.status === "paid" && (
                          <a
                            href={`/invoices/${inv.id}/receipt`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-sm border border-line bg-white px-2 py-0.5 font-semibold text-ink hover:bg-beige"
                          >
                            Bukti {inv.type === "dp" ? "DP" : "Pelunasan"}
                          </a>
                        )}
                      </div>
                    </div>
                    <Badge tone={statusTone(inv.status)}>{inv.status}</Badge>
                  </li>
                ))}
                <li className="border-t border-line pt-2 text-right text-sm">
                  <span className="text-ink-light">Total invoiced: </span>
                  <span className="font-semibold text-ink">{formatIDR(totalInvoiced)}</span>
                </li>
              </ul>
            ) : (
              <Empty text="Belum ada invoice." />
            )}
          </SectionCard>

          <SectionCard
            title="Payments"
            icon={Wallet}
            action={
              <Link
                href="/finance"
                className="text-xs font-semibold text-gold-dark hover:underline"
              >
                Manage →
              </Link>
            }
          >
            {client.payments.length ? (
              <ul className="flex flex-col gap-2">
                {client.payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-start justify-between gap-2 rounded-sm border border-line bg-cream/40 px-3 py-2"
                  >
                    <div>
                      <div className="text-sm font-semibold text-ink">
                        {formatIDR(String(p.amount))}
                      </div>
                      <div className="text-xs text-ink-light">
                        {p.type} · {p.method} · {formatDateID(p.paymentDate)}
                      </div>
                      {p.reference && (
                        <div className="text-xs text-ink-light">Ref: {p.reference}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty text="Belum ada pembayaran tercatat." />
            )}
          </SectionCard>

          <SectionCard
            title="Crew"
            icon={Users}
            action={
              <Link
                href="/crew"
                className="text-xs font-semibold text-gold-dark hover:underline"
              >
                Manage →
              </Link>
            }
          >
            <CrewAssignmentPanel clientId={client.id} />
          </SectionCard>

          <SectionCard
            title="Calendar Events"
            icon={Calendar}
            action={
              <Link
                href="/calendar"
                className="text-xs font-semibold text-gold-dark hover:underline"
              >
                Open →
              </Link>
            }
          >
            {client.events.length ? (
              <ul className="flex flex-col gap-2">
                {client.events.map((e) => (
                  <li
                    key={e.id}
                    className="rounded-sm border border-line bg-cream/40 px-3 py-2"
                  >
                    <div className="text-sm font-semibold text-ink">{e.title}</div>
                    <div className="text-xs text-ink-light">
                      {formatDateID(e.startAt)} · {e.type}
                      {e.location && ` · ${e.location}`}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty text="Tidak ada event di kalender." />
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-light" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-light">
          {label}
        </div>
        <div className="break-words text-ink">{value}</div>
      </div>
    </div>
  );
}
