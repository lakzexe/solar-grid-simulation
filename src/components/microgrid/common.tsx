import type { ReactNode } from "react";
import { motion } from "motion/react";
import { AlertTriangle, FlaskConical, Inbox, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DemoBadge({ label = "Demonstration data", className }: { label?: string; className?: string }) {
  return (
    <span
      data-testid="demo-data-badge"
      title="Values are produced by the SolarGrid simulation engine from configurable demonstration inputs — no live inverter, meter or weather feed is connected."
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[#FCD34D] bg-[#FEF3C7] px-2.5 py-0.5 text-xs font-semibold text-[#92400E]",
        className,
      )}
    >
      <FlaskConical className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800/80">{eyebrow}</p>
        <h1 data-testid="page-title" className="text-3xl font-bold tracking-tight text-forest sm:text-[2.1rem]">
          {title}
        </h1>
        {description && <p className="mt-2 leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const TONES = {
  emerald: "bg-[#EBF8F2] border-[#A7F3D0] text-[#064E3B]",
  amber: "bg-[#FEF7EA] border-[#FDE68A] text-[#78350F]",
  slate: "bg-[#F1F5F2] border-[#D5E0D8] text-[#1C2E24]",
  white: "bg-white border-border text-forest",
} as const;

export function KpiCard({
  label,
  value,
  unit,
  hint,
  icon,
  tone = "white",
  testId,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  icon?: ReactNode;
  tone?: keyof typeof TONES;
  testId: string;
}) {
  return (
    <div
      data-testid={testId}
      className={cn(
        "rounded-xl border p-4 shadow-[0_1px_2px_rgba(13,40,24,0.04)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md",
        TONES[tone],
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-75">{label}</span>
        {icon && <span className="opacity-70">{icon}</span>}
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="font-mono text-2xl font-semibold tracking-tight">{value}</span>
        {unit && <span className="text-sm opacity-70">{unit}</span>}
      </div>
      {hint && <p className="mt-1 text-xs opacity-70">{hint}</p>}
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
  testId,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <section
      data-testid={testId}
      className={cn("rounded-xl border border-border bg-white p-5 shadow-[0_1px_3px_rgba(13,40,24,0.05)]", className)}
    >
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-base font-semibold text-forest">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function LoadingBlock({ label = "Loading simulation data…", className }: { label?: string; className?: string }) {
  return (
    <div
      data-testid="loading-state"
      className={cn("flex min-h-40 items-center justify-center gap-2 rounded-xl border border-dashed bg-white/60 text-sm text-muted-foreground", className)}
    >
      <Loader2 className="size-4 animate-spin" aria-hidden /> {label}
    </div>
  );
}

export function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div data-testid="loading-skeleton" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-xl bg-[#E9EFE6]" />
      ))}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div data-testid="empty-state" className="flex flex-col items-start gap-3 rounded-xl border border-dashed bg-white p-8">
      <Inbox className="size-6 text-emerald-700" aria-hidden />
      <div>
        <h3 className="font-semibold text-forest">{title}</h3>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div data-testid="error-state" className="flex flex-col items-start gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-6 text-[#991B1B]">
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="size-4" aria-hidden /> Could not load data
      </div>
      <p className="text-sm">{message}</p>
      {onRetry && (
        <Button data-testid="error-retry-button" size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw className="size-3.5" /> Retry
        </Button>
      )}
    </div>
  );
}

export function PageFade({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}

/** Tiny markdown renderer for AI explanations: ### headings, - bullets, **bold**. */
export function MiniMarkdown({ text }: { text: string }) {
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>,
    );
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      blocks.push(
        <ul key={`l${blocks.length}`} className="ml-5 list-disc space-y-1">
          {list.map((li, i) => (
            <li key={i}>{inline(li)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  text.split("\n").forEach((raw) => {
    const line = raw.trim();
    if (/^[-*] /.test(line)) return void list.push(line.slice(2));
    flush();
    if (!line) return;
    const h = line.match(/^#{1,4}\s+(.*)/);
    if (h) blocks.push(<h4 key={blocks.length} className="mt-3 font-semibold text-forest first:mt-0">{inline(h[1])}</h4>);
    else blocks.push(<p key={blocks.length}>{inline(line)}</p>);
  });
  flush();
  return <div className="space-y-2 text-sm leading-relaxed text-[#2A3F31]">{blocks}</div>;
}
