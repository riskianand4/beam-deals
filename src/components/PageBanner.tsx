interface PageBannerProps {
  title: string;
  description?: string;
  avatar?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageBanner({ title, description, avatar, children }: PageBannerProps) {
  return (
    <div className="mb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          {avatar}
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight truncate">
              {title}
            </h1>
            {description && (
              <p className="text-muted-foreground text-sm mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {children && <div className="shrink-0 self-start">{children}</div>}
      </div>
    </div>
  );
}
