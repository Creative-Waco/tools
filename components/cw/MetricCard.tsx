import { cn } from "@/lib/cn";

type MetricCardProps = React.ComponentProps<"div"> & {
  label: string;
  value: React.ReactNode;
  footnote?: React.ReactNode;
  accent?: boolean;
  degraded?: boolean;
};

export function MetricCard({
  label,
  value,
  footnote,
  accent = false,
  degraded = false,
  className,
  ...props
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "grid gap-1 rounded-panel border border-line bg-card p-4 shadow-panel",
        accent &&
          "border-spark/30 bg-gradient-to-br from-card to-spark-soft",
        degraded && "opacity-70",
        className,
      )}
      {...props}
    >
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-2xl font-bold tabular-nums tracking-tight">
        {value}
      </span>
      {footnote ? (
        <span className="text-xs text-muted-foreground">{footnote}</span>
      ) : null}
    </div>
  );
}
