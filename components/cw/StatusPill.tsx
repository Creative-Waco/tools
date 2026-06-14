import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

const statusPillVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
  {
    variants: {
      variant: {
        spark: "bg-spark-soft text-spark-muted",
        honorary: "bg-honorary-soft text-honorary-muted",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        info: "bg-info-soft text-info",
        muted: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "muted",
    },
  },
);

type StatusPillProps = React.ComponentProps<"span"> &
  VariantProps<typeof statusPillVariants>;

export function StatusPill({
  variant,
  className,
  ...props
}: StatusPillProps) {
  return (
    <span className={cn(statusPillVariants({ variant }), className)} {...props} />
  );
}

export { statusPillVariants };
