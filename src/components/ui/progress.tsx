type ProgressProps = {
  value: number;
  className?: string;
};

export function Progress({ value, className }: ProgressProps) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-line ${className ?? ""}`}>
      <div
        className="h-full bg-gold transition-[width] duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
