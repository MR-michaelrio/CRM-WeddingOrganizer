import { cn } from "@/lib/utils";

type BadgeProps = {
  tone?: "success" | "warning" | "danger" | "gold" | "neutral";
  children: React.ReactNode;
  className?: string;
};

export function Badge({ tone = "gold", children, className }: BadgeProps) {
  const tones: Record<string, string> = {
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
    gold: "bg-gold/15 text-gold-dark",
    neutral: "bg-beige text-ink-medium",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
