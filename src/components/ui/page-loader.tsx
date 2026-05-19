type Props = {
  label?: string;
  hint?: string;
  fullscreen?: boolean;
};

export function PageLoader({ label = "Loading…", hint, fullscreen }: Props) {
  return (
    <div
      className={
        fullscreen
          ? "flex min-h-[calc(100vh-72px)] items-center justify-center p-8"
          : "flex items-center justify-center px-8 py-20"
      }
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative">
          <div className="h-14 w-14 animate-spin rounded-full border-2 border-line border-t-gold-dark" />
          <div className="absolute inset-0 flex items-center justify-center font-serif text-xl text-gold-dark">
            ✦
          </div>
        </div>
        <div className="font-serif text-base font-semibold text-ink">{label}</div>
        {hint && <div className="text-xs text-ink-light">{hint}</div>}
      </div>
    </div>
  );
}
