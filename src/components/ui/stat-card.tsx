import { cn } from "@/lib/utils";

type StatCardProps = {
  icon: React.ReactNode;
  iconTone?: "gold" | "success" | "warning" | "danger";
  trend?: { label: string; direction: "up" | "down" };
  value: string;
  label: string;
};

const toneStyles: Record<NonNullable<StatCardProps["iconTone"]>, string> = {
  gold: "from-gold/15 to-gold/5 text-gold-dark",
  success: "from-success/15 to-success/5 text-success",
  warning: "from-warning/15 to-warning/5 text-warning",
  danger: "from-danger/15 to-danger/5 text-danger",
};

export function StatCard({
  icon,
  iconTone = "gold",
  trend,
  value,
  label,
}: StatCardProps) {
  return (
    <div className="card-base p-6 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-md bg-gradient-to-br text-xl",
            toneStyles[iconTone]
          )}
        >
          {icon}
        </div>
        {trend && (
          <span
            className={cn(
              "rounded px-2 py-1 text-xs font-semibold",
              trend.direction === "up"
                ? "bg-success/10 text-success"
                : "bg-danger/10 text-danger"
            )}
          >
            {trend.label}
          </span>
        )}
      </div>
      <div className="font-serif text-3xl font-bold text-ink">{value}</div>
      <div className="mt-1 text-sm text-ink-light">{label}</div>
    </div>
  );
}
