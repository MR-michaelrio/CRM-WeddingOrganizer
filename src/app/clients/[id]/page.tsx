import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckSquare,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Mail,
  MapPin,
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

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

function statusTone(s: string) {
  if (s === "completed" || s === "paid" || s === "approved" || s === "done")
    return "success" as const;
  if (s === "active" || s === "in_progress" || s === "sent") return "warning" as const;
  if (s === "overdue") return "danger" as const;
  return "neutral" as const;
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
      crewAssignments: {
        include: { crew: { select: { id: true, name: true, role: true } } },
      },
      events: { orderBy: { startAt: "asc" } },
    },
  });

  if (!client) notFound();

  const totalPaid = client.payments
    .filter((p) => p.type !== "expense" && p.type !== "vendor")
    .reduce((s, p) => s + Number(p.amount), 0);
  const totalInvoiced = client.invoices.reduce((s, i) => s + Number(i.amount), 0);
  const contractValue = client.contractValue ? Number(client.contractValue) : 0;
  const outstanding = Math.max(contractValue - totalPaid, 0);

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
        subtitle={`${client.eventType} · ${formatDateID(client.eventDate)}`}
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
                    <div>
                      <div className="font-mono text-xs text-ink-light">{inv.number}</div>
                      <div className="text-sm font-semibold text-ink">
                        {formatIDR(String(inv.amount))}
                      </div>
                      <div className="text-xs text-ink-light">
                        {inv.type === "dp" ? "DP" : "Pelunasan"} ·{" "}
                        {inv.dueDate ? `Due ${formatDateID(inv.dueDate)}` : "No due date"}
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
            {client.crewAssignments.length ? (
              <ul className="flex flex-col gap-2">
                {client.crewAssignments.map((ca) => (
                  <li
                    key={ca.id}
                    className="flex items-start justify-between gap-2 rounded-sm border border-line bg-cream/40 px-3 py-2"
                  >
                    <div>
                      <div className="text-sm font-semibold text-ink">
                        {ca.crew.name}
                      </div>
                      <div className="text-xs text-ink-light">
                        {ca.role ?? ca.crew.role}
                        {ca.startTime && ` · ${ca.startTime}–${ca.endTime ?? ""}`}
                      </div>
                    </div>
                    <div className="text-right">
                      {ca.fee && (
                        <div className="text-sm text-ink">
                          {formatIDR(String(ca.fee))}
                        </div>
                      )}
                      <Badge tone={statusTone(ca.attendance)}>{ca.attendance}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty text="Belum ada crew assigned." />
            )}
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
