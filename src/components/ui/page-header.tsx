type PageHeaderProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-ink md:text-[32px]">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-ink-light">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
